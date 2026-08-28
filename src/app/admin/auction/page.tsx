'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Gavel, Play, Square, Check, X, Timer, SkipForward, 
  RefreshCw, ChevronUp, AlertTriangle, Ban, Trophy,
  Zap, Users, Plus
} from 'lucide-react';
import { getPusherClient } from '@/lib/pusher-client';

interface Question {
  id: string;
  text: string;
  answer: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_CHALLENGE';
  basePoints: number;
  timeLimit: number;
  category?: string;
}

interface Team {
  id: string;
  teamName: string;
  registrationNumber: string;
  points: number;
  status: string;
}

interface Bid {
  id: string;
  amount: number;
  teamId: string;
  team: { id: string; teamName: string };
  createdAt: string;
}

interface Auction {
  id: string;
  status: 'ACTIVE' | 'CLOSED' | 'COMPLETED' | 'CANCELLED' | 'WAITING';
  question: Question;
  bids: Bid[];
  winnerTeamId?: string;
  winnerTeam?: Team;
  winningBid?: number;
  result?: string;
}

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
};

export default function AdminAuctionPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentAuction, setCurrentAuction] = useState<Auction | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [customBid, setCustomBid] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmAction | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const toastRef = useRef<NodeJS.Timeout | null>(null);
  const lastAuctionIdRef = useRef<string | null>(null);

  // Quick Register States
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);
  const [quickTeamName, setQuickTeamName] = useState('');
  const [quickRegisterLoading, setQuickRegisterLoading] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3500);
  };

  const showConfirm = (action: ConfirmAction) => setConfirmModal(action);

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = quickTeamName.trim();
    if (!name) return;
    setQuickRegisterLoading(true);
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName: name })
      });
      if (res.ok) {
        const newTeam = await res.json();
        // Refresh local list of teams
        await loadData();
        // Automatically select the new team
        setSelectedTeam(newTeam.id);
        setQuickTeamName('');
        setQuickRegisterOpen(false);
        showToast(`Team "${name}" registered successfully!`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to register team', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setQuickRegisterLoading(false);
    }
  };

  const loadData = useCallback(async () => {
    const [qRes, tRes, aRes] = await Promise.all([
      fetch('/api/admin/questions'),
      fetch('/api/admin/teams'),
      fetch('/api/admin/auction'),
    ]);
    if (qRes.ok) setQuestions(await qRes.json());
    if (tRes.ok) setTeams(await tRes.json());
    if (aRes.ok) {
      const auction = await aRes.json();
      setCurrentAuction(auction);
      
      // Only initialize the timer if this is a new auction we haven't seen yet
      if (auction && auction.id !== lastAuctionIdRef.current) {
        lastAuctionIdRef.current = auction.id;
        
        if (auction.timerEndsAt) {
          const remaining = Math.max(0, Math.floor((new Date(auction.timerEndsAt).getTime() - Date.now()) / 1000));
          setTimerSeconds(remaining);
          setTimerRunning(remaining > 0);
        } else if (auction.question?.timeLimit) {
          setTimerSeconds(auction.question.timeLimit);
          setTimerRunning(false);
        }
      } else if (!auction) {
        lastAuctionIdRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    loadData();
    // Use a long 30-second fallback poll instead of aggressive 2-second polling
    const interval = setInterval(loadData, 30000);
    const pusher = getPusherClient();
    const channel = pusher.subscribe('public');
    
    const refreshAuction = () => fetch('/api/admin/auction').then(r => r.json()).then(setCurrentAuction);
    const refreshAll = () => loadData();
    
    channel.bind('bid_placed', refreshAuction);
    channel.bind('auction_started', refreshAll);
    channel.bind('bidding_closed', refreshAuction);
    channel.bind('answer_result', refreshAll);
    channel.bind('score_updated', refreshAll);
    channel.bind('leaderboard_updated', refreshAll);

    return () => {
      clearInterval(interval);
      channel.unbind('bid_placed', refreshAuction);
      channel.unbind('auction_started', refreshAll);
      channel.unbind('bidding_closed', refreshAuction);
      channel.unbind('answer_result', refreshAll);
      channel.unbind('score_updated', refreshAll);
      channel.unbind('leaderboard_updated', refreshAll);
      pusher.unsubscribe('public');
    };
  }, [loadData]);

  // Timer logic
  useEffect(() => {
    if (!timerRunning) return;
    
    timerRef.current = setInterval(() => {
      setTimerSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setTimeout(() => {
            setTimerRunning(false);
            // Auto triggers removed for manual control
          }, 0);
          fetch('/api/admin/timer', { method: 'POST', body: JSON.stringify({ timer: 0 }) });
          return 0;
        }
        const next = s - 1;
        // Don't spam the API with stop commands on tick, just tick
        fetch('/api/admin/timer', { method: 'POST', body: JSON.stringify({ timer: next }) });
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, currentAuction]);

  const handleStartAuction = async () => {
    if (!selectedQuestion) return showToast('Select a question first', 'error');
    
    // 0-second Optimistic UI
    const selectedQ = questions.find(q => q.id === selectedQuestion);
    if (!selectedQ) return;
    
    const previousAuction = currentAuction;
    setCurrentAuction({
      id: 'temp-start-' + Date.now(),
      status: 'ACTIVE',
      question: selectedQ,
      bids: []
    });
    setTimerSeconds(selectedQ.timeLimit || 30);
    setTimerRunning(false);

    try {
      const res = await fetch('/api/admin/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START_AUCTION', payload: { questionId: selectedQuestion } })
      });
      if (res.ok) {
        const auction = await res.json();
        setCurrentAuction(auction);
        showToast('Auction started!', 'success');
      } else {
        setCurrentAuction(previousAuction); // Rollback
        showToast('Failed to start auction', 'error');
      }
    } catch {
      setCurrentAuction(previousAuction); // Rollback
      showToast('Network error', 'error');
    }
  };

  const handlePlaceBid = async (amount: number) => {
    if (!selectedTeam || !currentAuction) return showToast('Select a team first', 'error');
    const team = teams.find(t => t.id === selectedTeam);
    if (!team) return;
    if (team.points < amount) return showToast(`${team.teamName} doesn't have enough points`, 'error');
    const hasBid = currentAuction.bids?.some((b: Bid) => b.teamId === selectedTeam);
    if (hasBid) return showToast('This team has already placed a bid', 'error');
    const currentHighest = currentAuction.bids?.[0]?.amount || currentAuction.question.basePoints;
    if (amount <= currentHighest) return showToast(`Bid must be higher than current: ${currentHighest}`, 'error');

    // 0 Second (Optimistic UI) Update
    const previousAuction = { ...currentAuction };
    const optimisticBid: Bid = {
      id: 'temp-' + Date.now(),
      amount,
      teamId: selectedTeam,
      team: { id: team.id, teamName: team.teamName },
      createdAt: new Date().toISOString()
    };
    
    setCurrentAuction({
      ...currentAuction,
      bids: [optimisticBid, ...(currentAuction.bids || [])]
    });
    setCustomBid('');

    try {
      const res = await fetch('/api/admin/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId: currentAuction.id, teamId: selectedTeam, amount })
      });
      if (res.ok) {
        const newAuction = await fetch('/api/admin/auction').then(r => r.json());
        setCurrentAuction(newAuction);
        showToast(`Bid of ${amount} pts placed for ${team.teamName}`, 'success');
      } else {
        const err = await res.json();
        setCurrentAuction(previousAuction); // Rollback
        showToast(err.error || 'Failed to place bid', 'error');
      }
    } catch {
      setCurrentAuction(previousAuction); // Rollback
      showToast('Network error', 'error');
    }
  };

  const handleAutoCloseBidding = async () => {
    if (!currentAuction?.bids?.length) return;
    const highestBid = currentAuction.bids[0];
    const winnerTeam = teams.find(t => t.id === highestBid.teamId);

    // 0-second Optimistic UI
    const previousAuction = { ...currentAuction };
    setCurrentAuction({
      ...currentAuction,
      status: 'CLOSED',
      winnerTeamId: highestBid.teamId,
      winningBid: highestBid.amount,
      winnerTeam
    });

    try {
      const res = await fetch('/api/admin/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE_BIDDING',
          payload: { auctionId: currentAuction.id, winnerTeamId: highestBid.teamId, winningBid: highestBid.amount }
        })
      });
      if (res.ok) {
        const newAuction = await fetch('/api/admin/auction').then(r => r.json());
        setCurrentAuction(newAuction);
        showToast('Time is up! Bidding closed automatically.', 'success');
      } else {
        setCurrentAuction(previousAuction); // Rollback
        showToast('Failed to auto-close bidding', 'error');
      }
    } catch {
      setCurrentAuction(previousAuction); // Rollback
    }
  };

  const handleAutoCancelAuction = async () => {
    if (!currentAuction) return;
    const previousAuction = currentAuction;
    setCurrentAuction(null);

    try {
      await fetch('/api/admin/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL_AUCTION', payload: { auctionId: previousAuction.id } })
      });
      showToast('Timer ended with 0 bids. Auction auto-cancelled.', 'error');
    } catch {
      setCurrentAuction(previousAuction);
    }
  };


  const handleCloseBidding = () => {
    if (!currentAuction?.bids?.length) return showToast('No bids placed yet', 'error');
    const highestBid = currentAuction.bids[0];
    const winnerTeam = teams.find(t => t.id === highestBid.teamId);
    showConfirm({
      title: 'Close Bidding',
      description: `This will close bidding and declare ${winnerTeam?.teamName || 'the winning team'} as the highest bidder with ${highestBid.amount} pts. Proceed?`,
      confirmLabel: 'Close & Proceed to Answer',
      confirmClass: 'bg-yellow-500 hover:bg-yellow-600 text-black',
      onConfirm: async () => {
        // 0-second Optimistic UI
        const previousAuction = { ...currentAuction };
        setCurrentAuction({
          ...currentAuction,
          status: 'CLOSED',
          winnerTeamId: highestBid.teamId,
          winningBid: highestBid.amount,
          winnerTeam
        });
        setTimerRunning(false);

        try {
          const res = await fetch('/api/admin/auction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'CLOSE_BIDDING',
              payload: { auctionId: currentAuction.id, winnerTeamId: highestBid.teamId, winningBid: highestBid.amount }
            })
          });
          if (res.ok) {
            const newAuction = await fetch('/api/admin/auction').then(r => r.json());
            setCurrentAuction(newAuction);
            showToast('Bidding closed!', 'success');
          } else {
            setCurrentAuction(previousAuction); // Rollback
            showToast('Failed to close bidding', 'error');
          }
        } catch {
          setCurrentAuction(previousAuction); // Rollback
        }
      }
    });
  };

  const handleAnswer = (result: 'CORRECT' | 'WRONG') => {
    const winnerTeam = currentAuction?.winnerTeam || teams.find(t => t.id === currentAuction?.winnerTeamId);
    
    // Check if next bidder exists in case of wrong answer
    const failedTeamIds = new Set(
      (currentAuction as any)?.scoreTx
        ?.filter((st: any) => st.type === 'AUCTION_LOSS')
        .map((st: any) => st.teamId) || []
    );
    if (currentAuction?.winnerTeamId) failedTeamIds.add(currentAuction.winnerTeamId);

    const nextBid = currentAuction?.bids?.find((b: Bid) => !failedTeamIds.has(b.teamId));

    let confirmDescription = '';
    if (result === 'CORRECT') {
      confirmDescription = `Award ${currentAuction?.winningBid} pts to ${winnerTeam?.teamName}. All other teams that placed a bid will be PENALIZED 100 pts.`;
    } else {
      if (nextBid) {
        confirmDescription = `The turn will automatically pass to the NEXT HIGHEST BIDDER: ${nextBid.team?.teamName} for ${nextBid.amount} pts. (${winnerTeam?.teamName} has already lost ${currentAuction?.winningBid} pts).`;
      } else {
        confirmDescription = `Since there are no more bidders, this auction will be completed. (${winnerTeam?.teamName} has already lost ${currentAuction?.winningBid} pts).`;
      }
    }

    showConfirm({
      title: result === 'CORRECT' ? '✅ Mark as Correct' : '❌ Mark as Incorrect',
      description: confirmDescription,
      confirmLabel: result === 'CORRECT' ? 'Confirm Correct' : (nextBid ? 'Deduct & Move to Next Bidder' : 'Confirm Wrong'),
      confirmClass: result === 'CORRECT' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white',
      onConfirm: async () => {
        // 0-second Optimistic UI
        const previousAuction = { ...currentAuction! };
        if (result === 'CORRECT' || !nextBid) {
          setCurrentAuction(null); // Auction over
        } else {
          // Move to next bidder
          setCurrentAuction({
            ...currentAuction!,
            winnerTeamId: nextBid.teamId,
            winnerTeam: nextBid.team as any,
            winningBid: nextBid.amount
          });
        }

        try {
          const res = await fetch('/api/admin/auction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'RESOLVE_ANSWER',
              payload: { auctionId: previousAuction.id, result, teamId: previousAuction.winnerTeamId, amount: previousAuction.winningBid }
            })
          });
          const data = await res.json();
          if (data.hasNextBidder) {
            setCurrentAuction(data.updatedAuction);
            loadData();
            showToast(`Wrong answer! Turn moved to ${data.nextBid?.team?.teamName || 'next bidder'} (${data.nextBid?.amount} pts).`, 'error');
          } else {
            setCurrentAuction(null);
            loadData();
            showToast(result === 'CORRECT' ? 'Correct! Points awarded.' : 'Wrong! Points deducted. Auction completed.', result === 'CORRECT' ? 'success' : 'error');
          }
        } catch {
          setCurrentAuction(previousAuction); // Rollback on error
          showToast('Network error', 'error');
        }
      }
    });
  };

  const handleCancelAuction = () => {
    showConfirm({
      title: 'Cancel Auction',
      description: 'This will cancel the current auction. No points will be awarded or deducted. Are you sure?',
      confirmLabel: 'Cancel Auction',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: async () => {
        const previousAuction = currentAuction;
        setCurrentAuction(null);
        setTimerRunning(false);

        try {
          await fetch('/api/admin/auction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'CANCEL_AUCTION', payload: { auctionId: previousAuction!.id } })
          });
          showToast('Auction cancelled.', 'error');
        } catch {
          setCurrentAuction(previousAuction); // Rollback
          showToast('Network error', 'error');
        }
      }
    });
  };

  const handleQuickBid = (increment: number) => {
    const currentHighest = currentAuction?.bids?.[0]?.amount || currentAuction?.question?.basePoints || 0;
    handlePlaceBid(currentHighest + increment);
  };

  // ── Start Screen ─────────────────────────────────────────────────────────────
  if (!currentAuction || currentAuction.status === 'CANCELLED' || currentAuction.status === 'COMPLETED') {
    const unusedQuestions = questions.filter(q =>
      !q.id // placeholder; ideally filter already-used question IDs
    );
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg font-semibold text-sm shadow-2xl border transition-all ${
            toast.type === 'success' ? 'bg-green-950 text-green-300 border-green-500/50' : 'bg-red-950 text-red-300 border-red-500/50'
          }`}>{toast.msg}</div>
        )}

        <div className="glass-card p-8 border-t-4 border-red-500 rounded-lg shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <Gavel className="h-7 w-7 text-red-500" />
            <h2 className="text-2xl font-black tracking-wider uppercase">Launch New Auction</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2 uppercase font-mono tracking-widest">Select Question</label>
              <select
                className="w-full bg-black/60 border border-white/10 px-4 py-3 focus:outline-none focus:border-red-500 text-white rounded"
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
              >
                <option value="">-- Choose a Question --</option>
                {questions.map(q => (
                  <option key={q.id} value={q.id}>
                    [{q.difficulty}] {q.text.substring(0, 70)}{q.text.length > 70 ? '...' : ''} ({q.basePoints} pts)
                  </option>
                ))}
              </select>
            </div>

            {selectedQuestion && (() => {
              const q = questions.find(q => q.id === selectedQuestion);
              return q ? (
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-sm space-y-1">
                  <div className={`font-bold text-xs uppercase tracking-widest ${
                    q.difficulty === 'EASY' ? 'text-green-400' : q.difficulty === 'MEDIUM' ? 'text-yellow-400' :
                    q.difficulty === 'HARD' ? 'text-red-400' : 'text-purple-400'
                  }`}>{q.difficulty} · {q.basePoints} pts base · {q.timeLimit}s timer</div>
                  <div className="text-gray-200 font-medium">{q.text}</div>
                  <div className="text-green-400 font-mono text-xs">Answer: {q.answer}</div>
                </div>
              ) : null;
            })()}

            <button
              onClick={handleStartAuction}
              disabled={!selectedQuestion || loadingAction === 'start'}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black tracking-widest uppercase transition-colors border border-red-400/50 rounded disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingAction === 'start' ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Gavel className="h-5 w-5" />}
              Launch Auction
            </button>
          </div>
        </div>

        <div className="glass-card p-5 border border-white/10 rounded-lg text-center text-sm text-gray-400">
          <p className="font-mono uppercase tracking-widest">
            {questions.length} questions available · {teams.filter(t => t.status === 'ACTIVE').length} active teams
          </p>
        </div>
      </div>
    );
  }

  // ── Live Auction Screen ───────────────────────────────────────────────────────
  const highestBid = currentAuction.bids?.[0];
  const timerPercent = Math.max(0, (timerSeconds / (currentAuction.question?.timeLimit || 30)) * 100);

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg font-semibold text-sm shadow-2xl border ${
          toast.type === 'success' ? 'bg-green-950 text-green-300 border-green-500/50' : 'bg-red-950 text-red-300 border-red-500/50'
        }`}>{toast.msg}</div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 border-t-4 border-yellow-500 rounded-lg shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-lg text-white">{confirmModal.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{confirmModal.description}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold uppercase rounded">Cancel</button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className={`flex-1 py-2.5 text-sm font-bold uppercase rounded ${confirmModal.confirmClass}`}
              >{confirmModal.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Register Team Modal */}
      {quickRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 border-t-4 border-purple-500 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg text-white">Quick Add Team</h3>
              <button onClick={() => setQuickRegisterOpen(false)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mb-6">
              Create a new team on the fly. College, department, participants, contact numbers, and registration numbers will be automatically generated with common details.
            </p>

            <form onSubmit={handleQuickRegister} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-2 uppercase font-mono tracking-widest">Team Name</label>
                <input
                  type="text"
                  required
                  value={quickTeamName}
                  onChange={(e) => setQuickTeamName(e.target.value)}
                  placeholder="e.g. Thunderbolts"
                  className="w-full bg-black/60 border border-white/10 px-4 py-3 focus:outline-none focus:border-purple-500 text-white rounded"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickRegisterOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold uppercase rounded text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickRegisterLoading || !quickTeamName}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold uppercase rounded flex items-center justify-center gap-2"
                >
                  {quickRegisterLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Register Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left: Question + Controls ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Question Card */}
          <div className="glass-card p-6 border-t-4 border-red-500 rounded-lg shadow-xl relative">
            <div className="flex justify-between items-start mb-3">
              <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full ${
                currentAuction.question.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                currentAuction.question.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                currentAuction.question.difficulty === 'HARD' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                'bg-purple-500/20 text-purple-400 border border-purple-500/30'
              }`}>
                {currentAuction.question.difficulty}
                {currentAuction.question.category ? ` · ${currentAuction.question.category}` : ''}
              </span>
              <span className="font-mono text-gray-400 text-sm">Base: <span className="text-white font-bold">{currentAuction.question.basePoints} pts</span></span>
            </div>
            <p className="text-xl md:text-2xl font-medium leading-relaxed text-white mb-4">{currentAuction.question.text}</p>
            <div className="p-3 bg-green-950/40 border border-green-500/20 rounded text-sm">
              <span className="font-bold text-green-400 font-mono">ANSWER: </span>
              <span className="text-green-300">{currentAuction.question.answer}</span>
            </div>
          </div>

          {/* ── ACTIVE: Bidding Controls ── */}
          {currentAuction.status === 'ACTIVE' && (
            <div className="glass-card p-6 border border-white/10 rounded-lg shadow-xl space-y-5">
              {/* Timer */}
              <div className="flex items-center gap-4 p-4 bg-black/40 border border-white/5 rounded-lg">
                <Timer className={`h-8 w-8 ${timerSeconds <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <div className={`text-4xl font-mono font-black ${timerSeconds <= 10 ? 'text-red-500' : 'text-white'}`}>{timerSeconds}s</div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${timerSeconds <= 10 ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${timerPercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const willRun = !timerRunning;
                      setTimerRunning(willRun);
                      fetch('/api/admin/timer', { 
                        method: 'POST', 
                        body: JSON.stringify({ 
                          timer: timerSeconds, 
                          action: willRun ? 'START' : 'STOP',
                          auctionId: currentAuction.id
                        }) 
                      });
                    }}
                    className={`p-3 rounded-lg ${timerRunning ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-green-500/20 text-green-500 border border-green-500/30'}`}
                  >
                    {timerRunning ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  <button 
                    onClick={() => {
                      const resetTime = currentAuction?.question?.timeLimit || 30;
                      setTimerRunning(false);
                      setTimerSeconds(resetTime);
                      fetch('/api/admin/timer', { 
                        method: 'POST', 
                        body: JSON.stringify({ 
                          timer: resetTime,
                          action: 'STOP',
                          auctionId: currentAuction.id
                        }) 
                      });
                    }} 
                    className="p-3 bg-white/10 hover:bg-white/15 rounded-lg border border-white/10"
                    title="Reset Timer"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Team selector */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs text-gray-400 uppercase font-mono tracking-widest">
                    <Users className="h-3.5 w-3.5 inline mr-1" />Bidding Team
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickRegisterOpen(true)}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Quick Add Team
                  </button>
                </div>
                <select
                  className="w-full bg-black/60 border border-white/10 px-4 py-3 focus:outline-none focus:border-primary text-white rounded"
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                >
                  <option value="">-- Select Team --</option>
                  {teams.filter(t => t.status === 'ACTIVE').map(t => {
                    const hasBid = currentAuction.bids?.some((b: Bid) => b.teamId === t.id);
                    return (
                      <option key={t.id} value={t.id} disabled={hasBid}>
                        {hasBid ? '✓ ' : ''}{t.teamName} ({t.points.toLocaleString()} pts){hasBid ? ' — already bid' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Quick bids */}
              <div className="grid grid-cols-5 gap-2">
                {[50, 100, 200, 500, 1000].map(inc => (
                  <button
                    key={inc}
                    onClick={() => handleQuickBid(inc)}
                    disabled={loadingAction === 'bid'}
                    className="py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/50 text-sm font-bold font-mono rounded transition-all disabled:opacity-50"
                  >
                    +{inc}
                  </button>
                ))}
              </div>

              {/* Custom bid */}
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customBid}
                  onChange={(e) => setCustomBid(e.target.value)}
                  placeholder={`Min: ${currentAuction.bids?.[0]?.amount !== undefined ? currentAuction.bids[0].amount + 1 : currentAuction.question.basePoints}`}
                  className="flex-1 bg-black/60 border border-white/10 px-4 py-3 focus:outline-none focus:border-primary text-white font-mono rounded"
                />
                <button
                  onClick={() => {
                    const amt = parseInt(customBid);
                    if (!isNaN(amt)) { handlePlaceBid(amt); }
                  }}
                  disabled={!customBid || loadingAction === 'bid'}
                  className="px-6 bg-primary/20 hover:bg-primary/40 border border-primary/50 text-primary font-black tracking-widest uppercase rounded transition-colors disabled:opacity-50"
                >
                  {loadingAction === 'bid' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'BID'}
                </button>
              </div>

              {/* Close Bidding */}
              <button
                onClick={handleCloseBidding}
                disabled={!currentAuction.bids?.length || loadingAction === 'close'}
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-black font-black tracking-widest uppercase rounded flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
              >
                {loadingAction === 'close' ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Ban className="h-5 w-5" />}
                Close Bidding
              </button>
            </div>
          )}

          {/* ── CLOSED: Answer Phase ── */}
          {currentAuction.status === 'CLOSED' && (
            <div className="glass-card p-8 border border-white/10 rounded-lg text-center shadow-xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full text-sm font-bold uppercase tracking-widest mb-6">
                <Gavel className="h-4 w-4" /> Answer Phase
              </div>
              <p className="text-2xl text-white font-bold mb-1">
                {currentAuction.winnerTeam?.teamName || teams.find(t => t.id === currentAuction.winnerTeamId)?.teamName || 'Winner'}
              </p>
              <p className="text-gray-400 mb-2">Winning bid: <span className="font-mono text-3xl font-black text-white">{currentAuction.winningBid} pts</span></p>
              <p className="text-sm text-gray-500 mb-8">Did they answer correctly?</p>

              <div className="flex gap-4">
                <button
                  onClick={() => handleAnswer('CORRECT')}
                  disabled={loadingAction === 'resolve'}
                  className="flex-1 py-6 bg-green-500/20 hover:bg-green-500/40 border border-green-500/50 text-green-400 flex flex-col items-center gap-2 rounded transition-colors disabled:opacity-50"
                >
                  <Check className="h-10 w-10" />
                  <span className="font-black tracking-widest text-lg">CORRECT</span>
                  <span className="text-sm text-green-500/80">+{currentAuction.winningBid} pts</span>
                </button>
                <button
                  onClick={() => handleAnswer('WRONG')}
                  disabled={loadingAction === 'resolve'}
                  className="flex-1 py-6 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-400 flex flex-col items-center gap-2 rounded transition-colors disabled:opacity-50"
                >
                  <X className="h-10 w-10" />
                  <span className="font-black tracking-widest text-lg">WRONG</span>
                  <span className="text-sm text-red-500/80">-{currentAuction.winningBid} pts</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Bid Sidebar ── */}
        <div className="space-y-4">
          {/* Current Leader */}
          <div className="glass-card p-5 border-t-4 border-yellow-500 rounded-lg shadow-xl">
            <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-yellow-500" /> Highest Bid
            </h3>
            {highestBid ? (
              <div>
                <div className="text-5xl font-mono font-black text-yellow-400 mb-1">{highestBid.amount}</div>
                <div className="text-white font-bold truncate">{highestBid.team?.teamName}</div>
              </div>
            ) : (
              <div className="text-xl text-gray-500 italic py-2">No bids yet</div>
            )}
          </div>

          {/* Live Bid Log */}
          <div className="glass-card p-5 border border-white/5 rounded-lg shadow-xl flex flex-col max-h-80">
            <h3 className="font-bold tracking-wider mb-4 pb-2 border-b border-white/5 text-sm uppercase text-gray-400">
              Bid Log ({currentAuction.bids?.length || 0})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {currentAuction.bids?.length === 0 ? (
                <p className="text-center text-gray-600 text-sm py-4">No bids yet.</p>
              ) : (
                currentAuction.bids?.map((bid: Bid, idx: number) => {
                  const isCurrentAnswering = currentAuction.status === 'CLOSED' && bid.teamId === currentAuction.winnerTeamId;
                  const isFailed = (currentAuction as any)?.scoreTx?.some((st: any) => st.teamId === bid.teamId && st.type === 'AUCTION_LOSS');
                  
                  return (
                    <div key={bid.id} className={`flex justify-between items-center text-sm p-2.5 rounded border ${
                      isCurrentAnswering ? 'bg-yellow-500/20 border-yellow-500/40 ring-1 ring-yellow-500/30' :
                      isFailed ? 'bg-red-950/20 border-red-500/20 opacity-75' :
                      idx === 0 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-white/5 border-white/5'
                    }`}>
                      <div>
                        {isCurrentAnswering && <span className="text-yellow-400 font-bold mr-1">🎯</span>}
                        {isFailed && <span className="text-red-400 font-bold mr-1">❌</span>}
                        {!isCurrentAnswering && !isFailed && idx === 0 && <ChevronUp className="h-3.5 w-3.5 text-yellow-400 inline mr-1" />}
                        <span className={`font-bold ${isCurrentAnswering ? 'text-yellow-300' : isFailed ? 'text-red-300 line-through' : idx === 0 ? 'text-yellow-300' : 'text-gray-300'}`}>
                          {bid.team?.teamName}
                        </span>
                        {isFailed && <span className="ml-1 text-[10px] uppercase font-mono text-red-400 font-semibold">(Wrong)</span>}
                        {isCurrentAnswering && <span className="ml-1 text-[10px] uppercase font-mono text-yellow-400 font-semibold">(Answering)</span>}
                      </div>
                      <span className={`font-mono font-bold ${isCurrentAnswering ? 'text-yellow-400' : isFailed ? 'text-red-400' : idx === 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {bid.amount} pts
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cancel Button */}
          <button
            onClick={handleCancelAuction}
            disabled={loadingAction === 'cancel'}
            className="w-full py-3 bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 transition-colors uppercase text-sm font-bold tracking-widest rounded flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loadingAction === 'cancel' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Cancel Auction
          </button>
        </div>
      </div>
    </div>
  );
}
