import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the auction and its score transactions
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        scoreTx: true
      }
    });

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 });
    }

    // Wrap in a transaction to safely delete and revert points
    await prisma.$transaction(async (tx) => {
      // Revert points for all teams involved in this auction
      if (auction.scoreTx && auction.scoreTx.length > 0) {
        for (const st of auction.scoreTx) {
          const team = await tx.team.findUnique({ where: { id: st.teamId } });
          if (team) {
            let newPoints = team.points;
            if (st.type === 'AUCTION_WIN') {
              newPoints = Math.max(0, team.points - st.amount);
            } else if (st.type === 'AUCTION_LOSS') {
              newPoints = team.points + st.amount;
            }
            
            await tx.team.update({
              where: { id: st.teamId },
              data: { points: newPoints }
            });
          }
        }
      }

      // Delete the score transactions for this auction
      await tx.scoreTransaction.deleteMany({
        where: { auctionId: id }
      });

      // Bids are cascade-deleted due to the schema relation, so we just delete the auction
      await tx.auction.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete auction history:', error);
    return NextResponse.json({ error: 'Failed to delete auction' }, { status: 500 });
  }
}
