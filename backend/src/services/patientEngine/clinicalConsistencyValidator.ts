import { ConsistencyValidationResult, PatientCaseContext, PatientConversationState } from './types';

export class ClinicalConsistencyValidator {
  /**
   * Validates a proposed patient response against clinical truth and behavioral safety rules.
   */
  public static validate(
    proposedResponse: string,
    caseContext: PatientCaseContext,
    state: PatientConversationState,
    studentQuestion: string
  ): ConsistencyValidationResult {
    const text = proposedResponse.toLowerCase();

    // 1. Check if it leaks hidden diagnosis
    const hidden = caseContext.hiddenDiagnosis?.toLowerCase();
    if (hidden) {
      const dangerousTerms = [
        'nstemi',
        'stemi',
        'acute coronary syndrome',
        'myocardial infarction',
        'appendicitis',
        'cholecystitis',
        'pneumonia',
        'pulmonary embolism',
        'meningitis',
        'dengue fever',
        'heart attack',
      ];

      for (const term of dangerousTerms) {
        if (text.includes(term) && !studentQuestion.toLowerCase().includes(term)) {
          const isFamilyMention = text.includes('father') || text.includes('mother') || text.includes('family') || text.includes('বাবা') || text.includes('পরিবার');
          if (!isFamilyMention) {
            return {
              valid: false,
              reason: `Proposed response accidentally revealed hidden diagnosis: "${term}"`,
              containsHiddenDiagnosis: true,
              containsContradiction: false,
              answersQuestion: true,
            };
          }
        }
      }
    }

    // 2. Check if patient speaks like a textbook doctor
    const doctorTerms = [
      'differential diagnosis',
      'prognosis',
      'pathophysiology',
      'ecg changes',
      'troponin levels',
      'auscultation',
      'my ejection fraction',
      'according to guidelines',
    ];
    for (const d of doctorTerms) {
      if (text.includes(d)) {
        return {
          valid: false,
          reason: `Patient is using unrealistic doctor/textbook terminology: "${d}"`,
          containsHiddenDiagnosis: false,
          containsContradiction: false,
          answersQuestion: false,
        };
      }
    }

    // 3. Check for severe factual contradiction with state facts
    // Example: If student asked age, response must not contradict patientAge
    const age = caseContext.patientAge;
    if (state.currentIntents.includes('AGE')) {
      const bnDigits = (n: number) => n.toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);
      const hasCorrectAge = text.includes(age.toString()) || text.includes(bnDigits(age));
      if (!hasCorrectAge) {
        return {
          valid: false,
          reason: `Patient response does not contain correct age (${age})`,
          containsHiddenDiagnosis: false,
          containsContradiction: true,
          answersQuestion: false,
        };
      }
    }

    return {
      valid: true,
      containsHiddenDiagnosis: false,
      containsContradiction: false,
      answersQuestion: true,
    };
  }
}
