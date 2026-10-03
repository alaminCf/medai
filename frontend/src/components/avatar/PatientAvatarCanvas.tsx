import { useEffect, useRef, useState, useMemo } from 'react';
import avatarService from '../../services/avatarService';
import { WebGLAvatarProvider } from '../../services/webglAvatarProvider';
import { PatientCharacterService } from '../../services/patientCharacterService';
import type { PatientCase, AvatarState, PatientEmotion } from '../../types';
import type { PatientCharacter } from '../../types/character';
import {
  Radio,
  Sparkles,
  Maximize2,
  Minimize2,
  HeartPulse,
  Info,
  X,
  Volume2,
  ShieldCheck,
  Activity,
  Video,
  Box,
  Flame,
  Thermometer,
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
  const [showVitalsHUD, setShowVitalsHUD] = useState(true);

  // User preference for visualization mode: 3D Digital Human vs Clinical Telehealth
  const [viewMode, setViewMode] = useState<'3d' | 'telehealth'>(() => {
    return (localStorage.getItem('techboloy_avatar_mode') as '3d' | 'telehealth') || '3d';
  });

  const handleToggleViewMode = (mode: '3d' | 'telehealth') => {
    setViewMode(mode);
    localStorage.setItem('techboloy_avatar_mode', mode);
  };

  // Demographic & Character matching
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

  // Dynamic Clinical Vitals estimated for the case
  const vitals = useMemo(() => {
    const isCardiac = /chest|cardiac|angina|stemi|nstemi|বুক|হার্ট/i.test(patientCase.chiefComplaint || patientCase.title || '');
    const isFever = /fever|dengue|জ্বর|infection/i.test(patientCase.chiefComplaint || patientCase.title || '');
    const isAnxious = emotion === 'anxious' || patientCase.personality === 'anxious';

    const hr = isCardiac ? 104 : isFever ? 98 : isAnxious ? 92 : 78;
    const bp = isCardiac ? '145/95' : isFever ? '110/70' : '122/80';
    const spo2 = isCardiac ? '96%' : '98%';
    const rr = isCardiac ? '22/min' : '18/min';
    const temp = isFever ? '102.4°F' : '98.6°F';
    const pain = isCardiac ? '8/10' : /headache|মাথা|pain|ব্যথা/i.test(patientCase.chiefComplaint || '') ? '7/10' : '4/10';

    return { hr, bp, spo2, rr, temp, pain };
  }, [patientCase.chiefComplaint, patientCase.title, patientCase.personality, emotion]);

  // Initialize 3D Digital Human Engine
  useEffect(() => {
    if (viewMode !== '3d' || !containerRef.current) return;

    let isMounted = true;
    const provider = new WebGLAvatarProvider();
    avatarService.setProvider(provider);

    avatarService
      .initialize(
        containerRef.current,
        {
          avatarId: character.characterId,
          avatarGender: patientCase.patientGender?.toLowerCase().includes('female') ? 'female' : 'male',
          avatarAgeGroup: patientCase.patientAge < 30 ? 'young-adult' : patientCase.patientAge < 60 ? 'middle-aged' : 'elderly',
          patientName: patientCase.patientName,
          personality: character.personality,
          onError: (err) => {
            if (!isMounted) return;
            console.warn('[PatientAvatar] 3D WebGL failed:', err);
            setInitError(err);
            onError?.(err);
          },
        },
        provider
      )
      .then(() => {
        if (isMounted) {
          setIsInitialized(true);
          setInitError(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setInitError(err?.message || 'WebGL engine unavailable');
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
      isMounted = false;
      resizeObserver.disconnect();
      avatarService.destroy();
      setIsInitialized(false);
    };
  }, [viewMode, patientCase.id, patientCase.patientName]);

  // Sync Emotion State
  useEffect(() => {
    if (viewMode === '3d' && isInitialized) {
      avatarService.setEmotion(emotion, emotionIntensity);
    }
  }, [emotion, emotionIntensity, isInitialized, viewMode]);

  // Sync Speaking & Listening States
  useEffect(() => {
    if (viewMode !== '3d' || !isInitialized) return;

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
  }, [avatarState, speakingText, audioElement, isInitialized, viewMode]);

  return (
    <div
      className={`relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center transition-all duration-300 select-none ${
        focusMode ? 'rounded-none' : 'rounded-2xl border border-slate-800 shadow-2xl'
      }`}
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* Visual Canvas Stage                                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      {viewMode === '3d' ? (
        /* 1. Real-time 3D Digital Human Canvas */
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
          <div ref={containerRef} className="w-full h-full" />

          {/* Fallback if WebGL fails */}
          {initError && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10">
              <p className="text-amber-400 text-xs mb-3 font-semibold">3D acceleration unavailable on this device.</p>
              <button
                type="button"
                onClick={() => setViewMode('telehealth')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition"
              >
                Switch to Telehealth Stream
              </button>
            </div>
          )}
        </div>
      ) : (
        /* 2. Clinical Telehealth Patient Video Stream */
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
          <div className="absolute inset-0 bg-radial from-slate-900/60 to-slate-950 pointer-events-none" />

          {/* High-Definition Patient Portrait with natural breathing drift */}
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={character.avatarAsset}
              alt={patientCase.patientName}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                avatarState === 'speaking' ? 'scale-102 filter-none' : 'scale-100'
              }`}
            />

            {/* Video Feed Atmospheric Clinical Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/70" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-slate-950/40" />

            {/* Speaking Audio Glow Effect */}
            {avatarState === 'speaking' && (
              <div className="absolute inset-0 border-2 border-teal-500/30 animate-pulse pointer-events-none" />
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Top Overlay: Live Status Bar & View Mode Switcher            */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 flex items-center justify-between pointer-events-none z-20 gap-2">
        {/* Left: Dynamic Consultation Status Badge */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto flex-wrap">
          <div
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all duration-300 ${
              avatarState === 'listening'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 animate-pulse'
                : avatarState === 'speaking'
                ? 'bg-teal-500/25 text-teal-300 border border-teal-500/40'
                : avatarState === 'thinking'
                ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-900/80 text-slate-200 border border-slate-700/60'
            }`}
          >
            {avatarState === 'listening' ? (
              <>
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>রোগী শুনছেন (Listening...)</span>
              </>
            ) : avatarState === 'speaking' ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-teal-400 animate-bounce" />
                <span>রোগী বলছেন (Speaking...)</span>
              </>
            ) : avatarState === 'thinking' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span>ভাবছেন (Thinking...)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>রোগী প্রস্তুত (Patient Ready)</span>
              </>
            )}
          </div>

          {/* Live Emotion Badge */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-900/80 border border-slate-700/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-slate-300 shadow-sm">
            <span className="capitalize">{emotion}</span>
            <span className="text-slate-500">({Math.round(emotionIntensity * 100)}%)</span>
          </div>
        </div>

        {/* Right: Smart Controls (3D vs Telehealth, Profile, Fullscreen) */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Smart Avatar Display Mode Switcher */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 p-0.5 rounded-full text-[11px] backdrop-blur-md shadow-lg">
            <button
              type="button"
              onClick={() => handleToggleViewMode('3d')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-all ${
                viewMode === '3d'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Interactive 3D Digital Human (Anatomical Lip-Sync)"
            >
              <Box className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">3D Human</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('telehealth')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-all ${
                viewMode === 'telehealth'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Clinical Telehealth Video Feed with Live Telemetry"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Telehealth</span>
            </button>
          </div>

          {/* Vitals HUD Toggle */}
          <button
            type="button"
            onClick={() => setShowVitalsHUD(!showVitalsHUD)}
            className={`p-1.5 rounded-full border backdrop-blur-md transition-all shadow-md text-xs font-medium ${
              showVitalsHUD
                ? 'bg-teal-950/80 border-teal-500/40 text-teal-300'
                : 'bg-slate-900/70 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Clinical Vitals Telemetry"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>

          {/* Patient Profile */}
          <button
            type="button"
            onClick={() => setShowProfileDrawer(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-900/70 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60 backdrop-blur-md transition-all shadow-md text-xs font-medium"
            title="View Patient Clinical Record"
          >
            <Info className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">Profile</span>
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={onToggleFocusMode}
            className="p-1.5 sm:p-2 rounded-full bg-slate-900/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md transition-all shadow-md"
            title={focusMode ? 'Exit Fullscreen' : 'Fullscreen Consultation'}
          >
            {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Real-time Clinical Telemetry HUD (Right Overlay)             */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showVitalsHUD && (
        <div className="absolute top-14 right-3 sm:right-4 z-20 pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-800/90 rounded-2xl p-2.5 shadow-xl text-[10px] space-y-1.5 min-w-[130px] hidden sm:block animate-in fade-in duration-300">
          <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1 uppercase tracking-wider text-[9px]">
            <span>Patient Telemetry</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-1 text-rose-400">
              <HeartPulse className="w-3 h-3" /> HR:
            </span>
            <span className="font-mono font-bold text-white">{vitals.hr} bpm</span>
          </div>

          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-1 text-sky-400">
              <Activity className="w-3 h-3" /> BP:
            </span>
            <span className="font-mono font-semibold text-white">{vitals.bp}</span>
          </div>

          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-1 text-emerald-400">
              <Thermometer className="w-3 h-3" /> SpO2:
            </span>
            <span className="font-mono font-semibold text-white">{vitals.spo2}</span>
          </div>

          <div className="flex items-center justify-between text-slate-200">
            <span className="flex items-center gap-1 text-amber-400">
              <Flame className="w-3 h-3" /> Pain:
            </span>
            <span className="font-mono font-bold text-amber-400">{vitals.pain}</span>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Live Speaking Caption Bubble (Center Bottom)                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      {avatarState === 'speaking' && speakingText && (
        <div className="absolute bottom-16 sm:bottom-18 inset-x-4 sm:inset-x-8 max-w-xl mx-auto z-20 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-slate-900/95 border border-teal-500/50 backdrop-blur-md rounded-2xl p-3 shadow-2xl text-xs text-slate-100 flex items-start gap-2.5">
            <div className="p-1.5 rounded-xl bg-teal-500/20 text-teal-400 shrink-0 mt-0.5">
              <Volume2 className="w-4 h-4 animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-teal-300 text-[11px] truncate">
                  {patientCase.patientName}
                </span>
                <span className="flex items-center gap-0.5 text-[9px] text-teal-400 font-mono">
                  <span className="w-1 h-2 bg-teal-400 animate-pulse" />
                  <span className="w-1 h-3.5 bg-teal-400 animate-pulse delay-75" />
                  <span className="w-1 h-2 bg-teal-400 animate-pulse delay-150" />
                  <span>Speaking</span>
                </span>
              </div>
              <p className="text-xs text-white leading-relaxed line-clamp-3 font-medium">
                "{speakingText}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Bottom-Left Patient Identity Pill (Strict Case Match)        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-auto flex items-center gap-2.5 bg-slate-950/85 border border-slate-800/90 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl max-w-[85vw] sm:max-w-md">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-teal-500/40 bg-slate-800">
          <img
            src={character.thumbnail}
            alt={patientCase.patientName}
            className="w-full h-full object-cover object-top"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs sm:text-sm truncate">
              {patientCase.patientName}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0">
              {patientCase.patientAge}y
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
            <span>{patientCase.patientGender}</span>
            <span>•</span>
            <span className="capitalize text-teal-400/90">{patientCase.personality || 'Concerned'}</span>
            <span>•</span>
            <span className="text-slate-500 truncate">{viewMode === '3d' ? '3D Human' : 'Live Stream'}</span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Clinical Patient Profile Drawer                             */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showProfileDrawer && (
        <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex justify-end transition-opacity duration-300">
          <div className="w-full max-w-sm sm:max-w-md h-full bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Patient Record</h3>
                  <p className="text-[11px] text-slate-400">Clinical Consultation Demographics</p>
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

            {/* Patient Header Card */}
            <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 border-teal-500/40 bg-slate-800 shadow-md">
                <img
                  src={character.avatarAsset}
                  alt={patientCase.patientName}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-base leading-tight">
                  {patientCase.patientName}
                </h4>
                <p className="text-xs text-teal-300 font-medium mb-1">{patientCase.title}</p>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                    Age: {patientCase.patientAge}y
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 capitalize">
                    {patientCase.patientGender}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 capitalize">
                    {patientCase.personality || 'Concerned'}
                  </span>
                </div>
              </div>
            </div>

            {/* Clinical Telemetry Summary */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 mb-4">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2 uppercase tracking-wider">
                Current Vital Signs
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Heart Rate</span>
                  <span className="font-bold text-rose-400">{vitals.hr} bpm</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Blood Pressure</span>
                  <span className="font-bold text-sky-400">{vitals.bp}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Oxygen Sat (SpO2)</span>
                  <span className="font-bold text-emerald-400">{vitals.spo2}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Reported Pain</span>
                  <span className="font-bold text-amber-400">{vitals.pain}</span>
                </div>
              </div>
            </div>

            {/* Clinical Bio */}
            <div className="space-y-3.5 text-xs text-slate-300 flex-1">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                  Chief Complaint
                </span>
                <p className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-slate-200 leading-relaxed">
                  {patientCase.chiefComplaint}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1 uppercase tracking-wider">
                  Simulation Integrity
                </span>
                <p className="bg-teal-950/30 border border-teal-800/40 rounded-xl p-3 text-teal-200/90 leading-relaxed text-[11px]">
                  All verbal responses are strictly grounded in the Patient Truth Layer. The 3D Digital Human and Telehealth streams simulate biological speech, anatomical jaw articulation, and clinical expressions in real time.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
