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
import { QuestionNormalizer } from './questionNormalizer';
import { ContextResolver } from './contextResolver';
import { ClinicalHistoryTracker } from './historyTracker';
import { ResponseQualityGuard } from './responseQualityGuard';
import { ConsultationTimelineService } from './timelineService';

export * from './types';
export * from './intentDetector';
export * from './factExtractor';
export * from './conversationState';
export * from './disclosureRules';
export * from './clinicalConsistencyValidator';
export * from './dynamicResponseGenerator';
export * from './truthLayer';
export * from './factRetrievalService';
export * from './questionNormalizer';
export * from './contextResolver';
export * from './historyTracker';
export * from './responseQualityGuard';
export * from './timelineService';

export class StatefulPatientEngine {
  /**
   * Main entrypoint for processing a student's conversation turn across the complete Phase 3 pipeline:
   * 1. Question Normalization (stripping fillers, normalizing clinical terms, preserving raw text)
   * 2. Stateful Context & Memory Resolution
   * 3. Intent Detection & Conversational Anaphora Resolution ("সেখান থেকে কি ছড়ায়?")
   * 4. Grounded Truth Fact Retrieval from PatientTruthLayer
   * 5. Personality & Emotional Continuity
   * 6. Controlled Dynamic Response Generation (no over-volunteering)
   * 7. Response Quality Guard & Clinical Relevance Validation
   * 8. Dynamic Clinical History Tracker & Timeline Logging
   */
  public static async processTurn(
    sessionId: string,
    caseContext: PatientCaseContext,
    studentMessage: string,
    dbHistory: ConversationTurn[] = []
  ): Promise<PatientEngineResult> {
    const rawMessage = studentMessage.trim();

    // 1. Question Normalization
    const normResult = QuestionNormalizer.normalize(rawMessage);
    const normalizedText = normResult.normalizedText;

    // 2. Retrieve or Initialize Stateful Patient Conversation Context
    const state = PatientConversationStateManager.getOrInitState(
      sessionId,
      caseContext,
      dbHistory
    );

    // 3. Clinical Question Intent Detection
    const rawIntentResult = ClinicalQuestionIntentDetector.detectIntents(
      normalizedText,
      state.currentTopic
    );

    // 4. Context & Anaphora Resolution (resolving deictic follow-ups like "সেখান থেকে কি ছড়ায়?")
    const contextResult = ContextResolver.resolve(
      normalizedText,
      rawIntentResult.intents,
      state
    );

    const activeIntents = contextResult.intents.length > 0 ? contextResult.intents : rawIntentResult.intents;
    state.currentIntents = activeIntents;
    const detectedLanguage = rawIntentResult.detectedLanguage;

    // 5. Dynamic Response Generation with Grounded Fact Retrieval & Disclosure Rules
    let genResult = await DynamicPatientResponseGenerator.generateResponse(
      state,
      caseContext,
      activeIntents,
      normalizedText,
      detectedLanguage
    );

    // 6. Response Quality Guard (Fact Check + Single Aspect + Relevance + Safety)
    const qualityResult = ResponseQualityGuard.inspect(
      genResult.response,
      normalizedText,
      activeIntents,
      state,
      caseContext,
      detectedLanguage
    );

    genResult.response = qualityResult.finalResponse;

    // 7. Clinical Consistency & Safety Validation
    let validationResult = ClinicalConsistencyValidator.validate(
      genResult.response,
      caseContext,
      state,
      normalizedText
    );

    // If validation failed, substitute safe patient response
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

    // 8. Dynamic Clinical History Tracker
    const historySummary = ClinicalHistoryTracker.trackTurn(
      state,
      activeIntents,
      genResult.disclosedFactKeys
    );

    // 9. Update Conversation State with Disclosed Facts & Turn Progression
    PatientConversationStateManager.updateStateAfterTurn(
      state,
      activeIntents,
      genResult.disclosedFactKeys,
      rawMessage,
      genResult.response,
      genResult.emotion,
      genResult.intensity
    );

    // 10. Consultation Timeline Event Logging
    ConsultationTimelineService.logEvent(sessionId, 'DoctorQuestion', {
      rawMessage,
      normalizedText,
      turn: state.conversationTurn,
    });
    ConsultationTimelineService.logEvent(sessionId, 'IntentDetected', {
      intents: activeIntents,
      contextResolution: contextResult.resolvedReference,
    });
    ConsultationTimelineService.logEvent(sessionId, 'PatientAnswer', {
      response: genResult.response,
      disclosedFactKeys: genResult.disclosedFactKeys,
      emotion: genResult.emotion,
    });

    // 11. Build Debug Metadata
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
      detectedIntents: activeIntents,
      detectedLanguage,
      retrievedFacts: retrievedFactsDebug,
      conversationTurn: state.conversationTurn,
      currentTopic: state.currentTopic,
      personalityApplied: state.personality,
      emotionalState: genResult.emotion,
      validationResult,
      historyTracker: historySummary,
      contextResolution: contextResult,
      qualityGuardResult: qualityResult,
    };

    return {
      message: genResult.response,
      provider: genResult.provider,
      emotion: genResult.emotion,
      intensity: genResult.intensity,
      intents: activeIntents,
      historyTracker: historySummary,
      debug: debugInfo,
    };
  }
}
