import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  HelpCircle,
  
  Settings,
  ArrowRight,
  Clock,
  
  AlertCircle,
  
  X,
  
} from 'lucide-react';
import learningService from '../../services/learningService';

export const SmartRevisionPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    dueCards: any[];
    counts: { overdue: number; dueToday: number; newCards: number; totalDue: number };
    topicsDueReview: any[];
    activeMistakes: any[];
    recommendations: any[];
    todayPlanItems: any[];
  } | null>(null);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState({
    newCardsPerDay: 20,
    maxReviewsPerDay: 50,
    reminderEnabled: true,
    preferredReminderTime: '09:00',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadRevisionData();
    loadSettings();
  }, []);

  const loadRevisionData = async () => {
    try {
      setLoading(true);
      const res = await learningService.getTodayRevision();
      setData(res);
    } catch (err) {
      console.error('Failed to load revision data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await learningService.getSpacedRepetitionSettings();
      if (res) {
        setSettings({
          newCardsPerDay: res.newCardsPerDay,
          maxReviewsPerDay: res.maxReviewsPerDay,
          reminderEnabled: res.reminderEnabled,
          preferredReminderTime: res.preferredReminderTime,
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await learningService.updateSpacedRepetitionSettings(settings);
      setShowSettingsModal(false);
      await loadRevisionData();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const counts = data?.counts || { overdue: 0, dueToday: 0, newCards: 0, totalDue: 0 };
  const topicsDue = data?.topicsDueReview || [];
  const mistakes = data?.activeMistakes || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Spaced Repetition & Weak Concept Detection
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your Smart Revision</h1>
          <p className="text-slate-500 text-sm mt-1">
            Algorithmically scheduled flashcard reviews, conceptual reinforcement questions, and active recall.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-sm transition flex items-center gap-2"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Customize Settings
          </button>
          <button
            onClick={() => navigate('/flashcards/review')}
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
          >
            Start Revision
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Flashcards Due */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Memory Retention</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Brain className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">{counts.totalDue}</div>
            <div className="text-sm font-semibold text-slate-600 mt-1">Flashcards Due Today</div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-rose-600 font-bold">{counts.overdue} Overdue</span>
            <span className="text-amber-600 font-bold">{counts.dueToday} Due Today</span>
            <span className="text-teal-600 font-bold">{counts.newCards} New</span>
          </div>
        </div>

        {/* Topics Due for Review */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Spaced Intervals</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">{topicsDue.length}</div>
            <div className="text-sm font-semibold text-slate-600 mt-1">Topics Due Review</div>
          </div>
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 truncate">
            {topicsDue.length > 0 ? topicsDue.map((t: any) => t.topic).join(', ') : 'All topics up to date'}
          </div>
        </div>

        {/* Weak Concepts */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Mistake Bank</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">{mistakes.length}</div>
            <div className="text-sm font-semibold text-slate-600 mt-1">Active Misconceptions</div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Ready for re-testing</span>
            <button 
              onClick={() => navigate('/progress/mistakes')}
              className="text-rose-600 font-bold hover:underline"
            >
              Open Bank
            </button>
          </div>
        </div>

        {/* Recommended Questions */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Targeted Practice</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-slate-900">15</div>
            <div className="text-sm font-semibold text-slate-600 mt-1">Adaptive Questions</div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>10 MCQs • 5 Viva Questions</span>
          </div>
        </div>
      </div>

      {/* Main Today's Revision Plan List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Today's Priority Revision Sequence</h2>
            <p className="text-xs text-slate-500 mt-0.5">Optimized memory consolidation based on your learning curve</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            3 Scheduled Phases
          </span>
        </div>

        <div className="space-y-4">
          {/* Item 1: Flashcards */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/50 to-white border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-indigo-600/20">
                1
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">SPACED REPETITION</span>
                  <span className="text-xs text-slate-400 font-medium">~15 min</span>
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Cardiac Cycle & Pressures — {counts.totalDue > 0 ? counts.totalDue : 12} Flashcards Due
                </h4>
                <p className="text-xs text-slate-500">
                  Prioritizing overdue concepts and cards previously rated 'Again' to prevent memory decay.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/flashcards/review')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition flex items-center justify-center gap-2"
            >
              Start Flashcards
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Item 2: Recommended MCQs */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-50/50 to-white border border-teal-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-teal-600/20">
                2
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-700">ADAPTIVE QUIZ</span>
                  <span className="text-xs text-slate-400 font-medium">~20 min</span>
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Heart Sounds & S2 Splitting — 8 Adaptive MCQs
                </h4>
                <p className="text-xs text-slate-500">
                  Focusing on recent misconceptions with dynamic learning difficulty progression.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/mcq/adaptive')}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-sm transition flex items-center justify-center gap-2"
            >
              Practice MCQs
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Item 3: Oral Viva */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-50/50 to-white border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-rose-600/20">
                3
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">ORAL VIVA</span>
                  <span className="text-xs text-slate-400 font-medium">~15 min</span>
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Cardiac Output Regulation — 5 Viva Questions
                </h4>
                <p className="text-xs text-slate-500">
                  Adaptive oral examiner simulation probing Frank-Starling mechanisms and preload/afterload relations.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/viva/adaptive')}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition flex items-center justify-center gap-2"
            >
              Start Viva
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Customize Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal-600" />
                <h3 className="text-lg font-bold text-slate-900">Spaced Repetition Settings</h3>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Daily New Cards
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={settings.newCardsPerDay}
                  onChange={(e) => setSettings({ ...settings, newCardsPerDay: parseInt(e.target.value) || 20 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-xs text-slate-400 mt-1">Number of unreviewed cards to introduce each day</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Maximum Daily Reviews
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={settings.maxReviewsPerDay}
                  onChange={(e) => setSettings({ ...settings, maxReviewsPerDay: parseInt(e.target.value) || 50 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-xs text-slate-400 mt-1">Cap on total retention reviews to prevent cognitive overload</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Preferred Reminder Time
                </label>
                <input
                  type="time"
                  value={settings.preferredReminderTime}
                  onChange={(e) => setSettings({ ...settings, preferredReminderTime: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="reminderEnabled"
                  checked={settings.reminderEnabled}
                  onChange={(e) => setSettings({ ...settings, reminderEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <label htmlFor="reminderEnabled" className="text-xs font-semibold text-slate-700">
                  Enable gentle study reminders (non-intrusive)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-sm transition disabled:opacity-50"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartRevisionPage;
