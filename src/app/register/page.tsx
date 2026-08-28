'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { registerTeam } from './actions';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    const formData = new FormData(event.currentTarget);
    const result = await registerTeam(formData);
    if (result.success) {
      if (result.token) {
        sessionStorage.setItem('team_token', result.token);
        localStorage.setItem('team_token', result.token);
      }
      setSuccessData(result.team);
    } else {
      setError(result.error || 'Something went wrong');
    }
    setLoading(false);
  }

  if (successData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card max-w-lg w-full p-10 text-center border-t-4 border-primary">
          <CheckCircle2 className="h-20 w-20 text-primary mx-auto mb-6 animate-pulse-glow rounded-full" />
          <h2 className="text-3xl font-black mb-2 text-glow">REGISTRATION SUCCESSFUL!</h2>
          <p className="text-gray-400 mb-8">Your team has been successfully registered for the EEE Auction Challenge.</p>
          
          <div className="bg-black/50 p-6 rounded-lg mb-8 electric-border">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <div className="text-xs text-gray-500">TEAM NAME</div>
                <div className="font-bold text-lg text-white">{successData.teamName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">STARTING POINTS</div>
                <div className="font-bold text-lg text-primary">5,000</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">PARTICIPANT 1</div>
                <div className="font-bold text-gray-300">{successData.participant1Name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">PARTICIPANT 2</div>
                <div className="font-bold text-gray-300">{successData.participant2Name}</div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link 
              href="/team/bid" 
              className="w-full sm:w-auto px-8 py-4 bg-primary text-black font-black tracking-widest uppercase text-sm hover:bg-white transition-all shadow-[0_0_30px_rgba(0,229,255,0.3)] rounded-lg text-center"
            >
              Enter Auction Portal →
            </Link>
            <Link 
              href="/" 
              className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all font-bold tracking-widest uppercase text-xs rounded-lg border border-white/10 text-center"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-6">
      <div className="container mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-10">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        
        <div className="glass-card p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-5 blur-[100px] rounded-full pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-8">
            <Zap className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-black tracking-widest uppercase">Team Registration</h1>
          </div>
          
          <p className="text-gray-400 mb-8 pb-8 border-b border-white/10">
            Enter your team details below. No account creation is required. 
            The admin controls the entire event.
          </p>



          <form onSubmit={onSubmit} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold tracking-wider text-primary">Team Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Team Name *</label>
                  <input required name="teamName" type="text" className="w-full bg-black/50 border border-white/10 px-4 py-3 focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Circuit Kings" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">College Name *</label>
                  <input required name="collegeName" type="text" className="w-full bg-black/50 border border-white/10 px-4 py-3 focus:outline-none focus:border-primary transition-colors" placeholder="Your College" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-400 mb-2">Department *</label>
                  <input required name="department" type="text" className="w-full bg-black/50 border border-white/10 px-4 py-3 focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Electrical and Electronics Engineering" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-xl font-bold tracking-wider text-primary">Participants</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Participant 1 Name *</label>
                  <input required name="participant1Name" type="text" className="w-full bg-black/50 border border-white/10 px-4 py-3 focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Participant 2 Name *</label>
                  <input required name="participant2Name" type="text" className="w-full bg-black/50 border border-white/10 px-4 py-3 focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-xl font-bold tracking-wider text-primary">Contact Info</h3>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Address *</label>
                <input required name="email" type="email" className="w-full bg-black/50 border border-white/10 px-4 py-3 focus:outline-none focus:border-primary transition-colors" />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 mt-6 text-sm">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-primary text-black font-bold tracking-widest uppercase hover:bg-white transition-colors electric-border mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Register Team'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
