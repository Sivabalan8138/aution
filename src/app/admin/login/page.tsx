'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Lock } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push('/admin/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500 opacity-5 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="glass-card w-full max-w-md p-10 border-t-4 border-red-500 relative z-10 shadow-2xl shadow-red-500/10">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
            <Lock className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-black text-center tracking-widest mb-2 uppercase">Admin Access</h1>
        <p className="text-center text-gray-400 mb-8 text-sm">Secure event control panel</p>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 mb-6 text-sm text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs text-gray-400 mb-2 font-mono uppercase tracking-widest">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/60 border border-white/10 px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-2 font-mono uppercase tracking-widest">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/60 border border-white/10 px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-red-500 text-white font-bold tracking-widest uppercase hover:bg-red-600 transition-colors border border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50 mt-4"
          >
            {loading ? 'Authenticating...' : 'Authorize'}
          </button>
        </form>
      </div>
    </div>
  );
}
