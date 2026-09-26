import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  FileText,
  ArrowLeft,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Brain,
  MessageSquare,
  Compass,
  HeartHandshake,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import sessionsService from '../services/sessionsService';
import type { EvaluationReportData, PracticeAttempt } from '../types';

export const ClinicalEvaluationPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<EvaluationReportData | null>(null);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'covered' | 'partial' | 'missed'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    loadEvaluationData();
  }, [sessionId]);

  const loadEvaluationData = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [evalData, attemptsData] = await Promise.all([
        sessionsService.getEvaluation(sessionId),
        sessionsService.getAttempts(sessionId).catch(() => ({ attempts: [] })),
      ]);
      setReportData(evalData);
      setAttempts(attemptsData.attempts || []);

      // Default expand all categories
      const initialExpanded: Record<string, boolean> = {};
      evalData.evaluation.evidence.forEach((ev) => {
        initialExpanded[ev.category] = true;
      });
      setExpandedCategories(initialExpanded);
    } catch (err: any) {
      console.error('Failed to load clinical evaluation:', err);
      setError(
        err.response?.data?.message ||
          'Your consultation was saved. Evaluation is temporarily unavailable. You can retry generation below.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetryConsultation = async () => {
    if (!sessionId || retrying) return;
    setRetrying(true);
    try {
      await sessionsService.retrySession(sessionId);
      navigate(`/sessions/${sessionId}`);
    } catch (err) {
      console.error('Failed to restart consultation:', err);
      setRetrying(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-400 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-white">Analyzing Clinical Consultation...</h2>
        <p className="text-slate-400 text-sm mt-1 max-w-md text-center">
          Synthesizing history coverage, communication patterns, and clinical reasoning against structured rubric criteria.
        </p>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 max-w-lg w-full text-center shadow-xl">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Evaluation Status</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            {error || 'Unable to retrieve clinical evaluation report.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={loadEvaluationData}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl text-sm transition"
            >
              Retry Evaluation
            </button>
            <Link
              to={`/history/${sessionId}`}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl text-sm transition"
            >
              View Raw Transcript
            </Link>
            <Link
              to="/dashboard"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-medium rounded-xl text-sm transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { session, attempt, evaluation } = reportData;
  const patientCase = session.patientCase;

  // Filter evidence
  const filteredEvidence = evaluation.evidence.filter((item) => {
    if (selectedFilter === 'all') return true;
    return item.status === selectedFilter;
  });

  // Group filtered evidence by category
  const evidenceByCategory = filteredEvidence.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof evaluation.evidence>);

  // Score badge helper
  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: 'Strong Clinical Performance', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    if (score >= 70) return { label: 'Competent History', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' };
    if (score >= 50) return { label: 'Developing Skills', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    return { label: 'Needs Structured Practice', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
  };

  const badge = getScoreBadge(evaluation.overallScore);

  const missedItems = evaluation.evidence.filter(
    (e) => e.status === 'missed' && (e.importance === 'required' || e.importance === 'red_flag')
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                  Consultation Complete
                </span>
                <span className="text-xs text-slate-400">
                  Attempt #{attempt.attemptNumber}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Clinical Performance Report
              </h1>
              <p className="text-sm text-slate-400">
                Patient: <span className="text-slate-200 font-medium">{patientCase.patientName}</span> ({patientCase.title})
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRetryConsultation}
              disabled={retrying}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-teal-900/30"
            >
              <RotateCcw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              Try Again
            </button>
            <Link
              to={`/history/${sessionId}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-medium rounded-xl text-sm border border-slate-800 transition"
            >
              <FileText className="w-4 h-4" />
              Review Conversation
            </Link>
          </div>
        </div>

        {/* Medical Education Safety Notice */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-400">
          <ShieldAlert className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">Educational Simulation:</strong> Techboloy Med is an educational clinical simulation and does not replace supervised medical training or professional medical judgment. All feedback is calibrated against simulated educational rubrics.
          </p>
        </div>

        {/* Overall Score & High-Level Summary Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Score Wheel / Hero */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Overall Clinical Rating
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight">
                  {evaluation.overallScore}
                </span>
                <span className="text-2xl font-bold text-slate-500">/ 100</span>
              </div>
              <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                <Award className="w-3.5 h-3.5" />
                {badge.label}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-8">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Covered Areas
                </span>
                <p className="text-xl font-bold text-emerald-400 mt-1">
                  {evaluation.coveredCount} / {evaluation.totalCount}
                </p>
                <span className="text-[11px] text-slate-500">
                  {Math.round((evaluation.coveredCount / (evaluation.totalCount || 1)) * 100)}% coverage
                </span>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  Consultation Time
                </span>
                <p className="text-xl font-bold text-blue-400 mt-1">
                  {Math.floor((session.duration || 0) / 60)}m {(session.duration || 0) % 60}s
                </p>
                <span className="text-[11px] text-slate-500">
                  Est: {patientCase.estimatedDuration || 20}m
                </span>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 col-span-2 sm:col-span-1">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  History Score
                </span>
                <p className="text-xl font-bold text-purple-400 mt-1">
                  {evaluation.historyScore}%
                </p>
                <span className="text-[11px] text-slate-500">
                  Rubric weight: 40%
                </span>
              </div>
            </div>
          </div>

          {/* Personalized Learning Summary */}
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              Personalized Learning Summary
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/50">
              {evaluation.overallSummary}
            </p>
          </div>
        </div>

        {/* 5 Core Competency Domain Cards */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-teal-400" />
            Core Clinical Competencies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. History Taking */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200">History Taking</span>
                  <span className="text-lg font-bold text-teal-400">{evaluation.historyScore}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${evaluation.historyScore}%` }} />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Explored {evaluation.coveredCount} of {evaluation.totalCount} case-specific areas.
                  {evaluation.partialCount > 0 ? ` (${evaluation.partialCount} partially covered)` : ''}
                </p>
              </div>
            </div>

            {/* 2. Communication */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-sky-400" />
                    Communication
                  </span>
                  <span className="text-lg font-bold text-sky-400">{evaluation.communicationScore}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${evaluation.communicationScore}%` }} />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {evaluation.communicationFeedback?.questionStyle || 'Evaluated open vs closed questions and lay terminology.'}
                </p>
              </div>
            </div>

            {/* 3. Clinical Reasoning */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-purple-400" />
                    Clinical Reasoning
                  </span>
                  <span className="text-lg font-bold text-purple-400">{evaluation.reasoningScore}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${evaluation.reasoningScore}%` }} />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {evaluation.prematureDiagnosis
                    ? '⚠️ Premature diagnostic assumption detected.'
                    : evaluation.reasoningFeedback?.redFlagExploration || 'Hypothesis testing and red flag screening.'}
                </p>
              </div>
            </div>

            {/* 4. Patient-Centeredness */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-rose-400" />
                    Patient-Centeredness
                  </span>
                  <span className="text-lg font-bold text-rose-400">{evaluation.patientCenterednessScore}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${evaluation.patientCenterednessScore}%` }} />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {evaluation.communicationFeedback?.empathy || 'Exploration of patient concerns, ideas, and reassurance.'}
                </p>
              </div>
            </div>

            {/* 5. Consultation Structure */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between md:col-span-2 lg:col-span-2">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-200">Consultation Structure & Arc</span>
                  <span className="text-lg font-bold text-amber-400">{evaluation.structureScore}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${evaluation.structureScore}%` }} />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {evaluation.structureFeedback?.flow || 'Logical transition from presenting complaint to past medical history and closure.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & Actionable Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-slate-900/90 border border-emerald-500/20 rounded-2xl p-6">
            <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              What You Did Well
            </h3>
            {evaluation.strengths.length > 0 ? (
              <ul className="space-y-2.5 text-sm text-slate-300">
                {evaluation.strengths.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Continue practicing structured question opening.</p>
            )}
          </div>

          {/* Areas for Improvement */}
          <div className="bg-slate-900/90 border border-amber-500/20 rounded-2xl p-6">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              Areas for Practice & Improvement
            </h3>
            {evaluation.improvements.length > 0 ? (
              <ul className="space-y-2.5 text-sm text-slate-300">
                {evaluation.improvements.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-2" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">High performance achieved across all criteria.</p>
            )}
          </div>
        </div>

        {/* Missed Information & Questions You Should Have Considered */}
        {missedItems.length > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">
                What Did You Miss?
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              The following essential history areas were not explored during the consultation. Here is why each matters in this clinical scenario:
            </p>

            <div className="space-y-3">
              {missedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-200">
                      {item.title}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                      item.importance === 'red_flag'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {item.importance === 'red_flag' ? 'Critical Red Flag' : 'Required'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.feedback}
                  </p>
                </div>
              ))}
            </div>

            {evaluation.missedQuestions && evaluation.missedQuestions.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Questions you should have considered:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {evaluation.missedQuestions.map((q, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-slate-800/80 text-teal-300 px-3 py-1.5 rounded-lg border border-slate-700/60"
                    >
                      "{q}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Evidence-Based History Taking Checklist */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                Conversational Evidence & History Breakdown
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every feedback item is connected to conversational evidence from your interaction.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['all', 'covered', 'partial', 'missed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
                    selectedFilter === filter
                      ? 'bg-teal-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped Categories */}
          <div className="space-y-4">
            {Object.entries(evidenceByCategory).map(([category, items]) => {
              const isExpanded = expandedCategories[category] !== false;
              const coveredInCat = items.filter((i) => i.status === 'covered').length;

              return (
                <div key={category} className="border border-slate-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-4 bg-slate-950/60 hover:bg-slate-950 transition text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-white">{category}</span>
                      <span className="text-xs text-slate-500">
                        ({coveredInCat}/{items.length} covered)
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-slate-800/60 bg-slate-900/40 p-3 space-y-2.5">
                      {items.map((ev, idx) => (
                        <div key={idx} className="pt-2.5 first:pt-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              {ev.status === 'covered' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                              {ev.status === 'partial' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                              {ev.status === 'missed' && <XCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />}
                              <div>
                                <span className="text-sm font-medium text-slate-200">
                                  {ev.title}
                                </span>
                                {ev.studentQuote && (
                                  <div className="mt-1 text-xs text-teal-300/90 bg-teal-950/40 border border-teal-800/30 rounded-lg px-2.5 py-1.5">
                                    <span className="text-teal-400/60 font-semibold">You asked: </span>
                                    "{ev.studentQuote}"
                                  </div>
                                )}
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                  {ev.feedback}
                                </p>
                              </div>
                            </div>

                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              ev.status === 'covered'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : ev.status === 'partial'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}>
                              {ev.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Attempt History & Progression */}
        {attempts.length > 1 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              Attempt History & Progress Comparison
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Track how your clinical history-taking and communication evolve with repeated practice.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Attempt</th>
                    <th className="px-4 py-3">Overall Score</th>
                    <th className="px-4 py-3">History Taking</th>
                    <th className="px-4 py-3">Communication</th>
                    <th className="px-4 py-3">Clinical Reasoning</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {attempts.map((att) => (
                    <tr
                      key={att.id}
                      className={att.id === attempt.id ? 'bg-teal-950/20 font-medium' : 'hover:bg-slate-800/40'}
                    >
                      <td className="px-4 py-3.5 flex items-center gap-2">
                        <span>Attempt #{att.attemptNumber}</span>
                        {att.id === attempt.id && (
                          <span className="text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full border border-teal-500/30">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-white">
                        {att.overallScore !== null ? `${att.overallScore}%` : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-teal-300">
                        {att.historyScore !== null ? `${att.historyScore}%` : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-sky-300">
                        {att.communicationScore !== null ? `${att.communicationScore}%` : '-'}
                      </td>
                      <td className="px-4 py-3.5 text-purple-300">
                        {att.reasoningScore !== null ? `${att.reasoningScore}%` : '-'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <Link
            to="/dashboard"
            className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to={`/history/${sessionId}`}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium border border-slate-800 transition"
            >
              Full Transcript
            </Link>
            <button
              onClick={handleRetryConsultation}
              disabled={retrying}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-teal-900/30 flex items-center gap-1.5"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              Practice Case Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalEvaluationPage;
