'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import BookShipmentForm from './book-shipment-form';
import ShipmentDetailTrigger from './shipment-detail-modal';
import InventoryTab from './inventory-tab';
import ChatWidget from './chat-widget';
import SupportTab from './support-tab';
import LeadsTab from './leads-tab';
import NotesTab from './notes-tab';
import CalculatorTab from './calculator-tab';
import InvoiceDetailTrigger from './invoice-detail-modal';
import MyInvoicesTab from './my-invoices-tab';
import ReportTab from './report-tab';
import OverviewTab from './overview-tab';
import UtilitiesTab from './utilities-tab';
import AdministratorTab from './administrator-tab';
import type { StaffRole } from './roles-config';

type Tab = 'overview' | 'inventory' | 'leads' | 'shipments' | 'track' | 'invoices' | 'notes' | 'report' | 'profile' | 'calculator' | 'support' | 'utilities' | 'administrator';

const ALL_TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'leads', label: 'Leads' },
  { key: 'shipments', label: 'My Shipments' },
  { key: 'track', label: 'Track' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'notes', label: 'Notes' },
  { key: 'report', label: 'Report' },
  { key: 'support', label: 'Support' },
  { key: 'profile', label: 'Profile' },
  { key: 'calculator', label: 'Calculator' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'administrator', label: 'Administrator' },
];

type Customer = {
  name: string;
  email: string;
  phone: string;
  balance: number;
  avatar_url: string | null;
  logo_url: string | null;
  currency: string | null;
  timezone: string | null;
  tax_rate: number | null;
  support_phone: string | null;
};

const CURRENCY_SYMBOLS: Record<string, string> = { NGN: '\u20a6', USD: '$', GBP: '\u00a3', EUR: '\u20ac', GHS: '\u20b5', KES: 'KSh', ZAR: 'R' };
function symbolFor(code?: string | null) {
  return CURRENCY_SYMBOLS[code ?? 'NGN'] ?? code ?? '\u20a6';
}

const CURRENCY_OPTIONS = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'];

const TIMEZONE_OPTIONS = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'UTC',
];

type CargoItemRow = {
  id: string;
  booking_id: string;
  description: string;
  quantity: string;
  gross_weight: string;
  unit: string;
  rate_class: string;
  chargeable_weight: string;
};

type Booking = {
  id: string;
  tracking_no: string | null;
  origin: string;
  destination: string;
  type: string;
  status: string;
  pickup_date: string | null;
  declared_value: number | null;
  weight: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  sender_address: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_address: string | null;
};

type Invoice = {
  id: string;
  invoice_no: string;
  status: string;
  amount: number;
  linked_booking_id: string;
};

const STATUS_COLORS: Record<string, string> = {
  Pending: '#ca8a04',
  Assigned: '#2563c7',
  'In Transit': '#7c3aed',
  Delivered: '#1f9d5c',
  Cancelled: 'var(--error-text)',
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'var(--subtext)';
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: color + '1a', color }}
    >
      {status}
    </span>
  );
}

export default function CustomerDashboard() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [staffPermittedModules, setStaffPermittedModules] = useState<string[]>([]);
  const [staffAccessBlockedReason, setStaffAccessBlockedReason] = useState<string | null>(null);
  const [staffDisplayName, setStaffDisplayName] = useState<string | null>(null);

  const [muted, setMuted] = useState(false);
  const [hasLowStockAlert, setHasLowStockAlert] = useState(false);
  const [pendingInvoiceItem, setPendingInvoiceItem] = useState<{ description: string; quantity: string } | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCurrency, setProfileCurrency] = useState('NGN');
  const [profileTimezone, setProfileTimezone] = useState('Africa/Lagos');
  const [profileSupportPhone, setProfileSupportPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSavedAt, setProfileSavedAt] = useState<Date | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [now, setNow] = useState<Date | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cargoItemsByBookingId, setCargoItemsByBookingId] = useState<Record<string, CargoItemRow[]>>({});
  const [ownInvoiceTotals, setOwnInvoiceTotals] = useState({ subtotal: 0, tax: 0, total: 0 });
  const [shipmentsLoading, setShipmentsLoading] = useState(true);

  const [trackQuery, setTrackQuery] = useState('');
  const [trackResult, setTrackResult] = useState<Booking | null>(null);
  const [trackSearched, setTrackSearched] = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function getGreeting() {
    const tz = customer?.timezone || undefined;
    let hour: number;
    try {
      hour = parseInt(
        new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz }).format(now ?? new Date()),
        10
      );
    } catch {
      hour = (now ?? new Date()).getHours();
    }
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/customer/login');
        return;
      }

      setUserId(user.id);

      const { data: ownerRow, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, balance, avatar_url, logo_url, currency, timezone, tax_rate, support_phone, user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      let resolvedCustomer: any = ownerRow;
      let resolvedEffectiveUserId = user.id;
      let resolvedRole: StaffRole | null = null;

      if (!ownerRow) {
        const { data: membership } = await supabase
          .from('customer_team_members')
          .select('name, role, status, permitted_modules, customers(id, name, email, phone, balance, avatar_url, logo_url, currency, timezone, tax_rate, support_phone, user_id)')
          .eq('user_id', user.id)
          .neq('status', 'Removed')
          .maybeSingle();

        const parentCustomer = membership?.customers
          ? (Array.isArray(membership.customers) ? membership.customers[0] : membership.customers)
          : null;

        if (membership && parentCustomer) {
          let effectiveStatus = membership.status;

          // First login after being invited: accept it now, silently.
          if (effectiveStatus === 'Invited') {
            await supabase.rpc('accept_staff_invite');
            effectiveStatus = 'Active';
          }

          if (effectiveStatus === 'Active') {
            resolvedCustomer = parentCustomer;
            resolvedEffectiveUserId = parentCustomer.user_id;
            resolvedRole = membership.role as StaffRole;
            setStaffPermittedModules(membership.permitted_modules ?? []);
            setStaffDisplayName(membership.name || user.email?.split('@')[0] || null);
          } else {
            setStaffAccessBlockedReason(effectiveStatus);
          }
        }
      }

      if (error && !resolvedCustomer) setCustomerError(error.message);
      setCustomer(resolvedCustomer);
      setCustomerId(resolvedCustomer?.id ?? null);
      setEffectiveUserId(resolvedCustomer ? resolvedEffectiveUserId : null);
      setStaffRole(resolvedRole);

      if (resolvedCustomer) {
        setProfileName(resolvedCustomer.name ?? '');
        setProfilePhone(resolvedCustomer.phone ?? '');
        setProfileCurrency(resolvedCustomer.currency ?? 'NGN');
        setProfileTimezone(resolvedCustomer.timezone ?? 'Africa/Lagos');
        setProfileSupportPhone(resolvedCustomer.support_phone ?? '');
      }
      setLoading(false);

      if (resolvedCustomer) {
        await fetchShipmentsData(resolvedEffectiveUserId);
        await fetchOwnInvoiceTotals(resolvedEffectiveUserId);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchShipmentsData(userId: string) {
    setShipmentsLoading(true);

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select(
        'id, tracking_no, origin, destination, type, status, pickup_date, declared_value, weight, sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address'
      )
      .eq('user_id', userId)
      .order('pickup_date', { ascending: false });

    setBookings(bookingsData ?? []);

    const bookingIds = (bookingsData ?? []).map((b) => b.id);

    if (bookingIds.length) {
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, invoice_no, status, amount, linked_booking_id')
        .in('linked_booking_id', bookingIds);
      setInvoices(invoicesData ?? []);

      const { data: cargoData } = await supabase
        .from('booking_cargo_items')
        .select('id, booking_id, description, quantity, gross_weight, unit, rate_class, chargeable_weight')
        .in('booking_id', bookingIds);

      const grouped: Record<string, CargoItemRow[]> = {};
      (cargoData ?? []).forEach((item) => {
        if (!grouped[item.booking_id]) grouped[item.booking_id] = [];
        grouped[item.booking_id].push(item);
      });
      setCargoItemsByBookingId(grouped);
    } else {
      setInvoices([]);
      setCargoItemsByBookingId({});
    }

    setShipmentsLoading(false);
  }

  async function refetchShipments() {
    if (effectiveUserId) await fetchShipmentsData(effectiveUserId);
  }

  async function fetchOwnInvoiceTotals(userId: string) {
    const { data } = await supabase
      .from('customer_own_invoices')
      .select('subtotal, tax, total')
      .eq('user_id', userId)
      .eq('status', 'Paid');

    const totals = (data ?? []).reduce(
      (acc, inv) => ({
        subtotal: acc.subtotal + (inv.subtotal || 0),
        tax: acc.tax + (inv.tax || 0),
        total: acc.total + (inv.total || 0),
      }),
      { subtotal: 0, tax: 0, total: 0 }
    );

    setOwnInvoiceTotals(totals);
  }

  async function refetchFinancials() {
    if (effectiveUserId) await fetchOwnInvoiceTotals(effectiveUserId);
  }

  useEffect(() => {
    if (!effectiveUserId) return;

    const channel = supabase
      .channel(`customer_bookings_${effectiveUserId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `user_id=eq.${effectiveUserId}` },
        (payload) => {
          const updated = payload.new as Booking;
          setBookings((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUserId]);

  async function handleTrack() {
    setTrackSearched(true);
    const q = trackQuery.trim();
    if (!q) {
      setTrackResult(null);
      return;
    }

    setTrackLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select(
        'id, tracking_no, origin, destination, type, status, pickup_date, declared_value, weight, sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address'
      )
      .ilike('tracking_no', `%${q}%`)
      .limit(1);

    setTrackResult(data && data.length ? data[0] : null);
    setTrackLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push('/customer/login');
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('[avatar] no file selected');
      return;
    }

    console.log('[avatar] starting upload', file.name, file.size, file.type);
    setAvatarUploading(true);
    setAvatarError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('[avatar] user check', { user: user?.id, userError });
      if (userError) throw userError;
      if (!user) throw new Error('Not signed in.');

      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      console.log('[avatar] uploading to path', path);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      console.log('[avatar] upload result', { uploadData, uploadError });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = publicUrlData.publicUrl;
      console.log('[avatar] public url', avatarUrl);

      const { data: updateData, error: updateError } = await supabase
        .from('customers')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id)
        .select('id');

      console.log('[avatar] update result', { updateData, updateError });
      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) {
        throw new Error('Update matched zero rows. Your customers table row may not have a user_id matching this login.');
      }

      const { data: freshRow, error: refetchError } = await supabase
        .from('customers')
        .select('name, email, phone, balance, avatar_url, logo_url, currency, timezone, tax_rate, support_phone')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[avatar] refetch result', { freshRow, refetchError });
      if (refetchError) throw refetchError;

      if (freshRow) {
        setCustomer(freshRow);
      } else {
        setCustomer((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
      }
    } catch (err: any) {
      console.error('[avatar] FAILED', err);
      setAvatarError(err?.message || JSON.stringify(err) || 'Upload failed for an unknown reason.');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    setPasswordSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
  }

  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileError(null);

    if (!effectiveUserId) {
      setProfileError('Not signed in.');
      setProfileSaving(false);
      return;
    }

    const { data: updatedRow, error } = await supabase
      .from('customers')
      .update({
        name: profileName,
        phone: profilePhone,
        currency: profileCurrency,
        timezone: profileTimezone,
        ...(!staffRole ? { support_phone: profileSupportPhone } : {}),
      })
      .eq('user_id', effectiveUserId)
      .select('name, email, phone, balance, avatar_url, logo_url, currency, timezone, tax_rate, support_phone')
      .maybeSingle();

    setProfileSaving(false);

    if (error) {
      setProfileError(error.message);
      return;
    }

    if (!updatedRow) {
      setProfileError('Save did not update any row. Your account may not have a matching customers record, contact support.');
      return;
    }

    setCustomer(updatedRow);
    setProfileSavedAt(new Date());
  }

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setLogoError(null);

    try {
      if (!effectiveUserId) throw new Error('Not signed in.');

      const ext = file.name.split('.').pop();
      const path = `${effectiveUserId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(path);
      const logoUrl = publicUrlData.publicUrl;

      const { data: updateData, error: updateError } = await supabase
        .from('customers')
        .update({ logo_url: logoUrl })
        .eq('user_id', effectiveUserId)
        .select('id');
      if (updateError) throw updateError;
      if (!updateData || updateData.length === 0) {
        throw new Error('Update matched zero rows.');
      }

      setCustomer((prev: any) => (prev ? { ...prev, logo_url: logoUrl } : prev));
    } catch (err: any) {
      setLogoError(err?.message || 'Upload failed.');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  async function handleRemoveLogo() {
    if (!effectiveUserId) return;
    setLogoUploading(true);
    setLogoError(null);
    const { error } = await supabase.from('customers').update({ logo_url: null }).eq('user_id', effectiveUserId);
    setLogoUploading(false);
    if (error) {
      setLogoError(error.message);
      return;
    }
    setCustomer((prev: any) => (prev ? { ...prev, logo_url: null } : prev));
  }

  const initials = customer?.name
    ? customer.name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : 'CU';

  const themeVars = darkMode
    ? {
        '--bg': '#0e0e10',
        '--card': '#17171a',
        '--border': '#242428',
        '--text': '#f5f5f6',
        '--subtext': '#9a9aa0',
        '--input-bg': '#1c1c1f',
        '--input-border': '#2c2c30',
        '--error-bg': '#2a1613',
        '--error-border': '#4a2420',
        '--error-text': '#ff6b60',
        '--success-bg': '#12261a',
        '--success-border': '#1f4530',
        '--success-text': '#4ade80',
      }
    : {
        '--bg': '#f5f5f6',
        '--card': '#ffffff',
        '--border': '#eceef0',
        '--text': '#0b0b0d',
        '--subtext': '#6c6c72',
        '--input-bg': '#ffffff',
        '--input-border': '#d8d8db',
        '--error-bg': '#fdf0ef',
        '--error-border': '#f3c9c7',
        '--error-text': '#b8140d',
        '--success-bg': '#f0fdf3',
        '--success-border': '#c9e8d1',
        '--success-text': '#0f7a35',
      };

  const visibleTabs = staffRole
    ? ALL_TABS.filter((t) => staffPermittedModules.includes(t.key))
    : ALL_TABS;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]" style={themeVars as React.CSSProperties}>
        <p className="text-sm text-[var(--subtext)]">Loading your account...</p>
      </div>
    );
  }

  if (staffAccessBlockedReason) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4" style={themeVars as React.CSSProperties}>
        <div className="max-w-sm rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-center">
          <p className="mb-2 text-base font-bold text-[var(--text)]">Access paused</p>
          <p className="text-sm text-[var(--subtext)]">
            Your account status is currently &quot;{staffAccessBlockedReason}&quot;. Contact your business account owner to restore access.
          </p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4" style={themeVars as React.CSSProperties}>
        <div className="max-w-sm rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-center">
          <p className="mb-2 text-base font-bold text-[var(--text)]">No account found</p>
          <p className="text-sm text-[var(--subtext)]">
            We couldn&apos;t find a business account or staff invite for this login. If you were expecting access, contact whoever set up your account.
          </p>
          {customerError && <p className="mt-2 text-[11px] text-[var(--error-text)]">{customerError}</p>}
          <p className="mt-3 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--subtext)]">
            Debug: logged in as user ID <span className="font-mono">{userId ?? 'none'}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]" style={themeVars as React.CSSProperties}>
      {/* sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col overflow-y-auto border-r border-[#1f1f22] bg-[#0b0b0d] md:flex">
        <div className="flex items-center gap-2 border-b border-[#1f1f22] px-5 py-5">
          {customer?.logo_url ? (
            <img src={customer.logo_url} alt="Company logo" width={32} height={32} className="h-8 w-8 rounded object-cover" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#1a1a1d] text-[10px] font-bold text-[#6c6c72]">
              {initials}
            </div>
          )}
          <span className="text-[13px] font-bold uppercase tracking-wide text-white">Customer Portal</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`block w-full rounded-md px-3.5 py-2.5 text-left text-[13.5px] font-semibold ${
                tab === t.key ? 'bg-[#e5231b] text-white' : 'text-[#a0a0a5] hover:bg-[#1a1a1d]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-[#1f1f22] p-3">
          <button onClick={logout} className="w-full rounded-md px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-[#8a8a90] hover:bg-[#1a1a1d]">
            Log out
          </button>
        </div>
      </aside>

      {/* mobile tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex overflow-x-auto border-t border-[#1f1f22] bg-[#0b0b0d] md:hidden">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 whitespace-nowrap px-3 py-3 text-[11px] font-semibold ${
              tab === t.key ? 'text-[#e5231b]' : 'text-[#a0a0a5]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-[#1f1f22] bg-[var(--bg)] px-5 py-5 md:px-8">
          <div>
            <h1 className="text-lg font-bold text-[var(--text)]">
              {(() => {
                const displayName = staffDisplayName || customer?.name || (customer?.email ? customer.email.split('@')[0] : null);
                return displayName ? `${getGreeting()}, ${displayName}` : getGreeting();
              })()}
            </h1>
            <p className="text-[13px] text-[var(--subtext)]">Here&apos;s what&apos;s happening with your shipments.</p>
          </div>

          <div className="relative flex items-center gap-4">
            {now && (
              <div className="hidden text-right sm:block">
                <div className="text-[13px] font-semibold text-[var(--text)]">
                  {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: customer?.timezone || undefined })}
                </div>
                <div className="text-[11px] text-[var(--subtext)]">
                  {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: customer?.timezone || undefined })}
                </div>
              </div>
            )}

            <button
              aria-label={muted ? 'Unmute notifications' : 'Mute notifications'}
              onClick={() => setMuted((m) => !m)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--subtext)] hover:bg-[var(--input-bg)]"
              title={muted ? 'Unmute notifications' : 'Mute notifications'}
            >
              {muted ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5 6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 5 6 9H2v6h4l5 4V5z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M18 6a9 9 0 0 1 0 12" />
                </svg>
              )}
            </button>

            <button
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDarkMode((d) => !d)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--subtext)] hover:bg-[var(--input-bg)]"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <button
              aria-label="Notifications"
              onClick={() => setHasLowStockAlert(false)}
              className="relative flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--subtext)] hover:bg-[var(--input-bg)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {hasLowStockAlert && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#e5231b]" />
              )}
            </button>

            <button
              aria-label="Profile"
              onClick={() => setShowProfileMenu((v) => !v)}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#e5231b] text-[11px] font-bold text-white"
            >
              {customer?.avatar_url ? (
                <img src={customer.avatar_url} alt="Profile" className="h-full w-full object-cover" onError={(e) => console.error('[avatar] image failed to load:', customer.avatar_url, e)} />
              ) : (
                initials
              )}
            </button>

            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 top-11 z-50 w-64 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e5231b] text-[13px] font-bold text-white">
                      {customer?.avatar_url ? (
                        <img src={customer.avatar_url} alt="Profile" className="h-full w-full object-cover" onError={(e) => console.error('[avatar] image failed to load:', customer.avatar_url, e)} />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-[var(--text)]">{customer?.name ?? 'Customer'}</div>
                      <div className="text-[11px] text-[var(--subtext)]">Customer</div>
                      <div className="truncate text-[11px] text-[var(--subtext)]">{customer?.email ?? '—'}</div>
                    </div>
                  </div>

                  {avatarError && (
                    <div className="mt-3 text-[11px] text-[var(--error-text)]">{avatarError}</div>
                  )}

                  <div className="mt-4 space-y-0.5 border-t border-[var(--border)] pt-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="block w-full rounded-md px-2 py-2 text-left text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] disabled:opacity-50"
                    >
                      {avatarUploading ? 'Uploading...' : 'Change photo'}
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowPasswordModal(true);
                        setPasswordError(null);
                        setPasswordSuccess(false);
                      }}
                      className="block w-full rounded-md px-2 py-2 text-left text-[13px] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)]"
                    >
                      Change password
                    </button>
                    <button
                      onClick={logout}
                      className="block w-full rounded-md px-2 py-2 text-left text-[13px] font-semibold text-[var(--error-text)] hover:bg-[var(--error-bg)]"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        <div className="flex-1 overflow-y-auto p-5 pb-20 md:p-8 md:pb-8">
          {customerError && (
            <div className="mb-5 rounded-md border border-[var(--error-border)] bg-[var(--error-bg)] p-3.5 text-[13px] text-[var(--error-text)]">
              Could not load your profile details ({customerError}).
            </div>
          )}

          {(() => {
            const activeShipments = bookings.filter((b) =>
              ['Pending', 'Assigned', 'In Transit'].includes(b.status)
            ).length;

            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const deliveredThisMonth = bookings.filter((b) => {
              if (b.status !== 'Delivered' || !b.pickup_date) return false;
              const d = new Date(b.pickup_date);
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            }).length;

            const shipmentCost = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
            const revenue = ownInvoiceTotals.subtotal;
            const tax = ownInvoiceTotals.tax;
            const income = revenue - tax;

            if (tab === 'report') {
              return (
                <ReportTab
                  customerName={customer?.name ?? null}
                  currency={customer?.currency ?? 'NGN'}
                  symbol={symbolFor(customer?.currency)}
                  revenue={revenue}
                  tax={tax}
                  income={income}
                  shippingFee={shipmentCost}
                />
              );
            }

            if (tab !== 'overview') return null;

            return (
              <OverviewTab
                bookings={bookings}
                invoices={invoices}
                ownInvoiceTotals={ownInvoiceTotals}
                currency={customer?.currency ?? 'NGN'}
                cargoItemsByBookingId={cargoItemsByBookingId}
                onGoToTab={(t) => setTab(t as Tab)}
              />
            );
          })()}

          {tab === 'inventory' && (
            <InventoryTab
              muted={muted}
              onLowStock={() => setHasLowStockAlert(true)}
              onCreateInvoice={(item) => {
                setPendingInvoiceItem(item);
                setTab('invoices');
              }}
              ownerUserId={effectiveUserId}
            />
          )}

          {tab === 'leads' && <LeadsTab ownerUserId={effectiveUserId} />}

          {tab === 'shipments' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text)]">My shipments</h3>
                <BookShipmentForm onBooked={refetchShipments} />
              </div>

              {shipmentsLoading ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--subtext)]">
                  Loading your shipments...
                </div>
              ) : bookings.length === 0 ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--subtext)]">
                  No shipments yet. Once your first order is booked with our team, it&apos;ll appear here with live status.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-col gap-2 border-b border-[var(--border)] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <ShipmentDetailTrigger booking={b} cargoItems={cargoItemsByBookingId[b.id] ?? []} />
                        <div className="text-sm font-semibold text-[var(--text)]">
                          {b.origin} &rarr; {b.destination}
                        </div>
                        <div className="text-[12px] text-[var(--subtext)]">
                          {b.type} · Pickup {b.pickup_date ?? '—'}
                          {b.declared_value ? ` · \u20a6${b.declared_value.toLocaleString()}` : ''}
                        </div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'track' && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8">
              <h3 className="mb-1 text-base font-bold text-[var(--text)]">Track a shipment</h3>
              <p className="mb-4 text-[13px] text-[var(--subtext)]">Enter a tracking number to see its live status.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                  placeholder="JAAD/3007/2026/00233"
                  className="w-full max-w-[260px] rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                />
                <button
                  onClick={handleTrack}
                  disabled={trackLoading}
                  className="w-fit rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
                >
                  {trackLoading ? 'Tracking...' : 'Track'}
                </button>
              </div>

              {trackSearched && !trackLoading && !trackResult && (
                <p className="mt-4 text-[13px] text-[var(--subtext)]">No shipment found with that tracking number.</p>
              )}

              {trackResult && (
                <div className="mt-5 rounded-md border border-[var(--border)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-[13px] text-[#e5231b]">{trackResult.tracking_no}</span>
                    <StatusBadge status={trackResult.status} />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <dt className="text-[11px] uppercase text-[var(--subtext)]">Route</dt>
                      <dd className="text-[var(--text)]">
                        {trackResult.origin} &rarr; {trackResult.destination}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase text-[var(--subtext)]">Type</dt>
                      <dd className="text-[var(--text)]">{trackResult.type}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase text-[var(--subtext)]">Pickup</dt>
                      <dd className="text-[var(--text)]">{trackResult.pickup_date ?? '—'}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}

          {tab === 'invoices' && (
            <div className="space-y-8">
              <div>
                <h4 className="mb-3 text-sm font-bold text-[var(--text)]">Shipment invoices</h4>
                {invoices.length === 0 ? (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--subtext)]">
                    No invoices yet. They&apos;ll show up here once your first shipment is billed.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
                    {invoices.map((inv) => {
                      const booking = bookings.find((b) => b.id === inv.linked_booking_id);
                      return (
                        <div
                          key={inv.id}
                          className="flex flex-col gap-2 border-b border-[var(--border)] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <InvoiceDetailTrigger
                              invoice={inv}
                              booking={booking ?? null}
                              customerName={customer?.name ?? null}
                            />
                            <div className="text-[12px] text-[var(--subtext)]">
                              {booking ? `${booking.origin} \u2192 ${booking.destination}` : booking?.tracking_no}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-[var(--text)]">
                              {'\u20a6'}{(inv.amount || 0).toLocaleString()}
                            </span>
                            <StatusBadge status={inv.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <MyInvoicesTab
                onChange={refetchFinancials}
                currency={customer?.currency ?? 'NGN'}
                initialItem={pendingInvoiceItem ?? undefined}
                onInitialItemConsumed={() => setPendingInvoiceItem(null)}
                ownerUserId={effectiveUserId}
              />
            </div>
          )}



          {tab === 'profile' && (
            <div className="max-w-[520px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e5231b] text-lg font-bold text-white">
                  {customer?.avatar_url ? (
                    <img src={customer.avatar_url} alt="Profile" className="h-full w-full object-cover" onError={(e) => console.error('[avatar] image failed to load:', customer.avatar_url, e)} />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="text-[13px] font-semibold text-[#e5231b] disabled:opacity-50"
                  >
                    {avatarUploading ? 'Uploading...' : 'Change photo'}
                  </button>
                  {avatarError && <p className="mt-1 text-[11px] text-[var(--error-text)]">{avatarError}</p>}
                </div>
              </div>

              {!staffRole && (
                <div className="mb-5 flex items-center gap-4 border-t border-[var(--border)] pt-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--input-border)] bg-[var(--input-bg)]">
                    {customer?.logo_url ? (
                      <img src={customer.logo_url} alt="Company logo" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-[var(--subtext)]">No logo</span>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase text-[var(--subtext)]">Company logo</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                        className="text-[13px] font-semibold text-[#e5231b] disabled:opacity-50"
                      >
                        {logoUploading ? 'Uploading...' : 'Upload logo'}
                      </button>
                      {customer?.logo_url && (
                        <button
                          onClick={handleRemoveLogo}
                          disabled={logoUploading}
                          className="text-[13px] font-semibold text-[var(--subtext)] disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {logoError && <p className="mt-1 text-[11px] text-[var(--error-text)]">{logoError}</p>}
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </div>
              )}

              {!staffRole && (
                <div className="mb-5">
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">
                    Support phone number
                  </label>
                  <input
                    value={profileSupportPhone}
                    onChange={(e) => setProfileSupportPhone(e.target.value)}
                    placeholder="+234..."
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                  <p className="mt-1 text-[11px] text-[var(--subtext)]">
                    Shown to customers on the Call, SMS and WhatsApp support tabs.
                  </p>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Full name</label>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Email</label>
                  <div className="rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-[var(--subtext)]">
                    {customer?.email ?? '—'}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Phone</label>
                  <input
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Currency</label>
                    <select
                      value={profileCurrency}
                      onChange={(e) => setProfileCurrency(e.target.value)}
                      className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c} ({symbolFor(c)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Timezone</label>
                    <select
                      value={profileTimezone}
                      onChange={(e) => setProfileTimezone(e.target.value)}
                      className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {profileError && (
                  <p className="text-[13px] text-[var(--error-text)]">{profileError}</p>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    className="rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
                  >
                    {profileSaving ? 'Saving...' : 'Save changes'}
                  </button>
                  {profileSavedAt && (
                    <span className="text-[11px] text-[var(--subtext)]">
                      Saved {profileSavedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <button
                  onClick={() => {
                    setShowPasswordModal(true);
                    setPasswordError(null);
                    setPasswordSuccess(false);
                  }}
                  className="text-[13px] font-semibold text-[#e5231b]"
                >
                  Change password
                </button>
              </div>
            </div>
          )}

          {tab === 'notes' && <NotesTab />}

          {tab === 'support' && userId && (
            <SupportTab userId={effectiveUserId ?? userId} customerName={customer?.name ?? null} supportPhone={customer?.support_phone ?? null} muted={muted} />
          )}

          {tab === 'calculator' && <CalculatorTab />}

          {tab === 'utilities' && <UtilitiesTab defaultTaxRate={customer?.tax_rate ?? 7.5} />}

          {tab === 'administrator' && !staffRole && customerId && (
            <AdministratorTab customerId={customerId} />
          )}
        </div>
      </main>

      {/* change password modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[380px] rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text)]">Change password</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-[13px] font-semibold text-[var(--subtext)]"
              >
                Close
              </button>
            </div>

            {passwordSuccess ? (
              <div className="rounded-md border border-[var(--success-border)] bg-[var(--success-bg)] p-3.5 text-[13px] text-[var(--success-text)]">
                Password updated.
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase text-[var(--subtext)]">Confirm password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-sm border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[#e5231b]"
                  />
                </div>

                {passwordError && (
                  <div className="text-[13px] text-[var(--error-text)]">{passwordError}</div>
                )}

                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="w-full rounded-sm bg-[#e5231b] px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {passwordSaving ? 'Saving...' : 'Save password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {userId && <ChatWidget userId={effectiveUserId ?? userId} customerName={customer?.name ?? null} muted={muted} />}
    </div>
  );
}
