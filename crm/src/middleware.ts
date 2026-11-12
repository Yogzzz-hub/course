import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-academy-secret-key-32-chars-long!!'
);
const FALLBACK_SECRET = new TextEncoder().encode(
  'apex-global-academy-production-jwt-super-secret-key-32b'
);

const PORTAL_ROLES: Record<string, string> = {
  '/admin': 'ADMIN',
  '/manager': 'MANAGER',
  '/trainer': 'TRAINER',
  '/student': 'STUDENT',
  '/financier': 'FINANCIER',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Fast path: Static files, Next internals, public assets, or APIs pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Extract session token (support both academy_session and auth_token cookies)
  const token =
    request.cookies.get('academy_session')?.value ||
    request.cookies.get('auth_token')?.value;

  let sessionPayload: { role?: string; userId?: string; email?: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      sessionPayload = payload as { role?: string; userId?: string; email?: string };
    } catch {
      try {
        const { payload } = await jwtVerify(token, FALLBACK_SECRET);
        sessionPayload = payload as { role?: string; userId?: string; email?: string };
      } catch {
        // Invalid or expired token
      }
    }
  }

  // 3. Authenticated user visiting /crm or /portal -> Fast redirect to assigned portal
  if (sessionPayload?.role && (pathname === '/crm' || pathname === '/portal')) {
    const role = sessionPayload.role.toUpperCase();
    const portalMap: Record<string, string> = {
      ADMIN: '/admin',
      MANAGER: '/manager',
      TRAINER: '/trainer',
      STUDENT: '/student',
      FINANCIER: '/financier',
    };
    const target = portalMap[role] || '/login';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 4. Protected Portals: Check permissions
  const protectedPrefix = Object.keys(PORTAL_ROLES).find((prefix) => pathname.startsWith(prefix));

  if (protectedPrefix) {
    if (!sessionPayload || !sessionPayload.role) {
      // Unauthenticated -> Fast redirect to /login with returnUrl
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const requiredRole = PORTAL_ROLES[protectedPrefix];
    const userRole = sessionPayload.role.toUpperCase();

    // Admin can access everything, others restricted to their assigned portal
    if (userRole !== 'ADMIN' && userRole !== requiredRole) {
      const portalMap: Record<string, string> = {
        ADMIN: '/admin',
        MANAGER: '/manager',
        TRAINER: '/trainer',
        STUDENT: '/student',
        FINANCIER: '/financier',
      };
      const correctPortal = portalMap[userRole] || '/login';
      return NextResponse.redirect(new URL(correctPortal, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/manager/:path*',
    '/trainer/:path*',
    '/student/:path*',
    '/financier/:path*',
    '/crm',
    '/portal',
  ],
};
