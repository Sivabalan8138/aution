import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { pusherServer } from '@/lib/pusher-server';

export async function POST(request: Request) {
  try {
    const { auctionId, teamId, amount } = await request.json();

    const [auction, team] = await Promise.all([
      prisma.auction.findUnique({
        where: { id: auctionId },
        include: {
          bids: { orderBy: [{ amount: 'desc' }, { team: { points: 'desc' } }, { createdAt: 'asc' }] },
          question: true
        }
      }),
      prisma.team.findUnique({ where: { id: teamId } })
    ]);

    if (!auction || auction.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Auction is not active' }, { status: 400 });
    }

    if (!auction.timerEndsAt) {
      return NextResponse.json({ error: 'Bidding has not started yet. Please start the timer first.' }, { status: 400 });
    }


    if (!team || team.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Invalid or disabled team' }, { status: 400 });
    }

    if (team.points < amount) {
      return NextResponse.json({ error: 'Team does not have enough points' }, { status: 400 });
    }

    const hasBid = auction.bids.some((b: any) => b.teamId === teamId);
    if (hasBid) {
      return NextResponse.json({ error: 'Team has already placed a bid for this question' }, { status: 400 });
    }

    if (amount < auction.question.basePoints) {
      return NextResponse.json({ error: `Bid must be at least the base points of ${auction.question.basePoints}` }, { status: 400 });
    }

    const newBid = await prisma.bid.create({
      data: {
        auctionId,
        teamId,
        amount
      },
      include: { team: true }
    });

    await pusherServer.trigger('public', 'bid_placed', newBid);

    return NextResponse.json(newBid);
  } catch (error) {
    console.error('Bid API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
