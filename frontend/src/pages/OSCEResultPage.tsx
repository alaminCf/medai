import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Layers,
  FileText,
  MessageSquare,
  ArrowRight,
  Download,
  ArrowLeft,
  Calendar,
  X,
} from 'lucide-react';
import { examsService } from '../services/examsService';
import { ExamResultResponse, StationResultSummary } from '../types';

export default function OSCEResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<ExamResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected station for deep-dive modal
  const [selectedStation, setSelectedStation] = useState<StationResultSummary | null>(null);
  const [activeStationTab, setActiveStationTab] = useState<'rubric' | 'transcript'>('rubric');

  useEffect(() => {
    if (!attemptId) {
      navigate('/exams');
      return;
    }
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await examsService.getExamResult(attemptId!);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load examination result.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 border-3 border-navy-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-700">
            Compiling Objective Structured Clinical Examination (OSCE) Report...
          </p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Result Not Ready</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            {error || 'Unable to access examination result.'}
          </p>
          <button
            onClick={() => navigate('/exams')}
            className="w-full py-2.5 bg-navy-900 text-white text-xs font-semibold rounded-xl"
          >
            Return to Clinical Examinations
          </button>
        </div>
      </div>
    );
  }

  const isPassed = result.outcome === 'passed';
  const isReview = result.outcome === 'review_required';

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/exams')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-navy-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Clinical Examinations</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-xs font-semibold rounded-xl shadow-sm flex items-center gap-2 text-gray-700 transition-colors print:hidden"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>

        {/* Premium Result Hero Header */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-navy-50 text-navy-900 text-xs font-bold uppercase tracking-wider rounded-full">
                  Educational OSCE Simulation
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(result.startedAt).toLocaleDateString()}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                {result.examTitle}
              </h1>
              <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
                {result.examDescription || 'Standardized 5-station clinical examination evaluating history taking, red flag screening, and patient communication.'}
              </p>
            </div>

            {/* Overall Outcome & Total Score Card */}
            <div className="bg-gray-50 border border-gray-200/90 rounded-2xl p-5 flex items-center gap-6 min-w-[300px]">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Total Assessment Score
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-navy-900">
                    {result.totalScore}
                  </span>
                  <span className="text-sm font-semibold text-gray-500">
                    / {result.totalMarks}
                  </span>
                </div>
                <p className="text-xs font-bold text-navy-900">
                  {result.percentage}% Overall
                </p>
              </div>

              <div className="h-12 w-px bg-gray-200" />

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Assessment Outcome
                </span>
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                      isPassed
                        ? 'bg-emerald-100 text-emerald-800'
                        : isReview
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : isReview ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{result.outcome.replace('_', ' ')}</span>
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">
                  Pass Mark: {result.passingPercentage}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Domain Performance Breakdown */}
        {result.domainBreakdown && Object.keys(result.domainBreakdown).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-navy-900" />
              <span>Clinical Skills Domain Breakdown</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {Object.entries(result.domainBreakdown).map(([domain, stats]) => (
                <div key={domain} className="p-4 bg-gray-50/80 border border-gray-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800">{domain}</span>
                    <span className="font-bold text-navy-900">{stats.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        stats.percentage >= 70
                          ? 'bg-emerald-500'
                          : stats.percentage >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, stats.percentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400">
                    <span>Awarded: {stats.marksAwarded}</span>
                    <span>Max: {stats.maximumMarks}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Station-by-Station Reports */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              Station Performance & Evidence ({result.stations.length} Stations)
            </h2>
            <span className="text-xs text-gray-400">
              Click any station to inspect conversation evidence and detailed rubric criteria
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {result.stations.map((st) => {
              const stationPassed = st.outcome === 'passed';
              const stationReview = st.outcome === 'review_required';

              return (
                <div
                  key={st.stationId}
                  className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-navy-50 text-navy-900 flex items-center justify-center font-bold text-xs">
                        #{st.stationNumber}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{st.title}</h3>
                        <p className="text-xs text-gray-400">
                          AI Patient: {st.patient?.patientName || st.patient?.name || 'Standardized AI Patient'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end md:self-auto">
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-medium">Station Score</p>
                        <p className="text-sm font-bold text-navy-900">
                          {st.score} / {st.maximumScore} ({st.percentage}%)
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          stationPassed
                            ? 'bg-emerald-100 text-emerald-800'
                            : stationReview
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {st.outcome.replace('_', ' ')}
                      </span>

                      <button
                        onClick={() => {
                          setSelectedStation(st);
                          setActiveStationTab('rubric');
                        }}
                        className="px-3.5 py-1.5 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <span>Review Station</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Evidence Strengths & Suggested Improvements Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Strengths with Evidence */}
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100/80 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Evidence-Based Strengths:</span>
                      </div>
                      <ul className="space-y-1.5 text-emerald-800">
                        {st.strengths && st.strengths.length > 0 ? (
                          st.strengths.map((str, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                              <span className="text-emerald-500 font-bold">•</span>
                              <span>{str}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-400 italic">No specific strengths captured.</li>
                        )}
                      </ul>
                    </div>

                    {/* Areas for Improvement */}
                    <div className="p-4 bg-amber-50/50 border border-amber-100/80 rounded-2xl space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Targeted Areas for Improvement:</span>
                      </div>
                      <ul className="space-y-1.5 text-amber-800">
                        {st.improvements && st.improvements.length > 0 ? (
                          st.improvements.map((imp, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{imp}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-400 italic">No major omissions detected.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Retake & Navigation Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Examination Attempt ID: <span className="font-mono text-gray-700">{result.attemptId}</span>
          </p>

          <button
            onClick={() => navigate('/exams')}
            className="px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Return to Exam Hub
          </button>
        </div>
      </div>

      {/* Station Detailed Review Modal */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 text-xs font-bold text-navy-900 bg-navy-50 rounded-full">
                    Station {selectedStation.stationNumber} Review
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs font-bold text-gray-700">
                    Score: {selectedStation.score} / {selectedStation.maximumScore} ({selectedStation.percentage}%)
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{selectedStation.title}</h3>
              </div>

              <button
                onClick={() => setSelectedStation(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Instructions Reference */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 text-xs text-gray-700 leading-relaxed flex-shrink-0">
              <span className="font-bold text-gray-900 block mb-1">Candidate Instructions Provided:</span>
              <p>{selectedStation.candidateInstructions}</p>
            </div>

            {/* Tabs: OSCE Rubric Items vs Conversation Transcript */}
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2 flex-shrink-0">
              <button
                onClick={() => setActiveStationTab('rubric')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeStationTab === 'rubric'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>OSCE Marking Criteria ({selectedStation.items.length})</span>
              </button>

              <button
                onClick={() => setActiveStationTab('transcript')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeStationTab === 'transcript'
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Consultation Transcript ({selectedStation.transcript.length})</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {activeStationTab === 'rubric' ? (
                <div className="space-y-3">
                  {selectedStation.items.map((it) => {
                    const isAchieved = it.status === 'achieved';
                    const isPartial = it.status === 'partially_achieved';

                    return (
                      <div
                        key={it.id}
                        className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 transition-colors space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-semibold">
                                {it.category}
                              </span>
                              {it.isCritical && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">
                                  Critical Safety Item
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">{it.criterion}</h4>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                                isAchieved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPartial
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {it.status.replace('_', ' ')}
                            </span>
                            <p className="text-xs font-bold text-navy-900 mt-1">
                              {it.marksAwarded} / {it.maximumMarks} Marks
                            </p>
                          </div>
                        </div>

                        {/* Evidence quote */}
                        {it.evidence && (
                          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-700 italic">
                            <span className="font-semibold text-gray-500 not-italic">Candidate Evidence: </span>
                            "{it.evidence}"
                          </div>
                        )}

                        {it.feedback && (
                          <p className="text-gray-500 text-[11px] leading-relaxed">
                            {it.feedback}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Conversation Transcript */
                <div className="space-y-3 p-2">
                  {selectedStation.transcript.map((m) => {
                    const isCandidate = m.sender === 'student';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isCandidate ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] text-gray-400 px-1 mb-0.5">
                          {isCandidate ? 'Candidate' : 'AI Patient'}
                        </span>
                        <div
                          className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                            isCandidate
                              ? 'bg-navy-900 text-white rounded-tr-none'
                              : 'bg-gray-100 text-gray-800 rounded-tl-none'
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={() => setSelectedStation(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
              >
                Close Station Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
