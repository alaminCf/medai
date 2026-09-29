import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  Mic,
  Send,
  FileText,
  Volume2,
  VolumeX,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Lock,
} from 'lucide-react';
import { examsService } from '../services/examsService';
import speechRecognitionService from '../services/speechRecognitionService';
import textToSpeechService from '../services/textToSpeechService';
import PatientAvatarCanvas from '../components/avatar/PatientAvatarCanvas';
import {
  ExamAttemptState,
  StationAttemptProgress,
  StationMessageItem,
  AvatarState,
  PatientEmotion,
  PatientCase,
} from '../types';

export default function OSCEStationPage() {
  const { id: examId, stationId } = useParams<{ id: string; stationId: string }>();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attempt');
  const navigate = useNavigate();

  // State Machine: 'LOADING' | 'INSTRUCTIONS' | 'STATION_ACTIVE' | 'TIME_UP' | 'STATION_COMPLETED' | 'EVALUATING'
  const [stationState, setStationState] = useState<
    'LOADING' | 'INSTRUCTIONS' | 'STATION_ACTIVE' | 'TIME_UP' | 'STATION_COMPLETED' | 'EVALUATING'
  >('LOADING');

  const [attemptData, setAttemptData] = useState<ExamAttemptState | null>(null);
  const [currentStation, setCurrentStation] = useState<StationAttemptProgress | null>(null);
  const [serverDeadline, setServerDeadline] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(360);
  const [messages, setMessages] = useState<StationMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLiveTranscript, setShowLiveTranscript] = useState(false);
  const [showInstructionsDrawer, setShowInstructionsDrawer] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [nextStationInfo, setNextStationInfo] = useState<any | null>(null);

  // Avatar & Voice States
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [patientEmotion, setPatientEmotion] = useState<PatientEmotion>('neutral');
  const [emotionIntensity, setEmotionIntensity] = useState<number>(0.3);
  const [speakingText, setSpeakingText] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Attempt & Station state
  useEffect(() => {
    if (!attemptId) {
      navigate('/exams');
      return;
    }
    loadAttemptAndStation();
  }, [attemptId, stationId]);

  const loadAttemptAndStation = async () => {
    try {
      setStationState('LOADING');
      const data = await examsService.getExamAttempt(attemptId!);
      setAttemptData(data);
      setShowLiveTranscript(data.showLiveTranscript || false);

      const st = data.stations.find((s) => s.stationId === stationId || s.stationAttemptId === stationId);
      if (!st) {
        navigate('/exams');
        return;
      }
      setCurrentStation(st);

      if (st.status === 'completed' || st.status === 'evaluated') {
        setStationState('STATION_COMPLETED');
      } else if (st.status === 'active' && st.deadline) {
        setServerDeadline(st.deadline);
        const diff = Math.max(0, Math.floor((new Date(st.deadline).getTime() - Date.now()) / 1000));
        setRemainingSeconds(diff);
        if (diff <= 0) {
          handleTimeExpired();
        } else {
          setStationState('STATION_ACTIVE');
        }
      } else {
        setRemainingSeconds(st.timeLimitSeconds || 360);
        setStationState('INSTRUCTIONS');
      }
    } catch (err) {
      console.error('Failed to load station:', err);
      navigate('/exams');
    }
  };

  // Anti-cheating listeners (tab visibility & fullscreen tracking)
  useEffect(() => {
    if (!attemptId || stationState !== 'STATION_ACTIVE') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        examsService.logIntegrityEvent(attemptId, {
          stationAttemptId: currentStation?.stationAttemptId,
          eventType: 'tab_hidden',
          metadata: { timestamp: new Date().toISOString() },
        });
      } else {
        examsService.logIntegrityEvent(attemptId, {
          stationAttemptId: currentStation?.stationAttemptId,
          eventType: 'tab_visible',
          metadata: { timestamp: new Date().toISOString() },
        });
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        examsService.logIntegrityEvent(attemptId, {
          stationAttemptId: currentStation?.stationAttemptId,
          eventType: 'fullscreen_exited',
          metadata: { timestamp: new Date().toISOString() },
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [attemptId, stationState, currentStation]);

  // Server-Authoritative Timer Loop
  useEffect(() => {
    if (stationState !== 'STATION_ACTIVE' || !serverDeadline) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const end = new Date(serverDeadline).getTime();
      const diffSec = Math.max(0, Math.floor((end - now) / 1000));
      setRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        clearInterval(interval);
        handleTimeExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stationState, serverDeadline]);

  // Scroll messages to bottom if transcript is enabled
  useEffect(() => {
    if (showLiveTranscript && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showLiveTranscript]);

  // Clean up audio & mic on unmount
  useEffect(() => {
    return () => {
      textToSpeechService.stop();
      speechRecognitionService.abortListening();
    };
  }, []);

  // Format seconds as MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Station consultation
  const handleStartStation = async () => {
    if (!attemptId || !currentStation) return;
    try {
      setIsSubmitting(true);
      const res = await examsService.startStation(attemptId, currentStation.stationId);
      setServerDeadline(res.deadline);
      setRemainingSeconds(res.remainingSeconds);
      setStationState('STATION_ACTIVE');
    } catch (err: any) {
      console.error('Failed to start station:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Time expired handler
  const handleTimeExpired = async () => {
    setStationState('TIME_UP');
    textToSpeechService.stop();
    speechRecognitionService.abortListening();
    setIsListening(false);
    setAvatarState('idle');

    // Automatically submit station
    if (attemptId && currentStation) {
      try {
        const res = await examsService.endStation(attemptId, currentStation.stationId);
        setNextStationInfo(res.nextStation);
        setStationState('STATION_COMPLETED');
      } catch (err) {
        console.error('Error auto-completing station on time expiry:', err);
        setStationState('STATION_COMPLETED');
      }
    }
  };

  // Manual End Station Early
  const handleManualEndStation = async () => {
    if (!window.confirm('Are you sure you want to end this clinical station early? The station will be submitted for scoring.')) {
      return;
    }
    await handleTimeExpired();
  };

  // Send student question to AI Patient
  const handleSendMessage = useCallback(
    async (textToSend: string, messageType: string = 'voice') => {
      const trimmed = textToSend.trim();
      if (!trimmed || isSubmitting || !attemptId || !currentStation) return;

      // Stop any speech listening
      if (isListening) {
        speechRecognitionService.stopListening();
        setIsListening(false);
      }

      const tempStudentMsg: StationMessageItem = {
        id: `st-${Date.now()}`,
        sender: 'student',
        message: trimmed,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempStudentMsg]);
      setInputText('');
      setIsSubmitting(true);
      setAvatarState('thinking');

      try {
        const res = await examsService.sendStationMessage(
          attemptId,
          currentStation.stationId,
          trimmed,
          messageType
        );

        if (res.isTimeUp) {
          handleTimeExpired();
          return;
        }

        const patientMsg: StationMessageItem = {
          id: res.patientMessage.id,
          sender: 'patient',
          message: res.patientMessage.message,
          emotion: res.patientMessage.emotion,
          emotionIntensity: res.patientMessage.emotionIntensity,
          timestamp: res.patientMessage.timestamp,
        };

        setMessages((prev) => [...prev, patientMsg]);
        setPatientEmotion((res.patientMessage.emotion as PatientEmotion) || 'neutral');
        setEmotionIntensity(res.patientMessage.emotionIntensity || 0.4);
        setSpeakingText(res.patientMessage.message);

        // Play patient voice with synchronized avatar lip-sync
        if (!isMuted) {
          setAvatarState('speaking');
          const lang = attemptData?.language || 'en';
          const gender = currentStation.patient?.gender || 'male';

          textToSpeechService.play(res.patientMessage.message, {
            language: lang as any,
            voiceGender: gender,
            events: {
              onAudioPlaying: () => {
                setAvatarState('speaking');
                setAudioElement(textToSpeechService.getCurrentAudio());
              },
              onAudioFinished: () => {
                setAvatarState('idle');
                setAudioElement(null);
              },
            }
          });
        } else {
          setAvatarState('idle');
        }
      } catch (err: any) {
        console.error('Error sending message:', err);
        setAvatarState('idle');
      } finally {
        setIsSubmitting(false);
      }
    },
    [attemptId, currentStation, isSubmitting, isListening, isMuted, attemptData]
  );

  // Toggle Microphone Listening
  const handleToggleMic = () => {
    if (isListening) {
      speechRecognitionService.stopListening();
      setIsListening(false);
      setAvatarState('idle');
    } else {
      textToSpeechService.stop();
      setAvatarState('listening');
      const lang = attemptData?.language || 'en';

      speechRecognitionService.startListening(lang as any, {
        onInterimResult: (transcript: string) => {
          setInputText(transcript);
        },
        onFinalResult: (transcript: string) => {
          if (transcript.trim()) {
            setIsListening(false);
            handleSendMessage(transcript, 'voice');
          }
        },
        onError: () => {
          setIsListening(false);
          setAvatarState('idle');
        },
        onEnd: () => {
          setIsListening(false);
          setAvatarState('idle');
        },
      });
      setIsListening(true);
    }
  };

  // Advance to next station or complete exam
  const handleProceedNext = async () => {
    if (!attemptId) return;

    if (nextStationInfo) {
      navigate(`/exams/${examId}/station/${nextStationInfo.stationId}?attempt=${attemptId}`);
    } else {
      // Last station: complete the exam
      setStationState('EVALUATING');
      try {
        await examsService.completeExam(attemptId);
        navigate(`/exams/results/${attemptId}`);
      } catch (err) {
        console.error('Failed to finalize exam:', err);
        navigate(`/exams/results/${attemptId}`);
      }
    }
  };

  // Mock patientCase object for PatientAvatarCanvas
  const mockPatientCase: PatientCase = {
    id: currentStation?.patient?.id || 'exam-patient',
    title: currentStation?.title || 'OSCE Station AI Patient',
    slug: 'osce-patient',
    category: 'Clinical OSCE',
    difficulty: 'intermediate',
    estimatedDuration: 6,
    patientName: currentStation?.patient?.patientName || currentStation?.patient?.name || 'Standardized Patient',
    patientAge: currentStation?.patient?.patientAge || currentStation?.patient?.age || 50,
    patientGender: currentStation?.patient?.patientGender || currentStation?.patient?.gender || 'male',
    chiefComplaint: 'Chest discomfort',
    personality: 'calm',
    avatarId: currentStation?.patient?.avatarId,
    createdAt: '',
  };

  if (stationState === 'LOADING') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-slate-300">
            Entering OSCE Examination Station...
          </p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VIEW 1: CANDIDATE INSTRUCTIONS (Outside Station Door)
  // ────────────────────────────────────────────────────────────────────────────
  if (stationState === 'INSTRUCTIONS') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-200">
          {/* Station Badge Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-5">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider rounded-full border border-emerald-500/30">
                Station {currentStation?.stationNumber} of 5
              </span>
              <span className="text-xs text-slate-400 font-medium">OSCE Examination</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" />
              <span>Strict 06:00 Timer</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {currentStation?.title}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Read the candidate instructions carefully before crossing the examination boundary.
            </p>
          </div>

          {/* Candidate Instructions Box */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Candidate Instructions:</span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 text-sm text-slate-200 leading-relaxed space-y-4">
              <p className="font-medium text-white text-base">
                {currentStation?.candidateInstructions}
              </p>
              <div className="pt-3 border-t border-slate-700/60 text-xs text-slate-400 space-y-1">
                <p>• Introduce yourself appropriately and establish rapport.</p>
                <p>• Gather relevant focused history and systematically clarify symptoms.</p>
                <p>• The AI patient does not expect a final diagnostic conclusion in this station.</p>
              </div>
            </div>
          </div>

          {/* Strict Rules Reminder */}
          <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p>
              Once you click <strong>"Enter Station & Start Timer"</strong>, the server timer starts immediately. It cannot be paused or reset. No checklist or score will be visible during the station.
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={handleStartStation}
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20 active:scale-98"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Enter Station & Start Timer</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VIEW 2: STATION COMPLETED / TRANSITION
  // ────────────────────────────────────────────────────────────────────────────
  if (stationState === 'STATION_COMPLETED' || stationState === 'EVALUATING') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-full border border-slate-700">
              Station {currentStation?.stationNumber} Completed
            </span>
            <h2 className="text-2xl font-bold text-white mt-3">
              {currentStation?.title}
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              Your consultation recording and timestamps have been securely submitted to the Clinical Evaluation Engine.
            </p>
          </div>

          <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl text-xs text-slate-300 text-left space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Exam Mode Confidentiality:</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              In accordance with examination integrity standards, individual station scores, missed items, and feedback are locked until the entire 5-station examination is completed.
            </p>
          </div>

          <button
            onClick={handleProceedNext}
            disabled={stationState === 'EVALUATING'}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            {stationState === 'EVALUATING' ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Generating Comprehensive OSCE Report...</span>
              </div>
            ) : nextStationInfo ? (
              <>
                <span>Proceed to Station {nextStationInfo.stationNumber} Briefing</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </>
            ) : (
              <>
                <span>Complete Examination & View Assessment Outcome</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // VIEW 3: ACTIVE OSCE CONSULTATION ROOM
  // ────────────────────────────────────────────────────────────────────────────
  const isUrgent = remainingSeconds <= 60;
  const isWarning = remainingSeconds <= 120 && remainingSeconds > 60;

  return (
    <div className="h-[100dvh] h-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none w-full">
      {/* Top Authoritative Exam Station Bar */}
      <header className="h-16 px-4 md:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-shrink-0 z-30">
        {/* Left: Station Title & Candidate Instructions Toggle */}
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase rounded-lg border border-emerald-500/30">
            Station {currentStation?.stationNumber}/5
          </span>
          <div className="hidden sm:block">
            <h2 className="text-sm font-bold text-white truncate max-w-xs md:max-w-md">
              {currentStation?.title}
            </h2>
          </div>
          <button
            onClick={() => setShowInstructionsDrawer(true)}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Instructions</span>
          </button>
        </div>

        {/* Center: SERVER-AUTHORITATIVE COUNTDOWN TIMER */}
        <div className="flex items-center">
          <div
            className={`px-4 py-1.5 rounded-xl font-mono text-base md:text-lg font-extrabold flex items-center gap-2 border transition-all ${
              isUrgent
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                : isWarning
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-emerald-400 border-slate-700'
            }`}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>
        </div>

        {/* Right: Audio Toggle, Fullscreen & End Station */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setFocusMode(!focusMode)}
            className="hidden md:flex p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
            title={focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
          >
            {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleManualEndStation}
            className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-all"
          >
            End Station
          </button>
        </div>
      </header>

      {/* Main Consultation Stage */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Central 3D Patient Avatar */}
        <div className="flex-1 relative flex items-center justify-center bg-radial from-slate-900 to-slate-950 p-4">
          <div className="w-full h-full max-w-4xl max-h-[85vh] relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80">
            <PatientAvatarCanvas
              patientCase={mockPatientCase}
              avatarState={avatarState}
              emotion={patientEmotion}
              emotionIntensity={emotionIntensity}
              speakingText={speakingText}
              audioElement={audioElement}
              focusMode={focusMode}
              onToggleFocusMode={() => setFocusMode(!focusMode)}
              onError={(err) => console.warn('Avatar error:', err)}
            />

            {/* Subtle Patient Status Badge */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-slate-200">
                {currentStation?.patient?.patientName || currentStation?.patient?.name || 'Patient'}
              </span>
              <span className="text-slate-500">|</span>
              <span className="capitalize text-slate-400">{avatarState}</span>
            </div>
          </div>
        </div>

        {/* Live Transcript Pane (if enabled by config) */}
        {showLiveTranscript && (
          <div className="w-full lg:w-96 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-64 lg:h-full z-20">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Consultation Transcript
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">EN/BN</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Press the microphone button or type below to introduce yourself.
                </div>
              ) : (
                messages.map((m) => {
                  const isStudent = m.sender === 'student';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-slate-500 mb-0.5 px-1 font-medium">
                        {isStudent ? 'Candidate (You)' : 'AI Patient'}
                      </span>
                      <div
                        className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                          isStudent
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Consultation Controls Bar */}
      <footer className="bg-slate-900/95 border-t border-slate-800 p-2.5 sm:p-4 z-30" style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {/* Main Large Microphone Button */}
          <button
            type="button"
            onClick={handleToggleMic}
            disabled={isSubmitting}
            className={`p-4 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 shadow-lg ${
              isListening
                ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse scale-105'
                : avatarState === 'speaking'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700'
            }`}
            title={isListening ? 'Stop Recording' : 'Speak to AI Patient'}
          >
            {isListening ? <Mic className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Text Input Fallback Bar */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputText, 'text');
                }
              }}
              placeholder={
                isListening
                  ? 'Listening to your voice... Speak clearly'
                  : 'Type your clinical question or press the microphone to speak...'
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-4 pr-12 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="button"
              disabled={!inputText.trim() || isSubmitting}
              onClick={() => handleSendMessage(inputText, 'text')}
              className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 rounded-xl transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>

      {/* Candidate Instructions Drawer (Accessible during station) */}
      {showInstructionsDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md p-6 h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Candidate Instructions
                  </h3>
                </div>
                <button
                  onClick={() => setShowInstructionsDrawer(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg"
                >
                  Close
                </button>
              </div>

              <div>
                <h4 className="text-lg font-bold text-white">{currentStation?.title}</h4>
                <div className="mt-4 p-5 bg-slate-800/80 border border-slate-700 rounded-2xl text-xs md:text-sm text-slate-200 leading-relaxed space-y-3">
                  <p className="font-semibold text-white">
                    {currentStation?.candidateInstructions}
                  </p>
                  <p className="text-slate-400 text-xs">
                    Remember: Focus on structured history taking, symptom characterization, red flag exclusion, and respectful communication.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInstructionsDrawer(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Return to Consultation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
