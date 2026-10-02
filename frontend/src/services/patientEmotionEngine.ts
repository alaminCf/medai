// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 2: Patient Emotion Engine
// ────────────────────────────────────────────────────────────────────────────

import { PatientEmotion, PatientPersonality, PatientCase } from '../types';

export interface EmotionAnalysisResult {
  emotion: PatientEmotion;
  intensity: number;
  reason: string;
}

export class PatientEmotionEngine {
  /**
   * Evaluates patient emotional state grounded in personality, clinical case severity,
   * question intent, reassuring vs distressing cues, and conversation progression.
   */
  public static evaluateEmotion(
    doctorMessage: string,
    currentEmotion: PatientEmotion,
    personality: PatientPersonality,
    patientCase?: Partial<PatientCase>,
    turnCount: number = 0
  ): EmotionAnalysisResult {
    const raw = (doctorMessage || '').toLowerCase();
    const complaint = (patientCase?.chiefComplaint || '').toLowerCase();
    const isSevereCase = complaint.includes('dengue') || complaint.includes('chest') || complaint.includes('nstemi') || complaint.includes('appendicitis');

    // 1. Doctor Reassurance & Empathy (Relief Trigger)
    const isReassurance =
      raw.includes('চিন্তা') ||
      raw.includes('চিন্তার কিছু নেই') ||
      raw.includes('ভয় পাবেন না') ||
      raw.includes('ঠিক হয়ে যাবে') ||
      raw.includes('আমরা দেখছি') ||
      raw.includes('আরাম পাবেন') ||
      raw.includes('don\'t worry') ||
      raw.includes('we will take care') ||
      raw.includes('help you') ||
      raw.includes('calm down');

    if (isReassurance) {
      if (personality === 'calm' || personality === 'quiet') {
        return {
          emotion: 'relieved',
          intensity: 0.65,
          reason: 'Doctor offered reassuring bedside communication',
        };
      }
      return {
        emotion: 'relieved',
        intensity: 0.5,
        reason: 'Patient felt comforted by medical assurance',
      };
    }

    // 2. Severe Pain / Alarm / Invasiveness Probing (Concern & Anxiety)
    const isPainProbing =
      raw.includes('কতটা তীব্র') ||
      raw.includes('বেশি ব্যথা') ||
      raw.includes('অসহ্য') ||
      raw.includes('১০ এর মধ্যে') ||
      raw.includes('হাত পা') ||
      raw.includes('বমি') ||
      raw.includes('রক্ত') ||
      raw.includes('ঘাড় শক্ত') ||
      raw.includes('অজ্ঞান') ||
      raw.includes('severe') ||
      raw.includes('rate the pain') ||
      raw.includes('vomit') ||
      raw.includes('blood') ||
      raw.includes('fainted');

    if (isPainProbing) {
      if (personality === 'anxious' || isSevereCase) {
        return {
          emotion: 'anxious',
          intensity: 0.75,
          reason: 'Doctor enquired about intense or alarming symptoms',
        };
      }
      return {
        emotion: 'concerned',
        intensity: 0.65,
        reason: 'Discussing painful physical symptoms',
      };
    }

    // 3. Complex Medical Jargon or Cryptic Questions (Confusion Trigger)
    const isConfusingJargon =
      raw.includes('pathophysiology') ||
      raw.includes('differential') ||
      raw.includes('auscultation') ||
      raw.includes('crepitations') ||
      raw.includes('murmur') ||
      raw.includes('st segment') ||
      raw.includes('troponin') ||
      raw.includes('platelet count');

    if (isConfusingJargon) {
      return {
        emotion: 'confused',
        intensity: 0.7,
        reason: 'Doctor used inaccessible medical textbook terminology',
      };
    }

    // 4. Rapport Building & Introduction
    const isIntro =
      raw.includes('সালাম') ||
      raw.includes('নমস্কার') ||
      raw.includes('কেমন আছেন') ||
      raw.includes('hello') ||
      raw.includes('hi') ||
      turnCount <= 1;

    if (isIntro) {
      if (personality === 'anxious') {
        return { emotion: 'anxious', intensity: 0.5, reason: 'Initial visit anxiety' };
      }
      if (isSevereCase) {
        return { emotion: 'concerned', intensity: 0.55, reason: 'Patient feeling unwell at consultation start' };
      }
      return { emotion: 'neutral', intensity: 0.3, reason: 'Consultation opening' };
    }

    // 5. Stable Emotional Maintenance (Never randomly mutate emotion)
    // Blend with base personality default
    let defaultBase: PatientEmotion = 'concerned';
    if (personality === 'calm') defaultBase = 'calm';
    if (personality === 'anxious') defaultBase = 'anxious';
    if (personality === 'quiet') defaultBase = 'concerned';

    // If current emotion is already meaningful, retain with gentle dampening
    if (currentEmotion && currentEmotion !== 'neutral') {
      return {
        emotion: currentEmotion,
        intensity: 0.45,
        reason: 'Continuing established clinical emotional state',
      };
    }

    return {
      emotion: defaultBase,
      intensity: 0.4,
      reason: 'Grounded in patient baseline personality',
    };
  }
}

export default PatientEmotionEngine;
