import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    const settings = await prisma.eventSettings.findFirst();
    const defaultInitialPoints = settings?.initialPoints || 5000;

    if (action === 'RESET_SCORES') {
      // Fetch all teams to record score transactions
      const teams = await prisma.team.findMany();
      
      for (const team of teams) {
        if (team.points !== defaultInitialPoints) {
          await prisma.scoreTransaction.create({
            data: {
              teamId: team.id,
              amount: defaultInitialPoints - team.points,
              type: 'RESET',
              previousPoints: team.points,
              newPoints: defaultInitialPoints,
              reason: 'Admin system score reset to initial points'
            }
          });

          await prisma.team.update({
            where: { id: team.id },
            data: { points: defaultInitialPoints }
          });
        }
      }

      await pusherServer.trigger('public', 'leaderboard_updated', {});

      return NextResponse.json({ success: true, message: `Reset scores of ${teams.length} team(s) to ${defaultInitialPoints} pts.` });
    }

    if (action === 'CLEAR_AUCTIONS') {
      await prisma.scoreTransaction.deleteMany({});
      await prisma.bid.deleteMany({});
      await prisma.auction.deleteMany({});

      if (settings) {
        await prisma.eventSettings.update({
          where: { id: settings.id },
          data: { currentAuctionId: null }
        });
      }

      await pusherServer.trigger('public', 'auction_cleared', {});
      await pusherServer.trigger('public', 'leaderboard_updated', {});

      return NextResponse.json({ success: true, message: 'All auction logs and bids cleared successfully.' });
    }

    if (action === 'FULL_RESET') {
      // Delete bids, auctions, transactions
      await prisma.scoreTransaction.deleteMany({});
      await prisma.bid.deleteMany({});
      await prisma.auction.deleteMany({});

      // Reset team points to initial points
      await prisma.team.updateMany({
        data: { points: defaultInitialPoints }
      });

      // Update event status to WAITING
      if (settings) {
        await prisma.eventSettings.update({
          where: { id: settings.id },
          data: { 
            eventStatus: 'WAITING',
            currentAuctionId: null 
          }
        });
      }

      await pusherServer.trigger('public', 'event_settings_updated', {});
      await pusherServer.trigger('public', 'leaderboard_updated', {});
      await pusherServer.trigger('public', 'auction_cleared', {});

      return NextResponse.json({ success: true, message: 'Full system reset completed. All scores reset and auctions cleared.' });
    }

    return NextResponse.json({ error: 'Invalid reset action specified' }, { status: 400 });
  } catch (error) {
    console.error('Reset action error:', error);
    return NextResponse.json({ error: 'Failed to execute reset action' }, { status: 500 });
  }
}
