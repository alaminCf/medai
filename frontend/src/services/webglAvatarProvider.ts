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

  // Avatar Anatomical Meshes & Groups
  private rootGroup: THREE.Group | null = null;
  private headGroup: THREE.Group | null = null;
  private jawGroup: THREE.Group | null = null; // Anatomical TMJ hinge
  private eyesGroup: THREE.Group | null = null;
  private leftEye: THREE.Group | null = null;
  private rightEye: THREE.Group | null = null;
  private leftUpperEyelid: THREE.Mesh | null = null;
  private rightUpperEyelid: THREE.Mesh | null = null;
  private leftBrow: THREE.Mesh | null = null;
  private rightBrow: THREE.Mesh | null = null;
  private upperLip: THREE.Mesh | null = null;
  private lowerLip: THREE.Mesh | null = null;
  private teethUpper: THREE.Mesh | null = null;
  private teethLower: THREE.Mesh | null = null;
  private torsoGroup: THREE.Group | null = null;

  // State & Animation
  public getState(): AvatarState { return this.currentState; }
  private currentState: AvatarState = 'idle';
  private currentEmotion: PatientEmotion = 'concerned';
  private emotionIntensity = 0.45;
  private isSpeaking = false;
  private isListening = false;

  // Audio & Real-time Viseme Analysis
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private visemes: VisemeFrame = { jawOpen: 0, mouthOpen: 0, lipPucker: 0, lipFunnel: 0, mouthWide: 0 };
  private synthInterval: any = null;

  // Biological Micro-animation Timing
  private clock = new THREE.Clock();
  private nextBlinkTime = 2.5;
  private isBlinking = false;
  private blinkProgress = 0;
  private isDoubleBlink = false;
  private nextSaccadeTime = 3.0;
  private eyeGazeTarget = new THREE.Vector2(0, 0);
  private currentEyeGaze = new THREE.Vector2(0, 0);
  private targetHeadRotation = new THREE.Euler(0, 0, 0);
  private listeningNodTime = 3.5;
  private isNodding = false;
  private nodProgress = 0;

  // Demographic appearance profile
  private gender: 'male' | 'female' = 'male';
  private ageGroup: 'young-adult' | 'middle-aged' | 'elderly' = 'middle-aged';
  private patientName = '';

  async initialize(container: HTMLElement, options: AvatarInitOptions): Promise<void> {
    this.container = container;
    this.gender = (options.avatarGender?.toLowerCase().includes('female') ? 'female' : 'male') as any;
    this.ageGroup = (options.avatarAgeGroup || 'middle-aged') as any;
    this.patientName = options.patientName || '';

    const width = container.clientWidth > 0 ? container.clientWidth : 720;
    const height = container.clientHeight > 0 ? container.clientHeight : 540;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d); // Deep clinical slate/navy

    // Camera with portrait perspective
    this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
    this.camera.position.set(0, 0.1, 2.4);

    // Renderer
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      container.innerHTML = '';
      container.appendChild(this.renderer.domElement);
    } catch (err: any) {
      console.warn('[WebGLAvatarProvider] WebGLRenderer creation failed:', err);
      throw new Error('WebGL unavailable: ' + (err?.message || 'context failed'));
    }

    // Studio Medical Lighting
    this.setupLighting();

    // Build 3D Lifelike Digital Human Model
    this.buildPatientModel();

    // Start 60fps Micro-Animation Loop
    this.startLoop();
  }

  private setupLighting(): void {
    if (!this.scene) return;

    // Key Light (Warm soft frontal light)
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.6);
    keyLight.position.set(1.0, 1.8, 2.2);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Fill Light (Cool medical clinical fill)
    const fillLight = new THREE.DirectionalLight(0xbfdbfe, 1.0);
    fillLight.position.set(-1.2, 0.8, 1.6);
    this.scene.add(fillLight);

    // Rim / Hair Light (Crisp cyan/teal edge separation)
    const rimLight = new THREE.DirectionalLight(0x2dd4bf, 1.3);
    rimLight.position.set(0, 2.2, -1.8);
    this.scene.add(rimLight);

    // Under-chin bounce light (Soft clinical bounce)
    const bounceLight = new THREE.DirectionalLight(0xe0f2fe, 0.4);
    bounceLight.position.set(0, -1.5, 1.0);
    this.scene.add(bounceLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x0f172a, 0.8);
    this.scene.add(ambientLight);
  }

  private buildPatientModel(): void {
    if (!this.scene) return;

    const isFemale = this.gender === 'female';
    const isElderly = this.ageGroup === 'elderly';

    // Tone resolution: South Asian or Western tone
    const isSouthAsian = /[\u0980-\u09FF]|rahim|nusrat|tanvir|fatema|abdul|rokeya|islam|ahmed|begum/i.test(this.patientName);
    let skinHex = isSouthAsian
      ? (isFemale ? 0xd19f80 : isElderly ? 0xb58265 : 0xc68d6c)
      : (isFemale ? 0xf7d0be : isElderly ? 0xe2beab : 0xdfb89e);

    // PBR Skin Material
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: skinHex,
      roughness: isElderly ? 0.72 : 0.58,
      metalness: 0.03,
    });

    this.rootGroup = new THREE.Group();

    // Root Head Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.15, 0);

    // 1. Cranium / Head Contour (High Subdivision Smooth Sphere)
    const headGeom = new THREE.SphereGeometry(0.5, 48, 48);
    headGeom.scale(isFemale ? 0.86 : 0.93, 1.14, 0.98);
    const headMesh = new THREE.Mesh(headGeom, skinMaterial);
    headMesh.position.set(0, 0, 0);
    this.headGroup.add(headMesh);

    // Cheeks contouring (Subtle lateral volume)
    const cheekGeom = new THREE.SphereGeometry(0.2, 24, 24);
    cheekGeom.scale(0.8, 0.9, 0.7);
    const leftCheek = new THREE.Mesh(cheekGeom, skinMaterial);
    leftCheek.position.set(-0.24, -0.12, 0.32);
    this.headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeom, skinMaterial);
    rightCheek.position.set(0.24, -0.12, 0.32);
    this.headGroup.add(rightCheek);

    // 2. Anatomical TMJ Lower Jaw Group (Hinges naturally when speaking!)
    this.jawGroup = new THREE.Group();
    this.jawGroup.position.set(0, -0.16, 0.06); // Anatomical TMJ pivot point

    // Sculpted Chin & Mandible
    const chinGeom = new THREE.SphereGeometry(0.26, 32, 24);
    chinGeom.scale(isFemale ? 0.75 : 0.88, 0.7, 0.9);
    const chinMesh = new THREE.Mesh(chinGeom, skinMaterial);
    chinMesh.position.set(0, -0.25, 0.22);
    this.jawGroup.add(chinMesh);

    // Lower Lip
    const lipColor = isFemale ? 0xc46865 : isElderly ? 0xad6560 : 0xba6c68;
    const lipMaterial = new THREE.MeshStandardMaterial({
      color: lipColor,
      roughness: 0.45,
      metalness: 0.05,
    });

    const lowerLipGeom = new THREE.CylinderGeometry(0.024, 0.026, isFemale ? 0.16 : 0.19, 16);
    lowerLipGeom.rotateZ(Math.PI / 2);
    this.lowerLip = new THREE.Mesh(lowerLipGeom, lipMaterial);
    this.lowerLip.position.set(0, -0.12, 0.38);
    this.jawGroup.add(this.lowerLip);

    // Lower Dental Arch (Teeth)
    const teethMaterial = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const lowerTeethGeom = new THREE.BoxGeometry(isFemale ? 0.13 : 0.15, 0.025, 0.04);
    this.teethLower = new THREE.Mesh(lowerTeethGeom, teethMaterial);
    this.teethLower.position.set(0, -0.105, 0.34);
    this.jawGroup.add(this.teethLower);

    this.headGroup.add(this.jawGroup);

    // 3. Upper Mouth Structure (Attached to cranium)
    // Dark Oral Cavity Depth
    const oralCavityGeom = new THREE.BoxGeometry(0.18, 0.12, 0.15);
    const oralCavityMat = new THREE.MeshBasicMaterial({ color: 0x140406 });
    const oralCavity = new THREE.Mesh(oralCavityGeom, oralCavityMat);
    oralCavity.position.set(0, -0.27, 0.28);
    this.headGroup.add(oralCavity);

    // Upper Lip
    const upperLipGeom = new THREE.CylinderGeometry(0.022, 0.024, isFemale ? 0.17 : 0.2, 16);
    upperLipGeom.rotateZ(Math.PI / 2);
    this.upperLip = new THREE.Mesh(upperLipGeom, lipMaterial);
    this.upperLip.position.set(0, -0.24, 0.42);
    this.headGroup.add(this.upperLip);

    // Upper Dental Arch
    const upperTeethGeom = new THREE.BoxGeometry(isFemale ? 0.14 : 0.16, 0.028, 0.04);
    this.teethUpper = new THREE.Mesh(upperTeethGeom, teethMaterial);
    this.teethUpper.position.set(0, -0.22, 0.36);
    this.headGroup.add(this.teethUpper);

    // 4. Sculpted Nose (Smooth Anatomical Bridge & Tip)
    const noseBridgeGeom = new THREE.CylinderGeometry(0.035, 0.055, 0.22, 16);
    const noseBridge = new THREE.Mesh(noseBridgeGeom, skinMaterial);
    noseBridge.position.set(0, -0.05, 0.48);
    noseBridge.rotation.x = 0.24;
    this.headGroup.add(noseBridge);

    const noseTipGeom = new THREE.SphereGeometry(0.05, 16, 16);
    const noseTip = new THREE.Mesh(noseTipGeom, skinMaterial);
    noseTip.position.set(0, -0.15, 0.52);
    this.headGroup.add(noseTip);

    // 5. Lifelike Eyes with Cornea Specular Highlight & Saccades
    this.eyesGroup = new THREE.Group();
    this.eyesGroup.position.set(0, 0.06, 0.4);

    const eyeGeom = new THREE.SphereGeometry(0.082, 24, 24);
    const scleraMaterial = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15 });
    const irisHex = isSouthAsian ? 0x2b1d0c : (isFemale ? 0x3d2716 : 0x1e293b);
    const irisMaterial = new THREE.MeshStandardMaterial({ color: irisHex, roughness: 0.2 });
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const createEye = (xOffset: number) => {
      const eye = new THREE.Group();
      eye.position.set(xOffset, 0, 0);

      // Sclera
      const sclera = new THREE.Mesh(eyeGeom, scleraMaterial);
      eye.add(sclera);

      // Iris
      const irisGeom = new THREE.CircleGeometry(0.046, 20);
      const iris = new THREE.Mesh(irisGeom, irisMaterial);
      iris.position.set(0, 0, 0.078);
      eye.add(iris);

      // Pupil
      const pupilGeom = new THREE.CircleGeometry(0.022, 18);
      const pupil = new THREE.Mesh(pupilGeom, pupilMaterial);
      pupil.position.set(0, 0, 0.08);
      eye.add(pupil);

      // Corneal Life Reflection Sparkle
      const highlightGeom = new THREE.CircleGeometry(0.009, 8);
      const highlight = new THREE.Mesh(highlightGeom, highlightMaterial);
      highlight.position.set(0.015, 0.018, 0.081);
      eye.add(highlight);

      return eye;
    };

    const eyeDistance = isFemale ? 0.175 : 0.205;
    this.leftEye = createEye(-eyeDistance);
    this.rightEye = createEye(eyeDistance);
    this.eyesGroup.add(this.leftEye);
    this.eyesGroup.add(this.rightEye);
    this.headGroup.add(this.eyesGroup);

    // 6. Eyelids (Smooth Bézier Blinking)
    const eyelidGeom = new THREE.SphereGeometry(0.088, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const eyelidMaterial = skinMaterial.clone();
    this.leftUpperEyelid = new THREE.Mesh(eyelidGeom, eyelidMaterial);
    this.leftUpperEyelid.position.set(-eyeDistance, 0.06, 0.4);
    this.leftUpperEyelid.rotation.x = -Math.PI * 0.48; // resting open
    this.headGroup.add(this.leftUpperEyelid);

    this.rightUpperEyelid = new THREE.Mesh(eyelidGeom, eyelidMaterial);
    this.rightUpperEyelid.position.set(eyeDistance, 0.06, 0.4);
    this.rightUpperEyelid.rotation.x = -Math.PI * 0.48;
    this.headGroup.add(this.rightUpperEyelid);

    // 7. Expressive Eyebrows
    const browHex = isElderly ? 0x9ca3af : isFemale ? 0x27272a : 0x18181b;
    const browMaterial = new THREE.MeshStandardMaterial({ color: browHex, roughness: 0.9 });
    const browGeom = new THREE.CylinderGeometry(0.015, 0.02, 0.17, 12);
    browGeom.rotateZ(Math.PI / 2);

    this.leftBrow = new THREE.Mesh(browGeom, browMaterial);
    this.leftBrow.position.set(-eyeDistance, 0.18, 0.44);
    this.leftBrow.rotation.z = 0.06;
    this.headGroup.add(this.leftBrow);

    this.rightBrow = new THREE.Mesh(browGeom, browMaterial);
    this.rightBrow.position.set(eyeDistance, 0.18, 0.44);
    this.rightBrow.rotation.z = -0.06;
    this.headGroup.add(this.rightBrow);

    // 8. Hair Volume & Styling
    const hairColor = isElderly ? 0xd1d5db : isFemale ? 0x1f1f23 : 0x18181b;
    const hairMaterial = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.85 });

    if (isFemale) {
      // Female voluminous hairstyle
      const hairGeom = new THREE.SphereGeometry(0.55, 32, 32);
      hairGeom.scale(0.96, 1.05, 1.08);
      const hairMesh = new THREE.Mesh(hairGeom, hairMaterial);
      hairMesh.position.set(0, 0.15, -0.05);
      this.headGroup.add(hairMesh);

      // Side hair tresses
      const sideHairGeom = new THREE.CylinderGeometry(0.12, 0.08, 0.5, 16);
      const leftSideHair = new THREE.Mesh(sideHairGeom, hairMaterial);
      leftSideHair.position.set(-0.38, -0.15, 0.08);
      this.headGroup.add(leftSideHair);

      const rightSideHair = new THREE.Mesh(sideHairGeom, hairMaterial);
      rightSideHair.position.set(0.38, -0.15, 0.08);
      this.headGroup.add(rightSideHair);
    } else {
      // Male styled hair
      const hairGeom = new THREE.SphereGeometry(0.53, 32, 24);
      hairGeom.scale(0.94, 0.92, 1.02);
      const hairMesh = new THREE.Mesh(hairGeom, hairMaterial);
      hairMesh.position.set(0, 0.18, -0.05);
      this.headGroup.add(hairMesh);

      // Male sideburns
      const sideburnGeom = new THREE.BoxGeometry(0.04, 0.14, 0.08);
      const leftSb = new THREE.Mesh(sideburnGeom, hairMaterial);
      leftSb.position.set(-0.43, -0.02, 0.06);
      this.headGroup.add(leftSb);

      const rightSb = new THREE.Mesh(sideburnGeom, hairMaterial);
      rightSb.position.set(0.43, -0.02, 0.06);
      this.headGroup.add(rightSb);
    }

    // 9. Neck & Clinical Torso (Medical Gown / Shirt)
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, -0.72, 0);

    // Anatomical Neck
    const neckGeom = new THREE.CylinderGeometry(0.18, 0.23, 0.36, 24);
    const neckMesh = new THREE.Mesh(neckGeom, skinMaterial);
    neckMesh.position.set(0, 0.28, 0.02);
    this.torsoGroup.add(neckMesh);

    // Clinical Hospital / Patient Shirt
    const gownMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f766e, // Clinical teal hospital consultation attire
      roughness: 0.8,
    });
    const torsoGeom = new THREE.CylinderGeometry(0.68, 0.82, 0.72, 28);
    const torsoMesh = new THREE.Mesh(torsoGeom, gownMaterial);
    torsoMesh.position.set(0, -0.15, 0);
    torsoMesh.scale.set(1.22, 1.0, 0.7);
    this.torsoGroup.add(torsoMesh);

    // Collar trim
    const collarGeom = new THREE.TorusGeometry(0.24, 0.025, 12, 24);
    collarGeom.rotateX(Math.PI / 2);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.7 });
    const collarMesh = new THREE.Mesh(collarGeom, collarMat);
    collarMesh.position.set(0, 0.15, 0.08);
    this.torsoGroup.add(collarMesh);

    this.rootGroup.add(this.headGroup);
    this.rootGroup.add(this.torsoGroup);
    this.scene.add(this.rootGroup);
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

  // 60fps Real-Time Micro-Animation Simulation
  private updateSimulation(): void {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // 1. Natural Breathing (Thoracic & Shoulder sinusoidal elevation)
    const breathRate = this.currentEmotion === 'anxious' ? 1.9 : 1.3;
    const breathY = Math.sin(time * breathRate) * 0.014;
    const breathScale = 1.0 + Math.sin(time * breathRate) * 0.008;

    if (this.torsoGroup) {
      this.torsoGroup.position.y = -0.72 + breathY * 0.7;
      this.torsoGroup.scale.set(breathScale, 1.0, breathScale);
    }
    if (this.headGroup) {
      this.headGroup.position.y = 0.15 + breathY;
    }

    // 2. Attentive Listening Head Nods & Organic Micro-Movement
    if (this.headGroup) {
      if (this.isListening) {
        this.listeningNodTime -= delta;
        if (this.listeningNodTime <= 0 && !this.isNodding) {
          this.isNodding = true;
          this.nodProgress = 0;
        }

        if (this.isNodding) {
          this.nodProgress += delta * 2.8;
          if (this.nodProgress >= 1.0) {
            this.isNodding = false;
            this.nodProgress = 0;
            this.listeningNodTime = 3.0 + Math.random() * 3.5;
          }
        }

        const nodOffset = this.isNodding ? Math.sin(this.nodProgress * Math.PI) * 0.05 : 0;
        this.targetHeadRotation.set(0.04 + nodOffset, Math.sin(time * 0.7) * 0.02, 0.015);
      } else if (this.isSpeaking) {
        // Natural speech emphasis head movement
        const cadence = Math.sin(time * 4.5) * (0.02 + this.visemes.jawOpen * 0.03);
        const sway = Math.cos(time * 2.3) * 0.025;
        this.targetHeadRotation.set(cadence, sway, 0.01);
      } else {
        // Resting natural physiological drift
        this.targetHeadRotation.set(Math.sin(time * 0.5) * 0.015, Math.cos(time * 0.4) * 0.02, 0);
      }

      this.headGroup.rotation.x += (this.targetHeadRotation.x - this.headGroup.rotation.x) * 0.1;
      this.headGroup.rotation.y += (this.targetHeadRotation.y - this.headGroup.rotation.y) * 0.1;
      this.headGroup.rotation.z += (this.targetHeadRotation.z - this.headGroup.rotation.z) * 0.1;
    }

    // 3. Eye Gaze & Micro-Saccades (Human Eye Contact Model)
    if (time > this.nextSaccadeTime) {
      this.nextSaccadeTime = time + 2.5 + Math.random() * 3.5;
      if (this.currentState === 'thinking') {
        // Thinking glance upward/left
        this.eyeGazeTarget.set(-0.04, 0.035);
      } else if (this.currentState === 'listening') {
        // Attentive direct eye contact
        this.eyeGazeTarget.set((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.015);
      } else {
        this.eyeGazeTarget.set((Math.random() - 0.5) * 0.035, (Math.random() - 0.5) * 0.025);
      }
    }
    this.currentEyeGaze.lerp(this.eyeGazeTarget, 0.14);
    if (this.leftEye && this.rightEye) {
      this.leftEye.rotation.y = this.currentEyeGaze.x;
      this.leftEye.rotation.x = -this.currentEyeGaze.y;
      this.rightEye.rotation.y = this.currentEyeGaze.x;
      this.rightEye.rotation.x = -this.currentEyeGaze.y;
    }

    // 4. Natural Blinking (Smooth Bézier Curve)
    if (!this.isBlinking && time > this.nextBlinkTime) {
      this.isBlinking = true;
      this.blinkProgress = 0;
      this.isDoubleBlink = this.currentEmotion === 'anxious' && Math.random() < 0.3;
      this.nextBlinkTime = time + 2.8 + Math.random() * 3.2;
    }

    if (this.isBlinking) {
      this.blinkProgress += delta * 6.5; // ~150ms blink
      let lidAngle = -Math.PI * 0.48; // Open angle

      if (this.blinkProgress < 0.5) {
        const t = this.blinkProgress / 0.5;
        lidAngle = -Math.PI * 0.48 + t * 0.68;
      } else if (this.blinkProgress < 1.0) {
        const t = (this.blinkProgress - 0.5) / 0.5;
        lidAngle = -Math.PI * 0.48 + (1 - t) * 0.68;
      } else {
        if (this.isDoubleBlink) {
          this.isDoubleBlink = false;
          this.blinkProgress = 0;
        } else {
          this.isBlinking = false;
        }
      }

      if (this.leftUpperEyelid && this.rightUpperEyelid) {
        this.leftUpperEyelid.rotation.x = lidAngle;
        this.rightUpperEyelid.rotation.x = lidAngle;
      }
    }

    // 5. Real-Time Audio Driven Lip Sync & Anatomical TMJ Hinge
    this.updateLipSync();

    // 6. Emotional Brow & Expression Morphing
    this.updateExpressions();
  }

  // Real-time Audio Driven Speech & TMJ Jaw Hinging
  private updateLipSync(): void {
    if (!this.jawGroup || !this.upperLip) return;

    if (this.isSpeaking && this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < 32; i++) {
        sum += dataArray[i];
      }
      const avg = sum / 32;
      const energy = Math.min(avg / 120, 1.0);

      this.visemes.jawOpen += (energy - this.visemes.jawOpen) * 0.4;
      this.visemes.mouthWide = (dataArray[20] / 255) * 0.3;
    } else if (!this.isSpeaking) {
      this.visemes.jawOpen += (0 - this.visemes.jawOpen) * 0.25;
      this.visemes.mouthWide = 0;
    }

    // Anatomical TMJ Lower Jaw Rotation: hinges down on speech syllables!
    const jawAngle = -this.visemes.jawOpen * 0.24;
    this.jawGroup.rotation.x = jawAngle;

    // Upper lip subtle reactive rise
    if (this.upperLip) {
      this.upperLip.position.y = -0.24 + this.visemes.jawOpen * 0.015;
    }
  }

  // Emotional Facial Expression (Pain, Anxiety, Concern, Calm)
  private updateExpressions(): void {
    if (!this.leftBrow || !this.rightBrow) return;

    let targetBrowY = 0.18;
    let targetLeftBrowZ = 0.06;
    let targetRightBrowZ = -0.06;

    switch (this.currentEmotion) {
      case 'anxious':
        // Inner brows raised and tilted inwards (apprehensive)
        targetBrowY = 0.195 + this.emotionIntensity * 0.015;
        targetLeftBrowZ = 0.2 * this.emotionIntensity;
        targetRightBrowZ = -0.2 * this.emotionIntensity;
        break;
      case 'concerned':
        // Clinical pain/furrowed brow
        targetBrowY = 0.17 - this.emotionIntensity * 0.012;
        targetLeftBrowZ = 0.14 * this.emotionIntensity;
        targetRightBrowZ = -0.14 * this.emotionIntensity;
        break;
      case 'confused':
        targetBrowY = 0.185;
        targetLeftBrowZ = 0.22 * this.emotionIntensity;
        targetRightBrowZ = 0.02;
        break;
      case 'sad':
        targetBrowY = 0.17;
        targetLeftBrowZ = 0.16 * this.emotionIntensity;
        targetRightBrowZ = -0.16 * this.emotionIntensity;
        break;
      case 'calm':
      case 'relieved':
      case 'neutral':
      default:
        targetBrowY = 0.18;
        targetLeftBrowZ = 0.06;
        targetRightBrowZ = -0.06;
        break;
    }

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
      this.analyser.smoothingTimeConstant = 0.45;

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
      console.warn('[WebGLAvatarProvider] MediaElementSource hook notice, using speech envelope:', err);
      this.startSimulatedAudioVisemes();
    }
  }

  // Synthetic Viseme Cadence when Web Audio is restricted
  private startSimulatedAudioVisemes(): void {
    if (this.synthInterval) clearInterval(this.synthInterval);
    let step = 0;
    this.synthInterval = setInterval(() => {
      if (!this.isSpeaking) {
        clearInterval(this.synthInterval);
        return;
      }
      step++;
      const isPause = step % 6 === 0;
      if (isPause) {
        this.visemes.jawOpen = Math.max(0, this.visemes.jawOpen - 0.3);
      } else {
        this.visemes.jawOpen = 0.25 + Math.random() * 0.6;
      }
    }, 95);
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
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    this.currentState = 'idle';
  }

  setEmotion(emotion: PatientEmotion, intensity: number = 0.45): void {
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
    if (this.camera && this.renderer && width > 0 && height > 0) {
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
