import * as THREE from 'three';
import { IAvatarProvider, AvatarInitOptions } from './avatarService';
import { AvatarState, PatientEmotion, VisemeFrame } from '../types';

export class WebGLAvatarProvider implements IAvatarProvider {
  public getContainer(): HTMLElement | null { return this.container; }
  private container: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private animationFrameId: number | null = null;

  // Avatar Meshes & Groups
  private headGroup: THREE.Group | null = null;
  private eyesGroup: THREE.Group | null = null;
  private leftEye: THREE.Mesh | null = null;
  private rightEye: THREE.Mesh | null = null;
  private leftUpperEyelid: THREE.Mesh | null = null;
  private rightUpperEyelid: THREE.Mesh | null = null;
  private leftBrow: THREE.Mesh | null = null;
  private rightBrow: THREE.Mesh | null = null;
  private mouthGroup: THREE.Group | null = null;
  private upperLip: THREE.Mesh | null = null;
  private lowerLip: THREE.Mesh | null = null;
  private teethUpper: THREE.Mesh | null = null;
  private teethLower: THREE.Mesh | null = null;
  private torsoGroup: THREE.Group | null = null;

  // State & Animation
  public getState(): AvatarState { return this.currentState; }
  private currentState: AvatarState = 'idle';
  private currentEmotion: PatientEmotion = 'neutral';
  private emotionIntensity = 0.35;
  private isSpeaking = false;
  private isListening = false;

  // Audio & Viseme Analysis
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private visemes: VisemeFrame = { jawOpen: 0, mouthOpen: 0, lipPucker: 0, lipFunnel: 0, mouthWide: 0 };
  private synthInterval: any = null;

  // Procedural Timing & Noise
  private clock = new THREE.Clock();
  private nextBlinkTime = 2.5;
  private isBlinking = false;
  private blinkProgress = 0;
  private nextSaccadeTime = 3.5;
  private eyeGazeTarget = new THREE.Vector2(0, 0);
  private currentEyeGaze = new THREE.Vector2(0, 0);
  
  private targetHeadRotation = new THREE.Euler(0, 0, 0);

  // Patient appearance profile
  private gender: 'male' | 'female' = 'male';
  private ageGroup: 'young-adult' | 'middle-aged' | 'elderly' = 'middle-aged';

  async initialize(container: HTMLElement, options: AvatarInitOptions): Promise<void> {
    this.container = container;
    this.gender = (options.avatarGender?.toLowerCase().includes('female') ? 'female' : 'male') as any;
    this.ageGroup = (options.avatarAgeGroup || 'middle-aged') as any;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // Deep medical navy/slate

    // Camera
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    this.camera.position.set(0, 0.2, 2.6);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Studio Medical Lighting
    this.setupLighting();

    // Build 3D Digital Human Anatomical Model
    this.buildPatientModel();

    // Start 60fps Animation Loop
    this.startLoop();
  }

  private setupLighting(): void {
    if (!this.scene) return;

    // Key Light (Warm soft frontal light)
    const keyLight = new THREE.DirectionalLight(0xfff6ed, 1.4);
    keyLight.position.set(1.2, 1.8, 2.2);
    this.scene.add(keyLight);

    // Fill Light (Cool medical clinical fill)
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.85);
    fillLight.position.set(-1.4, 0.8, 1.8);
    this.scene.add(fillLight);

    // Rim Light (Edge separation)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    rimLight.position.set(0, 2.0, -1.8);
    this.scene.add(rimLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.7);
    this.scene.add(ambientLight);
  }

  private buildPatientModel(): void {
    if (!this.scene) return;

    const isFemale = this.gender === 'female';
    const isElderly = this.ageGroup === 'elderly';

    // Skin Material (Realistic PBR)
    const skinTone = isFemale ? 0xf5d0be : isElderly ? 0xdec0af : 0xdfb89e;
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: skinTone,
      roughness: isElderly ? 0.68 : 0.58,
      metalness: 0.05,
    });

    // Root Head Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.15, 0);

    // 1. Cranium / Head Contour
    const headGeom = new THREE.SphereGeometry(0.5, 32, 32);
    headGeom.scale(isFemale ? 0.88 : 0.94, 1.15, 0.98);
    const headMesh = new THREE.Mesh(headGeom, skinMaterial);
    headMesh.position.set(0, 0, 0);
    this.headGroup.add(headMesh);

    // 2. Jaw & Chin
    const chinGeom = new THREE.BoxGeometry(isFemale ? 0.28 : 0.36, 0.25, 0.28);
    const chinMesh = new THREE.Mesh(chinGeom, skinMaterial);
    chinMesh.position.set(0, -0.42, 0.2);
    chinMesh.rotation.x = 0.2;
    this.headGroup.add(chinMesh);

    // 3. Hair (Realistic styling)
    const hairColor = isElderly ? 0xd4d4d8 : isFemale ? 0x27272a : 0x1f2937;
    const hairMaterial = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });
    const hairGeom = new THREE.SphereGeometry(0.53, 24, 24);
    hairGeom.scale(0.92, 0.9, 1.02);
    const hairMesh = new THREE.Mesh(hairGeom, hairMaterial);
    hairMesh.position.set(0, 0.16, -0.06);
    this.headGroup.add(hairMesh);

    // 4. Eyes & Sclera
    this.eyesGroup = new THREE.Group();
    this.eyesGroup.position.set(0, 0.06, 0.42);

    const eyeGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const scleraMaterial = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1 });
    const irisMaterial = new THREE.MeshStandardMaterial({ color: isFemale ? 0x451a03 : 0x1e293b, roughness: 0.2 });
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const createEye = (xOffset: number) => {
      const eye = new THREE.Group();
      eye.position.set(xOffset, 0, 0);

      // Sclera
      const sclera = new THREE.Mesh(eyeGeom, scleraMaterial);
      eye.add(sclera);

      // Iris
      const irisGeom = new THREE.CircleGeometry(0.045, 16);
      const iris = new THREE.Mesh(irisGeom, irisMaterial);
      iris.position.set(0, 0, 0.076);
      eye.add(iris);

      // Pupil
      const pupilGeom = new THREE.CircleGeometry(0.02, 16);
      const pupil = new THREE.Mesh(pupilGeom, pupilMaterial);
      pupil.position.set(0, 0, 0.078);
      eye.add(pupil);

      return eye;
    };

    const eyeDistance = isFemale ? 0.18 : 0.21;
    this.leftEye = createEye(-eyeDistance) as any;
    this.rightEye = createEye(eyeDistance) as any;
    this.eyesGroup.add(this.leftEye!);
    this.eyesGroup.add(this.rightEye!);
    this.headGroup.add(this.eyesGroup);

    // 5. Eyelids (for realistic blinking)
    const eyelidGeom = new THREE.SphereGeometry(0.086, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const eyelidMaterial = skinMaterial.clone();
    this.leftUpperEyelid = new THREE.Mesh(eyelidGeom, eyelidMaterial);
    this.leftUpperEyelid.position.set(-eyeDistance, 0.06, 0.42);
    this.leftUpperEyelid.rotation.x = -Math.PI * 0.48; // resting open
    this.headGroup.add(this.leftUpperEyelid);

    this.rightUpperEyelid = new THREE.Mesh(eyelidGeom, eyelidMaterial);
    this.rightUpperEyelid.position.set(eyeDistance, 0.06, 0.42);
    this.rightUpperEyelid.rotation.x = -Math.PI * 0.48;
    this.headGroup.add(this.rightUpperEyelid);

    // 6. Eyebrows (Realistic curvature & emotional morphing)
    const browMaterial = new THREE.MeshStandardMaterial({ color: isElderly ? 0x9ca3af : 0x1e293b, roughness: 0.9 });
    const browGeom = new THREE.BoxGeometry(0.16, 0.024, 0.04);

    this.leftBrow = new THREE.Mesh(browGeom, browMaterial);
    this.leftBrow.position.set(-eyeDistance, 0.17, 0.46);
    this.leftBrow.rotation.z = 0.04;
    this.headGroup.add(this.leftBrow);

    this.rightBrow = new THREE.Mesh(browGeom, browMaterial);
    this.rightBrow.position.set(eyeDistance, 0.17, 0.46);
    this.rightBrow.rotation.z = -0.04;
    this.headGroup.add(this.rightBrow);

    // 7. Nose
    const noseGeom = new THREE.ConeGeometry(0.07, 0.22, 12);
    const nose = new THREE.Mesh(noseGeom, skinMaterial);
    nose.position.set(0, -0.06, 0.5);
    nose.rotation.x = 0.22;
    this.headGroup.add(nose);

    // 8. Mouth & Realistic Lips (Lip-Sync Morph Targets)
    this.mouthGroup = new THREE.Group();
    this.mouthGroup.position.set(0, -0.26, 0.44);

    const lipColor = isFemale ? 0xba6868 : 0xaa716c;
    const lipMaterial = new THREE.MeshStandardMaterial({ color: lipColor, roughness: 0.5 });

    const upperLipGeom = new THREE.BoxGeometry(0.24, 0.038, 0.06);
    this.upperLip = new THREE.Mesh(upperLipGeom, lipMaterial);
    this.upperLip.position.set(0, 0.02, 0);
    this.mouthGroup.add(this.upperLip);

    const lowerLipGeom = new THREE.BoxGeometry(0.23, 0.044, 0.06);
    this.lowerLip = new THREE.Mesh(lowerLipGeom, lipMaterial);
    this.lowerLip.position.set(0, -0.02, 0);
    this.mouthGroup.add(this.lowerLip);

    // Inner teeth (subtle)
    const teethMaterial = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
    const teethGeom = new THREE.BoxGeometry(0.16, 0.025, 0.03);
    this.teethUpper = new THREE.Mesh(teethGeom, teethMaterial);
    this.teethUpper.position.set(0, 0.015, -0.02);
    this.mouthGroup.add(this.teethUpper);

    this.teethLower = new THREE.Mesh(teethGeom, teethMaterial);
    this.teethLower.position.set(0, -0.015, -0.02);
    this.mouthGroup.add(this.teethLower);

    this.headGroup.add(this.mouthGroup);

    // 9. Neck & Clinical Patient Clothing / Gown
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, -0.75, 0);

    // Neck
    const neckGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.35, 20);
    const neckMesh = new THREE.Mesh(neckGeom, skinMaterial);
    neckMesh.position.set(0, 0.28, 0);
    this.torsoGroup.add(neckMesh);

    // Shoulders & Medical Clinic Gown
    const gownMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f766e, // Professional clinical teal gown
      roughness: 0.8,
    });
    const torsoGeom = new THREE.CylinderGeometry(0.65, 0.78, 0.7, 24);
    const torsoMesh = new THREE.Mesh(torsoGeom, gownMaterial);
    torsoMesh.position.set(0, -0.15, 0);
    torsoMesh.scale.set(1.2, 1.0, 0.65);
    this.torsoGroup.add(torsoMesh);

    // Add everything to scene
    this.scene.add(this.headGroup);
    this.scene.add(this.torsoGroup);
  }

  private startLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.updateSimulation();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  // Real-Time 60fps Behavior & Physics Simulation
  private updateSimulation(): void {
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // 1. Natural Breathing (Subtle vertical sinusoidal motion)
    const breathingOffset = Math.sin(time * 1.4) * 0.012;
    if (this.torsoGroup) {
      this.torsoGroup.position.y = -0.75 + breathingOffset * 0.7;
    }
    if (this.headGroup) {
      this.headGroup.position.y = 0.15 + breathingOffset;
    }

    // 2. Head Motion (Attentive listening nods or speaking cadence)
    if (this.headGroup) {
      if (this.isListening) {
        // Attentive lean-in + subtle nod
        const nod = Math.sin(time * 2.8) * 0.035;
        this.targetHeadRotation.set(0.04 + nod, 0.03 * Math.sin(time * 0.8), 0.015);
      } else if (this.isSpeaking) {
        // Natural speech head articulation
        const cadence = Math.sin(time * 4.2) * 0.025;
        const sway = Math.cos(time * 2.2) * 0.03;
        this.targetHeadRotation.set(cadence, sway, 0);
      } else {
        // Subtle resting micro-drift
        this.targetHeadRotation.set(Math.sin(time * 0.5) * 0.015, Math.cos(time * 0.4) * 0.02, 0);
      }

      this.headGroup.rotation.x += (this.targetHeadRotation.x - this.headGroup.rotation.x) * 0.1;
      this.headGroup.rotation.y += (this.targetHeadRotation.y - this.headGroup.rotation.y) * 0.1;
      this.headGroup.rotation.z += (this.targetHeadRotation.z - this.headGroup.rotation.z) * 0.1;
    }

    // 3. Natural Eye Gaze & Micro-Saccades
    if (time > this.nextSaccadeTime) {
      this.nextSaccadeTime = time + 3.0 + Math.random() * 4.0;
      // Brief glance away and return
      this.eyeGazeTarget.set((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.03);
    }
    this.currentEyeGaze.lerp(this.eyeGazeTarget, 0.12);
    if (this.leftEye && this.rightEye) {
      this.leftEye.rotation.y = this.currentEyeGaze.x;
      this.leftEye.rotation.x = this.currentEyeGaze.y;
      this.rightEye.rotation.y = this.currentEyeGaze.x;
      this.rightEye.rotation.x = this.currentEyeGaze.y;
    }

    // 4. Natural Blinking (Poisson distribution)
    if (!this.isBlinking && time > this.nextBlinkTime) {
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.nextBlinkTime = time + 2.5 + Math.random() * 3.5;
    }

    if (this.isBlinking) {
      this.blinkProgress += delta * 7.5; // ~130ms complete cycle
      let eyelidAngle = -Math.PI * 0.48; // open position

      if (this.blinkProgress < 0.5) {
        // closing
        const t = this.blinkProgress / 0.5;
        eyelidAngle = -Math.PI * 0.48 + t * 0.65;
      } else if (this.blinkProgress < 1.0) {
        // opening
        const t = (this.blinkProgress - 0.5) / 0.5;
        eyelidAngle = -Math.PI * 0.48 + (1 - t) * 0.65;
      } else {
        this.isBlinking = false;
      }

      if (this.leftUpperEyelid && this.rightUpperEyelid) {
        this.leftUpperEyelid.rotation.x = eyelidAngle;
        this.rightUpperEyelid.rotation.x = eyelidAngle;
      }
    }

    // 5. Lip-Sync & Viseme Updates (Real-time Audio Driven)
    this.updateLipSync();

    // 6. Facial Expressions (Emotion Morphing)
    this.updateExpressions();
  }

  // Audio Analysis & Lip-Sync Morphing
  private updateLipSync(): void {
    if (!this.mouthGroup || !this.lowerLip || !this.upperLip) return;

    if (this.isSpeaking && this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);

      // RMS calculation
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;

      // Extract low frequency vowels (A, O, U)
      let lowFreqSum = 0;
      for (let i = 2; i < 16; i++) {
        lowFreqSum += dataArray[i] || 0;
      }
      const lowFreqAvg = lowFreqSum / 14;

      // Real-time viseme mapping (normalized 0 to 1)
      const targetJawOpen = Math.min(1.0, (lowFreqAvg / 128) * 1.25);
      const targetMouthOpen = Math.min(1.0, (average / 110) * 1.2);

      this.visemes.jawOpen += (targetJawOpen - this.visemes.jawOpen) * 0.35;
      this.visemes.mouthOpen += (targetMouthOpen - this.visemes.mouthOpen) * 0.35;
    } else if (!this.isSpeaking) {
      // Smooth decay to neutral closed lips within 50ms
      this.visemes.jawOpen += (0 - this.visemes.jawOpen) * 0.25;
      this.visemes.mouthOpen += (0 - this.visemes.mouthOpen) * 0.25;
    }

    // Morph the physical lip meshes
    const verticalOpening = this.visemes.jawOpen * 0.085;
    this.lowerLip.position.y = -0.02 - verticalOpening;
    this.upperLip.position.y = 0.02 + verticalOpening * 0.2;

    if (this.teethLower) {
      this.teethLower.position.y = -0.015 - verticalOpening * 0.8;
    }
  }

  // Emotional Facial Expression Morphing
  private updateExpressions(): void {
    if (!this.leftBrow || !this.rightBrow) return;

    let targetBrowY = 0.17;
    let targetLeftBrowZ = 0.04;
    let targetRightBrowZ = -0.04;

    switch (this.currentEmotion) {
      case 'anxious':
        // Inner brows raised and pulled in
        targetBrowY = 0.185 + this.emotionIntensity * 0.015;
        targetLeftBrowZ = 0.18 * this.emotionIntensity;
        targetRightBrowZ = -0.18 * this.emotionIntensity;
        break;
      case 'concerned':
        // Slight furrow / inner brow tension
        targetBrowY = 0.165 - this.emotionIntensity * 0.01;
        targetLeftBrowZ = 0.12 * this.emotionIntensity;
        targetRightBrowZ = -0.12 * this.emotionIntensity;
        break;
      case 'confused':
        // Asymmetric questioning brow
        targetBrowY = 0.175;
        targetLeftBrowZ = 0.22 * this.emotionIntensity;
        targetRightBrowZ = 0.02;
        break;
      case 'sad':
        // Downward droop
        targetBrowY = 0.16;
        targetLeftBrowZ = 0.14 * this.emotionIntensity;
        targetRightBrowZ = -0.14 * this.emotionIntensity;
        break;
      case 'calm':
      case 'relieved':
      case 'neutral':
      default:
        targetBrowY = 0.17;
        targetLeftBrowZ = 0.04;
        targetRightBrowZ = -0.04;
        break;
    }

    // Smooth lerp to emotional target
    this.leftBrow.position.y += (targetBrowY - this.leftBrow.position.y) * 0.1;
    this.rightBrow.position.y += (targetBrowY - this.rightBrow.position.y) * 0.1;
    this.leftBrow.rotation.z += (targetLeftBrowZ - this.leftBrow.rotation.z) * 0.1;
    this.rightBrow.rotation.z += (targetRightBrowZ - this.rightBrow.rotation.z) * 0.1;
  }

  // Web Audio Hookup for Real-Time Lip-Sync
  private setupAudioAnalyser(audioEl: HTMLAudioElement): void {
    try {
      if (!this.audioContext) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;

      if (this.currentAudioElement !== audioEl) {
        if (this.audioSourceNode) {
          try {
            this.audioSourceNode.disconnect();
          } catch (e) {}
        }
        this.currentAudioElement = audioEl;
        this.audioSourceNode = this.audioContext.createMediaElementSource(audioEl);
        this.audioSourceNode.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }
    } catch (err) {
      console.warn('[WebGLAvatarProvider] MediaElementSource hook failed, using speech envelope fallback:', err);
      this.startSimulatedAudioVisemes();
    }
  }

  private startSimulatedAudioVisemes(): void {
    if (this.synthInterval) clearInterval(this.synthInterval);
    this.synthInterval = setInterval(() => {
      if (!this.isSpeaking) {
        clearInterval(this.synthInterval);
        return;
      }
      this.visemes.jawOpen = 0.2 + Math.random() * 0.55;
      this.visemes.mouthOpen = 0.2 + Math.random() * 0.45;
    }, 90);
  }

  // Interface Methods
  async connect(): Promise<void> {
    this.currentState = 'idle';
  }

  disconnect(): void {
    this.stopSpeaking();
    this.currentState = 'idle';
  }

  speak(_text: string, audioEl?: HTMLAudioElement | null): void {
    this.isSpeaking = true;
    this.isListening = false;
    this.currentState = 'speaking';

    if (audioEl) {
      this.setupAudioAnalyser(audioEl);
    } else {
      this.startSimulatedAudioVisemes();
    }
  }

  stopSpeaking(): void {
    this.isSpeaking = false;
    this.visemes.jawOpen = 0;
    this.visemes.mouthOpen = 0;
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.currentState = 'idle';
  }

  setEmotion(emotion: PatientEmotion, intensity: number = 0.35): void {
    this.currentEmotion = emotion;
    this.emotionIntensity = intensity;
  }

  setListeningState(): void {
    this.isListening = true;
    this.isSpeaking = false;
    this.currentState = 'listening';
  }

  setThinkingState(): void {
    this.isListening = false;
    this.isSpeaking = false;
    this.currentState = 'thinking';
  }

  setIdleState(): void {
    this.isListening = false;
    this.isSpeaking = false;
    this.currentState = 'idle';
  }

  resize(width: number, height: number): void {
    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}

export default WebGLAvatarProvider;
