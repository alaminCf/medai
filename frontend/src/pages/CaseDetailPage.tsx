import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { casesService } from '../services/casesService';
import { sessionsService } from '../services/sessionsService';
import type { PatientCase, ConsultationLanguage, ConsultationMode } from '../types';
import { DifficultyBadge, getPersonalityDescription } from '../utils/formatters';
import {
  ArrowLeft,
  Clock,
  Target,
  User,
  Stethoscope,
  AlertCircle,
  Mic,
  MessageSquare,
  Globe,
  Volume2,
} from 'lucide-react';
import { getApiError } from '../services/api';

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patientCase, setPatientCase] = useState<PatientCase | null>(null);
  const [rubricObjectives, setRubricObjectives] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  // Phase 2: Consultation Configuration
  const [selectedLanguage, setSelectedLanguage] = useState<ConsultationLanguage>('en');
  const [selectedMode, setSelectedMode] = useState<ConsultationMode>('voice');

  useEffect(() => {
    if (id) {
      casesService
        .getCase(id)
        .then((c) => {
          setPatientCase(c);
          return sessionsService.getCaseRubric(id);
        })
        .then((r) => {
          if (r.rubric?.learningObjectives?.length) {
            setRubricObjectives(r.rubric.learningObjectives);
          }
        })
        .catch(() => setError('Case not found.'))
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  const handleStart = async () => {
    if (!patientCase) return;
    setIsStarting(true);
    setError('');
    try {
      const { session } = await sessionsService.startSession(patientCase.id, {
        language: selectedLanguage,
        voiceEnabled: selectedMode === 'voice',
      });
      navigate(`/session/${session.id}`);
    } catch (err) {
      setError(getApiError(err));
      setIsStarting(false);
    }
  };

  const objectives: string[] = rubricObjectives.length > 0 ? rubricObjectives : (() => {
    try {
      return JSON.parse(patientCase?.clinicalData?.learningObjectives || '[]');
    } catch {
      return [];
    }
  })();

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!patientCase) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/cases')} className="btn-ghost mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Cases
        </button>
        <div className="card p-10 text-center">
          <p className="text-gray-400">Case not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => navigate('/cases')} className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Cases
      </button>

      <div className="card overflow-hidden">
        {/* Patient header */}
        <div className="bg-navy-900 px-6 py-8 text-center relative overflow-hidden">
          <div className="w-20 h-20 bg-teal-500/20 border-2 border-teal-400/40 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <User className="w-10 h-10 text-teal-300" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">{patientCase.patientName}</h1>
          <p className="text-navy-300 text-sm">
            {patientCase.patientAge} years old · {patientCase.patientGender} · {patientCase.category}
          </p>
        </div>

        {/* Info */}
        <div className="p-6 space-y-6">
          {/* Chief complaint */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <span>Chief Complaint</span>
            </p>
            <p className="text-gray-800 italic font-medium leading-relaxed">
              "{patientCase.chiefComplaint}"
            </p>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Difficulty</p>
              <DifficultyBadge difficulty={patientCase.difficulty} />
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Estimated Duration
              </p>
              <p className="text-sm font-semibold text-gray-900">{patientCase.estimatedDuration} minutes</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Category</p>
              <p className="text-sm font-semibold text-gray-900">{patientCase.category}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                Personality
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {getPersonalityDescription(patientCase.personality)}
              </p>
            </div>
          </div>

          {/* Consultation Settings: Language & Mode */}
          <div className="bg-gradient-to-br from-teal-50/60 to-blue-50/40 border border-teal-100 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-teal-600" />
              Consultation Mode & Language
            </h2>

            {/* Mode selection */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Consultation Mode</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedMode('voice')}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg border text-sm font-semibold transition-all ${
                    selectedMode === 'voice'
                      ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Mic className="w-4 h-4 text-teal-400" />
                  <span>Voice AI Patient</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('text')}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg border text-sm font-semibold transition-all ${
                    selectedMode === 'text'
                      ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span>Text Mode</span>
                </button>
              </div>
            </div>

            {/* Language selection */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-600" />
                <span>Consultation Language</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('en')}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all ${
                    selectedLanguage === 'en'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('bn')}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all ${
                    selectedLanguage === 'bn'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  বাংলা (Bangla)
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed pt-1">
              {selectedMode === 'voice'
                ? selectedLanguage === 'bn'
                  ? 'রোগীর সাথে মাইক্রোফোনের মাধ্যমে বাংলায় সরাসরি কথা বলতে পারবেন। রোগী বাংলায় উত্তর দেবে।'
                  : 'Speak naturally to the AI patient using your microphone. The AI patient will respond verbally in English.'
                : 'Practice taking history via keyboard chat. Voice fallback remains accessible.'}
            </p>
          </div>

          {/* Description */}
          {patientCase.description && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">About This AI Patient Case</p>
              <p className="text-sm text-gray-600 leading-relaxed">{patientCase.description}</p>
            </div>
          )}

          {/* Learning objectives */}
          {objectives.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-navy-700" />
                Learning Objectives
              </p>
              <ul className="space-y-2">
                {objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="w-5 h-5 bg-navy-50 text-navy-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Important educational notice */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <Stethoscope className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-1">Educational Clinical Simulation</p>
              <p className="text-xs text-blue-600 leading-relaxed">
                Techboloy Med is an educational AI patient clinical simulation and does not replace supervised medical training or professional medical judgment. Focus on structured history taking (SOCRATES).
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
            className="btn-primary w-full py-4 text-base shadow-md font-bold tracking-wide flex items-center justify-center gap-2"
          >
            {isStarting ? (
              <span className="flex items-center gap-2 justify-center">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Entering consultation room...
              </span>
            ) : (
              <>
                {selectedMode === 'voice' ? <Mic className="w-5 h-5 text-teal-300" /> : <Stethoscope className="w-5 h-5" />}
                {selectedMode === 'voice' ? 'Start Voice AI Patient Consultation' : 'Start Text AI Patient Consultation'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
