import React, { useEffect, useState } from "react";
import {
  fetchQuestions,
  createQuestion,
  updateQuestion,
  patchQuestion,
  deleteQuestion,
  SystemQuestion,
  PaginatedQuestions
} from "../lib/api";
import { useAuth } from "../state/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Edit2, Trash2, CheckCircle, XCircle, 
  Terminal, Database, Loader2, ChevronLeft, ChevronRight,
  MoreVertical, Save, X, Hash, MessageSquare, Tag
} from "lucide-react";

export default function QuestionManagement() {
  const { token } = useAuth();
  const [data, setData] = useState<PaginatedQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SystemQuestion>>({});
  
  const [newQuestion, setNewQuestion] = useState<Partial<SystemQuestion>>({
    text: "",
    tags: "",
    is_active: 1
  });

  const loadQuestions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchQuestions(token, page, 8);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [token, page]);

  const handleCreate = async () => {
    if (!token || !newQuestion.text) return;
    try {
      await createQuestion(token, newQuestion);
      setNewQuestion({ text: "", tags: "", is_active: 1 });
      setIsAdding(false);
      loadQuestions();
    } catch (err) {
      alert("Failed to create question");
    }
  };

  const startEdit = (q: SystemQuestion) => {
    setEditingId(q.id);
    setEditForm({ text: q.text, tags: q.tags || "", is_active: q.is_active });
  };

  const handleUpdate = async () => {
    if (!token || !editingId || !editForm.text) return;
    try {
      await updateQuestion(token, editingId, editForm);
      setEditingId(null);
      loadQuestions();
    } catch (err) {
      alert("Failed to update question");
    }
  };

  const toggleStatus = async (q: SystemQuestion) => {
    if (!token) return;
    try {
      await patchQuestion(token, q.id, { is_active: q.is_active ? 0 : 1 });
      loadQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Erase this question from the neural bank?")) return;
    try {
      await deleteQuestion(token, id);
      loadQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-sm font-black text-violet-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-3">
             <Database className="w-4 h-4" /> 
             System Question Bank
          </h2>
          <p className="text-slate-400 text-sm font-medium">Manage the training datasets used for AI evaluation and suggestion.</p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-500 text-white text-xs font-black rounded-2xl shadow-lg shadow-violet-600/20 transition-all active:scale-95 group"
        >
          <Plus className={`w-5 h-5 transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} />
          {isAdding ? "Cancel Entry" : "Register Question"}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="overflow-hidden"
          >
            <div className="p-8 bg-white/[0.03] border border-violet-500/30 rounded-[2.5rem] space-y-8 backdrop-blur-3xl shadow-2xl">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-4 h-4 text-violet-400" /> New Neural Input
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-4">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Transcript Content</label>
                   <textarea
                    autoFocus
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                    className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-slate-100 placeholder:text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-600/10 transition-all resize-none font-medium"
                    placeholder="Enter the query text exactly as it should appear in training..."
                  />
                </div>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5" /> Metadata Tags
                    </label>
                    <input
                      value={newQuestion.tags || ""}
                      onChange={(e) => setNewQuestion({ ...newQuestion, tags: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-slate-100 placeholder:text-slate-700 outline-none focus:border-violet-500 transition-all"
                      placeholder="e.g. objection, pricing, tech"
                    />
                  </div>
                  <button
                    onClick={handleCreate}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-violet-500 text-white text-xs font-black rounded-xl shadow-xl shadow-violet-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Confirm Injection
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading && !data ? (
           Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="h-64 bg-white/5 border border-white/5 rounded-3xl animate-pulse" />
           ))
        ) : (
          data?.items.map((q, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              key={q.id}
              className={`group bg-white/[0.02] border ${editingId === q.id ? 'border-violet-500 bg-violet-500/5' : 'border-white/5'} rounded-[2rem] p-8 shadow-xl transition-all hover:bg-white/[0.04] relative overflow-hidden`}
            >
              {editingId === q.id ? (
                <div className="space-y-6 relative z-10">
                   <textarea
                    autoFocus
                    value={editForm.text}
                    onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                    className="w-full h-32 bg-black/40 border border-violet-500/30 rounded-2xl p-5 text-sm text-white outline-none focus:ring-4 focus:ring-violet-600/10 transition-all resize-none shadow-inner"
                  />
                  <div className="flex items-center justify-between gap-4">
                    <input
                      value={editForm.tags || ""}
                      onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                    />
                    <div className="flex gap-2">
                       <button onClick={handleUpdate} className="p-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-500"><Save className="w-4 h-4" /></button>
                       <button onClick={() => setEditingId(null)} className="p-2.5 bg-white/10 text-slate-400 rounded-lg hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="flex flex-col gap-4 flex-1">
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${q.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                           <Hash className="w-4 h-4" />
                         </div>
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{q.id.split('-')[0]}</span>
                         {q.tags && q.tags.split(',').map(t => (
                           <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold text-slate-400 uppercase">{t.trim()}</span>
                         ))}
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-slate-100 line-clamp-4 min-h-[5rem]">
                        {q.text}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
                      <button onClick={() => startEdit(q)} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => toggleStatus(q)} className={`p-3 border rounded-xl transition-all ${q.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'}`}>
                        {q.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(q.id)} className="p-3 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-xl text-slate-400 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between pb-10">
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Page {page} of {data.pages}</p>
           <div className="flex items-center gap-2">
             <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl border border-white/10"
             >
               <ChevronLeft className="w-5 h-5" />
             </button>
             <button
              onClick={() => setPage(page + 1)}
              disabled={page === data.pages}
              className="p-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded-xl border border-white/10"
             >
               <ChevronRight className="w-5 h-5" />
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
