"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CustomerSignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function signOut() {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) { console.error('Customer sign out failed:', error); return; }
    router.replace('/erp');
    router.refresh();
  }
  return <button type="button" onClick={signOut} disabled={loading} className="mt-2 inline-flex min-h-7 items-center rounded-md border border-neutral-800 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-300 transition hover:border-red-700 hover:bg-red-950/40 hover:text-white disabled:opacity-60">{loading ? 'Signing out…' : 'Log out'}</button>;
}
