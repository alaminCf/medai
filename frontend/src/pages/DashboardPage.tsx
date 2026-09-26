import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, ArrowRight, Plus, History, TrendingUp, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersService } from '../services/usersService';
import type { DashboardData } from '../types';
import { DifficultyBadge, formatDuration } from '../utils/formatters';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    usersService.getDashboard().then(setData).finally(() => setIsLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {greeting()}, {user?.name?.split(' ')[0] ?? 'Doctor'} 👋
        </h1>
        <p className="text-gray-500 text-sm">Here's your practice overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse"><div className="h-4 bg-gray-100 rounded w-1/2 mb-3" /><div className="h-7 bg-gray-100 rounded w-1/3" /></div>
          ))
        ) : (
          <>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">Cases Available</p>
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data?.stats.casesAvailable ?? 0}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">Sessions Completed</p>
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data?.stats.sessionsCompleted ?? 0}</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">Practice Time</p>
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {data?.stats.practiceTimeMinutes ?? 0}
                <span className="text-base font-normal text-gray-400 ml-1">min</span>
              </p>
            </div>
          </>
        )}
      </div>

      {/* Quick action */}
      <div className="card p-5 mb-8 flex items-center justify-between gap-4 bg-navy-900 border-navy-900">
        <div>
          <p className="font-semibold text-white mb-0.5">Start a New Consultation</p>
          <p className="text-navy-300 text-sm">Browse the case library and select a patient to practice with.</p>
        </div>
        <Link to="/cases" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-navy-900 rounded-lg font-medium text-sm hover:bg-gray-100 transition-all flex-shrink-0">
          <Plus className="w-4 h-4" />
          Browse Cases
        </Link>
      </div>


      {/* Phase 4: Clinical Progress Section */}
      <div className="card p-6 mb-8 bg-gradient-to-br from-white to-teal-50/40 border border-teal-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Clinical Progress</h2>
              <p className="text-xs text-gray-500">Track your history-taking coverage and clinical communication skill development.</p>
            </div>
          </div>
          <span className="text-xs bg-teal-100 text-teal-800 font-semibold px-2.5 py-0.5 rounded-full">
            Rubric Calibrated
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
            <span className="text-xs text-gray-500 block mb-1">Consultations Done</span>
            <p className="text-2xl font-bold text-gray-900">{data?.stats.sessionsCompleted ?? 0}</p>
            <span className="text-[11px] text-gray-400">Completed cases</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
            <span className="text-xs text-gray-500 block mb-1">Total Practice Time</span>
            <p className="text-2xl font-bold text-gray-900">
              {data?.stats.practiceTimeMinutes ?? 0}
              <span className="text-xs font-normal text-gray-500 ml-1">mins</span>
            </p>
            <span className="text-[11px] text-gray-400">Clinical consultation time</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-teal-100/80 shadow-2xs">
            <span className="text-xs text-teal-700 font-medium block mb-1">Avg History Coverage</span>
            <p className="text-2xl font-bold text-teal-600">
              {data?.stats.averageHistoryCoverage ?? 0}%
            </p>
            <span className="text-[11px] text-teal-600/70">Core rubric items explored</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-purple-100/80 shadow-2xs">
            <span className="text-xs text-purple-700 font-medium block mb-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Recent Trajectory
            </span>
            <p className="text-2xl font-bold text-purple-600">
              {(data?.stats.recentImprovement ?? 0) >= 0 ? "+" : ""}{data?.stats.recentImprovement ?? 0}%
            </p>
            <span className="text-[11px] text-purple-600/70">Latest attempt comparison</span>
          </div>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Sessions</h2>
          <Link to="/history" className="text-sm text-navy-700 hover:text-navy-900 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex gap-3"><div className="w-10 h-10 bg-gray-100 rounded-lg" /><div className="flex-1"><div className="h-4 bg-gray-100 rounded w-1/3 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/4" /></div></div>
            ))}
          </div>
        ) : !data?.recentSessions?.length ? (
          <div className="p-10 text-center">
            <History className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No sessions yet. Start your first consultation.</p>
            <Link to="/cases" className="btn-primary mt-4 inline-flex">Browse Cases</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.recentSessions.map(session => (
              <Link
                key={session.id}
                to={`/history/${session.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-navy-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-navy-800">
                    {session.patientCase.patientName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{session.patientCase.patientName}</p>
                  <p className="text-xs text-gray-400 truncate">{session.patientCase.title}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <DifficultyBadge difficulty={session.patientCase.difficulty} />
                  {session.duration && <span className="text-xs text-gray-400">{formatDuration(session.duration)}</span>}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${session.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                    {session.status}
                  </span>
                  {session.status === 'completed' && (
                    <Link
                      to={`/session/${session.id}/evaluation`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-teal-700 hover:text-teal-900 font-semibold px-2 py-1 bg-teal-50 hover:bg-teal-100 rounded-md transition"
                    >
                      Evaluation
                    </Link>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Educational disclaimer */}
      <p className="text-xs text-gray-400 mt-6 text-center">
        Techboloy Med is an educational simulation tool. It does not replace clinical supervision, medical training, or professional medical judgment.
      </p>
    </div>
  );
}
