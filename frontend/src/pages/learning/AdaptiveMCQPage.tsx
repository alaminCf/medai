import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Sliders
} from 'lucide-react';
import learningService from '../../services/learningService';

export const AdaptiveMCQPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Setup options
  const [subject, setSubject] = useState(searchParams.get('subject') || 'Physiology');
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionType, setQuestionType] = useState('Mixed');
  const [difficulty, setDifficulty] = useState('All');

  // Quiz state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<any | null>(null);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Session summary
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<{ correct: number; total: number; accuracy: number }>({
    correct: 0,
    total: 0,
    accuracy: 0,
  });

  useEffect(() => {
    let interval: any = null;
    if (timerActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const handleStartSession = async () => {
    try {
      setIsSubmitting(true);
      const res = await learningService.startAdaptiveMCQ({
        subject,
        topic: topic || undefined,
        count: questionCount,
        questionType,
        difficulty: difficulty !== 'All' ? difficulty.toLowerCase() : undefined,
      });

      setSessionId(res.sessionId);
      setQuestions(res.questions || []);
      setCurrentIndex(0);
      setSelectedOption(null);
      setEvaluation(null);
      setSeconds(0);
      setTimerActive(true);
      setCompleted(false);
    } catch (err) {
      console.error('Failed to start adaptive quiz:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!sessionId || !selectedOption || isSubmitting) return;

    const currentQ = questions[currentIndex];
    try {
      setIsSubmitting(true);
      setTimerActive(false);

      const res = await learningService.submitAdaptiveMCQAnswer({
        sessionId,
        questionId: currentQ.id,
        selectedOption,
        responseTimeSeconds: seconds,
      });

      setEvaluation(res);
      if (res.isCorrect) {
        setResults(prev => ({ ...prev, correct: prev.correct + 1 }));
      }
    } catch (err) {
      console.error('Error evaluating answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setEvaluation(null);
      setSeconds(0);
      setTimerActive(true);
    } else {
      const total = questions.length;
      const correct = evaluation?.isCorrect ? results.correct : results.correct;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      setResults({ correct, total, accuracy });
      setCompleted(true);
    }
  };

  // Completion Screen
  if (completed) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-8">
        <div className="w-20 h-20 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600 shadow-xl shadow-teal-600/10">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Adaptive Session Complete</h1>
          <p className="text-slate-500 text-sm">
            Your performance telemetry has been recorded. Weak concepts have been queued for spaced reinforcement.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Learning Performance</div>
          <div className="text-5xl font-black text-slate-900">{results.accuracy}%</div>
          <div className="text-sm font-semibold text-slate-600">
            {results.correct} correct out of {results.total} questions
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div className="p-4 rounded-2xl bg-teal-50 text-teal-800 text-left">
              <div className="text-xs font-bold uppercase text-teal-600">Correct Recall</div>
              <div className="text-2xl font-black mt-1">{results.correct}</div>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50 text-rose-800 text-left">
              <div className="text-xs font-bold uppercase text-rose-600">Mistakes Logged</div>
              <div className="text-2xl font-black mt-1">{results.total - results.correct}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/progress/mistakes')}
            className="px-6 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-sm text-slate-700 transition"
          >
            Review Mistake Bank
          </button>
          <button
            onClick={() => {
              setSessionId(null);
              setCompleted(false);
            }}
            className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 font-bold text-sm text-white shadow-md transition"
          >
            Start Another Quiz
          </button>
        </div>
      </div>
    );
  }

  // Active Quiz View
  if (sessionId && questions.length > 0) {
    const currentQ = questions[currentIndex];

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 uppercase">
              {currentQ.questionType || 'Conceptual'}
            </span>
            <span className="text-xs font-bold text-slate-400">
              {currentQ.subject} {currentQ.topic ? `• ${currentQ.topic}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5" />
              <span>{Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}</span>
            </div>
            <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-indigo-600 transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
          <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed">
            {currentQ.question}
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2">
            {['A', 'B', 'C', 'D'].map(opt => {
              const optText = currentQ[`option${opt}`];
              if (!optText) return null;

              const isSelected = selectedOption === opt;
              let btnStyle = 'border-slate-200 hover:border-teal-400 hover:bg-slate-50 text-slate-800';

              if (evaluation) {
                if (opt === evaluation.correctOption) {
                  btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                } else if (isSelected && !evaluation.isCorrect) {
                  btnStyle = 'border-rose-500 bg-rose-50 text-rose-900 font-bold';
                } else {
                  btnStyle = 'border-slate-100 opacity-60 text-slate-400';
                }
              } else if (isSelected) {
                btnStyle = 'border-teal-600 bg-teal-50/80 text-teal-950 font-bold ring-2 ring-teal-500';
              }

              return (
                <button
                  key={opt}
                  disabled={evaluation !== null}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full p-4 rounded-2xl border text-left transition flex items-center gap-4 ${btnStyle}`}
                >
                  <div className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {opt}
                  </div>
                  <div className="text-sm sm:text-base leading-relaxed flex-1">
                    {optText}
                  </div>
                  {evaluation && opt === evaluation.correctOption && (
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  )}
                  {evaluation && isSelected && !evaluation.isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Post-submission Evaluation & Explanation */}
          {evaluation && (
            <div className="pt-6 border-t border-slate-100 space-y-4 animate-in fade-in duration-300">
              {/* Learning Difficulty progression notice */}
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>Learning Difficulty: {evaluation.learningDifficultyAdvice}</span>
              </div>

              {/* Explanation block */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Explanation</span>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    Concept: {evaluation.conceptTested}
                  </span>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">{evaluation.explanation}</p>
                {evaluation.sourceReference && (
                  <div className="text-xs text-slate-400 italic pt-1">
                    Source: {evaluation.sourceReference}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 flex items-center justify-end">
            {!evaluation ? (
              <button
                disabled={!selectedOption || isSubmitting}
                onClick={handleSubmitAnswer}
                className="px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition"
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Answer'}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
              >
                {currentIndex + 1 < questions.length ? 'Next Question' : 'Complete Quiz'}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Setup / Configuration Launcher Screen
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Adaptive Quiz Mode
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Advanced MCQ Engine</h1>
        <p className="text-slate-500 text-sm mt-1">
          Dynamic questions tailored to your performance history, reinforcing active misconceptions.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-teal-600" />
          Configure Quiz Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Physiology">Physiology</option>
              <option value="Anatomy">Anatomy</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Pathology">Pathology</option>
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Topic (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Cardiovascular System, Renal, etc."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Question Type</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Mixed">Mixed (All Types)</option>
              <option value="Recall">Recall (Definitions & Facts)</option>
              <option value="Conceptual">Conceptual (Mechanisms & Pathways)</option>
              <option value="Clinical Scenario">Clinical Scenario (Vignettes)</option>
              <option value="Application">Application (Formulas & Loops)</option>
              <option value="Reasoning">Reasoning (Cause & Effect)</option>
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Initial Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="All">Adaptive Auto-Calibration</option>
              <option value="Easy">Easy (Foundational)</option>
              <option value="Medium">Medium (Standard)</option>
              <option value="Hard">Hard (Challenging)</option>
            </select>
          </div>

          {/* Count */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Question Count</label>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map(cnt => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setQuestionCount(cnt)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                    questionCount === cnt
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Questions prioritize unresolved mistakes from your Mistake Bank.
          </p>
          <button
            onClick={handleStartSession}
            disabled={isSubmitting}
            className="px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
          >
            {isSubmitting ? 'Loading Questions...' : 'Start Adaptive Quiz'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdaptiveMCQPage;
