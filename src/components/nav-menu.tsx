'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { NAV } from '@/lib/nav';

type IconProps = { className?: string };

const ICONS: Record<string, (props: IconProps) => JSX.Element> = {
  'layout-dashboard': ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  funnel: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M3 4h18l-7 8v6l-4 2v-8L3 4z" strokeLinejoin="round" />
    </svg>
  ),
  users: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6" />
      <circle cx="17" cy="8" r="2.5" /><path d="M16 14c2.8.4 5 2.6 5 6" />
    </svg>
  ),
  package: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" strokeLinejoin="round" /><path d="M3 8v8l9 5 9-5V8" strokeLinejoin="round" /><path d="M12 13v8" />
    </svg>
  ),
  truck: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="1" y="6" width="13" height="10" rx="1" /><path d="M14 10h4l4 4v2h-8v-6z" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" />
    </svg>
  ),
  'id-card': ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" />
      <path d="M14 10h6M14 14h6M4 17c0-1.7 1.8-3 4-3s4 1.3 4 3" />
    </svg>
  ),
  warehouse: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M3 10l9-6 9 6v10a1 1 0 01-1 1H4a1 1 0 01-1-1V10z" strokeLinejoin="round" /><path d="M9 21v-7h6v7" />
    </svg>
  ),
  banknote: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 10v.01M18 14v.01" />
    </svg>
  ),
  briefcase: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="2" y="7" width="20" height="13" rx="2" /><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" /><path d="M2 12h20" />
    </svg>
  ),
  headset: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M4 13v-1a8 8 0 0116 0v1" /><rect x="2" y="13" width="5" height="7" rx="1.5" /><rect x="17" y="13" width="5" height="7" rx="1.5" />
      <path d="M19 20a3 3 0 01-3 2h-2" />
    </svg>
  ),
  'bar-chart': ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  ),
  shield: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" strokeLinejoin="round" />
    </svg>
  ),
  'message-circle': ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M21 11.5a8.5 8.5 0 01-8.5 8.5c-1.4 0-2.7-.3-3.9-1L3 20l1.1-4C3.4 14.7 3 13.2 3 11.5a8.5 8.5 0 0117 0z" strokeLinejoin="round" />
    </svg>
  ),
  mail: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 6l10 7 10-7" strokeLinejoin="round" />
    </svg>
  ),
  'message-square': ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" strokeLinejoin="round" />
      <path d="M7 9h10M7 12.5h6" />
    </svg>
  ),
  phone: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .3 2 .6 3a2 2 0 01-.5 2.1L7.9 10a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.5c1 .3 2 .5 3 .6a2 2 0 011.7 2z" strokeLinejoin="round" />
    </svg>
  ),
  whatsapp: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.6.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3z" />
      <path d="M12 2a10 10 0 00-8.6 15L2 22l5.2-1.4A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20z" />
    </svg>
  ),
};

function Icon({ name, className }: { name?: string; className?: string }) {
  const Cmp = name ? ICONS[name] : undefined;
  if (!Cmp) return null;
  return <Cmp className={className} />;
}

function IconChip({ name, color }: { name?: string; color?: string }) {
  if (!name) return null;
  const c = color ?? '#888';
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
      style={{ backgroundColor: c + '22', color: c }}
    >
      <Icon name={name} className="h-3.5 w-3.5" />
    </span>
  );
}

export default function NavMenu({ groups }: { groups: typeof NAV }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view');

  // Auto-expand a group if the current URL matches one of its children.
  const initiallyExpanded = new Set<string>();
  for (const group of groups) {
    for (const item of group.items) {
      if (item.children?.some((c) => c.href === `${pathname}?${searchParams.toString()}`)) {
        initiallyExpanded.add(item.key);
      }
    }
  }

  const [expanded, setExpanded] = useState<Set<string>>(initiallyExpanded);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.section} className="mb-3">
          <div className="px-2 pb-1 pt-3 text-[10px] uppercase tracking-widest text-neutral-500">
            {group.section}
          </div>
          <div className="space-y-1">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const hasChildren = !!item.children?.length;
              const isExpanded = expanded.has(item.key);

              if (!hasChildren) {
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-red-600 hover:text-white ${
                      isActive ? 'bg-red-600 text-white' : 'text-neutral-300'
                    }`}
                  >
                    <IconChip name={item.icon} color={item.color} />
                    {item.label}
                  </Link>
                );
              }

              return (
                <div key={item.key}>
                  <button
                    onClick={() => toggle(item.key)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-red-600 hover:text-white ${
                      isActive || isExpanded ? 'bg-red-600 text-white' : 'text-neutral-300'
                    }`}
                  >
                    <Link href={item.href} className="flex flex-1 items-center gap-2.5 text-left" onClick={(e) => e.stopPropagation()}>
                      <IconChip name={item.icon} color={item.color} />
                      {item.label}
                    </Link>
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(item.key);
                      }}
                      className={`ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      &#9662;
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-neutral-800 pl-3">
                      {item.children!.map((child) => {
                        const childActive = pathname === '/support' && currentView === child.href.split('view=')[1];
                        return (
                          <Link
                            key={child.key}
                            href={child.href}
                            className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-red-600 hover:text-white ${
                              childActive ? 'bg-red-600 text-white' : 'text-neutral-400'
                            }`}
                          >
                            <IconChip name={child.icon} color={child.color} />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
