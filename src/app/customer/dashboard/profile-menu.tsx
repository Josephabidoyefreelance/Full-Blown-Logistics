'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Props = {
  userId: string;
  name: string;
  role: string;
  email: string;
  avatarUrl: string | null;
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
  ['NGN', 'Nigerian Naira (₦)'], ['USD', 'US Dollar ($)'], ['GBP', 'British Pound (£)'],
  ['EUR', 'Euro (€)'], ['CAD', 'Canadian Dollar (C$)'], ['AUD', 'Australian Dollar (A$)'],
  ['NZD', 'New Zealand Dollar (NZ$)'], ['GHS', 'Ghanaian Cedi (GH₵)'], ['KES', 'Kenyan Shilling (KSh)'],
  ['ZAR', 'South African Rand (R)'], ['INR', 'Indian Rupee (₹)'], ['AED', 'UAE Dirham (د.إ)'],
  ['XOF', 'West African CFA franc'], ['XAF', 'Central African CFA franc'], ['JPY', 'Japanese Yen (¥)'],
  ['CNY', 'Chinese Yuan (¥)'], ['CHF', 'Swiss Franc (CHF)'], ['SGD', 'Singapore Dollar (S$)'],
  ['BRL', 'Brazilian Real (R$)'], ['MXN', 'Mexican Peso ($)'], ['SAR', 'Saudi Riyal (﷼)'],
] as const;

const emptySettings = (email: string): Settings => ({
  first_name: '', last_name: '', email, phone: '', company_name: '', business_address: '',
  currency: 'NGN', tax_rate: '7.5', logo_url: '',
});

export default function ProfileMenu({ userId, name, role, email, avatarUrl }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [settings, setSettings] = useState<Settings>(emptySettings(email));

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setError(''); setMessage('');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name,last_name,full_name,email,phone')
        .eq('id', userId).maybeSingle();
      if (cancelled) return;
      if (profileError) setError('Profile settings could not be loaded. Run the included SQL migration first.');

      // Never read the first arbitrary owner/staff membership for account settings.
      const activeResponse = await fetch('/api/customer/active-tenant', { cache: 'no-store' });
      const active = activeResponse.ok ? await activeResponse.json() as { customerId: string | null } : null;
      let tenant: any = null;
      if (active?.customerId) {
        const tenantLookup = await supabase.from('customers')
          .select('id,user_id,company_name,business_address,currency,tax_rate,logo_url,email,phone')
          .eq('id', active.customerId).maybeSingle();
        tenant = tenantLookup.data;
      }
      setIsOwner(Boolean(tenant && tenant.user_id === userId));
      if (cancelled) return;
      setCustomerId(tenant?.id ?? '');
      const fallbackNames = (profile?.full_name ?? name).trim().split(/\s+/);
      setSettings({
        first_name: profile?.first_name ?? fallbackNames[0] ?? '',
        last_name: profile?.last_name ?? fallbackNames.slice(1).join(' '),
        email: profile?.email ?? email,
        phone: profile?.phone ?? tenant?.phone ?? '',
        company_name: tenant?.company_name ?? '',
        business_address: tenant?.business_address ?? '',
        currency: tenant?.currency ?? 'NGN',
        tax_rate: String(tenant?.tax_rate ?? 7.5),
        logo_url: tenant?.logo_url ?? '',
      });
    })();
    return () => { cancelled = true; };
  }, [open, userId, email, name, supabase]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(''); setMessage('');
    if (!customerId || !isOwner) { setError('Only the company workspace owner can change its logo.'); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Choose PNG, JPG or WebP.'); return; }
    if (file.size > 3 * 1024 * 1024) { setError('Logo must be 3 MB or smaller.'); return; }
    setBusy(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== userId) throw new Error('Session expired. Sign in again.');
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${customerId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('logos').getPublicUrl(path);
      const { data: updated, error: saveError } = await supabase.from('customers')
        .update({ logo_url: data.publicUrl }).eq('id', customerId).eq('user_id', userId)
        .select('id').single();
      if (saveError || !updated) {
        await supabase.storage.from('logos').remove([path]);
        throw new Error(saveError?.message || 'Company logo could not be saved. Check customers UPDATE RLS.');
      }
      update('logo_url', data.publicUrl);
      setMessage('Company logo saved. Refresh other pages to display it in the workspace.');
    } catch (err: any) {
      setError(`Logo upload failed: ${err?.message || 'Unknown error'}`);
    } finally { setBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const tax = Number(settings.tax_rate);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      setError('Tax must be a number from 0 to 100.'); setBusy(false); return;
    }
    const fullName = `${settings.first_name.trim()} ${settings.last_name.trim()}`.trim();
    const { data: authResult, error: authError } = await supabase.auth.getUser();
    if (authError || !authResult.user || authResult.user.id !== userId) {
      setError('Session expired. Please sign in again.'); setBusy(false); return;
    }
    // Existing profiles are created during trusted registration. Do not upsert:
    // INSERT privileges on profiles are intentionally revoked for authenticated users.
    const { data: savedProfile, error: profileError } = await supabase.from('profiles')
      .update({
        first_name: settings.first_name.trim(),
        last_name: settings.last_name.trim(),
        full_name: fullName || settings.email.trim(),
        phone: settings.phone.trim(),
      })
      .eq('id', authResult.user.id)
      .select('id,first_name,last_name')
      .single();
    if (profileError || !savedProfile) {
      setError(`Could not save personal details: ${profileError?.message || 'Profile was not returned'}`);
      setBusy(false); return;
    }
    if (customerId && isOwner) {
      const { error: tenantError } = await supabase.from('customers').update({
        company_name: settings.company_name.trim(), business_address: settings.business_address.trim(),
        currency: settings.currency, tax_rate: tax, logo_url: settings.logo_url || null,
        email: settings.email.trim(), phone: settings.phone.trim(),
      }).eq('id', customerId);
      if (tenantError) { setError(`Personal details saved, but workspace settings failed: ${tenantError.message}`); setBusy(false); return; }
    } else if (!customerId && (settings.company_name.trim() || settings.business_address.trim() || settings.logo_url)) {
      setError('Personal details saved, but no company workspace is linked. Workspace name, address, logo, currency, and tax were not saved.');
      setBusy(false); return;
    }
    setMessage('Settings saved. Refresh the page to see the updated workspace branding.');
    setBusy(false);
  }

  async function changePassword() {
    setBusy(true); setError(''); setMessage('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/customer/reset-password`,
    });
    if (resetError) setError(`Password reset email could not be sent: ${resetError.message}`);
    else setMessage(`Password reset instructions sent to ${email}.`);
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    window.location.assign('/admin/login');
  }

  const initials = `${settings.first_name[0] ?? name[0] ?? '?'}${settings.last_name[0] ?? ''}`.toUpperCase();

  return (
    <>
      <button type="button" aria-label="Profile and workspace settings" title="Profile and workspace settings"
        onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400">
        {settings.logo_url ? <img src={settings.logo_url} alt="Workspace logo" className="h-9 w-9 rounded-full object-cover" /> : avatarUrl ? <img src={avatarUrl} alt="Profile photo" className="h-9 w-9 rounded-full object-cover" /> : (initials || '?')}
      </button>
      {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="workspace-settings-title" className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-neutral-700 bg-white p-5 text-neutral-900 shadow-2xl dark:bg-neutral-900 dark:text-neutral-100 sm:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-red-600">Account settings</p><h2 id="workspace-settings-title" className="mt-1 text-xl font-bold">Profile &amp; workspace</h2><p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Manage your details and the company identity used in your workspace.</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close settings" className="rounded-lg px-3 py-2 text-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">×</button>
          </div>
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-red-50 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-200">{settings.logo_url ? <img src={settings.logo_url} alt="Company logo" className="h-full w-full object-contain" /> : initials || '?'}</div>
            <div className="min-w-0 flex-1"><div className="font-semibold">{settings.company_name || 'Your company / workspace'}</div><div className="truncate text-xs text-neutral-500">{email} · {role}</div></div>
            <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadLogo} disabled={busy || !isOwner} /></label>
          </div>
          <form onSubmit={save} className="space-y-5">
            <div><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">Personal details</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="First name" value={settings.first_name} onChange={(v) => update('first_name', v)} required />
              <Field label="Last name" value={settings.last_name} onChange={(v) => update('last_name', v)} required />
              <Field label="Email address" type="email" value={settings.email} onChange={(v) => update('email', v)} required />
              <Field label="Phone number" value={settings.phone} onChange={(v) => update('phone', v)} />
            </div></div>
            <div><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">Company / tenant workspace</h3><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Company name" value={settings.company_name} onChange={(v) => update('company_name', v)} />
              <Field label="Business address" value={settings.business_address} onChange={(v) => update('business_address', v)} />
              <label className="block text-sm"><span className="mb-1.5 block font-medium">Workspace currency</span><select value={settings.currency} onChange={(e) => update('currency', e.target.value)} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-red-500 dark:border-neutral-600 dark:bg-neutral-800">{CURRENCIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
              <Field label="Tax rate (%) — default 7.5" type="number" value={settings.tax_rate} onChange={(v) => update('tax_rate', v)} min="0" max="100" step="0.01" />
            </div><p className="mt-2 text-xs text-neutral-500">Currency and tax apply to features that read the workspace settings. Existing invoices are not automatically recalculated.</p></div>
            {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
            {message && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-700 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2"><button type="button" onClick={changePassword} disabled={busy} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-600 dark:hover:bg-neutral-800">Send password reset</button><button type="button" onClick={signOut} disabled={busy} className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30">Log out</button></div>
              <div className="flex gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600">Cancel</button><button type="submit" disabled={busy} className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button></div>
            </div>
          </form>
        </section>
      </div>}
    </>
  );
}

function Field({ label, value, onChange, type = 'text', required, min, max, step }: {
  label: string; value: string; onChange: (value: string) => void; type?: string;
  required?: boolean; min?: string; max?: string; step?: string;
}) {
  return <label className="block text-sm"><span className="mb-1.5 block font-medium">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} min={min} max={max} step={step} className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 dark:border-neutral-600 dark:bg-neutral-800" /></label>;
}
