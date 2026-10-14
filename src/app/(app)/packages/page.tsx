import { createClient } from '@/lib/supabase/server';
import { JAAD_PLANS, naira, type JaadPlanCode } from '@/lib/billing/plans';
import PlanCheckoutButton from './plan-checkout-button';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from('profiles').select('id, email, company_id').eq('id', user.id).maybeSingle()
    : { data: null };

  const { data: company } = profile?.company_id
    ? await supabase.from('companies').select('id, name, owner_user_id').eq('id', profile.company_id).maybeSingle()
    : { data: null };

  const { data: subscription } = profile?.company_id
    ? await supabase
        .from('company_subscriptions')
        .select('plan_code, status, current_period_start, current_period_end, last_payment_reference')
        .eq('company_id', profile.company_id)
        .maybeSingle()
    : { data: null };

  const isBillingOwner = Boolean(user && company && company.owner_user_id === user.id);
  const subscriptionIsActive = Boolean(
    subscription?.status === 'active' &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() > Date.now(),
  );
  const currentPlanCode = subscriptionIsActive ? subscription?.plan_code as JaadPlanCode : null;

  return (
    <section className="min-w-0 space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Packages</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Choose a JAAD ERP package. Checkout accepts bank transfer only card payment is not offered.
        </p>
      </header>

      {params.payment === 'success' && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
          Your bank transfer has been verified and the subscription has been updated.
        </div>
      )}
      {params.payment === 'pending' && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          We have not received confirmation yet. If you have completed the transfer, wait for Paystack to confirm it and refresh this page. JAAD will not activate a package from a screenshot or an unverified browser message.
        </div>
      )}
      {params.payment === 'failed' && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          The transfer could not be verified. No package was activated. You can try again or contact JAAD support.
        </div>
      )}

      {subscriptionIsActive && subscription && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Current package: {JAAD_PLANS[currentPlanCode!]?.name ?? subscription.plan_code}
              </p>
              <p className="mt-0.5 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                Active until {formatDate(subscription.current_period_end)}. Monthly renewal is made with a new bank transfer; it is not auto-debited.
              </p>
            </div>
            <span className="mt-1 self-start rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 sm:mt-0">Active</span>
          </div>
        </section>
      )}

      {!profile?.company_id && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          This user is not linked to a company workspace yet. Apply the supplied database migration and assign the company workspace before starting checkout.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(Object.values(JAAD_PLANS) as Array<(typeof JAAD_PLANS)[JaadPlanCode]>).map((plan) => (
          <article key={plan.code} className={`relative flex min-w-0 flex-col rounded-xl border bg-white p-5 shadow-sm dark:bg-neutral-900 ${plan.accent}`}>
            {plan.badge && (
              <span className={`mb-3 self-start rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${plan.badge.style}`}>
                {plan.badge.label}
              </span>
            )}
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{plan.name}</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">{naira(plan.priceNaira)}</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">/ month</span>
            </div>
            <p className="mt-2 min-h-10 text-sm leading-5 text-neutral-600 dark:text-neutral-400">{plan.summary}</p>
            <div className="my-4 border-t border-neutral-100 dark:border-neutral-800" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Included features</h3>
            <ul className="mt-3 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <span aria-hidden="true" className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            {isBillingOwner && profile?.company_id ? (
              <PlanCheckoutButton
                planCode={plan.code}
                label={currentPlanCode === plan.code ? `Renew ${plan.name} by bank transfer` : `Choose ${plan.name}`}
              />
            ) : (
              <p className="mt-5 rounded-lg bg-neutral-50 px-3 py-2.5 text-xs leading-5 text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
                {profile?.company_id ? 'Only the company billing owner can change or renew the package.' : 'Company billing setup is required before checkout.'}
              </p>
            )}
          </article>
        ))}
      </div>

      <p className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">
        Payments are made on Paystack's hosted checkout, with bank transfer as the only enabled channel. JAAD never collects card details. Transfer payments renew for one month after Paystack confirms successful payment; customers must initiate a new transfer each month.
      </p>
    </section>
  );
}
