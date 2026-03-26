export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getLatestLogs } from '@/lib/storage';

export async function GET() {
  const logs = await getLatestLogs(20);
  return NextResponse.json(logs);
}
