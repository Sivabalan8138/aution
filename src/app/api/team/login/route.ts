import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { registrationNumber, teamId, teamName } = await request.json();

    if (!registrationNumber && !teamId && !teamName) {
      return NextResponse.json({ error: 'Team selection or identification is required' }, { status: 400 });
    }

    let team = null;
    if (teamId) {
      team = await prisma.team.findUnique({ where: { id: teamId } });
    } else if (teamName) {
      team = await prisma.team.findFirst({
        where: { teamName: { equals: teamName.trim() } },
      });
    } else if (registrationNumber) {
      team = await prisma.team.findUnique({
        where: { registrationNumber: registrationNumber.trim().toUpperCase() },
      });
    }

    if (!team) {
      return NextResponse.json({ error: 'Team not found. Please select a valid team.' }, { status: 404 });
    }

    if (team.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Your team has been disabled. Contact the admin.' }, { status: 403 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const token = await new SignJWT({ role: 'team', teamId: team.id, teamName: team.teamName })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(secret);

    const response = NextResponse.json({ success: true, teamName: team.teamName });
    response.cookies.set({
      name: 'team_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return response;
  } catch (error) {
    console.error('Team login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
