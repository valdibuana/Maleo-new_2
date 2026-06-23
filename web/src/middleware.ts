import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decodeJwtPayload, isTokenExpired } from '@/lib/auth-utils';
import { ROLES } from '@/lib/roles';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('jwt_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const { pathname } = request.nextUrl;

  // Extract role from JWT token payload (not from cookie)
  const payload = token ? decodeJwtPayload(token) : null;
  const role = payload?.role;

  // If token is expired or invalid, treat as not logged in
  const isValidSession = payload && !isTokenExpired(payload);
  const hasRefreshSession = Boolean(refreshToken);

  const adminPaths = [
    '/dashboard', '/teachers', '/students', '/subjects',
    '/schedules', '/grades', '/attendances', '/announcements',
    '/academic-years', '/guardians', '/scores',
    '/principal', '/principal-dashboard', '/teacher-attendances',
  ];

  const isAdminPath = adminPaths.some(p => pathname.startsWith(p));
  const isHubPath = pathname.startsWith('/hub');
  const isConnectPath = pathname.startsWith('/connect');
  const isSettingsPath = pathname.startsWith('/settings');
  const isForgotPasswordMode = pathname === '/force-change-password' && request.nextUrl.searchParams.get('mode') === 'forgot';
  const isProtected = isAdminPath || isHubPath || isConnectPath || isSettingsPath ||
                      (pathname === '/force-change-password' && !isForgotPasswordMode);

  // Belum login atau session expired → redirect ke /login
  if (((!token || !isValidSession) && !hasRefreshSession) && isProtected) {
    // Clear stale cookies if session is expired
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (token && !isValidSession) {
      response.cookies.delete('jwt_token');
      response.cookies.delete('user_role');
      response.cookies.delete('refresh_token');
    }
    return response;
  }

  if (token && isValidSession && role) {
    // Sudah login → jangan bisa akses /login lagi
    if (pathname === '/login') {
      if (role === ROLES.ADMIN)
        return NextResponse.redirect(new URL('/dashboard', request.url));
      if (role === ROLES.KEPALA_SEKOLAH)
        return NextResponse.redirect(new URL('/principal-dashboard', request.url));
      if (role === ROLES.TEACHER || role === ROLES.STUDENT)
        return NextResponse.redirect(new URL('/hub/dashboard', request.url));
      if (role === ROLES.GUARDIAN)
        return NextResponse.redirect(new URL('/connect/dashboard', request.url));
    }

    // Admin paths → hanya admin & kepala_sekolah
    if (isAdminPath) {
      if (role !== ROLES.ADMIN && role !== ROLES.KEPALA_SEKOLAH) {
        return NextResponse.redirect(new URL('/hub/dashboard', request.url));
      }
    }

    // principal & principal-dashboard → hanya kepala_sekolah & admin
    if (pathname.startsWith('/principal')) {
      if (role !== ROLES.KEPALA_SEKOLAH && role !== ROLES.ADMIN) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    const adminOnlyPaths = [
      '/dashboard',
      '/teachers',
      '/students',
      '/subjects',
      '/schedules',
      '/academic-years',
      '/principal',   // /principal CRUD — bukan /principal-dashboard
      '/scores',
      '/grades',
      '/attendances',
      '/announcements',
      '/guardians',
      '/teacher-attendances',
    ];

    // Redirect kepala_sekolah jika mencoba akses halaman admin-only
    if (role === ROLES.KEPALA_SEKOLAH) {
      const isAdminOnly = adminOnlyPaths.some(
        p => pathname.startsWith(p) && !pathname.startsWith('/principal-dashboard')
      );
      if (isAdminOnly) {
        return NextResponse.redirect(new URL('/principal-dashboard', request.url));
      }
    }

    // Hub → teacher & student saja
    if (isHubPath) {
      if (role === ROLES.ADMIN) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      if (role === ROLES.KEPALA_SEKOLAH) {
        return NextResponse.redirect(new URL('/principal-dashboard', request.url));
      }
      if (role === ROLES.GUARDIAN) {
        return NextResponse.redirect(new URL('/connect/dashboard', request.url));
      }
    }

    // Connect → guardian saja
    if (isConnectPath) {
      if (role === ROLES.ADMIN) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      if (role === ROLES.KEPALA_SEKOLAH) {
        return NextResponse.redirect(new URL('/principal-dashboard', request.url));
      }
      if (role === ROLES.TEACHER || role === ROLES.STUDENT) {
        return NextResponse.redirect(new URL('/hub/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}


export const config = {
  matcher: [
    '/dashboard/:path*',
    '/principal-dashboard/:path*',
    '/principal/:path*',
    '/teachers/:path*',
    '/students/:path*',
    '/subjects/:path*',
    '/schedules/:path*',
    '/grades/:path*',
    '/attendances/:path*',
    '/announcements/:path*',
    '/academic-years/:path*',
    '/guardians/:path*',
    '/scores/:path*',
    '/teacher-attendances/:path*',
    '/hub/:path*',
    '/connect/:path*',
    '/settings/:path*',
    '/force-change-password',
    '/login',
  ],
};
