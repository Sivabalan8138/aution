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
      ? auctions.filter(a =>
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
