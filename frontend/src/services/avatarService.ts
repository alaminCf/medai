import { AvatarState, PatientEmotion } from '../types';

export interface AvatarInitOptions {
  avatarId?: string;
  avatarGender?: string;
  avatarAgeGroup?: string;
  patientName?: string;
  personality?: string;
  onStateChange?: (state: AvatarState) => void;
  onError?: (error: string) => void;
}

export interface IAvatarProvider {
  initialize(container: HTMLElement, options: AvatarInitOptions): Promise<void>;
  connect(): Promise<void>;
  disconnect(): void;
  speak(text: string, audioEl?: HTMLAudioElement | null): void;
  stopSpeaking(): void;
  setEmotion(emotion: PatientEmotion, intensity?: number): void;
  setListeningState(): void;
  setThinkingState(): void;
  setIdleState(): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

export class AvatarService {
  private provider: IAvatarProvider | null = null;
  private state: AvatarState = 'idle';
  private currentEmotion: PatientEmotion = 'neutral';
  private emotionIntensity = 0.3;
  private onStateChangeCallback?: (state: AvatarState) => void;
  private onErrorCallback?: (err: string) => void;

  getState(): AvatarState {
    return this.state;
  }

  getEmotion(): { emotion: PatientEmotion; intensity: number } {
    return { emotion: this.currentEmotion, intensity: this.emotionIntensity };
  }

  setProvider(provider: IAvatarProvider): void {
    if (this.provider) {
      this.provider.destroy();
    }
    this.provider = provider;
  }

  async initialize(container: HTMLElement, options: AvatarInitOptions, customProvider?: IAvatarProvider): Promise<void> {
    this.onStateChangeCallback = options.onStateChange;
    this.onErrorCallback = options.onError;

    if (customProvider) {
      this.provider = customProvider;
    }

    if (!this.provider) {
      throw new Error('No Avatar Provider registered');
    }

    try {
      await this.provider.initialize(container, options);
      this.setState('idle');
    } catch (err: any) {
      console.error('[AvatarService] Initialization failed:', err);
      this.setState('error');
      this.onErrorCallback?.(err?.message || 'Failed to initialize patient avatar.');
      throw err;
    }
  }

  async connect(): Promise<void> {
    if (this.provider) {
      await this.provider.connect();
      this.setState('idle');
    }
  }

  disconnect(): void {
    if (this.provider) {
      this.provider.disconnect();
      this.setState('idle');
    }
  }

  speak(text: string, audioEl?: HTMLAudioElement | null): void {
    this.setState('speaking');
    this.provider?.speak(text, audioEl);
  }

  stopSpeaking(): void {
    this.provider?.stopSpeaking();
    this.setState('idle');
  }

  setEmotion(emotion: PatientEmotion, intensity: number = 0.35): void {
    const clampedIntensity = Math.max(0.0, Math.min(1.0, intensity));
    this.currentEmotion = emotion;
    this.emotionIntensity = clampedIntensity;
    this.provider?.setEmotion(emotion, clampedIntensity);
  }

  setListeningState(): void {
    this.setState('listening');
    this.provider?.setListeningState();
  }

  setThinkingState(): void {
    this.setState('thinking');
    this.provider?.setThinkingState();
  }

  setIdleState(): void {
    this.setState('idle');
    this.provider?.setIdleState();
  }

  resize(width: number, height: number): void {
    this.provider?.resize(width, height);
  }

  destroy(): void {
    this.provider?.destroy();
    this.provider = null;
    this.state = 'idle';
  }

  private setState(newState: AvatarState): void {
    this.state = newState;
    this.onStateChangeCallback?.(newState);
  }
}

export const avatarService = new AvatarService();
export default avatarService;
