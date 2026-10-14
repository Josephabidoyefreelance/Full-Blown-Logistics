import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createBillingAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getPaystackSecret() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  return key;
}

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  const expected = createHmac('sha512', secret).update(rawBody).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

type PaystackTransaction = {
  id: number | string;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel?: string;
  paid_at?: string | null;
  transaction_date?: string | null;
  metadata?: unknown;
};

function metadataObject(metadata: unknown): Record<string, unknown> | null {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  if (typeof metadata === 'string') {
    try {
      const parsed: unknown = JSON.parse(metadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export type VerifyPaymentResult =
  | { ok: true; alreadyPaid: boolean; companyId: string; planCode: string }
  | { ok: false; pending?: boolean; message: string };

/** Verifies with Paystack directly, checks amount/currency/reference/metadata, then settles idempotently. */
export async function verifyAndActivateBankTransfer(
  reference: string,
  expectedCompanyId?: string,
): Promise<VerifyPaymentResult> {
  if (!reference || reference.length > 120) return { ok: false, message: 'Invalid payment reference.' };

  let admin;
  try {
    admin = createBillingAdminClient();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Billing database is not configured.' };
  }

  const { data: attempt, error: attemptError } = await admin
    .from('billing_payment_attempts')
    .select('id, company_id, plan_code, amount_kobo, reference, status')
    .eq('reference', reference)
    .maybeSingle();

  if (attemptError || !attempt) {
    return { ok: false, message: 'No JAAD payment request matches this reference.' };
  }
  if (expectedCompanyId && attempt.company_id !== expectedCompanyId) {
    return { ok: false, message: 'This payment does not belong to your company workspace.' };
  }
  if (attempt.status === 'paid') {
    return { ok: true, alreadyPaid: true, companyId: attempt.company_id, planCode: attempt.plan_code };
  }
  if (attempt.status !== 'pending') {
    return { ok: false, message: 'This payment request is no longer pending.' };
  }

  let response: Response;
  try {
    response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${getPaystackSecret()}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, pending: true, message: 'Could not reach Paystack to verify the transfer. Please retry shortly.' };
  }

  const result = (await response.json().catch(() => null)) as
    | { status?: boolean; message?: string; data?: PaystackTransaction }
    | null;
  if (!response.ok || !result?.status || !result.data) {
    return { ok: false, pending: true, message: 'Paystack has not confirmed this transfer yet.' };
  }

  const transaction = result.data;
  if (transaction.status !== 'success') {
    return { ok: false, pending: true, message: 'Your transfer has not been confirmed yet.' };
  }
  if (transaction.reference !== attempt.reference) {
    return { ok: false, message: 'The verified transaction reference does not match.' };
  }
  if (transaction.channel !== 'bank_transfer') {
    return { ok: false, message: 'This JAAD package request accepts bank transfers only.' };
  }
  if (transaction.currency !== 'NGN' || Number(transaction.amount) !== Number(attempt.amount_kobo)) {
    return { ok: false, message: 'The verified payment amount or currency does not match the JAAD invoice.' };
  }

  const metadata = metadataObject(transaction.metadata);
  if (
    !metadata ||
    String(metadata.payment_attempt_id ?? '') !== String(attempt.id) ||
    String(metadata.company_id ?? '') !== String(attempt.company_id) ||
    String(metadata.plan_code ?? '') !== String(attempt.plan_code)
  ) {
    return { ok: false, message: 'The payment metadata could not be matched to this JAAD subscription request.' };
  }

  const paidAt = transaction.paid_at || transaction.transaction_date || new Date().toISOString();
  const { error: activationError } = await admin.rpc('jaad_activate_subscription_from_payment', {
    p_reference: attempt.reference,
    p_paystack_transaction_id: String(transaction.id),
    p_paid_at: paidAt,
  });
  if (activationError) {
    return { ok: false, pending: true, message: 'Payment was verified but JAAD could not update the subscription yet. The webhook may retry; contact support if it remains pending.' };
  }

  return { ok: true, alreadyPaid: false, companyId: attempt.company_id, planCode: attempt.plan_code };
}
