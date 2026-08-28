import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const rawResult = searchParams.get('result') || '';

    const whereClause: any = {
      status: 'COMPLETED'
    };

    if (rawResult && rawResult !== 'ALL') {
      const mappedResult = (rawResult === 'INCORRECT' || rawResult === 'WRONG') ? 'WRONG' : (rawResult === 'CORRECT' ? 'CORRECT' : null);
      if (mappedResult) {
        whereClause.result = mappedResult;
      }
    }

    const auctions = await prisma.auction.findMany({
      where: whereClause,
      include: {
        question: true,
        winnerTeam: {
          select: {
            id: true,
            teamName: true,
            registrationNumber: true,
          }
        },
        _count: {
          select: { bids: true }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    const filtered = search
      ? auctions.filter((a: any) =>
          a.question?.text.toLowerCase().includes(search) ||
          a.question?.category?.toLowerCase().includes(search) ||
          a.winnerTeam?.teamName.toLowerCase().includes(search) ||
          a.winnerTeam?.registrationNumber.toLowerCase().includes(search)
        )
      : auctions;

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Failed to fetch auction history:', error);
    return NextResponse.json({ error: 'Failed to fetch auction history' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auctions = await prisma.auction.findMany({
      where: { status: 'COMPLETED' },
      include: { scoreTx: true }
    });

    if (auctions.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    await prisma.$transaction(async (tx) => {
      // Accumulate points changes per team
      const teamPointsDelta: Record<string, number> = {};
      
      for (const auction of auctions) {
        if (auction.scoreTx && auction.scoreTx.length > 0) {
          for (const st of auction.scoreTx) {
             teamPointsDelta[st.teamId] = (teamPointsDelta[st.teamId] || 0) + 
                (st.type === 'AUCTION_WIN' ? -st.amount : (st.type === 'AUCTION_LOSS' ? st.amount : 0));
          }
        }
      }

      // Update all affected teams
      for (const [teamId, delta] of Object.entries(teamPointsDelta)) {
        if (delta !== 0) {
          const team = await tx.team.findUnique({ where: { id: teamId } });
          if (team) {
            await tx.team.update({
              where: { id: teamId },
              data: { points: Math.max(0, team.points + delta) }
            });
          }
        }
      }

      const auctionIds = auctions.map(a => a.id);

      // Delete score transactions and auctions
      await tx.scoreTransaction.deleteMany({
        where: { auctionId: { in: auctionIds } }
      });

      await tx.auction.deleteMany({
        where: { id: { in: auctionIds } }
      });
    });

    return NextResponse.json({ success: true, count: auctions.length });
  } catch (error) {
    console.error('Failed to delete all auction history:', error);
    return NextResponse.json({ error: 'Failed to delete all auctions' }, { status: 500 });
  }
}

