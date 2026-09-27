import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  Filter,
  
  
  
} from 'lucide-react';
import learningService from '../../services/learningService';
import { MistakeRecord } from '../../types';

export const MistakesBankPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [filterReviewed, setFilterReviewed] = useState<boolean | undefined>(false);

  useEffect(() => {
    loadMistakes();
  }, [selectedSubject, filterReviewed]);

  const loadMistakes = async () => {
    try {
      setLoading(true);
      const res = await learningService.getMistakes({
        subject: selectedSubject !== 'All' ? selectedSubject : undefined,
        reviewed: filterReviewed,
      });
      setMistakes(res || []);
    } catch (err) {
      console.error('Failed to load mistakes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReviewed = async (id: string) => {
    try {
      await learningService.markMistakeReviewed(id);
      setMistakes(prev => prev.map(m => m.id === id ? { ...m, reviewed: true } : m));
    } catch (err) {
      console.error('Error marking mistake reviewed:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Continuous Error Reflection
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your Learning Mistakes</h1>
          <p className="text-slate-500 text-sm mt-1">
            Analyze your incorrect answers, review underlying physiological mechanisms, and reinforce memory.
          </p>
        </div>

        <button
          onClick={() => navigate('/mcq/adaptive')}
          className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2 self-start md:self-auto"
        >
          Practice Weak Concepts
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Subject:</span>
          {['All', 'Physiology', 'Anatomy', 'Biochemistry', 'Pathology'].map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedSubject === sub
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterReviewed(false)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterReviewed === false
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Unresolved
          </button>
          <button
            onClick={() => setFilterReviewed(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterReviewed === true
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Reviewed
          </button>
          <button
            onClick={() => setFilterReviewed(undefined)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterReviewed === undefined
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Mistakes List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
        </div>
      ) : mistakes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Active Mistakes</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            You currently have no unresolved mistake records matching this filter. Keep up the high retention!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mistakes.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5 hover:border-slate-300 transition"
            >
              {/* Header Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                    Concept: {m.conceptName || m.topic || 'Medical Recall'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {m.subject} {m.topic ? `• ${m.topic}` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Attempt #{m.attemptNumber}</span>
                  {m.reviewed ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5" /> Reviewed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2.5 py-0.5 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5" /> Needs Review
                    </span>
                  )}
                </div>
              </div>

              {/* Answers Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Your Chosen Answer:</span>
                  <div className="text-base font-bold text-rose-950">Option {m.selectedAnswer}</div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Correct Answer:</span>
                  <div className="text-base font-bold text-emerald-950">Option {m.correctAnswer}</div>
                </div>
              </div>

              {/* Explanation & Source */}
              {m.explanation && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Clinical & Physiological Rationale:</div>
                  <p className="text-sm text-slate-700 leading-relaxed">{m.explanation}</p>
                  {m.sourceReference && (
                    <div className="text-xs text-slate-400 italic pt-1">
                      Reference: {m.sourceReference}
                    </div>
                  )}
                </div>
              )}

              {/* Card Actions */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/notes?search=${encodeURIComponent(m.conceptName || m.topic || '')}`)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Review Notes
                  </button>

                  <button
                    onClick={() => navigate(`/mcq/adaptive?subject=${encodeURIComponent(m.subject || 'Physiology')}&topic=${encodeURIComponent(m.topic || '')}`)}
                    className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Practice Similar Questions
                  </button>
                </div>

                {!m.reviewed && (
                  <button
                    onClick={() => handleMarkReviewed(m.id)}
                    className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Mark as Reviewed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MistakesBankPage;
