import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Save, X, BookOpen, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { fetchQuestions, createQuestion, updateQuestion, deleteQuestion, SystemQuestion } from "../lib/api";

export default function QuestionManagement() {
  const [questions, setQuestions] = useState<SystemQuestion[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newTags, setNewTags] = useState("");
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    try {
      setLoading(true);
      const data = await fetchQuestions();
      setQuestions(data);
    } catch (err) {
      setError("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newText.trim()) return;
    try {
      setRebuilding(true);
      await createQuestion({ text: newText.trim(), tags: newTags.trim() });
      setNewText("");
      setNewTags("");
      setIsAdding(false);
      await loadQuestions();
      showSuccess();
    } catch (err) {
      setError("Failed to create question");
    } finally {
      setTimeout(() => setRebuilding(false), 2000);
    }
  }

  async function handleToggleActive(q: SystemQuestion) {
    try {
      setRebuilding(true);
      await updateQuestion(q.id, { is_active: q.is_active === 1 ? 0 : 1 });
      await loadQuestions();
    } catch (err) {
      setError("Failed to update status");
    } finally {
      setTimeout(() => setRebuilding(false), 2000);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this question?")) return;
    try {
      setRebuilding(true);
      await deleteQuestion(id);
      await loadQuestions();
    } catch (err) {
      setError("Failed to delete question");
    } finally {
      setTimeout(() => setRebuilding(false), 2000);
    }
  }

  function showSuccess() {
    // Optional success toast logic
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-emerald-400" />
            Question Bank
          </h1>
          <p className="text-slate-400 mt-1 font-medium">Manage suggested RAG questions for simulation assistance.</p>
        </div>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {rebuilding && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
                REBUILDING VECTOR INDEX...
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
          >
            <Plus className="w-5 h-5" /> Add Question
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold">
          <AlertCircle className="w-5 h-5 font-black" /> {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Question Content</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Tags</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence mode="popLayout">
              {isAdding && (
                <motion.tr
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-500/5 group"
                >
                  <td className="px-6 py-4">
                    <div className="w-3 h-3 rounded-full bg-slate-700 animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Enter question text..."
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      placeholder="e.g. price, insurance"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={handleAdd} className="p-2 bg-emerald-500 rounded-lg text-black hover:scale-105 active:scale-95"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setIsAdding(false)} className="p-2 bg-slate-800 rounded-lg text-white hover:scale-105 active:scale-95"><X className="w-4 h-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>

            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                  Loading question bank...
                </td>
              </tr>
            ) : questions.length === 0 && !isAdding ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium italic">
                  No questions found in bank. Start by adding one.
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(q)}
                      className={`w-10 h-6 rounded-full relative transition-colors ${q.is_active === 1 ? 'bg-emerald-500' : 'bg-slate-800'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${q.is_active === 1 ? 'left-5' : 'left-1'}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`font-semibold transition-all ${q.is_active === 1 ? 'text-slate-100' : 'text-slate-600 line-through'}`}>
                      {q.text}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {q.tags?.split(",").map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] font-bold text-slate-400 capitalize whitespace-nowrap">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
