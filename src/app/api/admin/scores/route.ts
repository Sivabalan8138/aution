import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const type = searchParams.get('type') || '';
    const teamId = searchParams.get('teamId') || '';

    const whereClause: any = {};

    if (type && type !== 'ALL') {
      whereClause.type = type;
    }

    if (teamId && teamId !== 'ALL') {
      whereClause.teamId = teamId;
    }

    const transactions = await prisma.scoreTransaction.findMany({
      where: whereClause,
      include: {
        team: {
          select: {
            id: true,
            teamName: true,
            registrationNumber: true,
            points: true,
          }
        },
        auction: {
          include: {
            question: {
              select: {
                id: true,
                text: true,
                difficulty: true,
                basePoints: true,
                category: true,
              }
            }
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // Client-side text filter if search parameter provided
    const filtered = search
      ? transactions.filter(t => 
          t.team?.teamName.toLowerCase().includes(search) ||
          t.team?.registrationNumber.toLowerCase().includes(search) ||
          t.reason?.toLowerCase().includes(search) ||
          t.auction?.question?.text.toLowerCase().includes(search) ||
          t.type.toLowerCase().includes(search)
        )
      : transactions;

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Failed to fetch score transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch score history' }, { status: 500 });
  }
}
