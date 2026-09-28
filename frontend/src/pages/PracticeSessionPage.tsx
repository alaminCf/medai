import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionsService } from '../services/sessionsService';
import speechRecognitionService from '../services/speechRecognitionService';
import textToSpeechService from '../services/textToSpeechService';
import PatientAvatarCanvas from '../components/avatar/PatientAvatarCanvas';
import type {
  PracticeSession,
  ConversationMessage,
  VoiceState,
  AvatarState,
  ConsultationMode,
  ConsultationLanguage,
  PatientEmotion,
} from '../types';
import { formatDuration } from '../utils/formatters';
import {
  Clock,
  Send,
  AlertCircle,
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  Square,
  Mic,
  MessageSquare,
  Keyboard,
  Globe,
  Radio,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { getApiError } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

export default function PracticeSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Phase 2 & 3: Consultation Mode, Voice, and Avatar State
  const [mode, setMode] = useState<ConsultationMode>('voice');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [currentEmotion, setCurrentEmotion] = useState<PatientEmotion>('neutral');
  const [emotionIntensity, setEmotionIntensity] = useState(0.35);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [voiceFallbackNotice, setVoiceFallbackNotice] = useState('');
  const [hasBackendTTS, setHasBackendTTS] = useState(false);
  const [activeSpeakingText, setActiveSpeakingText] = useState('');

  // UI Modes
  const [focusMode, setFocusMode] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestionCategory, setSuggestionCategory] = useState<'socrates' | 'history' | 'systems'>('socrates');

  const SUGGESTED_QUESTIONS = {
    en: {
      socrates: [
        'When did your symptoms begin?',
        'Where exactly does it hurt or bother you?',
        'Does the pain spread to your arm, neck, or back?',
        'On a scale of 1-10, how severe is it?',
        'What makes the symptom better or worse?',
        'How would you describe the feeling (sharp, dull, throbbing)?',
      ],
      history: [
        'Do you have any past medical conditions like diabetes or high BP?',
        'What medications or inhalers do you take regularly?',
        'Do you have any known drug or food allergies?',
        'Has anyone in your family had similar health problems?',
        'Do you smoke, vape, or drink alcohol?',
      ],
      systems: [
        'Have you noticed any fever, chills, or night sweats?',
        'Any shortness of breath, wheezing, or cough?',
        'Any nausea, vomiting, or changes in bowel habits?',
        'Have you felt dizzy, lightheaded, or unusually tired?',
      ],
    },
    bn: {
      socrates: [
        'আপনার এই সমস্যা কবে থেকে শুরু হয়েছে?',
        'ব্যথাটা ঠিক কোথায় হচ্ছে আঙুল দিয়ে দেখাবেন?',
        'ব্যথা কি অন্য কোথাও যেমন হাত, গলা বা পিঠে ছড়িয়ে পড়ে?',
        '১ থেকে ১০ এর স্কেলে আপনার কষ্ট কতটা তীব্র?',
        'কী করলে কষ্ট কমে বা বেড়ে যায়?',
        'ব্যথাটা কেমন ধরনের — তীব্র, ভোঁতা, নাকি ভারী কিছু চেপে বসার মতো?',
      ],
      history: [
        'আপনার কি ডায়াবেটিস, প্রেসার বা অন্য কোনো আগের রোগ আছে?',
        'আপনি কি নিয়মিত কোনো ওষুধ বা ইনহেলার ব্যবহার করেন?',
        'কোনো ওষুধ বা খাবারে কি আপনার অ্যালার্জি আছে?',
        'পরিবারে কারও কি এই ধরনের সমস্যা আছে?',
        'আপনি কি ধূমপান বা তামাকজাতীয় কিছু সেবন করেন?',
      ],
      systems: [
        'আপনার কি জ্বর, কাঁপুনি বা রাতে ঘাম হচ্ছে?',
        'কোনো শ্বাসকষ্ট, কাশি বা বুকে চাপ অনুভব করছেন?',
        'বমি ভাব, বমি বা খাওয়ার রুচি কমে গেছে কি?',
        'মাথা ঘোরা বা অতিরিক্ত ক্লান্তি লাগছে?',
      ],
    },
  };

  // Consultation Timer
  const [elapsed, setElapsed] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<any>(null);

  // Initialize consultation session
  useEffect(() => {
    if (!sessionId) return;

    sessionsService
      .getSession(sessionId)
      .then((sess) => {
        setSession(sess);
        setMessages(sess.messages || []);
        if (sess.voiceEnabled !== undefined) {
          setMode(sess.voiceEnabled ? 'voice' : 'text');
        }

        // Set initial patient emotion based on case personality
        if (sess.patientCase.personality === 'anxious') {
          setCurrentEmotion('anxious');
          setEmotionIntensity(0.5);
        } else if (sess.patientCase.personality === 'calm') {
          setCurrentEmotion('calm');
          setEmotionIntensity(0.3);
        } else {
          setCurrentEmotion('concerned');
          setEmotionIntensity(0.35);
        }

        // Play initial greeting
        const opening = sess.messages?.find((m) => m.sender === 'patient');
        if (opening && sess.voiceEnabled && !textToSpeechService.isMuted()) {
          setTimeout(() => {
            playPatientVoice(opening.message, sess.language || 'en', sess);
          }, 800);
        }
      })
      .catch((err) => setError(getApiError(err)))
      .finally(() => setIsLoading(false));

    return () => {
      textToSpeechService.stop();
      speechRecognitionService.abortListening();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  // Session duration timer
  useEffect(() => {
    if (!session || session.status !== 'active') return;

    const startTime = new Date(session.startedAt).getTime();
    setElapsed(Math.floor((Date.now() - startTime) / 1000));

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  // Auto-scroll transcript
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript, isSending]);

  // Voice & Avatar synchronization helper
  const playPatientVoice = useCallback(
    (text: string, language: ConsultationLanguage, sessObj?: PracticeSession | null) => {
      const activeSession = sessObj || session;
      const pc = activeSession?.patientCase;

      setActiveSpeakingText(text);

      textToSpeechService.play(text, {
        sessionId: activeSession?.id,
        language: language || activeSession?.language || 'en',
        voiceId: pc?.voiceId,
        voiceGender: pc?.voiceGender,
        speed: pc?.speakingSpeed || 1.0,
        useBackendTTS: hasBackendTTS,
        events: {
          onResponseStarted: () => {
            setVoiceState('speaking');
            setAvatarState('speaking');
          },
          onAudioPlaying: () => {
            setVoiceState('speaking');
            setAvatarState('speaking');
          },
          onAudioFinished: () => {
            setVoiceState('idle');
            setAvatarState('idle');
            setActiveSpeakingText('');
          },
        },
      });
    },
    [session, hasBackendTTS]
  );

  // Stop current patient voice & reset avatar to idle
  const handleStopAudio = () => {
    textToSpeechService.stop();
    setVoiceState('idle');
    setAvatarState('idle');
    setActiveSpeakingText('');
  };

  // Replay last patient response
  const handleReplayAudio = () => {
    const lastPatientMsg = [...messages].reverse().find((m) => m.sender === 'patient');
    if (lastPatientMsg && session) {
      playPatientVoice(lastPatientMsg.message, session.language || 'en');
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const newMuted = textToSpeechService.toggleMute();
    setIsMuted(newMuted);
    if (newMuted) {
      handleStopAudio();
    }
  };

  // Switch between Voice Mode and Text Mode
  const handleToggleMode = () => {
    if (mode === 'voice') {
      speechRecognitionService.abortListening();
      handleStopAudio();
      setMode('text');
    } else {
      setMode('voice');
    }
  };

  // Start Speech-to-Text Listening (Avatar enters listening state)
  const startListening = () => {
    if (!session || isSending) return;

    // Interruption handling: Stop patient speech immediately
    handleStopAudio();

    setError('');
    setInterimTranscript('');
    setVoiceState('listening');
    setAvatarState('listening');

    const lang = session.language || 'en';

    speechRecognitionService.startListening(lang, {
      onStart: () => {
        setVoiceState('listening');
        setAvatarState('listening');
      },
      onInterimResult: (transcript) => {
        setInterimTranscript(transcript);
      },
      onFinalResult: (transcript) => {
        setInterimTranscript('');
        if (transcript.trim()) {
          handleSendVoiceMessage(transcript.trim());
        } else {
          setVoiceState('idle');
          setAvatarState('idle');
        }
      },
      onError: (friendlyError) => {
        setVoiceState('error');
        setAvatarState('idle');
        setError(friendlyError);
        setVoiceFallbackNotice('Voice recognition issue. You can continue speaking or switch to text.');
      },
      onEnd: () => {
        setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
        setAvatarState((prev) => (prev === 'listening' ? 'idle' : prev));
      },
    });
  };

  // Stop listening manually
  const stopListening = () => {
    speechRecognitionService.stopListening();
  };

  // Quick ask question from suggested clinical prompts
  const handleQuickAsk = (questionText: string) => {
    if (isSending || !isActive) return;
    if (mode === 'text') {
      setInput(questionText);
      inputRef.current?.focus();
    } else {
      // Direct voice consultation ask
      handleSendVoiceMessage(questionText);
    }
  };

  // Handle Voice Message Submission
  const handleSendVoiceMessage = async (recognizedText: string) => {
    if (!sessionId || !session || !recognizedText.trim() || isSending) return;

    setIsSending(true);
    setVoiceState('thinking');
    setAvatarState('thinking');
    setError('');

    try {
      const response = await sessionsService.sendMessage(sessionId, {
        message: recognizedText,
        messageType: 'voice',
        transcription: recognizedText,
      });

      setMessages((prev) => [...prev, response.studentMessage, response.patientMessage]);
      setHasBackendTTS(!!response.hasBackendTTS);

      // Emotion Layer update
      if (response.emotion) {
        setCurrentEmotion(response.emotion);
        setEmotionIntensity(response.intensity || 0.35);
      }

      // Play patient voice with synchronized avatar lip-sync
      const patientText = response.patientMessage.message;
      playPatientVoice(patientText, session.language || 'en');
    } catch (err) {
      setVoiceState('error');
      setAvatarState('idle');
      setError(getApiError(err));
      setVoiceFallbackNotice('Failed to generate response. You can try asking again with text.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Text Message Submission
  const handleSendTextMessage = async () => {
    if (!input.trim() || !sessionId || isSending) return;

    const messageText = input.trim();
    setInput('');
    setIsSending(true);
    setError('');

    handleStopAudio();
    setVoiceState('thinking');
    setAvatarState('thinking');

    try {
      const response = await sessionsService.sendMessage(sessionId, {
        message: messageText,
        messageType: 'text',
      });

      setMessages((prev) => [...prev, response.studentMessage, response.patientMessage]);

      if (response.emotion) {
        setCurrentEmotion(response.emotion);
        setEmotionIntensity(response.intensity || 0.35);
      }

      if (mode === 'voice' && !isMuted) {
        playPatientVoice(response.patientMessage.message, session?.language || 'en');
      } else {
        setVoiceState('idle');
        setAvatarState('idle');
      }
    } catch (err) {
      setVoiceState('idle');
      setAvatarState('idle');
      setError(getApiError(err));
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTextMessage();
    }
  };

  // End Consultation
  const handleEnd = async () => {
    if (!sessionId) return;
    setIsEnding(true);
    textToSpeechService.stop();
    speechRecognitionService.abortListening();
    try {
      await sessionsService.endSession(sessionId);
      navigate(`/session/${sessionId}/evaluation`);
    } catch (err) {
      setError(getApiError(err));
      setIsEnding(false);
      setShowEndConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-200">Entering Virtual Clinical Consultation Room...</p>
          <p className="text-xs text-slate-400">Loading AI digital patient & clinical telemetry</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Session not found.</p>
        <button onClick={() => navigate('/cases')} className="btn-primary mt-4">
          Browse Cases
        </button>
      </div>
    );
  }

  const pc = session.patientCase;
  const isActive = session.status === 'active';
  const isBangla = session.language === 'bn';
  const questionCount = messages.filter((m) => m.sender === 'student').length;

  return (
    <div className={`flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden ${focusMode ? 'fixed inset-0 z-50' : ''}`}>
      {/* ──────────────────────────────────────────────────────────── */}
      {/* Consultation Header                                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-slate-800 px-5 py-3 flex items-center justify-between shadow-md z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEndConfirm(true)}
            className="text-xs font-semibold px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors"
          >
            ← Exit
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <div>
            <h1 className="font-bold text-sm tracking-wide flex items-center gap-2 text-white">
              <span>{pc.patientName}</span>
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {pc.title}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {pc.patientAge}y · {pc.patientGender} · {pc.category}
            </p>
          </div>
        </div>

        {/* Right tools: Language Badge, Mode Toggle, Focus Mode, Audio Mute, Timer, End */}
        <div className="flex items-center gap-2.5">
          {/* Language Indicator */}
          <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700">
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>{isBangla ? 'বাংলা (BN)' : 'English (EN)'}</span>
          </div>

          {/* Mode Switcher */}
          <button
            onClick={handleToggleMode}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              mode === 'voice'
                ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle Voice / Text Mode"
          >
            {mode === 'voice' ? <Mic className="w-3.5 h-3.5" /> : <Keyboard className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{mode === 'voice' ? 'Voice Mode' : 'Text Mode'}</span>
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              isMuted
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
          </button>

          {/* Focus Mode (Fullscreen Toggle) */}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              focusMode
                ? 'bg-teal-600 text-white border-teal-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title={focusMode ? 'Exit Focus Mode' : 'Focus Mode (Maximize Avatar)'}
          >
            {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Consultation Timer (Continuous) */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-teal-400 border border-teal-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDuration(elapsed)}</span>
          </div>

          {/* End Consultation */}
          {isActive && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="text-xs font-bold px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-sm"
            >
              End Session
            </button>
          )}
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Main Consultation Area                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left / Center: Avatar Stage + Controls */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
          {/* Central Realistic 3D Avatar Area */}
          <div className="flex-1 p-3 sm:p-4 min-h-[300px] flex items-center justify-center relative overflow-hidden">
            <PatientAvatarCanvas
              patientCase={pc as any}
              avatarState={avatarState}
              emotion={currentEmotion}
              emotionIntensity={emotionIntensity}
              speakingText={activeSpeakingText}
              audioElement={textToSpeechService.getCurrentAudio()}
              focusMode={focusMode}
              onToggleFocusMode={() => setFocusMode(!focusMode)}
              onError={(msg) => setVoiceFallbackNotice(`Avatar notice: ${msg}. Voice consultation continuing.`)}
            />
          </div>

          {/* Error / Fallback Banners */}
          {error && (
            <div className="mx-4 mb-2 bg-red-950/80 border border-red-800 text-red-200 rounded-lg px-4 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {voiceFallbackNotice && (
            <div className="mx-4 mb-2 bg-amber-950/80 border border-amber-800 text-amber-200 rounded-lg px-4 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{voiceFallbackNotice}</span>
              </div>
              <button onClick={() => setVoiceFallbackNotice('')} className="text-amber-400 hover:text-amber-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Real-time Interim Transcription Preview ("Hearing you speak...") */}
          {interimTranscript && (
            <div className="mx-4 mb-2 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-center gap-2 shadow-lg animate-pulse">
              <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
              <div className="flex-1">
                <span className="font-bold text-emerald-400">Hearing speech: </span>
                <span className="italic">"{interimTranscript}"</span>
              </div>
            </div>
          )}

          {/* Clinical Guidance: Quick Suggested SOCRATES Questions */}
          {isActive && (
            <div className="bg-slate-900/95 border-t border-slate-800/80 px-4 py-2.5 z-20">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-400">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isBangla ? 'সহায়ক ক্লিনিক্যাল প্রশ্ন (1-Click Ask)' : 'Suggested Clinical Inquiries'}</span>
                    </span>
                    <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-[10px]">
                      <button
                        type="button"
                        onClick={() => setSuggestionCategory('socrates')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          suggestionCategory === 'socrates' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        SOCRATES
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuggestionCategory('history')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          suggestionCategory === 'history' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isBangla ? 'পূর্ব ইতিহাস' : 'Past History'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuggestionCategory('systems')}
                        className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                          suggestionCategory === 'systems' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isBangla ? 'উপসর্গ পর্যালোচনা' : 'System Review'}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="text-[11px] text-slate-500 hover:text-slate-300 font-medium flex items-center gap-1"
                  >
                    <span>{showSuggestions ? (isBangla ? 'লুকান' : 'Hide') : (isBangla ? 'দেখান' : 'Show')}</span>
                    {showSuggestions ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  </button>
                </div>

                {showSuggestions && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
                    {(isBangla ? SUGGESTED_QUESTIONS.bn : SUGGESTED_QUESTIONS.en)[suggestionCategory].map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuickAsk(q)}
                        disabled={isSending || voiceState === 'listening' || voiceState === 'thinking'}
                        className="flex-shrink-0 bg-slate-800/90 hover:bg-teal-900/40 border border-slate-700/70 hover:border-teal-500/50 text-slate-300 hover:text-teal-200 px-3 py-1.5 rounded-full transition-all text-[11px] flex items-center gap-1.5 disabled:opacity-40"
                        title={mode === 'text' ? 'Insert into input' : 'Ask patient directly'}
                      >
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Interaction Control Bar */}
          <div className="bg-slate-900 border-t border-slate-800 p-4 z-20 flex-shrink-0">
            <div className="max-w-2xl mx-auto">
              {mode === 'voice' ? (
                /* VOICE MODE CONTROLS */
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center gap-4 w-full">
                    {/* Switch to Text Fallback */}
                    <button
                      type="button"
                      onClick={() => setMode('text')}
                      className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors border border-slate-800"
                      title="Switch to Keyboard / Text Mode"
                    >
                      <Keyboard className="w-5 h-5" />
                    </button>

                    {/* Central Microphone Button with Animated States */}
                    {voiceState === 'listening' ? (
                      <button
                        type="button"
                        onClick={stopListening}
                        className="flex items-center gap-3 px-8 py-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xl shadow-emerald-600/30 transition-all transform hover:scale-105 animate-pulse"
                      >
                        <Radio className="w-6 h-6 text-white animate-spin" />
                        <span className="text-base tracking-wide">Listening... (Tap to Send)</span>
                      </button>
                    ) : voiceState === 'thinking' ? (
                      <button
                        disabled
                        className="flex items-center gap-3 px-8 py-4 rounded-full bg-indigo-600 text-white font-bold opacity-80 cursor-not-allowed"
                      >
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-base tracking-wide">Patient is thinking...</span>
                      </button>
                    ) : voiceState === 'speaking' ? (
                      <button
                        type="button"
                        onClick={handleStopAudio}
                        className="flex items-center gap-3 px-8 py-4 rounded-full bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-xl shadow-teal-600/30 transition-all transform hover:scale-105"
                      >
                        <Square className="w-5 h-5 fill-white" />
                        <span className="text-base tracking-wide">Patient is speaking (Tap to Interrupt)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startListening}
                        disabled={isSending || !isActive}
                        className="group flex items-center gap-3 px-8 py-4 rounded-full bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-xl shadow-teal-600/20 transition-all transform hover:scale-105 disabled:opacity-50"
                      >
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                          <Mic className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-base tracking-wide">
                          {isBangla ? 'কথা বলতে চাপুন (Tap to Speak)' : 'Tap to Speak'}
                        </span>
                      </button>
                    )}

                    {/* Replay Last Patient Voice */}
                    <button
                      type="button"
                      onClick={handleReplayAudio}
                      disabled={voiceState === 'listening' || isSending}
                      className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors border border-slate-800 disabled:opacity-30"
                      title="Replay Last Patient Voice"
                    >
                      <RotateCcw className="w-5 h-5 text-teal-400" />
                    </button>
                  </div>

                  {/* Transcript toggle button */}
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>
                      {isBangla
                        ? 'মাইক্রোফোনে স্বাভাবিক বাংলায় কথা বলুন। রোগী বাংলায় উত্তর দেবে।'
                        : 'Speak naturally to your patient. Avatar lip-syncs with speech in real-time.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTranscript(!showTranscript)}
                      className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                    >
                      <span>{showTranscript ? 'Hide Transcript' : 'Show Transcript'}</span>
                      {showTranscript ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                /* TEXT MODE FALLBACK */
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 text-xs">
                    <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                      <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Text Consultation Mode</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setMode('voice')}
                      className="font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                    >
                      <Mic className="w-3 h-3" />
                      <span>Switch to Voice Mode</span>
                    </button>
                  </div>

                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isBangla
                          ? 'রোগীকে বাংলায় প্রশ্ন করুন... (Enter চাপুন)'
                          : 'Ask the patient a question... (Press Enter to send)'
                      }
                      rows={1}
                      className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 focus:border-teal-500 focus:outline-hidden resize-none min-h-[44px] max-h-32 text-sm"
                      disabled={isSending || !isActive}
                    />
                    <button
                      onClick={handleSendTextMessage}
                      disabled={!input.trim() || isSending || !isActive}
                      className="w-11 h-11 bg-teal-600 hover:bg-teal-500 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50"
                      title="Send Question"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Side Panel: Consultation Transcript & Clinical Notes */}
        {showTranscript && (
          <aside className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col flex-shrink-0 z-10 transition-all duration-300">
            {/* Tab Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-sm text-slate-200">Consultation Transcript</h3>
              </div>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transcript Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No dialogue recorded yet. Tap the microphone to begin.
                </div>
              ) : (
                messages
                  .filter((m) => m.sender !== 'system')
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'student' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">
                          {msg.sender === 'student' ? 'You (Doctor)' : pc.patientName}
                        </span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}</span>
                        {msg.emotion && (
                          <span className="text-[10px] text-teal-400 bg-teal-950/60 border border-teal-800/60 px-1.5 py-0.2 rounded capitalize">
                            {msg.emotion}
                          </span>
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed max-w-[90%] shadow-sm ${
                          msg.sender === 'student'
                            ? 'bg-teal-600 text-white rounded-tr-xs'
                            : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-xs'
                        }`}
                      >
                        {msg.message}
                      </div>
                      {msg.sender === 'patient' && (
                        <button
                          onClick={() => playPatientVoice(msg.message, session.language || 'en')}
                          className="mt-1 text-[10px] font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Replay audio</span>
                        </button>
                      )}
                    </div>
                  ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Clinical Focus Guidelines Drawer */}
            <div className="p-3.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between text-slate-300 font-bold mb-1">
                <span>Clinical History Taking (SOCRATES)</span>
                <span className="text-teal-400">{questionCount} questions</span>
              </div>
              <p>• Site, Onset, Character, Radiation, Associations, Timing, Exacerbating, Severity.</p>
            </div>
          </aside>
        )}
      </div>

      {/* End Consultation Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-slate-200">
            <h3 className="font-bold text-white text-lg mb-2">End Clinical Consultation?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              This will conclude your consultation with {pc.patientName}. You will be able to review the full transcript and consultation metrics in Session History.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Keep Practicing
              </button>
              <button
                type="button"
                onClick={handleEnd}
                disabled={isEnding}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
              >
                {isEnding ? 'Ending...' : 'End Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
