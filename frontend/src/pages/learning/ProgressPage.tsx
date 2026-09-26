import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  FileText,
  Clock,
  ArrowRight,
  Brain,
  BarChart3,
  Calendar,
} from 'lucide-react';
import learningService from '../../services/learningService';
import type { StudyProgress } from '../../types';

export default function ProgressPage() {
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setIsLoading(true);
      const res = await learningService.getStudyProgress();
      setProgress(res);
    } catch (err) {
      console.error('Failed to load study progress:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-gray-500">Loading learning analytics...</p>
        </div>
      </div>
    );
  }

  const stats = progress?.stats;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Link to="/learning" className="text-xs text-gray-500 hover:text-teal-700">
            Learning Hub
          </Link>
          <span className="text-xs text-gray-400">/</span>
          <span className="text-xs font-semibold text-teal-800">Academic Analytics</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-teal-600" />
          Study Progress & Performance Analytics
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Transparent metrics tracking study duration, active recall retention, question bank accuracy, and oral viva evaluations.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-xs text-gray-500 block mb-1">Total Study Time</span>
          <p className="text-2xl font-bold text-navy-900">
            {stats?.totalStudyMinutes ?? 0}
            <span className="text-xs font-normal text-gray-400 ml-1">mins</span>
          </p>
          <span className="text-[11px] text-gray-400">Tracked sessions</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-xs text-gray-500 block mb-1">Materials Ingested</span>
          <p className="text-2xl font-bold text-navy-900">{stats?.totalMaterials ?? 0}</p>
          <span className="text-[11px] text-gray-400">Lectures & guides</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs">
          <span className="text-xs text-gray-500 block mb-1">Smart Notes</span>
          <p className="text-2xl font-bold text-navy-900">{stats?.totalNotes ?? 0}</p>
          <span className="text-[11px] text-gray-400">Synthesized pearls</span>
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
          <span className="text-[11px] text-gray-400">{stats?.vivaSessionsCompleted ?? 0} vivas completed</span>
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
                Weekly Study Activity (Minutes per Day)
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
            <Link to="/mcq" className="text-xs text-purple-700 hover:underline">
              Practice More →
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
              No MCQ questions completed yet. Start an MCQ practice session to view subject analytics.
            </div>
          )}
        </div>
      </div>

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
                  to={`/mcq?topic=${encodeURIComponent(t)}`}
                  className="font-semibold text-purple-700 hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  Quiz Now <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
