import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MessageSquare,
  ArrowRight,
  Mic,
  MicOff,
  CheckCircle2,
  Award,
  RefreshCw,
  Send,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import learningService from '../../services/learningService';
import type { VivaSession, MedicalSubject } from '../../types';

export default function VivaPracticePage() {
  const [searchParams] = useSearchParams();
  const initialMaterialId = searchParams.get('materialId') || undefined;
  const initialSubject = searchParams.get('subject') || 'Physiology';
  const initialTopic = searchParams.get('topic') || 'Cardiac Cycle';

  const [subjects, setSubjects] = useState<MedicalSubject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Setup state
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);
  const [difficulty, setDifficulty] = useState('Standard');
  const [vivaMode, setVivaMode] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [questionCount] = useState<number>(3);

  // Active Session state
  const [session, setSession] = useState<VivaSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentResponseText, setStudentResponseText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<any | null>(null);

  // Voice recording state (Web Speech API integration)
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    loadSubjects();
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSpeechSupported(true);
    }
  }, []);

  const loadSubjects = async () => {
    try {
      setIsLoading(true);
      const res = await learningService.getSubjects();
      setSubjects(res);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartViva = async () => {
    try {
      setIsLoading(true);
      const newSession = await learningService.startVivaSession({
        materialId: initialMaterialId,
        subject: selectedSubject,
        topic: selectedTopic,
        difficulty,
        mode: vivaMode,
        count: questionCount,
      });
      setSession(newSession);
      setCurrentQuestionIndex(0);
      setStudentResponseText('');
      setCurrentEvaluation(null);
    } catch (err: any) {
      console.error('Failed to start viva session:', err);
      alert(err.response?.data?.error || 'Failed to initialize viva session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitVivaResponse = async () => {
    if (!session || !studentResponseText.trim()) return;
    const currentQ = session.questions[currentQuestionIndex];
    if (!currentQ) return;

    try {
      setIsEvaluating(true);
      const res = await learningService.submitVivaResponse(
        session.id,
        currentQ.id,
        studentResponseText
      );
      setCurrentEvaluation(res.evaluation);
    } catch (err) {
      console.error('Failed to evaluate viva response:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    if (!session) return;
    if (currentQuestionIndex + 1 < session.questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setStudentResponseText('');
      setCurrentEvaluation(null);
    } else {
      // Completed viva
      setSession({
        ...session,
        status: 'COMPLETED',
      });
    }
  };

  const toggleVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setStudentResponseText((prev) => (prev ? prev + ' ' + transcript : transcript));
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognition.start();
    } catch (err) {
      console.error('Voice recording error:', err);
      setIsRecording(false);
    }
  };

  const currentQ = session?.questions[currentQuestionIndex];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/learning" className="text-xs text-gray-500 hover:text-teal-700">
              Learning Hub
            </Link>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-xs font-semibold text-purple-800">Academic Viva Practice</span>
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            Medical Viva Voce Simulator
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Oral examination practice with structured feedback on key concepts, missing points, and articulation clarity.
          </p>
        </div>
      </div>

      {/* Dynamic Adaptive Viva Simulation Callout */}
      {!session && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-indigo-500/10 to-teal-500/10 border border-teal-200/80 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Adaptive Oral Viva Simulation</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">RECOMMENDED</span>
              </div>
              <div className="text-[11px] text-slate-600 truncate">
                Real examiner experience, multi-turn follow-ups, and zero repetitive questions.
              </div>
            </div>
          </div>
          <Link
            to="/viva/adaptive"
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow transition whitespace-nowrap flex items-center gap-1.5 flex-shrink-0"
          >
            Launch Adaptive <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Content Area */}
      {!session ? (
        /* Configuration / Launcher Screen */
        <div className="card p-6 sm:p-8 space-y-6 max-w-2xl mx-auto border border-gray-200">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-navy-900 text-base">Setup Viva Examination</h2>
              <p className="text-xs text-gray-500">Configure your oral examiner and topic.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Subject *
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                Specific Topic *
              </label>
              <input
                type="text"
                required
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                placeholder="e.g. Upper Limb Brachial Plexus, Cardiac Cycle, Beta-Blockers"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Examination Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVivaMode('TEXT')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      vivaMode === 'TEXT'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Text Viva
                  </button>
                  <button
                    type="button"
                    onClick={() => setVivaMode('VOICE')}
                    className={`py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${
                      vivaMode === 'VOICE'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Voice Viva
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Viva Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none"
                >
                  <option value="Standard">Standard (Undergraduate Viva)</option>
                  <option value="Challenging">Challenging (Honours / Distinction)</option>
                  <option value="Foundational">Foundational (First-Year Core)</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleStartViva}
                disabled={isLoading || !selectedTopic.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Begin Viva Examination</span>
              </button>
            </div>
          </div>
        </div>
      ) : session.status === 'COMPLETED' ? (
        /* Completion Screen */
        <div className="card p-8 max-w-2xl mx-auto text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Viva Voce Completed!</h2>
            <p className="text-xs text-gray-500 mt-1">
              Subject: {session.subject} • Topic: {session.topic}
            </p>
          </div>

          <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-950 text-left max-w-lg mx-auto">
            <strong className="block font-bold mb-1">Examiner Overall Impression:</strong>
            You successfully navigated oral questioning on {session.topic}. Review individual concept notes to refine clinical terminology and systematic articulation.
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => handleStartViva()}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Start Another Viva
            </button>
            <button
              onClick={() => setSession(null)}
              className="btn-secondary text-xs"
            >
              Back to Configuration
            </button>
          </div>
        </div>
      ) : (
        /* Active Viva Interaction */
        <div className="space-y-6">
          {/* Question Banner */}
          <div className="card p-6 bg-gradient-to-br from-white to-purple-50/30 border border-purple-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <span className="text-xs font-bold text-purple-800 bg-purple-100/60 px-2.5 py-1 rounded-md">
                Examiner Question {currentQuestionIndex + 1} of {session.questions.length}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {session.subject} • {session.topic}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                Dr.
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-purple-900">Medical Examiner</p>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-1 leading-snug">
                  "{currentQ?.question}"
                </h3>
              </div>
            </div>
          </div>

          {/* Student Response Area */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700">
                Your Answer / Explanation:
              </label>
              {vivaMode === 'VOICE' && speechSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                  }`}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  {isRecording ? 'Listening...' : 'Speak Response'}
                </button>
              )}
            </div>

            <textarea
              rows={5}
              value={studentResponseText}
              onChange={(e) => setStudentResponseText(e.target.value)}
              placeholder="State your answer clearly, including anatomical boundaries, physiological mechanisms, or diagnostic steps..."
              disabled={!!currentEvaluation}
              className="w-full p-3.5 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            {!currentEvaluation ? (
              <div className="flex items-center justify-end">
                <button
                  onClick={handleSubmitVivaResponse}
                  disabled={!studentResponseText.trim() || isEvaluating}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {isEvaluating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Examiner Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Oral Response</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Structured Evaluation Card */
              <div className="mt-4 p-5 bg-slate-50 border border-gray-200 rounded-2xl space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-bold text-gray-900 text-sm">Examiner Assessment</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Score:</span>
                    <span className="text-sm font-extrabold text-purple-700">
                      {currentEvaluation.score ?? currentEvaluation.scoreOutOfTen ?? 8}/10
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Covered Concepts */}
                  <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                    <strong className="text-emerald-900 block mb-1">
                      Key Concepts Covered:
                    </strong>
                    {(currentEvaluation.keyConceptsCovered || currentEvaluation.coveredConcepts)?.length > 0 ? (
                      <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
                        {(currentEvaluation.keyConceptsCovered || currentEvaluation.coveredConcepts).map((c: string, i: number) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-400 italic">None identified</span>
                    )}
                  </div>

                  {/* Missed Concepts */}
                  <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100">
                    <strong className="text-amber-900 block mb-1">
                      Concepts Missed / Incomplete:
                    </strong>
                    {(currentEvaluation.conceptsMissed || currentEvaluation.missedConcepts)?.length > 0 ? (
                      <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                        {(currentEvaluation.conceptsMissed || currentEvaluation.missedConcepts).map((c: string, i: number) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-emerald-700 font-medium">Full coverage demonstrated</span>
                    )}
                  </div>
                </div>

                {/* Feedback & Model Answer */}
                <div className="space-y-2 text-xs">
                  <p className="text-gray-700 leading-relaxed">
                    <strong className="text-navy-900">Examiner Feedback: </strong>
                    {currentEvaluation.feedback}
                  </p>
                  {currentEvaluation.modelAnswerSummary && (
                    <div className="pt-2 border-t border-gray-200 text-gray-600">
                      <strong className="text-purple-900">Standard Viva Model Answer: </strong>
                      {currentEvaluation.modelAnswerSummary}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>{currentQuestionIndex + 1 < session.questions.length ? 'Next Question' : 'Complete Viva'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Educational Disclaimer */}
          <p className="text-[11px] text-gray-400 text-center">
            Educational viva practice simulator. AI examiner scoring is provided for personal study and does not represent official university or board examination results.
          </p>
        </div>
      )}
    </div>
  );
}
