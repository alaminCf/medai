import { useEffect, useState } from 'react';
import {
  Flame,
  Calendar,
  BarChart3,
  Clock,
  Brain,
  FileText,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { learningService } from '../../services/learningService';
import type { StudyProgress, LearningStreakInfo, WeeklyLearningReport, TopicMasteryIndicator } from '../../types';

export default function ProgressPage() {
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const [streak, setStreak] = useState<LearningStreakInfo | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyLearningReport | null>(null);
  const [masteries, setMasteries] = useState<TopicMasteryIndicator[]>([]);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'topics' | 'revision' | 'viva'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllProgress();
  }, []);

  const loadAllProgress = async () => {
    try {
      setLoading(true);
      const [progRes, streakRes, weeklyRes, masteryRes] = await Promise.all([
        learningService.getStudyProgress().catch(() => null),
        learningService.getLearningStreak().catch(() => null),
        learningService.getWeeklyReport().catch(() => null),
        learningService.getTopicMasteries().catch(() => [])
      ]);
      if (progRes) setProgress(progRes);
      if (streakRes) setStreak(streakRes);
      if (weeklyRes) setWeeklyReport(weeklyRes);
      if (masteryRes) setMasteries(masteryRes);
    } catch (err) {
      console.error('Error fetching progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  const stats = progress?.stats;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header with Navigation Shortcuts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
            Learning Progress & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Transparent insights, verified clinical knowledge retention, and study habit analytics.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/progress/mistakes"
            className="text-xs flex items-center gap-1.5 py-2 px-3 border border-amber-200 text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl font-medium"
          >
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Mistake Bank
          </Link>
          <Link
            to="/progress/knowledge-map"
            className="text-xs flex items-center gap-1.5 py-2 px-3 border border-teal-200 text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-xl font-medium"
          >
            <Brain className="w-4 h-4 text-teal-600" />
            Knowledge Map
          </Link>
          <Link
            to="/revision"
            className="text-xs flex items-center gap-1.5 py-2 px-4 shadow-sm rounded-xl font-semibold bg-teal-600 hover:bg-teal-700 text-white"
          >
            <RotateCcw className="w-4 h-4" />
            Smart Revision
          </Link>
        </div>
      </div>

      {/* 1. Learning Streak & Study Habit Card */}
      <div className="card p-6 border border-gray-200 bg-gradient-to-r from-teal-50/70 via-white to-amber-50/50 rounded-2xl mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
              <Flame className="w-8 h-8 fill-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-navy-900">
                  {streak?.currentStreak ?? 0} Day Study Streak
                </h3>
                {streak && streak.currentStreak > 0 ? (
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    Start a new streak today
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {streak && streak.currentStreak > 0
                  ? `Keep going! Your longest streak is ${streak.longestStreak} days.`
                  : 'Your next study session starts a new streak! Consistency builds clinical mastery.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 sm:border-l sm:border-gray-200 sm:pl-6 text-center">
            <div>
              <span className="text-[11px] text-gray-500 uppercase tracking-wider block font-semibold">
                Longest Streak
              </span>
              <span className="text-lg font-extrabold text-navy-900">
                {streak?.longestStreak ?? 0} <span className="text-xs font-normal text-gray-500">days</span>
              </span>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 uppercase tracking-wider block font-semibold">
                Days This Month
              </span>
              <span className="text-lg font-extrabold text-teal-600">
                {streak?.studyDaysThisMonth ?? 0} <span className="text-xs font-normal text-gray-500">days</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Weekly Learning Summary Banner */}
      {weeklyReport && (
        <div className="card p-6 border border-gray-200 bg-white rounded-2xl mb-8 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-navy-900 text-base">Weekly Learning Summary</h3>
            </div>
            <span className="text-xs text-gray-400">Past 7 Days</span>
          </div>
          <p className="text-sm text-gray-700 mb-5 font-medium bg-purple-50/50 p-3 rounded-xl border border-purple-100">
            {weeklyReport.summaryText}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
              <span className="text-[11px] text-gray-500 block mb-0.5">Study Time</span>
              <span className="text-base font-bold text-navy-900">{weeklyReport.studyTimeMinutes}m</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
              <span className="text-[11px] text-gray-500 block mb-0.5">Topics Studied</span>
              <span className="text-base font-bold text-navy-900">{weeklyReport.topicsStudiedCount}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
              <span className="text-[11px] text-gray-500 block mb-0.5">MCQs Practiced</span>
              <span className="text-base font-bold text-teal-600">{weeklyReport.mcqsAttemptedCount}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
              <span className="text-[11px] text-gray-500 block mb-0.5">MCQ Accuracy</span>
              <span className="text-base font-bold text-teal-600">{weeklyReport.mcqAccuracy}%</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
              <span className="text-[11px] text-gray-500 block mb-0.5">Flashcards</span>
              <span className="text-base font-bold text-emerald-600">{weeklyReport.flashcardsReviewedCount}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
              <span className="text-[11px] text-gray-500 block mb-0.5">Tasks Completed</span>
              <span className="text-base font-bold text-purple-600">{weeklyReport.completedTasksCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(['overview', 'subjects', 'topics', 'revision', 'viva'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                activeTab === tab
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-navy-900 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto bg-gray-100 p-1 rounded-lg">
          {(['7d', '30d', '90d', 'all'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded text-xs font-semibold uppercase transition ${
                timeframe === tf ? 'bg-white text-navy-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-xs text-gray-500 block mb-1">Total Study Time</span>
              <p className="text-2xl font-bold text-navy-900">
                {Math.round((stats?.totalStudyMinutes ?? 0) / 60 * 10) / 10}
                <span className="text-sm font-normal text-gray-400 ml-1">hrs</span>
              </p>
              <span className="text-[11px] text-gray-400">{stats?.totalStudyMinutes ?? 0} total minutes</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-xs text-gray-500 block mb-1">Flashcards Tested</span>
              <p className="text-2xl font-bold text-emerald-600">
                {stats?.totalFlashcardsReviewed ?? 0}
              </p>
              <span className="text-[11px] text-gray-400">Across {stats?.totalDecks ?? 0} decks</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-xs text-gray-500 block mb-1">MCQ Accuracy</span>
              <p className="text-2xl font-bold text-teal-600">
                {stats?.mcqAccuracyPercentage ?? 0}%
              </p>
              <span className="text-[11px] text-teal-600/70">
                {stats?.mcqsCorrect ?? 0}/{stats?.mcqsAttempted ?? 0} correct
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
              <span className="text-xs text-gray-500 block mb-1">Avg Viva Score</span>
              <p className="text-2xl font-bold text-purple-600">
                {stats?.averageVivaScore ?? 0}
                <span className="text-xs font-normal text-gray-400 ml-1">/10</span>
              </p>
              <span className="text-[11px] text-gray-400">{stats?.vivaSessionsCompleted ?? 0} completed</span>
            </div>
          </div>

          {/* Main Charts & Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Weekly Study Activity */}
            <div className="card p-6 border border-gray-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  <h3 className="font-bold text-navy-900 text-sm sm:text-base">
                    Daily Study Activity (Minutes)
                  </h3>
                </div>
                <span className="text-xs text-gray-500">Past 7 Days</span>
              </div>

              <div className="h-52 flex items-end gap-3 justify-between pt-6 px-2">
                {progress?.weeklyActivity?.map((day) => {
                  const maxMinutes = Math.max(
                    ...progress.weeklyActivity.map((d) => d.minutes),
                    30
                  );
                  const heightPct = Math.round((day.minutes / maxMinutes) * 100);
                  const label = new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' });

                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <span className="text-[10px] font-bold text-gray-600">
                        {day.minutes > 0 ? `${day.minutes}m` : ''}
                      </span>
                      <div
                        className="w-full max-w-[36px] bg-gradient-to-t from-teal-600 to-emerald-400 rounded-t-lg transition-all duration-500"
                        style={{ height: `${Math.max(heightPct, 6)}%` }}
                      />
                      <span className="text-[11px] text-gray-500 font-medium">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MCQ Accuracy by Subject */}
            <div className="card p-6 border border-gray-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-navy-900 text-sm sm:text-base">
                    MCQ Accuracy by Medical Subject
                  </h3>
                </div>
                <Link to="/mcq/adaptive" className="text-xs text-teal-700 hover:underline font-semibold">
                  Adaptive Quiz →
                </Link>
              </div>

              {progress?.mcqPerformanceBySubject &&
              Object.keys(progress.mcqPerformanceBySubject).length > 0 ? (
                <div className="space-y-4 pt-2">
                  {Object.entries(progress.mcqPerformanceBySubject).map(([sub, perf]) => (
                    <div key={sub} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-800">{sub}</span>
                        <span className="text-teal-700">
                          {perf.accuracy}% ({perf.correct}/{perf.attempted})
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            perf.accuracy >= 75
                              ? 'bg-emerald-500'
                              : perf.accuracy >= 50
                              ? 'bg-teal-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${perf.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-xs">
                  No MCQ questions completed yet. Start an adaptive quiz to view performance.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Tab: Subjects */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {['Physiology', 'Pharmacology', 'Cardiology', 'Pathology', 'Anatomy', 'Biochemistry'].map((subj) => (
            <div key={subj} className="card p-6 border border-gray-200 hover:border-teal-300 transition">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800">
                  Core Medical
                </span>
                <Link
                  to={`/subjects/${encodeURIComponent(subj)}`}
                  className="text-xs text-teal-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  View Subject <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <h3 className="text-lg font-bold text-navy-900 mb-2">{subj}</h3>
              <p className="text-xs text-gray-500 mb-4">
                Explore topics, adaptive flashcards, MCQs, and clinical viva questions.
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-600">
                <span>Subject Coverage</span>
                <span className="font-bold text-teal-700">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Topics */}
      {activeTab === 'topics' && (
        <div className="card p-6 border border-gray-200 mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
            <h3 className="font-bold text-navy-900 text-base">Topic Mastery Breakdown</h3>
            <span className="text-xs text-gray-400">Evidence-based indicators</span>
          </div>

          {masteries.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-xs">
              No topic mastery records yet. Study topics, answer questions, and complete vivas to populate.
            </div>
          ) : (
            <div className="space-y-4">
              {masteries.map((m) => (
                <div key={m.topic} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-navy-900">{m.topic}</span>
                      <span className="text-[10px] text-gray-500 bg-gray-200/70 px-1.5 py-0.5 rounded">
                        {m.subject}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          m.status === 'STRONG'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.status === 'REVIEW'
                            ? 'bg-amber-100 text-amber-800'
                            : m.status === 'LEARNING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>MCQ: {m.mcqAccuracy ?? 0}%</span>
                      <span>Flashcards: {m.flashcardRetention ?? 0}%</span>
                      <span>Viva: {m.vivaCoverage ?? 0}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-lg font-black text-teal-700">{m.masteryPercentage}%</span>
                      <span className="text-[10px] text-gray-400 block">Mastery</span>
                    </div>
                    <Link
                      to={`/subjects/${encodeURIComponent(m.subject)}/topics/${encodeURIComponent(m.topic)}`}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white"
                    >
                      Study Topic
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Revision & Viva */}
      {(activeTab === 'revision' || activeTab === 'viva') && (
        <div className="card p-8 border border-gray-200 text-center mb-8">
          <Brain className="w-12 h-12 text-teal-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-navy-900 mb-1">
            {activeTab === 'revision' ? 'Smart Spaced Revision' : 'Adaptive Viva Performance'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
            {activeTab === 'revision'
              ? 'Spaced repetition automatically optimizes your memory retention curve.'
              : 'Adaptive viva questions target your missed concepts and build oral clinical competence.'}
          </p>
          <div className="flex justify-center gap-3">
            {activeTab === 'revision' ? (
              <Link to="/revision" className="text-xs py-2 px-4 rounded-xl bg-teal-600 text-white font-semibold">
                Open Smart Revision Engine
              </Link>
            ) : (
              <Link to="/viva/adaptive" className="text-xs py-2 px-4 rounded-xl bg-purple-600 text-white font-semibold">
                Launch Adaptive Viva Practice
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Two Column Bottom: Recent Learning & Topics to Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Learning Materials & Notes */}
        <div className="card p-6 border border-gray-200">
          <h3 className="font-bold text-navy-900 text-sm mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            Your Recent Learning
          </h3>
          <div className="space-y-3">
            {progress?.recentLearning?.materials?.map((m) => (
              <Link
                key={m.id}
                to={`/learning/materials/${m.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-gray-900">{m.title}</span>
                </div>
                <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                  {m.subject}
                </span>
              </Link>
            ))}
            {(!progress?.recentLearning?.materials || progress.recentLearning.materials.length === 0) && (
              <p className="text-xs text-gray-400 py-3 text-center">No recent materials.</p>
            )}
          </div>
        </div>

        {/* Topics to Review Recommendations */}
        <div className="card p-6 border border-gray-200">
          <h3 className="font-bold text-navy-900 text-sm mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            Recommended Topics to Review
          </h3>
          <div className="space-y-2.5">
            {progress?.topicsToReview?.map((t, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-purple-50/40 border border-purple-100 text-xs"
              >
                <span className="font-bold text-purple-950">{t}</span>
                <Link
                  to={`/mcq/adaptive?topic=${encodeURIComponent(t)}`}
                  className="font-semibold text-purple-700 hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  Adaptive Quiz <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
            {(!progress?.topicsToReview || progress.topicsToReview.length === 0) && (
              <p className="text-xs text-gray-400 py-3 text-center">No urgent topics due for review.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
