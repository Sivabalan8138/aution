import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [
        { points: 'desc' },
        { updatedAt: 'asc' }, // In case of tie, earlier achievement wins
      ],
      select: {
        id: true,
        teamName: true,
        points: true,
      },
    });

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
