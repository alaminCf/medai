import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Award,
  RefreshCw,
  Check,
} from 'lucide-react';
import learningService from '../../services/learningService';
import type {
  MCQPracticeSession,
    MedicalSubject,
  QuestionBank,
} from '../../types';

export default function MCQPracticePage() {
  const [searchParams] = useSearchParams();
  const initialMaterialId = searchParams.get('materialId') || undefined;
  const initialSubject = searchParams.get('subject') || 'Physiology';
  const initialTopic = searchParams.get('topic') || '';

  const [subjects, setSubjects] = useState<MedicalSubject[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Configuration state
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState('Mixed');

  // Active Practice Session state
  const [session, setSession] = useState<MCQPracticeSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answeredState, setAnsweredState] = useState<{
    [questionId: string]: {
      selectedOption: 'A' | 'B' | 'C' | 'D';
      isCorrect: boolean;
      correctOption: 'A' | 'B' | 'C' | 'D';
      explanation: string;
      sourceReference?: string;
    };
  }>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [subjRes, banksRes] = await Promise.all([
        learningService.getSubjects(),
        learningService.getQuestionBanks(),
      ]);
      setSubjects(subjRes);
      setBanks(banksRes);
    } catch (err) {
      console.error('Failed to load MCQ data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async (bankId?: string) => {
    try {
      setIsLoading(true);
      const newSession = await learningService.startMCQSession({
        bankId,
        materialId: initialMaterialId,
        subject: selectedSubject,
        topic: selectedTopic || undefined,
        count: questionCount,
        difficulty,
      });
      setSession(newSession);
      setCurrentIndex(0);
      setSelectedOption(null);
      setAnsweredState({});
    } catch (err: any) {
      console.error('Failed to start MCQ practice:', err);
      alert(err.response?.data?.error || 'Failed to start practice session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!session || !selectedOption) return;
    const currentQ = session.questions[currentIndex];
    if (!currentQ || answeredState[currentQ.id]) return;

    try {
      setIsSubmitting(true);
      const res = await learningService.submitMCQAnswer(session.id, currentQ.id, selectedOption);
      setAnsweredState((prev) => ({
        ...prev,
        [currentQ.id]: {
          selectedOption,
          isCorrect: res.isCorrect,
          correctOption: res.correctOption,
          explanation: res.explanation,
          sourceReference: res.sourceReference,
        },
      }));
    } catch (err) {
      console.error('Failed to submit answer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (!session) return;
    if (currentIndex + 1 < session.questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      handleCompleteSession();
    }
  };

  const handleCompleteSession = async () => {
    if (!session) return;
    try {
      const completed = await learningService.completeMCQSession(session.id);
      setSession(completed);
    } catch (err) {
      console.error('Failed to complete session:', err);
    }
  };

  const currentQuestion = session?.questions[currentIndex];
  const currentAnswerInfo = currentQuestion ? answeredState[currentQuestion.id] : undefined;

  // Calculate live statistics
  const answeredCount = Object.keys(answeredState).length;
  const correctCount = Object.values(answeredState).filter((a) => a.isCorrect).length;
  const currentAccuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/learning" className="text-xs text-gray-500 hover:text-teal-700">
              Learning Hub
            </Link>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-xs font-semibold text-teal-800">MCQ Practice Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            Academic MCQ Practice & Exam Prep
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Server-protected multiple-choice question testing with instant clinical rationales and accuracy tracking.
          </p>
        </div>

        {session && session.status === 'IN_PROGRESS' && (
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to end this practice session?')) {
                handleCompleteSession();
              }
            }}
            className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg self-start sm:self-auto transition"
          >
            End Practice Session
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {!session ? (
        /* Configuration / Launcher Screen */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Setup Practice */}
          <div className="md:col-span-2 card p-6 space-y-5 border border-gray-200">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <h2 className="font-bold text-navy-900 text-base">Start Custom Practice Session</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Medical Subject *
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.category.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Topic / Subtopic (Optional)
                </label>
                <input
                  type="text"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  placeholder="e.g. Action Potentials, Valvular Disease, Antibiotics"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Number of Questions
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 20, 30].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuestionCount(num)}
                        className={`py-2 rounded-xl text-xs font-bold transition border ${
                          questionCount === num
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {num} Qs
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none"
                  >
                    <option value="Mixed">Mixed (Standard)</option>
                    <option value="Easy">Easy (Fundamentals)</option>
                    <option value="Medium">Medium (Clinical Vignettes)</option>
                    <option value="Hard">Hard (Board Exam Level)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => handleStartSession()}
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Start Practice Session</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (1 col): Existing Question Banks */}
          <div className="card p-5 space-y-3 border border-gray-200">
            <h3 className="font-bold text-navy-900 text-xs uppercase tracking-wider">
              Available Question Banks
            </h3>
            {banks.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                No pre-built banks. Start a custom practice on the left!
              </p>
            ) : (
              <div className="space-y-2">
                {banks.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => handleStartSession(b.id)}
                    className="p-3 bg-gray-50 hover:bg-teal-50/60 border border-gray-200 hover:border-teal-300 rounded-xl cursor-pointer transition text-left"
                  >
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded">
                      {b.subject}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 mt-1 line-clamp-1">{b.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{b.description}</p>
                    <span className="text-[10px] text-teal-700 font-semibold mt-1 block">
                      Practice this bank →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : session.status === 'COMPLETED' ? (
        /* Results Screen */
        <div className="card p-8 max-w-2xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">Practice Session Completed!</h2>
            <p className="text-xs text-gray-500 mt-1">
              Subject: {session.subject} {session.topic && `• Topic: ${session.topic}`}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-slate-50 p-4 rounded-xl border border-gray-200">
              <span className="text-xs text-gray-500 block">Questions</span>
              <span className="text-xl font-bold text-gray-900">{session.totalQuestions}</span>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <span className="text-xs text-emerald-800 block">Correct</span>
              <span className="text-xl font-bold text-emerald-700">{session.correctAnswers}</span>
            </div>
            <div className="bg-teal-50 p-4 rounded-xl border border-teal-200">
              <span className="text-xs text-teal-800 block">Accuracy</span>
              <span className="text-xl font-bold text-teal-700">
                {session.totalQuestions > 0
                  ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => handleStartSession()}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Practice Again
            </button>
            <button
              onClick={() => setSession(null)}
              className="btn-secondary text-xs"
            >
              Change Topic / Mode
            </button>
          </div>
        </div>
      ) : (
        /* Active Practice Questions Screen */
        <div className="card p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
          {/* Header Stats */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md">
                Question {currentIndex + 1} of {session.questions.length}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {session.subject}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="text-emerald-600">Correct: {correctCount}</span>
              <span className="text-gray-400">|</span>
              <span className="text-teal-700">Accuracy: {currentAccuracy}%</span>
            </div>
          </div>

          {currentQuestion && (
            <div className="space-y-5">
              {/* Question Text */}
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-snug">
                {currentQuestion.question}
              </h2>

              {/* 4 Options */}
              <div className="space-y-3 pt-2">
                {[
                  { key: 'A', text: currentQuestion.optionA },
                  { key: 'B', text: currentQuestion.optionB },
                  { key: 'C', text: currentQuestion.optionC },
                  { key: 'D', text: currentQuestion.optionD },
                ].map(({ key, text }) => {
                  const isSelected = selectedOption === key;
                  const isAnswered = !!currentAnswerInfo;
                  const isCorrectAnswer = currentAnswerInfo?.correctOption === key;
                  const isSelectedWrong = isAnswered && currentAnswerInfo?.selectedOption === key && !currentAnswerInfo.isCorrect;

                  let borderClass = 'border-gray-200 hover:border-gray-300 hover:bg-gray-50';
                  let bgClass = 'bg-white';
                  let textClass = 'text-gray-800';

                  if (isAnswered) {
                    if (isCorrectAnswer) {
                      borderClass = 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold';
                    } else if (isSelectedWrong) {
                      borderClass = 'border-red-400 bg-red-50 text-red-900';
                    } else {
                      borderClass = 'border-gray-100 opacity-60';
                    }
                  } else if (isSelected) {
                    borderClass = 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/20';
                    textClass = 'text-teal-950 font-semibold';
                  }

                  return (
                    <div
                      key={key}
                      onClick={() => {
                        if (!isAnswered) setSelectedOption(key as any);
                      }}
                      className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${borderClass} ${bgClass} ${textClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          isSelected && !isAnswered ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {key}
                        </span>
                        <span className="text-xs sm:text-sm">{text}</span>
                      </div>

                      {isAnswered && (
                        <div>
                          {isCorrectAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                          {isSelectedWrong && <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Rationale & Source Reference (Shown only AFTER submission) */}
              {currentAnswerInfo && (
                <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      currentAnswerInfo.isCorrect
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {currentAnswerInfo.isCorrect ? 'Correct Answer' : 'Incorrect'}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">
                      Correct: Option {currentAnswerInfo.correctOption}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 leading-relaxed">
                    <strong className="text-navy-900">Clinical Explanation: </strong>
                    {currentAnswerInfo.explanation}
                  </p>

                  {currentAnswerInfo.sourceReference && (
                    <p className="text-[11px] text-teal-700 font-medium pt-1">
                      📖 {currentAnswerInfo.sourceReference}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons: Submit or Next */}
              <div className="pt-4 flex items-center justify-end gap-3">
                {!currentAnswerInfo ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={!selectedOption || isSubmitting}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Submit Answer</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>{currentIndex + 1 < session.questions.length ? 'Next Question' : 'View Summary'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
