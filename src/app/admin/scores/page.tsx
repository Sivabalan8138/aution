'use client';

import { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  RefreshCw, 
  Trophy, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  MinusCircle, 
  Filter, 
  Clock, 
  Users, 
  Activity,
  ArrowRight
} from 'lucide-react';

interface ScoreTx {
  id: string;
  teamId: string;
  team: {
    id: string;
    teamName: string;
    registrationNumber: string;
    points: number;
  };
  auctionId?: string;
  auction?: {
    question?: {
      id: string;
      text: string;
      difficulty: string;
      basePoints: number;
      category?: string;
    };
  };
  amount: number;
  type: 'AUCTION_WIN' | 'AUCTION_LOSS' | 'ADMIN_ADD' | 'ADMIN_SUBTRACT' | 'RESET';
  previousPoints: number;
  newPoints: number;
  reason?: string;
  timestamp: string;
}

interface Team {
  id: string;
  teamName: string;
  registrationNumber: string;
}

export default function ScoreHistoryPage() {
  const [transactions, setTransactions] = useState<ScoreTx[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      if (teamFilter !== 'ALL') params.set('teamId', teamFilter);

      const res = await fetch(`/api/admin/scores?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch score transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/admin/teams');
      if (res.ok) {
        setTeams(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, teamFilter]);

  // Derived metrics
  const totalPointsAdded = transactions
    .filter(t => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalPointsDeducted = transactions
    .filter(t => t.amount < 0)
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const netPointsDelta = totalPointsAdded - totalPointsDeducted;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const getTypeBadge = (type: ScoreTx['type']) => {
    switch (type) {
      case 'AUCTION_WIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded bg-green-500/10 text-green-400 border border-green-500/20">
            <Trophy className="h-3.5 w-3.5" /> AUCTION WIN
          </span>
        );
      case 'AUCTION_LOSS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded bg-red-500/10 text-red-400 border border-red-500/20">
            <TrendingDown className="h-3.5 w-3.5" /> AUCTION DEDUCTION
          </span>
        );
      case 'ADMIN_ADD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <PlusCircle className="h-3.5 w-3.5" /> ADMIN ADD
          </span>
        );
      case 'ADMIN_SUBTRACT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <MinusCircle className="h-3.5 w-3.5" /> ADMIN SUBTRACT
          </span>
        );
      case 'RESET':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <RefreshCw className="h-3.5 w-3.5" /> RESET
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">
            {type}
          </span>
        );
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.team?.teamName?.toLowerCase().includes(q) ||
      t.team?.registrationNumber?.toLowerCase().includes(q) ||
      (t.reason && t.reason.toLowerCase().includes(q)) ||
      (t.auction?.question?.text && t.auction.question.text.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-wide">
            <History className="h-7 w-7 text-purple-400" />
            SCORE TRANSACTION LOGS
          </h1>
          <p className="text-sm text-gray-400 mt-1">Audit log of point additions, auction bids, and score modifications.</p>
        </div>
        <button 
          onClick={fetchTransactions}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-950/60 text-purple-300 border border-purple-500/50 hover:bg-purple-900/60 transition-colors text-sm font-semibold rounded"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 border border-white/10 rounded-lg bg-black/40 shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-2 text-xs font-mono uppercase tracking-wider">
            <span>Total Transactions</span>
            <Activity className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{filteredTransactions.length}</div>
          <div className="text-xs text-gray-500 mt-1">Audit log events recorded</div>
        </div>

        <div className="p-5 border border-green-500/20 rounded-lg bg-green-950/10 shadow-lg">
          <div className="flex items-center justify-between text-green-400 mb-2 text-xs font-mono uppercase tracking-wider">
            <span>Points Awarded</span>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-3xl font-black text-green-400 font-mono">+{totalPointsAdded}</div>
          <div className="text-xs text-green-500/80 mt-1">Cumulative positive additions</div>
        </div>

        <div className="p-5 border border-red-500/20 rounded-lg bg-red-950/10 shadow-lg">
          <div className="flex items-center justify-between text-red-400 mb-2 text-xs font-mono uppercase tracking-wider">
            <span>Points Deducted</span>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-3xl font-black text-red-400 font-mono">-{totalPointsDeducted}</div>
          <div className="text-xs text-red-500/80 mt-1">Auction costs & admin deducts</div>
        </div>

        <div className="p-5 border border-purple-500/20 rounded-lg bg-purple-950/10 shadow-lg">
          <div className="flex items-center justify-between text-purple-400 mb-2 text-xs font-mono uppercase tracking-wider">
            <span>Net Score Shift</span>
            <Trophy className="h-4 w-4 text-purple-400" />
          </div>
          <div className={`text-3xl font-black font-mono ${netPointsDelta >= 0 ? 'text-purple-300' : 'text-orange-400'}`}>
            {netPointsDelta >= 0 ? `+${netPointsDelta}` : netPointsDelta}
          </div>
          <div className="text-xs text-purple-400/80 mt-1">Total score change delta</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 bg-black/40 border border-white/10 rounded-lg">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by team, question, or note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/60 border border-white/10 pl-10 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-colors rounded"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <Filter className="h-3.5 w-3.5 text-purple-400" />
            <span>TYPE:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-black/60 border border-white/10 text-xs px-3 py-2 text-gray-200 rounded focus:outline-none focus:border-purple-500"
            >
              <option value="ALL">All Types</option>
              <option value="AUCTION_WIN">Auction Win</option>
              <option value="AUCTION_LOSS">Auction Deduction</option>
              <option value="ADMIN_ADD">Admin Add</option>
              <option value="ADMIN_SUBTRACT">Admin Subtract</option>
              <option value="RESET">Reset</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <Users className="h-3.5 w-3.5 text-purple-400" />
            <span>TEAM:</span>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-black/60 border border-white/10 text-xs px-3 py-2 text-gray-200 rounded focus:outline-none focus:border-purple-500 max-w-[180px] truncate"
            >
              <option value="ALL">All Teams</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.teamName} ({team.registrationNumber})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Transactions Log Table */}
      <div className="overflow-x-auto border border-white/10 rounded-lg bg-black/40 shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 border-b border-white/5">Time</th>
              <th className="px-6 py-4 border-b border-white/5">Team</th>
              <th className="px-6 py-4 border-b border-white/5">Type</th>
              <th className="px-6 py-4 border-b border-white/5 text-right">Amount</th>
              <th className="px-6 py-4 border-b border-white/5">Score Progression</th>
              <th className="px-6 py-4 border-b border-white/5">Context / Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-400" />
                  Loading transactions...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No score transactions match your criteria.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                  {/* Time */}
                  <td className="px-6 py-4 text-xs font-mono text-gray-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gray-500" />
                      {formatDate(tx.timestamp)}
                    </div>
                  </td>

                  {/* Team */}
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-200">{tx.team?.teamName || 'Unknown Team'}</div>
                    <div className="text-xs text-gray-500 font-mono">Reg #: {tx.team?.registrationNumber}</div>
                  </td>

                  {/* Type */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(tx.type)}
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-bold text-base">
                    {tx.amount > 0 ? (
                      <span className="text-green-400">+{tx.amount} pts</span>
                    ) : tx.amount < 0 ? (
                      <span className="text-red-400">{tx.amount} pts</span>
                    ) : (
                      <span className="text-gray-400">0 pts</span>
                    )}
                  </td>

                  {/* Progression */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-gray-400">{tx.previousPoints}</span>
                      <ArrowRight className="h-3 w-3 text-purple-400 shrink-0" />
                      <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {tx.newPoints} pts
                      </span>
                    </div>
                  </td>

                  {/* Reason / Context */}
                  <td className="px-6 py-4 max-w-xs">
                    {tx.auction?.question ? (
                      <div>
                        <div className="text-xs font-medium text-gray-300 line-clamp-1" title={tx.auction.question.text}>
                          Q: {tx.auction.question.text}
                        </div>
                        <div className="text-[11px] text-purple-400 mt-0.5 font-mono">
                          {tx.auction.question.category || 'General'} ({tx.auction.question.difficulty})
                        </div>
                      </div>
                    ) : tx.reason ? (
                      <div className="text-xs text-gray-300 italic">{tx.reason}</div>
                    ) : (
                      <span className="text-xs text-gray-600">-</span>
                    )}
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
