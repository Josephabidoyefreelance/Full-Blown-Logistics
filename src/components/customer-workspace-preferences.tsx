'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type WorkspacePreferences = {
  companyId: string | null;
  currency: string;
  taxRate: number;
  loaded: boolean;
};
const defaultPreferences: WorkspacePreferences = { companyId: null, currency: 'NGN', taxRate: 7.5, loaded: false };
const Context = createContext(defaultPreferences);
export function formatWorkspaceMoney(amount: number | string | null | undefined, currency: string): string {
  if (amount == null || !Number.isFinite(Number(amount))) return '—';
  try { return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount)); }
  catch { return `${currency} ${Number(amount).toLocaleString('en', { maximumFractionDigits: 2 })}`; }
}
export function CustomerWorkspacePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<WorkspacePreferences>(defaultPreferences);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/customer/workspace-settings', {cache: 'no-store', credentials: 'same-origin'});
      if (!response.ok) { setPreferences(defaultPreferences); return; }
      const item = await response.json();
      if (!item || typeof item.company_id !== 'string' || typeof item.currency !== 'string') {
        setPreferences(defaultPreferences); return;
      }
      setPreferences({
        companyId: item.company_id, currency: item.currency.toUpperCase(),
        taxRate: Number(item.tax_rate ?? 7.5), loaded: true,
      });
    } catch { setPreferences(defaultPreferences); }
  }, []);
  useEffect(() => {
    void refresh();
    const onChange = () => { void refresh(); };
    window.addEventListener('jaad:workspace-preferences-updated', onChange);
    window.addEventListener('focus', onChange);
    return () => {
      window.removeEventListener('jaad:workspace-preferences-updated', onChange);
      window.removeEventListener('focus', onChange);
    };
  }, [refresh]);
  return <Context.Provider value={preferences}>{children}</Context.Provider>;
}
/** Never authorizes access; for display only. Writes remain server-validated. */
export function useCustomerWorkspaceMoney() {
  const value = useContext(Context);
  return useMemo(() => ({
    ...value,
    format: (amount: number | string | null | undefined) => formatWorkspaceMoney(amount, value.currency),
  }), [value]);
}
