import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

function unauthorized() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Repricer"',
    },
  });
}

function decodeBasicAuth(authHeader: string) {
  try {
    const base64 = authHeader.replace('Basic ', '');
    const decoded = atob(base64);
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex === -1) {
      return null;
    }

    const user = decoded.slice(0, separatorIndex);
    const pass = decoded.slice(separatorIndex + 1);

    return { user, pass };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protezione cron con Bearer token
  if (pathname.startsWith('/api/cron')) {
    const auth = request.headers.get('authorization');

    if (auth === `Bearer ${env.cronSecret}`) {
      return NextResponse.next();
    }

    return new NextResponse('Forbidden', { status: 403 });
  }

  // Basic Auth per tutto il resto
  const auth = request.headers.get('authorization');

  if (!auth || !auth.startsWith('Basic ')) {
    return unauthorized();
  }

  const credentials = decodeBasicAuth(auth);

  if (!credentials) {
    return unauthorized();
  }

  if (
    credentials.user !== env.adminUser ||
    credentials.pass !== env.adminPass
  ) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
      Protegge tutto tranne:
      - /api/cron
      - asset Next
      - favicon
      - eventuali file statici comuni
    */
    '/((?!api/cron|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
