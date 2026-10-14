import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Keep this list aligned with the real schema. The first five mappings are confirmed
// by the uploaded report route; the remaining mappings must be verified in Supabase.
const SUMMARY_TABLES: Record<string, string> = {
  operational: 'bookings',
  financial: 'invoices',
  hr: 'employees',
  fleet: 'fleet_vehicles',
  sales: 'leads',
  crm: 'leads',
  customers: 'customers',
  drivers: 'drivers',
  warehouse: 'warehouse_inventory',
};

export async function GET() {
  const supabase = await createClient();
  const counts: Record<string, number> = {};
  const errors: string[] = [];

  await Promise.all(Object.entries(SUMMARY_TABLES).map(async ([key, table]) => {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      counts[key] = 0;
      errors.push(`${key} (${table}): ${error.message}`);
    } else {
      counts[key] = count ?? 0;
    }
  }));

  // Return counts and any missing-table/permission errors explicitly so zero is not
  // mistaken for a confirmed empty table in the UI.
  return NextResponse.json({ counts, errors }, { headers: { 'Cache-Control': 'no-store' } });
}
