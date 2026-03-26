export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { runRepricer } from '@/lib/repricer';

export async function GET() {
  const log = await runRepricer('cron');
  return NextResponse.json(log);
}
