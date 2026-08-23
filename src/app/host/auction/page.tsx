import AdminAuctionPage from '@/app/admin/auction/page';

export default function HostAuctionPage() {
  // We reuse the exact same component as the Admin Auction page 
  // since the Host needs the exact same controls to manage the auction.
  return <AdminAuctionPage />;
}
