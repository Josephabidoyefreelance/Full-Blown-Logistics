'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Props = {
  userId: string;
  name: string;
  role: string;
  email: string;
  avatarUrl: string | null;
  workspaceDisplayName?: string;
};

type Settings = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  business_address: string;
  currency: string;
  tax_rate: string;
  logo_url: string;
};

const CURRENCIES = [
  ['NGN', 'Nigerian Naira (â‚¦)'], ['USD', 'US Dollar ($)'], ['GBP', 'British Pound (Â£)'],
  ['EUR', 'Euro (â‚¬)'], ['CAD', 'Canadian Dollar (C$)'], ['AUD', 'Australian Dollar (A$)'],
  ['NZD', 'New Zealand Dollar (NZ$)'], ['GHS', 'Ghanaian Cedi (GHâ‚µ)'], ['KES', 'Kenyan Shilling (KSh)'],
  ['ZAR', 'South African Rand (R)'], ['INR', 'Indian Rupee (â‚¹)'], ['AED', 'UAE Dirham (Ø¯.Ø¥)'],
  ['XOF', 'West African CFA franc'], ['XAF', 'Central African CFA franc'], ['JPY', 'Japanese Yen (Â¥)'],
  ['CNY', 'Chinese Yuan (Â¥)'], ['CHF', 'Swiss Franc (CHF)'], ['SGD', 'Singapore Dollar (S$)'],
  ['BRL', 'Brazilian Real (R$)'], ['MXN', 'Mexican Peso ($)'], ['SAR', 'Saudi Riyal (ï·¼)'],
] as const;

const emptySettings = (email: string): Settings => ({
  first_name: '', last_name: '', email, phone: '', company_name: '', business_address: '',
  currency: 'NGN', tax_rate: '7.5', logo_url: '',
});

export default function ProfileMenu({ userId, name, role, email, avatarUrl, workspaceDisplayName }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [signedLogoUrl, setSignedLogoUrl] = useState('');
  const [settings, setSettings] = useState<Settings>(emptySettings(email));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (open) { setError(''); setMessage(''); }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name,last_name,full_name,email,phone')
        .eq('id', userId).maybeSingle();
      if (cancelled) return;
      if (profileError) setError('Profile settings could not be loaded. Run the included SQL migration first.');

       // Always load personal details, even when the customer ERP is locked.
       // Display name comes from the same server-rendered workspace header.
       // It is display-only: profile affiliation is not proof of tenant write access.
       const fallbackNames = (profile?.full_name ?? name).trim().split(/\s+/);
       const personal = {
         first_name: profile?.first_name ?? fallbackNames[0] ?? '',
         last_name: profile?.last_name ?? fallbackNames.slice(1).join(' '),
         email: profile?.email ?? email,
         phone: profile?.phone ?? '',
       };
       setCustomerId('');
       setSettings({ ...emptySettings(email), ...personal, company_name: workspaceDisplayName ?? "" });
       try {
         const response = await fetch('/api/customer/workspace-settings', { cache: 'no-store' });
         if (cancelled) return;
         if (!response.ok) {
           const info = await response.json().catch(() => ({}));
           setError(`Workspace settings could not be loaded (${response.status}): ${info.error || 'Please check workspace membership and database preferences policy.'}`);
           return;
         }
         const tenant = await response.json();
         if (cancelled) return;
         setCustomerId(tenant.company_id ?? '');
         // Logo image uses a short-lived signed URL, even when the bucket is private.
         void fetch('/api/customer/workspace-logo', { cache: 'no-store' })
           .then((r) => r.ok ? r.json() : null)
           .then((data) => { if (!cancelled) setSignedLogoUrl(typeof data?.url === 'string' ? data.url : ''); })
           .catch(() => { if (!cancelled) setSignedLogoUrl(''); });
         setSettings({
           ...emptySettings(email), ...personal,
           company_name: tenant.company_name ?? workspaceDisplayName,
           business_address: tenant.business_address ?? '',
           currency: tenant.currency ?? 'NGN',
           tax_rate: String(tenant.tax_rate ?? 7.5),
           logo_url: tenant.logo_url ?? '',
         });
       } catch {
         if (!cancelled) setMessage('Workspace settings are temporarily unavailable. Personal details can still be edited.');
       }
    })();
    return () => { cancelled = true; };
  }, [open, userId, email, name, supabase, workspaceDisplayName]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  // The owner can retry workspace resolution even if the initial GET failed.
  // The logo button must remain interactive; backend authorization is final.
  async function resolveCompanyId(): Promise<string | null> {
    if (customerId) return customerId;
    try {
      const response = await fetch('/api/customer/workspace-settings', { cache: 'no-store' });
      const info = await response.json().catch(() => ({}));
      if (!response.ok || typeof info.company_id !== 'string' ||
          !/^[0-9a-f-]{36}$/i.test(info.company_id)) {
        setError(`Cannot identify your authorized company (${response.status}): ${info.error || 'Please sign in and select your workspace.'}`);
        return null;
      }
      setCustomerId(info.company_id);
      return info.company_id;
    } catch {
      setError('Cannot contact workspace settings. Please check the server and try again.');
      return null;
    }
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // Selecting the same image twice should still trigger upload
    if (!file) return;
    setError(''); setMessage('');
    const companyId = await resolveCompanyId();
    if (!companyId) return;
    if (!file.type.startsWith('image/')) { setError('Choose an image file such as PNG, JPG, or WebP.'); return; }
    if (file.size > 3 * 1024 * 1024) { setError('The logo must be 3 MB or smaller.'); return; }
    setBusy(true);
    const extension = ({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'} as Record<string,string>)[file.type];
    if (!extension) { setError('Choose PNG, JPG, or WebP.'); setBusy(false); return; }
    const path = `${companyId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) {
      setError(`Logo upload failed: ${uploadError.message}. Check the logos bucket and its tenant-safe policies.`);
      setBusy(false); return;
    }
    // Persist by *storage object key*; the server constructs the canonical URL
    // from the authenticated workspace and verifies ownership and existence.
    let saved: Response;
    try {
      saved = await fetch('/api/customer/workspace-settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: settings.company_name, currency: settings.currency, tax_rate: Number(settings.tax_rate),
          business_address: settings.business_address, logo_path: path,
        }),
      });
    } catch {
      setError('Logo uploaded, but saving company branding failed. Check your connection and retry.');
      setBusy(false); return;
    }
    if (!saved.ok) {
      const result = await saved.json().catch(() => ({}));
      setError(`Logo uploaded, but saving company branding failed: ${result.error || 'Permission denied'}`);
      setBusy(false); return;
    }
    const savedLogoResult = await saved.json().catch(() => ({}));
    if (!savedLogoResult.ok || savedLogoResult.company_id !== companyId || typeof savedLogoResult.logo_url !== 'string') {
      setError('Logo uploaded, but the workspace could not confirm its saved branding.');
      setBusy(false); return;
    }
    update('logo_url', savedLogoResult.logo_url);
    window.dispatchEvent(new CustomEvent('jaad:customer-logo-updated', {
      detail: { companyId, logoUrl: savedLogoResult.logo_url },
    }));
    window.dispatchEvent(new Event('jaad:workspace-preferences-updated'));
    const preview = await fetch('/api/customer/workspace-logo', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
    setSignedLogoUrl(typeof preview?.url === 'string' ? preview.url : '');
    setMessage('Company logo saved to your workspace.');
    setBusy(false);
    router.refresh();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const tax = Number(settings.tax_rate);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      setError('Tax must be a number from 0 to 100.'); setBusy(false); return;
    }
    // Never grant broad UPDATE on profiles: a narrow, self-only RPC edits
    // contact fields without exposing company_id, role_id or account status.
    const { error: profileError } = await supabase.rpc('jaad_customer_update_own_profile', {
      p_first_name: settings.first_name.trim(),
      p_last_name: settings.last_name.trim(),
      p_phone: settings.phone.trim(),
    });
    if (profileError) { setError(`Could not save personal details: ${profileError.message}`); setBusy(false); return; }
    const { data: authData } = await supabase.auth.getUser();
    const requestedEmail = settings.email.trim();
    let emailConfirmationPending = false;
    if (requestedEmail && authData.user?.email && requestedEmail.toLowerCase() !== authData.user.email.toLowerCase()) {
      // Auth email changes require Supabase verification; do not directly
      // rewrite profiles.email and create an identity mismatch.
      const { error: emailError } = await supabase.auth.updateUser({ email: requestedEmail });
      if (emailError) { setError(`Personal details saved, but email update failed: ${emailError.message}`); setBusy(false); return; }
      emailConfirmationPending = true;
    }
    const verifiedCompanyId = customerId || await resolveCompanyId();
    if (verifiedCompanyId) {
      const response = await fetch('/api/customer/workspace-settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        // No logo_url here: a stale browser image must never block currency/tax saving.
        body: JSON.stringify({company_name:settings.company_name,currency:settings.currency,tax_rate:tax,business_address:settings.business_address}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok || result.company_id !== verifiedCompanyId) {
        setError(`Personal details saved, but workspace settings failed: ${result.error || 'Save was not confirmed'}`);
        setBusy(false); return;
      }
      // Only show success after the server has independently read back the
      // committed settings from this particular authenticated workspace.
      setSettings((previous) => ({ ...previous,
        company_name: String(result.company_name ?? previous.company_name),
        currency: String(result.currency),
        tax_rate: String(result.tax_rate),
        business_address: String(result.business_address ?? ''),
        logo_url: String(result.logo_url ?? ''),
      }));
      window.dispatchEvent(new Event('jaad:workspace-preferences-updated'));
      window.dispatchEvent(new CustomEvent('jaad:customer-logo-updated', {
        detail: { companyId: verifiedCompanyId, logoUrl: String(result.logo_url ?? '') },
      }));
    } else {
      setError('Personal details saved, but company settings were not saved because the authorized workspace could not be loaded.');
      setBusy(false); return;
    }
    setMessage(emailConfirmationPending ? 'Settings permanently saved. Confirm your email using the verification message.' : 'Workspace settings saved and verified.');
    setBusy(false);
    router.refresh();
  }

  async function changePassword() {
    setBusy(true); setError(''); setMessage('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/update-password`,
    });
    if (resetError) setError(`Password reset email could not be sent: ${resetError.message}`);
    else setMessage(`Password reset instructions sent to ${email}.`);
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    window.location.assign('/customer/login');
  }

  const initials = `${settings.first_name[0] ?? name[0] ?? '?'}${settings.last_name[0] ?? ''}`.toUpperCase();

  return (
    <>
      <button type="button" aria-label="Profile and workspace settings" title="Profile and workspace settings"
        onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400">
        {signedLogoUrl ? <img src={signedLogoUrl} alt="Workspace logo" className="h-9 w-9 rounded-full object-cover" /> : avatarUrl ? <img src={avatarUrl} alt="Profile photo" className="h-9 w-9 rounded-full object-cover" /> : (initials || '?')}
      </button>
      {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="workspace-settings-title" className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-700 bg-white p-5 text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-red-600">Account settings</p><h2 id="workspace-settings-title" className="mt-1 text-xl font-bold">Profile &amp; workspace</h2><p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Manage your details and the company identity used in your workspace.</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close settings" className="rounded-lg px-3 py-2 text-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">Ã—</button>
          </div>
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-red-50 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-200">{signedLogoUrl ? <img src={signedLogoUrl} alt="Company logo" className="h-full w-full object-contain" /> : initials || '?'}</div>
            <div className="min-w-0 flex-1"><div className="font-semibold">{settings.company_name || 'Your company / workspace'}</div><div className="truncate text-xs text-neutral-500">{email} Â· {role}</div></div>
            <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800">Upload logo<input type="file" disabled={busy} accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadLogo} /></label>
          </div>
          <form onSubmit={save} className="space-y-5">
            <div><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">Personal details</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="First name" value={settings.first_name} onChange={(v) => update('first_name', v)} required />
              <Field label="Last name" value={settings.last_name} onChange={(v) => update('last_name', v)} required />
              <Field label="Email address" type="email" value={settings.email} onChange={(v) => update('email', v)} required />
              <Field label="Phone number" value={settings.phone} onChange={(v) => update('phone', v)} />
            </div></div>
            <div><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">Company / tenant workspace</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Company name" value={settings.company_name} readOnly onChange={(v) => update('company_name', v)} />
              <Field label="Business address" value={settings.business_address} onChange={(v) => update('business_address', v)} />
              <label className="block text-sm"><span className="mb-1.5 block font-medium">Workspace currency</span><select value={settings.currency} onChange={(e) => update('currency', e.target.value)} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-red-500 dark:border-neutral-600 dark:bg-neutral-800">{CURRENCIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
              <Field label="Tax rate (%) â€” default 7.5" type="number" value={settings.tax_rate} onChange={(v) => update('tax_rate', v)} min="0" max="100" step="0.01" />
            </div><p className="mt-2 text-xs text-neutral-500">Currency and tax apply to features that read the workspace settings. Existing invoices are not automatically recalculated.</p></div>
            {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
            {message && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2"><button type="button" onClick={changePassword} disabled={busy} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-neutral-800">Send password reset</button><button type="button" onClick={signOut} disabled={busy} className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30">Log out</button></div>
              <div className="flex gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600">Cancel</button><button type="submit" disabled={busy} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">{busy ? 'Savingâ€¦' : 'Save changes'}</button></div>
            </div>
          </form>
        </section>
      </div>}
    </>
  );
}

function Field({ label, value, onChange, type = 'text', required, readOnly, min, max, step }: {
  label: string; value: string; onChange: (value: string) => void; type?: string;
  required?: boolean; readOnly?: boolean; min?: string; max?: string; step?: string;
}) {
  return <label className="block text-sm"><span className="mb-1.5 block font-medium">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} readOnly={readOnly} min={min} max={max} step={step} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-neutral-600 dark:bg-neutral-800" /></label>;
}


