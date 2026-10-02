import OpenAI from 'openai';
import {
  ClinicalIntent,
  LanguageMode,
  PatientCaseContext,
  PatientConversationState,
  PatientEmotion,
  PatientPersonality,
} from './types';
import { PatientDisclosureRules } from './disclosureRules';
import { PatientFactRetrievalService } from './factRetrievalService';

export interface GenerationOutput {
  response: string;
  disclosedFactKeys: string[];
  emotion: PatientEmotion;
  intensity: number;
  provider: 'openai' | 'mock';
}

export class DynamicPatientResponseGenerator {
  /**
   * Generates a clinically grounded, state-aware patient response.
   * Pulls ONLY authoritative facts relevant to the detected intent.
   * Never fabricates ungrounded symptoms or leaks hidden diagnosis.
   */
  public static async generateResponse(
    state: PatientConversationState,
    caseContext: PatientCaseContext,
    intents: ClinicalIntent[],
    studentMessage: string,
    language: LanguageMode
  ): Promise<GenerationOutput> {
    const isBn = language === 'bn';
    const personality = state.personality;

    // 1. Direct Diagnosis Check (Safety Boundary)
    if (intents.includes('DIRECT_DIAGNOSIS_QUERY')) {
      const resp = PatientDisclosureRules.handleDirectDiagnosisQuery(studentMessage, language, personality);
      return {
        response: resp,
        disclosedFactKeys: [],
        emotion: personality === 'anxious' ? 'anxious' : 'concerned',
        intensity: 0.6,
        provider: 'mock',
      };
    }

    // 2. Unrelated Query Check (Safety & Topic Boundary)
    if (intents.includes('UNRELATED_QUERY')) {
      const resp = PatientDisclosureRules.handleUnrelatedQuery(language);
      return {
        response: resp,
        disclosedFactKeys: [],
        emotion: 'confused',
        intensity: 0.4,
        provider: 'mock',
      };
    }

    // 3. Ambiguous Query Check
    if (intents.includes('OTHER') && studentMessage.split(/\s+/).length <= 3) {
      const resp = PatientDisclosureRules.handleAmbiguousQuestion(studentMessage, state.currentTopic, language);
      return {
        response: resp,
        disclosedFactKeys: [],
        emotion: 'confused',
        intensity: 0.4,
        provider: 'mock',
      };
    }

    // 4. Map intents to clinical facts using PatientFactRetrievalService
    const matchedFactKeys = PatientFactRetrievalService.resolveFactKeysForIntents(intents);
    const disclosedFactKeys: string[] = [];
    const factResponses: string[] = [];

    const highestEmotion: PatientEmotion = state.emotionalState;
    const emotionIntensity = state.emotionIntensity;

    for (const key of matchedFactKeys) {
      const fact = state.facts[key];
      if (!fact) continue;

      disclosedFactKeys.push(key);

      // Check if already disclosed
      if (fact.status === 'disclosed' && fact.disclosureCount >= 1) {
        factResponses.push(PatientDisclosureRules.handleRepeatedFact(fact, language, personality));
      } else {
        // First-time disclosure of this fact
        const val = isBn ? fact.valueBn : fact.valueEn;
        factResponses.push(val);
      }
    }

    // 5. If Introduction intent was detected and no facts matched
    if (intents.includes('INTRODUCTION') && factResponses.length === 0) {
      const introBn = `জি ডাক্তার সাহেব, সালাম। আমার শরীরটা কদিন ধরে ভালো যাচ্ছে না। ${caseContext.chiefComplaint}`;
      const introEn = `Hello doctor, thank you for seeing me. I've been feeling unwell — ${caseContext.chiefComplaint.toLowerCase()}`;
      return {
        response: isBn ? introBn : introEn,
        disclosedFactKeys: ['chief_complaint'],
        emotion: 'neutral',
        intensity: 0.3,
        provider: 'mock',
      };
    }

    // 6. Fallback if no specific fact matched (polite clarification instead of dumping random symptoms)
    if (factResponses.length === 0) {
      const defBn = `জি ডাক্তার সাহেব, এ ব্যাপারে নিশ্চিত কিছু মনে পড়ছে না। আপনি যদি একটু অন্যভাবে বুঝিয়ে বলেন।`;
      const defEn = `I'm not quite sure about that, doctor. Could you clarify what you mean?`;
      return {
        response: isBn ? defBn : defEn,
        disclosedFactKeys: [],
        emotion: 'concerned',
        intensity: 0.35,
        provider: 'mock',
      };
    }

    // 7. Combine multiple fact responses naturally
    let combinedResponse = '';
    if (factResponses.length === 1) {
      combinedResponse = factResponses[0];
    } else {
      if (isBn) {
        combinedResponse = factResponses.join(' এবং ');
      } else {
        combinedResponse = factResponses.join(' Also, ');
      }
    }

    // Modulate with personality if not already decorated
    if (!combinedResponse.includes('যেমনটা আগেই') && !combinedResponse.includes('As I mentioned')) {
      combinedResponse = PatientDisclosureRules.applyPersonality(combinedResponse, personality, language, intents[0]);
    }

    // 8. Try OpenAI LLM if configured for natural conversational flow, strictly grounded on retrieved facts
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && !apiKey.includes('placeholder') && apiKey.startsWith('sk-')) {
      try {
        const openai = new OpenAI({ apiKey });
        const groundingPrompt = `You are roleplaying as a real patient named ${caseContext.patientName}, age ${caseContext.patientAge}, gender ${caseContext.patientGender}.
Personality: ${personality}.
Language to speak: ${isBn ? 'Bangla' : 'English'}.
CRITICAL CLINICAL RULES:
1. You are a real patient, NOT a doctor. You do NOT know your diagnosis. NEVER state you have a diagnosis or medical terms like myocardial infarction or appendicitis.
2. Student asked: "${studentMessage}"
3. The ONLY facts you know to answer this question are:
${disclosedFactKeys.map(k => `- ${state.facts[k]?.name}: ${isBn ? state.facts[k]?.valueBn : state.facts[k]?.valueEn}`).join('\n')}
4. Answer ONLY the specific question asked. Do NOT bring up other symptoms, do NOT describe your chief complaint unless explicitly asked about it.
5. Keep answer natural and concise (1-2 sentences max).
6. Never contradict these facts.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: groundingPrompt },
            { role: 'user', content: studentMessage },
          ],
          max_tokens: 150,
          temperature: 0.3,
        });

        const llmContent = completion.choices[0]?.message?.content?.trim();
        if (llmContent && llmContent.length > 3) {
          return {
            response: llmContent,
            disclosedFactKeys,
            emotion: highestEmotion,
            intensity: emotionIntensity,
            provider: 'openai',
          };
        }
      } catch (err) {
        console.warn('[DynamicPatientResponseGenerator] OpenAI error, falling back to stateful engine:', err);
      }
    }

    return {
      response: combinedResponse,
      disclosedFactKeys,
      emotion: highestEmotion,
      intensity: emotionIntensity,
      provider: 'mock',
    };
  }
}
