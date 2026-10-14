'use client';

import { useState } from 'react';
import type { JaadPlanCode } from '@/lib/billing/plans';

export default function PlanCheckoutButton({ planCode, label }: { planCode: JaadPlanCode; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function startCheckout() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.authorizationUrl !== 'string') {
        throw new Error(result.error || 'Could not start bank transfer checkout. Please try again.');
      }
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not start bank transfer checkout.');
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? 'Connecting to Paystack…' : label}
      </button>
      {error && <p role="alert" className="mt-2 text-xs leading-5 text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
