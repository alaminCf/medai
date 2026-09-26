import { ConsultationLanguage } from '../types';
import api from './api';

// Web Speech API interfaces
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: { new (): ISpeechRecognition };
    webkitSpeechRecognition?: { new (): ISpeechRecognition };
  }
}

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (friendlyError: string, rawError?: string) => void;
  onEnd?: () => void;
}

export class SpeechRecognitionService {
  private recognition: ISpeechRecognition | null = null;
  private isListening = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;

  constructor() {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
    }
  }

  isBrowserSpeechSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  async checkMicrophonePermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  startListening(language: ConsultationLanguage, callbacks: SpeechRecognitionCallbacks): void {
    if (this.isListening) {
      this.stopListening();
    }

    if (!this.recognition) {
      callbacks.onError?.(
        'Your browser does not support native speech recognition. You can continue using text mode.',
        'SPEECH_NOT_SUPPORTED'
      );
      return;
    }

    this.recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      if (interimTranscript && callbacks.onInterimResult) {
        callbacks.onInterimResult(interimTranscript);
      }

      if (finalTranscript && callbacks.onFinalResult) {
        callbacks.onFinalResult(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let friendlyMessage = 'We could not recognize speech. Please try again.';

      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          friendlyMessage = 'Microphone permission was denied. Please allow microphone access in your browser.';
          break;
        case 'no-speech':
          friendlyMessage = 'No speech detected. Tap the microphone and speak again.';
          break;
        case 'network':
          friendlyMessage = 'Network connection issue during speech recognition. Please check your connection.';
          break;
        case 'audio-capture':
          friendlyMessage = 'No microphone was found. Please ensure a microphone is connected.';
          break;
        default:
          friendlyMessage = `Speech recognition error (${event.error}). You can try again or use text mode.`;
      }

      this.isListening = false;
      callbacks.onError?.(friendlyMessage, event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.warn('Recognition start failed:', err);
      this.isListening = false;
      callbacks.onError?.('Could not start microphone. Please try again.', 'START_FAILED');
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }
      this.isListening = false;
    }
  }

  abortListening(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        console.warn('Error aborting recognition:', e);
      }
      this.isListening = false;
    }
  }

  // Fallback Audio Recording via MediaRecorder (for backend Whisper transcription)
  async startRecordingAudio(): Promise<boolean> {
    try {
      this.audioChunks = [];
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.mediaStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      return true;
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      return false;
    }
  }

  async stopRecordingAndTranscribe(sessionId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Recorder not initialized'));
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
          if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
          }

          const formData = new FormData();
          formData.append('audio', audioBlob, 'speech.webm');

          const response = await api.post(`/sessions/${sessionId}/voice/transcribe`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          resolve(response.data.transcription || '');
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }
}

export const speechRecognitionService = new SpeechRecognitionService();
export default speechRecognitionService;
