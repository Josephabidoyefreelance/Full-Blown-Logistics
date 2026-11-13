'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  companyId: string | null;
  companyName: string;
  logoUrl: string | null;
  allowedPrefix: string | null;
};

/** Display branding only for the verified customer workspace. No auth decisions here. */
export default function CustomerSidebarLogo({ companyId, companyName, logoUrl, allowedPrefix }: Props) {
  const [liveLogoUrl, setLiveLogoUrl] = useState(logoUrl);
  const [imageFailed, setImageFailed] = useState(false);
  // The canonical logo is saved in the workspace settings, but the actual
  // image uses a short-lived authenticated URL so PRIVATE buckets still work.
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch('/api/customer/workspace-logo', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setLiveLogoUrl(typeof data.url === 'string' ? data.url : null);
          setImageFailed(false);
        }
      } catch { /* Keep the initials fallback. */ }
    }
    void refresh();
    const changed = () => { void refresh(); };
    window.addEventListener('jaad:workspace-preferences-updated', changed);
    window.addEventListener('jaad:customer-logo-updated', changed);
    window.addEventListener('focus', changed);
    return () => {
      cancelled = true;
      window.removeEventListener('jaad:workspace-preferences-updated', changed);
      window.removeEventListener('jaad:customer-logo-updated', changed);
      window.removeEventListener('focus', changed);
    };
  }, [companyId]);

  useEffect(() => {
    setLiveLogoUrl(logoUrl);
    setImageFailed(false);
  }, [logoUrl, companyId]);


  const initials = useMemo(() => {
    const words = companyName.trim().split(/[\s_-]+/).filter(Boolean);
    const firstTwo = words.slice(0, 2).map(word => word.charAt(0)).join('');
    return (firstTwo || companyName.slice(0, 2) || 'CO').toUpperCase();
  }, [companyName]);

  const trustedOrigin = allowedPrefix ? new URL(allowedPrefix).origin : null;
  const safeSrc = liveLogoUrl && trustedOrigin && liveLogoUrl.startsWith(`${trustedOrigin}/storage/v1/object/sign/logos/${companyId}/`)
    ? liveLogoUrl : null;
  if (safeSrc && !imageFailed) {
    return <img
      src={safeSrc}
      alt={`${companyName} company logo`}
      className="h-8 w-8 shrink-0 rounded-md border border-neutral-200 bg-white object-contain p-0.5"
      onError={() => setImageFailed(true)}
    />;
  }

  return <span
    role="img"
    aria-label={`${companyName} logo not uploaded`}
    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-red-100 bg-red-50 text-[10px] font-bold text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
  >{initials}</span>;
}
