// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 2: Audio & Avatar Event Architecture
// ────────────────────────────────────────────────────────────────────────────

import { PatientEmotion } from '../types';
import { AvatarStateEvent } from '../types/character';

export interface AvatarEventPayloads {
  patientListeningStarted: { timestamp: number };
  patientThinkingStarted: { timestamp: number };
  patientResponseGenerated: { text: string; emotion: PatientEmotion; timestamp: number };
  patientAudioStarted: { audioElement?: HTMLAudioElement | null; duration?: number; timestamp: number };
  patientSpeaking: { text: string; visemeWeight: number; timestamp: number };
  patientAudioFinished: { timestamp: number };
  patientEmotionChanged: { emotion: PatientEmotion; intensity: number; reason?: string; timestamp: number };
  patientInterrupted: { reason?: string; interruptedAtTime?: number; timestamp: number };
  patientPaused: { timestamp: number };
}

type EventCallback<K extends AvatarStateEvent> = (payload: AvatarEventPayloads[K]) => void;

class AvatarEventBus {
  private listeners: { [K in AvatarStateEvent]?: Set<EventCallback<K>> } = {};

  /**
   * Subscribe to an avatar lifecycle event.
   */
  public on<K extends AvatarStateEvent>(event: K, callback: EventCallback<K>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as any;
    }
    (this.listeners[event] as Set<EventCallback<K>>).add(callback);

    // Return unsubscribe function
    return () => {
      (this.listeners[event] as Set<EventCallback<K>>)?.delete(callback);
    };
  }

  /**
   * Dispatch an avatar lifecycle event.
   */
  public emit<K extends AvatarStateEvent>(event: K, payload: AvatarEventPayloads[K]): void {
    const handlers = this.listeners[event];
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          (fn as EventCallback<K>)(payload);
        } catch (err) {
          console.error(`[AvatarEventBus] Error in handler for ${event}:`, err);
        }
      });
    }
  }

  /**
   * Dispatches clinical doctor interruption:
   * Immediately halts current audio playback, stops mouth movement,
   * purges ongoing utterance, and transitions avatar to attentive LISTENING state.
   */
  public interruptPatient(activeAudio?: HTMLAudioElement | null): void {
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch (e) {
        // ignore audio pause glitches
      }
    }

    this.emit('patientInterrupted', {
      reason: 'Doctor started speaking / user interrupted',
      interruptedAtTime: activeAudio?.currentTime || 0,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all active listeners (cleanup).
   */
  public clear(): void {
    this.listeners = {};
  }
}

export const avatarEventBus = new AvatarEventBus();
export default avatarEventBus;
