// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 2: Realistic Human Patient Digital Character Provider
// ────────────────────────────────────────────────────────────────────────────

import { IAvatarProvider, AvatarInitOptions } from './avatarService';
import { AvatarState, PatientEmotion, VisemeFrame } from '../types';
import { PatientCharacter } from '../types/character';
import { PatientCharacterService } from './patientCharacterService';
import { avatarEventBus } from './avatarEventBus';

export class RealisticHumanAvatarProvider implements IAvatarProvider {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;

  // Character Configuration
  private character: PatientCharacter = PatientCharacterService.getCharacterById('char_nusrat');
  private characterImage: HTMLImageElement | null = null;
  private isImageLoaded = false;

  // State & Emotion
  private currentState: AvatarState = 'idle';
  private currentEmotion: PatientEmotion = 'concerned';
  private emotionIntensity = 0.45;
  private isSpeaking = false;

  // Audio & Web Audio API Lip-Sync
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private visemes: VisemeFrame = { jawOpen: 0, mouthOpen: 0, lipPucker: 0, lipFunnel: 0, mouthWide: 0 };
  private synthLipInterval: any = null;

  // Biological Micro-animation Timing
  private startTime = performance.now();
  private lastTime = performance.now();

  // Blinking (Natural Human Curve: fast close 80ms, hold 20ms, ease-out open 140ms)
  private nextBlinkTime = 2.8;
  private isBlinking = false;
  private blinkProgress = 0;
  private isDoubleBlink = false;

  // Eye Saccades (Micro-fixation movements)
  private nextSaccadeTime = 3.0;
  private currentGazeX = 0;
  private currentGazeY = 0;
  private targetGazeX = 0;
  private targetGazeY = 0;

  // Head Micro-Drift & Attentive Nodding
  private headPitch = 0;
  private headYaw = 0;
  private headRoll = 0;
  private nextListeningNodTime = 4.0;
  private isNodding = false;
  private nodProgress = 0;

  // Breathing Motion (Thoracic & Shoulder expansion)
  private breathPhase = 0;

  // Error & Event subscriptions
  private eventUnsubscribers: (() => void)[] = [];

  public getContainer(): HTMLElement | null {
    return this.container;
  }

  public getState(): AvatarState {
    return this.currentState;
  }

  /**
   * Initializes the realistic digital human canvas in the host container.
   */
  async initialize(container: HTMLElement, options: AvatarInitOptions): Promise<void> {
    this.container = container;

    // Resolve matching character from characterId or demographic options
    if (options.avatarId && options.avatarId.startsWith('char_')) {
      this.character = PatientCharacterService.getCharacterById(options.avatarId);
    } else {
      this.character = PatientCharacterService.getCharacterForCase({
        patientName: options.patientName,
        avatarGender: options.avatarGender,
        avatarAgeGroup: options.avatarAgeGroup,
        personality: (options.personality || 'concerned') as any,
      });
    }

    this.currentEmotion = this.character.defaultEmotion;

    // Create Accelerated Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'w-full h-full object-cover block select-none pointer-events-none';
    this.canvas.style.transform = 'translateZ(0)'; // Force hardware compositing

    const width = container.clientWidth > 0 ? container.clientWidth : 720;
    const height = container.clientHeight > 0 ? container.clientHeight : 540;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);

    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });

    container.innerHTML = '';
    container.appendChild(this.canvas);

    // Register Event Bus Listeners
    this.registerEventBusListeners();

    // Load High-Resolution Photorealistic Character Portrait
    await this.loadCharacterAsset(this.character.avatarAsset);

    // Launch 60 FPS Micro-Animation Loop
    this.startTime = performance.now();
    this.lastTime = performance.now();
    this.startLoop();
  }

  /**
   * Loads character photographic asset with graceful fallback hierarchy.
   */
  private loadCharacterAsset(src: string): Promise<void> {
    return new Promise((resolve) => {
      this.isImageLoaded = false;
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        this.characterImage = img;
        this.isImageLoaded = true;
        resolve();
      };

      img.onerror = () => {
        console.warn(`[RealisticHumanAvatarProvider] Failed to load ${src}, trying fallback asset`);
        // Fallback to nusrat_jahan.jpg if primary fails
        if (src !== '/characters/nusrat_jahan.jpg') {
          this.loadCharacterAsset('/characters/nusrat_jahan.jpg').then(resolve);
        } else {
          resolve(); // Continues gracefully with procedural canvas fallback
        }
      };

      img.src = src;
    });
  }

  /**
   * Binds Audio & Avatar Event Bus hooks.
   */
  private registerEventBusListeners(): void {
    this.eventUnsubscribers.push(
      avatarEventBus.on('patientListeningStarted', () => {
        this.setListeningState();
      }),
      avatarEventBus.on('patientThinkingStarted', () => {
        this.setThinkingState();
      }),
      avatarEventBus.on('patientInterrupted', () => {
        this.stopSpeaking();
        this.setListeningState();
      })
    );
  }

  async connect(): Promise<void> {
    this.setState('idle');
  }

  disconnect(): void {
    this.stopSpeaking();
    this.setState('idle');
  }

  /**
   * Lip Sync & Speech Activation.
   */
  speak(text: string, audioEl?: HTMLAudioElement | null): void {
    this.isSpeaking = true;
    this.setState('speaking');

    avatarEventBus.emit('patientSpeaking', {
      text,
      visemeWeight: 0.8,
      timestamp: Date.now(),
    });

    if (audioEl) {
      this.currentAudioElement = audioEl;
      this.setupWebAudioLipSync(audioEl);
    } else {
      this.startSyntheticLipSync(text);
    }
  }

  /**
   * Stops speaking, resets mouth to closed position, and clears audio.
   */
  stopSpeaking(): void {
    this.isSpeaking = false;
    if (this.synthLipInterval) {
      clearInterval(this.synthLipInterval);
      this.synthLipInterval = null;
    }

    if (this.currentAudioElement) {
      try {
        if (!this.currentAudioElement.paused) {
          this.currentAudioElement.pause();
        }
      } catch (e) {
        // ignore
      }
      this.currentAudioElement = null;
    }

    // Smoothly close lips
    this.visemes.jawOpen = 0;
    this.visemes.mouthOpen = 0;
    this.visemes.lipPucker = 0;
    this.visemes.mouthWide = 0;
  }

  /**
   * Analyzes real-time audio playback using Web Audio API for precise viseme tracking.
   */
  private setupWebAudioLipSync(audioEl: HTMLAudioElement): void {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
        }
      }

      if (this.audioContext && !this.audioSourceNode) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.4;

        try {
          this.audioSourceNode = this.audioContext.createMediaElementSource(audioEl);
          this.audioSourceNode.connect(this.analyser);
          this.analyser.connect(this.audioContext.destination);
        } catch (srcErr) {
          // If media element was already connected, fallback to synthetic
          this.startSyntheticLipSync();
        }
      }

      audioEl.onended = () => {
        this.stopSpeaking();
        this.setState('idle');
        avatarEventBus.emit('patientAudioFinished', { timestamp: Date.now() });
      };

      audioEl.onpause = () => {
        if (this.isSpeaking) {
          this.stopSpeaking();
          this.setState('idle');
        }
      };
    } catch (err) {
      console.warn('[RealisticHumanAvatarProvider] Web Audio connection failed, using synthetic lip-sync:', err);
      this.startSyntheticLipSync();
    }
  }

  /**
   * Synthetic biological speech cadence fallback when Web Audio is restricted.
   */
  private startSyntheticLipSync(_text?: string): void {
    if (this.synthLipInterval) clearInterval(this.synthLipInterval);

    let syllableIdx = 0;
    this.synthLipInterval = setInterval(() => {
      if (!this.isSpeaking) {
        clearInterval(this.synthLipInterval);
        return;
      }

      syllableIdx++;
      const isPause = syllableIdx % 7 === 0;

      if (isPause) {
        this.visemes.jawOpen = Math.max(0, this.visemes.jawOpen - 0.25);
        this.visemes.mouthWide = Math.max(0, this.visemes.mouthWide - 0.2);
        this.visemes.lipPucker = 0;
      } else {
        const targetJaw = 0.25 + Math.random() * 0.55;
        this.visemes.jawOpen = this.visemes.jawOpen * 0.4 + targetJaw * 0.6;
        this.visemes.mouthWide = Math.random() * 0.4;
        this.visemes.lipPucker = Math.random() * 0.25;
      }
    }, 90);
  }

  setEmotion(emotion: PatientEmotion, intensity: number = 0.45): void {
    this.currentEmotion = emotion;
    this.emotionIntensity = Math.max(0.1, Math.min(1.0, intensity));

    avatarEventBus.emit('patientEmotionChanged', {
      emotion,
      intensity: this.emotionIntensity,
      timestamp: Date.now(),
    });
  }

  setListeningState(): void {
    this.isSpeaking = false;
    this.setState('listening');
    avatarEventBus.emit('patientListeningStarted', { timestamp: Date.now() });
  }

  setThinkingState(): void {
    this.isSpeaking = false;
    this.setState('thinking');
    avatarEventBus.emit('patientThinkingStarted', { timestamp: Date.now() });
  }

  setIdleState(): void {
    this.isSpeaking = false;
    this.setState('idle');
  }

  private setState(state: AvatarState): void {
    this.currentState = state;
  }

  resize(width: number, height: number): void {
    if (!this.canvas || width <= 0 || height <= 0) return;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
  }

  destroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.stopSpeaking();
    this.eventUnsubscribers.forEach((unsub) => unsub());
    this.eventUnsubscribers = [];

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }

    if (this.canvas && this.container && this.canvas.parentElement === this.container) {
      this.container.removeChild(this.canvas);
    }

    this.canvas = null;
    this.ctx = null;
    this.container = null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 60 FPS Micro-Animation & Real-Time Render Engine
  // ──────────────────────────────────────────────────────────────────────────

  private startLoop(): void {
    const render = (time: number) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;

      this.updateProceduralBiologicalState(dt, (time - this.startTime) / 1000);
      this.renderCanvas();

      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  /**
   * Updates natural human physical micro-movements:
   * Breathing, Blinking, Eye Saccades, Attentive Listening Nods, Speaking Head Jitter.
   */
  private updateProceduralBiologicalState(dt: number, totalTime: number): void {
    // 1. Audio Frequency Analysis (if active AnalyserNode)
    if (this.isSpeaking && this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < 32; i++) {
        sum += dataArray[i];
      }
      const avg = sum / 32;
      const energy = Math.min(avg / 140, 1.0);

      this.visemes.jawOpen = this.visemes.jawOpen * 0.35 + energy * 0.65;
      this.visemes.mouthWide = (dataArray[24] / 255) * 0.4;
      this.visemes.lipPucker = (dataArray[4] / 255) * 0.3;
    }

    // 2. Breathing Motion (14–18 breaths/min, slightly faster if anxious)
    const breathRate = this.currentEmotion === 'anxious' ? 0.32 : 0.22; // Hz
    this.breathPhase += dt * breathRate * Math.PI * 2;

    // 3. Blinking Cycle (Bézier simulation)
    this.nextBlinkTime -= dt;
    if (this.nextBlinkTime <= 0 && !this.isBlinking) {
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.isDoubleBlink = (this.currentEmotion === 'anxious' || this.currentEmotion === 'concerned') && Math.random() < 0.35;
    }

    if (this.isBlinking) {
      this.blinkProgress += dt * 5.5; // ~180ms total blink duration
      if (this.blinkProgress >= 1.0) {
        if (this.isDoubleBlink) {
          this.isDoubleBlink = false;
          this.blinkProgress = 0; // immediate second blink
        } else {
          this.isBlinking = false;
          this.blinkProgress = 0;
          // Random delay between 2.5s and 5.0s
          this.nextBlinkTime = 2.5 + Math.random() * 2.5;
        }
      }
    }

    // 4. Saccadic Eye Movements
    this.nextSaccadeTime -= dt;
    if (this.nextSaccadeTime <= 0) {
      if (this.currentState === 'thinking') {
        // Gaze drifts upward and slightly sideways when thinking
        this.targetGazeX = (Math.random() - 0.5) * 3.5;
        this.targetGazeY = -2.5 - Math.random() * 2.0;
        this.nextSaccadeTime = 1.8 + Math.random() * 1.5;
      } else if (this.currentState === 'listening') {
        // Engaged eye contact with minor fixation jitter
        this.targetGazeX = (Math.random() - 0.5) * 1.2;
        this.targetGazeY = (Math.random() - 0.5) * 1.0;
        this.nextSaccadeTime = 2.8 + Math.random() * 2.0;
      } else {
        // Natural resting micro-saccades
        this.targetGazeX = (Math.random() - 0.5) * 2.0;
        this.targetGazeY = (Math.random() - 0.5) * 1.5;
        this.nextSaccadeTime = 2.5 + Math.random() * 2.5;
      }
    }

    this.currentGazeX = this.currentGazeX * 0.8 + this.targetGazeX * 0.2;
    this.currentGazeY = this.currentGazeY * 0.8 + this.targetGazeY * 0.2;

    // 5. Attentive Listening Head Nods
    if (this.currentState === 'listening') {
      this.nextListeningNodTime -= dt;
      if (this.nextListeningNodTime <= 0 && !this.isNodding) {
        this.isNodding = true;
        this.nodProgress = 0;
      }
    }

    if (this.isNodding) {
      this.nodProgress += dt * 2.2;
      if (this.nodProgress >= 1.0) {
        this.isNodding = false;
        this.nodProgress = 0;
        this.nextListeningNodTime = 3.5 + Math.random() * 3.0;
      }
    }

    // 6. Smooth Multi-harmonic Head Drift
    const nodOffset = this.isNodding ? Math.sin(this.nodProgress * Math.PI) * 2.5 : 0;
    const speechJitter = this.isSpeaking ? Math.sin(totalTime * 8) * (this.visemes.jawOpen * 2.2) : 0;
    const listeningLean = this.currentState === 'listening' ? 1.8 : 0;
    const thinkingTilt = this.currentState === 'thinking' ? 2.2 : 0;

    const basePitch = Math.sin(totalTime * 0.8) * 0.8 + nodOffset + speechJitter + listeningLean;
    const baseYaw = Math.cos(totalTime * 0.6) * 1.1 + (this.currentState === 'thinking' ? 2.5 : 0);
    const baseRoll = Math.sin(totalTime * 0.5) * 0.5 + thinkingTilt;

    this.headPitch = this.headPitch * 0.85 + basePitch * 0.15;
    this.headYaw = this.headYaw * 0.85 + baseYaw * 0.15;
    this.headRoll = this.headRoll * 0.85 + baseRoll * 0.15;
  }

  /**
   * Composites the realistic patient character with biological animations.
   */
  private renderCanvas(): void {
    if (!this.canvas || !this.ctx) return;
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    // Deep medical slate clinical backdrop
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Calculate Organic Breathing & Head Shift
    const breathTorsoY = Math.sin(this.breathPhase) * 3.5;
    const breathScale = 1.0 + Math.sin(this.breathPhase) * 0.006;

    ctx.save();

    // Center origin for head and body affine transform
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.translate(centerX, centerY + breathTorsoY);
    ctx.rotate((this.headRoll * Math.PI) / 180);
    ctx.scale(breathScale, breathScale);
    ctx.translate(-centerX, -centerY);

    // 1. Draw High-Resolution Photorealistic Character Portrait
    if (this.isImageLoaded && this.characterImage) {
      // Calculate aspect-fill scaling to preserve character proportions
      const img = this.characterImage;
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;

      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (canvasRatio > imgRatio) {
        drawWidth = width;
        drawHeight = width / imgRatio;
        offsetY = (height - drawHeight) / 2;
      } else {
        drawHeight = height;
        drawWidth = height * imgRatio;
        offsetX = (width - drawWidth) / 2;
      }

      // Apply subtle head parallax offset
      const parallaxX = offsetX + this.headYaw * 1.8;
      const parallaxY = offsetY + this.headPitch * 1.5;

      ctx.drawImage(img, parallaxX, parallaxY, drawWidth, drawHeight);

      // 2. Render Anatomical Living Features (Blinking, Gaze, Lip Movement)
      this.renderFacialOverlays(ctx, centerX + this.headYaw * 1.8, centerY + this.headPitch * 1.5, drawWidth, drawHeight);
    } else {
      // Procedural Clinical Placeholder while asset resolves
      this.renderProceduralSilhouette(ctx, centerX, centerY, width, height);
    }

    ctx.restore();

    // 3. Clinical Room Atmosphere & Lighting Vignette
    this.renderAtmosphericLighting(ctx, width, height);
  }

  /**
   * Renders realistic biological eye blinking, micro-saccades, and dynamic lip sync.
   */
  private renderFacialOverlays(ctx: CanvasRenderingContext2D, faceCenterX: number, faceCenterY: number, _faceW: number, faceH: number): void {
    const scale = faceH / 1000;

    // Approximate anatomical landmarks relative to face center
    const eyeY = faceCenterY - 75 * scale;
    const eyeDistance = 78 * scale;
    const eyeRadiusX = 22 * scale;
    const eyeRadiusY = 13 * scale;

    const leftEyeX = faceCenterX - eyeDistance;
    const rightEyeX = faceCenterX + eyeDistance;

    const mouthY = faceCenterY + 115 * scale;
    const mouthW = 68 * scale;

    // A. Natural Blinking Eyelid Overlay
    if (this.isBlinking) {
      // Hermite smoothing for natural eyelid curve
      const t = this.blinkProgress < 0.5 ? this.blinkProgress * 2 : (1.0 - this.blinkProgress) * 2;
      const lidOpenRatio = 1.0 - Math.min(1.0, Math.max(0.0, t));

      if (lidOpenRatio < 0.95) {
        ctx.save();

        const drawEyelid = (ex: number, ey: number) => {
          ctx.beginPath();
          ctx.ellipse(ex, ey, eyeRadiusX * 1.15, eyeRadiusY * (1.1 - lidOpenRatio), 0, 0, Math.PI * 2);
          // Skin-toned eyelid color matched to South Asian patient complexion
          ctx.fillStyle = 'rgba(168, 114, 88, 0.96)';
          ctx.fill();

          // Subtle upper lash line definition
          ctx.beginPath();
          ctx.ellipse(ex, ey + (1.0 - lidOpenRatio) * 6 * scale, eyeRadiusX * 1.15, 1.8 * scale, 0, 0, Math.PI);
          ctx.strokeStyle = 'rgba(38, 22, 16, 0.85)';
          ctx.lineWidth = 1.8 * scale;
          ctx.stroke();
        };

        drawEyelid(leftEyeX, eyeY);
        drawEyelid(rightEyeX, eyeY);

        ctx.restore();
      }
    }

    // B. Real-Time Audio Lip Sync Overlay
    if (this.isSpeaking && this.visemes.jawOpen > 0.08) {
      const jawDrop = this.visemes.jawOpen * 22 * scale;
      const mouthWidthFactor = 1.0 + (this.visemes.mouthWide || 0) * 0.25 - (this.visemes.lipPucker || 0) * 0.15;
      const currentMouthW = (mouthW * mouthWidthFactor) / 2;

      ctx.save();

      // Inner mouth dark oral cavity
      ctx.beginPath();
      ctx.ellipse(faceCenterX, mouthY + jawDrop * 0.4, currentMouthW * 0.75, jawDrop * 0.65, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#2a1114'; // Dark physiological mouth cavity
      ctx.fill();

      // Subtle upper teeth hint on open syllables
      if (jawDrop > 8 * scale) {
        ctx.beginPath();
        ctx.ellipse(faceCenterX, mouthY + jawDrop * 0.2, currentMouthW * 0.55, 3.2 * scale, 0, 0, Math.PI);
        ctx.fillStyle = 'rgba(235, 230, 225, 0.7)';
        ctx.fill();
      }

      // Upper Lip
      ctx.beginPath();
      ctx.ellipse(faceCenterX, mouthY - 1 * scale, currentMouthW * 0.95, 4.5 * scale, 0, Math.PI, 0);
      ctx.fillStyle = 'rgba(165, 95, 90, 0.75)';
      ctx.fill();

      // Lower Lip (moving downward with jaw drop)
      ctx.beginPath();
      ctx.ellipse(faceCenterX, mouthY + jawDrop * 0.85, currentMouthW * 0.9, 5.5 * scale, 0, 0, Math.PI);
      ctx.fillStyle = 'rgba(175, 100, 95, 0.8)';
      ctx.fill();

      ctx.restore();
    }
  }

  /**
   * Soft clinical vignette and lighting depth.
   */
  private renderAtmosphericLighting(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height * 0.42,
      Math.min(width, height) * 0.35,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.85
    );
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
    gradient.addColorStop(0.65, 'rgba(15, 23, 42, 0.2)');
    gradient.addColorStop(1, 'rgba(2, 6, 23, 0.82)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Fallback silhouette while photographic image buffers.
   */
  private renderProceduralSilhouette(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    ctx.beginPath();
    ctx.ellipse(cx, cy - 40, 90, 120, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx, cy + 160, 200, 140, 0, 0, Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
  }
}

export default RealisticHumanAvatarProvider;
