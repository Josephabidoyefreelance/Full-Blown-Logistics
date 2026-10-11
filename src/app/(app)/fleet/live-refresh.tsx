'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function FleetLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const tables = ['fleet_vehicles', 'fleet_maintenance', 'fleet_insurance'] as const;

    const channels = tables.map((table) =>
      supabase
        .channel(`fleet-${table}-updates`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => router.refresh())
        .subscribe()
    );

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [router]);

  return null;
}
