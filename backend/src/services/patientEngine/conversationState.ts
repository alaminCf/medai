import {
  ClinicalFact,
  ClinicalIntent,
  ConversationTurn,
  LanguageMode,
  PatientCaseContext,
  PatientConversationState,
  PatientEmotion,
  PatientPersonality,
} from './types';
import { StructuredClinicalFactExtractor } from './factExtractor';

// In-memory active session cache
const stateCache = new Map<string, PatientConversationState>();

export class PatientConversationStateManager {
  /**
   * Retrieves or initializes a PatientConversationState for a session.
   * Can rehydrate historical facts from DB conversation messages.
   */
  public static getOrInitState(
    sessionId: string,
    caseContext: PatientCaseContext,
    dbHistory: ConversationTurn[] = []
  ): PatientConversationState {
    const existing = stateCache.get(sessionId);
    if (existing) {
      return existing;
    }

    // Initialize fresh facts from case profile
    const facts = StructuredClinicalFactExtractor.extractFacts(caseContext);

    // Rehydrate facts from dbHistory if this is a resumed consultation
    const disclosedFactIds: string[] = [];
    const previousQuestions: string[] = [];
    const previousAnswers: string[] = [];

    for (const turn of dbHistory) {
      if (turn.role === 'student') {
        previousQuestions.push(turn.content);
      } else if (turn.role === 'patient') {
        previousAnswers.push(turn.content);
      }
    }

    const personality = (caseContext.personality || 'calm') as PatientPersonality;
    const language: LanguageMode = caseContext.language === 'bn' ? 'bn' : 'en';

    let emotionalState: PatientEmotion = 'neutral';
    if (personality === 'anxious') emotionalState = 'anxious';
    if (personality === 'calm') emotionalState = 'calm';
    if (personality === 'confused') emotionalState = 'confused';

    const newState: PatientConversationState = {
      sessionId,
      caseId: caseContext.id || 'default_case',
      patientName: caseContext.patientName,
      patientAge: caseContext.patientAge,
      patientGender: caseContext.patientGender,
      personality,
      language,
      emotionalState,
      emotionIntensity: 0.35,
      conversationTurn: previousQuestions.length,
      consultationStage: previousQuestions.length === 0 ? 'opening' : 'symptom_exploration',
      currentTopic: caseContext.chiefComplaint,
      currentSymptom: caseContext.chiefComplaint,
      currentIntents: [],
      previousQuestions,
      previousAnswers,
      conversationHistory: dbHistory,
      discussedTopics: [caseContext.chiefComplaint],
      facts,
      disclosedFactIds,
      misunderstoodQuestions: [],
      clarificationRequests: [],
      redFlagsDisclosed: [],
    };

    stateCache.set(sessionId, newState);
    return newState;
  }

  /**
   * Updates state after a conversation turn has completed.
   */
  public static updateStateAfterTurn(
    state: PatientConversationState,
    intents: ClinicalIntent[],
    disclosedFactKeys: string[],
    studentMessage: string,
    patientResponse: string,
    newEmotion: PatientEmotion,
    newIntensity: number
  ): PatientConversationState {
    state.conversationTurn += 1;
    state.currentIntents = intents;
    state.previousQuestions.push(studentMessage);
    state.previousAnswers.push(patientResponse);
    state.lastStudentMessage = studentMessage;
    state.lastPatientResponse = patientResponse;
    state.emotionalState = newEmotion;
    state.emotionIntensity = newIntensity;

    // Update facts disclosure status
    for (const key of disclosedFactKeys) {
      const fact = state.facts[key];
      if (fact) {
        fact.status = 'disclosed';
        fact.disclosureCount += 1;
        fact.lastDiscussedTurn = state.conversationTurn;
        if (!state.disclosedFactIds.includes(fact.factId)) {
          state.disclosedFactIds.push(fact.factId);
        }
      }
    }

    // Determine current topic from intents
    if (intents.includes('ONSET') || intents.includes('LOCATION') || intents.includes('CHARACTER') || intents.includes('SEVERITY')) {
      state.currentTopic = 'Pain/Symptom Characteristics (SOCRATES)';
      state.consultationStage = 'symptom_exploration';
    } else if (intents.includes('FEVER') || intents.includes('COUGH') || intents.includes('BREATHING') || intents.includes('PALPITATION')) {
      state.currentTopic = 'System Review';
      state.consultationStage = 'system_review';
    } else if (intents.includes('PAST_MEDICAL_HISTORY') || intents.includes('MEDICATION') || intents.includes('ALLERGY') || intents.includes('FAMILY_HISTORY') || intents.includes('SMOKING')) {
      state.currentTopic = 'Past Medical & Social History';
      state.consultationStage = 'past_history';
    }

    // Append to conversation history
    state.conversationHistory.push({
      role: 'student',
      content: studentMessage,
      intents,
    });
    state.conversationHistory.push({
      role: 'patient',
      content: patientResponse,
    });

    stateCache.set(state.sessionId, state);
    return state;
  }

  /**
   * Resets or clears session state cache.
   */
  public static clearSession(sessionId: string): void {
    stateCache.delete(sessionId);
  }
}
