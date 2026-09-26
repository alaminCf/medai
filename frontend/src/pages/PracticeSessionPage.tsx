import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionsService } from '../services/sessionsService';
import speechRecognitionService from '../services/speechRecognitionService';
import textToSpeechService from '../services/textToSpeechService';
import type {
  PracticeSession,
  ConversationMessage,
  VoiceState,
  ConsultationMode,
  ConsultationLanguage,
} from '../types';
import { formatDuration } from '../utils/formatters';
import {
  Clock,
  Send,
  AlertCircle,
  X,
  User,
  Volume2,
  VolumeX,
  RotateCcw,
  Square,
  Mic,
  
  MessageSquare,
  Keyboard,
  Globe,
  Radio,
  CheckCircle2,
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

  // Phase 2: Voice & Consultation Mode State
  const [mode, setMode] = useState<ConsultationMode>('voice');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [voiceFallbackNotice, setVoiceFallbackNotice] = useState('');
  const [hasBackendTTS, setHasBackendTTS] = useState(false);

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

        // Play initial greeting if in voice mode and messages exist
        const opening = sess.messages?.find((m) => m.sender === 'patient');
        if (opening && sess.voiceEnabled && !textToSpeechService.isMuted()) {
          setTimeout(() => {
            playPatientVoice(opening.message, sess.language || 'en', sess);
          }, 600);
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

  // Session duration timer (continuous throughout the consultation)
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

  // Auto-scroll transcript to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript, isSending]);

  // Voice playback helper (guarantees interruption safety & Phase 3 events)
  const playPatientVoice = useCallback(
    (text: string, language: ConsultationLanguage, sessObj?: PracticeSession | null) => {
      const activeSession = sessObj || session;
      const pc = activeSession?.patientCase;

      textToSpeechService.play(text, {
        sessionId: activeSession?.id,
        language: language || activeSession?.language || 'en',
        voiceId: pc?.voiceId,
        voiceGender: pc?.voiceGender,
        speed: pc?.speakingSpeed || 1.0,
        useBackendTTS: hasBackendTTS,
        events: {
          onResponseStarted: () => setVoiceState('speaking'),
          onAudioPlaying: () => setVoiceState('speaking'),
          onAudioFinished: () => setVoiceState('idle'),
        },
      });
    },
    [session, hasBackendTTS]
  );

  // Stop current patient voice
  const handleStopAudio = () => {
    textToSpeechService.stop();
    setVoiceState('idle');
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
      setVoiceState('idle');
    }
  };

  // Switch between Voice Mode and Text Mode
  const handleToggleMode = () => {
    if (mode === 'voice') {
      speechRecognitionService.abortListening();
      textToSpeechService.stop();
      setVoiceState('idle');
      setMode('text');
    } else {
      setMode('voice');
    }
  };

  // Start Speech-to-Text Listening
  const startListening = () => {
    if (!session || isSending) return;

    // Interruption handling: Stop patient speech immediately
    textToSpeechService.stop();

    setError('');
    setInterimTranscript('');
    setVoiceState('listening');

    const lang = session.language || 'en';

    speechRecognitionService.startListening(lang, {
      onStart: () => {
        setVoiceState('listening');
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
        }
      },
      onError: (friendlyError) => {
        setVoiceState('error');
        setError(friendlyError);
        setVoiceFallbackNotice('Voice recognition issue. You can continue talking or switch to text.');
      },
      onEnd: () => {
        setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev));
      },
    });
  };

  // Stop listening manually (sends what was captured)
  const stopListening = () => {
    speechRecognitionService.stopListening();
  };

  // Handle Voice Message Submission
  const handleSendVoiceMessage = async (recognizedText: string) => {
    if (!sessionId || !session || !recognizedText.trim() || isSending) return;

    setIsSending(true);
    setVoiceState('thinking');
    setError('');

    try {
      const response = await sessionsService.sendMessage(sessionId, {
        message: recognizedText,
        messageType: 'voice',
        transcription: recognizedText,
      });

      setMessages((prev) => [...prev, response.studentMessage, response.patientMessage]);
      setHasBackendTTS(!!response.hasBackendTTS);

      // Play patient voice response
      const patientText = response.patientMessage.message;
      playPatientVoice(patientText, session.language || 'en');
    } catch (err) {
      setVoiceState('error');
      setError(getApiError(err));
      setVoiceFallbackNotice('Failed to generate response. You can try asking again with text.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Text Message Submission (Phase 1 text consultation fallback)
  const handleSendTextMessage = async () => {
    if (!input.trim() || !sessionId || isSending) return;

    const messageText = input.trim();
    setInput('');
    setIsSending(true);
    setError('');

    // Stop active audio
    textToSpeechService.stop();
    setVoiceState('thinking');

    try {
      const response = await sessionsService.sendMessage(sessionId, {
        message: messageText,
        messageType: 'text',
      });

      setMessages((prev) => [...prev, response.studentMessage, response.patientMessage]);

      // If voice mode is active, speak the response even if student typed!
      if (mode === 'voice' && !isMuted) {
        playPatientVoice(response.patientMessage.message, session?.language || 'en');
      } else {
        setVoiceState('idle');
      }
    } catch (err) {
      setVoiceState('idle');
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
      navigate(`/history/${sessionId}`);
    } catch (err) {
      setError(getApiError(err));
      setIsEnding(false);
      setShowEndConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Preparing consultation room...</p>
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
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* Top Bar                                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header className="bg-navy-900 text-white px-5 py-3 flex items-center justify-between shadow-md z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEndConfirm(true)}
            className="text-xs font-semibold px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            ← Exit Consultation
          </button>
          <div className="h-4 w-px bg-white/20" />
          <div>
            <h1 className="font-bold text-sm tracking-wide flex items-center gap-2">
              <span>{pc.patientName}</span>
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-teal-500/20 text-teal-300 border border-teal-400/30">
                {pc.title}
              </span>
            </h1>
            <p className="text-xs text-navy-300">
              {pc.patientAge}y · {pc.patientGender} · {pc.category}
            </p>
          </div>
        </div>

        {/* Right tools: Language Badge, Mode Toggle, Audio Mute, Timer, End */}
        <div className="flex items-center gap-3">
          {/* Language Indicator */}
          <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-white/10 text-white font-medium">
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>{isBangla ? 'বাংলা (BN)' : 'English (EN)'}</span>
          </div>

          {/* Mode Switcher */}
          <button
            onClick={handleToggleMode}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              mode === 'voice'
                ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                : 'bg-white/10 text-navy-200 border-white/20 hover:bg-white/20'
            }`}
            title="Switch between Voice Mode and Text Mode"
          >
            {mode === 'voice' ? <Mic className="w-3.5 h-3.5" /> : <Keyboard className="w-3.5 h-3.5" />}
            <span>{mode === 'voice' ? 'Voice Mode' : 'Text Mode'}</span>
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-lg border text-xs transition-colors ${
              isMuted
                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
          </button>

          {/* Consultation Timer (continuous across whole interaction) */}
          <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-teal-300 border border-teal-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDuration(elapsed)}</span>
          </div>

          {/* End Consultation */}
          {isActive && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="text-xs font-bold px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
            >
              End Consultation
            </button>
          )}
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3-Panel Consultation Layout                                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Patient Medical Card */}
        <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-200 p-5 overflow-y-auto scrollbar-thin flex-shrink-0">
          <div className="text-center pb-5 border-b border-gray-100">
            {/* Patient Avatar Placeholder */}
            <div
              className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all duration-300 shadow-md ${
                voiceState === 'listening'
                  ? 'bg-emerald-100 ring-4 ring-emerald-400 animate-pulse'
                  : voiceState === 'speaking'
                  ? 'bg-teal-100 ring-4 ring-teal-400'
                  : voiceState === 'thinking'
                  ? 'bg-indigo-100 ring-4 ring-indigo-300 animate-pulse'
                  : 'bg-navy-50 ring-2 ring-navy-200'
              }`}
            >
              <User
                className={`w-10 h-10 ${
                  voiceState === 'listening'
                    ? 'text-emerald-700'
                    : voiceState === 'speaking'
                    ? 'text-teal-700'
                    : voiceState === 'thinking'
                    ? 'text-indigo-700'
                    : 'text-navy-700'
                }`}
              />
            </div>
            <h2 className="mt-3 font-bold text-gray-900 text-base">{pc.patientName}</h2>
            <p className="text-xs text-gray-500">
              {pc.patientAge} years old · {pc.patientGender}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Simulated Virtual Patient</span>
            </div>
          </div>

          <div className="py-4 space-y-4 text-xs">
            <div>
              <p className="font-semibold text-gray-400 uppercase tracking-wider text-[11px] mb-1.5">Chief Complaint</p>
              <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-amber-900 italic font-medium leading-relaxed">
                "{pc.chiefComplaint}"
              </div>
            </div>

            <div className="space-y-2 border-t border-gray-100 pt-3">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Category:</span>
                <span className="font-semibold text-gray-800">{pc.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Difficulty:</span>
                <span className="font-semibold capitalize text-gray-800">{pc.difficulty}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Language:</span>
                <span className="font-semibold text-gray-800">{isBangla ? 'বাংলা' : 'English'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Questions:</span>
                <span className="font-semibold text-gray-800">{questionCount} asked</span>
              </div>
            </div>

            {/* Structured History Guide for medical students (SOCRATES) */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 mt-4">
              <p className="font-bold text-blue-900 text-[11px] uppercase tracking-wide mb-1.5">
                Clinical Focus Guide
              </p>
              <ul className="text-blue-800 space-y-1 text-[11px] leading-tight">
                <li>• <strong>S</strong>ite & Onset of pain/issue</li>
                <li>• <strong>C</strong>haracter & Radiation</li>
                <li>• <strong>A</strong>ssociations & Timing</li>
                <li>• <strong>E</strong>xacerbating / Relieving</li>
                <li>• <strong>S</strong>everity & Medical History</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* Center Panel — Patient Area + Conversation + Voice Controls */}
        {/* ──────────────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
          {/* Patient Voice Status Header (Consultation Room Screen) */}
          <section className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 shadow-sm">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              {/* Patient State Indicator */}
              <div className="flex items-center gap-3.5">
                {/* Visual Avatar / Status Animation */}
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                      voiceState === 'listening'
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-200 animate-pulse'
                        : voiceState === 'speaking'
                        ? 'bg-teal-600 text-white ring-4 ring-teal-200'
                        : voiceState === 'thinking'
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-200'
                        : 'bg-navy-900 text-white'
                    }`}
                  >
                    {pc.patientName.charAt(0)}
                  </div>
                  {/* Subtle live indicator dot */}
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      voiceState === 'speaking'
                        ? 'bg-teal-500'
                        : voiceState === 'listening'
                        ? 'bg-emerald-500'
                        : 'bg-gray-400'
                    }`}
                  />
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{pc.patientName}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {/* Status Text & Animation */}
                    {voiceState === 'listening' ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>Patient is listening to you...</span>
                      </span>
                    ) : voiceState === 'thinking' ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                        <span>Patient is thinking...</span>
                      </span>
                    ) : voiceState === 'speaking' ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-teal-600">
                        {/* Audio Waveform Animation */}
                        <span className="flex items-center gap-0.5 h-3">
                          <span className="w-0.5 bg-teal-500 rounded-full animate-pulse h-2" />
                          <span className="w-0.5 bg-teal-500 rounded-full animate-pulse h-3.5" style={{ animationDelay: '100ms' }} />
                          <span className="w-0.5 bg-teal-500 rounded-full animate-pulse h-2" style={{ animationDelay: '200ms' }} />
                          <span className="w-0.5 bg-teal-500 rounded-full animate-pulse h-3" style={{ animationDelay: '150ms' }} />
                        </span>
                        <span>Patient is speaking...</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Ready for your next question</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Patient Speech Quick Controls */}
              <div className="flex items-center gap-1.5">
                {voiceState === 'speaking' && (
                  <button
                    onClick={handleStopAudio}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                    title="Stop Patient Speech"
                  >
                    <Square className="w-3 h-3 text-red-500 fill-red-500" />
                    <span>Stop</span>
                  </button>
                )}
                <button
                  onClick={handleReplayAudio}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                  title="Replay Last Response"
                >
                  <RotateCcw className="w-3 h-3 text-teal-600" />
                  <span className="hidden sm:inline">Replay</span>
                </button>
              </div>
            </div>
          </section>

          {/* Conversation Transcript Area */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scrollbar-thin">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Consultation Welcome Notice */}
              <div className="flex justify-center">
                <span className="text-xs text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-2xs">
                  Consultation Room · {isBangla ? 'বাংলা পরামর্শ শুরু হয়েছে' : 'English consultation active'}
                </span>
              </div>

              {/* Message Transcript Bubbles */}
              {messages
                .filter((m) => m.sender !== 'system')
                .map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    patientName={pc.patientName}
                    onPlay={() => playPatientVoice(msg.message, session.language || 'en')}
                  />
                ))}

              {/* Real-Time Live Speech Preview (Interim Transcription) */}
              {interimTranscript && (
                <div className="flex items-start gap-2.5 flex-row-reverse">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    S
                  </div>
                  <div className="max-w-[75%]">
                    <div className="rounded-xl rounded-tr-sm px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm animate-pulse">
                      <p className="text-xs font-semibold text-emerald-700 mb-0.5 flex items-center gap-1">
                        <Mic className="w-3 h-3" />
                        <span>Hearing you speak...</span>
                      </p>
                      <p className="text-sm italic">"{interimTranscript}"</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Thinking / Processing indicator */}
              {isSending && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-navy-800">{pc.patientName.charAt(0)}</span>
                  </div>
                  <div className="bg-white rounded-xl rounded-tl-sm px-4 py-3 shadow-card border border-gray-100">
                    <div className="flex gap-1.5 items-center h-4">
                      <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="mx-6 mb-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center justify-between text-xs text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Voice Fallback Banner */}
          {voiceFallbackNotice && (
            <div className="mx-6 mb-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center justify-between text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{voiceFallbackNotice}</span>
              </div>
              <button onClick={() => setVoiceFallbackNotice('')} className="text-amber-500 hover:text-amber-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* Voice & Text Interaction Controls                           */}
          {/* ──────────────────────────────────────────────────────────── */}
          <div className="bg-white border-t border-gray-200 p-4 shadow-lg flex-shrink-0">
            <div className="max-w-2xl mx-auto">
              {/* VOICE MODE CONTROLS */}
              {mode === 'voice' ? (
                <div className="flex flex-col items-center gap-3">
                  {/* Central Large Microphone Button */}
                  <div className="flex items-center justify-center gap-4 w-full">
                    {/* Secondary: Text Fallback Button */}
                    <button
                      type="button"
                      onClick={() => setMode('text')}
                      className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                      title="Switch to Keyboard / Text Mode"
                    >
                      <Keyboard className="w-5 h-5" />
                    </button>

                    {/* Prominent Microphone Interaction Button */}
                    {voiceState === 'listening' ? (
                      <button
                        type="button"
                        onClick={stopListening}
                        className="group flex items-center gap-3 px-8 py-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/30 transition-all transform hover:scale-105 animate-pulse"
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
                        className="flex items-center gap-3 px-8 py-4 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-600/30 transition-all transform hover:scale-105"
                      >
                        <Square className="w-5 h-5 fill-white" />
                        <span className="text-base tracking-wide">Patient is speaking (Tap to Stop)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startListening}
                        disabled={isSending || !isActive}
                        className="group flex items-center gap-3 px-8 py-4 rounded-full bg-navy-900 hover:bg-teal-700 text-white font-bold shadow-lg shadow-navy-900/20 transition-all transform hover:scale-105 disabled:opacity-50"
                      >
                        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                          <Mic className="w-4 h-4 text-teal-300" />
                        </div>
                        <span className="text-base tracking-wide">
                          {isBangla ? 'কথা বলতে চাপুন (Tap to Speak)' : 'Tap to Speak'}
                        </span>
                      </button>
                    )}

                    {/* Secondary: Replay Voice Button */}
                    <button
                      type="button"
                      onClick={handleReplayAudio}
                      disabled={voiceState === 'listening' || isSending}
                      className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-30"
                      title="Replay Last Patient Voice"
                    >
                      <RotateCcw className="w-5 h-5 text-teal-600" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 text-center">
                    {isBangla
                      ? 'মাইক্রোফোনে স্বাভাবিক বাংলায় কথা বলুন। রোগী বাংলায় উত্তর দেবে।'
                      : 'Speak clearly into your microphone. Tap again or pause when finished.'}
                  </p>
                </div>
              ) : (
                /* TEXT MODE CONTROLS (Fallback) */
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                      <Keyboard className="w-3.5 h-3.5 text-gray-400" />
                      <span>Text Consultation Mode</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setMode('voice')}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
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
                      className="flex-1 input-field resize-none min-h-[44px] max-h-32 py-2.5"
                      disabled={isSending || !isActive}
                    />
                    <button
                      onClick={handleSendTextMessage}
                      disabled={!input.trim() || isSending || !isActive}
                      className="w-11 h-11 bg-navy-900 hover:bg-teal-700 text-white rounded-lg flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50"
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

        {/* Right Panel: Consultation Progress & Educational Guidelines */}
        <aside className="hidden xl:flex flex-col w-64 bg-white border-l border-gray-200 p-5 flex-shrink-0 overflow-y-auto">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Session Metrics
          </p>
          <div className="space-y-3">
            <StatCard label="Elapsed Time" value={formatDuration(elapsed)} icon={<Clock className="w-3.5 h-3.5 text-teal-600" />} />
            <StatCard label="Doctor Questions" value={String(questionCount)} icon={<MessageSquare className="w-3.5 h-3.5 text-purple-600" />} />
            <StatCard label="Active Mode" value={mode === 'voice' ? 'Voice' : 'Text'} icon={<Mic className="w-3.5 h-3.5 text-emerald-600" />} />
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Clinical Safety</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              The AI patient responds only within their case parameters and will not reveal diagnostic labels directly.
            </p>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-900 text-[11px] leading-tight">
              Practice active listening and ask clarifying open-ended questions.
            </div>
          </div>
        </aside>
      </div>

      {/* End Consultation Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-gray-900 text-lg mb-2">End Consultation?</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              This will conclude your clinical consultation with {pc.patientName}. You will be able to review the full transcript and conversation history.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="btn-secondary flex-1 py-2.5"
              >
                Keep Practicing
              </button>
              <button
                type="button"
                onClick={handleEnd}
                disabled={isEnding}
                className="btn-primary flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white"
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

// ────────────────────────────────────────────────────────────────────────────
// Message Bubble Component (with Voice Indicators & Audio Replay)
// ────────────────────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  patientName,
  onPlay,
}: {
  message: ConversationMessage;
  patientName: string;
  onPlay: () => void;
}) {
  const isPatient = message.sender === 'patient';
  const isVoice = message.messageType === 'voice';

  return (
    <div className={`flex items-start gap-2.5 ${isPatient ? '' : 'flex-row-reverse'}`}>
      {/* Avatar Icon */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-2xs ${
          isPatient ? 'bg-navy-900 text-white' : 'bg-teal-600 text-white'
        }`}
      >
        {isPatient ? patientName.charAt(0) : 'Dr'}
      </div>

      <div className={`max-w-[75%]`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-xs relative ${
            isPatient
              ? 'bg-white text-gray-800 border border-gray-200/80 rounded-tl-xs'
              : 'bg-navy-900 text-white rounded-tr-xs'
          }`}
        >
          {/* Header indicator */}
          <div className="flex items-center justify-between gap-3 mb-1 text-[11px] opacity-75">
            <span className="font-semibold">{isPatient ? patientName : 'You (Student Doctor)'}</span>
            {isVoice && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-black/10">
                <Mic className="w-2.5 h-2.5" />
                <span>Voice</span>
              </span>
            )}
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>

          {/* Patient Voice Replay Button */}
          {isPatient && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-end">
              <button
                onClick={onPlay}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 transition-colors"
                title="Hear patient speak this response"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Listen</span>
              </button>
            </div>
          )}
        </div>

        <p className={`text-[11px] text-gray-400 mt-1 ${isPatient ? 'ml-1' : 'mr-1 text-right'}`}>
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
