import {
  ClinicalFact,
  ClinicalIntent,
  LanguageMode,
  PatientCaseContext,
  PatientConversationState,
  PatientEmotion,
} from './types';
import { PatientDisclosureRules } from './disclosureRules';
import OpenAI from 'openai';

export class DynamicPatientResponseGenerator {
  /**
   * Generates a clinically grounded, state-aware response for the detected intents and state.
   */
  public static async generateResponse(
    state: PatientConversationState,
    caseContext: PatientCaseContext,
    intents: ClinicalIntent[],
    studentMessage: string,
    language: LanguageMode
  ): Promise<{ response: string; disclosedFactKeys: string[]; emotion: PatientEmotion; intensity: number; provider: 'openai' | 'mock' }> {
    const isBn = language === 'bn';
    const personality = state.personality;

    // 1. Direct Diagnosis Check
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

    // 2. Ambiguous Query Check
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

    // 3. Map intents to clinical facts
    const matchedFactKeys = this.resolveFactKeysForIntents(intents);
    const disclosedFactKeys: string[] = [];
    const factResponses: string[] = [];

    let highestEmotion: PatientEmotion = state.emotionalState;
    let emotionIntensity = state.emotionIntensity;

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

    // If introduction intent was detected
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

    // Fallback if no specific fact matched
    if (factResponses.length === 0) {
      const defBn = `জি ডাক্তার সাহেব, আমি বুঝতে পারছি। মূলত ${caseContext.chiefComplaint} নিয়েই আমি বেশি কষ্টে আছি।`;
      const defEn = `I understand what you mean, doctor. It's mainly this ${caseContext.chiefComplaint.toLowerCase()} that is bothering me.`;
      return {
        response: isBn ? defBn : defEn,
        disclosedFactKeys: ['chief_complaint'],
        emotion: 'concerned',
        intensity: 0.45,
        provider: 'mock',
      };
    }

    // Combine multiple fact responses naturally
    let combinedResponse = '';
    if (factResponses.length === 1) {
      combinedResponse = factResponses[0];
    } else {
      // Smoothly join multiple facts (e.g. Onset, Location, Severity)
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

    // Try OpenAI LLM if configured for added natural fluency, strictly grounded on facts
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && !apiKey.includes('placeholder') && apiKey.startsWith('sk-')) {
      try {
        const openai = new OpenAI({ apiKey });
        const groundingPrompt = `You are roleplaying as a real patient named ${caseContext.patientName}, age ${caseContext.patientAge}.
Personality: ${personality}.
Language to speak: ${isBn ? 'Bangla' : 'English'}.
CRITICAL CLINICAL RULES:
1. You are a real patient, NOT a doctor. You do NOT know your diagnosis. NEVER state you have a diagnosis or medical terms like myocardial infarction or appendicitis.
2. Student asked: "${studentMessage}"
3. The ONLY facts you know to answer this question are:
${disclosedFactKeys.map(k => `- ${state.facts[k]?.name}: ${isBn ? state.facts[k]?.valueBn : state.facts[k]?.valueEn}`).join('\n')}
4. Keep answer very natural and concise (1-3 sentences max).
5. Never contradict these facts. Never invent new symptoms.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: groundingPrompt },
            { role: 'user', content: studentMessage },
          ],
          max_tokens: 150,
          temperature: 0.5,
        });

        const llmContent = completion.choices[0]?.message?.content?.trim();
        if (llmContent && llmContent.length > 5) {
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

  /**
   * Resolves relevant fact keys based on clinical intents.
   */
  private static resolveFactKeysForIntents(intents: ClinicalIntent[]): string[] {
    const keys: string[] = [];

    for (const intent of intents) {
      switch (intent) {
        case 'CHIEF_COMPLAINT':
          keys.push('chief_complaint');
          break;
        case 'ONSET':
          keys.push('onset');
          break;
        case 'DURATION':
          keys.push('duration');
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
        case 'ASSOCIATED_SYMPTOMS':
          keys.push('associated_symptoms');
          break;
        case 'BREATHING':
          keys.push('breathing');
          break;
        case 'FEVER':
          keys.push('fever');
          break;
        case 'COUGH':
          keys.push('cough');
          break;
        case 'PALPITATION':
          keys.push('palpitation');
          break;
        case 'SYNCOPE':
          keys.push('syncope');
          break;
        case 'PAST_MEDICAL_HISTORY':
          keys.push('past_medical_history');
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
          keys.push('social_history');
          break;
        case 'SMOKING':
          keys.push('smoking');
          break;
        case 'ALCOHOL':
          keys.push('alcohol');
          break;
        case 'PATIENT_CONCERN':
          keys.push('patient_concern');
          break;
      }
    }

    return Array.from(new Set(keys));
  }
}
