import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: {
          select: { bids: true }
        },
        scoreTransactions: {
          where: { type: 'AUCTION_WIN' }
        }
      }
    });

    const enrichedTeams = teams.map(team => {
      return {
        id: team.id,
        teamName: team.teamName,
        registrationNumber: team.registrationNumber,
        participant1Name: team.participant1Name,
        participant2Name: team.participant2Name,
        collegeName: team.collegeName,
        department: team.department,
        points: team.points,
        bidsCount: team._count.bids,
        solvedCount: team.scoreTransactions.length,
        updatedAt: team.updatedAt
      };
    });

    // Sort according to criteria:
    // 1st: solvedCount DESC
    // 2nd: points DESC
    // 3rd: bidsCount DESC 
    // 4th: updatedAt ASC
    enrichedTeams.sort((a, b) => {
      if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
      if (b.points !== a.points) return b.points - a.points;
      if (b.bidsCount !== a.bidsCount) return b.bidsCount - a.bidsCount;
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    });

    const totalTeams = enrichedTeams.length;
    const totalSolved = enrichedTeams.reduce((sum, team) => sum + team.solvedCount, 0);
    const totalPoints = enrichedTeams.reduce((sum, team) => sum + team.points, 0);

    return NextResponse.json({
      teams: enrichedTeams,
      stats: {
        totalTeams,
        totalSolved,
        totalPoints
      }
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
