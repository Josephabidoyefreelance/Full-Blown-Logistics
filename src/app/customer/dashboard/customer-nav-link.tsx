'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

export default function CustomerNavLink({
  href,
  compact = false,
  children,
}: {
  href: string;
  compact?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const target = new URL(href, 'http://local.invalid');
  const samePath = pathname === target.pathname;
  const targetView = target.searchParams.get('view');
  const currentView = searchParams.get('view');
  const active = samePath && (!targetView || targetView === currentView);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group flex min-h-8 items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
        active
          ? 'bg-red-600 text-white'
          : 'text-neutral-300 hover:bg-red-600 hover:text-white'
      } ${compact ? 'ml-1 min-h-7 py-1.5 text-[11px]' : ''}`}
    >
      {children}
    </Link>
  );
}
