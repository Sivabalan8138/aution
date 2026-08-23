'use client';

import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  RefreshCw, 
  Play, 
  Pause, 
  Square,
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Trash2, 
  ShieldAlert, 
  Clock, 
  Coins, 
  TrendingUp, 
  Users, 
  HelpCircle, 
  Gavel 
} from 'lucide-react';

interface EventSettingsData {
  id?: string;
  eventName: string;
  eventStatus: 'WAITING' | 'ACTIVE' | 'PAUSED' | 'FINISHED';
  initialPoints: number;
  minBidIncrement: number;
  defaultTimer: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<EventSettingsData>({
    eventName: 'ELECTROBIT | THE EEE AUCTION CHALLENGE',
    eventStatus: 'WAITING',
    initialPoints: 5000,
    minBidIncrement: 100,
    defaultTimer: 30
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Overview stats
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalQuestions: 0,
    completedAuctions: 0
  });

  // Reset modal state
  const [resetModalAction, setResetModalAction] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverviewStats = async () => {
    try {
      const [teamsRes, questionsRes, auctionRes] = await Promise.all([
        fetch('/api/admin/teams'),
        fetch('/api/admin/questions'),
        fetch('/api/admin/auction')
      ]);

      const teamsData = teamsRes.ok ? await teamsRes.json() : [];
      const questionsData = questionsRes.ok ? await questionsRes.json() : [];
      const auctionData = auctionRes.ok ? await auctionRes.json() : null;

      setStats({
        totalTeams: Array.isArray(teamsData) ? teamsData.length : 0,
        totalQuestions: Array.isArray(questionsData) ? questionsData.length : 0,
        completedAuctions: auctionData?.completedAuctionsCount || 0
      });
    } catch (error) {
      console.error('Failed to fetch overview stats:', error);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchOverviewStats();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setSuccessMsg('Settings saved successfully!');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to save settings.');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('An error occurred while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: EventSettingsData['eventStatus']) => {
    const updatedSettings = { ...settings, eventStatus: newStatus };
    setSettings(updatedSettings);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Status change error:', error);
    }
  };

  const handleExecuteReset = async () => {
    if (!resetModalAction) return;
    setResetLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: resetModalAction })
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg(data.message || 'System reset completed successfully.');
        setResetModalAction(null);
        fetchSettings();
        fetchOverviewStats();
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setErrorMsg(data.error || 'Failed to complete reset action.');
      }
    } catch (error: any) {
      setErrorMsg(`Reset error: ${error.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  const getStatusBadge = (status: EventSettingsData['eventStatus']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/40 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-green-400"></span> EVENT LIVE
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
            <Pause className="h-3 w-3" /> PAUSED
          </span>
        );
      case 'FINISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40">
            <CheckCircle2 className="h-3 w-3" /> EVENT FINISHED
          </span>
        );
      case 'WAITING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/40">
            <Clock className="h-3 w-3" /> WAITING / PRE-EVENT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-wide">
            <SettingsIcon className="h-7 w-7 text-purple-400" />
            EVENT & SYSTEM SETTINGS
          </h1>
          <p className="text-sm text-gray-400 mt-1">Configure event rules, bidding steps, starting points, and emergency controls.</p>
        </div>
        <div>
          {getStatusBadge(settings.eventStatus)}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-2 shadow-lg">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Quick Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 border border-white/10 rounded-lg bg-black/40 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{stats.totalTeams}</div>
            <div className="text-xs text-gray-400">Registered Teams</div>
          </div>
        </div>

        <div className="p-5 border border-white/10 rounded-lg bg-black/40 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{stats.totalQuestions}</div>
            <div className="text-xs text-gray-400">Total Questions</div>
          </div>
        </div>

        <div className="p-5 border border-white/10 rounded-lg bg-black/40 flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
            <Gavel className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{stats.completedAuctions}</div>
            <div className="text-xs text-gray-400">Completed Auctions</div>
          </div>
        </div>
      </div>

      {/* Event Master Status Control */}
      <div className="glass-card p-6 border-t-4 border-purple-500 rounded-lg shadow-xl">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Play className="h-5 w-5 text-purple-400" /> Event Status Master Control
        </h3>
        <p className="text-xs text-gray-400 mb-6">Switch the overall state of the live auction challenge across all client screens.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => handleStatusChange('WAITING')}
            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
              settings.eventStatus === 'WAITING'
                ? 'bg-gray-500/20 border-gray-400 text-white font-bold ring-2 ring-gray-400/50'
                : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5'
            }`}
          >
            <Clock className="h-5 w-5 text-gray-400" />
            <span className="text-xs font-mono uppercase tracking-wider">WAITING</span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('ACTIVE')}
            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
              settings.eventStatus === 'ACTIVE'
                ? 'bg-green-500/20 border-green-400 text-green-300 font-bold ring-2 ring-green-400/50 shadow-lg shadow-green-500/20'
                : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5'
            }`}
          >
            <Play className="h-5 w-5 text-green-400" />
            <span className="text-xs font-mono uppercase tracking-wider">LIVE / ACTIVE</span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('PAUSED')}
            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
              settings.eventStatus === 'PAUSED'
                ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 font-bold ring-2 ring-yellow-400/50'
                : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5'
            }`}
          >
            <Pause className="h-5 w-5 text-yellow-400" />
            <span className="text-xs font-mono uppercase tracking-wider">PAUSED</span>
          </button>

          <button
            type="button"
            onClick={() => handleStatusChange('FINISHED')}
            className={`p-4 border rounded-lg flex flex-col items-center gap-2 transition-all ${
              settings.eventStatus === 'FINISHED'
                ? 'bg-blue-500/20 border-blue-400 text-blue-300 font-bold ring-2 ring-blue-400/50'
                : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5'
            }`}
          >
            <Square className="h-5 w-5 text-blue-400" />
            <span className="text-xs font-mono uppercase tracking-wider">FINISHED</span>
          </button>
        </div>
      </div>

      {/* Main Configuration Form */}
      <form onSubmit={handleSaveSettings} className="glass-card p-6 border-t-4 border-purple-500 rounded-lg shadow-xl space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Coins className="h-5 w-5 text-purple-400" /> Auction & Bidding Rules Configuration
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Event Title</label>
            <input 
              type="text" 
              required
              value={settings.eventName}
              onChange={(e) => setSettings({ ...settings, eventName: e.target.value })}
              className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm text-white rounded focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-purple-400" /> Starting Team Points
              </label>
              <input 
                type="number" 
                required
                min={100}
                value={settings.initialPoints}
                onChange={(e) => setSettings({ ...settings, initialPoints: parseInt(e.target.value) || 5000 })}
                className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm text-white rounded focus:outline-none focus:border-purple-500 transition-colors font-mono"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">Default initial purse allocated to new teams.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-purple-400" /> Min Bid Step (Pts)
              </label>
              <input 
                type="number" 
                required
                min={10}
                value={settings.minBidIncrement}
                onChange={(e) => setSettings({ ...settings, minBidIncrement: parseInt(e.target.value) || 100 })}
                className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm text-white rounded focus:outline-none focus:border-purple-500 transition-colors font-mono"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">Minimum increment over previous bid.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-purple-400" /> Default Question Timer (s)
              </label>
              <input 
                type="number" 
                required
                min={10}
                value={settings.defaultTimer}
                onChange={(e) => setSettings({ ...settings, defaultTimer: parseInt(e.target.value) || 30 })}
                className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm text-white rounded focus:outline-none focus:border-purple-500 transition-colors font-mono"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">Default timer length for new questions.</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/5">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white hover:bg-purple-700 transition-colors border border-purple-400 font-bold text-sm rounded shadow-lg shadow-purple-500/20 uppercase"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </button>
        </div>
      </form>

      {/* Danger Zone & System Reset Controls */}
      <div className="p-6 border border-red-500/30 bg-red-950/10 rounded-lg shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-red-500" /> Emergency System Reset & Maintenance
        </h3>
        <p className="text-xs text-red-300/80">
          Caution: These reset actions modify team points and auction logs permanently. Use only before or after an event run.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <button
            type="button"
            onClick={() => setResetModalAction('RESET_SCORES')}
            className="flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold uppercase rounded transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Reset Team Scores
          </button>

          <button
            type="button"
            onClick={() => setResetModalAction('CLEAR_AUCTIONS')}
            className="flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold uppercase rounded transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Clear Auction Bids & Logs
          </button>

          <button
            type="button"
            onClick={() => setResetModalAction('FULL_RESET')}
            className="flex items-center justify-center gap-2 p-3 bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500 text-xs font-extrabold uppercase rounded transition-colors shadow-lg"
          >
            <ShieldAlert className="h-4 w-4" /> Full System Hard Reset
          </button>
        </div>
      </div>

      {/* Confirmation Reset Modal */}
      {resetModalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 border-t-4 border-red-500 rounded-lg shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Confirm System Action</h3>
            </div>

            <p className="text-sm text-gray-300">
              {resetModalAction === 'RESET_SCORES' && `Are you sure you want to reset all team points back to ${settings.initialPoints} pts?`}
              {resetModalAction === 'CLEAR_AUCTIONS' && 'Are you sure you want to delete all bids, completed auctions, and score transaction logs?'}
              {resetModalAction === 'FULL_RESET' && `Are you sure you want to perform a FULL RESET? This will clear all bids, wipe transaction history, reset team points to ${settings.initialPoints} pts, and set the event state to WAITING.`}
            </p>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setResetModalAction(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold uppercase rounded border border-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={resetLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase rounded border border-red-500 flex items-center justify-center gap-2"
              >
                {resetLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Confirm & Execute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
