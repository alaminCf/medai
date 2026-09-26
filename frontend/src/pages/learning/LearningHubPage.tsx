import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  Brain,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  Upload,
  Search,
  MessageSquare,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import learningService from '../../services/learningService';
import type { LearningHubSummary } from '../../types';

export default function LearningHubPage() {
  const { user } = useAuth();
  // const navigate = useNavigate();
  const [data, setData] = useState<LearningHubSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadHubData();
  }, []);

  const loadHubData = async () => {
    try {
      setIsLoading(true);
      const res = await learningService.getHubSummary();
      setData(res);
    } catch (err) {
      console.error('Failed to load learning hub data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      setIsSearching(true);
      const res = await learningService.searchLearning(searchQuery);
      setSearchResults(res);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner & Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
                <GraduationCap className="w-3.5 h-3.5" />
                Academic Learning Workspace
              </span>
              <span className="text-xs text-gray-500 font-medium">Phase 6</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Doctor'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              "Learn Medicine. Think Clinically. Practice Confidently."
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/learning/materials"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            >
              <Upload className="w-4 h-4" />
              Upload Material
            </Link>
            <Link
              to="/ai-tutor"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            >
              <Brain className="w-4 h-4" />
              Open AI Tutor
            </Link>
          </div>
        </div>

        {/* Global Learning Search */}
        <div className="mt-6">
          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lectures, study notes, flashcards, MCQs, or topics..."
              className="w-full pl-11 pr-24 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Search Results Dropdown/Overlay */}
          {searchResults && (
            <div className="mt-3 p-4 bg-white border border-gray-200 rounded-xl shadow-lg max-w-2xl space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Search Results for "{searchResults.query}"
                </span>
                <button
                  onClick={() => setSearchResults(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Close
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 text-sm">
                {searchResults.results.materials.map((m: any) => (
                  <Link
                    key={m.id}
                    to={`/learning/materials/${m.id}`}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-600" />
                      <span className="font-medium text-gray-900">{m.title}</span>
                    </div>
                    <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{m.subject}</span>
                  </Link>
                ))}
                {searchResults.results.notes.map((n: any) => (
                  <Link
                    key={n.id}
                    to="/notes"
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-gray-900">{n.title}</span>
                    </div>
                    <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Note</span>
                  </Link>
                ))}
                {searchResults.results.materials.length === 0 && searchResults.results.notes.length === 0 && (
                  <p className="text-xs text-gray-500 py-2">No matching materials or notes found.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continue Learning Banner */}
      {data?.continueStudying?.material && (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-navy-900 via-navy-800 to-teal-950 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Continue Learning
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {data.continueStudying.material.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="bg-white/10 px-2 py-0.5 rounded font-medium text-teal-200">
                  {data.continueStudying.material.subject}
                </span>
                {data.continueStudying.material.topic && (
                  <span>Topic: {data.continueStudying.material.topic}</span>
                )}
                <span>Status: Ready for study</span>
              </div>
            </div>
            <Link
              to={`/learning/materials/${data.continueStudying.material.id}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-sm active:scale-98 flex-shrink-0"
            >
              Resume Study Reader
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-xs text-gray-500 block mb-1">Study Materials</span>
          <p className="text-2xl font-bold text-navy-900">{data?.stats?.materialsCount ?? 0}</p>
          <span className="text-[11px] text-gray-400">PDFs & Notes</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-xs text-gray-500 block mb-1">Smart Notes</span>
          <p className="text-2xl font-bold text-navy-900">{data?.stats?.notesCount ?? 0}</p>
          <span className="text-[11px] text-gray-400">Personal & AI</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-xs text-gray-500 block mb-1">Flashcard Decks</span>
          <p className="text-2xl font-bold text-teal-600">{data?.stats?.decksCount ?? 0}</p>
          <span className="text-[11px] text-teal-600/70">{data?.stats?.flashcardsDueCount ?? 0} cards due</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-xs text-gray-500 block mb-1">MCQ Accuracy</span>
          <p className="text-2xl font-bold text-emerald-600">
            {data?.stats?.mcqAccuracy ?? 0}%
          </p>
          <span className="text-[11px] text-gray-400">{data?.stats?.mcqsAttempted ?? 0} attempted</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-xs text-gray-500 block mb-1">Viva Sessions</span>
          <p className="text-2xl font-bold text-purple-600">{data?.stats?.vivaCount ?? 0}</p>
          <span className="text-[11px] text-gray-400">Oral examinations</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-xs text-gray-500 block mb-1">Progress Tracker</span>
          <Link to="/progress" className="text-2xl font-bold text-teal-700 flex items-center gap-1 hover:underline">
            View <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-[11px] text-gray-400">Full analytics</span>
        </div>
      </div>

      {/* Quick Practice Launchpads */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
          Quick Practice
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/mcq"
            className="group p-5 bg-white border border-gray-200 hover:border-teal-500 rounded-2xl shadow-2xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition">
                Generate MCQs
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Practice 10, 20, or 30 high-yield questions with server-protected answers and instant explanations.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-teal-600 gap-1">
              Start Practice <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          <Link
            to="/viva"
            className="group p-5 bg-white border border-gray-200 hover:border-purple-500 rounded-2xl shadow-2xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-purple-700 transition">
                Practice Viva
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Simulate an academic oral examination with realistic examiner questions and structured concept feedback.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-purple-600 gap-1">
              Begin Viva <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          <Link
            to="/flashcards"
            className="group p-5 bg-white border border-gray-200 hover:border-emerald-500 rounded-2xl shadow-2xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition">
                Review Flashcards
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Active recall practice with interactive flip cards and review ratings (Again, Hard, Good, Easy).
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 gap-1">
              Study Decks <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          <Link
            to="/ai-tutor"
            className="group p-5 bg-white border border-gray-200 hover:border-navy-500 rounded-2xl shadow-2xs hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-gray-900 group-hover:text-navy-800 transition">
                Ask AI Tutor
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Academic tutor with EXPLAIN, TEACH, QUIZ ME, and VIVA ME modes grounded in your uploaded materials.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-navy-700 gap-1">
              Open Tutor Chat <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>
      </div>

      {/* Main Grid: Recent Materials & Recent Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column (2 cols): Recent Materials */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h2 className="font-bold text-navy-900 text-base">Recent Study Materials</h2>
              </div>
              <Link
                to="/learning/materials"
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                View Library ({data?.stats?.materialsCount ?? 0}) <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-gray-400 animate-pulse text-sm">
                Loading study materials...
              </div>
            ) : !data?.recentMaterials?.length ? (
              <div className="p-8 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">No study materials uploaded yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Upload your first lecture PDF, slide deck, or class notes to start building your personal learning workspace.
                </p>
                <Link
                  to="/learning/materials"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-navy-900 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Material
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.recentMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 rounded-xl px-2 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 font-bold text-xs uppercase">
                        {mat.fileType || 'PDF'}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/learning/materials/${mat.id}`}
                          className="font-bold text-gray-900 hover:text-teal-700 text-sm truncate block"
                        >
                          {mat.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                            {mat.subject}
                          </span>
                          {mat.topic && <span>• {mat.topic}</span>}
                          <span>• {formatFileSize(mat.fileSize)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            mat.processingStatus === 'READY'
                              ? 'bg-emerald-50 text-emerald-700'
                              : mat.processingStatus === 'PROCESSING'
                              ? 'bg-amber-50 text-amber-700 animate-pulse'
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {mat.processingStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      <Link
                        to={`/learning/materials/${mat.id}`}
                        className="px-3.5 py-1.5 bg-gray-100 hover:bg-teal-50 hover:text-teal-800 text-gray-700 text-xs font-semibold rounded-lg transition"
                      >
                        Open Reader
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Notes & Flashcard Decks */}
        <div className="space-y-6">
          {/* Notes Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-navy-900 text-sm">Recent Notes</h3>
              </div>
              <Link to="/notes" className="text-xs text-purple-700 hover:underline">
                View all
              </Link>
            </div>
            {!data?.recentNotes?.length ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No personal notes saved yet. Create a note or summarize a lecture.
              </p>
            ) : (
              <div className="divide-y divide-gray-50 pt-2">
                {data.recentNotes.map((n) => (
                  <Link
                    key={n.id}
                    to="/notes"
                    className="block py-2.5 hover:bg-gray-50 rounded-lg px-2 transition"
                  >
                    <p className="text-xs font-semibold text-gray-900 truncate">{n.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                      <span className="text-purple-700 font-medium">{n.subject}</span>
                      <span>• {new Date(n.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Flashcards Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-navy-900 text-sm">Study Flashcards</h3>
              </div>
              <Link to="/flashcards" className="text-xs text-emerald-700 hover:underline">
                View all
              </Link>
            </div>
            {!data?.decks?.length ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No flashcard decks yet. Generate cards from your notes.
              </p>
            ) : (
              <div className="divide-y divide-gray-50 pt-2">
                {data.decks.map((d) => (
                  <Link
                    key={d.id}
                    to="/flashcards"
                    className="block py-2.5 hover:bg-gray-50 rounded-lg px-2 transition"
                  >
                    <p className="text-xs font-semibold text-gray-900 truncate">{d.title}</p>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500">
                      <span className="text-emerald-700 font-medium">{d.subject}</span>
                      <span>{d._count?.cards ?? d.cards?.length ?? 0} cards</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Educational Notice Banner */}
      <div className="p-4 bg-teal-50/60 border border-teal-100 rounded-xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-teal-900/80 leading-relaxed">
          <strong className="font-semibold text-teal-950">Techboloy Med Academic Disclaimer:</strong>{' '}
          Techboloy Med is an educational simulation and study platform. AI-generated educational content may contain errors and should be verified against trusted medical textbooks, institutional teaching materials, and qualified educators. It is not a substitute for clinical supervision or professional medical advice.
        </p>
      </div>
    </div>
  );
}
