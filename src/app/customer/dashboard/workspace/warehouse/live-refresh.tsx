'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function WarehouseLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('warehouse-inventory-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => router.refresh())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  return null;
}
