import {
  ConversationTurn,
  EngineDebugInfo,
  PatientCaseContext,
  PatientEngineResult,
} from './types';
import { ClinicalQuestionIntentDetector } from './intentDetector';
import { PatientConversationStateManager } from './conversationState';
import { DynamicPatientResponseGenerator } from './dynamicResponseGenerator';
import { ClinicalConsistencyValidator } from './clinicalConsistencyValidator';

export * from './types';
export * from './intentDetector';
export * from './factExtractor';
export * from './conversationState';
export * from './disclosureRules';
export * from './clinicalConsistencyValidator';
export * from './dynamicResponseGenerator';

export class StatefulPatientEngine {
  /**
   * Main entrypoint for processing a student's conversation turn.
   */
  public static async processTurn(
    sessionId: string,
    caseContext: PatientCaseContext,
    studentMessage: string,
    dbHistory: ConversationTurn[] = []
  ): Promise<PatientEngineResult> {
    const rawMessage = studentMessage.trim();

    // 1. Retrieve or Initialize Stateful Patient Conversation Context
    const state = PatientConversationStateManager.getOrInitState(
      sessionId,
      caseContext,
      dbHistory
    );

    // 2. Clinical Question Intent Detection (Supports Bangla, English, Banglish & Multi-question)
    const intentResult = ClinicalQuestionIntentDetector.detectIntents(
      rawMessage,
      state.currentTopic
    );

    const detectedLanguage = intentResult.detectedLanguage;

    // 3. Dynamic Response Generation with Grounded Fact Retrieval & Disclosure Rules
    let genResult = await DynamicPatientResponseGenerator.generateResponse(
      state,
      caseContext,
      intentResult.intents,
      rawMessage,
      detectedLanguage
    );

    // 4. Clinical Consistency & Safety Validation
    let validationResult = ClinicalConsistencyValidator.validate(
      genResult.response,
      caseContext,
      state,
      rawMessage
    );

    // If validation failed (e.g., hidden diagnosis leaked), substitute safe patient response
    if (!validationResult.valid) {
      console.warn('[StatefulPatientEngine] Response failed validation:', validationResult.reason);
      const safeBn = `ডাক্তার সাহেব, আমি তো একজন সাধারণ রোগী। অসুখটা কী তা বোঝার জন্যই তো আপনার কাছে আসা। ${caseContext.chiefComplaint} নিয়ে খুব কষ্টে আছি।`;
      const safeEn = `I'm not a doctor, so I don't really know what is wrong. That's why I came to see you today. I just know that I'm suffering from ${caseContext.chiefComplaint.toLowerCase()}.`;
      genResult.response = detectedLanguage === 'bn' ? safeBn : safeEn;
      genResult.provider = 'mock';
      validationResult = {
        valid: true,
        reason: 'Substituted safe response',
        containsHiddenDiagnosis: false,
        containsContradiction: false,
        answersQuestion: true,
      };
    }

    // 5. Update Conversation State with Disclosed Facts & Turn Progression
    PatientConversationStateManager.updateStateAfterTurn(
      state,
      intentResult.intents,
      genResult.disclosedFactKeys,
      rawMessage,
      genResult.response,
      genResult.emotion,
      genResult.intensity
    );

    // 6. Build Debug Metadata (Part 31)
    const retrievedFactsDebug = genResult.disclosedFactKeys.map(k => {
      const f = state.facts[k];
      return {
        intent: f?.category || 'OTHER',
        factId: k,
        value: detectedLanguage === 'bn' ? f?.valueBn || '' : f?.valueEn || '',
        previouslyDisclosed: (f?.disclosureCount || 0) > 1,
        disclosureCount: f?.disclosureCount || 1,
      };
    });

    const debugInfo: EngineDebugInfo = {
      studentQuestion: rawMessage,
      detectedIntents: intentResult.intents,
      detectedLanguage,
      retrievedFacts: retrievedFactsDebug,
      conversationTurn: state.conversationTurn,
      currentTopic: state.currentTopic,
      personalityApplied: state.personality,
      emotionalState: genResult.emotion,
      validationResult,
    };

    return {
      message: genResult.response,
      provider: genResult.provider,
      emotion: genResult.emotion,
      intensity: genResult.intensity,
      intents: intentResult.intents,
      debug: debugInfo,
    };
  }
}
