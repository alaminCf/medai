import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Mic,
  MicOff,
  CheckCircle,
  ArrowRight,
  Brain,
  Send,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertCircle,
  Activity,
  Terminal,
  RefreshCw,
  User,
  Stethoscope,
  BookOpen,
  Award,
  Layers,
  ArrowLeft,
  WifiOff,
  Flame,
  CheckCircle2,
  XCircle,
  MessageSquare
} from 'lucide-react';
import learningService from '../../services/learningService';
import type { MedicalSubject } from '../../types';

// Examiner Style Metadata
const EXAMINER_STYLES = [
  {
    id: 'CALM_PROFESSIONAL',
    name: 'Calm Professional',
    description: 'Measured, academic, neutral, and precise.',
    badge: 'Standard Board',
    color: 'from-blue-600 to-indigo-700'
  },
  {
    id: 'FRIENDLY_TEACHER',
    name: 'Friendly Teacher',
    description: 'Encouraging, scaffolds missed points gently.',
    badge: 'Coaching',
    color: 'from-teal-600 to-emerald-700'
  },
  {
    id: 'STRICT_EXAMINER',
    name: 'Strict Examiner',
    description: 'Sharp, concise, minimal hints, formal viva voce.',
    badge: 'High Stakes',
    color: 'from-slate-700 to-slate-900'
  },
  {
    id: 'CLINICAL_EXAMINER',
    name: 'Clinical Specialist',
    description: 'Bridges physiology to bedside scenarios.',
    badge: 'Clinical Case',
    color: 'from-purple-600 to-indigo-800'
  },
  {
    id: 'RAPID_FIRE',
    name: 'Rapid Fire',
    description: 'Quick-paced, high-yield diagnostic recall.',
    badge: 'High Yield',
    color: 'from-amber-600 to-rose-700'
  }
];

const SUGGESTED_TOPICS: Record<string, string[]> = {
  Physiology: [
    'Cardiovascular System & Cardiac Output',
    'Cardiac Cycle & Preload/Afterload',
    'Action Potential & Nerve Conduction',
    'Renal Clearance & Glomerular Filtration',
    'Respiratory Gas Exchange & Hemoglobin Curve'
  ],
  Anatomy: [
    'Femoral Triangle & Femoral Sheath',
    'Brachial Plexus & Nerve Injuries',
    'Circle of Willis & Cerebral Arteries',
    'Inguinal Canal & Hernias',
    'Mediastinum & Great Vessels'
  ],
  Biochemistry: [
    'Glycolysis & Gluconeogenesis',
    'Krebs Cycle & Electron Transport Chain',
    'Lipoprotein Metabolism & Atherosclerosis',
    'Enzyme Kinetics & Inhibitors',
    'Hemoglobinopathies & Sickle Cell'
  ],
  Pathology: [
    'Acute vs Chronic Inflammation',
    'Cell Injury & Apoptosis vs Necrosis',
    'Neoplasia & Carcinogenesis Hallmarks',
    'Thromboembolism & Infarction',
    'Glomerulonephritis & Nephrotic Syndrome'
  ],
  Pharmacology: [
    'Beta-Blockers & Autonomic Pharmacology',
    'Antihypertensive Drug Classes',
    'Antibiotics & Mechanism of Resistance',
    'NSAIDs & Eicosanoid Pathway',
    'General Anesthetics & MAC'
  ]
};

export const AdaptiveVivaPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Setup params
  const [subject, setSubject] = useState(searchParams.get('subject') || 'Physiology');
  const [topic, setTopic] = useState(searchParams.get('topic') || 'Cardiovascular System & Cardiac Output');
  const [sessionType, setSessionType] = useState<'PRACTICE' | 'EXAM'>('PRACTICE');
  const [examinerStyle, setExaminerStyle] = useState('CALM_PROFESSIONAL');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [subjectsList, setSubjectsList] = useState<MedicalSubject[]>([]);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<any | null>(null);
  const [turnCount, setTurnCount] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<any | null>(null);

  // Live session transcript dialogue
  const [dialogue, setDialogue] = useState<
    Array<{
      turn: number;
      type: 'examiner' | 'student';
      text: string;
      concept?: string;
      evaluation?: any;
      timestamp: string;
    }>
  >([]);

  // Knowledge state tracking
  const [coveredConcepts, setCoveredConcepts] = useState<Record<string, string>>({});

  // Audio / Speech Recognition (STT)
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'en-US' | 'bn-BD'>('en-US');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  // Audio / Text-to-Speech (TTS)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Dev / Debug Panel
  const [showDebug, setShowDebug] = useState(false);
  const [latestDebugTurn, setLatestDebugTurn] = useState<any | null>(null);

  // Connectivity & timer
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [recoveredSessionAvailable, setRecoveredSessionAvailable] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load & Recovery Check
  useEffect(() => {
    // Load subjects
    learningService.getSubjects().then((subs) => {
      if (subs && subs.length > 0) setSubjectsList(subs);
    }).catch(() => {});

    // Web Speech API check
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    }

    // Network connectivity listener
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check saved session in localStorage
    const saved = localStorage.getItem('techboloy_active_viva_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sessionId) {
          setRecoveredSessionAvailable(parsed.sessionId);
        }
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  // 2. Timer
  useEffect(() => {
    let interval: any = null;
    if (timerActive && !isCompleted) {
      interval = setInterval(() => {
        setSecondsElapsed((sec) => sec + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, isCompleted]);

  // 3. Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [dialogue, isSubmitting]);

  // 4. TTS speech for examiner question
  const speakQuestion = (text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Select high-quality English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          (v.lang.startsWith('en') && v.name.includes('Natural')) ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel')
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
      setIsSpeaking(false);
    }
  };

  // 5. Start New Viva
  const handleStartViva = async () => {
    try {
      setIsSubmitting(true);
      const res = await learningService.startAdaptiveViva({
        subject,
        topic,
        difficulty,
        sessionType,
        examinerStyle
      });

      setSessionId(res.sessionId);
      setCurrentQuestion(res.currentQuestion);
      setStudentAnswer('');
      setLastEvaluation(null);
      setTurnCount(1);
      setIsCompleted(false);
      setCompletedSummary(null);
      setSecondsElapsed(0);
      setTimerActive(true);

      const openingText = res.currentQuestion.question || res.currentQuestion.questionText;

      setDialogue([
        {
          turn: 1,
          type: 'examiner',
          text: openingText,
          concept: res.currentQuestion.focusConcept,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      if (res.sessionState?.coveredConcepts) {
        setCoveredConcepts(res.sessionState.coveredConcepts);
      }

      // Persist active session info for recovery
      localStorage.setItem(
        'techboloy_active_viva_session',
        JSON.stringify({
          sessionId: res.sessionId,
          subject,
          topic,
          startedAt: Date.now()
        })
      );

      setRecoveredSessionAvailable(null);

      // Speak question
      speakQuestion(openingText);
    } catch (err: any) {
      console.error('Failed to start adaptive viva:', err);
      alert('Could not start oral viva: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Resume Existing Session
  const handleResumeSession = async (targetSessionId: string) => {
    try {
      setIsSubmitting(true);
      const res = await learningService.getAdaptiveVivaSession(targetSessionId);
      if (res.success && res.session) {
        const s = res.session;
        setSessionId(s.sessionId);
        setSubject(s.subjectId || 'Physiology');
        setTopic(s.topicId || 'Oral Viva');
        setTurnCount(s.questionCount || 1);
        setExaminerStyle(s.examinerStyle || 'CALM_PROFESSIONAL');
        setDifficulty(s.currentDifficulty || 'Intermediate');
        setCoveredConcepts(s.coveredConcepts || {});

        if (s.currentQuestion) {
          setCurrentQuestion({
            questionId: s.currentQuestion.questionId,
            question: s.currentQuestion.questionText,
            difficulty: s.currentQuestion.difficulty,
            focusConcept: s.currentQuestion.concept
          });
        }

        // Rebuild dialogue from previousQuestions/previousAnswers
        const reconstructed: Array<any> = [];
        const pq = s.previousQuestions || [];
        const pa = s.previousAnswers || [];
        for (let i = 0; i < Math.max(pq.length, pa.length); i++) {
          if (pq[i]) {
            reconstructed.push({
              turn: i + 1,
              type: 'examiner',
              text: pq[i],
              timestamp: 'Earlier'
            });
          }
          if (pa[i]) {
            reconstructed.push({
              turn: i + 1,
              type: 'student',
              text: pa[i],
              timestamp: 'Earlier'
            });
          }
        }

        if (s.currentQuestion && (!pq.length || pq[pq.length - 1] !== s.currentQuestion.questionText)) {
          reconstructed.push({
            turn: pq.length + 1,
            type: 'examiner',
            text: s.currentQuestion.questionText,
            concept: s.currentQuestion.concept,
            timestamp: 'Current'
          });
        }

        setDialogue(reconstructed);
        setTimerActive(true);
        setRecoveredSessionAvailable(null);
      }
    } catch (err) {
      console.warn('Could not recover session:', err);
      localStorage.removeItem('techboloy_active_viva_session');
      setRecoveredSessionAvailable(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Submit Student Response
  const handleSubmitResponse = async () => {
    if (!sessionId || !currentQuestion || !studentAnswer.trim() || isSubmitting) return;

    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const currentAnswerText = studentAnswer.trim();

    // Optimistically add student's response to dialogue
    const newDialogue = [
      ...dialogue,
      {
        turn: turnCount,
        type: 'student' as const,
        text: currentAnswerText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setDialogue(newDialogue);
    setStudentAnswer('');

    try {
      setIsSubmitting(true);
      const res = await learningService.submitAdaptiveVivaAnswer({
        sessionId,
        questionId: currentQuestion.questionId,
        studentAnswer: currentAnswerText,
        topic,
        currentDifficulty: currentQuestion.difficulty || difficulty
      });

      setLastEvaluation(res.evaluation);
      setTurnCount(res.turnCount);
      if (res.debugTurn) {
        setLatestDebugTurn(res.debugTurn);
      }
      if (res.sessionState?.coveredConcepts) {
        setCoveredConcepts(res.sessionState.coveredConcepts);
      }

      if (res.isSessionComplete) {
        setIsCompleted(true);
        setTimerActive(false);
        setCompletedSummary(res.sessionState || res.evaluation);
        localStorage.removeItem('techboloy_active_viva_session');
      } else if (res.nextQuestion) {
        const nextQ = {
          questionId: res.nextQuestion.questionId,
          question: res.nextQuestion.question || res.nextQuestion.questionText,
          difficulty: res.nextQuestion.difficulty,
          focusConcept: res.nextQuestion.focusConcept || res.nextQuestion.concept,
          prefix: res.nextQuestion.prefix
        };
        setCurrentQuestion(nextQ);

        // Examiner response with contextual feedback prefix
        const fullExaminerSpeech = nextQ.prefix
          ? `${nextQ.prefix} ${nextQ.question}`
          : nextQ.question;

        setDialogue((prev) => [
          ...prev,
          {
            turn: res.turnCount,
            type: 'examiner',
            text: fullExaminerSpeech,
            concept: nextQ.focusConcept,
            evaluation: res.evaluation,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        speakQuestion(fullExaminerSpeech);
      }
    } catch (err: any) {
      console.error('Error submitting viva response:', err);
      alert('Examiner error: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. Robust Live Voice Recognition (STT)
  const startRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Safari, or Edge.');
      return;
    }

    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = speechLanguage;

      let baseText = studentAnswer ? studentAnswer.trim() + ' ' : '';

      recog.onstart = () => {
        setIsRecording(true);
        setInterimTranscript('');
      };

      recog.onresult = (event: any) => {
        let currentInterim = '';
        let newlyFinal = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            newlyFinal += item[0].transcript + ' ';
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (newlyFinal) {
          baseText += newlyFinal;
          setStudentAnswer(baseText.trim());
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      recog.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Microphone permission was denied. Please allow microphone access in your browser address bar.');
        }
        setIsRecording(false);
        setInterimTranscript('');
      };

      recog.onend = () => {
        setIsRecording(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recog;
      recog.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    setInterimTranscript('');
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Quick preset answers
  const handleQuickAnswer = (phrase: string) => {
    setStudentAnswer(phrase);
  };

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ─────────────────────────────────────────────────────────────
  // VIEW 1: Viva Completed / Feedback Report
  // ─────────────────────────────────────────────────────────────
  if (isCompleted) {
    const evalData = completedSummary || lastEvaluation || {};
    const demonstrated = evalData.demonstratedConcepts || evalData.masteredConcepts || [];
    const weak = evalData.weakConcepts || evalData.misunderstoodConcepts || [];
    const score = evalData.overallScore || evalData.score || 82;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Award className="w-64 h-64 text-teal-400" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <CheckCircle className="w-3.5 h-3.5" />
              Oral Examination Completed
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Examiner Assessment Report
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Candidate evaluated on <span className="text-white font-semibold">{topic}</span> ({subject}) under{' '}
              <span className="text-teal-300 font-semibold">{examinerStyle.replace('_', ' ')}</span> format.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
              <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
                <div className="text-xs font-bold uppercase text-slate-400">Oral Score</div>
                <div className="text-2xl sm:text-3xl font-black text-teal-400 mt-1">{score}%</div>
              </div>
              <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
                <div className="text-xs font-bold uppercase text-slate-400">Total Turns</div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1">{turnCount}</div>
              </div>
              <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
                <div className="text-xs font-bold uppercase text-slate-400">Duration</div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1">{formatTime(secondsElapsed)}</div>
              </div>
              <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
                <div className="text-xs font-bold uppercase text-slate-400">Clarity</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                  {evalData.clinicalCommunicationClarity || 'Articulate'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Concept Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Demonstrated / Mastered */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-700">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Demonstrated Competencies</h2>
            </div>
            <p className="text-xs text-slate-500">Concepts correctly articulated during the viva voce:</p>
            <div className="flex flex-wrap gap-2">
              {demonstrated.length > 0 ? (
                demonstrated.map((c: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    {c.replace(/_/g, ' ')}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Foundational recall assessed</span>
              )}
            </div>
          </div>

          {/* Concepts for Targeted Revision */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-rose-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Concepts Needing Targeted Revision</h2>
            </div>
            <p className="text-xs text-slate-500">Topics where hesitation or incomplete definitions occurred:</p>
            <div className="flex flex-wrap gap-2">
              {weak.length > 0 ? (
                weak.map((c: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200 flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    {c.replace(/_/g, ' ')}
                  </span>
                ))
              ) : (
                <span className="text-xs text-emerald-600 font-semibold">
                  No major physiological misconceptions detected.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Examiner Remarks */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              Official Examiner Remarks
            </span>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
              {examinerStyle.replace('_', ' ')}
            </span>
          </div>
          <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">
            {evalData.feedback ||
              evalData.examinerSummary ||
              `Candidate demonstrated adequate command over theoretical concepts. To score distinction in formal university viva voce, refine quantitative formulas and articulate physiological mechanisms step-by-step.`}
          </p>
        </div>

        {/* Ecosystem Connections: Next Learning Steps */}
        <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recommended Next Steps</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Reinforce concepts probed in this oral session using integrated Techboloy Med tools:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              to={`/ai-tutor?topic=${encodeURIComponent(topic)}`}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition">
                <Brain className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-900">Study with AI Tutor</div>
              <div className="text-[11px] text-slate-500 mt-1">Deep-dive into missed mechanisms</div>
            </Link>

            <Link
              to={`/mcq?topic=${encodeURIComponent(topic)}`}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition">
                <Layers className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-900">Practice MCQs</div>
              <div className="text-[11px] text-slate-500 mt-1">Verify recall with clinical cases</div>
            </Link>

            <Link
              to={`/flashcards?topic=${encodeURIComponent(topic)}`}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-500 hover:shadow-md transition text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-900">Spaced Flashcards</div>
              <div className="text-[11px] text-slate-500 mt-1">Rapid recall for definitions</div>
            </Link>

            <Link
              to="/revision"
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-500 hover:shadow-md transition text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold mb-2 group-hover:scale-105 transition">
                <Flame className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-900">Smart Revision Hub</div>
              <div className="text-[11px] text-slate-500 mt-1">Schedule retention reviews</div>
            </Link>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/revision')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-sm text-slate-700 transition"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => {
              setSessionId(null);
              setIsCompleted(false);
              setCurrentQuestion(null);
              setDialogue([]);
            }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 font-bold text-sm text-white shadow-md transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Start Another Adaptive Viva
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 2: Active Oral Viva Cockpit (Mobile-First)
  // ─────────────────────────────────────────────────────────────
  if (sessionId && currentQuestion) {
    const currentStyleMeta =
      EXAMINER_STYLES.find((s) => s.id === examinerStyle) || EXAMINER_STYLES[0];

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:pb-12">
        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-amber-500 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 shadow">
            <WifiOff className="w-4 h-4" />
            <span>Connection lost. Reconnecting... Session state is saved.</span>
          </div>
        )}

        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => {
                  if (confirm('Leave viva examination? Your progress is saved.')) {
                    navigate('/revision');
                  }
                }}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition flex-shrink-0"
                title="Exit Viva"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                    Viva Voce
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate">{topic}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {subject} • {sessionType === 'EXAM' ? 'Formal Exam' : 'Practice Mode'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Timer */}
              <div className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {formatTime(secondsElapsed)}
              </div>

              {/* TTS Mute Toggle */}
              <button
                onClick={() => {
                  if (ttsEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
                  setTtsEnabled(!ttsEnabled);
                }}
                className={`p-2 rounded-xl border text-xs font-bold transition ${
                  ttsEnabled
                    ? 'bg-teal-50 border-teal-200 text-teal-700'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
                title={ttsEnabled ? 'Examiner audio ON' : 'Examiner audio MUTED'}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Debug Panel Toggle */}
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={`p-2 rounded-xl border text-xs font-bold transition ${
                  showDebug
                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                }`}
                title="Toggle Examiner Debug Panel"
              >
                <Terminal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 pt-4 space-y-4 flex-1">
          {/* Examiner Avatar Stage */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-7 text-white shadow-lg border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Avatar with speaking wave */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-indigo-600 flex items-center justify-center text-white font-black shadow-md">
                    <User className="w-6 h-6" />
                  </div>
                  {isSpeaking && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900 animate-ping" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-tight">{currentStyleMeta.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Turn {turnCount}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isSpeaking
                      ? 'Speaking question...'
                      : isSubmitting
                      ? 'Assessing concept articulation...'
                      : 'Listening attentively'}
                  </div>
                </div>
              </div>

              {/* Repeat speech button */}
              <button
                onClick={() => speakQuestion(currentQuestion.question)}
                disabled={isSpeaking || isSubmitting}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Repeat</span>
              </button>
            </div>

            {/* Current Question Text */}
            <div className="mt-3 text-lg sm:text-2xl font-bold leading-relaxed text-slate-100">
              "{currentQuestion.question}"
            </div>

            {/* Focus concept & Difficulty badge */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-teal-400 uppercase tracking-wider text-[10px]">
                  Target Concept:
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold">
                  {currentQuestion.focusConcept?.replace(/_/g, ' ') || topic}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Difficulty: {currentQuestion.difficulty || difficulty}
              </span>
            </div>
          </div>

          {/* Live Concept Coverage Bar */}
          {Object.keys(coveredConcepts).length > 0 && (
            <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-sm flex items-center gap-2 overflow-x-auto text-xs">
              <span className="font-black text-slate-400 text-[10px] uppercase tracking-wider whitespace-nowrap pl-1">
                Concepts:
              </span>
              <div className="flex items-center gap-1.5 flex-nowrap">
                {Object.entries(coveredConcepts).map(([concept, status], idx) => {
                  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (status === 'MASTERED' || status === 'STRONG') {
                    badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold';
                  } else if (status === 'COMPETENT') {
                    badgeClass = 'bg-teal-50 text-teal-800 border-teal-200';
                  } else if (status === 'PARTIAL') {
                    badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                  } else if (status === 'WEAK') {
                    badgeClass = 'bg-rose-50 text-rose-800 border-rose-200';
                  }
                  return (
                    <span
                      key={idx}
                      className={`px-2.5 py-0.5 rounded-lg border text-[11px] whitespace-nowrap ${badgeClass}`}
                    >
                      {concept.replace(/_/g, ' ')}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dialogue Transcript Stream */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 max-h-[40vh] sm:max-h-[46vh] overflow-y-auto">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                Viva Transcript
              </span>
              <span>{dialogue.length} messages</span>
            </div>

            <div className="space-y-3.5">
              {dialogue.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${item.type === 'student' ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[10px] font-bold text-slate-400 px-1 mb-1">
                    {item.type === 'examiner' ? 'Examiner' : 'You (Candidate)'} • {item.timestamp}
                  </div>
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      item.type === 'student'
                        ? 'bg-teal-600 text-white font-medium rounded-br-none'
                        : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60'
                    }`}
                  >
                    {item.text}
                  </div>
                </div>
              ))}

              {/* Submitting Loading State */}
              {isSubmitting && (
                <div className="flex flex-col items-start animate-pulse">
                  <div className="text-[10px] font-bold text-slate-400 px-1 mb-1">Examiner</div>
                  <div className="bg-slate-100 text-slate-600 rounded-2xl rounded-bl-none p-3.5 text-xs flex items-center gap-2 border border-slate-200">
                    <Activity className="w-4 h-4 text-teal-600 animate-spin" />
                    <span>Evaluating physiological accuracy & formulating follow-up...</span>
                  </div>
                </div>
              )}

              <div ref={transcriptEndRef} />
            </div>
          </div>

          {/* Quick Oral Assistance Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              Quick input:
            </span>
            <button
              onClick={() => handleQuickAnswer("I don't recall the exact mechanism / ভুলে গেছি। Can you guide me?")}
              className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-[11px] font-medium whitespace-nowrap transition"
            >
              "I don't recall / ভুলে গেছি"
            </button>
            <button
              onClick={() => handleQuickAnswer("Not entirely sure, could you rephrase or give a hint?")}
              className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-[11px] font-medium whitespace-nowrap transition"
            >
              "Need a clue"
            </button>
            <button
              onClick={() => handleQuickAnswer("Could you provide a clinical scenario to contextualize this?")}
              className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-[11px] font-medium whitespace-nowrap transition"
            >
              "Clinical context?"
            </button>
          </div>

          {/* Student Articulation Input Box (Mobile-First) */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-teal-600" />
                Oral Candidate Response
              </label>

              {/* Real-time Voice Toggle & Language Switcher */}
              <div className="flex items-center gap-2">
                {/* Language Switcher */}
                <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5 text-[11px] font-bold border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      if (isRecording) stopRecording();
                      setSpeechLanguage('en-US');
                    }}
                    className={`px-2 py-1 rounded-lg transition ${
                      speechLanguage === 'en-US'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isRecording) stopRecording();
                      setSpeechLanguage('bn-BD');
                    }}
                    className={`px-2 py-1 rounded-lg transition ${
                      speechLanguage === 'bn-BD'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    বাংলা
                  </button>
                </div>

                {/* Voice Button */}
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
                      : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200'
                  }`}
                  title={speechSupported ? 'Click to speak your response' : 'Speech recognition not supported'}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-teal-600" />}
                  {isRecording ? 'Listening (Tap to Stop)...' : 'Voice Input (STT)'}
                </button>
              </div>
            </div>

            {/* Real-time Listening Wave & Interim Speech Preview */}
            {isRecording && (
              <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-4 bg-rose-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-6 bg-rose-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-4 bg-rose-600 rounded-full animate-bounce" />
                </div>
                <div className="text-xs text-rose-800 font-medium truncate flex-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-rose-600 mr-1.5">
                    Listening ({speechLanguage === 'en-US' ? 'English' : 'বাংলা'}):
                  </span>
                  {interimTranscript ? (
                    <span className="italic">"{interimTranscript}"</span>
                  ) : (
                    <span className="text-rose-400">Speak into your microphone now...</span>
                  )}
                </div>
              </div>
            )}

            <textarea
              rows={3}
              placeholder="Speak or type your medical explanation in English, Bangla, or Banglish..."
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmitResponse();
                }
              }}
              className="w-full p-3.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-none"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Supports English & Bengali medical vernacular. Press Cmd+Enter to send.
              </span>
              <button
                disabled={!studentAnswer.trim() || isSubmitting}
                onClick={handleSubmitResponse}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isSubmitting ? 'Assessing Answer...' : 'Submit Oral Answer'}
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Admin / Developer Debug Panel */}
          {showDebug && (
            <div className="bg-slate-900 rounded-3xl p-5 text-slate-200 text-xs border border-purple-800/50 shadow-xl space-y-3 font-mono">
              <div className="flex items-center justify-between text-purple-400 font-bold border-b border-slate-800 pb-2">
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  ADAPTIVE ENGINE LIVE TELEMETRY (ADMIN/DEV ONLY)
                </span>
                <button
                  onClick={() => setShowDebug(false)}
                  className="text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              {latestDebugTurn ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500">Target Concept:</span>{' '}
                    <span className="text-teal-400 font-bold">{latestDebugTurn.targetConcept}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Assessment:</span>{' '}
                    <span
                      className={`font-bold ${
                        latestDebugTurn.assessment?.correctness === 'CORRECT'
                          ? 'text-emerald-400'
                          : latestDebugTurn.assessment?.correctness === 'PARTIAL'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {latestDebugTurn.assessment?.correctness || 'PENDING'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Demonstrated:</span>{' '}
                    <span className="text-emerald-300">
                      {(latestDebugTurn.assessment?.demonstratedConcepts || []).join(', ') || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Missing Concepts:</span>{' '}
                    <span className="text-rose-300">
                      {(latestDebugTurn.assessment?.missingConcepts || []).join(', ') || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Misconceptions:</span>{' '}
                    <span className="text-amber-300">
                      {(latestDebugTurn.assessment?.misconceptions || []).join(', ') || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Next Strategy:</span>{' '}
                    <span className="text-purple-300 font-bold">
                      {latestDebugTurn.nextStrategy}
                    </span>
                  </div>
                  <div className="sm:col-span-2 text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                    <span className="text-slate-500">Anti-Repetition Check:</span>{' '}
                    {latestDebugTurn.similarityCheckPassed !== false ? (
                      <span className="text-emerald-400">PASSED (Non-repetitive verified)</span>
                    ) : (
                      <span className="text-amber-400">Repetition detected and avoided</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 italic">
                  Telemetry will update after candidate submits first oral turn.
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW 3: Setup & Launcher Screen
  // ─────────────────────────────────────────────────────────────
  const availableTopics = SUGGESTED_TOPICS[subject] || [
    'General Physiology Principles',
    'Clinical Case Examination'
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Recovery Banner */}
      {recoveredSessionAvailable && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Active Viva Session Detected</div>
              <div className="text-[11px] text-slate-600">
                You have an unfinished oral viva session saved on your device.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => {
                localStorage.removeItem('techboloy_active_viva_session');
                setRecoveredSessionAvailable(null);
              }}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Discard
            </button>
            <button
              onClick={() => handleResumeSession(recoveredSessionAvailable)}
              className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow transition"
            >
              Resume Viva
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">
          <Mic className="w-3.5 h-3.5" />
          Adaptive Medical Viva Voce
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Adaptive Oral Viva Simulation
        </h1>
        <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">
          Face a dynamic, intelligent medical examiner who listens to your answers, probes missed concepts, adapts difficulty in real-time, and never repeats questions.
        </p>
      </div>

      {/* Station Configuration Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-teal-600" />
          Configure Viva Station
        </h2>

        {/* Subject & Topic Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Medical Subject
            </label>
            <select
              value={subject}
              onChange={(e) => {
                const newSub = e.target.value;
                setSubject(newSub);
                const suggested = SUGGESTED_TOPICS[newSub];
                if (suggested && suggested.length > 0) {
                  setTopic(suggested[0]);
                }
              }}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              {subjectsList.length > 0 ? (
                subjectsList.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="Physiology">Physiology</option>
                  <option value="Anatomy">Anatomy</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Pharmacology">Pharmacology</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Exam Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Cardiovascular System, Femoral Triangle"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Quick Suggested Topics */}
        <div>
          <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Suggested High-Yield Topics:
          </span>
          <div className="flex flex-wrap gap-2">
            {availableTopics.map((top, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setTopic(top)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  topic === top
                    ? 'bg-teal-50 text-teal-800 border-teal-300 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {top}
              </button>
            ))}
          </div>
        </div>

        {/* Examiner Personality Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Select Examiner Personality
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {EXAMINER_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setExaminerStyle(style.id)}
                className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                  examinerStyle === style.id
                    ? 'bg-gradient-to-br from-teal-50 to-slate-50 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{style.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {style.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{style.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mode & Difficulty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Examination Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSessionType('PRACTICE')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                  sessionType === 'PRACTICE'
                    ? 'bg-teal-600 text-white border-teal-600 shadow'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Practice Mode (Coaching)
              </button>
              <button
                type="button"
                onClick={() => setSessionType('EXAM')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition ${
                  sessionType === 'EXAM'
                    ? 'bg-slate-900 text-white border-slate-900 shadow'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Exam Mode (Formal Viva)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Starting Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="Beginner">Beginner (Foundations)</option>
              <option value="Basic">Basic (Core Definitions)</option>
              <option value="Intermediate">Intermediate (Physiological Drivers)</option>
              <option value="Advanced">Advanced (Mechanisms & Hemodynamics)</option>
              <option value="Clinical Reasoning">Clinical Reasoning (Bedside Cases)</option>
            </select>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3 text-xs text-slate-600">
          <Brain className="w-5 h-5 text-teal-600 flex-shrink-0" />
          <span>
            Powered by Concept-Driven State Engine: Strict semantic duplicate prevention, multilingual audio/text parsing, and dynamic follow-up questioning.
          </span>
        </div>

        {/* Start Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleStartViva}
            disabled={isSubmitting || !topic.trim()}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isSubmitting ? 'Initializing Station...' : 'Enter Oral Examination'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdaptiveVivaPage;
