import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import prisma from '@/lib/db';
import { pusherServer } from '@/lib/pusher';

// Helper to get team from cookie
async function getTeamFromRequest(request: Request) {
  let token: string | undefined;

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/team_token=([^;]+)/);
    if (tokenMatch) {
      token = tokenMatch[1];
    }
  }

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const { payload } = await jwtVerify(token, secret);
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
        bids: { orderBy: [{ amount: 'desc' }, { team: { points: 'desc' } }, { createdAt: 'asc' }] },
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

    const hasBid = auction.bids.some(b => b.teamId === teamId);
    if (hasBid) {
      return NextResponse.json({ error: 'Your team has already placed a bid!' }, { status: 400 });
    }

    if (bidAmount < auction.question.basePoints) {
      return NextResponse.json({
        error: `Bid must be at least the base points of ${auction.question.basePoints}`,
      }, { status: 400 });
    }

    const newBid = await prisma.bid.create({
      data: { auctionId, teamId, amount: bidAmount },
      include: { team: true },
    });

    // Notify all connected clients via Pusher
    await pusherServer.trigger('public', 'bid_placed', newBid);

    return NextResponse.json({ success: true, bid: newBid });
  } catch (error) {
    console.error('Team bid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
