import { timingSafeEqual } from 'node:crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createBillingAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase billing credentials missing.');
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function verifyFlutterwaveWebhookHash(received: string | null): boolean {
  const expected = process.env.FLW_SECRET_HASH;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type PaymentResult =
  | { ok: true; alreadyPaid: boolean; companyId: string; planCode: string }
  | { ok: false; pending?: boolean; message: string };

type VerifiedTransaction = {
  id: number | string; tx_ref: string; amount: number; currency: string;
  status: string; payment_type?: string; created_at?: string;
};

export async function verifyAndActivateBankTransfer(
  reference: string, expectedCompanyId?: string, transactionId?: string | number,
): Promise<PaymentResult> {
  if (!/^JAAD-[a-f0-9]{32}$/i.test(reference)) return { ok: false, message: 'Invalid JAAD payment reference.' };
  let admin: ReturnType<typeof createBillingAdminClient>;
  try { admin = createBillingAdminClient(); }
  catch { return { ok: false, pending: true, message: 'Billing database is unavailable.' }; }
  const { data: attempt, error } = await admin.from('billing_payment_attempts')
    .select('id, company_id, plan_code, amount_kobo, currency, reference, status, payment_provider')
    .eq('reference', reference).maybeSingle();
  if (error || !attempt) return { ok: false, message: 'Payment reference was not found.' };
  if (attempt.payment_provider !== 'flutterwave') return { ok: false, message: 'Payment provider mismatch.' };
  if (expectedCompanyId && expectedCompanyId !== attempt.company_id) return { ok: false, message: 'Company mismatch.' };
  if (attempt.status === 'paid') return { ok: true, alreadyPaid: true, companyId: attempt.company_id, planCode: attempt.plan_code };
  if (attempt.status !== 'pending') return { ok: false, message: 'Payment is not pending.' };
  const secret = process.env.FLW_SECRET_KEY;
  if (!secret) return { ok: false, pending: true, message: 'Flutterwave is not configured.' };
  try {
    const endpoint = transactionId != null && /^\d+$/.test(String(transactionId))
      ? `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(transactionId))}/verify`
      : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store' });
    const payload = await response.json().catch(() => null) as { status?: string; data?: VerifiedTransaction } | null;
    if (!response.ok || payload?.status !== 'success' || !payload.data)
      return { ok: false, pending: true, message: 'Flutterwave verification is not available yet.' };
    const tx = payload.data;
    if (tx.status !== 'successful') return { ok: false, pending: true, message: 'Payment is not confirmed.' };
    if (tx.tx_ref !== attempt.reference || tx.currency !== 'NGN' || attempt.currency !== 'NGN' ||
        Number(tx.amount) * 100 !== Number(attempt.amount_kobo))
      return { ok: false, message: 'Payment reference, currency or amount mismatch.' };
    if (tx.payment_type !== 'bank_transfer') return { ok: false, message: 'Only verified bank transfers are accepted.' };
    const { error: activationError } = await admin.rpc('jaad_activate_subscription_from_payment', {
      p_reference: reference,
      p_paystack_transaction_id: String(tx.id), // Legacy SQL parameter name; value is Flutterwave transaction ID.
      p_paid_at: tx.created_at || new Date().toISOString(),
    });
    if (activationError) return { ok: false, pending: true, message: 'Payment confirmed, subscription activation pending.' };
    return { ok: true, alreadyPaid: false, companyId: attempt.company_id, planCode: attempt.plan_code };
  } catch {
    return { ok: false, pending: true, message: 'Unable to verify payment with Flutterwave.' };
  }
}
