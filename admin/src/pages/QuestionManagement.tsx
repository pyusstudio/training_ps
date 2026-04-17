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
  MoreVertical, Save, X, Hash, MessageSquare, Tag, Info
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
    <div className="space-y-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
             <Database className="w-3.5 h-3.5" /> 
             Content Library
          </h2>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Questions</h1>
          <p className="text-slate-500 text-xs font-medium mt-1">
            Manage the training datasets used for behavioral evaluation.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center gap-2.5 px-6 py-2.5 text-xs font-bold rounded-xl transition-all active:scale-95 group border shadow-sm ${isAdding ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700'}`}
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? "Cancel" : "Add Question"}
        </button>
      </div>

      {/* Info Note about RAG */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 shadow-sm">
        <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-indigo-900">How these questions are used</h3>
          <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
            The questions you add here become part of the AI's knowledge base. During a live training session, the AI listens to what the trainee says and automatically picks the most relevant questions or objections from this library to challenge them and keep the conversation natural.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-3">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Content</label>
                 <textarea
                  autoFocus
                  value={newQuestion.text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                  className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-sm"
                  placeholder="Enter the query text..."
                />
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" /> Tags
                  </label>
                  <input
                    value={newQuestion.tags || ""}
                    onChange={(e) => setNewQuestion({ ...newQuestion, tags: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                    placeholder="e.g. objection, pricing"
                  />
                </div>
                <button
                  onClick={handleCreate}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> 
                  <span>Save Question</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading && !data ? (
           Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="h-64 bg-white border border-slate-100 rounded-[2rem] animate-pulse" />
           ))
        ) : (
          data?.items.map((q, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                opacity: { delay: idx * 0.05 }, 
                y: { delay: idx * 0.05 }, 
                layout: { type: "spring", bounce: 0, duration: 0.4 } 
              }}
              key={q.id}
              className={`group bg-white border ${editingId === q.id ? 'border-indigo-500' : 'border-slate-200/60'} rounded-xl p-6 transition-all hover:border-indigo-200 relative overflow-hidden shadow-sm`}
            >
               {editingId === q.id ? (
                <div className="space-y-4">
                   <textarea
                    autoFocus
                    value={editForm.text}
                    onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                    className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none shadow-sm"
                  />
                  <div className="flex items-center gap-4">
                    <input
                      value={editForm.tags || ""}
                      onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all"
                    />
                    <div className="flex gap-2">
                       <button onClick={handleUpdate} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"><Save className="w-4 h-4" /></button>
                       <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ) : (
                 <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex flex-col gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${q.is_active ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                           <Hash className="w-4 h-4" />
                         </div>
                         <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {q.id.split('-')[0]}</p>
                           <div className="flex flex-wrap gap-1.5 mt-0.5">
                             {q.tags ? q.tags.split(',').map(t => (
                               <span key={t} className="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-500 uppercase">{t.trim()}</span>
                             )) : (
                               <span className="text-[9px] font-medium text-slate-300 italic">No tags</span>
                             )}
                           </div>
                         </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(q)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => toggleStatus(q)} className={`p-2 rounded-lg transition-all ${q.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}>
                        {q.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(q.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-[13px] font-medium leading-relaxed text-slate-700 line-clamp-3 min-h-[4rem]">
                    {q.text}
                  </p>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between py-6 border-t border-slate-100">
           <div>
             <p className="text-[11px] font-bold text-slate-900">{page} of {data.pages} pages</p>
           </div>
           <div className="flex items-center gap-2">
             <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 bg-white hover:bg-slate-50 disabled:opacity-30 rounded-lg border border-slate-200 shadow-sm transition-all"
             >
               <ChevronLeft className="w-4 h-4 text-slate-600" />
             </button>
             <button
              onClick={() => setPage(page + 1)}
              disabled={page === data.pages}
              className="p-2 bg-white hover:bg-slate-50 disabled:opacity-30 rounded-lg border border-slate-200 shadow-sm transition-all"
             >
               <ChevronRight className="w-4 h-4 text-slate-600" />
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
