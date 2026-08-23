import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect all /admin routes except /admin/login
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
      const { payload } = await jwtVerify(token, secret);
      
      // Only admins can access /admin
      if (payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/host/login', request.url));
      }
      return NextResponse.next();
    } catch (error) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Protect all /host routes except /host/login
  if (path.startsWith('/host') && path !== '/host/login') {
    const token = request.cookies.get('admin_token')?.value; // Shared cookie name

    if (!token) {
      return NextResponse.redirect(new URL('/host/login', request.url));
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
      const { payload } = await jwtVerify(token, secret);
      
      // Both admin and host can access /host routes if needed, but let's restrict to role for clarity
      // Actually, an admin might just use their own dashboard.
      if (payload.role !== 'host' && payload.role !== 'admin') {
        return NextResponse.redirect(new URL('/host/login', request.url));
      }
      return NextResponse.next();
    } catch (error) {
      return NextResponse.redirect(new URL('/host/login', request.url));
    }
  }

  // Protect /team routes except /team/login
  if (path.startsWith('/team') && path !== '/team/login') {
    const token = request.cookies.get('team_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/team/login', request.url));
    }
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== 'team') {
        return NextResponse.redirect(new URL('/team/login', request.url));
      }
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/team/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/host/:path*', '/team/:path*'],
};
