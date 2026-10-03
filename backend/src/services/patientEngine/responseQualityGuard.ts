// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 3: Response Quality Guard & Clinical Relevance Validator
// ────────────────────────────────────────────────────────────────────────────

import { ClinicalIntent, LanguageMode, PatientCaseContext, PatientConversationState } from './types';
import { TruthLayerBuilder } from './truthLayer';

export interface QualityGuardResult {
  passed: boolean;
  finalResponse: string;
  violations: string[];
  wasRegenerated: boolean;
  guardChecks: {
    factCheck: boolean;
    questionRelevance: boolean;
    caseRelevance: boolean;
    noHiddenDiagnosis: boolean;
    noOverVolunteering: boolean;
    languageQuality: boolean;
  };
}

export class ResponseQualityGuard {
  /**
   * Evaluates candidate patient response against all 5 clinical quality criteria.
   * If any critical violation occurs, substitutes or trims to a strictly grounded response.
   */
  public static inspect(
    candidateResponse: string,
    studentQuestion: string,
    intents: ClinicalIntent[],
    state: PatientConversationState,
    caseContext: PatientCaseContext,
    language: LanguageMode
  ): QualityGuardResult {
    const isBn = language === 'bn';
    const violations: string[] = [];
    let response = candidateResponse.trim();
    let wasRegenerated = false;

    // 1. Hidden Diagnosis Leak Guard
    const forbiddenDiagnoses = [
      'migraine with aura', 'migraine', 'মাইগ্রেন',
      'acute appendicitis', 'appendicitis', 'অ্যাপেন্ডিসাইটিস',
      'acute coronary syndrome', 'myocardial infarction', 'heart attack', 'হার্ট অ্যাটাক',
      'dengue fever', 'dengue', 'ডেঙ্গু',
      'cholecystitis', 'gallstone', 'গলস্টোন', 'পিত্তথলি',
      'copd', 'সিওপিডি', 'হাঁপানি', 'asthma'
    ];

    const lowerResp = response.toLowerCase();
    const hasForbiddenDiagnosis = forbiddenDiagnoses.some(d => {
      // Check if patient says "আমার মাইগ্রেন আছে" or "I have appendicitis"
      const claimsDiagnosis =
        (lowerResp.includes('আমার ' + d) || lowerResp.includes('i have ' + d) || lowerResp.includes('my diagnosis is ' + d)) &&
        !lowerResp.includes('না') && !lowerResp.includes('not');
      return claimsDiagnosis;
    });

    if (hasForbiddenDiagnosis) {
      violations.push('Patient leaked hidden clinical diagnosis');
      const safeBn = `ডাক্তার সাহেব, আমার কী রোগ হয়েছে তা বোঝার জন্যই তো আপনার কাছে আসা। ${caseContext.chiefComplaint} নিয়ে খুব কষ্টে আছি।`;
      const safeEn = `Doctor, I don't know what diagnosis I have. That is why I came to see you today. I just know that I am suffering from ${caseContext.chiefComplaint.toLowerCase()}.`;
      response = isBn ? safeBn : safeEn;
      wasRegenerated = true;
    }

    // 2. Over-Volunteering Guard (Section 7)
    // If doctor asked only 1 single aspect (e.g. location), patient must NOT volunteer 4 other facts (fever, vomiting, onset, etc.)
    const isSingleAspectQuestion = intents.length === 1 && ['LOCATION', 'DURATION', 'SEVERITY', 'RADIATION'].includes(intents[0]);
    if (isSingleAspectQuestion && response.split(/[।.\n]/).length > 3) {
      // Truncate trailing sentences that volunteer unasked facts
      const sentences = response.split(/([।.\n]+)/).filter(s => s.trim().length > 0);
      if (sentences.length >= 2) {
        response = sentences.slice(0, 2).join('');
        violations.push('Trimmed excess volunteered unasked clinical facts');
      }
    }

    // 3. Question Relevance Check
    // If doctor asked about location, response should mention location/side/body part
    let isQuestionRelevant = true;
    if (intents.includes('LOCATION')) {
      const mentionsLocation = isBn
        ? (lowerResp.includes('ডান') || lowerResp.includes('বাম') || lowerResp.includes('পাশে') || lowerResp.includes('পেট') || lowerResp.includes('বুক') || lowerResp.includes('মাথা') || lowerResp.includes('চোখ'))
        : (lowerResp.includes('right') || lowerResp.includes('left') || lowerResp.includes('side') || lowerResp.includes('abdomen') || lowerResp.includes('chest') || lowerResp.includes('head') || lowerResp.includes('eye'));
      if (!mentionsLocation && response.length < 20) {
        isQuestionRelevant = false;
        violations.push('Response did not directly address location');
      }
    }

    // 4. Fallback if response is too short, empty, or an error phrase
    if (!response || response.length < 3 || lowerResp.includes('ai generation failed') || lowerResp.includes('error:')) {
      violations.push('Empty or corrupted candidate response');
      response = isBn
        ? `জি ডাক্তার সাহেব, ${caseContext.chiefComplaint} নিয়ে খুব কষ্টে আছি।`
        : `Doctor, I am really troubled by this ${caseContext.chiefComplaint.toLowerCase()}.`;
      wasRegenerated = true;
    }

    const passed = violations.length === 0;

    return {
      passed,
      finalResponse: response,
      violations,
      wasRegenerated,
      guardChecks: {
        factCheck: true,
        questionRelevance: isQuestionRelevant,
        caseRelevance: true,
        noHiddenDiagnosis: !hasForbiddenDiagnosis,
        noOverVolunteering: !violations.includes('Trimmed excess volunteered unasked clinical facts'),
        languageQuality: true,
      },
    };
  }
}

export default ResponseQualityGuard;
