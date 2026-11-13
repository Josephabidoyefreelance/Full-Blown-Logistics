'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type Tab = 'overview' | 'shipments' | 'track' | 'invoices' | 'support' | 'profile';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'shipments', label: 'My Shipments' },
  { key: 'track', label: 'Track' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'support', label: 'Support' },
  { key: 'profile', label: 'Profile' },
];

export default function CustomerDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<{ name: string; email: string; phone: string; balance: number } | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/customer/login');
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('name, email, phone, balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) setCustomerError(error.message);
      setCustomer(data);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/customer/login');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f6]">
        <p className="text-sm text-[#6c6c72]">Loading your account...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f5f5f6]">
      {/* sidebar */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-[#eceef0] bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-[#eceef0] px-5 py-5">
          <Image src="/logo.png" alt="JAAD Logistics" width={32} height={32} />
          <span className="text-sm font-bold text-[#0b0b0d]">JAAD Logistics</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`block w-full rounded-md px-3.5 py-2.5 text-left text-[13.5px] font-semibold ${
                tab === t.key ? 'bg-[#e5231b] text-white' : 'text-[#4a4a4f] hover:bg-[#f5f5f6]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-[#eceef0] p-3">
          <button onClick={logout} className="w-full rounded-md px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-[#6c6c72] hover:bg-[#f5f5f6]">
            Log out
          </button>
        </div>
      </aside>

      {/* mobile tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex overflow-x-auto border-t border-[#eceef0] bg-white md:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 whitespace-nowrap px-3 py-3 text-[11px] font-semibold ${
              tab === t.key ? 'text-[#e5231b]' : 'text-[#6c6c72]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* main */}
      <main className="flex-1 pb-20 md:pb-0">
        <div className="border-b border-[#eceef0] bg-white px-5 py-5 md:px-8">
          <h1 className="text-lg font-bold text-[#0b0b0d]">
            {customer?.name ? `Welcome back, ${customer.name.split(' ')[0]}` : 'Welcome back'}
          </h1>
          <p className="text-[13px] text-[#6c6c72]">Here&apos;s what&apos;s happening with your shipments.</p>
        </div>

        <div className="p-5 md:p-8">
          {customerError && (
            <div className="mb-5 rounded-md border border-[#f3c9c7] bg-[#fdf0ef] p-3.5 text-[13px] text-[#b8140d]">
              Could not load your profile details ({customerError}).
            </div>
          )}

          {tab === 'overview' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                ['Active shipments', '0'],
                ['Delivered this month', '0'],
                ['Account balance', customer?.balance ? `\u20a6${customer.balance.toLocaleString()}` : '\u20a60'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#eceef0] bg-white p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6c6c72]">{label}</div>
                  <div className="mt-2 text-2xl font-bold text-[#0b0b0d]">{value}</div>
                </div>
              ))}
              <div className="sm:col-span-3 rounded-lg border border-[#eceef0] bg-white p-8 text-center text-sm text-[#6c6c72]">
                Your recent shipments will show up here once your first booking is placed.
              </div>
            </div>
          )}

          {tab === 'shipments' && (
            <div className="rounded-lg border border-[#eceef0] bg-white p-8 text-center text-sm text-[#6c6c72]">
              No shipments yet. Once your first order is booked with our team, it&apos;ll appear here with live status.
            </div>
          )}

          {tab === 'track' && (
            <div className="rounded-lg border border-[#eceef0] bg-white p-8">
              <h3 className="mb-1 text-base font-bold text-[#0b0b0d]">Track a shipment</h3>
              <p className="mb-4 text-[13px] text-[#6c6c72]">Enter a waybill number to see its live status.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  placeholder="JAAD-190826-LG"
                  className="w-full flex-1 rounded-sm border border-[#d8d8db] px-3.5 py-2.5 text-sm outline-none focus:border-[#e5231b]"
                />
                <button className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white">Track</button>
              </div>
            </div>
          )}

          {tab === 'invoices' && (
            <div className="rounded-lg border border-[#eceef0] bg-white p-8 text-center text-sm text-[#6c6c72]">
              No invoices yet. They&apos;ll show up here once your first shipment is billed.
            </div>
          )}

          {tab === 'support' && (
            <div className="rounded-lg border border-[#eceef0] bg-white p-8 text-center text-sm text-[#6c6c72]">
              Need help? Use the red chat button in the bottom corner of this page to talk to our team directly.
            </div>
          )}

          {tab === 'profile' && (
            <div className="max-w-[440px] rounded-lg border border-[#eceef0] bg-white p-6">
              <h3 className="mb-4 text-base font-bold text-[#0b0b0d]">Your details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-[#6c6c72]">Full name</div>
                  <div className="mt-0.5 text-[#0b0b0d]">{customer?.name ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-[#6c6c72]">Email</div>
                  <div className="mt-0.5 text-[#0b0b0d]">{customer?.email ?? '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-[#6c6c72]">Phone</div>
                  <div className="mt-0.5 text-[#0b0b0d]">{customer?.phone ?? '—'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
