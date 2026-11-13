'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function FinanceLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const tables = ['invoices', 'expenses', 'employees', 'purchase_orders', 'quotations'] as const;
    const channels = tables.map((table) =>
      supabase
        .channel(`finance-${table}-updates`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => router.refresh())
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [router]);

  return null;
}
