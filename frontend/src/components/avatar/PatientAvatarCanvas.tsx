import { useEffect, useRef, useState } from 'react';
import avatarService from '../../services/avatarService';
import { WebGLAvatarProvider } from '../../services/webglAvatarProvider';
import type { PatientCase, AvatarState, PatientEmotion } from '../../types';
import {
  User,
  Radio,
  Sparkles,
  Maximize2,
  Minimize2,
  AlertTriangle,
  HeartPulse,
} from 'lucide-react';

interface PatientAvatarCanvasProps {
  patientCase: PatientCase;
  avatarState: AvatarState;
  emotion: PatientEmotion;
  emotionIntensity: number;
  speakingText?: string;
  audioElement?: HTMLAudioElement | null;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onError?: (err: string) => void;
}

export default function PatientAvatarCanvas({
  patientCase,
  avatarState,
  emotion,
  emotionIntensity,
  speakingText,
  audioElement,
  focusMode,
  onToggleFocusMode,
  onError,
}: PatientAvatarCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize WebGL Avatar
  useEffect(() => {
    if (!containerRef.current) return;

    const provider = new WebGLAvatarProvider();
    avatarService.setProvider(provider);

    avatarService
      .initialize(
        containerRef.current,
        {
          avatarId: patientCase.avatarId,
          avatarGender: patientCase.avatarGender || patientCase.patientGender,
          avatarAgeGroup: patientCase.avatarAgeGroup,
          patientName: patientCase.patientName,
          personality: patientCase.personality,
          onError: (err) => {
            setInitError(err);
            onError?.(err);
          },
        },
        provider
      )
      .then(() => {
        setIsInitialized(true);
      })
      .catch((err) => {
        setInitError(err?.message || 'WebGL initialization failed');
        onError?.(err?.message || 'WebGL initialization failed');
      });

    const handleResize = () => {
      if (containerRef.current) {
        avatarService.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      avatarService.destroy();
      setIsInitialized(false);
    };
  }, [patientCase.id, patientCase.avatarGender, patientCase.avatarAgeGroup]);

  // Sync Emotion
  useEffect(() => {
    if (isInitialized) {
      avatarService.setEmotion(emotion, emotionIntensity);
    }
  }, [emotion, emotionIntensity, isInitialized]);

  // Sync Avatar State & Audio Lip-Sync
  useEffect(() => {
    if (!isInitialized) return;

    switch (avatarState) {
      case 'listening':
        avatarService.setListeningState();
        break;
      case 'thinking':
        avatarService.setThinkingState();
        break;
      case 'speaking':
        avatarService.speak(speakingText || '', audioElement);
        break;
      case 'idle':
      default:
        avatarService.setIdleState();
        break;
    }
  }, [avatarState, speakingText, audioElement, isInitialized]);

  return (
    <div
      className={`relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center transition-all duration-300 ${
        focusMode ? 'rounded-none' : 'rounded-2xl border border-slate-800 shadow-2xl'
      }`}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {!isInitialized && !initError && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-10">
          <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-200">Preparing Virtual Patient Avatar...</p>
          <p className="text-xs text-slate-400">Loading 3D anatomical model & clinical environment</p>
        </div>
      )}

      {/* Error Fallback (Level 2: Voice + Static Patient) */}
      {initError && (
        <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="w-20 h-20 bg-teal-500/10 border-2 border-teal-500/30 rounded-full flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-teal-400" />
          </div>
          <h4 className="font-bold text-white text-base mb-1">{patientCase.patientName}</h4>
          <p className="text-xs text-amber-400 flex items-center gap-1.5 mb-3">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>3D video is temporarily unavailable. Voice consultation is active.</span>
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <HeartPulse className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>Audio & transcription working normally</span>
          </div>
        </div>
      )}

      {/* Top Overlay: Patient Header & State Badges */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Status Badge */}
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur-md transition-all duration-300 ${
              avatarState === 'listening'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 animate-pulse'
                : avatarState === 'speaking'
                ? 'bg-teal-500/25 text-teal-300 border border-teal-500/40'
                : avatarState === 'thinking'
                ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-900/60 text-slate-300 border border-slate-700/60'
            }`}
          >
            {avatarState === 'listening' ? (
              <>
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>Patient is listening...</span>
              </>
            ) : avatarState === 'speaking' ? (
              <>
                <span className="flex items-center gap-0.5 h-3">
                  <span className="w-0.5 bg-teal-400 rounded-full animate-pulse h-2" />
                  <span className="w-0.5 bg-teal-400 rounded-full animate-pulse h-3.5" style={{ animationDelay: '100ms' }} />
                  <span className="w-0.5 bg-teal-400 rounded-full animate-pulse h-2" style={{ animationDelay: '200ms' }} />
                  <span className="w-0.5 bg-teal-400 rounded-full animate-pulse h-3" style={{ animationDelay: '150ms' }} />
                </span>
                <span>Patient is speaking</span>
              </>
            ) : avatarState === 'thinking' ? (
              <>
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Patient ready</span>
              </>
            )}
          </div>

          {/* Emotion Badge (Subtle clinical indicator) */}
          {emotion && emotion !== 'neutral' && (
            <div className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/60 text-slate-300 border border-slate-700/50 flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3 h-3 text-teal-400" />
              <span className="capitalize">{emotion}</span>
              <span className="text-[10px] text-slate-400">({Math.round(emotionIntensity * 100)}%)</span>
            </div>
          )}
        </div>

        {/* Focus Mode (Fullscreen Toggle) */}
        <button
          type="button"
          onClick={onToggleFocusMode}
          className="pointer-events-auto p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md transition-all shadow-md"
          title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode (Fullscreen Consultation)'}
          aria-label={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
        >
          {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Subtle Vignette Overlay for Depth */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
    </div>
  );
}
