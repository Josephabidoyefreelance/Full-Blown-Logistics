'use client';

import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/nav';

export default function PageTitle() {
  const pathname = usePathname();
  const allItems = NAV.flatMap((group) => group.items);
  const match = allItems.find((it) => pathname === it.href || pathname?.startsWith(it.href + '/'));
  const title = match?.label ?? 'Dashboard';

  return <h1 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h1>;
}
