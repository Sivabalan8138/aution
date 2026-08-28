import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import prisma from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    let token: string | undefined;

    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      token = request.cookies.get('team_token')?.value;
    }

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== 'team' || !payload.teamId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const team = await prisma.team.findUnique({
      where: { id: payload.teamId as string },
      select: {
        id: true,
        teamName: true,
        registrationNumber: true,
        points: true,
        status: true,
      },
    });

    if (!team || team.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Team not found or disabled' }, { status: 403 });
    }

    return NextResponse.json(team);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
export const dynamic = 'force-dynamic';
