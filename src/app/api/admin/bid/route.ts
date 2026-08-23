import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { auctionId, teamId, amount } = await request.json();

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: { orderBy: { amount: 'desc' } },
        question: true
      }
    });

    if (!auction || auction.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Auction is not active' }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Invalid or disabled team' }, { status: 400 });
    }

    if (team.points < amount) {
      return NextResponse.json({ error: 'Team does not have enough points' }, { status: 400 });
    }

    const hasBid = auction.bids.some(b => b.teamId === teamId);
    if (hasBid) {
      return NextResponse.json({ error: 'Team has already placed a bid for this question' }, { status: 400 });
    }

    const currentHighest = auction.bids[0]?.amount || auction.question.basePoints;
    if (amount <= currentHighest) {
      return NextResponse.json({ error: 'Bid must be higher than current bid' }, { status: 400 });
    }

    const newBid = await prisma.bid.create({
      data: {
        auctionId,
        teamId,
        amount
      },
      include: { team: true }
    });

    if ((global as any).io) {
      (global as any).io.emit('bid_placed', newBid);
    }

    return NextResponse.json(newBid);
  } catch (error) {
    console.error('Bid API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
