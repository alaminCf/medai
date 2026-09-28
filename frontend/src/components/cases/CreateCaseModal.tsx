import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Sparkles,
  Stethoscope,
  HeartPulse,
  Brain,
  Pill,
  Flame,
  Globe,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { casesService } from '../../services/casesService';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const quickTopics = [
  { topic: 'Acute Retrosternal Chest Pain', specialty: 'Cardiology', icon: HeartPulse, diff: 'intermediate' },
  { topic: 'Acute Asthma Wheezing & Breathlessness', specialty: 'Respiratory', icon: Stethoscope, diff: 'beginner' },
  { topic: 'Migratory Right Lower Quadrant Pain', specialty: 'Gastroenterology', icon: Pill, diff: 'intermediate' },
  { topic: 'Unilateral Pulsatile Throbbing Headache', specialty: 'Neurology', icon: Brain, diff: 'beginner' },
  { topic: 'High-Grade Dengue Fever with Body Ache', specialty: 'Infectious Disease', icon: Flame, diff: 'beginner' },
];

const specialties = [
  'Cardiology',
  'Respiratory',
  'Gastroenterology',
  'Neurology',
  'Infectious Disease',
  'General Medicine',
  'Emergency Medicine',
  'Endocrinology',
  'Surgery',
  'Pediatrics',
];

export default function CreateCaseModal({ isOpen, onClose, onCreated }: CreateCaseModalProps) {
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [specialty, setSpecialty] = useState('Cardiology');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female'>('Male');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSelectQuickTopic = (item: typeof quickTopics[0]) => {
    setTopic(item.topic);
    setSpecialty(item.specialty);
    setDifficulty(item.diff as any);
  };

  const handleGenerateAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please enter a clinical topic or chief complaint.');
      return;
    }

    try {
      setError('');
      setIsGenerating(true);

      // 1. Generate Case in Backend
      const createdCase = await casesService.generateCase({
        topic: topic.trim(),
        specialty,
        difficulty,
        language,
        patientGender,
      });

      // 2. Automatically quick-connect to create session
      const { sessionId } = await casesService.quickConnect({
        caseId: createdCase.id,
        language,
        voiceEnabled: true,
        avatarEnabled: true,
      });

      if (onCreated) onCreated();
      onClose();

      // 3. Navigate directly into consultation room!
      navigate(`/session/${sessionId}`);
    } catch (err: any) {
      console.error('Failed to generate patient topic:', err);
      setError(err?.response?.data?.error || 'Failed to create patient topic. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-navy-900">Create / Generate Patient Topic</h2>
              <p className="text-xs text-gray-500">Instant AI Virtual Patient clinical simulation setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-200/60 flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Select Popular Topics */}
          <div>
            <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block mb-2">
              Popular Clinical Topics (1-Click Fill)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickTopics.map((qt, idx) => {
                const Icon = qt.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectQuickTopic(qt)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-teal-50 hover:border-teal-300 text-gray-700 flex items-center gap-1.5 transition text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-teal-600" />
                    <span>{qt.topic}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleGenerateAndConnect} id="generate-patient-form" className="space-y-4">
            {/* Custom Topic Input */}
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1.5">
                Clinical Topic or Chief Complaint <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Acute Appendicitis, Severe Migraine, Dengue Fever, Diabetic Ulcer..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Type any medical condition or symptom you want to practice taking history for.
              </span>
            </div>

            {/* Specialty & Difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1.5">Medical Specialty</label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {specialties.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1.5">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`py-2 text-xs font-bold capitalize rounded-xl border transition ${
                        difficulty === d
                          ? 'bg-navy-900 text-white border-navy-900 shadow-2xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Language & Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1.5 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-teal-600" /> Consultation Language
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      language === 'en'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('bn')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      language === 'bn'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    বাংলা (Bangla)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-800 block mb-1.5">Patient Gender</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Male', 'Female'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setPatientGender(g)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        patientGender === g
                          ? 'bg-navy-900 text-white border-navy-900 shadow-2xs'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Features Info Box */}
            <div className="p-3.5 bg-teal-50/70 border border-teal-100 rounded-xl space-y-1 text-xs text-teal-950">
              <p className="font-bold flex items-center gap-1.5 text-teal-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                Automatic Clinical Synthesis:
              </p>
              <p className="text-[11px] text-teal-800/90 leading-relaxed">
                The platform will automatically generate full patient demographics, realistic onset, symptoms, medical history, medications, allergies, and objective grading rubrics.
              </p>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="generate-patient-form"
            disabled={isGenerating || !topic.trim()}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating & Connecting...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate & Connect Patient</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
