import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * This endpoint must live at:
 * src/app/api/reports/summary/route.ts
 *
 * If this exact route is missing, Next.js may send /api/reports/summary
 * to [category]/route.ts with category="summary", producing
 * "Unknown report category".
 *
 * These table names are based on the report categories previously discussed.
 * Verify customers, drivers and warehouse_inventory against the real Supabase schema.
 */
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
  try {
    const supabase = await createClient();

    const results = await Promise.all(
      Object.entries(SUMMARY_TABLES).map(async ([key, table]) => {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        return {
          key,
          count: error ? null : (count ?? 0),
          error: error ? `${table}: ${error.message}` : null,
        };
      }),
    );

    const counts: Record<string, number> = {};
    const errors: string[] = [];

    for (const result of results) {
      // Keep failed queries distinguishable from real zero-record tables.
      if (result.count !== null) counts[result.key] = result.count;
      if (result.error) errors.push(`${result.key} — ${result.error}`);
    }

    return NextResponse.json(
      { counts, errors },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load report summary.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
