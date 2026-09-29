import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Clock,
  Layers,
  Award,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  History,
  Lock,
  ChevronRight,
  Globe,
  Radio,
} from 'lucide-react';
import { examsService } from '../services/examsService';
import { ClinicalExam } from '../types';

export default function ExamHubPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ClinicalExam[]>([]);
  const [myAttempts, setMyAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');

  // Selected Exam for pre-exam rules modal
  const [selectedExam, setSelectedExam] = useState<ClinicalExam | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'bn'>('en');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedExams, fetchedAttempts] = await Promise.all([
        examsService.getExams(),
        examsService.getMyExams(),
      ]);
      setExams(fetchedExams || []);
      setMyAttempts(fetchedAttempts || []);
    } catch (err: any) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!selectedExam || !rulesAccepted) return;
    try {
      setIsStarting(true);
      setErrorMsg(null);

      // Request fullscreen if required or supported
      if (selectedExam.fullscreenRequired && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (e) {
          console.warn('Fullscreen request dismissed');
        }
      }

      const res = await examsService.startExam(selectedExam.id, selectedLanguage);
      if (res.stations && res.stations.length > 0) {
        const firstStation = res.stations[0];
        navigate(`/exams/${selectedExam.id}/station/${firstStation.stationId}?attempt=${res.attemptId}`);
      } else {
        setErrorMsg('Exam contains no stations.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to start examination.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-navy-900 text-white rounded-full">
              Formal Exam Mode
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">
              Server-Authoritative Timers
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Clinical Examination (OSCE)
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Experience structured multi-station clinical consultations under formal exam conditions.
            Interact with realistic virtual patients, manage strict station time limits, and receive objective rubric marking.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'available'
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Exam Library
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4" />
            My Exam History ({myAttempts.length})
          </button>
        </div>
      </div>

      {/* Educational Notice Banner */}
      <div className="flex items-start gap-3 p-4 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-amber-900 text-xs leading-relaxed">
        <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Educational Simulation Notice:</span> This examination module is designed for medical training and clinical communication assessment. It uses deterministic OSCE rubrics to evaluate history-taking thoroughness and does not replace official university licensing or board certifications.
        </div>
      </div>

      {/* Main Content Tabs */}
      {activeTab === 'available' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Available Examinations</h2>
            <span className="text-xs text-gray-500">{exams.length} Published Exam</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Published Active Exams */}
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white border border-gray-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 text-xs font-semibold text-navy-900 bg-navy-50 rounded-lg">
                        {exam.stationCount} Stations
                      </span>
                      <span className="px-2.5 py-1 text-xs font-medium capitalize text-gray-600 bg-gray-100 rounded-lg">
                        {exam.difficulty}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-navy-900 transition-colors">
                        {exam.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                        {exam.description || 'Comprehensive clinical examination assessing history taking, red-flag screening, and communication.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{exam.durationMinutes} mins total</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-gray-400" />
                        <span>Pass mark: {exam.passingPercentage}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-gray-400" />
                        <span>Voice & Text</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-gray-400" />
                        <span>5 Focused Stations</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedExam(exam);
                      setRulesAccepted(false);
                      setErrorMsg(null);
                    }}
                    className="mt-6 w-full py-3 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow"
                  >
                    <span>Start Exam</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* Architecture-Ready Placeholder Cards */}
              <div className="bg-gray-50/70 border border-dashed border-gray-200 rounded-2xl p-6 flex flex-col justify-between opacity-80">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <span className="px-2.5 py-1 text-xs font-semibold text-gray-500 bg-gray-200/60 rounded-lg">
                      Architecture Ready
                    </span>
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-700">
                      Communication & Difficult News Station
                    </h3>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      Empathy, patient-centered counseling, and ethical communication station protocols.
                    </p>
                  </div>
                </div>
                <div className="mt-6 py-2.5 text-center text-xs text-gray-400 font-medium bg-gray-100/60 rounded-xl">
                  Upcoming Module
                </div>
              </div>

              <div className="bg-gray-50/70 border border-dashed border-gray-200 rounded-2xl p-6 flex flex-col justify-between opacity-80">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <span className="px-2.5 py-1 text-xs font-semibold text-gray-500 bg-gray-200/60 rounded-lg">
                      Architecture Ready
                    </span>
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-700">
                      Emergency Triage & Acute History
                    </h3>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                      High-pressure 4-minute resuscitation and emergency medicine red flag screening.
                    </p>
                  </div>
                </div>
                <div className="mt-6 py-2.5 text-center text-xs text-gray-400 font-medium bg-gray-100/60 rounded-xl">
                  Upcoming Module
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* My Exam History Tab */
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Your Examination Attempts</h2>
          {myAttempts.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No exam attempts recorded</p>
              <p className="text-xs text-gray-400 mt-1">
                Complete a clinical examination to view your objective marks and feedback report.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Examination</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Score</th>
                    <th className="py-3.5 px-4">Percentage</th>
                    <th className="py-3.5 px-4">Outcome</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myAttempts.map((att) => {
                    const isPassed = att.outcome === 'passed';
                    const isReview = att.outcome === 'review_required';
                    return (
                      <tr key={att.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4 font-semibold text-gray-900">
                          {att.clinicalExam?.title || 'Clinical OSCE'}
                        </td>
                        <td className="py-4 px-4 text-gray-500">
                          {new Date(att.startedAt).toLocaleDateString()} {new Date(att.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-4 px-4 font-medium text-gray-800">
                          {att.totalScore !== null ? `${att.totalScore} / ${att.totalMarks || 100}` : 'Incomplete'}
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-900">
                          {att.percentage !== null ? `${att.percentage}%` : '—'}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                              isPassed
                                ? 'bg-emerald-100 text-emerald-800'
                                : isReview
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {att.outcome ? att.outcome.replace('_', ' ') : att.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {att.status === 'completed' ? (
                            <button
                              onClick={() => navigate(`/exams/results/${att.id}`)}
                              className="px-3 py-1.5 bg-navy-50 hover:bg-navy-100 text-navy-900 font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
                            >
                              <span>View Result</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-gray-400">Incomplete</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pre-Exam Rules & Instructions Modal */}
      {selectedExam && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 text-xs font-bold text-navy-900 bg-navy-50 rounded-full">
                  Candidate Briefing
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 font-medium">{selectedExam.stationCount} Stations ({selectedExam.durationMinutes} mins)</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                {selectedExam.title}
              </h2>
            </div>

            {/* Language Selection */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-navy-900" />
                Select Examination Consultation Language:
              </label>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('en')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                    selectedLanguage === 'en'
                      ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  English (Medical Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('bn')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                    selectedLanguage === 'bn'
                      ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  বাংলা (Bengali Standard)
                </button>
              </div>
            </div>

            {/* Examination Rules */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Formal Examination Rules:
              </h3>
              <div className="bg-gray-50/80 border border-gray-200/90 rounded-2xl p-4 space-y-2.5 text-xs text-gray-700 leading-relaxed max-h-56 overflow-y-auto">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-navy-900 flex-shrink-0 mt-0.5" />
                  <span><strong>Candidate Instructions:</strong> Read candidate instructions carefully before starting each station.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-navy-900 flex-shrink-0 mt-0.5" />
                  <span><strong>Authoritative Timer:</strong> The 6-minute station timer is strictly server-authoritative and cannot be paused.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-navy-900 flex-shrink-0 mt-0.5" />
                  <span><strong>No Hints / No Checklists:</strong> No clinical cues, rubric checklists, or scores are visible during consultation.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-navy-900 flex-shrink-0 mt-0.5" />
                  <span><strong>Standardized AI Patient:</strong> The patient responds according to case facts and will not reveal diagnoses or coach you.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-navy-900 flex-shrink-0 mt-0.5" />
                  <span><strong>Station Auto-Transition:</strong> At 00:00, the station terminates automatically and advances to the next candidate briefing.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-navy-900 flex-shrink-0 mt-0.5" />
                  <span><strong>Post-Exam Evaluation:</strong> Detailed structured OSCE marking and strengths feedback will be revealed only after the entire exam is completed.</span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Checkbox agreement */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-navy-900 rounded border-gray-300 focus:ring-navy-900"
              />
              <span className="text-xs text-gray-700 font-medium">
                I understand and agree to the examination rules. I am ready to begin Station 1.
              </span>
            </label>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rulesAccepted || isStarting}
                onClick={handleStartExam}
                className="px-6 py-2.5 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
              >
                {isStarting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Preparing Station 1...</span>
                  </>
                ) : (
                  <>
                    <span>Begin Examination</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
