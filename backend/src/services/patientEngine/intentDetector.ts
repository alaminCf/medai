import { ClinicalIntent, IntentDetectionResult, LanguageMode } from './types';

// ────────────────────────────────────────────────────────────────────────────
// Language Detection Helper
// ────────────────────────────────────────────────────────────────────────────

export function detectLanguage(text: string): LanguageMode {
  // Check for Bengali Unicode block (0980-09FF)
  const banglaRegex = /[\u0980-\u09FF]/;
  if (banglaRegex.test(text)) {
    return 'bn';
  }

  const lower = text.toLowerCase();
  // Check for common Banglish transliterations
  const banglishMarkers = [
    'kobe', 'kothay', 'kemon', 'ki', 'batha', 'betha', 'shuru', 'hoyeche',
    'apnar', 'apni', 'ache', 'hocche', 'buke', 'ghare', 'khabar', 'osudh',
    'koto', 'din', 'dhore', 'chorae', 'kom', 'beshi', 'doktor', 'bap', 'ma',
    'dhumpon', 'chinta', 'bhoy', 'pore'
  ];

  const words = lower.split(/\s+/);
  const banglishMatchCount = words.filter(w => banglishMarkers.includes(w)).length;
  if (banglishMatchCount >= 2 || (words.length <= 4 && banglishMatchCount >= 1)) {
    return 'banglish';
  }

  return 'en';
}

// ────────────────────────────────────────────────────────────────────────────
// Intent Rules & Patterns
// ────────────────────────────────────────────────────────────────────────────

interface IntentRule {
  intent: ClinicalIntent;
  priority: number; // Higher number evaluated with higher specificity
  patterns: RegExp[];
}

const INTENT_RULES: IntentRule[] = [
  // 1. Direct Diagnosis Queries (High priority to avoid premature disclosure or coaching)
  {
    intent: 'DIRECT_DIAGNOSIS_QUERY',
    priority: 100,
    patterns: [
      /(do you have|is it|could it be|are you having|i think you have|do you suffer from) (myocardial infarction|heart attack|angina|stroke|appendicitis|cholecystitis|pneumonia|covid|cancer|tumor|pulmonary embolism|gerd|ulcer|asthma|migraine|meningitis|dengue)/i,
      /(আপনার কি|আপনি কি|এটা কি|মনে হয় আপনার) (হার্ট অ্যাটাক|হার্ট এটাক|মায়োকার্ডিয়াল|অ্যাপেন্ডিসাইটিস|নিউমোনিয়া|ক্যান্সার|স্ট্রোক|আলসার|ডেঙ্গু)/i,
      /(heart attack|myocardial infarction|angina|appendicitis|pneumonia|stroke|cancer|dengue)\s*(hoyeche|naki|kina|mone hoy|bhabchen)?/i,
    ],
  },

  // 2. Introduction & Rapport
  {
    intent: 'INTRODUCTION',
    priority: 90,
    patterns: [
      /^(hello|hi|good morning|good afternoon|good evening|hey|greetings)/i,
      /^(হ্যালো|সালাম|নমস্কার|কেমন আছেন|শুভ সকাল|শুভ দুপুর|শুভ সন্ধ্যা)/i,
      /(my name is|i am doctor|i am a medical student|how are you today|nice to meet you)/i,
      /(আমার নাম|আমি ডক্টর|আমি ডাক্তার|আমি মেডিকেল স্টুডেন্ট|আজ কেমন আছেন)/i,
      /(kemon achen|kemon আছেন|as-salamu alaykum|assalamu alaikum|hello doctor)/i,
    ],
  },

  // 3. Chief Complaint (What brought you in?)
  {
    intent: 'CHIEF_COMPLAINT',
    priority: 85,
    patterns: [
      /(what (is|are) your (chief|main)? complaint|what brings you (here|in today)|how can i help you|what seems to be the problem|what happened)/i,
      /(মূল সমস্যা|প্রধান সমস্যা|আজ কেন এসেছেন|কী সমস্যা নিয়ে এসেছেন|কী অসুবিধা হচ্ছে|কীভাবে সাহায্য করতে পারি)/i,
      /(chief complaint|main somossa|ki somossa|keno eshechen|ki hoyeche)/i,
    ],
  },

  // 4. Onset (When did it start? Sudden or gradual?)
  {
    intent: 'ONSET',
    priority: 80,
    patterns: [
      /(when did (the|this|it) (start|begin|first appear)|how did it start|did it start (suddenly|gradually)|when did you first notice)/i,
      /(কখন থেকে|কখন শুরু|কবে থেকে শুরু|হঠাৎ শুরু|কীভাবে শুরু হলো|কবে প্রথম লক্ষ্য করলেন)/i,
      /(kobe theke|kokhon theke|kobe shuru|kokhon shuru|sudden shuru)/i,
    ],
  },

  // 5. Duration (How long has it been going on?)
  {
    intent: 'DURATION',
    priority: 80,
    patterns: [
      /(how long (have you had|has this been going on|does it last)|for how many (days|hours|weeks|months)|how long)/i,
      /(কতদিন ধরে|কত দিন|কতক্ষণ|কত সময় ধরে|কতদিন ধরে হচ্ছে|কতক্ষণ থাকে)/i,
      /(koto din|koto din dhore|koto khon|how long dhore)/i,
    ],
  },

  // 6. Location & Site
  {
    intent: 'LOCATION',
    priority: 80,
    patterns: [
      /(where (is|does it|are) (the pain|it hurt|located|the problem)|where exactly|can you point to (where|the spot)|which part)/i,
      /(ব্যথাটা কোথায়|কোথায় ব্যথা|কোথায় কষ্ট|কোথায় হচ্ছে|কোন জায়গায়|নির্দিষ্ট জায়গাটা দেখাতে পারবেন|জায়গাটা কোথায়)/i,
      /(kothay betha|kothay batha|where exactly|kothay hocche|buke kothay)/i,
      /(কোথায়|kothay|where|site|spot)/i,
    ],
  },

  // 7. Radiation (Does it spread or move?)
  {
    intent: 'RADIATION',
    priority: 82,
    patterns: [
      /(does (it|the pain) (radiate|spread|move|go anywhere|travel)|does it go to your (arm|left arm|neck|jaw|back|shoulder))/i,
      /(ছড়ায়|ছড়িয়ে যায়|অন্য কোথাও যায়|হাতের দিকে যায়|ঘাড়ের দিকে যায়|পিঠের দিকে যায়|কোনো দিকে ছড়িয়ে পড়ে)/i,
      /(radiat|chorae|choriye jae|onno kothay jae|left arm e jae|ghare jae)/i,
    ],
  },

  // 8. Character & Quality (What does it feel like?)
  {
    intent: 'CHARACTER',
    priority: 78,
    patterns: [
      /(what (kind of|type of) pain|how would you describe (the pain|it)|what does it feel like|is it (sharp|dull|throbbing|burning|crushing|pressure|tight|aching|stabbing|heaviness))/i,
      /(ব্যথার প্রকৃতি|কেমন ধরনের ব্যথা|কেমন লাগে|ব্যথাটা কি (ভারী|চাপের মতো|তীক্ষ্ণ|জ্বালাপোড়া|কামড়ানি|টনটন))/i,
      /(kemon betha|kemon batha|chap dhoroner|sharp kina|describe koren)/i,
    ],
  },

  // 9. Severity & Intensity (Scale of 1-10)
  {
    intent: 'SEVERITY',
    priority: 78,
    patterns: [
      /(how (severe|bad) is (it|the pain)|on a scale (of|from) 1 (to|-) ?10|rate the pain|how much does it hurt|severity)/i,
      /(কতটা তীব্র|১০ এর স্কেলে|কতটুকু কষ্ট|ব্যথার মাত্রা|কত তীব্র|সহ্য করা যায়)/i,
      /(koto severe|scale of 1 to 10|10 er scale e|koto khani betha|how bad)/i,
      /(severe|severity|scale|তীব্র|কতটা|how bad)/i,
    ],
  },

  // 10. Aggravating Factors (What makes it worse?)
  {
    intent: 'AGGRAVATING_FACTORS',
    priority: 79,
    patterns: [
      /(what makes (it|the pain) worse|does anything aggravate|worse with (walking|exertion|breathing|eating|coughing|movement)|trigger)/i,
      /(কিসে বাড়ে|কখন বাড়ে|হাঁটলে কি বাড়ে|পরিশ্রম করলে বাড়ে|কী করলে কষ্ট বাড়ে|কোন কিছুতে বাড়ে)/i,
      /(kise bare|kise baare|worse hoy|walk korle bare|aggravat)/i,
    ],
  },

  // 11. Relieving Factors (What makes it better?)
  {
    intent: 'RELIEVING_FACTORS',
    priority: 79,
    patterns: [
      /(what makes (it|the pain) better|does anything relieve|relieved by (rest|medication|lying down|leaning forward)|better with)/i,
      /(কিসে কমে|কী করলে উপশম হয়|বিশ্রাম নিলে কমে|ওষুধ খেলে কমে|কোন কিছুতে কমে)/i,
      /(kise kome|kise shanti lage|rest nile kome|reliev)/i,
    ],
  },

  // 12. Timing & Periodicity
  {
    intent: 'TIMING',
    priority: 75,
    patterns: [
      /(is it (constant|continuous|intermittent|coming and going)|does it come and go|any particular time (of day|at night))/i,
      /(একটানা থাকে|আসে আর যায়|দিনে বেশি না রাতে|সবসময় থাকে|নির্দিষ্ট কোনো সময়ে)/i,
      /(constant kina|ashe ar jae|comes and goes|shob shomoy thake)/i,
    ],
  },

  // 13. Associated Symptoms (General)
  {
    intent: 'ASSOCIATED_SYMPTOMS',
    priority: 70,
    patterns: [
      /(any other (symptoms|problems|complaints)|anything else associated with (it|the pain)|do you notice anything else)/i,
      /(আর কোনো লক্ষণ|আর কোনো সমস্যা|সাথে আর কিছু আছে|অন্য কোনো উপসর্গ)/i,
      /(ar kono somossa|anything else|ar kichu ache)/i,
    ],
  },

  // 14. Specific Systemic Reviews: Breathing / Shortness of Breath
  {
    intent: 'BREATHING',
    priority: 85,
    patterns: [
      /(shortness of breath|difficulty breathing|breathless|dyspnea|orthopnea|trouble breathing|wheezing|chest tightness)/i,
      /(শ্বাসকষ্ট|শ্বাস নিতে কষ্ট|দম বন্ধ|দম আটকে আসে|শ্বাস ছোট হয়ে আসে)/i,
      /(shash koshto|shash nite koshto|breathlessness|shortness of breath)/i,
    ],
  },

  // 15. Fever & Chills
  {
    intent: 'FEVER',
    priority: 85,
    patterns: [
      /(do you have (a )?fever|high temperature|chills|rigors|feeling hot or cold|sweats)/i,
      /(জ্বর|শরীরে তাপ|কাঁপুনি|গা গরম|ঠাণ্ডা লাগা)/i,
      /(jwor|jor|fever ache|chills|gorom lage)/i,
    ],
  },

  // 16. Cough & Sputum
  {
    intent: 'COUGH',
    priority: 85,
    patterns: [
      /(do you have (a )?cough|coughing up (phlegm|sputum|blood)|dry cough|productive cough)/i,
      /(কাশি|কফ|রক্ত কাশি|শুকনো কাশি|কফ বের হয়)/i,
      /(kashi|kof|cough ache|coughing)/i,
    ],
  },

  // 17. Palpitations & Heart Racing
  {
    intent: 'PALPITATION',
    priority: 85,
    patterns: [
      /(palpitations|racing heart|heart pounding|fluttering in chest|irregular heartbeat)/i,
      /(বুক ধড়ফড়|বুক ধড়ফড় করে|হৃদস্পন্দন দ্রুত|বুক কাঁপা)/i,
      /(buk dhorfor|palpitation|racing heart)/i,
    ],
  },

  // 18. Dizziness & Syncope / Fainting
  {
    intent: 'SYNCOPE',
    priority: 86,
    patterns: [
      /(did you (faint|pass out|lose consciousness|black out)|syncope|collapse)/i,
      /(অজ্ঞান|বেহুঁশ|জ্ঞান হারিয়ে ফেলা|চোখে অন্ধকার দেখা)/i,
      /(oggan|behush|faint kora|pass out)/i,
    ],
  },
  {
    intent: 'DIZZINESS',
    priority: 84,
    patterns: [
      /(dizzy|dizziness|lightheaded|room spinning|vertigo)/i,
      /(মাথা ঘোরা|মাথা ঘোরে|মাথা ঝিমঝিম)/i,
      /(matha ghora|dizzy lage|lightheaded)/i,
    ],
  },

  // 19. Nausea & Vomiting
  {
    intent: 'VOMITING',
    priority: 85,
    patterns: [
      /(did you vomit|throwing up|emesis|how many times did you vomit|blood in vomit)/i,
      /(বমি হয়েছে|বমি|কতবার বমি|বমির সাথে রক্ত)/i,
      /(bomi hoyeche|vomiting|throwing up)/i,
    ],
  },
  {
    intent: 'NAUSEA',
    priority: 83,
    patterns: [
      /(feel nauseous|nausea|feeling sick to your stomach|queasy)/i,
      /(বমি বমি ভাব|গা গুলানো|বমি আসে আসে)/i,
      /(bomi bomi bhab|nausea lage)/i,
    ],
  },

  // 20. Past Medical History
  {
    intent: 'PAST_MEDICAL_HISTORY',
    priority: 78,
    patterns: [
      /(past medical history|any previous illnesses|high blood pressure|hypertension|diabetes|asthma|heart disease|kidney disease|chronic condition)/i,
      /(অতীতের রোগ|আগের কোনো অসুখ|উচ্চ রক্তচাপ|প্রেশার|ডায়াবেটিস|হাঁপানি|অসুখ-বিসুখ|আগে কখনো এমন হয়েছিল)/i,
      /(past history|age kono rog|hypertension|diabetes|pressure ache)/i,
    ],
  },

  // 21. Past Surgical History
  {
    intent: 'PAST_SURGICAL_HISTORY',
    priority: 78,
    patterns: [
      /(any surgeries|operations|hospitalizations|past surgical history|have you had surgery)/i,
      /(কোনো অপারেশন|সার্জারি|হাসপাতালে ভর্তি|কোনো অস্ত্রোপচার)/i,
      /(operation hoyeche|surgery hoyeche|hospital e vorti)/i,
    ],
  },

  // 22. Medication History
  {
    intent: 'MEDICATION',
    priority: 80,
    patterns: [
      /(what medications (are you taking|do you take)|current medicines|prescription|tablets|pills|taking any drugs)/i,
      /(কী কী ওষুধ খাচ্ছেন|নিয়মিত ওষুধ|কোনো ওষুধ খান|ট্যাবলেট|প্রেসক্রিপশন)/i,
      /(ki osudh khan|medication nichen|tablets khan)/i,
    ],
  },

  // 23. Allergy History
  {
    intent: 'ALLERGY',
    priority: 84,
    patterns: [
      /(any allergies|allergic to any (medicine|drug|food|penicillin)|allergic reaction)/i,
      /(অ্যালার্জি|এলার্জি|কোনো ওষুধ বা খাবারে অ্যালার্জি|পার্শ্বপ্রতিক্রিয়া)/i,
      /(allergy ache|alerji ache|kono osudhe allergy)/i,
    ],
  },

  // 24. Family History
  {
    intent: 'FAMILY_HISTORY',
    priority: 79,
    patterns: [
      /(family history|does anyone in your family (have|suffer)|parents|father|mother|brother|sister|heart disease in family)/i,
      /(পরিবারের ইতিহাস|পারিবারিক কোনো অসুখ|বাবা-মা|পরিবারে কারো হার্ট|বংশগত রোগ)/i,
      /(family history|poribare karo|baba ma|family te cardiac)/i,
    ],
  },

  // 25. Smoking & Alcohol (Social History)
  {
    intent: 'SMOKING',
    priority: 82,
    patterns: [
      /(do you smoke|cigarettes|tobacco|bidi|how many cigarettes|pack years)/i,
      /(ধূমপান করেন|সিগারেট খান|বিড়ি খান|তামাক খান|কতগুলো সিগারেট)/i,
      /(smoke koren|dhumpon koren|cigarette khan)/i,
    ],
  },
  {
    intent: 'ALCOHOL',
    priority: 82,
    patterns: [
      /(do you drink alcohol|how much alcohol|drinking habits)/i,
      /(মদ পান করেন|অ্যালকোহল|মদ্যপান)/i,
      /(drink koren|alcohol khan)/i,
    ],
  },
  {
    intent: 'SOCIAL_HISTORY',
    priority: 72,
    patterns: [
      /(what do you do for a living|your job|occupation|work|marital status|who do you live with|exercise|diet)/i,
      /(পেশা|কী কাজ করেন|চাকরি|ব্যবসায়ী|কার সাথে থাকেন|ব্যায়াম করেন|খাবারের অভ্যাস)/i,
      /(ki kaj koren|occupation ki|job ki|diet kemon)/i,
    ],
  },

  // 26. Menstrual & Pregnancy History (for relevant cases)
  {
    intent: 'MENSTRUAL_HISTORY',
    priority: 84,
    patterns: [
      /(last menstrual period|lmp|periods regular|menstrual cycle|pregnant|any chance of pregnancy)/i,
      /(শেষ মাসিকের তারিখ|মাসিক নিয়মিত|গর্ভবতী|প্রেগন্যান্ট)/i,
      /(lmp kobe|period regular|pregnant kina)/i,
    ],
  },

  // 27. Patient Concerns & Expectations (ICE)
  {
    intent: 'PATIENT_CONCERN',
    priority: 76,
    patterns: [
      /(what are you most worried about|any particular concerns|what are you thinking it might be)/i,
      /(সবচেয়ে বেশি কী নিয়ে দুশ্চিন্তা|ভয় পাচ্ছেন|আপনার কী মনে হয়)/i,
      /(ki niye chinta|worried keno|apnar ki mone hoy)/i,
    ],
  },

  // 28. Clarification / Follow-up / Ambiguous
  {
    intent: 'FOLLOW_UP',
    priority: 50,
    patterns: [
      /^(since when|where|how|and then|then what|anything else|is it constant|how bad)\??$/i,
      /^(কখন থেকে|কোথায়|কেমন|তারপর|আর কিছু|সবসময় থাকে)\??$/i,
      /^(since when|kothay|kemon|ar kichu)\??$/i,
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Multi-Question Splitter
// ────────────────────────────────────────────────────────────────────────────

function splitIntoClauses(text: string): string[] {
  // Split on commas, conjunctions ("and", "or", "আর", "এবং", "বা"), semicolons, question marks
  const normalized = text
    .replace(/[?।!,;]/g, ' | ')
    .replace(/\s+(and|or|আর|এবং|বা|also|plus)\s+/gi, ' | ');

  const clauses = normalized
    .split('|')
    .map(c => c.trim())
    .filter(c => c.length > 2);

  return clauses.length > 0 ? clauses : [text.trim()];
}

// ────────────────────────────────────────────────────────────────────────────
// Clinical Intent Detector Implementation
// ────────────────────────────────────────────────────────────────────────────

export class ClinicalQuestionIntentDetector {
  /**
   * Detects semantic clinical intents from student's query.
   * Supports multi-question detection and language-aware parsing.
   */
  public static detectIntents(
    question: string,
    currentContextTopic?: string
  ): IntentDetectionResult {
    const rawTrimmed = question.trim();
    const language = detectLanguage(rawTrimmed);
    const clauses = splitIntoClauses(rawTrimmed);

    const detectedIntentsSet = new Set<ClinicalIntent>();
    let isDirectDiagnosisQuery = false;
    const extractedKeywords: string[] = [];

    // Analyze whole text first for direct diagnosis queries and high-priority rules
    for (const rule of INTENT_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(rawTrimmed)) {
          detectedIntentsSet.add(rule.intent);
          if (rule.intent === 'DIRECT_DIAGNOSIS_QUERY') {
            isDirectDiagnosisQuery = true;
          }
          break;
        }
      }
    }

    // Then analyze individual clauses to catch multi-part questions (e.g. "ব্যথাটা কখন থেকে, কোথায় আর কতটা severe?")
    for (const clause of clauses) {
      for (const rule of INTENT_RULES) {
        for (const pattern of rule.patterns) {
          if (pattern.test(clause)) {
            detectedIntentsSet.add(rule.intent);
            break;
          }
        }
      }
    }

    // Resolve context-dependent follow-ups (e.g. "Since when?", "Where?", "Is it constant?")
    if (detectedIntentsSet.has('FOLLOW_UP') || detectedIntentsSet.size === 0) {
      const lower = rawTrimmed.toLowerCase();
      if (lower.includes('when') || lower.includes('কখন') || lower.includes('kobe') || lower.includes('since')) {
        detectedIntentsSet.delete('FOLLOW_UP');
        detectedIntentsSet.add('ONSET');
      } else if (lower.includes('where') || lower.includes('কোথায়') || lower.includes('kothay')) {
        detectedIntentsSet.delete('FOLLOW_UP');
        detectedIntentsSet.add('LOCATION');
      } else if (lower.includes('constant') || lower.includes('intermittent') || lower.includes('আসে আর যায়') || lower.includes('সবসময়')) {
        detectedIntentsSet.delete('FOLLOW_UP');
        detectedIntentsSet.add('TIMING');
      } else if (lower.includes('bad') || lower.includes('severe') || lower.includes('তীব্র') || lower.includes('স্কেল')) {
        detectedIntentsSet.delete('FOLLOW_UP');
        detectedIntentsSet.add('SEVERITY');
      } else if (lower.includes('else') || lower.includes('অন্য') || lower.includes('আর কিছু')) {
        detectedIntentsSet.delete('FOLLOW_UP');
        detectedIntentsSet.add('ASSOCIATED_SYMPTOMS');
      } else if (currentContextTopic) {
        // Inherit current context topic if available
        detectedIntentsSet.delete('FOLLOW_UP');
      }
    }

    // If still empty, check broad semantic categories
    if (detectedIntentsSet.size === 0) {
      const lower = rawTrimmed.toLowerCase();
      if (lower.includes('pain') || lower.includes('ব্যথা') || lower.includes('betha') || lower.includes('kosto') || lower.includes('hurt')) {
        detectedIntentsSet.add('CHARACTER');
      } else if (lower.includes('health') || lower.includes('condition') || lower.includes('illness')) {
        detectedIntentsSet.add('CHIEF_COMPLAINT');
      } else {
        detectedIntentsSet.add('OTHER');
      }
    }

    // Convert set to prioritized array
    const intentsList = Array.from(detectedIntentsSet);
    const sortedIntents = intentsList.sort((a, b) => {
      const ruleA = INTENT_RULES.find(r => r.intent === a);
      const ruleB = INTENT_RULES.find(r => r.intent === b);
      return (ruleB?.priority || 0) - (ruleA?.priority || 0);
    });

    const isMultiQuestion = sortedIntents.length > 1;
    const isAmbiguous = sortedIntents.length === 1 && sortedIntents[0] === 'OTHER' && rawTrimmed.split(/\s+/).length <= 3;

    return {
      intents: sortedIntents,
      confidence: sortedIntents.includes('OTHER') ? 0.5 : 0.9,
      detectedLanguage: language,
      isMultiQuestion,
      isAmbiguous,
      isDirectDiagnosisQuery,
      extractedKeywords,
    };
  }
}
