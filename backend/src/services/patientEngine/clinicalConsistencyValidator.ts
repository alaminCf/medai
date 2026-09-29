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
    let containsHiddenDiagnosis = false;
    const hidden = caseContext.hiddenDiagnosis?.toLowerCase();
    if (hidden) {
      // Check for specific diagnostic terms
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
        // Only flag if patient states they themselves have it (not when mentioning family history or father)
        if (text.includes(term) && !studentQuestion.toLowerCase().includes(term)) {
          const isFamilyMention = text.includes('father') || text.includes('mother') || text.includes('family') || text.includes('বাবা') || text.includes('পরিবার');
          if (!isFamilyMention) {
            containsHiddenDiagnosis = true;
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

    // 2. Check if patient speaks like a doctor
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

    // 3. Check for severe factual contradiction with state
    let containsContradiction = false;
    if (text.includes('no pain') && state.disclosedFactIds.includes('chief_complaint') && caseContext.chiefComplaint.toLowerCase().includes('pain')) {
      containsContradiction = true;
      return {
        valid: false,
        reason: 'Patient contradicted established chief complaint of pain',
        containsHiddenDiagnosis: false,
        containsContradiction: true,
        answersQuestion: true,
      };
    }

    return {
      valid: true,
      containsHiddenDiagnosis: false,
      containsContradiction: false,
      answersQuestion: true,
    };
  }
}
