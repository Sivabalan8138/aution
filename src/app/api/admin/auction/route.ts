import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { pusherServer } from '@/lib/pusher-server';

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

      await pusherServer.trigger('public', 'auction_started', newAuction);

      return NextResponse.json(newAuction);
    }

    // CLOSE BIDDING
    if (action === 'CLOSE_BIDDING') {
      const { auctionId, winnerTeamId, winningBid } = payload;
      
      const team = await prisma.team.findUnique({ where: { id: winnerTeamId } });
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

      // Identify all active teams that didn't bid
      const auctionWithBids = await prisma.auction.findUnique({
        where: { id: auctionId },
        include: { bids: true }
      });
      const allActiveTeams = await prisma.team.findMany({ where: { status: 'ACTIVE' } });
      const biddingTeamIds = new Set(auctionWithBids?.bids.map((b: any) => b.teamId));
      
      const noBidTeams = allActiveTeams.filter(t => !biddingTeamIds.has(t.id));

      const newPoints = Math.max(0, team.points - winningBid);

      const noBidTeamUpdates = noBidTeams.map(t => 
        prisma.team.update({
          where: { id: t.id },
          data: { points: Math.max(0, t.points - 500) }
        })
      );
      
      const noBidTeamTxs = noBidTeams.map(t => 
        prisma.scoreTransaction.create({
          data: {
            teamId: t.id,
            auctionId,
            amount: 500,
            type: 'AUCTION_LOSS',
            previousPoints: t.points,
            newPoints: Math.max(0, t.points - 500),
            reason: `Penalty for not participating in auction (-500 pts)`
          }
        })
      );

      const [updated, updatedTeam, ...rest] = await prisma.$transaction([
        prisma.auction.update({
          where: { id: auctionId },
          data: {
            status: 'CLOSED',
            winnerTeamId,
            winningBid
          }
        }),
        prisma.team.update({
          where: { id: winnerTeamId },
          data: { points: newPoints }
        }),
        ...noBidTeamUpdates,
        ...noBidTeamTxs
      ]);

      await pusherServer.trigger('public', 'bidding_closed', updated);
      await pusherServer.trigger('public', 'score_updated', {});

      return NextResponse.json(updated);
    }

    // RESOLVE ANSWER
    if (action === 'RESOLVE_ANSWER') {
      const { auctionId, result, teamId, amount } = payload; // result: 'CORRECT' or 'WRONG'
      
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

      if (result === 'CORRECT') {
        // Points were deducted at CLOSE_BIDDING.
        // Refund the wager (amount) AND add the winnings (amount) => net +amount from original.
        const newPoints = team.points + (amount * 2);
        
        // Fetch the auction with its bids to know who participated
        const auctionWithBids = await prisma.auction.findUnique({
          where: { id: auctionId },
          include: { bids: true }
        });
        const biddingTeamIds = Array.from(new Set(auctionWithBids?.bids.map((b: any) => b.teamId) || []));

        // Find all other active teams that DID place a bid to penalize them 100 points
        const otherTeams = await prisma.team.findMany({
          where: { 
            status: 'ACTIVE',
            id: { 
              in: biddingTeamIds.filter(id => id !== teamId)
            } 
          }
        });

        // Prepare bulk operations for other teams
        const otherTeamUpdates = otherTeams.map(t => 
          prisma.team.update({
            where: { id: t.id },
            data: { points: Math.max(0, t.points - 100) }
          })
        );
        const otherTeamTxs = otherTeams.map(t =>
          prisma.scoreTransaction.create({
            data: {
              teamId: t.id,
              auctionId,
              amount: 100,
              type: 'AUCTION_LOSS',
              previousPoints: t.points,
              newPoints: Math.max(0, t.points - 100),
              reason: `Another team answered correctly (100 pts penalty)`
            }
          })
        );
        
        const [updatedAuction, updatedTeam, tx, ...rest] = await prisma.$transaction([
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
              amount: amount,
              type: 'AUCTION_WIN',
              previousPoints: team.points,
              newPoints: newPoints,
              reason: `Auction win (Wager refunded + ${amount} pts won)`
            }
          }),
          ...otherTeamUpdates,
          ...otherTeamTxs
        ]);

        await pusherServer.trigger('public', 'answer_result', {
          result: 'CORRECT',
          team: updatedTeam,
          amount,
          hasNextBidder: false
        });
        await pusherServer.trigger('public', 'score_updated', {});
        await pusherServer.trigger('public', 'leaderboard_updated', {});
        await pusherServer.trigger('public', 'bidding_closed', {});

        return NextResponse.json({ updatedAuction, updatedTeam, hasNextBidder: false });
      }

      // If result === 'WRONG'
      // Points were deducted at CLOSE_BIDDING.
      // Net penalty is the full amount. So we don't refund anything.
      const newPoints = team.points; // It's already been deducted at CLOSE_BIDDING

      const [lossTx] = await prisma.$transaction([
        prisma.scoreTransaction.create({
          data: {
            teamId,
            auctionId,
            amount: amount,
            type: 'AUCTION_LOSS',
            previousPoints: team.points + amount, // It was deducted earlier, so visually show previous as +amount
            newPoints: newPoints,
            reason: `Auction loss (WRONG answer, lost bid amount of ${amount})`
          }
        })
      ]);
      
      // Need to find the team again to get the deductedTeam data for emit
      const finalDeductedTeam = await prisma.team.findUnique({ where: { id: teamId } });

      // Fetch auction with all bids ordered desc by amount and score transactions
      const auctionData = await prisma.auction.findUnique({
        where: { id: auctionId },
        include: {
          bids: {
            orderBy: [{ amount: 'desc' }, { team: { points: 'desc' } }, { createdAt: 'asc' }],
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
        
        const nextTeam = await prisma.team.findUnique({ where: { id: nextBid.teamId } });
        const nextNewPoints = Math.max(0, (nextTeam?.points || 0) - nextBid.amount);

        const [auctionUpdate, teamUpdate] = await prisma.$transaction([
          prisma.auction.update({
            where: { id: auctionId },
            data: {
              winnerTeamId: nextBid.teamId,
              winningBid: nextBid.amount,
              status: 'CLOSED', // remain CLOSED for next team answer
            },
            include: {
              question: true,
            bids: { 
              include: { team: true }, 
              orderBy: [
                { amount: 'desc' },
                { team: { points: 'desc' } },
                { createdAt: 'asc' }
              ] 
            },
              winnerTeam: true,
              scoreTx: true
            }
          }),
          prisma.team.update({
            where: { id: nextBid.teamId },
            data: { points: nextNewPoints }
          })
        ]);
        updatedAuction = auctionUpdate;
      } else {
        updatedAuction = await prisma.auction.update({
          where: { id: auctionId },
          data: {
            status: 'COMPLETED',
            result: 'WRONG'
          },
          include: {
            question: true,
            bids: { include: { team: true }, orderBy: [{ amount: 'desc' }, { team: { points: 'desc' } }, { createdAt: 'asc' }] },
            winnerTeam: true,
            scoreTx: true
          }
        });
      }

      await pusherServer.trigger('public', 'answer_result', {
        result: 'WRONG',
        team: finalDeductedTeam,
        amount: amount,
        hasNextBidder,
        nextWinnerTeam: nextBid ? nextBid.team : null,
        nextWinningBid: nextBid ? nextBid.amount : null
      });
      await pusherServer.trigger('public', 'score_updated', {});
      await pusherServer.trigger('public', 'leaderboard_updated', {});
      await pusherServer.trigger('public', 'bidding_closed', {});

      return NextResponse.json({
        updatedAuction,
        updatedTeam: finalDeductedTeam,
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

      await pusherServer.trigger('public', 'auction_cancelled', {});

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
          orderBy: [
            { amount: 'desc' },
            { team: { points: 'desc' } },
            { createdAt: 'asc' }
          ]
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
export const dynamic = 'force-dynamic';
