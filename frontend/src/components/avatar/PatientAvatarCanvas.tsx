import { useEffect, useRef, useState, useMemo } from 'react';
import avatarService from '../../services/avatarService';
import { RealisticHumanAvatarProvider } from '../../services/realisticHumanAvatarProvider';
import { PatientCharacterService } from '../../services/patientCharacterService';
import type { PatientCase, AvatarState, PatientEmotion } from '../../types';
import type { PatientCharacter } from '../../types/character';
import {
  Radio,
  Sparkles,
  Maximize2,
  Minimize2,
  AlertTriangle,
  HeartPulse,
  Info,
  X,
  Volume2,
  ShieldCheck,
  Activity,
  Smile,
  Frown,
  HelpCircle,
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
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [fallbackLevel, setFallbackLevel] = useState<1 | 2 | 3 | 4>(1);

  // Intelligently resolve the realistic patient character matching this case
  const character: PatientCharacter = useMemo(() => {
    return PatientCharacterService.getCharacterForCase(patientCase);
  }, [
    patientCase.id,
    patientCase.patientName,
    patientCase.patientGender,
    patientCase.patientAge,
    patientCase.chiefComplaint,
    patientCase.avatarId,
  ]);

  // Initialize Realistic Human Avatar Provider
  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    let primaryProvider: RealisticHumanAvatarProvider | null = null;

    try {
      primaryProvider = new RealisticHumanAvatarProvider();
      avatarService.setProvider(primaryProvider);

      avatarService
        .initialize(
          containerRef.current,
          {
            avatarId: character.characterId,
            avatarGender: character.sex,
            avatarAgeGroup: character.age < 30 ? 'young-adult' : character.age < 60 ? 'middle-aged' : 'elderly',
            patientName: character.name,
            personality: character.personality,
            onError: (err) => {
              if (!isMounted) return;
              console.warn('[PatientAvatar] Realistic avatar provider error, falling back:', err);
              setFallbackLevel(2);
              setInitError(err);
              onError?.(err);
            },
          },
          primaryProvider
        )
        .then(() => {
          if (isMounted) {
            setIsInitialized(true);
            setFallbackLevel(1);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.warn('[PatientAvatar] Provider init catch, falling back to static patient image:', err);
          setFallbackLevel(2);
          setInitError(err?.message || 'Failed to initialize 3D digital human');
          onError?.(err?.message || 'Failed to initialize 3D digital human');
        });
    } catch (err: any) {
      if (isMounted) {
        setFallbackLevel(2);
        setInitError(err?.message || 'Realistic engine unavailable');
      }
    }

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
      isMounted = false;
      resizeObserver.disconnect();
      avatarService.destroy();
      setIsInitialized(false);
    };
  }, [character.characterId]);

  // Sync Emotion State
  useEffect(() => {
    if (isInitialized) {
      avatarService.setEmotion(emotion, emotionIntensity);
    }
  }, [emotion, emotionIntensity, isInitialized]);

  // Sync Avatar State & Speech Lip Sync
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
      className={`relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center transition-all duration-300 select-none ${
        focusMode ? 'rounded-none' : 'rounded-2xl border border-slate-800 shadow-2xl'
      }`}
    >
      {/* 1. Realistic Digital Human Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* 2. Fallback Level 2: Static Realistic Patient Portrait + Voice Rings */}
      {fallbackLevel >= 2 && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10 overflow-hidden">
          <div className="absolute w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mb-4">
            {avatarState === 'speaking' && (
              <>
                <div className="absolute -inset-4 rounded-full border-2 border-teal-500/30 animate-ping opacity-75" />
                <div className="absolute -inset-8 rounded-full border border-teal-500/20 animate-pulse" />
              </>
            )}

            <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-teal-500/50 shadow-2xl shadow-teal-950/80 bg-slate-900">
              <img
                src={character.avatarAsset}
                alt={character.name}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="absolute bottom-1 right-1 p-2 rounded-full bg-slate-900/90 border border-teal-500/40 text-teal-400 shadow-lg">
              {avatarState === 'speaking' ? (
                <Volume2 className="w-4 h-4 animate-bounce" />
              ) : avatarState === 'listening' ? (
                <Radio className="w-4 h-4 text-emerald-400 animate-spin" />
              ) : (
                <Activity className="w-4 h-4 text-teal-400" />
              )}
            </div>
          </div>

          <h4 className="font-bold text-white text-base sm:text-lg mb-0.5">
            {character.nameBn} <span className="text-slate-400 font-normal text-sm">({character.name})</span>
          </h4>
          <p className="text-xs text-teal-300 font-medium mb-2">
            {character.age} বছর • {character.sex === 'female' ? 'নারী (Female)' : 'পুরুষ (Male)'} • {character.clothing}
          </p>

          <p className="text-[11px] text-amber-300/90 flex items-center justify-center gap-1.5 bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full max-w-sm mb-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>High-definition voice active (3D canvas rendered in photo mode: {initError || 'Active'})</span>
          </p>
        </div>
      )}

      {/* 3. Top Overlay: Live Status Bar & Actions */}
      <div className="absolute top-3.5 inset-x-3.5 sm:top-4 sm:inset-x-4 flex items-center justify-between pointer-events-none z-20">
        {/* Left: Dynamic Avatar State Indicator */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur-md transition-all duration-300 ${
              avatarState === 'listening'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 animate-pulse'
                : avatarState === 'speaking'
                ? 'bg-teal-500/25 text-teal-300 border border-teal-500/40'
                : avatarState === 'thinking'
                ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40'
                : avatarState === 'concerned'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                : avatarState === 'anxious'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                : avatarState === 'relieved'
                ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40'
                : avatarState === 'confused'
                ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40'
                : 'bg-slate-900/70 text-slate-200 border border-slate-700/60'
            }`}
          >
            {avatarState === 'listening' ? (
              <>
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>রোগী শুনছেন (Listening...)</span>
              </>
            ) : avatarState === 'speaking' ? (
              <>
                <span className="flex items-center gap-0.5 h-3">
                  <span className="w-0.5 bg-teal-400 rounded-full animate-pulse h-2" />
                  <span className="w-0.5 bg-teal-400 rounded-full animate-pulse h-3.5" style={{ animationDelay: '100ms' }} />
                  <span className="w-0.5 bg-teal-400 rounded-full animate-pulse h-2" style={{ animationDelay: '200ms' }} />
                  <span className="w-0.5 bg-teal-400 rounded-full animate-pulse h-3" style={{ animationDelay: '150ms' }} />
                </span>
                <span>রোগী কথা বলছেন (Speaking)</span>
              </>
            ) : avatarState === 'thinking' ? (
              <>
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>ভাবছেন... (Thinking)</span>
              </>
            ) : avatarState === 'concerned' ? (
              <>
                <Frown className="w-3.5 h-3.5 text-amber-400" />
                <span>উদ্বিগ্ন (Concerned)</span>
              </>
            ) : avatarState === 'anxious' ? (
              <>
                <HeartPulse className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>বিচলিত (Anxious)</span>
              </>
            ) : avatarState === 'relieved' ? (
              <>
                <Smile className="w-3.5 h-3.5 text-sky-400" />
                <span>আশ্বস্ত (Relieved)</span>
              </>
            ) : avatarState === 'confused' ? (
              <>
                <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>অপ্রস্তুত (Confused)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>রোগী উপস্থিত (Patient Ready)</span>
              </>
            )}
          </div>

          {/* Emotion Badge */}
          {emotion && emotion !== 'neutral' && (
            <div className="hidden sm:flex px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900/60 text-slate-300 border border-slate-700/50 items-center gap-1.5 shadow-md backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-teal-400" />
              <span className="capitalize">{emotion}</span>
              <span className="text-[10px] text-slate-400">({Math.round(emotionIntensity * 100)}%)</span>
            </div>
          )}
        </div>

        {/* Right: Character Info Button & Focus Mode Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowProfileDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/70 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 backdrop-blur-md transition-all shadow-md text-xs font-medium"
            title="View Patient Character Profile"
          >
            <Info className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Patient Profile</span>
          </button>

          <button
            type="button"
            onClick={onToggleFocusMode}
            className="p-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md transition-all shadow-md"
            title={focusMode ? 'Exit Fullscreen' : 'Fullscreen Patient View'}
            aria-label={focusMode ? 'Exit Fullscreen' : 'Fullscreen Patient View'}
          >
            {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4. Bottom-Left Floating Character Identity Pill */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-auto flex items-center gap-2 bg-slate-950/80 border border-slate-800/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl max-w-[85vw] sm:max-w-md">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-teal-500/40 bg-slate-800">
          <img
            src={character.thumbnail}
            alt={character.name}
            className="w-full h-full object-cover object-top"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs sm:text-sm truncate">
              {character.nameBn} ({character.name})
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
              {character.age}y
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
            <span>{character.sex === 'female' ? 'নারী (Female)' : 'পুরুষ (Male)'}</span>
            <span>•</span>
            <span className="capitalize text-teal-400/90">{character.personality}</span>
            <span>•</span>
            <span className="text-slate-500 truncate">Fictional Patient</span>
          </div>
        </div>
      </div>

      {/* 5. Patient Profile & Clinical Demographics Modal / Drawer */}
      {showProfileDrawer && (
        <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex justify-end transition-opacity duration-300">
          <div className="w-full max-w-sm sm:max-w-md h-full bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Patient Character Profile</h3>
                  <p className="text-[11px] text-slate-400">Fictional Human Clinical Simulation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileDrawer(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Character Hero Card */}
            <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-4">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border-2 border-teal-500/40 bg-slate-800 shadow-md">
                <img
                  src={character.avatarAsset}
                  alt={character.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-base leading-tight">
                  {character.nameBn}
                </h4>
                <p className="text-xs text-teal-300 font-medium mb-1">{character.name}</p>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                    Age: {character.age}y
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 capitalize">
                    {character.sex}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 capitalize">
                    {character.personality}
                  </span>
                </div>
              </div>
            </div>

            {/* Clinical & Demographic Specifications */}
            <div className="space-y-3.5 text-xs text-slate-300 flex-1">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                  Clinical Context & Presentation
                </span>
                <p className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-slate-200 leading-relaxed">
                  {character.clinicalBio}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                  Appearance & Non-Verbal Signals
                </span>
                <p className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-slate-300 leading-relaxed">
                  {character.appearance}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                  Attire & Cultural Context
                </span>
                <p className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-slate-300 leading-relaxed">
                  {character.clothing}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block mb-1 uppercase font-semibold">Voice Engine</span>
                  <p className="font-medium text-teal-300">{character.voice.voiceName}</p>
                </div>
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block mb-1 uppercase font-semibold">Languages</span>
                  <p className="font-medium text-slate-200">Bangla / English / Banglish</p>
                </div>
              </div>

              {/* Patient Brain Source-of-Truth Assurance */}
              <div className="bg-teal-950/30 border border-teal-800/40 rounded-xl p-3 flex items-start gap-2.5 text-teal-200/90 text-[11px] mt-4">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Clinical Truth Layer Guard:</strong> This avatar operates strictly as a biological visual presentation layer. All diagnostic symptoms, history facts, and medical responses are generated and verified by the Phase 1 AI Patient Brain.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => setShowProfileDrawer(false)}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors shadow-lg shadow-teal-900/30"
              >
                Close & Return to Consultation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Subtle Vignette for Medical Office Atmosphere */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent pointer-events-none" />
    </div>
  );
}
