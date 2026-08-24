'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Users, ArrowRight, UserPlus, RefreshCw } from 'lucide-react';

interface Team {
  id: string;
  teamName: string;
  collegeName: string;
  department: string;
  status: string;
}

export default function TeamLogin() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingTeams, setFetchingTeams] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadTeams() {
      try {
        const res = await fetch('/api/admin/teams');
        if (res.ok) {
          const data: Team[] = await res.json();
          const activeTeams = data.filter(t => t.status === 'ACTIVE');
          setTeams(activeTeams);
          if (activeTeams.length > 0) {
            setSelectedTeamId(activeTeams[0].id);
          }
        }
      } catch {
        console.error('Failed to load teams');
      } finally {
        setFetchingTeams(false);
      }
    }
    loadTeams();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setError('Please select a team to continue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/team/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: selectedTeamId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          sessionStorage.setItem('team_token', data.token);
          localStorage.setItem('team_token', data.token);
        }
        router.push('/team/bid');
      } else {
        const data = await res.json();
        setError(data.error || 'Team login failed');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#050505]">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-black to-black pointer-events-none" />

      <div className="glass-card w-full max-w-md p-10 border-t-4 border-primary relative z-10 shadow-2xl shadow-primary/10">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30 animate-pulse-glow">
            <Zap className="h-8 w-8 text-primary" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-center tracking-widest mb-1 uppercase text-glow">
          ELECTROBIT
        </h1>
        <p className="text-center text-gray-400 mb-8 text-sm tracking-widest uppercase">Team Bidding Portal</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 mb-6 text-sm text-center rounded">
            {error}
          </div>
        )}

        {fetchingTeams ? (
          <div className="py-12 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            Loading registered teams...
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-gray-400 text-sm">No registered teams found yet.</p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-white transition-all"
            >
              <UserPlus className="h-4 w-4" /> Register New Team
            </Link>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-mono uppercase tracking-widest">
                <Users className="h-3.5 w-3.5 inline mr-1 text-primary" /> Select Your Team
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full bg-black/60 border border-white/10 px-4 py-3 focus:outline-none focus:border-primary transition-colors text-white font-mono text-sm rounded cursor-pointer"
                required
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id} className="bg-black text-white">
                    {t.teamName} ({t.collegeName || 'EEE'})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">Select your team name to enter the bidding screen</p>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedTeamId}
              className="w-full py-4 bg-primary text-black font-black tracking-widest uppercase hover:bg-white transition-colors electric-border disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Enter Auction <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="pt-4 border-t border-white/5 text-center">
              <Link href="/register" className="text-xs text-gray-500 hover:text-primary transition-colors inline-flex items-center gap-1 font-mono">
                <UserPlus className="h-3.5 w-3.5" /> Need to register a new team?
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
