import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersService } from '../services/usersService';
import type { DashboardData } from '../types';
import { casesService } from '../services/casesService';
import { formatDuration, DifficultyBadge } from '../utils/formatters';
import {
  Stethoscope,
  History,
  TrendingUp,
  Brain,
  ArrowRight,
  Plus,
  Radio,
  Sparkles,
  HeartPulse,
  Pill,
} from 'lucide-react';
import CreateCaseModal from '../components/cases/CreateCaseModal';

const featuredTopics = [
  {
    title: 'Acute Chest Pain',
    category: 'Cardiology',
    complaint: 'Crushing chest discomfort for 2 hours',
    patient: 'Rahim Ahmed',
    diff: 'intermediate',
    icon: HeartPulse,
  },
  {
    title: 'Shortness of Breath',
    category: 'Respiratory',
    complaint: 'Harder to breathe with expiratory wheezing',
    patient: 'Karim Uddin',
    diff: 'beginner',
    icon: Stethoscope,
  },
  {
    title: 'Acute Abdominal Pain',
    category: 'Gastroenterology',
    complaint: 'Severe belly pain after meals',
    patient: 'Mim Akter',
    diff: 'intermediate',
    icon: Pill,
  },
  {
    title: 'Severe Throbbing Headache',
    category: 'Neurology',
    complaint: 'Terrible headaches with light sensitivity',
    patient: 'Sakib Hasan',
    diff: 'beginner',
    icon: Brain,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectingTopic, setConnectingTopic] = useState<string | null>(null);

  useEffect(() => {
    usersService.getDashboard()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  const handleLaunchTopic = async (topicTitle: string, category: string) => {
    try {
      setConnectingTopic(topicTitle);

      // Check if case with matching title/category exists in active cases
      const cases = await casesService.getCases();
      const existing = cases.find(
        (c) =>
          c.title.toLowerCase().includes(topicTitle.toLowerCase()) ||
          c.category.toLowerCase().includes(category.toLowerCase())
      );

      if (existing) {
        const { sessionId } = await casesService.quickConnect({
          caseId: existing.id,
          language: (existing.voiceLanguage as any) || 'en',
          voiceEnabled: true,
          avatarEnabled: true,
        });
        navigate(`/session/${sessionId}`);
      } else {
        // Generate on the fly
        const created = await casesService.generateCase({
          topic: topicTitle,
          specialty: category,
          difficulty: 'intermediate',
          language: 'en',
        });
        const { sessionId } = await casesService.quickConnect({
          caseId: created.id,
          language: 'en',
          voiceEnabled: true,
          avatarEnabled: true,
        });
        navigate(`/session/${sessionId}`);
      }
    } catch (err) {
      console.error('Failed to launch topic:', err);
      navigate('/cases');
    } finally {
      setConnectingTopic(null);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Welcome & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Your AI Patient clinical consultation & OSCE examination workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create AI Patient Topic</span>
          </button>
          <Link
            to="/cases"
            className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition"
          >
            Case Library
          </Link>
        </div>
      </div>

      {/* 1. PRIMARY FEATURE: AI PATIENT QUICK CONNECT HUB */}
      <div className="card p-6 bg-gradient-to-r from-slate-900 via-navy-950 to-teal-950 text-white rounded-2xl shadow-lg border border-navy-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-navy-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] bg-teal-500/20 text-teal-300 font-extrabold px-2.5 py-0.5 rounded-full border border-teal-500/30 flex items-center gap-1">
                <Radio className="w-3 h-3 text-teal-400 animate-pulse" />
                VIRTUAL PATIENT HUB
              </span>
              <span className="text-[11px] text-gray-400">One-Click Consultation</span>
            </div>
            <h2 className="text-xl font-black text-white">Start Practicing with AI Patients</h2>
            <p className="text-xs text-gray-300 mt-0.5">
              Select a clinical topic below to speak directly with an AI patient, or create any custom topic.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 self-start md:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>+ Custom Topic Generator</span>
          </button>
        </div>

        {/* 4 Instant Topic Launch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {featuredTopics.map((item, idx) => {
            const Icon = item.icon;
            const isConnecting = connectingTopic === item.title;

            return (
              <div
                key={idx}
                onClick={() => handleLaunchTopic(item.title, item.category)}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-teal-400 hover:bg-white/10 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">
                      {item.category}
                    </span>
                    <Icon className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-extrabold text-white text-xs sm:text-sm group-hover:text-teal-300 transition">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                    "{item.complaint}"
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">AI Patient: {item.patient}</span>
                  <button
                    disabled={isConnecting}
                    className="text-xs font-black text-teal-300 hover:text-white flex items-center gap-1"
                  >
                    {isConnecting ? 'Connecting...' : 'Start →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OSCE Exam Hub Banner */}
      <div className="card p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-navy-950 border border-emerald-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-400/20 text-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
              Exam Mode
            </span>
            <span className="text-xs text-slate-400 font-medium">5-Station OSCE Clinical Simulation</span>
          </div>
          <p className="font-bold text-white text-base">Enter Clinical Examination (OSCE)</p>
          <p className="text-slate-300 text-xs max-w-xl">
            Test your focused clinical history taking under formal exam conditions with timed stations and rubric marking.
          </p>
        </div>
        <Link
          to="/exams"
          className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all flex-shrink-0 shadow-lg shadow-emerald-400/20 active:scale-98"
        >
          <span>Go to Exam Hub</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </Link>
      </div>

      {/* Clinical Progress Summary */}
      <div className="card p-6 bg-gradient-to-br from-white to-teal-50/40 border border-teal-100 shadow-sm rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Clinical Progress</h2>
              <p className="text-xs text-gray-500">Track your history-taking coverage and clinical communication development.</p>
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

      {/* Recent Sessions */}
      <div className="card rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Recent Consultations</h2>
          <Link to="/history" className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.recentSessions?.length ? (
          <div className="p-10 text-center">
            <History className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No sessions yet. Start your first consultation.</p>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary mt-4 inline-flex">
              Start Consultation
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.recentSessions.map((session: any) => (
              <Link
                key={session.id}
                to={`/history/${session.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-navy-800">
                    {session.patientCase.patientName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{session.patientCase.patientName}</p>
                  <p className="text-xs text-gray-400 truncate">{session.patientCase.title}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <DifficultyBadge difficulty={session.patientCase.difficulty} />
                  {session.duration && (
                    <span className="text-xs text-gray-400">{formatDuration(session.duration)}</span>
                  )}
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      session.status === 'completed'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
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

      {/* Modal */}
      <CreateCaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
