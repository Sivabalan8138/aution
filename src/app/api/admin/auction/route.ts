import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { action, payload } = await request.json();
    
    // START AUCTION
    if (action === 'START_AUCTION') {
      const { questionId } = payload;
      
      const newAuction = await prisma.auction.create({
        data: {
          questionId,
          status: 'ACTIVE',
        },
        include: { question: true }
      });

      await prisma.eventSettings.updateMany({
        data: {
          currentAuctionId: newAuction.id,
          eventStatus: 'ACTIVE',
        }
      });

      if ((global as any).io) {
        (global as any).io.emit('auction_started', newAuction);
      }

      return NextResponse.json(newAuction);
    }

    // CLOSE BIDDING
    if (action === 'CLOSE_BIDDING') {
      const { auctionId, winnerTeamId, winningBid } = payload;
      
      const updated = await prisma.auction.update({
        where: { id: auctionId },
        data: {
          status: 'CLOSED',
          winnerTeamId,
          winningBid
        }
      });

      if ((global as any).io) {
        (global as any).io.emit('bidding_closed', updated);
      }

      return NextResponse.json(updated);
    }

    // RESOLVE ANSWER
    if (action === 'RESOLVE_ANSWER') {
      const { auctionId, result, teamId, amount } = payload; // result: 'CORRECT' or 'WRONG'
      
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

      const newPoints = result === 'CORRECT' ? team.points + amount : team.points - amount;
      
      // We must run this in a transaction to ensure no double scoring
      const [updatedAuction, updatedTeam, tx] = await prisma.$transaction([
        prisma.auction.update({
          where: { id: auctionId },
          data: { status: 'COMPLETED', result }
        }),
        prisma.team.update({
          where: { id: teamId },
          data: { points: Math.max(0, newPoints) }
        }),
        prisma.scoreTransaction.create({
          data: {
            teamId,
            auctionId,
            amount,
            type: result === 'CORRECT' ? 'AUCTION_WIN' : 'AUCTION_LOSS',
            previousPoints: team.points,
            newPoints: Math.max(0, newPoints),
            reason: `Auction for ${amount} points (${result})`
          }
        })
      ]);

      if ((global as any).io) {
        (global as any).io.emit('answer_result', { result, team: updatedTeam, amount });
        (global as any).io.emit('score_updated');
        (global as any).io.emit('leaderboard_updated');
      }


      return NextResponse.json({ updatedAuction, updatedTeam });
    }
    
    // CANCEL AUCTION
    if (action === 'CANCEL_AUCTION') {
      const { auctionId } = payload;
      
      const updated = await prisma.auction.update({
        where: { id: auctionId },
        data: { status: 'CANCELLED' }
      });
      
      await prisma.eventSettings.updateMany({
        data: {
          currentAuctionId: null,
          eventStatus: 'WAITING',
        }
      });

      if ((global as any).io) {
        (global as any).io.emit('auction_cancelled');
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auction API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const settings = await prisma.eventSettings.findFirst();
    if (!settings?.currentAuctionId) return NextResponse.json(null);
    
    const currentAuction = await prisma.auction.findUnique({
      where: { id: settings.currentAuctionId },
      include: {
        question: true,
        bids: {
          include: { team: true },
          orderBy: { amount: 'desc' }
        },
        winnerTeam: true
      }
    });
    
    return NextResponse.json(currentAuction);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch current auction' }, { status: 500 });
  }
}
