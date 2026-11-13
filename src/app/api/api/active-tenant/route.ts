import { NextResponse } from 'next/server';
import { getCustomerWorkspaceSelection } from '@/lib/customer-active-tenant';

export const dynamic = 'force-dynamic';

export async function GET() {
  const selection = await getCustomerWorkspaceSelection();
  if (!selection) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(
    { customerId: selection.customerId, count: selection.tenantIds.length },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
