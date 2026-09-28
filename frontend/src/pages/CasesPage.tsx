import { useEffect, useState } from 'react';
import { casesService } from '../services/casesService';
import type { PatientCase, CaseDifficulty } from '../types';
import { DifficultyBadge } from '../utils/formatters';
import {
  Search,
  Clock,
  Plus,
  Stethoscope,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreateCaseModal from '../components/cases/CreateCaseModal';

const specialties = [
  'All',
  'Cardiology',
  'Respiratory',
  'Gastroenterology',
  'Neurology',
  'Infectious Disease',
  'General Medicine',
];

const difficulties: Array<{ value: 'all' | CaseDifficulty; label: string }> = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function CasesPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | CaseDifficulty>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectingCaseId, setConnectingCaseId] = useState<string | null>(null);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setIsLoading(true);
      const data = await casesService.getCases();
      setCases(data);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickConnect = async (caseItem: PatientCase, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setConnectingCaseId(caseItem.id);
      const { sessionId } = await casesService.quickConnect({
        caseId: caseItem.id,
        language: (caseItem.voiceLanguage as any) || 'en',
        voiceEnabled: true,
        avatarEnabled: true,
      });
      navigate(`/session/${sessionId}`);
    } catch (err) {
      console.error('Failed to quick connect:', err);
      // Fallback: navigate to case detail
      navigate(`/cases/${caseItem.id}`);
    } finally {
      setConnectingCaseId(null);
    }
  };

  const filtered = cases.filter((c) => {
    const matchSpecialty =
      specialtyFilter === 'All' ||
      c.category.toLowerCase().includes(specialtyFilter.toLowerCase());
    const matchDiff = difficultyFilter === 'all' || c.difficulty === difficultyFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.patientName.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.chiefComplaint.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q);

    return matchSpecialty && matchDiff && matchSearch;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-navy-950 via-navy-900 to-teal-950 text-white p-6 sm:p-7 rounded-2xl shadow-md border border-navy-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] bg-teal-500/20 text-teal-300 font-extrabold px-2.5 py-0.5 rounded-full border border-teal-500/30">
              SIMULATED CLINICAL PATIENTS
            </span>
            <span className="text-[11px] text-gray-400 font-medium">Bilingual Voice & Text</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">AI Patient Cases & Clinical Topics</h1>
          <p className="text-gray-300 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Select any AI patient case to take a history, or create your own custom clinical topic to practice with an AI Patient immediately.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 active:scale-98 flex-shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Create / Generate AI Patient Topic</span>
        </button>
      </div>

      {/* Specialty Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {specialties.map((s) => (
          <button
            key={s}
            onClick={() => setSpecialtyFilter(s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              specialtyFilter === s
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search and Difficulty Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symptoms, diseases, or AI patient names..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {difficulties.map((d) => (
            <button
              key={d.value}
              onClick={() => setDifficultyFilter(d.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                difficultyFilter === d.value
                  ? 'bg-navy-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cases Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse rounded-2xl border border-gray-100">
              <div className="h-5 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3 mb-4" />
              <div className="h-8 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center rounded-2xl border border-gray-200">
          <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base mb-1">No matching clinical topics found</h3>
          <p className="text-gray-400 text-xs mb-4">
            Try adjusting your search filters or generate a custom AI patient case.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate This Case with AI</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="card p-5 rounded-2xl border border-gray-200 hover:border-teal-400/80 transition-all duration-200 hover:shadow-md cursor-pointer group flex flex-col justify-between"
            >
              <div>
                {/* Header: Patient Name & Badges */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-navy-900 to-teal-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-2xs">
                      {c.patientName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-navy-900 text-sm group-hover:text-teal-700 transition">
                        {c.patientName}
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        {c.patientAge} yrs · {c.patientGender}
                      </p>
                    </div>
                  </div>
                  <DifficultyBadge difficulty={c.difficulty} />
                </div>

                {/* Case Title */}
                <h4 className="font-bold text-gray-900 text-xs sm:text-sm mb-1 line-clamp-1">{c.title}</h4>

                {/* Chief Complaint Quote */}
                <div className="mb-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    Chief Complaint:
                  </p>
                  <p className="text-xs text-gray-700 italic line-clamp-2">"{c.chiefComplaint}"</p>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2 mb-4 text-[11px]">
                  <span className="font-semibold text-teal-800 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
                    {c.category}
                  </span>
                  <span className="text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {c.estimatedDuration} min
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-gray-400 group-hover:text-navy-900 font-medium">
                  Details →
                </span>

                <button
                  type="button"
                  onClick={(e) => handleQuickConnect(c, e)}
                  disabled={connectingCaseId === c.id}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  {connectingCaseId === c.id ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Connect Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Case Modal */}
      <CreateCaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={loadCases}
      />
    </div>
  );
}
