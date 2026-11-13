// Legacy URL: delegate to the canonical customer registration implementation.
// Do not independently provision a company or insert a second acquisition lead.
import type { NextRequest } from 'next/server';
import { POST as canonicalRegister } from '../../../register/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return canonicalRegister(request);
}
