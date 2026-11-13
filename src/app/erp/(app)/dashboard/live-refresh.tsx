'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DashboardLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const tables = [
      'bookings',
      'fleet_vehicles',
      'fleet_maintenance',
      'fleet_insurance',
      'drivers',
      'leads',
      'tickets',
      'customers',
      'inventory_items',
    ] as const;

    const channels = tables.map((table) =>
      supabase
        .channel(`dashboard-${table}-updates`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => router.refresh())
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [router]);

  return null;
}
