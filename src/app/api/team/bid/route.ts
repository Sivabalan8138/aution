import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import prisma from '@/lib/db';

// Helper to get team from cookie
async function getTeamFromRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const tokenMatch = cookieHeader.match(/team_token=([^;]+)/);
  if (!tokenMatch) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const { payload } = await jwtVerify(tokenMatch[1], secret);
    if (payload.role !== 'team' || !payload.teamId) return null;
    return payload as { teamId: string; teamName: string; role: string };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const teamPayload = await getTeamFromRequest(request);
    if (!teamPayload) {
      return NextResponse.json({ error: 'Unauthorized. Please log in again.' }, { status: 401 });
    }

    const { auctionId, amount } = await request.json();

    if (!auctionId || !amount || isNaN(Number(amount))) {
      return NextResponse.json({ error: 'Invalid bid data' }, { status: 400 });
    }

    const bidAmount = Number(amount);
    const teamId = teamPayload.teamId as string;

    // Fetch auction with bids
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: { orderBy: { amount: 'desc' } },
        question: true,
      },
    });

    if (!auction || auction.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Bidding is not currently active' }, { status: 400 });
    }

    // Fetch team
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Your team is not active' }, { status: 403 });
    }

    if (team.points < bidAmount) {
      return NextResponse.json({ error: `Insufficient points. You have ${team.points} pts.` }, { status: 400 });
    }

    const hasBid = auction.bids.some((b) => b.teamId === teamId);
    if (hasBid) {
      return NextResponse.json({ error: 'Your team has already placed a bid for this question' }, { status: 400 });
    }

    const currentHighest = auction.bids[0]?.amount || auction.question.basePoints;
    if (bidAmount <= currentHighest) {
      return NextResponse.json({
        error: `Bid must be higher than current highest bid of ${currentHighest}`,
      }, { status: 400 });
    }

    const newBid = await prisma.bid.create({
      data: { auctionId, teamId, amount: bidAmount },
      include: { team: true },
    });

    // Notify all connected clients via socket
    if ((global as any).io) {
      (global as any).io.emit('bid_placed', newBid);
    }

    return NextResponse.json({ success: true, bid: newBid });
  } catch (error) {
    console.error('Team bid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
