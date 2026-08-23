'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import {
  Search, Edit2, Ban, CheckCircle, Trash2, ShieldAlert,
  RefreshCw, Trophy, Users, AlertTriangle, X, Plus, Minus, Download
} from 'lucide-react';

interface Team {
  id: string;
  registrationNumber: string;
  teamName: string;
  participant1Name: string;
  participant2Name: string;
  collegeName: string;
  department: string;
  phone: string;
  email: string;
  points: number;
  status: string;
}

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
};

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyIds, setBusyIds] = useState<string[]>([]);

  // Score Adjust Modal
  const [scoreModal, setScoreModal] = useState<Team | null>(null);
  const [scoreChange, setScoreChange] = useState('');
  const [scoreReason, setScoreReason] = useState('');
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState('');

  // Detail Expand
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState<ConfirmAction | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3500);
  };

  const showConfirm = (action: ConfirmAction) => setConfirmModal(action);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
        setSelectedIds([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadWinnersCSV = () => {
    if (teams.length === 0) {
      showToast('No teams to export', 'error');
      return;
    }
    // Build CSV content
    const headers = ['Rank', 'Team Name', 'Reg Number', 'Participant 1', 'Participant 2', 'College', 'Department', 'Points', 'Phone', 'Email', 'Status'];
    const rows = teams.map((t, idx) => [
      idx + 1,
      `"${t.teamName.replace(/"/g, '""')}"`,
      `"${t.registrationNumber.replace(/"/g, '""')}"`,
      `"${t.participant1Name.replace(/"/g, '""')}"`,
      `"${t.participant2Name.replace(/"/g, '""')}"`,
      `"${t.collegeName.replace(/"/g, '""')}"`,
      `"${t.department.replace(/"/g, '""')}"`,
      t.points,
      `"${t.phone.replace(/"/g, '""')}"`,
      `"${t.email.replace(/"/g, '""')}"`,
      t.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'electrobit_overall_winners.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Leaderboard exported successfully!');
  };

  useEffect(() => { fetchTeams(); }, []);

  const filteredTeams = teams.filter(t =>
    t.teamName.toLowerCase().includes(search.toLowerCase()) ||
    t.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
    t.participant1Name?.toLowerCase().includes(search.toLowerCase()) ||
    t.participant2Name?.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = filteredTeams.length > 0 && selectedIds.length === filteredTeams.length;

  // ── Status Toggle ──────────────────────────────────────────────────────────
  const handleStatusToggle = async (team: Team) => {
    const newStatus = team.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setBusyIds(p => [...p, team.id]);
    try {
      await fetch(`/api/admin/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchTeams();
      showToast(`${team.teamName} ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'}`, 'success');
    } catch { showToast('Failed to toggle status', 'error'); }
    finally { setBusyIds(p => p.filter(id => id !== team.id)); }
  };

  // ── Single Delete ──────────────────────────────────────────────────────────
  const handleDelete = (team: Team) => {
    showConfirm({
      title: 'Delete Team',
      description: `Are you sure you want to delete "${team.teamName}"? All their bids and score history will also be removed. This cannot be undone.`,
      confirmLabel: 'Delete Team',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: async () => {
        setBusyIds(p => [...p, team.id]);
        try {
          const res = await fetch(`/api/admin/teams/${team.id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchTeams();
            showToast(`${team.teamName} deleted.`, 'success');
          } else {
            const err = await res.json();
            showToast(err.error || 'Failed to delete', 'error');
          }
        } catch { showToast('Network error', 'error'); }
        finally { setBusyIds(p => p.filter(id => id !== team.id)); }
      }
    });
  };

  // ── Bulk Delete ─────────────────────────────────────────────────────────────
  const handleDeleteSelected = () => {
    if (!selectedIds.length) return;
    showConfirm({
      title: `Delete ${selectedIds.length} Teams`,
      description: `This will permanently delete the ${selectedIds.length} selected team(s) and all their associated data. This cannot be undone.`,
      confirmLabel: `Delete ${selectedIds.length} Teams`,
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/teams', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds })
          });
          if (res.ok) {
            fetchTeams();
            showToast(`${selectedIds.length} team(s) deleted.`, 'success');
          } else {
            const err = await res.json();
            showToast(err.error || 'Failed to delete', 'error');
          }
        } catch { showToast('Network error', 'error'); }
      }
    });
  };

  // ── Delete All ──────────────────────────────────────────────────────────────
  const handleDeleteAll = () => {
    showConfirm({
      title: '⚠ Delete ALL Teams',
      description: `You are about to permanently delete ALL ${teams.length} teams and their complete data. This is irreversible. Are you absolutely sure?`,
      confirmLabel: 'Delete Everything',
      confirmClass: 'bg-red-700 hover:bg-red-800 text-white font-black',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/teams', { method: 'DELETE' });
          if (res.ok) {
            fetchTeams();
            showToast('All teams deleted.', 'success');
          } else {
            const err = await res.json();
            showToast(err.error || 'Failed to delete all', 'error');
          }
        } catch { showToast('Network error', 'error'); }
      }
    });
  };

  // ── Score Adjust ────────────────────────────────────────────────────────────
  const handleScoreAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreModal) return;
    setScoreError('');
    const diff = parseInt(scoreChange);
    if (isNaN(diff) || diff === 0) { setScoreError('Enter a non-zero number (e.g. 200 or -100)'); return; }
    const newPoints = scoreModal.points + diff;
    if (newPoints < 0) { setScoreError(`Result would be negative (${newPoints} pts). Reduce the deduction.`); return; }

    setScoreLoading(true);
    try {
      const res = await fetch(`/api/admin/teams/${scoreModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: newPoints, reason: scoreReason || 'Manual Admin Adjustment' })
      });
      if (res.ok) {
        setScoreModal(null);
        setScoreChange('');
        setScoreReason('');
        fetchTeams();
        showToast(`Score adjusted by ${diff > 0 ? '+' : ''}${diff} for ${scoreModal.teamName}`, 'success');
      } else {
        const err = await res.json();
        setScoreError(err.error || 'Failed to adjust score');
      }
    } catch { setScoreError('Network error'); }
    finally { setScoreLoading(false); }
  };

  const previewScore = scoreModal ? scoreModal.points + (parseInt(scoreChange) || 0) : 0;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg font-semibold text-sm shadow-2xl border ${
          toast.type === 'success' ? 'bg-green-950 text-green-300 border-green-500/50' : 'bg-red-950 text-red-300 border-red-500/50'
        }`}>{toast.msg}</div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 border-t-4 border-red-500 rounded-lg shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-lg text-white">{confirmModal.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{confirmModal.description}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold uppercase rounded">
                Cancel
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className={`flex-1 py-2.5 text-sm font-bold uppercase rounded ${confirmModal.confirmClass}`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, reg, or participant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/50 border border-white/10 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition-colors rounded"
            />
          </div>
          <button onClick={fetchTeams} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {teams.length > 0 && selectedIds.length === 0 && (
            <button
              onClick={downloadWinnersCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-950/60 text-purple-300 border border-purple-500/50 hover:bg-purple-900/60 rounded text-xs font-bold uppercase tracking-wider transition-colors"
              title="Download Overall Standings"
            >
              <Download className="h-3.5 w-3.5" /> Export Winners
            </button>
          )}
          <span className="text-xs font-mono text-gray-500 hidden sm:block">
            <Users className="h-3.5 w-3.5 inline mr-1" />{teams.length} teams
          </span>
          {selectedIds.length > 0 ? (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/80 hover:bg-red-600 text-white border border-red-500 rounded text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedIds.length})
            </button>
          ) : (
            teams.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Delete All
              </button>
            )
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-white/10 rounded-lg bg-black/40 shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-4 border-b border-white/5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(filteredTeams.map(t => t.id));
                    else setSelectedIds([]);
                  }}
                  className="rounded border-white/10 bg-black/60 cursor-pointer"
                />
              </th>
              <th className="px-4 py-4 border-b border-white/5 w-10 text-center">#</th>
              <th className="px-6 py-4 border-b border-white/5">Team</th>
              <th className="px-6 py-4 border-b border-white/5">Reg No</th>
              <th className="px-6 py-4 border-b border-white/5 text-right">Points</th>
              <th className="px-6 py-4 border-b border-white/5">Status</th>
              <th className="px-6 py-4 border-b border-white/5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-red-400" />
                  Loading teams...
                </td>
              </tr>
            ) : filteredTeams.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  {search ? 'No teams match your search.' : 'No teams registered yet.'}
                </td>
              </tr>
            ) : (
              filteredTeams.map((team, index) => {
                const isSelected = selectedIds.includes(team.id);
                const isBusy = busyIds.includes(team.id);
                const isExpanded = expandedId === team.id;
                const rank = index + 1;

                return (
                  <Fragment key={team.id}>
                    <tr
                      className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${isSelected ? 'bg-red-950/20' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : team.id)}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(p => [...p, team.id]);
                            else setSelectedIds(p => p.filter(id => id !== team.id));
                          }}
                          className="rounded border-white/10 bg-black/60 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-mono text-sm font-bold ${
                          rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-500' : 'text-gray-600'
                        }`}>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-100">{team.teamName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{team.participant1Name} & {team.participant2Name}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-400 text-sm">{team.registrationNumber}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono font-black text-xl text-primary">{team.points.toLocaleString()}</span>
                        <div className="text-[10px] text-gray-600 uppercase">pts</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          team.status === 'ACTIVE'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {team.status === 'ACTIVE' ? <CheckCircle className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                          {team.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setScoreModal(team); setScoreChange(''); setScoreReason(''); setScoreError(''); }}
                            className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                            title="Adjust Score"
                            disabled={isBusy}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusToggle(team)}
                            disabled={isBusy}
                            className={`p-2 rounded transition-colors ${
                              team.status === 'ACTIVE'
                                ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            } disabled:opacity-50`}
                            title={team.status === 'ACTIVE' ? 'Disable Team' : 'Enable Team'}
                          >
                            {isBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : team.status === 'ACTIVE' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(team)}
                            disabled={isBusy}
                            className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                            title="Delete Team"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-white/[0.01]">
                        <td colSpan={7} className="px-8 py-4">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                              <div className="text-gray-500 uppercase tracking-widest mb-1">College</div>
                              <div className="text-gray-200 font-medium">{team.collegeName || '—'}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 uppercase tracking-widest mb-1">Department</div>
                              <div className="text-gray-200 font-medium">{team.department || '—'}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 uppercase tracking-widest mb-1">Phone</div>
                              <div className="text-gray-200 font-medium">{team.phone || '—'}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 uppercase tracking-widest mb-1">Email</div>
                              <div className="text-gray-200 font-medium">{team.email || '—'}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Score Adjust Modal */}
      {scoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 border-t-4 border-blue-500 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-black text-white">Adjust Score</h2>
                <p className="text-sm text-gray-400 mt-0.5">{scoreModal.teamName}</p>
              </div>
              <button onClick={() => setScoreModal(null)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Current & Preview */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 mb-5">
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase mb-1">Current</div>
                <div className="text-2xl font-mono font-black text-gray-300">{scoreModal.points.toLocaleString()}</div>
              </div>
              <div className="text-gray-500">→</div>
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase mb-1">After Adjust</div>
                <div className={`text-2xl font-mono font-black ${
                  previewScore > scoreModal.points ? 'text-green-400' : previewScore < scoreModal.points ? 'text-red-400' : 'text-gray-300'
                }`}>
                  {previewScore < 0 ? '⚠ ' : ''}{previewScore.toLocaleString()}
                </div>
              </div>
            </div>

            <form onSubmit={handleScoreAdjust} className="space-y-4">
              {/* Quick presets */}
              <div className="grid grid-cols-4 gap-2">
                {[100, 200, 500, 1000].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setScoreChange(String(v))}
                    className="py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded text-xs font-bold transition-colors"
                  >
                    <Plus className="h-3 w-3 inline" />{v}
                  </button>
                ))}
                {[100, 200, 500, 1000].map(v => (
                  <button
                    key={-v}
                    type="button"
                    onClick={() => setScoreChange(String(-v))}
                    className="py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded text-xs font-bold transition-colors"
                  >
                    <Minus className="h-3 w-3 inline" />{v}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 uppercase font-mono tracking-widest">Custom Amount (+/-)</label>
                <input
                  type="number"
                  required
                  value={scoreChange}
                  onChange={(e) => setScoreChange(e.target.value)}
                  placeholder="e.g. 500 or -200"
                  className="w-full bg-black/60 border border-white/10 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors rounded text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 uppercase font-mono tracking-widest">Reason (Required)</label>
                <input
                  type="text"
                  required
                  value={scoreReason}
                  onChange={(e) => setScoreReason(e.target.value)}
                  placeholder="e.g. Bonus round, penalty for rules violation"
                  className="w-full bg-black/60 border border-white/10 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors rounded text-white"
                />
              </div>

              {scoreError && (
                <div className="p-3 bg-red-950 border border-red-500/30 text-red-400 text-xs rounded flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> {scoreError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setScoreModal(null)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-sm font-bold uppercase">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scoreLoading || previewScore < 0}
                  className="flex-1 py-3 bg-blue-500 text-white hover:bg-blue-600 transition-colors border border-blue-400/50 text-sm font-bold uppercase rounded flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {scoreLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                  Apply Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
