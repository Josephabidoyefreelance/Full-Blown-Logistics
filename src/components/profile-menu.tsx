'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function getInitials(name: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default function ProfileMenu({
  userId,
  name,
  role,
  email,
  avatarUrl,
}: {
  userId: string;
  name: string;
  role: string;
  email: string;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'password'>('menu');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMode('menu');
        setError('');
        setNotice('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');

    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: `${pub.publicUrl}?t=${Date.now()}` })
      .eq('id', userId);

    setUploading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');

    if (pwd.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pwd !== pwd2) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    const { error: pwError } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);

    if (pwError) {
      setError(pwError.message);
      return;
    }

    setNotice('Password updated.');
    setPwd('');
    setPwd2('');
    setMode('menu');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-red-600 text-xs font-bold text-white"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          getInitials(name)
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {mode === 'menu' && (
            <>
              <div className="flex items-center gap-3 border-b border-neutral-100 pb-3 dark:border-neutral-800">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-600 text-xs font-bold text-white">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(name)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {name || 'Unnamed user'}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{role}</div>
                  <div className="truncate text-xs text-neutral-400 dark:text-neutral-500">{email}</div>
                </div>
              </div>

              <div className="mt-2 space-y-0.5">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full rounded-md px-2 py-2 text-left text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {uploading ? 'Uploading...' : 'Change photo'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  onClick={() => {
                    setMode('password');
                    setError('');
                    setNotice('');
                  }}
                  className="w-full rounded-md px-2 py-2 text-left text-[13px] font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Change password
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-md px-2 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  Log out
                </button>
              </div>

              {notice && <div className="mt-2 text-xs text-green-600 dark:text-green-500">{notice}</div>}
              {error && <div className="mt-2 text-xs text-red-600 dark:text-red-500">{error}</div>}
            </>
          )}

          {mode === 'password' && (
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Change password
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('menu');
                    setError('');
                  }}
                  className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  Back
                </button>
              </div>
              <input
                type="password"
                placeholder="New password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="mb-2 w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                className="mb-2 w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
              {error && <div className="mb-2 text-xs text-red-600 dark:text-red-500">{error}</div>}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-red-600 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
