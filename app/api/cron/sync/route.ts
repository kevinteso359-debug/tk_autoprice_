export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { runRepricer } from '@/lib/repricer';

export async function GET() {
  const now = new Date();

  console.log('==============================');
  console.log('CRON TRIGGERED');
  console.log('UTC:', now.toISOString());
  console.log(
    'ITALIA:',
    now.toLocaleString('it-IT', {
      timeZone: 'Europe/Rome'
    })
  );
  console.log('==============================');

  try {
    const log = await runRepricer('cron');

    console.log('CRON RESULT:', JSON.stringify(log, null, 2));

    return NextResponse.json(log);
  } catch (error: any) {
    console.error('CRON ERROR:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
