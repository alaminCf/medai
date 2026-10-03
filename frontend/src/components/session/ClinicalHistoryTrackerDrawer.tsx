// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 3: Clinical History Taking Tracker Drawer
// ────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export interface HistoryDomainItem {
  id: string;
  titleEn: string;
  titleBn: string;
  category: 'core_hpi' | 'associated' | 'background' | 'safety';
  status: 'covered' | 'uncovered';
  turnDisclosed: number | null;
  keyFactDisclosed?: string;
}

export interface HistoryTrackerSummary {
  coveredCount: number;
  totalCount: number;
  coveragePercentage: number;
  items: HistoryDomainItem[];
  coveredItems: string[];
  missedItems: string[];
  redFlagsCovered: boolean;
}

interface ClinicalHistoryTrackerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trackerSummary: HistoryTrackerSummary | null;
  onAskSuggestedQuestion?: (question: string) => void;
}

const DEFAULT_SUGGESTED_QUESTIONS: Record<string, string> = {
  duration: 'ব্যথাটা কতদিন ধরে হচ্ছে?',
  location: 'ব্যথাটা নির্দিষ্ট কোন জায়গায় বেশি লাগে?',
  character: 'ব্যথাটা কেমন ধরনের? দপদপ করে নাকি ভারী চাপ?',
  severity: '১ থেকে ১০ এর স্কেলে ব্যথার তীব্রতা কত?',
  radiation: 'ব্যথাটা কি অন্য কোথাও ছড়ায়?',
  aggravating: 'কোন কাজ বা নড়াচড়ায় কি ব্যথা বাড়ে?',
  relieving: 'বিশ্রাম নিলে বা কিছু করলে কি ব্যথা কমে?',
  associated: 'এর সাথে কি জ্বর, বমি বা অন্য কিছু হয়?',
  past_history: 'আগে কখনো কি এরকম সমস্যা হয়েছিল?',
  medications: 'এর জন্য কি কোনো ওষুধ খেয়েছেন?',
  allergies: 'কোনো ওষুধ বা খাবারে অ্যালার্জি আছে?',
  family_history: 'পরিবারে কি কারো এই ধরনের সমস্যা আছে?',
  social_history: 'ধূমপান বা অন্য কোনো অভ্যাস আছে কি?',
  red_flags: 'কোনো বিপদচিহ্ন বা শ্বাসকষ্ট আছে কি?',
};

export const ClinicalHistoryTrackerDrawer: React.FC<ClinicalHistoryTrackerDrawerProps> = ({
  isOpen,
  onClose,
  trackerSummary,
  onAskSuggestedQuestion,
}) => {
  if (!isOpen) return null;

  const total = trackerSummary?.totalCount || 16;
  const covered = trackerSummary?.coveredCount || 0;
  const percentage = trackerSummary?.coveragePercentage || Math.round((covered / total) * 100);
  const items = trackerSummary?.items || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 p-5 flex flex-col shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Clinical History Tracker</h3>
              <p className="text-[11px] text-slate-400">Real-Time Medical History Coverage</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Progress Gauge */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Consultation Completeness</span>
            <span className="text-xs font-bold text-teal-400">
              {covered} / {total} Areas ({percentage}%)
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>
              {percentage >= 75
                ? 'Excellent history exploration! Primary clinical domains covered.'
                : 'Ask about uncovered SOCRATES dimensions and pertinent negatives.'}
            </span>
          </p>
        </div>

        {/* Dynamic Domain Checklist */}
        <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            History Exploration Checklist
          </span>

          {items.map((item) => {
            const isCovered = item.status === 'covered';
            const suggestedQ = DEFAULT_SUGGESTED_QUESTIONS[item.id];

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCovered
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {isCovered ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : item.category === 'safety' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    )}

                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white leading-tight">
                        {item.titleBn}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.titleEn}
                      </div>
                    </div>
                  </div>

                  {isCovered && item.turnDisclosed !== null && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      Turn {item.turnDisclosed}
                    </span>
                  )}
                </div>

                {/* Prompt hint button if not covered */}
                {!isCovered && suggestedQ && onAskSuggestedQuestion && (
                  <button
                    type="button"
                    onClick={() => {
                      onAskSuggestedQuestion(suggestedQ);
                      onClose();
                    }}
                    className="mt-2 w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-[11px] text-teal-300 transition-colors text-left"
                  >
                    <span className="truncate">Suggested: "{suggestedQ}"</span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 ml-1 text-teal-400" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 mt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            Continue Consultation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClinicalHistoryTrackerDrawer;
