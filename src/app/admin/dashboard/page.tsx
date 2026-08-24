import { Users, HelpCircle, Gavel, Trophy, TrendingUp, Clock, Zap, Activity, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [totalTeams, totalQuestions, completedAuctions, currentLeader, eventSettings, recentActivities, topTeams] = await Promise.all([
    prisma.team.count(),
    prisma.question.count(),
    prisma.auction.count({ where: { status: 'COMPLETED' } }),
    prisma.team.findFirst({
      orderBy: [
        { points: 'desc' },
        { updatedAt: 'asc' },
      ],
      select: { teamName: true, points: true },
    }),
    prisma.eventSettings.findFirst(),
    prisma.scoreTransaction.findMany({
      take: 8,
      orderBy: { timestamp: 'desc' },
      include: { team: true },
    }),
    prisma.team.findMany({
      take: 5,
      orderBy: { points: 'desc' },
      select: { id: true, teamName: true, points: true, registrationNumber: true, status: true },
    }),
  ]);

  const correctAuctions = await prisma.auction.count({ where: { status: 'COMPLETED', result: 'CORRECT' } });
  const wrongAuctions = await prisma.auction.count({ where: { status: 'COMPLETED', result: 'WRONG' } });
  const activeTeams = await prisma.team.count({ where: { status: 'ACTIVE' } });

  const stats = [
    { title: 'REGISTERED TEAMS', value: totalTeams.toString(), sub: `${activeTeams} active`, icon: Users, color: 'text-blue-400', borderColor: 'border-blue-500/30', bg: 'bg-blue-500/10' },
    { title: 'TOTAL QUESTIONS', value: totalQuestions.toString(), sub: 'in question bank', icon: HelpCircle, color: 'text-purple-400', borderColor: 'border-purple-500/30', bg: 'bg-purple-500/10' },
    { title: 'AUCTIONS COMPLETED', value: completedAuctions.toString(), sub: `${correctAuctions} correct · ${wrongAuctions} wrong`, icon: Gavel, color: 'text-orange-400', borderColor: 'border-orange-500/30', bg: 'bg-orange-500/10' },
    { title: 'CURRENT LEADER', value: currentLeader?.teamName || 'None', sub: currentLeader ? `${currentLeader.points.toLocaleString()} pts` : 'No teams yet', icon: Trophy, color: 'text-yellow-400', borderColor: 'border-yellow-500/30', bg: 'bg-yellow-500/10' },
  ];

  const statusColor = (s: string) => {
    switch (s) {
      case 'ACTIVE': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'WAITING': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'PAUSED': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'FINISHED': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const txTypeIcon = (type: string) => {
    switch (type) {
      case 'AUCTION_WIN': return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'AUCTION_LOSS': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'ADMIN_ADD': return <TrendingUp className="h-4 w-4 text-blue-400" />;
      case 'ADMIN_SUBTRACT': return <TrendingUp className="h-4 w-4 text-orange-400 rotate-180" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Event Status Banner */}
      <div className="glass-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10 rounded-lg">
        <div className="flex items-center gap-4">
          <Zap className="h-7 w-7 text-red-500" />
          <div>
            <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">Event Status</div>
            <div className="text-lg font-bold text-white">{eventSettings?.eventName || 'ELECTROBIT'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold tracking-widest uppercase rounded-full border ${statusColor(eventSettings?.eventStatus || 'WAITING')}`}>
            <span className="relative flex h-2.5 w-2.5">
              {eventSettings?.eventStatus === 'ACTIVE' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                eventSettings?.eventStatus === 'ACTIVE' ? 'bg-green-400' :
                eventSettings?.eventStatus === 'PAUSED' ? 'bg-yellow-400' :
                eventSettings?.eventStatus === 'FINISHED' ? 'bg-red-400' : 'bg-gray-400'
              }`}></span>
            </span>
            {eventSettings?.eventStatus || 'WAITING'}
          </span>
          <Link href="/admin/settings" className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider rounded transition-colors text-gray-300">
            Manage
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className={`glass-card p-6 border ${stat.borderColor} rounded-lg relative overflow-hidden group`}>
              <div className={`absolute top-0 right-0 w-20 h-20 ${stat.bg} blur-2xl rounded-full group-hover:scale-150 transition-transform`}></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-mono tracking-widest uppercase mb-1 relative z-10">{stat.title}</p>
              <h3 className="text-2xl font-black text-white relative z-10 truncate">{stat.value}</h3>
              <p className="text-xs text-gray-500 mt-1 relative z-10">{stat.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="glass-card p-6 border border-white/10 rounded-lg">
          <h3 className="font-bold tracking-wider mb-5 pb-3 border-b border-white/5 text-sm text-gray-300 uppercase">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/auction" className="group flex flex-col items-center gap-2 p-4 bg-red-500/5 hover:bg-red-500/15 text-red-400 transition-colors border border-red-500/10 rounded-lg text-center">
              <Gavel className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wider uppercase">Start Auction</span>
            </Link>
            <Link href="/admin/questions" className="group flex flex-col items-center gap-2 p-4 bg-purple-500/5 hover:bg-purple-500/15 text-purple-400 transition-colors border border-purple-500/10 rounded-lg text-center">
              <HelpCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wider uppercase">Questions</span>
            </Link>
            <Link href="/leaderboard" target="_blank" className="group flex flex-col items-center gap-2 p-4 bg-yellow-500/5 hover:bg-yellow-500/15 text-yellow-400 transition-colors border border-yellow-500/10 rounded-lg text-center">
              <Trophy className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wider uppercase">Leaderboard</span>
            </Link>
            <Link href="/live" target="_blank" className="group flex flex-col items-center gap-2 p-4 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 transition-colors border border-cyan-500/10 rounded-lg text-center">
              <Activity className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold tracking-wider uppercase">Live Screen</span>
            </Link>
          </div>
        </div>

        {/* Top 5 Teams Ranking */}
        <div className="glass-card p-6 border border-white/10 rounded-lg">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
            <h3 className="font-bold tracking-wider text-sm text-gray-300 uppercase">Top Teams</h3>
            <Link href="/admin/teams" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {topTeams.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-6">No teams registered yet.</div>
            ) : (
              topTeams.map((team: any, index: number) => (
                <div key={team.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg group hover:bg-white/[0.05] transition-colors">
                  <div className={`h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center font-mono font-bold text-sm border ${
                    index === 0 ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' :
                    index === 1 ? 'border-gray-400/50 text-gray-300 bg-gray-400/10' :
                    index === 2 ? 'border-amber-600/50 text-amber-500 bg-amber-600/10' :
                    'border-white/10 text-gray-500 bg-white/5'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-white truncate">{team.teamName}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{team.registrationNumber}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold text-sm text-purple-300">{team.points.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500 uppercase">pts</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="glass-card p-6 border border-white/10 rounded-lg">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/5">
            <h3 className="font-bold tracking-wider text-sm text-gray-300 uppercase">Activity Feed</h3>
            <Link href="/admin/scores" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              Full Log <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentActivities.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-6">
                No activity yet. System standing by.
              </div>
            ) : (
              recentActivities.map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-lg hover:bg-white/[0.05] transition-colors">
                  <div className="flex-shrink-0">
                    {txTypeIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs text-gray-200 truncate">{tx.team.teamName}</p>
                    <p className="text-[10px] text-gray-500 truncate">{tx.reason || tx.type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className={`font-mono font-bold text-sm flex-shrink-0 ${
                    tx.type === 'AUCTION_WIN' || tx.type === 'ADMIN_ADD' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'AUCTION_WIN' || tx.type === 'ADMIN_ADD' ? '+' : '-'}{Math.abs(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
