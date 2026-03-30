import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Repricer"'
    }
  });
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/cron')) {
    const auth = request.headers.get('authorization');
    if (auth === `Bearer ${env.cronSecret}`) {
      return NextResponse.next();
    }
    return new NextResponse('Forbidden', { status: 403 });
  }

  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) {
    return unauthorized();
  }

  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [user, pass] = decoded.split(':');

  if (user !== env.adminUser || pass !== env.adminPass) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
