import { ClinicalFact, ClinicalIntent, PatientConversationState } from './types';

export class PatientFactRetrievalService {
  /**
   * Maps detected clinical intents directly to authoritative fact keys.
   * Returns ONLY the relevant facts for the doctor's exact question.
   */
  public static resolveFactKeysForIntents(intents: ClinicalIntent[]): string[] {
    const keys: string[] = [];

    for (const intent of intents) {
      switch (intent) {
        // Demographics
        case 'AGE':
          keys.push('age');
          break;
        case 'NAME':
          keys.push('name');
          break;
        case 'SEX':
          keys.push('gender');
          break;
        case 'OCCUPATION':
        case 'OCCUPATIONAL_HISTORY':
          keys.push('occupation');
          break;
        case 'MARITAL_STATUS':
          keys.push('marital_status');
          break;

        // SOCRATES
        case 'CHIEF_COMPLAINT':
          keys.push('chief_complaint');
          break;
        case 'DURATION':
          keys.push('duration');
          break;
        case 'ONSET':
          keys.push('onset');
          break;
        case 'LOCATION':
          keys.push('location');
          break;
        case 'CHARACTER':
          keys.push('character');
          break;
        case 'SEVERITY':
          keys.push('severity');
          break;
        case 'RADIATION':
          keys.push('radiation');
          break;
        case 'AGGRAVATING_FACTORS':
          keys.push('aggravating_factors');
          break;
        case 'RELIEVING_FACTORS':
          keys.push('relieving_factors');
          break;
        case 'TIMING':
        case 'FREQUENCY':
          keys.push('timing');
          break;
        case 'PROGRESSION':
          keys.push('progression');
          break;

        // Associated Symptoms & Review of Systems
        case 'ASSOCIATED_SYMPTOMS':
          keys.push('associated_symptoms');
          break;
        case 'FEVER':
          keys.push('fever');
          break;
        case 'NAUSEA':
          keys.push('nausea');
          break;
        case 'VOMITING':
          keys.push('vomiting');
          break;
        case 'BOWEL_HABITS':
        case 'BOWEL_CHANGE':
          keys.push('bowel_habits');
          break;
        case 'URINARY_SYMPTOMS':
          keys.push('urinary_symptoms');
          break;
        case 'APPETITE':
        case 'WEIGHT_CHANGE':
          keys.push('appetite');
          break;
        case 'COUGH':
          keys.push('cough');
          break;
        case 'BREATHING':
          keys.push('breathing');
          break;
        case 'PALPITATION':
          keys.push('palpitation');
          break;
        case 'SYNCOPE':
          keys.push('syncope');
          break;
        case 'DIZZINESS':
          keys.push('dizziness');
          break;

        // Histories
        case 'PAST_MEDICAL_HISTORY':
          keys.push('past_medical_history');
          break;
        case 'PAST_SURGICAL_HISTORY':
          keys.push('past_surgical_history');
          break;
        case 'MEDICATION':
          keys.push('medication');
          break;
        case 'ALLERGY':
          keys.push('allergy');
          break;
        case 'FAMILY_HISTORY':
          keys.push('family_history');
          break;
        case 'SOCIAL_HISTORY':
        case 'PERSONAL_HISTORY':
          keys.push('social_history');
          break;
        case 'SMOKING':
          keys.push('smoking');
          break;
        case 'ALCOHOL':
          keys.push('alcohol');
          break;
        case 'DIET':
          keys.push('diet');
          break;
        case 'SLEEP':
          keys.push('sleep');
          break;
        case 'PREVIOUS_EPISODES':
          keys.push('previous_episodes');
          break;
        case 'TREATMENT_HISTORY':
          keys.push('treatment_history');
          break;

        // ICE
        case 'PATIENT_CONCERN':
          keys.push('patient_concern');
          break;
        case 'PATIENT_EXPECTATION':
          keys.push('patient_expectation');
          break;
      }
    }

    return Array.from(new Set(keys));
  }

  /**
   * Retrieves matching ClinicalFact objects from state.facts
   */
  public static getFactsForIntents(
    state: PatientConversationState,
    intents: ClinicalIntent[]
  ): ClinicalFact[] {
    const keys = this.resolveFactKeysForIntents(intents);
    const facts: ClinicalFact[] = [];

    for (const k of keys) {
      if (state.facts[k]) {
        facts.push(state.facts[k]);
      }
    }

    return facts;
  }
}
