import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Only allow specific updates
    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.points !== undefined) updateData.points = Number(body.points);
    if (body.teamName !== undefined) updateData.teamName = body.teamName;

    // Record score history if points are manually changed
    if (body.points !== undefined && body.reason) {
      const team = await prisma.team.findUnique({ where: { id } });
      if (team) {
        const diff = Number(body.points) - team.points;
        if (diff !== 0) {
          await prisma.scoreTransaction.create({
            data: {
              teamId: id,
              amount: diff,
              type: diff > 0 ? 'ADMIN_ADD' : 'ADMIN_SUBTRACT',
              previousPoints: team.points,
              newPoints: Number(body.points),
              reason: body.reason,
            }
          });
        }
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id },
      data: updateData,
    });

    if (body.points !== undefined || body.status !== undefined) {
      if ((global as any).io) {
        (global as any).io.emit('score_updated');
        (global as any).io.emit('leaderboard_updated');
      }
    }

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Clean up dependent records first to avoid foreign key failure
    await prisma.scoreTransaction.deleteMany({ where: { teamId: id } });
    await prisma.bid.deleteMany({ where: { teamId: id } });
    await prisma.auction.updateMany({
      where: { winnerTeamId: id },
      data: { winnerTeamId: null }
    });

    await prisma.team.delete({
      where: { id },
    });

    if ((global as any).io) {
      (global as any).io.emit('leaderboard_updated');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
