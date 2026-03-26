export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { runRepricer } from '@/lib/repricer';

export async function POST() {
  const log = await runRepricer('manual');
  return NextResponse.json(log);
}
