import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { casesService } from '../services/casesService';
import { sessionsService } from '../services/sessionsService';
import type { PatientCase } from '../types';
import { DifficultyBadge, getPersonalityDescription } from '../utils/formatters';
import { ArrowLeft, Clock, Target, User, Stethoscope, AlertCircle } from 'lucide-react';
import { getApiError } from '../services/api';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patientCase, setPatientCase] = useState<PatientCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) casesService.getCase(id).then(setPatientCase).catch(() => setError('Case not found.')).finally(() => setIsLoading(false));
  }, [id]);

  const handleStart = async () => {
    if (!patientCase) return;
    setIsStarting(true);
    setError('');
    try {
      const { session } = await sessionsService.startSession(patientCase.id);
      navigate(`/session/${session.id}`);
    } catch (err) {
      setError(getApiError(err));
      setIsStarting(false);
    }
  };

  const objectives: string[] = (() => {
    try { return JSON.parse(patientCase?.clinicalData?.learningObjectives || '[]'); } catch { return []; }
  })();

  if (isLoading) return <div className="p-6 flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" /></div>;

  if (!patientCase) return (
    <div className="p-6">
      <button onClick={() => navigate('/cases')} className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4" />Back to Cases</button>
      <div className="card p-10 text-center"><p className="text-gray-400">Case not found.</p></div>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate('/cases')} className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4" />Back to Cases
      </button>

      <div className="card overflow-hidden">
        {/* Patient header */}
        <div className="bg-navy-900 px-6 py-8 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">{patientCase.patientName.charAt(0)}</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">{patientCase.patientName}</h1>
          <p className="text-navy-300 text-sm">{patientCase.patientAge} years old · {patientCase.patientGender}</p>
        </div>

        {/* Info */}
        <div className="p-6 space-y-5">
          {/* Chief complaint */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1.5">Chief Complaint</p>
            <p className="text-gray-800 italic">"{patientCase.chiefComplaint}"</p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 mb-1">Difficulty</p>
              <DifficultyBadge difficulty={patientCase.difficulty} />
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" />Estimated Duration</p>
              <p className="text-sm font-semibold text-gray-900">{patientCase.estimatedDuration} minutes</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 mb-1">Category</p>
              <p className="text-sm font-semibold text-gray-900">{patientCase.category}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" />Patient Personality</p>
              <p className="text-sm font-semibold text-gray-900">{getPersonalityDescription(patientCase.personality)}</p>
            </div>
          </div>

          {/* Description */}
          {patientCase.description && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">About This Case</p>
              <p className="text-sm text-gray-600 leading-relaxed">{patientCase.description}</p>
            </div>
          )}

          {/* Learning objectives */}
          {objectives.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />Learning Objectives
              </p>
              <ul className="space-y-2">
                {objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="w-5 h-5 bg-navy-50 text-navy-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Important notice */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <Stethoscope className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-1">Before You Begin</p>
              <p className="text-xs text-blue-600 leading-relaxed">
                Practice open-ended questioning. Allow the patient to guide you. Do not try to confirm a diagnosis — focus on gathering history systematically.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleStart}
            disabled={isStarting}
            className="btn-primary w-full py-3.5 text-base"
          >
            {isStarting ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting consultation...
              </span>
            ) : (
              <>
                <Stethoscope className="w-4 h-4" />
                Meet Patient
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
