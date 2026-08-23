'use client';

import { useState, useEffect } from 'react';
import { 
  ListOrdered, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trophy, 
  Gavel, 
  Filter 
} from 'lucide-react';

interface AuctionRecord {
  id: string;
  questionId: string;
  question: {
    id: string;
    text: string;
    answer: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_CHALLENGE';
    basePoints: number;
    category?: string;
  };
  winnerTeamId?: string;
  winnerTeam?: {
    id: string;
    teamName: string;
    registrationNumber: string;
  };
  winningBid?: number;
  result?: 'CORRECT' | 'WRONG';
  updatedAt: string;
  _count?: {
    bids: number;
  };
}

export default function AuctionHistoryPage() {
  const [history, setHistory] = useState<AuctionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('ALL');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (resultFilter !== 'ALL') params.set('result', resultFilter);

      const res = await fetch(`/api/admin/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch auction history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [resultFilter]);

  // Derived metrics
  const totalCompleted = history.length;
  const correctCount = history.filter(h => h.result === 'CORRECT').length;
  const incorrectCount = history.filter(h => h.result === 'WRONG').length;
  const totalWinningBids = history.reduce((acc, h) => acc + (h.winningBid || 0), 0);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const getResultBadge = (result?: string) => {
    switch (result) {
      case 'CORRECT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
            <CheckCircle2 className="h-3.5 w-3.5" /> CORRECT
          </span>
        );
      case 'WRONG':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle className="h-3.5 w-3.5" /> INCORRECT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/30">
            COMPLETED
          </span>
        );
    }
  };

  const filteredHistory = history.filter(h => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      h.question?.text.toLowerCase().includes(q) ||
      (h.question?.category && h.question.category.toLowerCase().includes(q)) ||
      (h.winnerTeam?.teamName && h.winnerTeam.teamName.toLowerCase().includes(q)) ||
      (h.winnerTeam?.registrationNumber && h.winnerTeam.registrationNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-wide">
            <ListOrdered className="h-7 w-7 text-purple-400" />
            AUCTION ROUNDS HISTORY
          </h1>
          <p className="text-sm text-gray-400 mt-1">Complete record of completed auction rounds, winning bids, and responses.</p>
        </div>
        <button 
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-950/60 text-purple-300 border border-purple-500/50 hover:bg-purple-900/60 transition-colors text-sm font-semibold rounded"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Log
        </button>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 border border-white/10 rounded-lg bg-black/40 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2 text-xs font-mono uppercase tracking-wider">
            <span>Completed Rounds</span>
            <Gavel className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{totalCompleted}</div>
          <div className="text-xs text-gray-500 mt-1">Total completed auction rounds</div>
        </div>

        <div className="p-5 border border-green-500/20 rounded-lg bg-green-950/10 shadow-lg">
          <div className="flex items-center justify-between text-green-400 mb-2 text-xs font-mono uppercase tracking-wider">
            <span>Correct Answers</span>
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-3xl font-black text-green-400 font-mono">{correctCount}</div>
          <div className="text-xs text-green-500/80 mt-1">Successful question answers</div>
        </div>

        <div className="p-5 border border-red-500/20 rounded-lg bg-red-950/10 shadow-lg">
          <div className="flex items-center justify-between text-red-400 mb-2 text-xs font-mono uppercase tracking-wider">
            <span>Incorrect Answers</span>
            <XCircle className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-3xl font-black text-red-400 font-mono">{incorrectCount}</div>
          <div className="text-xs text-red-500/80 mt-1">Failed response penalties</div>
        </div>

        <div className="p-5 border border-purple-500/20 rounded-lg bg-purple-950/10 shadow-lg">
          <div className="flex items-center justify-between text-purple-400 mb-2 text-xs font-mono uppercase tracking-wider">
            <span>Total Winning Bids</span>
            <Trophy className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-purple-300 font-mono">{totalWinningBids} pts</div>
          <div className="text-xs text-purple-400/80 mt-1">Cumulative winning bid points</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 bg-black/40 border border-white/10 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by question, category, or winning team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/60 border border-white/10 pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-colors rounded"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
          <Filter className="h-3.5 w-3.5 text-purple-400" />
          <span>OUTCOME:</span>
          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="bg-black/60 border border-white/10 text-xs px-3 py-2 text-gray-200 rounded focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Outcomes</option>
            <option value="CORRECT">Correct Answers</option>
            <option value="WRONG">Incorrect Answers</option>
          </select>
        </div>
      </div>

      {/* Main Auction History Table */}
      <div className="overflow-x-auto border border-white/10 rounded-lg bg-black/40 shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 border-b border-white/5">Time</th>
              <th className="px-6 py-4 border-b border-white/5">Question</th>
              <th className="px-6 py-4 border-b border-white/5">Winning Team</th>
              <th className="px-6 py-4 border-b border-white/5 text-right">Winning Bid</th>
              <th className="px-6 py-4 border-b border-white/5 text-center">Bids Count</th>
              <th className="px-6 py-4 border-b border-white/5 text-right">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-400" />
                  Loading auction history...
                </td>
              </tr>
            ) : filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No completed auctions match your criteria.
                </td>
              </tr>
            ) : (
              filteredHistory.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  {/* Time */}
                  <td className="px-6 py-4 text-xs font-mono text-gray-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-500" />
                      {formatDate(item.updatedAt)}
                    </div>
                  </td>

                  {/* Question */}
                  <td className="px-6 py-4 max-w-md">
                    <div className="font-bold text-gray-200 line-clamp-2" title={item.question?.text}>
                      {item.question?.text || 'Question details unavailable'}
                    </div>
                    <div className="text-xs text-green-400 mt-1 font-mono">
                      Answer: {item.question?.answer}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      {item.question?.category && (
                        <span className="bg-white/5 px-2 py-0.5 rounded text-gray-400 border border-white/5">
                          {item.question.category}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        item.question?.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400' :
                        item.question?.difficulty === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400' :
                        item.question?.difficulty === 'HARD' ? 'bg-red-500/10 text-red-400' : 
                        'bg-purple-500/10 text-purple-400'
                      }`}>
                        {item.question?.difficulty} ({item.question?.basePoints} pts)
                      </span>
                    </div>
                  </td>

                  {/* Winner Team */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.winnerTeam ? (
                      <div>
                        <div className="font-bold text-white">{item.winnerTeam.teamName}</div>
                        <div className="text-xs text-gray-500 font-mono">Reg #: {item.winnerTeam.registrationNumber}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 italic">No Winner</span>
                    )}
                  </td>

                  {/* Winning Bid */}
                  <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-bold text-base text-purple-300">
                    {item.winningBid ? `${item.winningBid} pts` : '-'}
                  </td>

                  {/* Total Bids */}
                  <td className="px-6 py-4 text-center whitespace-nowrap font-mono text-xs text-gray-400">
                    <span className="bg-white/5 px-2.5 py-1 rounded border border-white/10">
                      {item._count?.bids || 0} bids
                    </span>
                  </td>

                  {/* Result */}
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {getResultBadge(item.result)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
