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
  ChevronDown,
  ChevronUp,
  Sparkles,
  WifiOff,
  Bug,
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

  // Network Connectivity Tracking (Part 27)
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Mobile View Modes (Part 20 & 21: Split, Avatar Focus, Chat Focus)
  const [mobileView, setMobileView] = useState<'split' | 'avatar' | 'chat'>('split');

  // Developer Debug Mode (Part 31)
  const [lastDebugInfo, setLastDebugInfo] = useState<any>(null);
  const [showDebugModal, setShowDebugModal] = useState(false);

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
        'আপনার এই সমস্যা কবে থেকে শুরু হয়েছে?',
        'ব্যথাটা ঠিক কোথায় হচ্ছে আঙুল দিয়ে দেখাবেন?',
        'ব্যথা কি অন্য কোথাও যেমন হাত, গলা বা পিঠে ছড়িয়ে পড়ে?',
        '১ থেকে ১০ এর স্কেলে আপনার কষ্ট কতটা তীব্র?',
        'কী করলে কষ্ট কমে বা বেড়ে যায়?',
        'ব্যথাটা কেমন ধরনের — তীব্র, ভোঁতা, নাকি ভারী কিছু চেপে বসার মতো?',
      ],
      history: [
        'আপনার কি ডায়াবেটিস, প্রেসার বা অন্য কোনো আগের রোগ আছে?',
        'আপনি কি নিয়মিত কোনো ওষুধ বা ইনহেলার ব্যবহার করেন?',
        'কোনো ওষুধ বা খাবারে কি আপনার অ্যালার্জি আছে?',
        'পরিবারে কারও কি এই ধরনের সমস্যা আছে?',
        'আপনি কি ধূমপান বা তামাকজাতীয় কিছু সেবন করেন?',
      ],
      systems: [
        'আপনার কি জ্বর, কাঁপুনি বা রাতে ঘাম হচ্ছে?',
        'কোনো শ্বাসকষ্ট, কাশি বা বুকে চাপ অনুভব করছেন?',
        'বমি ভাব, বমি বা খাওয়ার রুচি কমে গেছে কি?',
        'মাথা ঘোরা বা অতিরিক্ত ক্লান্তি লাগছে?',
      ],
    },
  };

  // Consultation Timer
  const [elapsed, setElapsed] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<any>(null);

  // Online / Offline Network Monitor (Part 27)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  // Auto-scroll chat to latest message (Part 23)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  // Synchronized Voice Playback with AI Avatar Lip-Sync
  const playPatientVoice = useCallback(
    async (text: string, language?: string, activeSession?: PracticeSession | null) => {
      const currentSess = activeSession || session;
      const pc = currentSess?.patientCase;

      setActiveSpeakingText(text);

      await textToSpeechService.play(text, {
        sessionId: activeSession?.id,
        language: (language || activeSession?.language || 'en') as ConsultationLanguage,
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

      // Store debug info (Part 31)
      if (response._debug) {
        setLastDebugInfo(response._debug);
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

      // Store debug info (Part 31)
      if (response._debug) {
        setLastDebugInfo(response._debug);
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
      <div className="flex items-center justify-center h-[100dvh] h-screen bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-200">Entering Virtual Clinical Consultation Room...</p>
          <p className="text-xs text-slate-400">Loading AI digital patient & clinical state engine</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 text-center bg-slate-950 min-h-screen text-slate-200">
        <p className="text-gray-400">Session not found.</p>
        <button onClick={() => navigate('/cases')} className="btn-primary mt-4">
          Browse Cases
        </button>
      </div>
    );
  }

  const pc = session.patientCase;
  const isActive = session.status === 'active';
  const isBangla = session.language === 'bn';
  const lastPatientMsg = [...messages].reverse().find((m) => m.sender === 'patient');

  return (
    <div className={`flex flex-col h-[100dvh] bg-slate-950 text-slate-100 overflow-hidden w-full ${focusMode ? 'fixed inset-0 z-50' : ''}`}>
      {/* ──────────────────────────────────────────────────────────── */}
      {/* Network Lost Reconnection Banner (Part 27)                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 z-50 animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span>Connection lost. Reconnecting... (Consultation state and history are safely preserved)</span>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Consultation Header (Mobile-First)                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-5 py-2 sm:py-3 flex flex-col md:flex-row md:items-center justify-between shadow-md z-30 flex-shrink-0 gap-2">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setShowEndConfirm(true)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors flex-shrink-0"
              title="Exit consultation"
            >
              ← Exit
            </button>
            <div className="h-4 w-px bg-slate-700 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="font-bold text-xs sm:text-sm tracking-wide flex items-center gap-1.5 sm:gap-2 text-white truncate">
                <span className="truncate">{pc.patientName}</span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-medium bg-teal-500/20 text-teal-300 border border-teal-500/30 flex-shrink-0">
                  {pc.title}
                </span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                {pc.patientAge}y · {pc.patientGender} · {pc.personality}
              </p>
            </div>
          </div>

          {/* Mobile Right: Timer, Debug & End */}
          <div className="flex items-center gap-1.5 md:hidden flex-shrink-0">
            {lastDebugInfo && (
              <button
                onClick={() => setShowDebugModal(true)}
                className="p-1 rounded bg-slate-800 text-teal-400 border border-slate-700"
                title="View Clinical State Debug Info"
              >
                <Bug className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-md text-[11px] font-mono font-semibold text-teal-400 border border-teal-500/30">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(elapsed)}</span>
            </div>
            {isActive && (
              <button
                onClick={() => setShowEndConfirm(true)}
                className="text-[11px] font-bold px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
              >
                End
              </button>
            )}
          </div>
        </div>

        {/* Tools Toolbar & Mobile View Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto pb-0.5 md:pb-0 w-full md:w-auto justify-between md:justify-end">
          {/* Mobile View Switcher (Split, Avatar, Chat) */}
          <div className="flex md:hidden items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setMobileView('split')}
              className={`px-2 py-1 rounded-md font-semibold transition-all ${
                mobileView === 'split' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Split
            </button>
            <button
              onClick={() => setMobileView('avatar')}
              className={`px-2 py-1 rounded-md font-semibold transition-all ${
                mobileView === 'avatar' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Avatar
            </button>
            <button
              onClick={() => setMobileView('chat')}
              className={`px-2 py-1 rounded-md font-semibold transition-all ${
                mobileView === 'chat' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chat
            </button>
          </div>

          {/* Language Indicator */}
          <div className="flex items-center gap-1 text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-medium border border-slate-700 flex-shrink-0">
            <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-400" />
            <span>{isBangla ? 'বাংলা' : 'EN'}</span>
          </div>

          {/* Mode Switcher */}
          <button
            onClick={handleToggleMode}
            className={`flex items-center gap-1 text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border transition-all flex-shrink-0 ${
              mode === 'voice'
                ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Toggle Voice / Text Mode"
          >
            {mode === 'voice' ? <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Keyboard className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            <span>{mode === 'voice' ? 'Voice' : 'Text'}</span>
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={handleToggleMute}
            className={`p-1.5 sm:p-2 rounded-lg border text-xs transition-colors flex-shrink-0 ${
              isMuted
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" />}
          </button>

          {/* Developer Debug Toggle (Desktop) */}
          {lastDebugInfo && (
            <button
              onClick={() => setShowDebugModal(true)}
              className="hidden md:flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300"
              title="Inspect Clinical Engine State"
            >
              <Bug className="w-3.5 h-3.5 text-teal-400" />
              <span>Debug</span>
            </button>
          )}

          {/* Desktop Transcript Panel Toggle */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`hidden md:flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all flex-shrink-0 ${
              showTranscript
                ? 'bg-teal-600 text-white border-teal-500'
                : 'bg-slate-800 text-teal-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat ({messages.filter(m => m.sender !== 'system').length})</span>
          </button>

          {/* Desktop Consultation Timer */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-teal-400 border border-teal-500/30 flex-shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDuration(elapsed)}</span>
          </div>

          {/* Desktop End Consultation */}
          {isActive && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="hidden md:block text-xs font-bold px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-sm flex-shrink-0"
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
          
          {/* Avatar Canvas Container */}
          {/* On mobile: displayed if mobileView is 'split' or 'avatar' */}
          <div
            className={`flex-shrink-0 transition-all duration-300 relative overflow-hidden flex items-center justify-center ${
              mobileView === 'chat'
                ? 'hidden md:flex md:flex-1 md:min-h-[240px]'
                : mobileView === 'avatar'
                ? 'flex-1 min-h-[280px]'
                : 'h-[36vh] sm:h-[40vh] md:flex-1 md:h-auto min-h-[170px]'
            }`}
          >
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

            {/* Mobile Avatar Overlay Speech Bubble (shown in 'avatar' mode) */}
            {mobileView === 'avatar' && lastPatientMsg && (
              <div className="absolute bottom-4 inset-x-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-xl max-h-28 overflow-y-auto text-xs text-slate-100">
                <div className="text-[10px] font-bold text-teal-400 mb-0.5">Patient:</div>
                <div>{lastPatientMsg.message}</div>
              </div>
            )}
          </div>

          {/* Mobile Split View: Conversation Chat Container */}
          {/* On mobile in 'split' or 'chat' view, render chat directly inside the main column! */}
          <div
            className={`flex-1 overflow-y-auto px-3 py-2 space-y-2.5 bg-slate-900/40 border-t border-slate-800/80 ${
              mobileView === 'avatar' ? 'hidden md:hidden' : 'block md:hidden'
            }`}
          >
            {messages.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No dialogue yet. Tap the microphone below or ask your first clinical question.
              </div>
            ) : (
              messages
                .filter((m) => m.sender !== 'system')
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'student' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">
                        {msg.sender === 'student' ? 'You' : pc.patientName}
                      </span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}</span>
                    </div>
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed max-w-[88%] shadow-sm ${
                        msg.sender === 'student'
                          ? 'bg-teal-600 text-white rounded-tr-xs'
                          : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-xs'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Real-time Interim Transcription Preview */}
          {interimTranscript && (
            <div className="mx-3 my-1 p-2 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs flex items-center gap-2 shadow-lg animate-pulse flex-shrink-0">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <div className="flex-1 truncate">
                <span className="font-bold text-emerald-400">Hearing speech: </span>
                <span className="italic">"{interimTranscript}"</span>
              </div>
            </div>
          )}

          {/* Error / Fallback Banners */}
          {error && (
            <div className="mx-3 my-1 bg-red-950/80 border border-red-800 text-red-200 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs flex-shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {voiceFallbackNotice && (
            <div className="mx-3 my-1 bg-amber-950/80 border border-amber-800 text-amber-200 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs flex-shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>{voiceFallbackNotice}</span>
              </div>
              <button onClick={() => setVoiceFallbackNotice('')} className="text-amber-400 hover:text-amber-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Clinical Guidance: Quick Suggested SOCRATES Questions */}
          {isActive && (
            <div className="bg-slate-900/90 border-t border-slate-800 px-3 py-2 z-20 flex-shrink-0">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-400">
                      <Sparkles className="w-3 h-3" />
                      <span>{isBangla ? 'ক্লিনিক্যাল প্রশ্ন' : 'Suggested Inquiries'}</span>
                    </span>
                    <div className="flex items-center gap-0.5 bg-slate-800 p-0.5 rounded-md text-[9px]">
                      <button
                        type="button"
                        onClick={() => setSuggestionCategory('socrates')}
                        className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                          suggestionCategory === 'socrates' ? 'bg-teal-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        SOCRATES
                      </button>
                      <button
                        type="button"
                        onClick={() => setSuggestionCategory('history')}
                        className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                          suggestionCategory === 'history' ? 'bg-teal-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        History
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 font-medium flex items-center gap-0.5"
                  >
                    <span>{showSuggestions ? 'Hide' : 'Show'}</span>
                    {showSuggestions ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
                  </button>
                </div>

                {showSuggestions && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
                    {(isBangla ? SUGGESTED_QUESTIONS.bn : SUGGESTED_QUESTIONS.en)[suggestionCategory].map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuickAsk(q)}
                        disabled={isSending || voiceState === 'listening' || voiceState === 'thinking'}
                        className="flex-shrink-0 bg-slate-800 hover:bg-teal-900/40 border border-slate-700 text-slate-300 hover:text-teal-200 px-2.5 py-1 rounded-full transition-all text-[11px] disabled:opacity-40"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Interaction Control Bar (Mobile-First Touch Target) */}
          <div
            className="bg-slate-900 border-t border-slate-800 p-2.5 sm:p-4 z-20 flex-shrink-0"
            style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="max-w-2xl mx-auto">
              {mode === 'voice' ? (
                /* VOICE MODE CONTROLS */
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
                    {/* Switch to Text Fallback */}
                    <button
                      type="button"
                      onClick={() => setMode('text')}
                      className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors border border-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Switch to Keyboard / Text Mode"
                    >
                      <Keyboard className="w-5 h-5" />
                    </button>

                    {/* Central High-Affordance Microphone Button (56px minimum height) */}
                    {voiceState === 'listening' ? (
                      <button
                        type="button"
                        onClick={stopListening}
                        className="flex-1 max-w-xs flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xl shadow-emerald-600/30 transition-all min-h-[52px] animate-pulse"
                      >
                        <Radio className="w-5 h-5 text-white animate-spin" />
                        <span className="text-sm sm:text-base">Listening... (Tap to Send)</span>
                      </button>
                    ) : voiceState === 'thinking' ? (
                      <button
                        disabled
                        className="flex-1 max-w-xs flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-indigo-600 text-white font-bold opacity-80 cursor-not-allowed min-h-[52px]"
                      >
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm sm:text-base">Patient thinking...</span>
                      </button>
                    ) : voiceState === 'speaking' ? (
                      <button
                        type="button"
                        onClick={handleStopAudio}
                        className="flex-1 max-w-xs flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-xl shadow-teal-600/30 transition-all min-h-[52px]"
                      >
                        <Square className="w-4 h-4 fill-white" />
                        <span className="text-sm sm:text-base">Patient speaking (Tap to Stop)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startListening}
                        disabled={isSending || !isActive}
                        className="flex-1 max-w-xs group flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-xl shadow-teal-600/20 transition-all min-h-[52px] disabled:opacity-50"
                      >
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                          <Mic className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm sm:text-base">
                          {isBangla ? 'কথা বলুন (Tap to Speak)' : 'Tap to Speak'}
                        </span>
                      </button>
                    )}

                    {/* Replay Last Patient Voice */}
                    <button
                      type="button"
                      onClick={handleReplayAudio}
                      disabled={voiceState === 'listening' || isSending}
                      className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors border border-slate-800 disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Replay Last Patient Voice"
                    >
                      <RotateCcw className="w-5 h-5 text-teal-400" />
                    </button>
                  </div>
                </div>
              ) : (
                /* TEXT MODE FALLBACK */
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400 flex items-center gap-1">
                      <Keyboard className="w-3 h-3 text-slate-400" />
                      <span>Text Consultation</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setMode('voice')}
                      className="font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                    >
                      <Mic className="w-3 h-3" />
                      <span>Switch to Voice</span>
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
                          : 'Ask the patient a question...'
                      }
                      rows={1}
                      className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3.5 py-2.5 focus:border-teal-500 focus:outline-hidden resize-none min-h-[44px] max-h-28 text-sm"
                      disabled={isSending || !isActive}
                    />
                    <button
                      onClick={handleSendTextMessage}
                      disabled={!input.trim() || isSending || !isActive}
                      className="w-11 h-11 bg-teal-600 hover:bg-teal-500 text-white rounded-xl flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px]"
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

        {/* Desktop Right Side Panel: Consultation Transcript & History */}
        {showTranscript && (
          <aside className="hidden md:flex w-96 bg-slate-900 border-l border-slate-800 flex-col flex-shrink-0 shadow-2xl transition-all duration-300">
            {/* Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-xs text-slate-200">Consultation Dialogue ({messages.filter(m => m.sender !== 'system').length})</h3>
              </div>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
                title="Hide Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transcript Messages List */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin">
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
                      <div className="flex items-center gap-1 mb-0.5 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">
                          {msg.sender === 'student' ? 'Doctor' : pc.patientName}
                        </span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}</span>
                        {msg.emotion && (
                          <span className="text-[9px] text-teal-400 bg-teal-950/60 border border-teal-800/60 px-1 py-0.2 rounded capitalize">
                            {msg.emotion}
                          </span>
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed max-w-[90%] shadow-sm ${
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
                          className="mt-0.5 text-[9px] font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-0.5"
                        >
                          <Volume2 className="w-3 h-3" /> Replay
                        </button>
                      )}
                    </div>
                  ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </aside>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Developer / Admin Debug Modal (Part 31)                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showDebugModal && lastDebugInfo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-500/40 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-white">AI Patient Clinical Engine Debug (Turn {lastDebugInfo.conversationTurn})</h3>
              </div>
              <button onClick={() => setShowDebugModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-slate-300">
              <div>
                <span className="font-bold text-teal-400 uppercase text-[10px] tracking-wider">Student Question</span>
                <p className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 mt-1 font-mono text-white">
                  "{lastDebugInfo.studentQuestion}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-bold text-teal-400 uppercase text-[10px] tracking-wider">Detected Intents</span>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 mt-1 flex flex-wrap gap-1">
                    {lastDebugInfo.detectedIntents?.map((it: string) => (
                      <span key={it} className="bg-teal-900/50 text-teal-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-teal-400 uppercase text-[10px] tracking-wider">Language & Topic</span>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 mt-1 text-[11px]">
                    <div>Lang: <span className="font-bold text-white">{lastDebugInfo.detectedLanguage}</span></div>
                    <div className="truncate">Topic: <span className="text-slate-200">{lastDebugInfo.currentTopic}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <span className="font-bold text-teal-400 uppercase text-[10px] tracking-wider">Retrieved Clinical Facts</span>
                <div className="space-y-1.5 mt-1">
                  {lastDebugInfo.retrievedFacts?.length === 0 ? (
                    <p className="text-slate-500 text-[11px] italic">No specific clinical facts retrieved (clarification or greeting)</p>
                  ) : (
                    lastDebugInfo.retrievedFacts?.map((rf: any, i: number) => (
                      <div key={i} className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px]">
                        <div className="flex items-center justify-between text-teal-400 font-semibold mb-0.5">
                          <span>{rf.intent}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300">
                            {rf.previouslyDisclosed ? 'Repeated (Count: ' + rf.disclosureCount + ')' : 'First Disclosure'}
                          </span>
                        </div>
                        <p className="text-slate-300">{rf.value}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <span className="font-bold text-teal-400 uppercase text-[10px] tracking-wider">Consistency Validation</span>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 mt-1 flex items-center justify-between">
                  <span className={lastDebugInfo.validationResult?.valid ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {lastDebugInfo.validationResult?.valid ? '✓ Passed Safety & Consistency Checks' : '✗ Failed Validation'}
                  </span>
                  <span className="text-slate-400 text-[10px]">Persona: {lastDebugInfo.personalityApplied}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button onClick={() => setShowDebugModal(false)} className="btn-secondary text-xs px-3 py-1.5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* End Consultation Confirmation Modal                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-center space-y-3">
            <h3 className="font-bold text-base text-white">Complete Consultation?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you ready to conclude your history-taking session with {pc.patientName}? Your clinical history
              rubric will be evaluated based on questions asked.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2.5">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                disabled={isEnding}
              >
                Continue Consultation
              </button>
              <button
                onClick={handleEnd}
                disabled={isEnding}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-red-600/30"
              >
                {isEnding ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Evaluating...</span>
                  </>
                ) : (
                  'Conclude & Grade'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
