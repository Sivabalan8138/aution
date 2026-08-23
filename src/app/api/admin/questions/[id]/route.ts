import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    const updated = await prisma.question.update({
      where: { id },
      data: {
        text: data.text,
        answer: data.answer,
        difficulty: data.difficulty,
        basePoints: Number(data.basePoints),
        timeLimit: Number(data.timeLimit),
        category: data.category
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Find all auctions associated with this question
    const auctions = await prisma.auction.findMany({
      where: { questionId: id },
      select: { id: true }
    });
    const auctionIds = auctions.map(a => a.id);

    if (auctionIds.length > 0) {
      // Set auctionId to null in ScoreTransaction for these auctions
      await prisma.scoreTransaction.updateMany({
        where: { auctionId: { in: auctionIds } },
        data: { auctionId: null }
      });

      // Delete the auctions (related bids are deleted via CASCADE)
      await prisma.auction.deleteMany({
        where: { id: { in: auctionIds } }
      });
    }

    await prisma.question.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}

