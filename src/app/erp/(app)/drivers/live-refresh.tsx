'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DriverLiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('jaad-drivers-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_onboarding_links' }, () => router.refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [router]);
  return null;
}
