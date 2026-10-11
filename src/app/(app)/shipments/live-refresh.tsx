'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ShipmentLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const tables = ['bookings', 'manifests', 'manifest_bookings', 'proof_of_delivery', 'returns'] as const;
    const channels = tables.map((table) =>
      supabase
        .channel(`shipment-${table}-updates`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => router.refresh())
        .subscribe(),
    );

    return () => channels.forEach((channel) => supabase.removeChannel(channel));
  }, [router]);

  return null;
}
