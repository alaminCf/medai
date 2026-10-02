// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 2: Realistic Human Patient Character System Types
// ────────────────────────────────────────────────────────────────────────────

import { PatientEmotion, PatientPersonality } from './index';

export type CharacterSex = 'female' | 'male';

export interface CharacterVoiceConfig {
  pitch: number;
  rate: number;
  lang: string;
  gender: CharacterSex;
  voiceName?: string;
  nativeVoiceName?: string;
  preferredVoices?: string[];
}

export type AvatarProviderType = 'realistic-human' | 'webgl-3d' | 'static-image';

export interface PatientCharacter {
  characterId: string;
  name: string;
  nameBn: string;
  age: number;
  sex: CharacterSex;
  appearance: string;
  appearanceBn: string;
  ethnicity: string;
  clothing: string;
  clothingBn: string;
  voice: CharacterVoiceConfig;
  personality: PatientPersonality;
  defaultEmotion: PatientEmotion;
  avatarProvider: AvatarProviderType;
  avatarAsset: string;
  thumbnail: string;
  languageSupport: ('bn' | 'en' | 'banglish')[];
  clinicalBio: string;
  recommendedCases: string[];
}

export type AvatarStateEvent =
  | 'patientListeningStarted'
  | 'patientThinkingStarted'
  | 'patientResponseGenerated'
  | 'patientAudioStarted'
  | 'patientSpeaking'
  | 'patientAudioFinished'
  | 'patientEmotionChanged'
  | 'patientInterrupted'
  | 'patientPaused';

