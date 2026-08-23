import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const validAdminUsername = process.env.ADMIN_USERNAME || 'admin';
    const validAdminPassword = process.env.ADMIN_PASSWORD || 'adminpassword';
    
    const validHostUsername = process.env.HOST_USERNAME || 'host';
    const validHostPassword = process.env.HOST_PASSWORD || 'hostpassword';

    let role = '';

    if (username === validAdminUsername && password === validAdminPassword) {
      role = 'admin';
    } else if (username === validHostUsername && password === validHostPassword) {
      role = 'host';
    }

    if (role) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
      
      const token = await new SignJWT({ role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(secret);

      const response = NextResponse.json({ success: true, role });
      
      response.cookies.set({
        name: 'admin_token', // We keep the same cookie name for simplicity, though it acts as an auth_token
        value: token,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
