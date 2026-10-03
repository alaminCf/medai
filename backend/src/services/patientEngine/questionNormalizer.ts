// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 3: Clinical Question Normalization
// ────────────────────────────────────────────────────────────────────────────

export interface NormalizedQuestionResult {
  rawText: string;
  normalizedText: string;
  hasFillers: boolean;
  detectedMedicalTerms: string[];
  extractedKeywords: string[];
}

export class QuestionNormalizer {
  // Common conversational voice fillers (Bangla, English, Banglish)
  private static FILLERS_REGEX = new RegExp(
    '\\b(uh|um|er|ah|so|like|basically|you know|i mean|actually|please tell me|can you tell me)\\b|' +
    '(\\b(মানে|ইয়ে|ইয়ে|আসলে|তো|আর কি|বলছিলাম কি|বলুন তো|একটু বলুন|দয়া করে|দয়া করে|একটু বলবেন)\\b)',
    'gi'
  );

  // Common clinical / medical terms in English, Bangla, and Banglish phonetic spellings
  private static CLINICAL_TERM_MAP: { [key: string]: string } = {
    'cheast': 'chest',
    'batha': 'ব্যথা',
    'betha': 'ব্যথা',
    'byatha': 'ব্যথা',
    'bephe': 'ব্যথা',
    'radiate': 'ছড়ায়',
    'radiates': 'ছড়ায়',
    'radiating': 'ছড়ায়',
    'spread': 'ছড়ায়',
    'vomit': 'বমি',
    'vomiting': 'বমি',
    'nausea': 'বমি বমি ভাব',
    'fever': 'জ্বর',
    'temp': 'তাপমাত্রা',
    'temperature': 'তাপমাত্রা',
    'pressure': 'প্রেসার',
    'sugar': 'সুগার',
    'diabetes': 'ডায়াবেটিস',
    'allergy': 'অ্যালার্জি',
    'alargi': 'অ্যালার্জি',
    'breath': 'শ্বাসকষ্ট',
    'breathing': 'শ্বাসকষ্ট',
    'shortness of breath': 'শ্বাসকষ্ট',
    'cough': 'কাশি',
    'swelling': 'ফোলা',
    'swollen': 'ফোলা',
    'palpitation': 'বুক ধড়ফড়',
    'dizziness': 'মাথা ঘোরানো',
    'headache': 'মাথাব্যথা',
    'duration': 'কদিন ধরে',
    'history': 'ইতিহাস',
  };

  /**
   * Normalizes doctor/student voice or text input without altering clinical semantics.
   * Strips conversational fillers, normalizes phonetic typos, resolves Banglish medical terms,
   * while preserving the original user transcript intact.
   */
  public static normalize(rawText: string): NormalizedQuestionResult {
    if (!rawText || !rawText.trim()) {
      return {
        rawText: '',
        normalizedText: '',
        hasFillers: false,
        detectedMedicalTerms: [],
        extractedKeywords: [],
      };
    }

    const trimmed = rawText.trim();
    let normalized = trimmed.normalize('NFC');

    // 1. Detect filler words presence
    const hasFillers = this.FILLERS_REGEX.test(normalized);

    // 2. Remove non-informative fillers
    normalized = normalized.replace(this.FILLERS_REGEX, ' ');

    // 3. Clean Unicode Bengali diacritics & spelling variations
    normalized = normalized
      .replace(/\u09AF\u09BC/g, '\u09DF') // য় -> য়
      .replace(/\u09A1\u09BC/g, '\u09DC') // ড় -> ড়
      .replace(/\u09A2\u09BC/g, '\u09DD') // ঢ় -> ঢ়
      .replace(/ঔষধ/g, 'ওষুধ')
      .replace(/এলার্জি/g, 'অ্যালার্জি')
      .replace(/বয়েস/g, 'বয়স')
      .replace(/বয়েস/g, 'বয়স')
      .replace(/বয়স/g, 'বয়স')
      .replace(/কতো/g, 'কত')
      .replace(/কী/g, 'কি')
      .replace(/যাবৎ/g, 'যাবত')
      .replace(/হয়েছে/g, 'হয়েছে')
      .replace(/কোথায়/g, 'কোথায়')
      .replace(/ছড়িয়ে/g, 'ছড়িয়ে')
      .replace(/পড়ে/g, 'পড়ে')
      .replace(/দিয়ে/g, 'দিয়ে')
      .replace(/ডায়াবেটিস/g, 'ডায়াবেটিস')
      .replace(/নিয়মিত/g, 'নিয়মিত')
      .replace(/ব্যাথা/g, 'ব্যথা')
      .replace(/বেথা/g, 'ব্যথা')
      .replace(/চক্ষু/g, 'চোখ')
      .replace(/ডানপাশে/g, 'ডান পাশে')
      .replace(/বামপাশে/g, 'বাম পাশে')
      .replace(/মাঝামাঝি/g, 'মাঝখানে');

    // 4. Extract medical terms
    const detectedMedicalTerms: string[] = [];
    const lower = normalized.toLowerCase();
    for (const [term, mapped] of Object.entries(this.CLINICAL_TERM_MAP)) {
      if (lower.includes(term)) {
        detectedMedicalTerms.push(mapped);
      }
    }

    // 5. Clean up redundant spaces & punctuation
    normalized = normalized
      .replace(/[,;?!।]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 6. Extract meaningful clinical keywords
    const tokens = normalized.split(/\s+/).filter(w => w.length > 1);

    return {
      rawText: trimmed,
      normalizedText: normalized || trimmed,
      hasFillers,
      detectedMedicalTerms: Array.from(new Set(detectedMedicalTerms)),
      extractedKeywords: tokens,
    };
  }
}

export default QuestionNormalizer;
