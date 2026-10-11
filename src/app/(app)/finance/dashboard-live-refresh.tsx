'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DashboardLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const tables = [
      'invoices',
      'bookings',
      'fleet_vehicles',
      'expenses',
      'leads',
      'drivers',
      'tickets',
      'employees',
      'purchase_orders',
      'quotations',
    ] as const;

    const channels = tables.map((table) =>
      supabase
        .channel(`dashboard-${table}-updates`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => router.refresh()
        )
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [router]);

  return null;
}
