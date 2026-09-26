import { ConsultationLanguage, PatientVoiceEvents } from '../types';
import api from './api';

export interface PlayVoiceOptions {
  sessionId?: string;
  language: ConsultationLanguage;
  voiceId?: string;
  voiceGender?: string;
  speed?: number;
  useBackendTTS?: boolean;
  events?: PatientVoiceEvents;
}

export class TextToSpeechService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking = false;
  private isMutedState = false;
  private lastPlayedText = '';
  private lastOptions: PlayVoiceOptions | null = null;

  constructor() {
    // Warm up speech synthesis voices on browsers that load them asynchronously
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }

  getCurrentAudio(): HTMLAudioElement | null {
    return this.currentAudio;
  }

  getCurrentUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }

  isMuted(): boolean {
    return this.isMutedState;
  }

  setMuted(muted: boolean): void {
    this.isMutedState = muted;
    if (muted) {
      this.stop();
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.isMutedState);
    return this.isMutedState;
  }

  // Stop any active audio immediately (Interruption safe — prevents overlapping audio)
  stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch (e) {
        console.warn('Error stopping HTML audio:', e);
      }
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('Error stopping speech synthesis:', e);
      }
      this.currentUtterance = null;
    }

    const wasSpeaking = this.isSpeaking;
    this.isSpeaking = false;

    if (wasSpeaking && this.lastOptions?.events?.onAudioFinished) {
      this.lastOptions.events.onAudioFinished();
    }
  }

  async play(text: string, options: PlayVoiceOptions): Promise<void> {
    if (!text || text.trim() === '' || this.isMutedState) {
      return;
    }

    // Stop previous audio to strictly avoid overlapping streams
    this.stop();

    this.lastPlayedText = text;
    this.lastOptions = options;
    this.isSpeaking = true;

    options.events?.onResponseStarted?.();

    // Strategy 1: Try backend high-fidelity TTS if session & backend TTS is available
    if (options.sessionId && options.useBackendTTS) {
      try {
        const response = await api.post(
          `/sessions/${options.sessionId}/voice/tts`,
          {
            text,
            voice: options.voiceId,
            speed: options.speed,
          },
          {
            responseType: 'blob',
          }
        );

        if (response.status === 200 && response.data && response.data.size > 0) {
          const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);

          options.events?.onAudioReady?.(audioUrl);

          await this.playHtmlAudio(audioUrl, options);
          return;
        }
      } catch (err) {
        console.warn('[TextToSpeechService] Backend TTS failed or unavailable, falling back to browser synthesis:', err);
      }
    }

    // Strategy 2: Browser native SpeechSynthesis fallback (natural, zero-latency, works for English and Bangla)
    this.playBrowserSynthesis(text, options);
  }

  private playHtmlAudio(audioUrl: string, options: PlayVoiceOptions): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      audio.onplay = () => {
        this.isSpeaking = true;
        options.events?.onAudioPlaying?.();
      };

      audio.onended = () => {
        this.isSpeaking = false;
        this.currentAudio = null;
        URL.revokeObjectURL(audioUrl);
        options.events?.onAudioFinished?.();
        resolve();
      };

      audio.onerror = () => {
        console.warn('HTML Audio playback failed, falling back to browser synthesis');
        this.currentAudio = null;
        URL.revokeObjectURL(audioUrl);
        this.playBrowserSynthesis(this.lastPlayedText, options);
        resolve();
      };

      audio.play().catch((err) => {
        console.warn('Autoplay prevented or failed:', err);
        this.playBrowserSynthesis(this.lastPlayedText, options);
        resolve();
      });
    });
  }

  private playBrowserSynthesis(text: string, options: PlayVoiceOptions): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeaking = false;
      options.events?.onAudioFinished?.();
      return;
    }

    // Cancel existing
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    const isBangla = options.language === 'bn';
    utterance.lang = isBangla ? 'bn-BD' : 'en-US';
    utterance.rate = options.speed || 1.0;
    utterance.pitch = options.voiceGender === 'female' ? 1.15 : 0.95;

    // Voice selection matching
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      if (isBangla) {
        const banglaVoice = voices.find(
          (v) => v.lang.startsWith('bn') || v.name.toLowerCase().includes('bangla') || v.name.toLowerCase().includes('bengali')
        );
        if (banglaVoice) {
          utterance.voice = banglaVoice;
        }
      } else {
        const matchingGenderVoice = voices.find((v) => {
          if (!v.lang.startsWith('en')) return false;
          const name = v.name.toLowerCase();
          if (options.voiceGender === 'female') {
            return name.includes('female') || name.includes('samantha') || name.includes('zira') || name.includes('victoria');
          } else {
            return name.includes('male') || name.includes('david') || name.includes('george') || name.includes('alex');
          }
        });

        if (matchingGenderVoice) {
          utterance.voice = matchingGenderVoice;
        } else {
          const defaultEnVoice = voices.find((v) => v.lang.startsWith('en'));
          if (defaultEnVoice) utterance.voice = defaultEnVoice;
        }
      }
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      options.events?.onAudioPlaying?.();
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      options.events?.onAudioFinished?.();
    };

    utterance.onerror = (event) => {
      console.warn('Speech synthesis error:', event);
      this.isSpeaking = false;
      this.currentUtterance = null;
      options.events?.onAudioFinished?.();
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Failed to speak with SpeechSynthesis:', e);
      this.isSpeaking = false;
      options.events?.onAudioFinished?.();
    }
  }

  // Replay last played patient response
  replay(): void {
    if (this.lastPlayedText && this.lastOptions) {
      this.play(this.lastPlayedText, this.lastOptions);
    }
  }
}

export const textToSpeechService = new TextToSpeechService();
export default textToSpeechService;
