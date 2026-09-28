import { useEffect, useRef, useState } from 'react';
import avatarService from '../../services/avatarService';
import { WebGLAvatarProvider } from '../../services/webglAvatarProvider';
import type { AvatarState, PatientEmotion } from '../../types';
import {
  GraduationCap,
  Sparkles,
  Maximize2,
  Minimize2,
  Volume2,
  Radio,
  BookOpen,
} from 'lucide-react';

interface TeacherAvatarCanvasProps {
  avatarState: AvatarState;
  speakingText?: string;
  audioElement?: HTMLAudioElement | null;
  currentConceptTitle?: string;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  language?: 'en' | 'bn';
}

export default function TeacherAvatarCanvas({
  avatarState,
  speakingText,
  audioElement,
  currentConceptTitle,
  focusMode = false,
  onToggleFocusMode,
  isPaused = false,
}: TeacherAvatarCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize WebGL Professor Avatar
  useEffect(() => {
    if (!containerRef.current) return;

    const provider = new WebGLAvatarProvider();
    avatarService.setProvider(provider);

    avatarService
      .initialize(
        containerRef.current,
        {
          avatarId: 'academic-professor-1',
          avatarGender: 'male',
          avatarAgeGroup: 'middle-aged',
          patientName: 'Prof. Julian Sterling, MD',
          personality: 'calm',
          onError: (err) => {
            setInitError(err);
          },
        },
        provider
      )
      .then(() => {
        setIsInitialized(true);
        // Set academic authoritative calm emotion
        avatarService.setEmotion('neutral' as PatientEmotion, 0.25);
      })
      .catch((err) => {
        setInitError(err?.message || 'WebGL initialization failed');
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
  }, []);

  // Sync Teacher Avatar State & Audio Lip-Sync
  useEffect(() => {
    if (!isInitialized) return;

    if (isPaused) {
      avatarService.setIdleState();
      return;
    }

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
  }, [avatarState, speakingText, audioElement, isInitialized, isPaused]);

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
          <p className="text-sm font-semibold text-slate-200">Preparing AI Avatar Teacher...</p>
          <p className="text-xs text-slate-400">Loading virtual medical lecture hall & teaching engine</p>
        </div>
      )}

      {/* Top Overlay: Teacher Header & State Badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
        {/* Professor Name & Role */}
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/70 px-3 py-1.5 rounded-full pointer-events-auto shadow-lg">
          <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center text-white">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">Prof. Sterling, MD</p>
            <p className="text-[10px] text-teal-400 font-medium">AI Medical Faculty</p>
          </div>
        </div>

        {/* Dynamic Status Pill */}
        <div className="flex items-center gap-2">
          {isPaused ? (
            <span className="flex items-center gap-1.5 bg-amber-950/80 border border-amber-600/80 text-amber-300 text-xs px-3 py-1 rounded-full backdrop-blur-md shadow-lg font-bold">
              <span>⏸ Lecture Paused</span>
            </span>
          ) : avatarState === 'speaking' ? (
            <span className="flex items-center gap-1.5 bg-teal-950/80 border border-teal-500/80 text-teal-300 text-xs px-3 py-1 rounded-full backdrop-blur-md shadow-lg font-bold animate-pulse">
              <Volume2 className="w-3.5 h-3.5 text-teal-400 animate-bounce" />
              <span>Teacher speaking...</span>
            </span>
          ) : avatarState === 'listening' ? (
            <span className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-xs px-3 py-1 rounded-full backdrop-blur-md shadow-lg font-bold animate-pulse">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>Listening to student...</span>
            </span>
          ) : avatarState === 'thinking' ? (
            <span className="flex items-center gap-1.5 bg-purple-950/80 border border-purple-500/80 text-purple-300 text-xs px-3 py-1 rounded-full backdrop-blur-md shadow-lg font-bold">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
              <span>Formulating response...</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 text-slate-300 text-xs px-3 py-1 rounded-full backdrop-blur-md font-semibold">
              <BookOpen className="w-3 h-3 text-teal-400" />
              <span>Virtual Classroom Active</span>
            </span>
          )}

          {onToggleFocusMode && (
            <button
              type="button"
              onClick={onToggleFocusMode}
              className="p-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white pointer-events-auto transition"
              title={focusMode ? 'Exit Full Classroom' : 'Full Classroom Mode'}
            >
              {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Concept Badge at Bottom of Avatar Canvas */}
      {currentConceptTitle && (
        <div className="absolute bottom-3 left-3 right-3 flex justify-center z-20 pointer-events-none">
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-4 py-1.5 rounded-full text-xs text-slate-200 font-semibold shadow-lg flex items-center gap-2 max-w-[90%] truncate">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping flex-shrink-0" />
            <span className="truncate">Teaching: {currentConceptTitle}</span>
          </div>
        </div>
      )}
    </div>
  );
}
