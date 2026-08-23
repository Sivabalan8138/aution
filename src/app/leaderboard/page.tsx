'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Crown, Medal } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface Team {
  id: string;
  teamName: string;
  points: number;
}

export default function LeaderboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Set up Socket.io connection for real-time updates
    const socket = getSocket();
    
    socket.emit('join_room', 'public');
    
    socket.on('leaderboard_updated', () => {
      fetchLeaderboard();
    });
    
    socket.on('score_updated', () => {
      fetchLeaderboard();
    });

    return () => {
      socket.off('leaderboard_updated');
      socket.off('score_updated');
    };
  }, []);

  return (
    <div className="min-h-screen py-20 px-6">
      <div className="container mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-10">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        
        <div className="flex flex-col items-center justify-center mb-16 text-center">
          <Trophy className="h-16 w-16 text-accent mb-6 animate-pulse-glow" />
          <h1 className="text-5xl font-black tracking-widest uppercase text-glow mb-4">LEADERBOARD</h1>
          <p className="text-gray-400 tracking-wider">Top Teams in the Auction Challenge</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4 relative">
            <div className="absolute top-0 bottom-0 left-8 w-px bg-white/10 hidden md:block"></div>
            
            {teams.map((team, index) => {
              let RankIcon = null;
              let rankStyle = "text-gray-400 border-white/10";
              let nameStyle = "text-gray-200";
              let pointStyle = "text-gray-300";
              
              if (index === 0) {
                RankIcon = <Crown className="h-6 w-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />;
                rankStyle = "text-yellow-400 border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.2)]";
                nameStyle = "text-white text-2xl tracking-wider";
                pointStyle = "text-yellow-400 text-3xl font-black text-glow";
              } else if (index === 1) {
                RankIcon = <Medal className="h-6 w-6 text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.8)]" />;
                rankStyle = "text-gray-300 border-gray-300/50 shadow-[0_0_15px_rgba(209,213,219,0.2)]";
                nameStyle = "text-gray-100 text-xl tracking-wider";
                pointStyle = "text-gray-300 text-2xl font-bold";
              } else if (index === 2) {
                RankIcon = <Medal className="h-6 w-6 text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.8)]" />;
                rankStyle = "text-amber-600 border-amber-600/50 shadow-[0_0_15px_rgba(217,119,6,0.2)]";
                nameStyle = "text-gray-200 text-lg tracking-wider";
                pointStyle = "text-amber-600 text-xl font-bold";
              }

              return (
                <div key={team.id} className="relative z-10 glass-card p-6 flex items-center justify-between group hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-6">
                    <div className={`h-12 w-12 md:h-16 md:w-16 rounded-full flex items-center justify-center border-2 bg-black font-mono font-bold text-lg md:text-xl ${rankStyle}`}>
                      {RankIcon || (index + 1)}
                    </div>
                    <div>
                      <h3 className={`font-bold uppercase ${nameStyle}`}>{team.teamName}</h3>
                      {index === 0 && <span className="text-xs text-yellow-400/80 tracking-widest mt-1 block">CURRENT LEADER</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono ${pointStyle}`}>{team.points.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest">Points</div>
                  </div>
                </div>
              );
            })}
            
            {teams.length === 0 && (
              <div className="text-center p-12 glass-card">
                <p className="text-gray-400 uppercase tracking-widest">No teams registered yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
