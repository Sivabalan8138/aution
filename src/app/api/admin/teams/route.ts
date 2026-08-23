import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { points: 'desc' },
    });
    return NextResponse.json(teams);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    let ids: string[] | undefined;
    try {
      const body = await request.json();
      ids = body.ids;
    } catch (e) {
      // Body may be empty for DELETE ALL
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Clean up dependent records for specified teams
      await prisma.scoreTransaction.deleteMany({ where: { teamId: { in: ids } } });
      await prisma.bid.deleteMany({ where: { teamId: { in: ids } } });
      await prisma.auction.updateMany({
        where: { winnerTeamId: { in: ids } },
        data: { winnerTeamId: null }
      });

      await prisma.team.deleteMany({
        where: { id: { in: ids } }
      });

      if ((global as any).io) {
        (global as any).io.emit('leaderboard_updated');
      }
      return NextResponse.json({ success: true, message: `${ids.length} team(s) deleted successfully` });
    } else {
      // Clean up dependent records for ALL teams
      await prisma.scoreTransaction.deleteMany({});
      await prisma.bid.deleteMany({});
      await prisma.auction.updateMany({
        data: { winnerTeamId: null }
      });

      const result = await prisma.team.deleteMany({});

      if ((global as any).io) {
        (global as any).io.emit('leaderboard_updated');
      }
      return NextResponse.json({ success: true, count: result.count, message: 'All teams deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting teams:', error);
    return NextResponse.json({ error: 'Failed to delete teams' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const teamName = (data.teamName || '').trim();
    if (!teamName) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Populate common/placeholder details if missing
    const participant1Name = (data.participant1Name || 'Player 1').trim();
    const participant2Name = (data.participant2Name || 'Player 2').trim();
    const collegeName = (data.collegeName || 'Guest College').trim();
    const department = (data.department || 'EEE').trim();
    const phone = (data.phone || '9999999999').trim();
    const email = (data.email || `${teamName.toLowerCase().replace(/[^a-z0-9]/g, '')}@guest.com`).trim();
    
    // Default initial points from settings or body
    const settings = await prisma.eventSettings.findFirst();
    const initialPoints = data.points !== undefined ? Number(data.points) : (settings?.initialPoints || 5000);

    // Generate Registration Number
    const count = await prisma.team.count();
    const regNumber = `REG-${(count + 1).toString().padStart(3, '0')}`;

    const newTeam = await prisma.team.create({
      data: {
        registrationNumber: regNumber,
        teamName,
        participant1Name,
        participant2Name,
        collegeName,
        department,
        phone,
        email,
        points: initialPoints,
        status: 'ACTIVE'
      }
    });

    if ((global as any).io) {
      (global as any).io.emit('leaderboard_updated');
    }

    return NextResponse.json(newTeam);
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
  }
}
