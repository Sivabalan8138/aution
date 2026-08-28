import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher-server';
import prisma from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { timer, action, auctionId } = await request.json();
    
    if (action === 'START' && auctionId) {
      // Calculate the end time and store it securely
      const timerEndsAt = new Date(Date.now() + (timer * 1000));
      await prisma.auction.update({
        where: { id: auctionId },
        data: { timerEndsAt }
      });
      await pusherServer.trigger('public', 'timer_started', { timerEndsAt });
    } else if (action === 'STOP' && auctionId) {
      // Clear the end time if the timer is manually stopped/reset
      await prisma.auction.update({
        where: { id: auctionId },
        data: { timerEndsAt: null }
      });
    }

    // Always broadcast the tick for the UI
    if (timer !== undefined) {
      await pusherServer.trigger('public', 'timer_tick', timer);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Timer API Error:', error);
    return NextResponse.json({ error: 'Failed to broadcast timer' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
