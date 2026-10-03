// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 3: Conversational Context & Anaphora Resolution
// ────────────────────────────────────────────────────────────────────────────

import { ClinicalIntent, PatientConversationState } from './types';

export interface ContextResolutionResult {
  intents: ClinicalIntent[];
  resolvedReference?: string;
  inferredTopic?: string;
}

export class ContextResolver {
  /**
   * Resolves conversational references (anaphora, deixis, ellipsis, pronouns)
   * connecting follow-up doctor inquiries to the preceding dialogue context.
   *
   * Example:
   * Doctor: "ব্যথাটা কোথায়?" -> Patient: "ডান নিচের দিকে।"
   * Doctor: "সেখান থেকে কি ছড়ায়?"
   * System: "সেখান" = current pain location -> Intent: RADIATION
   */
  public static resolve(
    normalizedText: string,
    currentIntents: ClinicalIntent[],
    state: PatientConversationState
  ): ContextResolutionResult {
    const text = normalizedText.toLowerCase();
    const prevTopic = state.currentTopic;
    const resolvedIntents = [...currentIntents];
    let resolvedReference: string | undefined;

    // Check if the input is an anaphoric follow-up (lacks an explicit noun, relies on previous context)
    const isAnaphoric =
      text.includes('সেখান') ||
      text.includes('সেখান থেকে') ||
      text.includes('from there') ||
      text.includes('অন্য কোথাও') ||
      text.includes('anywhere else') ||
      text.includes('এটা') ||
      text.includes('this') ||
      text.includes('it') ||
      text.includes('এর সাথে') ||
      text.includes('with this') ||
      text.includes('আর কিছু') ||
      text.includes('anything else') ||
      text.includes('আগে এমন') ||
      text.includes('before') ||
      text.includes('বাড়ে') ||
      text.includes('কমে') ||
      text.includes('worse') ||
      text.includes('better');

    // 1. "সেখান থেকে কি ছড়ায় / অন্য কোথাও যায়?" -> Pain Radiation
    if (
      (text.includes('সেখান') || text.includes('from there') || text.includes('অন্য কোথাও') || text.includes('ছড়ায়') || text.includes('radiate') || text.includes('spread')) &&
      !resolvedIntents.includes('RADIATION')
    ) {
      if (prevTopic.includes('LOCATION') || prevTopic.includes('PAIN') || prevTopic.includes('CHIEF_COMPLAINT') || prevTopic.includes('HPI')) {
        resolvedIntents.push('RADIATION');
        resolvedReference = 'Resolved "সেখান থেকে" referencing previous pain location -> RADIATION';
        return { intents: Array.from(new Set(resolvedIntents)), resolvedReference, inferredTopic: 'PAIN_RADIATION' };
      }
    }

    // 2. "বাড়ে কিসে?" / "নড়াচড়া করলে বাড়ে?" -> Aggravating Factors
    if (
      (text.includes('বাড়ে') || text.includes('বৃদ্ধি') || text.includes('worse') || text.includes('aggravat')) &&
      !resolvedIntents.includes('AGGRAVATING_FACTORS')
    ) {
      resolvedIntents.push('AGGRAVATING_FACTORS');
      resolvedReference = 'Resolved worsening query referencing current symptom -> AGGRAVATING_FACTORS';
      return { intents: Array.from(new Set(resolvedIntents)), resolvedReference, inferredTopic: 'AGGRAVATING_FACTORS' };
    }

    // 3. "কমে কিসে?" / "বিশ্রাম নিলে কমে?" -> Relieving Factors
    if (
      (text.includes('কমে') || text.includes('আরাম') || text.includes('better') || text.includes('reliev') || text.includes('ease')) &&
      !resolvedIntents.includes('RELIEVING_FACTORS')
    ) {
      resolvedIntents.push('RELIEVING_FACTORS');
      resolvedReference = 'Resolved relieving query referencing current symptom -> RELIEVING_FACTORS';
      return { intents: Array.from(new Set(resolvedIntents)), resolvedReference, inferredTopic: 'RELIEVING_FACTORS' };
    }

    // 4. "এটা কেমন?" / "কেমন ধরনের?" -> Pain Character
    if (
      (text.includes('কেমন ধরনের') || (text.includes('এটা কেমন') && text.length <= 15) || text.includes('what kind') || text.includes('what does it feel like')) &&
      !resolvedIntents.includes('CHARACTER')
    ) {
      resolvedIntents.push('CHARACTER');
      resolvedReference = 'Resolved "এটা কেমন" referencing symptom nature -> CHARACTER';
      return { intents: Array.from(new Set(resolvedIntents)), resolvedReference, inferredTopic: 'PAIN_CHARACTER' };
    }

    // 5. "কতক্ষণ থাকে?" / "কখন থেকে?" / "কতদিন?" -> Duration
    if (
      (text.includes('কতক্ষণ') || text.includes('কতদিন') || text.includes('how long') || text.includes('since when')) &&
      !resolvedIntents.includes('DURATION') && !resolvedIntents.includes('ONSET')
    ) {
      resolvedIntents.push('DURATION');
      resolvedReference = 'Resolved duration query referencing current symptom -> DURATION';
      return { intents: Array.from(new Set(resolvedIntents)), resolvedReference, inferredTopic: 'SYMPTOM_DURATION' };
    }

    // 6. "আর কিছু হয়?" / "এর সাথে অন্য কোনো উপসর্গ?" -> Associated Symptoms
    if (
      (text.includes('আর কিছু') || text.includes('এর সাথে') || text.includes('anything else') || text.includes('other symptoms')) &&
      !resolvedIntents.includes('ASSOCIATED_SYMPTOMS')
    ) {
      resolvedIntents.push('ASSOCIATED_SYMPTOMS');
      resolvedReference = 'Resolved "আর কিছু" referencing associated clinical symptoms -> ASSOCIATED_SYMPTOMS';
      return { intents: Array.from(new Set(resolvedIntents)), resolvedReference, inferredTopic: 'ASSOCIATED_SYMPTOMS' };
    }

    // 7. "আগে এমন হয়েছিল?" -> Past History
    if (
      (text.includes('আগে এমন') || text.includes('আগে হয়েছিল') || text.includes('before') || text.includes('past')) &&
      !resolvedIntents.includes('PAST_MEDICAL_HISTORY')
    ) {
      resolvedIntents.push('PAST_MEDICAL_HISTORY');
      resolvedReference = 'Resolved "আগে এমন" referencing past medical episodes -> PAST_HISTORY';
      return { intents: Array.from(new Set(resolvedIntents)), resolvedReference, inferredTopic: 'PAST_MEDICAL_HISTORY' };
    }

    // 8. "এর জন্য কোনো কিছু খেয়েছেন / ওষুধ নিয়েছেন?" -> Medication
    if (
      (text.includes('খেয়েছেন') || text.includes('ওষুধ') || text.includes('ঔষধ') || text.includes('taken any') || text.includes('medicine')) &&
      !resolvedIntents.includes('MEDICATION')
    ) {
      resolvedIntents.push('MEDICATION');
      resolvedReference = 'Resolved medication intake inquiry -> MEDICATION';
      return { intents: Array.from(new Set(resolvedIntents)), resolvedReference, inferredTopic: 'MEDICATION' };
    }

    return {
      intents: resolvedIntents,
      resolvedReference: isAnaphoric ? 'Contextual continuation of topic: ' + prevTopic : undefined,
    };
  }
}

export default ContextResolver;
