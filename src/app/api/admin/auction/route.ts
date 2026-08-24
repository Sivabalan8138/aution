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

      if (result === 'CORRECT') {
        const newPoints = team.points + amount;
        
        const [updatedAuction, updatedTeam, tx] = await prisma.$transaction([
          prisma.auction.update({
            where: { id: auctionId },
            data: { status: 'COMPLETED', result: 'CORRECT' }
          }),
          prisma.team.update({
            where: { id: teamId },
            data: { points: newPoints }
          }),
          prisma.scoreTransaction.create({
            data: {
              teamId,
              auctionId,
              amount,
              type: 'AUCTION_WIN',
              previousPoints: team.points,
              newPoints: newPoints,
              reason: `Auction win for ${amount} points (CORRECT)`
            }
          })
        ]);

        if ((global as any).io) {
          (global as any).io.emit('answer_result', {
            result: 'CORRECT',
            team: updatedTeam,
            amount,
            hasNextBidder: false
          });
          (global as any).io.emit('score_updated');
          (global as any).io.emit('leaderboard_updated');
          (global as any).io.emit('bidding_closed');
        }

        return NextResponse.json({ updatedAuction, updatedTeam, hasNextBidder: false });
      }

      // If result === 'WRONG'
      const newPoints = Math.max(0, team.points - amount);

      const [deductedTeam, lossTx] = await prisma.$transaction([
        prisma.team.update({
          where: { id: teamId },
          data: { points: newPoints }
        }),
        prisma.scoreTransaction.create({
          data: {
            teamId,
            auctionId,
            amount,
            type: 'AUCTION_LOSS',
            previousPoints: team.points,
            newPoints: newPoints,
            reason: `Auction loss for ${amount} points (WRONG answer)`
          }
        })
      ]);

      // Fetch auction with all bids ordered desc by amount and score transactions
      const auctionData = await prisma.auction.findUnique({
        where: { id: auctionId },
        include: {
          bids: {
            orderBy: { amount: 'desc' },
            include: { team: true }
          },
          scoreTx: true
        }
      });

      // Find all team IDs that have already lost/attempted in this auction
      const failedTeamIds = new Set(
        auctionData?.scoreTx
          ?.filter((st: any) => st.type === 'AUCTION_LOSS')
          .map((st: any) => st.teamId) || []
      );

      // Find next highest bid from a team that hasn't attempted yet
      const nextBid = auctionData?.bids.find((b: any) => !failedTeamIds.has(b.teamId));

      let updatedAuction;
      let hasNextBidder = false;

      if (nextBid) {
        hasNextBidder = true;
        updatedAuction = await prisma.auction.update({
          where: { id: auctionId },
          data: {
            winnerTeamId: nextBid.teamId,
            winningBid: nextBid.amount,
            status: 'CLOSED', // remain CLOSED for next team answer
          },
          include: {
            question: true,
            bids: { include: { team: true }, orderBy: { amount: 'desc' } },
            winnerTeam: true,
            scoreTx: true
          }
        });
      } else {
        updatedAuction = await prisma.auction.update({
          where: { id: auctionId },
          data: {
            status: 'COMPLETED',
            result: 'WRONG'
          },
          include: {
            question: true,
            bids: { include: { team: true }, orderBy: { amount: 'desc' } },
            winnerTeam: true,
            scoreTx: true
          }
        });
      }

      if ((global as any).io) {
        (global as any).io.emit('answer_result', {
          result: 'WRONG',
          team: deductedTeam,
          amount,
          hasNextBidder,
          nextWinnerTeam: nextBid ? nextBid.team : null,
          nextWinningBid: nextBid ? nextBid.amount : null
        });
        (global as any).io.emit('score_updated');
        (global as any).io.emit('leaderboard_updated');
        (global as any).io.emit('bidding_closed');
      }

      return NextResponse.json({
        updatedAuction,
        updatedTeam: deductedTeam,
        hasNextBidder,
        nextBid
      });
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
        winnerTeam: true,
        scoreTx: true
      }
    });
    
    return NextResponse.json(currentAuction);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch current auction' }, { status: 500 });
  }
}
