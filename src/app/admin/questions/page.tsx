'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileJson, 
  X, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';

interface Question {
  id: string;
  text: string;
  answer: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_CHALLENGE';
  basePoints: number;
  timeLimit: number;
  category?: string;
  createdAt?: string;
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Confirm Modal & Toast
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    confirmClass: string;
    onConfirm: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3500);
  };

  // Add/Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    text: '',
    answer: '',
    difficulty: 'EASY',
    basePoints: 100,
    timeLimit: 30,
    category: ''
  });

  // Bulk Upload Modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [parseFileName, setParseFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ count?: number; errors?: string[] } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/questions');
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/admin/questions/${editingId}` : '/api/admin/questions';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setModalOpen(false);
        fetchQuestions();
        showToast(editingId ? 'Question updated successfully!' : 'Question added successfully!');
      } else {
        showToast('Failed to save question.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('An error occurred while saving.', 'error');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      title: 'Delete Question',
      description: 'Are you sure you want to delete this question? Any related auction history for this question will also be removed. This cannot be undone.',
      confirmLabel: 'Delete Question',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: async () => {
        setDeletingId(id);
        try {
          const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setSelectedIds(prev => prev.filter(item => item !== id));
            fetchQuestions();
            showToast('Question deleted successfully!');
          } else {
            const err = await res.json();
            showToast(err.error || 'Failed to delete question.', 'error');
          }
        } catch (error) {
          console.error(error);
          showToast('An error occurred while deleting question.', 'error');
        } finally {
          setDeletingId(null);
        }
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      title: `Delete ${selectedIds.length} Questions`,
      description: `Are you sure you want to delete the ${selectedIds.length} selected question(s)? Any related auction records will also be removed. This cannot be undone.`,
      confirmLabel: `Delete ${selectedIds.length} Questions`,
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
      onConfirm: async () => {
        setIsBulkDeleting(true);
        try {
          let successCount = 0;
          for (const id of selectedIds) {
            const res = await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
            if (res.ok) successCount++;
          }
          setSelectedIds([]);
          fetchQuestions();
          showToast(`Successfully deleted ${successCount} question(s)!`);
        } catch (error) {
          console.error('Bulk delete error:', error);
          showToast('An error occurred during bulk deletion.', 'error');
        } finally {
          setIsBulkDeleting(false);
        }
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(q => q.id));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // CSV/JSON parsing
  const parseCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length === 0) return [];

    const parseRow = (rowStr: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"') {
          if (inQuotes && rowStr[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseRow(lines[i]);
      if (values.length < 2) continue;
      const item: Record<string, string> = {};
      headers.forEach((h, index) => {
        item[h] = values[index] !== undefined ? values[index] : '';
      });

      const text = item['text'] || item['question'] || item['questiontext'] || values[0] || '';
      const answer = item['answer'] || item['correctanswer'] || values[1] || '';
      const difficulty = item['difficulty'] || values[2] || 'EASY';
      const basePoints = item['basepoints'] || item['points'] || values[3] || '100';
      const timeLimit = item['timelimit'] || item['timer'] || values[4] || '30';
      const category = item['category'] || values[5] || 'General';

      if (text && answer) {
        rows.push({
          text,
          answer,
          difficulty,
          basePoints: parseInt(basePoints, 10) || 100,
          timeLimit: parseInt(timeLimit, 10) || 30,
          category
        });
      }
    }
    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseFileName(file.name);
    setParseError('');
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          const arrayData = Array.isArray(parsed) ? parsed : (parsed.questions || []);
          if (!Array.isArray(arrayData) || arrayData.length === 0) {
            setParseError('JSON file does not contain a valid array of questions.');
            setParsedQuestions([]);
          } else {
            setParsedQuestions(arrayData);
          }
        } else {
          // Assume CSV format
          const rows = parseCSV(content);
          if (rows.length === 0) {
            setParseError('CSV file is empty or could not be parsed. Please verify formatting.');
            setParsedQuestions([]);
          } else {
            setParsedQuestions(rows);
          }
        }
      } catch (err: any) {
        setParseError(`Failed to parse file: ${err.message}`);
        setParsedQuestions([]);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmitBulk = async () => {
    if (parsedQuestions.length === 0) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const res = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedQuestions)
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult({ count: data.count, errors: data.errors });
        fetchQuestions();
        setParsedQuestions([]);
        setParseFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setParseError(data.error || 'Failed to bulk upload questions.');
        if (data.errors) setUploadResult({ errors: data.errors });
      }
    } catch (error: any) {
      setParseError(`Upload error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Download Templates
  const downloadCSVTemplate = () => {
    const csvContent = 
`text,answer,difficulty,basePoints,timeLimit,category
"What is Ohm's Law formula?","V = I * R",EASY,100,30,"Basic Electronics"
"What is the formula for synchronous speed in a 3-phase induction motor?","120f/P",HARD,500,45,"Electrical Machines"
"Which theorem states that any linear bilateral network can be replaced by an equivalent circuit?","Thevenin's Theorem",MEDIUM,300,30,"Circuit Theory"
"Describe the operation of a boost converter and provide the output voltage formula.","Output Voltage = Input Voltage / (1 - Duty Cycle)",SUPER_CHALLENGE,1000,60,"Power Electronics"`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'electrobid_questions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSONTemplate = () => {
    const sample = [
      {
        text: "What is Ohm's Law formula?",
        answer: "V = I * R",
        difficulty: "EASY",
        basePoints: 100,
        timeLimit: 30,
        category: "Basic Electronics"
      },
      {
        text: "What is the formula for synchronous speed in a 3-phase induction motor?",
        answer: "120f/P",
        difficulty: "HARD",
        basePoints: 500,
        timeLimit: 45,
        category: "Electrical Machines"
      },
      {
        text: "Which theorem states that any linear bilateral network can be replaced by an equivalent circuit?",
        answer: "Thevenin's Theorem",
        difficulty: "MEDIUM",
        basePoints: 300,
        timeLimit: 30,
        category: "Circuit Theory"
      },
      {
        text: "Describe the operation of a boost converter and provide the output voltage formula.",
        answer: "Output Voltage = Input Voltage / (1 - Duty Cycle)",
        difficulty: "SUPER_CHALLENGE",
        basePoints: 1000,
        timeLimit: 60,
        category: "Power Electronics"
      }
    ];

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'electrobid_questions_template.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = questions.filter(q => 
    q.text.toLowerCase().includes(search.toLowerCase()) || 
    q.answer.toLowerCase().includes(search.toLowerCase()) ||
    (q.category && q.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search questions by text, answer, or category..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/50 border border-white/10 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors rounded"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/80 text-white hover:bg-red-600 transition-colors border border-red-500 font-medium text-sm rounded"
            >
              <Trash2 className="h-4 w-4" /> Delete ({selectedIds.length})
            </button>
          )}

          <button 
            onClick={() => {
              setParseError('');
              setUploadResult(null);
              setParsedQuestions([]);
              setParseFileName('');
              setBulkModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-950/60 text-purple-300 border border-purple-500/50 hover:bg-purple-900/60 transition-colors font-medium text-sm rounded"
          >
            <Upload className="h-4 w-4" /> BULK UPLOAD
          </button>

          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ text: '', answer: '', difficulty: 'EASY', basePoints: 100, timeLimit: 30, category: '' });
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 transition-colors border border-purple-400 font-medium text-sm rounded shadow-lg shadow-purple-500/20"
          >
            <Plus className="h-4 w-4" /> ADD QUESTION
          </button>
        </div>
      </div>

      {/* Main Questions Table */}
      <div className="overflow-x-auto border border-white/10 rounded-lg bg-black/40 shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-gray-400 font-mono text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-4 border-b border-white/5 w-10 text-center">
                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                  {filtered.length > 0 && selectedIds.length === filtered.length ? (
                    <CheckSquare className="h-4 w-4 text-purple-400" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-4 border-b border-white/5">Question</th>
              <th className="px-6 py-4 border-b border-white/5">Answer</th>
              <th className="px-6 py-4 border-b border-white/5">Difficulty & Points</th>
              <th className="px-6 py-4 border-b border-white/5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-400" />
                  Loading questions...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No questions found. Click <strong className="text-purple-400">+ ADD QUESTION</strong> or <strong className="text-purple-400">BULK UPLOAD</strong> to add questions.
                </td>
              </tr>
            ) : (
              filtered.map((q) => {
                const isSelected = selectedIds.includes(q.id);
                return (
                  <tr key={q.id} className={`hover:bg-white/[0.02] transition-colors ${isSelected ? 'bg-purple-950/20' : ''}`}>
                    <td className="px-4 py-4 text-center">
                      <button onClick={() => toggleSelectId(q.id)} className="text-gray-400 hover:text-white">
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-purple-400" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <div className="font-medium text-gray-200 line-clamp-2" title={q.text}>{q.text}</div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        {q.category && <span className="bg-white/5 px-2 py-0.5 rounded text-gray-400 border border-white/5">{q.category}</span>}
                        <span>Timer: {q.timeLimit}s</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-green-400 font-bold">{q.answer}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded mb-1 ${
                        q.difficulty === 'EASY' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        q.difficulty === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                        q.difficulty === 'HARD' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                        'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {q.difficulty}
                      </span>
                      <div className="text-xs text-gray-400 font-mono">{q.basePoints} pts</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingId(q.id);
                            setFormData({
                              text: q.text,
                              answer: q.answer,
                              difficulty: q.difficulty,
                              basePoints: q.basePoints,
                              timeLimit: q.timeLimit,
                              category: q.category || ''
                            });
                            setModalOpen(true);
                          }}
                          className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                          title="Edit Question"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(q.id)}
                          disabled={deletingId === q.id}
                          className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                          title="Delete Question"
                        >
                          {deletingId === q.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Upload Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card max-w-3xl w-full p-6 border-t-4 border-purple-500 max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl relative">
            <button 
              onClick={() => setBulkModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <Upload className="h-6 w-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Bulk Import Questions</h2>
            </div>
            
            <p className="text-sm text-gray-400 mb-6">
              Upload a <strong>CSV</strong> or <strong>JSON</strong> file containing multiple questions. You can download the sample templates below to check format requirements.
            </p>

            {/* Template Download Section */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-200">Need an import template?</h4>
                <p className="text-xs text-gray-400">Download formatted CSV or JSON templates with sample questions.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={downloadCSVTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 text-xs font-semibold rounded transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4" /> CSV Template
                </button>
                <button 
                  onClick={downloadJSONTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 text-xs font-semibold rounded transition-colors"
                >
                  <FileJson className="h-4 w-4" /> JSON Template
                </button>
              </div>
            </div>

            {/* File Selector */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-300 uppercase mb-2">Select File (.csv or .json)</label>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv, .json"
                onChange={handleFileChange}
                className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm text-gray-300 rounded focus:outline-none focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
              />
              {parseFileName && (
                <div className="mt-2 text-xs text-purple-300 font-mono">Loaded file: {parseFileName}</div>
              )}
            </div>

            {/* Parse Error Display */}
            {parseError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>{parseError}</div>
              </div>
            )}

            {/* Upload Result Notification */}
            {uploadResult && (
              <div className="mb-6 space-y-2">
                {uploadResult.count !== undefined && (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>Successfully imported <strong>{uploadResult.count}</strong> question(s)!</span>
                  </div>
                )}
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-lg text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" /> Import Warnings ({uploadResult.errors.length}):
                    </div>
                    <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                      {uploadResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Preview Table */}
            {parsedQuestions.length > 0 && (
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-xs text-gray-300">
                  <span className="font-semibold text-purple-400">Preview Parsed Questions ({parsedQuestions.length})</span>
                  <span>Ready to import</span>
                </div>
                <div className="max-h-60 overflow-y-auto border border-white/10 rounded bg-black/40 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 font-mono uppercase sticky top-0 bg-black">
                      <tr>
                        <th className="p-2 border-b border-white/10">#</th>
                        <th className="p-2 border-b border-white/10">Question</th>
                        <th className="p-2 border-b border-white/10">Answer</th>
                        <th className="p-2 border-b border-white/10">Difficulty</th>
                        <th className="p-2 border-b border-white/10">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsedQuestions.slice(0, 15).map((q, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="p-2 text-gray-500">{idx + 1}</td>
                          <td className="p-2 font-medium text-gray-200 truncate max-w-xs">{q.text}</td>
                          <td className="p-2 text-green-400 truncate max-w-xs">{q.answer}</td>
                          <td className="p-2 text-purple-300">{q.difficulty || 'EASY'}</td>
                          <td className="p-2 text-gray-400">{q.basePoints || 100}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedQuestions.length > 15 && (
                    <div className="p-2 text-center text-gray-500 text-xs italic bg-white/[0.02]">
                      ...and {parsedQuestions.length - 15} more question(s)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <button 
                type="button" 
                onClick={() => setBulkModalOpen(false)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-sm font-bold uppercase rounded text-gray-300"
              >
                Close
              </button>
              <button 
                type="button" 
                onClick={handleSubmitBulk}
                disabled={uploading || parsedQuestions.length === 0}
                className="flex-1 py-2.5 bg-purple-600 text-white hover:bg-purple-700 transition-colors border border-purple-500 text-sm font-bold uppercase rounded flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Import {parsedQuestions.length} Questions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card max-w-2xl w-full p-6 border-t-4 border-purple-500 max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl relative">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold mb-6 text-white">{editingId ? 'Edit Question' : 'Add Question'}</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Question Text</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.text}
                  onChange={(e) => setFormData({...formData, text: e.target.value})}
                  className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors rounded text-white"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Correct Answer</label>
                <input 
                  type="text" 
                  required
                  value={formData.answer}
                  onChange={(e) => setFormData({...formData, answer: e.target.value})}
                  className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors rounded text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Difficulty</label>
                  <select 
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                    className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white rounded"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                    <option value="SUPER_CHALLENGE">SUPER CHALLENGE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Base Points</label>
                  <input 
                    type="number" 
                    required
                    value={formData.basePoints}
                    onChange={(e) => setFormData({...formData, basePoints: parseInt(e.target.value) || 0})}
                    className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors rounded text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Category</label>
                  <input 
                    type="text" 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="e.g. Electrical Machines"
                    className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase">Timer (Seconds)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({...formData, timeLimit: parseInt(e.target.value) || 30})}
                    className="w-full bg-black/60 border border-white/10 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors rounded text-white"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 text-sm font-bold uppercase rounded text-gray-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-purple-600 text-white hover:bg-purple-700 transition-colors border border-purple-500 text-sm font-bold uppercase rounded shadow-lg shadow-purple-500/20"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg font-semibold text-sm shadow-2xl border transition-all ${
          toast.type === 'success' ? 'bg-green-950 text-green-300 border-green-500/50' : 'bg-red-950 text-red-300 border-red-500/50'
        }`}>{toast.msg}</div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 border-t-4 border-purple-500 rounded-lg shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-lg text-white">{confirmModal.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{confirmModal.description}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold uppercase rounded text-gray-300">
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
    </div>
  );
}
