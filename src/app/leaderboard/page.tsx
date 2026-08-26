'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Trophy, Medal, Users, Target, CircleDollarSign, 
  Download, RefreshCw, Zap, UserPlus, LogIn, Scale, Lock
} from 'lucide-react';
import { getPusherClient } from '@/lib/pusher-client';

interface Team {
  id: string;
  teamName: string;
  registrationNumber: string;
  participant1Name: string;
  participant2Name: string;
  collegeName: string;
  department: string;
  points: number;
  bidsCount: number;
  solvedCount: number;
  updatedAt: string;
}

interface Stats {
  totalTeams: number;
  totalSolved: number;
  totalPoints: number;
}

export default function LeaderboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<Stats>({ totalTeams: 0, totalSolved: 0, totalPoints: 0 });
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const updateSyncTime = () => {
    const now = new Date();
    setLastSynced(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase());
  };

  const fetchLeaderboard = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams);
        setStats(data.stats);
        updateSyncTime();
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500); // Visual cue for manual refresh
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Fallback polling (slower, since sockets handle realtime)
    const interval = setInterval(fetchLeaderboard, 10000);

    // Pusher for Real-time
    const pusher = getPusherClient();
    const channel = pusher.subscribe('public');
    
    channel.bind('leaderboard_updated', () => { fetchLeaderboard(); });
    channel.bind('score_updated', () => { fetchLeaderboard(); });

    return () => {
      clearInterval(interval);
      channel.unbind_all();
      pusher.unsubscribe('public');
    };
  }, []);

  const downloadCSV = () => {
    if (teams.length === 0) return;
    
    const headers = ['Rank', 'Registration ID', 'Team Name', 'Participant 1', 'Participant 2', 'College', 'Department', 'Correct Answers', 'Bids Placed', 'Total Points'];
    const rows = teams.map((t, i) => [
      i + 1,
      t.registrationNumber,
      `"${t.teamName.replace(/"/g, '""')}"`,
      `"${t.participant1Name.replace(/"/g, '""')}"`,
      `"${t.participant2Name.replace(/"/g, '""')}"`,
      `"${t.collegeName.replace(/"/g, '""')}"`,
      `"${t.department.replace(/"/g, '""')}"`,
      t.solvedCount,
      t.bidsCount,
      t.points
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Electrobid_Leaderboard_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const topTeam = teams[0];

  return (
    <div className="min-h-screen bg-[#0A0D14] flex flex-col font-sans">
      
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-[#0A0D14]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" fill="currentColor" />
            </div>
            <div>
              <div className="font-black text-xl tracking-wider leading-none text-white">ELECTROBID</div>
              <div className="text-[10px] text-blue-400 font-bold tracking-[0.2em] uppercase mt-1">The EEE Auction Challenge</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Home</Link>
            <Link href="/team/register" className="flex items-center gap-1.5 text-sm font-semibold text-gray-300 hover:text-white transition-colors">
              <UserPlus className="h-4 w-4" /> Register Team
            </Link>
            <Link href="/team/login" className="flex items-center gap-1.5 text-sm font-semibold text-gray-300 hover:text-white transition-colors">
              <LogIn className="h-4 w-4" /> Team Login
            </Link>
            <Link href="/rules" className="flex items-center gap-1.5 text-sm font-semibold text-yellow-500/80 hover:text-yellow-400 transition-colors">
              <Scale className="h-4 w-4" /> Event Rules
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-1.5 text-sm font-bold text-teal-400 bg-teal-500/10 px-4 py-2 rounded-full border border-teal-500/20">
              <Trophy className="h-4 w-4" /> Leaderboard
            </Link>
            <Link href="/admin/login" className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-300 transition-colors">
              <Lock className="h-4 w-4" /> Admin Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 space-y-8">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full text-[10px] font-bold text-teal-400 tracking-widest uppercase mb-4">
              <Zap className="h-3 w-3" /> Real-Time Standings (Auto-Sync)
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight mb-2">Live Leaderboard</h1>
            <p className="text-gray-400 text-sm">Updated automatically on every score transaction without refreshing the page.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={downloadCSV}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-sm tracking-wide rounded-lg transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)]"
            >
              <Download className="h-4 w-4" /> Download Winner List
            </button>
            <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
              Last synced: {lastSynced}
              <button 
                onClick={fetchLeaderboard}
                className={`p-2 bg-white/5 hover:bg-white/10 rounded-md transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                title="Manual Refresh"
              >
                <RefreshCw className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Criteria Banner */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-900/20 via-purple-900/20 to-transparent border border-white/5 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <div className="text-sm font-bold text-white uppercase tracking-wider mb-0.5">Leaderboard Ranking Criteria</div>
              <div className="text-xs text-gray-400">
                1st Priority: <span className="text-yellow-400 font-semibold">Correct Answers Solved</span> | 2nd Priority: <span className="text-teal-400 font-semibold">Bidding Skill & Points Balance</span>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full text-[10px] font-bold text-gray-300 uppercase tracking-widest border border-white/5">
            <Zap className="h-3 w-3 text-teal-400" /> Auto Tiebreaker Active
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-[#0F131C] border border-white/5 rounded-2xl flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="h-7 w-7 text-blue-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Registered Teams</div>
              <div className="text-3xl font-black text-white flex items-baseline gap-2">
                {stats.totalTeams} <span className="text-sm text-teal-400 tracking-wider">TEAMS</span>
              </div>
            </div>
          </div>
          <div className="p-6 bg-[#0F131C] border border-white/5 rounded-2xl flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Target className="h-7 w-7 text-purple-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Correct Questions Solved</div>
              <div className="text-3xl font-black text-white flex items-baseline gap-2">
                {stats.totalSolved} <span className="text-sm text-purple-400 tracking-wider">SOLVED</span>
              </div>
            </div>
          </div>
          <div className="p-6 bg-[#0F131C] border border-white/5 rounded-2xl flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <CircleDollarSign className="h-7 w-7 text-yellow-500" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Points Balance</div>
              <div className="text-3xl font-black text-yellow-400 flex items-baseline gap-2">
                <span className="text-2xl text-yellow-600">$</span> {stats.totalPoints.toLocaleString()} <span className="text-sm text-yellow-600 tracking-wider">PTS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Overall Event Leader Card */}
          <div className="lg:col-span-1">
            {topTeam ? (
              <div className="relative p-8 bg-[#0F131C] rounded-2xl border border-yellow-500/30 overflow-hidden group shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                {/* Glow effect background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-32 bg-gradient-to-b from-yellow-500/20 to-transparent blur-2xl pointer-events-none"></div>
                
                <div className="relative flex flex-col items-center text-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-xs font-bold text-yellow-500 tracking-widest uppercase mb-6 shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                    <Medal className="h-3.5 w-3.5" /> Overall Event Leader
                  </div>
                  
                  <div className="text-[11px] font-mono text-green-400 font-bold mb-1 tracking-widest">{topTeam.registrationNumber}</div>
                  <h2 className="text-3xl font-black text-white mb-2 break-all leading-none">{topTeam.teamName}</h2>
                  <div className="text-xs text-gray-400 mb-8">{topTeam.collegeName}</div>

                  <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8"></div>

                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex-1 px-2 py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex flex-col items-center justify-center text-purple-300">
                      <div className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase mb-1">
                        <Target className="h-3 w-3" /> {topTeam.solvedCount}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-purple-400">Solved</span>
                    </div>
                    <div className="flex-1 px-2 py-3 bg-teal-500/10 border border-teal-500/20 rounded-xl flex flex-col items-center justify-center text-teal-300">
                      <div className="flex items-center gap-1 text-[10px] font-black tracking-widest uppercase mb-1">
                        <Zap className="h-3 w-3" /> {topTeam.bidsCount}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-teal-400">Bids</span>
                    </div>
                    <div className="flex-[1.5] text-right">
                      <div className="text-2xl font-black text-yellow-400 leading-none mb-1 shadow-yellow-500/50 drop-shadow-md">
                        {topTeam.points.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">PTS</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[300px] bg-[#0F131C] rounded-2xl border border-white/5 flex items-center justify-center text-gray-500 uppercase text-xs font-bold tracking-widest">
                No Leader Yet
              </div>
            )}
          </div>

          {/* Full Team Standings Table */}
          <div className="lg:col-span-3 bg-[#0F131C] rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Medal className="h-5 w-5 text-teal-400" /> 
                Full Team Standings <span className="text-gray-500 text-sm font-normal hidden md:inline">(Ranked by Correct Answers & Bidding Skill)</span>
              </h3>
              <div className="text-xs text-gray-500 font-bold tracking-wider">Total Registered: {teams.length} Teams</div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/40 text-[10px] text-gray-500 uppercase tracking-widest font-black border-b border-white/5">
                    <th className="p-4 pl-6 w-16 text-center">Rank</th>
                    <th className="p-4">Team Name</th>
                    <th className="p-4">Participants</th>
                    <th className="p-4">College / Dept</th>
                    <th className="p-4 text-center">Correct Answers</th>
                    <th className="p-4 pr-6 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {teams.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
                        {loading ? 'Loading...' : 'No Teams Registered'}
                      </td>
                    </tr>
                  )}
                  {teams.map((team, index) => {
                    const isTop3 = index < 3;
                    return (
                      <tr 
                        key={team.id} 
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                          index === 0 ? 'bg-yellow-500/[0.03]' : ''
                        }`}
                      >
                        <td className="p-4 pl-6 text-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto font-black text-sm ${
                            index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]' :
                            index === 1 ? 'bg-gray-300 text-black shadow-[0_0_15px_rgba(209,213,219,0.3)]' :
                            index === 2 ? 'bg-amber-700 text-white shadow-[0_0_15px_rgba(180,83,9,0.4)]' :
                            'bg-white/5 text-gray-400 font-bold'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`font-black text-base mb-1 ${isTop3 ? 'text-white' : 'text-gray-300'}`}>
                            {team.teamName}
                          </div>
                          <div className="inline-flex px-1.5 py-0.5 bg-teal-500/10 text-teal-400 text-[9px] font-mono font-bold tracking-widest rounded border border-teal-500/20">
                            {team.registrationNumber}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-gray-300 text-xs">{team.participant1Name} <span className="text-gray-600">&</span> {team.participant2Name}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-gray-400 text-xs max-w-[200px] truncate">{team.collegeName}</div>
                          <div className="text-gray-500 text-[10px] uppercase mt-0.5">{team.department}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${
                            team.solvedCount > 0 
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                              : 'bg-white/5 text-gray-500 border-white/10'
                          }`}>
                            <Target className="h-3.5 w-3.5" />
                            {team.solvedCount} <span className="opacity-70 font-bold text-[9px]">Solved</span>
                          </div>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isTop3 && <CircleDollarSign className={`h-4 w-4 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-amber-600'}`} />}
                            <span className={`font-mono text-lg font-black ${
                              index === 0 ? 'text-yellow-400' : 'text-gray-200'
                            }`}>
                              {team.points.toLocaleString()} <span className="text-[10px] text-gray-500 font-sans tracking-widest uppercase">PTS</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
