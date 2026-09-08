'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="mt-1 block text-left text-[11px] text-neutral-500 underline hover:text-neutral-300"
    >
      Log out
    </button>
  );
}
