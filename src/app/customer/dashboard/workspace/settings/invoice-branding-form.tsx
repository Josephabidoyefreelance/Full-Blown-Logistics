'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

type Branding = { legal_name: string; address: string; phone: string; email: string; website: string; logo_path: string | null };

export default function InvoiceBrandingForm({ companyId, initial, logoUrl }: { companyId: string; initial: Branding; logoUrl: string | null }) {
  const [values, setValues] = useState(initial);
  const [currentLogo, setCurrentLogo] = useState(logoUrl);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, startTransition] = useTransition();

  function update(key: keyof Omit<Branding, 'logo_path'>, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function save() {
    setError(''); setNotice('');
    startTransition(async () => {
      try {
        const supabase = createClient();
        let logoPath = values.logo_path;
        if (file) {
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Upload a PNG, JPG or WEBP image.');
          if (file.size > 5 * 1024 * 1024) throw new Error('Logo must be 5 MB or smaller.');
          const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
          const safeExt = ['png', 'jpg', 'jpeg', 'webp'].includes(ext) ? ext : 'png';
          logoPath = `${companyId}/invoice-logo-${Date.now()}.${safeExt}`;
          const { error: uploadError } = await supabase.storage.from('jaad-invoice-logos').upload(logoPath, file, { upsert: true, contentType: file.type });
          if (uploadError) throw new Error(uploadError.message);
        }
        const { error: saveError } = await supabase.from('invoice_branding').upsert({
          company_id: companyId,
          legal_name: values.legal_name.trim(),
          address: values.address.trim(),
          phone: values.phone.trim(),
          email: values.email.trim(),
          website: values.website.trim(),
          logo_path: logoPath,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' });
        if (saveError) throw new Error(saveError.message);
        setValues((current) => ({ ...current, logo_path: logoPath }));
        if (logoPath) {
          const { data } = await supabase.storage.from('jaad-invoice-logos').createSignedUrl(logoPath, 3600);
          setCurrentLogo(data?.signedUrl ?? null);
        }
        setFile(null);
        setNotice('Invoice branding saved. New invoice previews will use these details.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save invoice branding.');
      }
    });
  }

  const field = 'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 dark:border-neutral-700 dark:bg-neutral-950';
  return <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center gap-4">{currentLogo ? <img src={currentLogo} alt="Company invoice logo" className="h-16 w-16 rounded-lg border border-neutral-200 bg-white object-contain p-1 dark:border-neutral-700" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-2xl text-neutral-400 dark:border-neutral-700">＋</div>}<div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">Company invoice logo</h3><p className="mt-1 text-xs text-neutral-500">PNG, JPG or WEBP · maximum 5 MB</p><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs" /></div></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Registered company name<input className={`${field} mt-1.5`} value={values.legal_name} onChange={(e) => update('legal_name', e.target.value)} maxLength={160} /></label>
      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Business phone<input className={`${field} mt-1.5`} value={values.phone} onChange={(e) => update('phone', e.target.value)} maxLength={60} /></label>
      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Invoice email<input type="email" className={`${field} mt-1.5`} value={values.email} onChange={(e) => update('email', e.target.value)} maxLength={160} /></label>
      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Website<input className={`${field} mt-1.5`} value={values.website} onChange={(e) => update('website', e.target.value)} maxLength={160} /></label>
      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300 sm:col-span-2">Business address<textarea className={`${field} mt-1.5 min-h-24`} value={values.address} onChange={(e) => update('address', e.target.value)} maxLength={500} /></label>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{notice}</p>}
    <div className="mt-5 flex justify-end"><button type="button" disabled={pending} onClick={save} className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{pending ? 'Saving…' : 'Save invoice branding'}</button></div>
  </section>;
}
