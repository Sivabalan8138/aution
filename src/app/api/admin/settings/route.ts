import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    let settings = await prisma.eventSettings.findFirst();

    if (!settings) {
      settings = await prisma.eventSettings.create({
        data: {
          eventName: 'ELECTROBIT | THE EEE AUCTION CHALLENGE',
          eventStatus: 'WAITING',
          initialPoints: 5000,
          minBidIncrement: 100,
          defaultTimer: 30
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch event settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    let settings = await prisma.eventSettings.findFirst();

    const updatePayload = {
      eventName: data.eventName || 'ELECTROBIT | THE EEE AUCTION CHALLENGE',
      eventStatus: data.eventStatus || 'WAITING',
      initialPoints: Number(data.initialPoints) || 5000,
      minBidIncrement: Number(data.minBidIncrement) || 100,
      defaultTimer: Number(data.defaultTimer) || 30,
    };

    if (settings) {
      settings = await prisma.eventSettings.update({
        where: { id: settings.id },
        data: updatePayload
      });
    } else {
      settings = await prisma.eventSettings.create({
        data: updatePayload
      });
    }

    // Broadcast update via socket if available
    const io = (global as any).io;
    if (io) {
      io.emit('event_settings_updated', settings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to update event settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
