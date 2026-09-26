import { useEffect, useState } from 'react';
import { casesService } from '../services/casesService';
import type { PatientCase, CaseDifficulty } from '../types';
import { DifficultyBadge } from '../utils/formatters';
import { Search, Clock, User, ChevronRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const difficulties: Array<{ value: 'all' | CaseDifficulty; label: string }> = [
  { value: 'all', label: 'All Cases' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function CasesPage() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | CaseDifficulty>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    casesService.getCases().then(setCases).finally(() => setIsLoading(false));
  }, []);

  const filtered = cases.filter(c => {
    const matchDiff = filter === 'all' || c.difficulty === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.patientName.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) || c.chiefComplaint.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q);
    return matchDiff && matchSearch;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Patient Cases</h1>
        <p className="text-gray-500 text-sm">Select a patient case to begin your consultation.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cases..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {difficulties.map(d => (
            <button
              key={d.value}
              onClick={() => setFilter(d.value)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === d.value
                  ? 'bg-navy-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cases grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No cases found. Try adjusting your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(c => <CaseCard key={c.id} patientCase={c} onClick={() => navigate(`/cases/${c.id}`)} />)}
        </div>
      )}
    </div>
  );
}

function CaseCard({ patientCase: c, onClick }: { patientCase: PatientCase; onClick: () => void }) {
  const objectives: string[] = (() => {
    try { return JSON.parse(c.clinicalData?.learningObjectives || '[]'); } catch { return []; }
  })();

  return (
    <div onClick={onClick} className="card-hover p-5 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-base font-bold text-navy-800">{c.patientName.charAt(0)}</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{c.patientName}</h3>
            <p className="text-xs text-gray-400">{c.patientAge} years · {c.patientGender}</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-navy-600 transition-colors mt-1" />
      </div>

      <div className="mb-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Chief Complaint</p>
        <p className="text-sm text-gray-700 leading-relaxed">"{c.chiefComplaint}"</p>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <DifficultyBadge difficulty={c.difficulty} />
        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{c.category}</span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.estimatedDuration} min</span>
        <span className="flex items-center gap-1"><User className="w-3 h-3" />{objectives.length} objectives</span>
        <span className="font-medium text-navy-700 group-hover:underline">Start Consultation →</span>
      </div>
    </div>
  );
}
