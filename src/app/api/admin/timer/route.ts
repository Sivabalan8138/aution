import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
  try {
    const { timer } = await request.json();
    await pusherServer.trigger('public', 'timer_tick', timer);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to broadcast timer' }, { status: 500 });
  }
}
