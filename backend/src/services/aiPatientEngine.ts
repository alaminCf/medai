import {
  AIPatientResponse,
  AIProvider,
  ClinicalIntent,
  ConversationTurn,
  EngineDebugInfo,
  PatientCaseContext,
  PatientEmotion,
} from './patientEngine/types';
import { StatefulPatientEngine } from './patientEngine';

export * from './patientEngine/types';
export { StatefulPatientEngine } from './patientEngine';

// ────────────────────────────────────────────────────────────────────────────
// AI Patient Engine — Main Interface (Stateful & Context-Aware)
// ────────────────────────────────────────────────────────────────────────────

export class AIPatientEngine {
  private provider: AIProvider;

  constructor(provider: AIProvider = 'openai') {
    this.provider = provider;
  }

  /**
   * Generates a context-aware, stateful clinical patient response.
   * Dispatches through StatefulPatientEngine with semantic intent detection,
   * structured fact retrieval, controlled disclosure, and consistency validation.
   */
  async generatePatientResponse(
    caseContext: PatientCaseContext,
    conversationHistory: ConversationTurn[],
    studentMessage: string,
    sessionId?: string
  ): Promise<AIPatientResponse> {
    const resolvedSessionId =
      sessionId || `session_${caseContext.id || caseContext.patientName.toLowerCase().replace(/\s+/g, '_')}`;

    const result = await StatefulPatientEngine.processTurn(
      resolvedSessionId,
      caseContext,
      studentMessage,
      conversationHistory
    );

    return {
      message: result.message,
      provider: result.provider,
      emotion: result.emotion,
      intensity: result.intensity,
      intents: result.intents,
      debug: result.debug,
    };
  }

  getProvider(): AIProvider {
    return this.provider;
  }
}

export const aiPatientEngine = new AIPatientEngine(
  (process.env.DEFAULT_AI_PROVIDER as AIProvider) || 'openai'
);

export default aiPatientEngine;
