import { ClinicalFact, ClinicalIntent, LanguageMode, PatientPersonality } from './types';

export class PatientDisclosureRules {
  /**
   * Generates a patient response for an already-disclosed fact when student asks repeatedly.
   */
  public static handleRepeatedFact(
    fact: ClinicalFact,
    language: LanguageMode,
    personality: PatientPersonality
  ): string {
    const isBn = language === 'bn';
    const isBanglish = language === 'banglish';
    const count = fact.disclosureCount;

    if (isBn) {
      if (fact.category === 'AGE') {
        return `জি ডাক্তার সাহেব, আগেই বলেছি আমার বয়স ${fact.valueBn.replace(/[^০-৯0-9]/g, '') || ''} বছর।`;
      }
      if (count === 1) {
        return `যেমনটা আগেই বলেছিলাম ডাক্তার সাহেব, ${fact.valueBn}`;
      } else {
        return `জি ডাক্তার সাহেব, এটা এখনও ${fact.valueBn}। ঠিক আগের মতোই লাগছে।`;
      }
    } else if (isBanglish) {
      if (count === 1) {
        return `Ageo bolechilam doctor, ${fact.valueEn}`;
      } else {
        return `Ji doctor, eta ekhono ${fact.valueEn}`;
      }
    }

    // English
    if (fact.category === 'AGE') {
      return `As I mentioned earlier, doctor, ${fact.valueEn}`;
    }
    if (count === 1) {
      if (personality === 'anxious') {
        return `As I mentioned earlier, doctor, ${fact.valueEn.toLowerCase()} I'm still really worried about it.`;
      } else if (personality === 'quiet') {
        return `As I said, ${fact.valueEn.toLowerCase()}`;
      } else {
        return `As I mentioned earlier, ${fact.valueEn.toLowerCase()}`;
      }
    } else {
      return `Yes, doctor, it's still ${fact.valueEn.toLowerCase()} — hasn't really changed since we talked.`;
    }
  }

  /**
   * Generates a clarification request when question is ambiguous.
   */
  public static handleAmbiguousQuestion(
    studentMessage: string,
    currentTopic: string,
    language: LanguageMode
  ): string {
    const isBn = language === 'bn';
    const isBanglish = language === 'banglish';

    if (isBn) {
      return 'ডাক্তার সাহেব, আপনি ঠিক কী জানতে চাচ্ছেন? কষ্টটা কেমন লাগছে, নাকি এটা কখন থেকে শুরু হয়েছে?';
    } else if (isBanglish) {
      return 'Doctor, apni thik ki jante chacchen? Kosto ta kemon, naki kobe shuru hoyeche?';
    }

    return "Do you mean how the symptom feels, or where it's located, doctor?";
  }

  /**
   * Generates polite boundary response when student asks an unrelated non-medical question.
   */
  public static handleUnrelatedQuery(
    language: LanguageMode
  ): string {
    const isBn = language === 'bn';
    const isBanglish = language === 'banglish';

    if (isBn) {
      return 'ডাক্তার সাহেব, আমি তো অসুস্থ হয়ে আপনার কাছে চিকিৎসার জন্য এসেছি। এই প্রশ্নের সাথে আমার অসুখের কী সম্পর্ক তা বুঝতে পারছি না।';
    } else if (isBanglish) {
      return 'Doctor, ami to oshustho hoye apnar kache eshechi. Eitar shathe amar roger ki shomporko?';
    }

    return "Doctor, I came here today because I'm feeling sick and need your help. I'm not sure how that question relates to my medical problem.";
  }

  /**
   * Generates safe patient response when student asks if patient has a specific diagnosis.
   */
  public static handleDirectDiagnosisQuery(
    studentMessage: string,
    language: LanguageMode,
    personality: PatientPersonality
  ): string {
    const isBn = language === 'bn';
    const isBanglish = language === 'banglish';

    if (isBn) {
      if (personality === 'anxious') {
        return 'আমি তো ডাক্তার নই ডাক্তার সাহেব, রোগটা কি মারাত্মক কিছু? এই আশঙ্কায় তো খুব ভয় পাচ্ছি!';
      }
      return 'আমি তো জানি না ডাক্তার সাহেব, রোগটা কী তা বোঝার জন্যই তো আপনার কাছে সাহায্য নিতে এসেছি।';
    } else if (isBanglish) {
      return 'Ami to doctor na, thik jani na doctor shaheb. Apnar kachei to jante eshechi.';
    }

    if (personality === 'anxious') {
      return "I honestly don't know, doctor. That's what scares me most! Is it something very serious?";
    }
    return "I don't know, doctor. That's why I came in to see you today. I just know that I'm feeling this discomfort.";
  }

  /**
   * Applies personality tone and phrasing to a factual statement.
   * Respects demographic intents so personal details remain clean and polite.
   */
  public static applyPersonality(
    baseText: string,
    personality: PatientPersonality,
    language: LanguageMode,
    intent: ClinicalIntent
  ): string {
    const isBn = language === 'bn';

    // Demographics: Keep clean, polite, direct
    const isDemographic = ['AGE', 'NAME', 'SEX', 'OCCUPATION', 'MARITAL_STATUS'].includes(intent);
    const cleanBase = baseText.replace(/[।.,!?\s]+$/, '');
    if (isDemographic) {
      if (isBn) {
        if (personality === 'anxious' && !baseText.includes('ডাক্তার')) {
          return `${baseText} ডাক্তার সাহেব।`;
        }
        return baseText;
      }
      return baseText;
    }

    if (isBn) {
      switch (personality) {
        case 'anxious':
          return `ডাক্তার সাহেব... ${cleanBase}। এটা কি কোনো বড় বিপদের লক্ষণ ডাক্তার সাহেব?`;
        case 'quiet':
          return `${cleanBase}।`;
        case 'talkative':
          return `জি ডাক্তার সাহেব, বলতে গেলে ${cleanBase}। আসলে কদিন ধরে এটা নিয়েই বারবার ভাবছিলাম।`;
        case 'frustrated':
          return `অনেকক্ষণ ধরে কষ্ট পাচ্ছি ডাক্তার সাহেব... ${cleanBase}। দয়া করে একটু দেখুন কী করা যায়।`;
        case 'concerned':
          if (['DURATION', 'ONSET', 'LOCATION', 'RADIATION', 'SEVERITY', 'FEVER', 'MEDICATION', 'ALLERGY'].includes(intent)) {
            return `${cleanBase}।`;
          }
          return `${cleanBase}। আমি শুধু চিন্তা করছি কবে আবার স্বাভাবিক কাজে ফিরতে পারব।`;
        default:
          return cleanBase.startsWith('জি') ? `${cleanBase}।` : `জি ডাক্তার সাহেব, ${cleanBase}।`;
      }
    }

    // English
    switch (personality) {
      case 'anxious':
        return `${baseText} I'm really anxious about what this might mean, doctor.`;
      case 'quiet':
        return baseText;
      case 'talkative':
        return `Well doctor, to be honest with you, ${baseText} It's been on my mind constantly since it happened.`;
      case 'frustrated':
        return `${baseText} I really just want to get to the bottom of this discomfort.`;
      case 'concerned':
        return `${baseText} I just want to make sure I can get back to taking care of my family.`;
      default:
        return baseText;
    }
  }
}
