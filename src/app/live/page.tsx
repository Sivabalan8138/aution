'use client';

import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { Zap, Timer as TimerIcon, Trophy, CheckCircle2, XCircle, Gavel, Activity } from 'lucide-react';

interface Bid {
  id: string;
  amount: number;
  team: { id: string; teamName: string };
}

interface Auction {
  id: string;
  status: 'WAITING' | 'ACTIVE' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
  question: {
    text: string;
    difficulty: string;
    basePoints: number;
    timeLimit: number;
    category?: string;
  };
  bids: Bid[];
  winnerTeam?: { teamName: string };
  winningBid?: number;
  result?: string;
}

interface CelebrationState {
  result: 'CORRECT' | 'WRONG';
  teamName: string;
  amount: number;
  hasNextBidder?: boolean;
  nextWinnerTeamName?: string;
  nextWinningBidAmount?: number;
}

const diffColor = (d: string) =>
  d === 'EASY' ? 'text-green-400 border-green-500/50 bg-green-500/10' :
  d === 'MEDIUM' ? 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10' :
  d === 'HARD' ? 'text-red-400 border-red-500/50 bg-red-500/10' :
  'text-purple-400 border-purple-500/50 bg-purple-500/10';

const diffGlow = (d: string) =>
  d === 'EASY' ? 'rgba(34,197,94,0.15)' :
  d === 'MEDIUM' ? 'rgba(234,179,8,0.15)' :
  d === 'HARD' ? 'rgba(239,68,68,0.15)' :
  'rgba(168,85,247,0.15)';

export default function LiveScreenPage() {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [timer, setTimer] = useState(30);
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [bidFlash, setBidFlash] = useState(false);
  const prevBidCount = useRef(0);

  const fetchAuction = () =>
    fetch('/api/admin/auction').then(r => r.json()).then(setAuction).catch(() => {});

  useEffect(() => {
    fetchAuction();
    const socket = getSocket();
    socket.emit('join_room', 'public');

    socket.on('auction_started', (newAuction: Auction) => {
      setAuction(newAuction);
      setTimer(newAuction.question?.timeLimit || 30);
      setCelebration(null);
      prevBidCount.current = 0;
    });

    socket.on('bid_placed', () => {
      fetchAuction();
      setBidFlash(true);
      setTimeout(() => setBidFlash(false), 600);
    });

    socket.on('timer_tick', (t: number) => setTimer(t));

    socket.on('bidding_closed', () => fetchAuction());

    socket.on('answer_result', ({ result, team, amount, hasNextBidder, nextWinnerTeam, nextWinningBid }: any) => {
      fetchAuction();
      if (team) {
        setCelebration({
          result,
          teamName: team.teamName || 'Winning Team',
          amount: amount || 0,
          hasNextBidder,
          nextWinnerTeamName: nextWinnerTeam?.teamName,
          nextWinningBidAmount: nextWinningBid
        });
        setTimeout(() => setCelebration(null), 6000);
      }
    });

    socket.on('auction_cancelled', () => {
      setAuction(null);
      setCelebration(null);
    });

    return () => {
      socket.off('auction_started');
      socket.off('bid_placed');
      socket.off('timer_tick');
      socket.off('bidding_closed');
      socket.off('answer_result');
      socket.off('auction_cancelled');
    };
  }, []);

  const isIdle = !auction || !auction.question ||
    auction.status === 'CANCELLED' || auction.status === 'COMPLETED';

  // ── Idle / Standby Screen ─────────────────────────────────────────────────
  if (isIdle) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 blur-[150px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-fuchsia-500/5 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        {/* Celebration overlay (after auction completes on idle screen) */}
        {celebration && <CelebrationOverlay celebration={celebration} />}

        <div className="relative z-10 text-center px-8">
          <div className="inline-flex items-center justify-center h-32 w-32 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-10 mx-auto">
            <Zap className="h-16 w-16 text-cyan-400" style={{ filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.6))' }} />
          </div>
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase mb-4"
            style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #ff00ea 50%, #f0f000 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ELECTROBIT
          </h1>
          <p className="text-2xl md:text-3xl text-gray-500 tracking-[0.3em] uppercase font-mono mb-12">
            THE EEE AUCTION CHALLENGE
          </p>

          <div className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400" />
            </span>
            <span className="text-cyan-400 font-mono text-sm tracking-widest uppercase">System Ready · Awaiting Auction</span>
          </div>
        </div>
      </div>
    );
  }

  const { question, bids, winnerTeam, winningBid, status } = auction;
  const currentHighestBid = bids?.[0]?.amount || question.basePoints;
  const currentHighestTeam = bids?.[0]?.team?.teamName || null;
  const timerPct = Math.max(0, (timer / (question.timeLimit || 30)) * 100);
  const timerDanger = timer <= 10;

  // ── Live Auction Screen ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030303] flex flex-col relative overflow-hidden"
      style={{ background: `radial-gradient(ellipse at 50% 0%, ${diffGlow(question.difficulty)} 0%, #030303 60%)` }}>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
        backgroundSize: '80px 80px'
      }} />

      {/* Celebration Overlay */}
      {celebration && <CelebrationOverlay celebration={celebration} />}

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-10 py-6 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <Zap className="h-8 w-8 text-cyan-400" style={{ filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.6))' }} />
          <span className="text-2xl font-black tracking-widest text-white">ELECTROBIT</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Difficulty badge */}
          <span className={`px-5 py-2 text-sm font-black uppercase tracking-widest rounded-full border ${diffColor(question.difficulty)}`}>
            {question.difficulty}
          </span>
          {/* Status pill */}
          {status === 'ACTIVE' && (
            <span className="flex items-center gap-2 px-5 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full text-sm font-bold tracking-widest uppercase animate-pulse">
              <Activity className="h-4 w-4" /> BIDDING OPEN
            </span>
          )}
          {status === 'CLOSED' && (
            <span className="flex items-center gap-2 px-5 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full text-sm font-bold tracking-widest uppercase">
              <Gavel className="h-4 w-4" /> ANSWER PHASE
            </span>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-8 md:p-10 relative z-10">

        {/* LEFT: Question + Base Points */}
        <div className="flex-1 flex flex-col justify-center">
          {question.category && (
            <div className="text-sm font-mono tracking-[0.3em] uppercase text-gray-500 mb-5">
              {question.category}
            </div>
          )}

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-8 tracking-tight">
            {question.text}
          </h2>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-xl font-mono">
              <span className="text-gray-500 text-sm">BASE VALUE</span>
              <div className="text-3xl font-black text-white">{question.basePoints} <span className="text-gray-500 text-lg">pts</span></div>
            </div>
            <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-xl font-mono">
              <span className="text-gray-500 text-sm">TOTAL BIDS</span>
              <div className="text-3xl font-black text-white">{bids?.length || 0}</div>
            </div>
          </div>
        </div>

        {/* RIGHT: Timer + Bid Display */}
        <div className="w-full lg:w-[380px] flex flex-col gap-5">

          {/* Timer Card */}
          {status === 'ACTIVE' && (
            <div className={`rounded-2xl border p-6 flex flex-col items-center transition-all duration-500 ${
              timerDanger
                ? 'border-red-500/50 bg-red-950/30 shadow-[0_0_40px_rgba(239,68,68,0.15)]'
                : 'border-white/10 bg-white/5'
            }`}>
              <TimerIcon className={`h-8 w-8 mb-2 ${timerDanger ? 'text-red-400 animate-bounce' : 'text-gray-400'}`} />
              <div className={`text-8xl font-black font-mono tabular-nums ${timerDanger ? 'text-red-400' : 'text-white'}`}>
                {String(timer).padStart(2, '0')}
              </div>
              {/* Timer progress bar */}
              <div className="w-full h-2 bg-white/10 rounded-full mt-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${timerDanger ? 'bg-red-500' : 'bg-cyan-500'}`}
                  style={{ width: `${timerPct}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 font-mono uppercase tracking-widest mt-2">Time Remaining</div>
            </div>
          )}

          {/* Highest Bid / Winner Card */}
          <div className={`rounded-2xl border p-8 flex flex-col items-center text-center flex-1 justify-center transition-all duration-300 ${
            bidFlash ? 'border-cyan-500/80 bg-cyan-500/10 shadow-[0_0_40px_rgba(0,229,255,0.2)]' :
            status === 'CLOSED' ? 'border-yellow-500/30 bg-yellow-950/20' : 'border-white/10 bg-white/5'
          }`}>
            <Trophy className={`h-8 w-8 mb-3 ${status === 'CLOSED' ? 'text-yellow-400' : 'text-gray-500'}`} />
            <div className="text-xs font-mono uppercase tracking-[0.25em] text-gray-500 mb-2">
              {status === 'ACTIVE' ? 'Highest Bid' : 'Winning Bid'}
            </div>
            <div className={`text-7xl font-black font-mono tabular-nums mb-2 ${status === 'CLOSED' ? 'text-yellow-400' : 'text-cyan-400'}`}
              style={{ filter: status === 'CLOSED' ? 'drop-shadow(0 0 20px rgba(234,179,8,0.5))' : 'drop-shadow(0 0 20px rgba(0,229,255,0.4))' }}>
              {status === 'CLOSED' ? winningBid : currentHighestBid}
            </div>
            <div className="text-xs text-gray-500 font-mono mb-4">POINTS</div>

            {(currentHighestTeam || winnerTeam?.teamName) && (
              <div className="text-xl font-bold text-white uppercase tracking-wider truncate max-w-full px-4">
                {status === 'CLOSED' ? winnerTeam?.teamName : currentHighestTeam}
              </div>
            )}

            {!currentHighestTeam && status === 'ACTIVE' && (
              <div className="text-lg text-gray-600 italic">No bids yet</div>
            )}
          </div>

          {/* Bid List (top 5) */}
          {status === 'ACTIVE' && bids && bids.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
              <div className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-3">All Bids</div>
              {bids.slice(0, 5).map((bid, i) => (
                <div key={bid.id} className={`flex justify-between items-center px-4 py-2.5 rounded-xl text-sm ${
                  i === 0 ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'
                }`}>
                  <span className={`font-bold truncate ${i === 0 ? 'text-cyan-300' : 'text-gray-300'}`}>
                    {i === 0 ? '🏆 ' : `${i + 1}. `}{bid.team.teamName}
                  </span>
                  <span className={`font-mono font-black ml-2 flex-shrink-0 ${i === 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
                    {bid.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Celebration Overlay Component ─────────────────────────────────────────────
function CelebrationOverlay({ celebration }: { celebration: CelebrationState }) {
  const isCorrect = celebration.result === 'CORRECT';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-8 backdrop-blur-sm ${
      isCorrect ? 'bg-green-950/90' : 'bg-red-950/90'
    }`}>
      {/* Burst ring */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
        <div className={`w-[600px] h-[600px] rounded-full border-4 opacity-20 animate-ping ${
          isCorrect ? 'border-green-400' : 'border-red-400'
        }`} style={{ animationDuration: '1.5s' }} />
      </div>

      <div className={`relative max-w-3xl w-full p-16 text-center rounded-3xl border-4 shadow-2xl ${
        isCorrect
          ? 'border-green-500 bg-black/60 shadow-green-500/30'
          : 'border-red-500 bg-black/60 shadow-red-500/30'
      }`}>
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className={`p-8 rounded-full border-4 ${
            isCorrect ? 'bg-green-500/20 border-green-400 shadow-[0_0_60px_rgba(34,197,94,0.4)]' : 'bg-red-500/20 border-red-400 shadow-[0_0_60px_rgba(239,68,68,0.4)]'
          }`}>
            {isCorrect
              ? <CheckCircle2 className="h-24 w-24 text-green-400" />
              : <XCircle className="h-24 w-24 text-red-400" />
            }
          </div>
        </div>

        {/* Result label */}
        <h2 className={`text-5xl md:text-7xl font-black uppercase tracking-widest mb-6 ${
          isCorrect ? 'text-green-400' : 'text-red-400'
        }`} style={{ textShadow: isCorrect ? '0 0 40px rgba(34,197,94,0.5)' : '0 0 40px rgba(239,68,68,0.5)' }}>
          {isCorrect ? '🎉 CORRECT!' : '❌ WRONG!'}
        </h2>

        {/* Team Name */}
        <div className="text-4xl font-bold text-white mb-4 uppercase tracking-wide">
          {celebration.teamName}
        </div>

        {/* Points Change */}
        <div className={`text-6xl font-black font-mono ${isCorrect ? 'text-green-400' : 'text-red-400'}`}
          style={{ textShadow: isCorrect ? '0 0 30px rgba(34,197,94,0.6)' : '0 0 30px rgba(239,68,68,0.6)' }}>
          {isCorrect ? `+${celebration.amount}` : `-${celebration.amount}`}
          <span className="text-3xl ml-2 opacity-70">PTS</span>
        </div>

        {/* Next Bidder Info on Wrong Answer */}
        {!isCorrect && celebration.hasNextBidder && celebration.nextWinnerTeamName && (
          <div className="mt-6 pt-6 border-t border-red-500/30 text-yellow-300 font-medium text-lg animate-pulse">
            Passing question to next highest bidder:<br />
            <span className="text-white font-black text-2xl uppercase tracking-wider">{celebration.nextWinnerTeamName}</span>
            <span className="text-yellow-400 font-mono font-bold ml-2">({celebration.nextWinningBidAmount} PTS)</span>
          </div>
        )}
      </div>
    </div>
  );
}
