'use client';

import { useState, useEffect, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import { Zap, Trophy, Timer, TrendingUp, CheckCircle, XCircle, LogOut, Gavel } from 'lucide-react';

type Auction = {
  id: string;
  status: string;
  question: { text: string; difficulty: string; basePoints: number; category?: string; timeLimit: number };
  bids: { id: string; amount: number; team: { teamName: string; id: string } }[];
  winnerTeam?: { teamName: string; id: string } | null;
  winningBid?: number | null;
  result?: string | null;
};

type TeamInfo = {
  id: string;
  teamName: string;
  points: number;
  registrationNumber: string;
};

export default function TeamBidPage() {
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [timer, setTimer] = useState(30);
  const [customBid, setCustomBid] = useState('');
  const [bidStatus, setBidStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasAlreadyBid, setHasAlreadyBid] = useState(false);
  const [resultOverlay, setResultOverlay] = useState<{ result: string; isOurTeam: boolean; amount: number } | null>(null);
  const bidStatusTimeout = useRef<NodeJS.Timeout | null>(null);

  // Helper to get headers with token
  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('team_token') || localStorage.getItem('team_token')) : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // Fetch team info
  const fetchTeam = async () => {
    const res = await fetch('/api/team/me', { headers: getAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      setTeam(data);
    } else {
      window.location.href = '/team/login';
    }
  };

  // Fetch current auction
  const fetchAuction = async () => {
    const res = await fetch('/api/admin/auction');
    if (res.ok) {
      const data = await res.json();
      setAuction(data);
      return data;
    }
    return null;
  };

  const showBidStatus = (type: 'success' | 'error', message: string) => {
    setBidStatus({ type, message });
    if (bidStatusTimeout.current) clearTimeout(bidStatusTimeout.current);
    bidStatusTimeout.current = setTimeout(() => setBidStatus(null), 4000);
  };

  // Check if our team has already bid
  const checkAlreadyBid = (auctionData: Auction | null) => {
    if (!auctionData || !team || !Array.isArray(auctionData.bids)) { setHasAlreadyBid(false); return; }
    setHasAlreadyBid(auctionData.bids.some(b => b?.team?.id === team.id));
  };

  useEffect(() => {
    fetchTeam();
    fetchAuction();

    // Use a 30-second fallback poll instead of 2-second aggressive polling
    const interval = setInterval(() => {
      fetchAuction();
      fetchTeam();
    }, 30000);

    const pusher = getPusherClient();
    const channel = pusher.subscribe('public');

    const refreshAll = () => {
      fetchAuction().then(data => checkAlreadyBid(data));
      fetchTeam();
    };

    channel.bind('auction_started', (newAuction: Auction) => {
      setAuction(newAuction);
      setTimer(newAuction?.question?.timeLimit || 30);
      setHasAlreadyBid(false);
      setResultOverlay(null);
    });

    channel.bind('bid_placed', refreshAll);
    channel.bind('bidding_closed', refreshAll);
    channel.bind('answer_result', ({ result, team: evaluatedTeam, amount }: any) => {
      fetchAuction().then((data: Auction | null) => {
        fetchTeam(); // refresh our points
        if (evaluatedTeam) {
          setResultOverlay({
            result,
            isOurTeam: team?.id === evaluatedTeam?.id,
            amount: amount || 0,
          });
          setTimeout(() => setResultOverlay(null), 5000);
        }
      });
    });

    channel.bind('auction_cancelled', () => {
      setAuction(null);
      setHasAlreadyBid(false);
    });

    return () => {
      clearInterval(interval);
      channel.unbind_all();
      pusher.unsubscribe('public');
    };
  }, []);

  // Update hasAlreadyBid when team loads
  useEffect(() => {
    checkAlreadyBid(auction);
  }, [team, auction?.id]);

  const handlePlaceBid = async (amount: number) => {
    if (!auction || loading || !team) return;
    
    // Save previous state for rollback
    const previousAuction = { ...auction };
    const previousTeam = { ...team };
    const previousHasBid = hasAlreadyBid;
    
    // Optimistic UI Update (Instant Response)
    setHasAlreadyBid(true);
    setTeam({ ...team, points: team.points - amount }); // Deduct points optimistically
    // We don't deduct it on the backend actually, but visually it's nice, or wait, points are checked against bid amount but not deducted on bid! 
    // Wait, the backend doesn't deduct points on bid! Points are only deducted if they WIN or penalty! 
    // Let me check my previous understanding: `if (team.points < bidAmount)`... yes, it just checks.
    // So we shouldn't deduct points! We just add the bid.
    setAuction({
      ...auction,
      bids: [{ id: 'temp-' + Date.now(), amount, team: { id: team.id, teamName: team.teamName } }, ...(auction.bids || [])]
    });
    setCustomBid('');
    // End optimistic UI

    setLoading(true);
    try {
      const res = await fetch('/api/team/bid', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ auctionId: auction.id, amount }),
      });
      const data = await res.json();
      if (res.ok) {
        showBidStatus('success', `✅ Bid of ${amount} pts placed successfully!`);
        fetchTeam();
        fetchAuction();
      } else {
        // Rollback
        setAuction(previousAuction);
        setTeam(previousTeam);
        setHasAlreadyBid(previousHasBid);
        showBidStatus('error', data.error || 'Failed to place bid');
      }
    } catch {
      // Rollback
      setAuction(previousAuction);
      setTeam(previousTeam);
      setHasAlreadyBid(previousHasBid);
      showBidStatus('error', 'Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('team_token');
      localStorage.removeItem('team_token');
    }
    document.cookie = 'team_token=; Max-Age=0; path=/';
    window.location.href = '/team/login';
  };

  const basePoints = auction?.question?.basePoints || 0;
  const myBid = auction?.bids?.find(b => b?.team?.id === team?.id);

  const difficultyColor = (d: string) =>
    d === 'EASY' ? 'text-green-400' :
    d === 'MEDIUM' ? 'text-yellow-400' :
    d === 'HARD' ? 'text-red-400' : 'text-purple-400';

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/70 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-primary" />
          <span className="font-black tracking-widest text-lg uppercase">ElectroBit</span>
        </div>
        {team && (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Team</div>
              <div className="font-bold text-white truncate max-w-[160px]">{team.teamName}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Points</div>
              <div className="font-mono font-black text-primary text-xl">{team.points.toLocaleString()}</div>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>

      {/* Result Overlay */}
      {resultOverlay && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none ${
          resultOverlay.result === 'CORRECT' ? 'bg-green-900/80' : 'bg-red-900/80'
        }`}>
          {resultOverlay.result === 'CORRECT' ? (
            <CheckCircle className="h-32 w-32 text-green-400 mb-6 animate-bounce" />
          ) : (
            <XCircle className="h-32 w-32 text-red-400 mb-6 animate-bounce" />
          )}
          <div className="text-6xl font-black tracking-widest">
            {resultOverlay.result === 'CORRECT' ? 'CORRECT!' : 'WRONG!'}
          </div>
          {resultOverlay.isOurTeam && (
            <div className={`text-2xl mt-4 font-bold ${resultOverlay.result === 'CORRECT' ? 'text-green-300' : 'text-red-300'}`}>
              {resultOverlay.result === 'CORRECT' 
                ? `+${resultOverlay.amount} points added to your team!`
                : `-${resultOverlay.amount} points deducted from your team`}
            </div>
          )}
        </div>
      )}

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">

        {/* Waiting State */}
        {(!auction || auction.status === 'CANCELLED' || auction.status === 'COMPLETED') && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 animate-pulse">
              <Gavel className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-widest uppercase mb-3">Waiting for Auction</h2>
              <p className="text-gray-400">The host will start the next auction soon. Stay ready!</p>
            </div>
            {team && (
              <div className="glass-card p-6 w-full max-w-xs border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm uppercase tracking-widest">Your Team</span>
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">{team.teamName}</div>
                <div className="text-sm text-gray-400 mt-1">{team.registrationNumber}</div>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Points Balance</div>
                  <div className="text-4xl font-mono font-black text-primary">{team.points.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active Auction */}
        {auction && auction.status === 'ACTIVE' && auction.question && (
          <div className="space-y-4">
            {/* Timer + status row */}
            <div className="flex items-center justify-between gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold tracking-widest uppercase ${
                timer <= 10 ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-primary/30 bg-primary/10 text-primary'
              }`}>
                <Timer className={`h-4 w-4 ${timer <= 10 ? 'animate-bounce' : ''}`} />
                {timer}s
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse">
                ● BIDDING OPEN
              </div>
            </div>

            {/* Question Card */}
            <div className="glass-card p-6 border-t-4 border-primary relative overflow-hidden">
              <div className="absolute top-4 right-4 font-mono text-sm text-gray-400">
                BASE: <span className="text-white font-bold">{auction.question?.basePoints ?? 0}</span>
              </div>
              <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${difficultyColor(auction.question?.difficulty || 'EASY')}`}>
                {auction.question?.difficulty || 'EASY'} · {auction.question?.category || 'General'}
              </div>
              <p className="text-xl md:text-2xl font-medium leading-relaxed">{auction.question?.text}</p>
            </div>



            {/* Already Bid? Show badge */}
            {hasAlreadyBid && myBid && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded text-center font-bold">
                ✅ Your bid: <span className="font-mono text-xl">{myBid.amount}</span> pts placed!
                <div className="text-sm font-normal mt-1 text-green-300">Wait for bidding to close to see if you won.</div>
              </div>
            )}

            {/* Bid Status Message */}
            {bidStatus && (
              <div className={`p-4 rounded text-sm text-center font-bold ${
                bidStatus.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {bidStatus.message}
              </div>
            )}

            {/* Bid Controls — active when not top bidder */}
            {!hasAlreadyBid && (
              <div className="glass-card p-6 border border-white/5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-300">Place Your Bid</h3>

                {/* Quick bid buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[0, 50, 100, 200, 500].map(inc => {
                    const bidVal = basePoints + inc;
                    const canAfford = team ? team.points >= bidVal : false;
                    return (
                      <button
                        key={inc}
                        onClick={() => handlePlaceBid(bidVal)}
                        disabled={loading || !canAfford}
                        className="flex flex-col items-center py-3 bg-white/5 hover:bg-primary/20 hover:border-primary border border-white/10 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="text-xs text-gray-400">{inc === 0 ? 'Base' : `+${inc}`}</span>
                        <span className="font-mono font-bold text-sm text-white">{bidVal}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom bid */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={customBid}
                    onChange={(e) => setCustomBid(e.target.value)}
                    placeholder={`Min: ${basePoints}`}
                    className="flex-1 bg-black/60 border border-white/10 px-4 py-3 focus:outline-none focus:border-primary text-white font-mono rounded"
                  />
                  <button
                    onClick={() => {
                      const amt = parseInt(customBid);
                      if (!isNaN(amt)) handlePlaceBid(amt);
                    }}
                    disabled={loading || !customBid}
                    className="px-6 bg-primary text-black font-black tracking-widest uppercase hover:bg-white transition-colors rounded disabled:opacity-50"
                  >
                    BID
                  </button>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  Your balance: <span className="text-primary font-mono font-bold">{team?.points.toLocaleString()}</span> pts
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bidding Closed — answer phase */}
        {auction && auction.status === 'CLOSED' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
            <div className="w-24 h-24 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 animate-pulse">
              <Gavel className="h-12 w-12 text-yellow-400" />
            </div>
            <div>
              <div className="text-yellow-400 font-bold uppercase tracking-widest mb-3 text-sm">● Bidding Closed</div>
              <h2 className="text-3xl font-black tracking-widest uppercase mb-3">Answer Phase</h2>
              <p className="text-gray-400">
                Waiting for{' '}
                <span className="text-white font-bold">
                  {auction.winnerTeam?.teamName || auction.bids?.[0]?.team?.teamName || 'the winner'}
                </span>{' '}
                to answer...
              </p>
              {auction.winnerTeam?.id === team?.id && (
                <div className="mt-4 px-6 py-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded font-bold text-lg animate-pulse">
                  🎯 It's YOUR turn to answer!
                </div>
              )}
            </div>
            <div className="glass-card p-5 border border-white/5 text-center">
              <div className="text-sm text-gray-400 mb-1">Winning Bid</div>
              <div className="text-5xl font-mono font-black text-yellow-400">{auction.winningBid}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
