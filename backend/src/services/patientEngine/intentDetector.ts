import { ClinicalIntent, IntentDetectionResult, LanguageMode } from './types';

// ────────────────────────────────────────────────────────────────────────────
// Language Detection Helper
// ────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────
// Text Normalization Helper (Bengali Unicode NFC & Colloquial Variants)
// ────────────────────────────────────────────────────────────────────────────

export function normalizeInputText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFC")
    .replace(/\u09AF\u09BC/g, "\u09DF") // decomposed য় -> precomposed য়
    .replace(/\u09A1\u09BC/g, "\u09DC") // decomposed ড় -> precomposed ড়
    .replace(/\u09A2\u09BC/g, "\u09DD") // decomposed ঢ় -> precomposed ঢ়
    .replace(/ঔষধ/g, "ওষুধ")
    .replace(/এলার্জি/g, "অ্যালার্জি")
    .replace(/বয়েস/g, "বয়স")
    .replace(/বয়েস/g, "বয়স")
    .replace(/বয়স/g, "বয়স")
    .replace(/কতো/g, "কত")
    .replace(/কী/g, "কি")
    .replace(/যাবৎ/g, "যাবত")
    .replace(/হয়েছে/g, "হয়েছে")
    .replace(/কোথায়/g, "কোথায়")
    .replace(/ছড়িয়ে/g, "ছড়িয়ে")
    .replace(/পড়ে/g, "পড়ে")
    .replace(/দিয়ে/g, "দিয়ে")
    .replace(/ডায়াবেটিস/g, "ডায়াবেটিস")
    .replace(/নিয়মিত/g, "নিয়মিত")
    .replace(/ব্যাথা/g, "ব্যথা")
    .replace(/বেথা/g, "ব্যথা")
    .replace(/চক্ষু/g, "চোখ")
    .replace(/ডানপাশে/g, "ডান পাশে")
    .replace(/বামপাশে/g, "বাম পাশে")
    .replace(/মাঝামাঝি/g, "মাঝখানে")
    .trim();
}

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
    'koto', 'din', 'dhore', 'chorae', 'kom', 'beshi', 'doktor', 'doctor', 'bap', 'ma',
    'dhumpon', 'chinta', 'bhoy', 'pore', 'boyos', 'boyosh', 'boyes', 'naam', 'nam',
    'bomi', 'jwor', 'jor', 'paykhana', 'prosrab', 'khuda', 'ghum'
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
  priority: number;
  patterns: RegExp[];
}

const INTENT_RULES: IntentRule[] = [
  // 1. Direct Diagnosis Queries (High priority to avoid premature disclosure or coaching)
  {
    intent: 'DIRECT_DIAGNOSIS_QUERY',
    priority: 100,
    patterns: [
      /(do you have|is it|could it be|are you having|i think you have|do you suffer from) (myocardial infarction|heart attack|angina|stroke|appendicitis|cholecystitis|pneumonia|covid|cancer|tumor|pulmonary embolism|gerd|ulcer|asthma|migraine|meningitis|dengue)/i,
      /(আপনার কি|আপনি কি|এটা কি|মনে হয় আপনার|আপনার কি হয়েছে) (হার্ট অ্যাটাক|হার্ট এটাক|মায়োকার্ডিয়াল|অ্যাপেন্ডিসাইটিস|নিউমোনিয়া|ক্যান্সার|স্ট্রোক|আলসার|ডেঙ্গু)/i,
      /(heart attack|myocardial infarction|angina|appendicitis|pneumonia|stroke|cancer|dengue)\s*(hoyeche|naki|kina|mone hoy|bhabchen)?/i,
    ],
  },

  // 2. Unrelated Non-Medical Queries
  {
    intent: 'UNRELATED_QUERY',
    priority: 98,
    patterns: [
      /(capital of|prime minister|president of|weather today|who won the|fifa|cricket|football match|write a code|write a poem)/i,
      /(রাজধানী|প্রধানমন্ত্রী|রাষ্ট্রপতি|আবহাওয়া|খেলা|বিশ্বকাপ|ফুটবল|ক্রিকেট|সাপোর্ট|গান|কবিতা|রাজনীতি)/i,
      /(rajdhani ki|rajdhani kothay|prime minister|president|weather kemon)/i,
    ],
  },

  // 3. Patient Identity & Demographics (CRITICAL FIX)
  {
    intent: 'AGE',
    priority: 95,
    patterns: [
      /(how old are you|what is your age|your age|tell me your age|how old|age please|how many years old)/i,
      /(?:আপনার|তোমার|তোর|রোগীর|বলো|বলুন)?\s*(?:এবার\s*)?(?:বয়স|বয়েস|এজ|age|boyos|boyosh)\s*(?:কত|koto|বলবেন|বলো|বল|জানতে পারি)?/i,
      /(?:বয়স|বয়েস|এজ|age|boyos|boyosh).*(?:কত|koto)/i,
      /(?:কত|koto).*(?:বয়স|বয়েস|এজ|age|boyos|boyosh|বছর|bochor)/i,
      /(apnar|apni|tomar)?\s*(boyos|boyosh|boyes|age)\s*(koto|koth|bolben|hobe)?/i,
      /(koto\s*bochor\s*boyos|age\s*koto|koto\s*bochor)/i,
    ],
  },
  {
    intent: 'NAME',
    priority: 95,
    patterns: [
      /(what is your name|can i have your name|could you tell me your name|who are you|your full name)/i,
      /(আপনার|রোগীর)?\s*(নাম|নামটা)\s*(কি|কী|বলবেন|জানতে পারি)?/i,
      /(নাম\s*কী|নাম\s*কি|নামটা\s*কী)/i,
      /(apnar|apni)?\s*(nam|naam)\s*(ki|koto|bolben)?/i,
      /(apnar\s*name)/i,
    ],
  },
  {
    intent: 'SEX',
    priority: 92,
    patterns: [
      /(are you male or female|your gender|biological sex)/i,
      /(পুরুষ\s*নাকি\s*মহিলা|লিঙ্গ|জেন্ডার)/i,
      /(male\s*naki\s*female|purush\s*naki\s*mohela)/i,
    ],
  },
  {
    intent: 'OCCUPATION',
    priority: 92,
    patterns: [
      /(what do you do|what is your occupation|what is your job|what is your profession|where do you work|what kind of work)/i,
      /(কী|কি)?\s*(কাজ\s*করেন|কাজ\s*কী|পেশা|চাকরি|ব্যবসা|কাজের\s*ধরন|কোথায়\s*কাজ)/i, /(what do you do|what is your occupation|what is your job|what is your profession|where do you work|what kind of work)/i, /(ki\s*koren|ki\s*kaj|pesha|occupation)/i,
      /(ki\s*koren|ki\s*kaj\s*koren|pesha\s*ki|job\s*ki|occupation)/i,
    ],
  },
  {
    intent: 'MARITAL_STATUS',
    priority: 90,
    patterns: [
      /(are you married|marital status|do you have a spouse|are you single|who do you live with)/i,
      /(বিবাহিত|বিয়ে\s*করেছেন|বিয়েশাদী|সংসার|বিয়ে\s*হয়েছে)/i,
      /(bibahito|biye\s*korechen|married\s*naki)/i,
    ],
  },

  // 4. Introduction & Rapport
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

  // 5. Chief Complaint
  {
    intent: 'CHIEF_COMPLAINT',
    priority: 88,
    patterns: [
      /(what (?:is|are) your (?:(?:chief|main)\s+)?complaints?|what brings you (?:here|in today)|how can i help you|what seems to be the problem|what happened|what is the matter)/i,
      /(মূল\s*সমস্যা|প্রধান\s*সমস্যা|আজ\s*কেন\s*এসেছেন|কী\s*সমস্যা\s*নিয়ে|কী\s*অসুবিধা\s*হচ্ছে|কীভাবে\s*সাহায্য\s*করতে\s*পারি|কী\s*হয়েছে|কী\s*সমস্যা|আপনার\s*সমস্যা)/i,
      /(chief\s*complaint|main\s*somossa|ki\s*somossa|keno\s*eshechen|ki\s*hoyeche|apnar\s*somossa)/i,
    ],
  },

  // 6. SOCRATES: Duration
  {
    intent: 'DURATION',
    priority: 86,
    patterns: [
      /(how long|duration|for how many days|for how long|since when has this been going on|how many hours)/i,
      /(?:কতদিন|কতোদিন|কতক্ষণ|কত\s*সময়|কত\s*ঘণ্টা|কত\s*বছর)\s*(?:ধরে|যাবত|যাবৎ|হলো|হচ্ছে)?/i,
      /\b(?:কতদিন|কতোদিন|কত\s*দিন)\b/i,
      /(?:সমস্যা|কষ্ট|ব্যথা|অসুখ|এটা).*?(?:কতদিন|কতক্ষণ|কবেকার)/i,
      /(koto\s*din\s*dhore|kotodin\s*dhore|koto\s*din\s*holo|koto\s*somoy|how\s*long)/i,
    ],
  },

  // 7. SOCRATES: Onset
  {
    intent: 'ONSET',
    priority: 86,
    patterns: [
      /(when did it start|how did it begin|sudden or gradual|when did this first appear|when did you first feel)/i,
      /(?:কবে|কখন|কবেকার|কবে\s*থেকে|কখন\s*থেকে|কখন\s*শুরু|কবে\s*শুরু|কীভাবে\s*শুরু|কখন\s*প্রথম|কবে\s*প্রথম)/i,
      /(?:শুরু\s*(?:হয়েছে|হলো|হয়েছিল|কবে|কখন))/i,
      /(kobe\s*theke|kobe\s*shuru|kemon\s*kore\s*shuru|kokhon\s*theke)/i,
    ],
  },

  // 8. SOCRATES: Location
  {
    intent: 'LOCATION',
    priority: 85,
    patterns: [
      /(where is the pain|where does it hurt|show me where|location of the pain|which part|point to the pain|^where\??$|\bwhere\b|front or back|top of head|back of head|temple|forehead|vertex|occipital|which side)/i,
      /(?:কোথায়\s*(?:ব্যথা|কষ্ট|সমস্যা|হচ্ছে)|জায়গাটা\s*কোথায়|জায়গাটা\s*দেখান|কোন\s*জায়গায়|কোন\s*পাশে|ব্যথাটা\s*কোথায়|আঙুল\s*দিয়ে\s*দেখা|^কোথায়\??$|\bকোথায়\b)/i,
      /(?:মাথার\s*(?:উপরে|উপরের|পেছনে|পেছনের|সামনে|সামনের|মাঝামাঝি|মাঝখানে|ডান|বাম|একপাশে|দুপাশে|রগে|কপালে|পাশে))/i,
      /(?:সামনের\s*দিকে\s*(?:নাকি|বা)\s*পেছনের\s*দিকে|উপরে\s*(?:নাকি|বা)\s*পেছনে|ডান\s*(?:পাশে|দিকে)\s*নাকি\s*বাম|কোন\s*দিকে\s*(?:বেশি|কম)?\s*ব্যথা)/i,
      /(?:মাথার\s*(?:কোন|কোনো)\s*অংশে|ব্যাখ্যা\s*কর|বলতো|দেখান).*(?:ব্যথা|কষ্ট)/i,
      /(kothay\s*batha|kothay\s*betha|kothay\s*kosto|kon\s*jaygay|^kothay\??$|\bkothay\b|mathar\s*upore|mathar\s*pechone|mathar\s*samne|samne\s*naki\s*pechone)/i,
    ],
  },

  // 8b. Ocular & Eye Symptoms
  {
    intent: 'OCULAR_SYMPTOM',
    priority: 84,
    patterns: [
      /(eye pain|pain in eyes|pain behind eyes|vision problem|blur|blurred vision|photophobia|sensitive to light|seeing lights|flashing lights)/i,
      /(?:চোখ.*?(?:ব্যথা|টনটন|কষ্ট|ঝাপসা|জল)|চক্ষু.*?(?:ব্যথা|কষ্ট)|আলো.*?(?:লাগে|কষ্ট|সহ্য)|দৃষ্টিরs*সমস্যা|চক্ষু)/i,
      /(chokhe\s*batha|chokh\s*batha|chokher\s*pechone|alo\s*lagle|photophobia)/i,
    ],
  },

  // 8c. Meningism & Neck Symptoms
  {
    intent: 'MENINGISM',
    priority: 84,
    patterns: [
      /(stiff neck|neck stiffness|neck pain|difficulty bending neck|can you touch your chin to chest)/i,
      /(?:ঘাড়.*?(?:শক্ত|নাড়াতে|ব্যথা|টান|বাঁকাতে)|ঘাড়েs*ব্যথা)/i,
      /(ghar.*?shokto|ghar\s*batha|stiff\s*neck)/i,
    ],
  },

  // 8d. Trauma & Head Injury History
  {
    intent: 'TRAUMA_HISTORY',
    priority: 84,
    patterns: [
      /(head injury|head trauma|did you fall|hit your head|any accident|physical trauma)/i,
      /(?:মাথায়.*?(?:আঘাত|চোট|লেগেছে)|পড়েs*গিয়েছিলেন|কোনোs*দুর্ঘটনা|আঘাতs*লেগেছে|চোটs*লেগেছে)/i,
      /(mathay.*?aghat|mathay.*?chot|pore\s*gesilen|accident)/i,
    ],
  },

  // 8e. Neurological Screening (Red Flags)
  {
    intent: 'NEUROLOGICAL_SCREENING',
    priority: 84,
    patterns: [
      /(weakness|numbness|slurred speech|facial droop|tingling|seizures|convulsions|blackout)/i,
      /(?:হাতs*পা.*?(?:অবশ|দুর্বল|ঝিমঝিম)|অবশs*লাগে|কথা.*?(?:জড়িয়ে|আটকে)|মুখs*বাঁকা|খিঁচুনি|অসাড়)/i,
      /(obosh|kotha.*?joriye|weakness|numbness)/i,
    ],
  },

  // 8f. Phonophobia (Sound Sensitivity)
  {
    intent: 'PHONOPHOBIA',
    priority: 83,
    patterns: [
      /(sound bother|loud noise|noise make it worse|phonophobia|sensitive to noise)/i,
      /(?:শব্দ.*?(?:কষ্ট|সহ্য|যন্ত্রণা|অসহ্য)|আওয়াজ.*?(?:হলে|কষ্ট)|জোরেs*শব্দ|গোলমালs*হলে)/i,
      /(shobde.*?kosto|awaj.*?hole|sound\s*bother)/i,
    ],
  },

  // 9. SOCRATES: Character
  {
    intent: 'CHARACTER',
    priority: 85,
    patterns: [
      /(what does the pain feel like|describe the pain|character of the pain|is it sharp|is it dull|is it burning|crushing|throbbing|squeezing)/i,
      /(?:ব্যথাটা\s*কেমন|কেমন\s*ধরনের\s*ব্যথা|কেমন\s*ব্যথা|চাপ\s*চাপ|ধারালো|ব্যথার\s*ধরন|ব্যথার\s*প্রকৃতি|কেমন\s*ধরনের|কেমন\s*লাগে|চেপে\s*বসার)/i,
      /(batha\s*ta\s*kemon|kemon\s*dhoroner|kemon\s*batha|sharp\s*naki\s*dull)/i,
    ],
  },

  // 10. SOCRATES: Severity
  {
    intent: 'SEVERITY',
    priority: 85,
    patterns: [
      /(how severe|scale of 1 to 10|rate the pain|out of 10|how bad is it|severity|intensity|\bsevere\b)/i,
      /(?:কতটা\s*তীব্র|কেমন\s*তীব্র|১০\s*এর\s*মধ্যে|১\s*থেকে\s*১০|কতটুকু\s*কষ্ট|তীব্রতা|তীব্র\s*ব্যথা|স্কেলে|(কতটা|কেমন)\s*(?:severe|bad|খারাপ))/i,
      /(koto\s*severe|1\s*theke\s*10|koto\s*tibro|koto\s*beshi|koto\s*kharap)/i,
    ],
  },

  // 11. SOCRATES: Radiation
  {
    intent: 'RADIATION',
    priority: 85,
    patterns: [
      /(does (?:the pain|it) (?:radiate|spread|move|go|travel|shoot)(?:\s+anywhere|\s+to)?|spread to back|spread to arm|spread to jaw|spread to shoulder|does it go anywhere|go anywhere)/i,
      /(?:ব্যথা\s*কি\s*অন্য\s*কোথাও|ছড়িয়ে\s*(?:পড়ে|যায়|পড়ছে)|অন্য\s*কোথাও\s*(?:ছড়ায়|যায়|পৌঁছায়)|পিঠে\s*যায়|ঘাড়ে\s*যায়|হাতে\s*যায়|সেখান\s*থেকে\s*কি\s*অন্য\s*কোথাও)/i,
      /\b(?:ছড়ায়|ছড়িয়ে|ছড়িয়ে\s*পড়ে|radiate|spread)\b/i,
      /(onno\s*kothay\s*jay|chorae|chhoray|spread\s*kore|radiation|go\s*anywhere)/i,
    ],
  },

  // 12. SOCRATES: Aggravating Factors
  {
    intent: 'AGGRAVATING_FACTORS',
    priority: 84,
    patterns: [
      /(what makes (?:it|the (?:pain|discomfort|symptom)|this)? (?:worse|aggravate|aggravated|bad)|what aggravates|does anything worsen|worse on exertion|worse after eating|worse with)/i,
      /(?:কিসে(?:\s+(?:ব্যথা|কষ্ট|সমস্যা))?\s*বাড়ে|কিসে\s*বৃদ্ধি|হাঁটলে\s*বাড়ে|খেলে\s*বাড়ে|কাশি\s*দিলে\s*বাড়ে|নড়াচড়া\s*করলে\s*বাড়ে|ওটা\s*কি\s*খাওয়ার\s*পরে\s*বাড়ে|বেড়ে\s*যায়|কী\s*করলে.*?বাড়ে)/i,
      /(kishe\s*bare|kiser\s*por\s*bare|khabar\s*por\s*bare|hatle\s*bare|worse\s*hoy|makes\s*worse)/i,
    ],
  },

  // 13. SOCRATES: Relieving Factors
  {
    intent: 'RELIEVING_FACTORS',
    priority: 84,
    patterns: [
      /(what makes (?:it|the (?:pain|discomfort|symptom)|this)? (?:better|relieve|relieved|improve)|what eases|does anything relieve|better with rest|better with medicine|does anything ease)/i,
      /(?:কিসে(?:\s+(?:একটু|কিছুটা))?\s*(?:আরাম|শান্তি|উপশম)|কিসে(?:\s+(?:ব্যথা|কষ্ট|সমস্যা))?\s*কমে|বিশ্রামে\s*কমে|ওষুধ\s*খেলে\s*কমে|কী\s*করলে.*?কমে|কষ্ট\s*কমে)/i,
      /(kishe\s*kome|aram\s*lage|rest\s*nile\s*kome|better\s*hoy|makes\s*better)/i,
    ],
  },

  // 14. SOCRATES: Timing & Frequency
  {
    intent: 'TIMING',
    priority: 83,
    patterns: [
      /(is it constant|does it come and go|intermittent|worse at night|what time of day|how often does it occur)/i,
      /(সবসময়\s*থাকে|আসে\s*আর\s*যায়|দিনে\s*নাকি\s*রাতে|সারাদিন\s*থাকে|নির্দিষ্ট\s*কোনো\s*সময়ে|কতবার\s*হয়)/i,
      /(shob\s*shomoy\s*thake|ashe\s*ar\s*jay|constant\s*naki|come\s*and\s*go)/i,
    ],
  },

  // 15. SOCRATES: Progression
  {
    intent: 'PROGRESSION',
    priority: 83,
    patterns: [
      /(is it getting worse|is it progressing|getting better or worse|has it changed over time|increasing in pain)/i,
      /(আস্তে\s*আস্তে\s*বাড়ছে|ব্যথা\s*কি\s*বাড়ছে|আগের\s*চেয়ে\s*খারাপ|উন্নতি\s*হচ্ছে|দিন\s*দিন\s*বাড়ছে)/i,
      /(barchhe\s*naki|agertheke\s*kharap|getting\s*worse|progression)/i,
    ],
  },

  // 16. Associated Symptoms General
  {
    intent: 'ASSOCIATED_SYMPTOMS',
    priority: 82,
    patterns: [
      /(any other symptoms|anything else associated|along with this|associated problems|any other complaints)/i,
      /(আর\s*কোনো\s*সমস্যা|অন্য\s*কোনো\s*অসুবিধা|এর\s*সাথে\s*আর\s*কি|আর\s*কিছু\s*হয়)/i,
      /(ar\s*kono\s*somossa|ar\s*kichu\s*ache|associated\s*kichu)/i,
    ],
  },

  // 17. Review of Systems: Fever
  {
    intent: 'FEVER',
    priority: 82,
    patterns: [
      /(do you have a fever|high temperature|chills|shivering|feverish|cold shakes)/i,
      /(?:জ্বর|জর|গা\s*গরম|তাপমাত্রা|কাঁপুনি|রাতে\s*ঘাম|fever|temperature)/i,
      /(jwor\s*ache|jor\s*ache|ga\s*gorom|temperature|chills)/i,
    ],
  },

  // 18. Review of Systems: Nausea
  {
    intent: 'NAUSEA',
    priority: 82,
    patterns: [
      /(do you feel nauseous|nausea|feel like vomiting|sick to your stomach|queasy)/i,
      /(?:বমি\s*ভাব|বমি\s*বমি|গা\s*গোলানো|খাওয়ার\s*রুচি\s*কমে|ক্ষুধা\s*কমে|রুচি\s*কমে)/i,
      /(bomi\s*bomi\s*bhab|bomi\s*bhab|nausea)/i,
    ],
  },

  // 19. Review of Systems: Vomiting
  {
    intent: 'VOMITING',
    priority: 82,
    patterns: [
      /(have you vomited|did you throw up|how many times vomiting|blood in vomit|vomiting)/i,
      /(বমি\s*হয়েছে|বমি\s*করেছেন|কয়বার\s*বমি|বমির\s*সাথে\s*কি|বমি\s*হয়)/i,
      /(bomi\s*hoyeche|bomi\s*korechen|throw\s*up|vomit)/i,
    ],
  },

  // 20. Review of Systems: Bowel Habits (Diarrhea / Constipation)
  {
    intent: 'BOWEL_HABITS',
    priority: 82,
    patterns: [
      /(bowel movements|diarrhea|constipation|blood in stool|black stool|loose stools|passing gas|bowel habits)/i,
      /(পায়খানা\s*কেমন|পায়খানা\s*স্বাভাবিক|ডায়রিয়া|কোষ্ঠকাঠিন্য|মলত্যাগে\s*সমস্যা|রক্ত\s*পায়খানা|কালো\s*পায়খানা|পেট\s*খারাপ)/i,
      /(paykhana\s*kemon|diarrhea|constipation|loose\s*motion|stool)/i,
    ],
  },

  // 21. Review of Systems: Urinary
  {
    intent: 'URINARY_SYMPTOMS',
    priority: 82,
    patterns: [
      /(any burning when urinating|painful urination|blood in urine|frequency of urination|urinary problems|difficulty peeing)/i,
      /(প্রস্রাব|প্রস্রাবে|ইউরিন|urine).*?(জ্বালাপোড়া|কষ্ট|সমস্যা|ব্যথা|রক্ত|ঘন\s*ঘন|কেমন)?/i,
      /(prosrab\s*kemon|prosrab\s*e\s*jalapora|urinary\s*problem|urine)/i,
    ],
  },

  // 22. Review of Systems: Appetite & Weight
  {
    intent: 'APPETITE',
    priority: 81,
    patterns: [
      /(how is your appetite|loss of appetite|weight loss|eating well|lost any weight)/i,
      /(ক্ষুধা\s*কেমন|খাবারের\s*রুচি|ওজন\s*কমেছে|রুচি\s*আছে|খাওয়া\s*দাওয়া\s*কেমন)/i,
      /(khuda\s*kemon|ruchi\s*kemon|weight\s*loss|appetite)/i,
    ],
  },

  // 23. Review of Systems: Cough & Breathing
  {
    intent: 'COUGH',
    priority: 80,
    patterns: [
      /(do you have a cough|coughing up phlegm|blood in cough|dry cough)/i,
      /(কাশি\s*আছে|কফ\s*পড়ে|শুকনো\s*কাশি|রক্ত\s*কাশি)/i,
      /(kashi\s*ache|kof|cough)/i,
    ],
  },
  {
    intent: 'BREATHING',
    priority: 80,
    patterns: [
      /(shortness of breath|difficulty breathing|breathless|struggling to breathe|dyspnea|gasping|wheezing)/i,
      /(?:শ্বাসকষ্ট|শ্বাস\s*নিতে\s*কষ্ট|দম\s*আটকে|দম\s*ফুরিয়ে|বুকে\s*চাপ\s*অনুভব|হাঁপিয়ে)/i,
      /(shashkosto|shash\s*nitethe\s*kosto|breathless|dyspnea)/i,
    ],
  },

  // 24. Review of Systems: Palpitations & Syncope
  {
    intent: 'PALPITATION',
    priority: 80,
    patterns: [
      /(heart racing|palpitations|fluttering in chest|pounding heart|irregular heartbeat)/i,
      /(বুক\s*ধড়ফড়|বুক\s*লাফায়|হৃৎস্পন্দন|বুক\s*কাপে)/i,
      /(buk\s*dhorfor|palpitation|racing\s*heart)/i,
    ],
  },
  {
    intent: 'SYNCOPE',
    priority: 80,
    patterns: [
      /(faint|passed out|blackout|collapse|lose consciousness|loss of consciousness)/i,
      /(অজ্ঞান\s*হয়ে|বেহুঁশ\s*হয়ে|চোখে\s*অন্ধকার|জ্ঞান\s*হারিয়ে)/i,
      /(ogyan|behush|faint|blackout)/i,
    ],
  },
  {
    intent: 'DIZZINESS',
    priority: 80,
    patterns: [
      /(dizzy|lightheaded|room spinning|vertigo|unsteady|fatigue|tired)/i,
      /(?:মাথা\s*ঘোরে|মাথা\s*ঘোরা|মাথা\s*চক্কর|মাথা\s*ঘুরছে|অতিরিক্ত\s*ক্লান্তি|ক্লান্তি\s*লাগছে)/i,
      /(matha\s*ghore|dizzy|lightheaded)/i,
    ],
  },

  // 25. Past Medical History
  {
    intent: 'PAST_MEDICAL_HISTORY',
    priority: 78,
    patterns: [
      /(past medical history|chronic conditions|diabetes|hypertension|high blood pressure|asthma|heart disease|previous illness)/i,
      /(আগে\s*কোনো\s*অসুখ|ডায়াবেটিস|উচ্চ\s*রক্তচাপ|প্রেশার|হাঁপানি|হার্টের\s*সমস্যা|আগের\s*রোগ|পুরনো\s*রোগ)/i,
      /(past\s*medical|diabetes|pressure\s*ache|ager\s*kono\s*rog)/i,
    ],
  },

  // 26. Past Surgical History
  {
    intent: 'PAST_SURGICAL_HISTORY',
    priority: 78,
    patterns: [
      /(any past surgeries|have you had any operations|previous surgeries|admitted to hospital before|surgical history)/i,
      /(আগে\s*কোনো\s*অপারেশন|কোনো\s*সার্জারি|হাসপাতালে\s*ভর্তি\s*হয়েছিলেন|অপারেশন\s*হয়েছিল)/i,
      /(kono\s*operation\s*hoyeche|surgery\s*hoyeche|hospital\s*e\s*bhorti)/i,
    ],
  },

  // 27. Medications
  {
    intent: 'MEDICATION',
    priority: 78,
    patterns: [
      /(what medications do you take|any regular medicines|prescriptions|any pills|taking any tablets|any inhalers)/i,
      /(?:নিয়মিত\s*কোনো\s*ওষুধ|কী\s*কী\s*ওষুধ|ওষুধের\s*নাম|প্রেসক্রিপশন|কী\s*ওষুধ|ইনহেলার|ওষুধ\s*খান|ওষুধ.*ব্যবহার)/i,
      /(kono\s*osudh\s*khan|regular\s*medicine|ki\s*ki\s*osudh|inhaler)/i,
    ],
  },

  // 28. Allergies
  {
    intent: 'ALLERGY',
    priority: 78,
    patterns: [
      /(any allergies|allergic to any medications|food allergies|drug allergy|allergic)/i,
      /(?:অ্যালার্জি|এলার্জি|allergy|allergic)/i,
      /(কোনো\s*অ্যালার্জি|ওষুধে\s*অ্যালার্জি|খাবারে\s*অ্যালার্জি|এলার্জি\s*আছে)/i,
      /(kono\s*allergy\s*ache|allergic\s*kina|allergy)/i,
    ],
  },

  // 29. Family History
  {
    intent: 'FAMILY_HISTORY',
    priority: 78,
    patterns: [
      /(family history|does anyone in your family have|hereditary diseases|parents|family members)/i,
      /(পরিবারে(?:\s*(?:কারো|কারও|কেউ|কোনো|এমন))|বংশগত|বংশে|বাবা\s*বা\s*মায়ের|পরিবারের\s*(?:কেউ|কারো|কারও)|পরিবারে)/i,
      /(poribare\s*karo|family\s*history|baba\s*ma)/i,
    ],
  },

  // 30. Social History: Smoking & Alcohol
  {
    intent: 'SMOKING',
    priority: 77,
    patterns: [
      /(do you smoke|how many cigarettes|pack years|tobacco|do you use tobacco)/i,
      /(?:ধূমপান|সিগারেট|বিড়ি|জর্দা|গুল|তামাক|তামাকের|ধূমপানের|তামাকজাতীয়)/i,
      /(dhumpon\s*koren|cigarette\s*khan|smoke\s*koren)/i,
    ],
  },
  {
    intent: 'ALCOHOL',
    priority: 77,
    patterns: [
      /(do you drink alcohol|how much alcohol|alcohol consumption|do you drink)/i,
      /(মদ্যপান\s*করেন|মদ\s*খান|অ্যালকোহল|মদ)/i,
      /(mod\s*khan|alcohol\s*koren|drink\s*koren)/i,
    ],
  },
  {
    intent: 'SOCIAL_HISTORY',
    priority: 76,
    patterns: [
      /(who do you live with|where do you live|social history|home environment|living situation)/i,
      /(কোথায়\s*থাকেন|কার\s*সাথে\s*থাকেন|জীবনযাপন|পরিবেশ|বাসা\s*কোথায়)/i,
      /(kothay\s*thaken|kar\s*shathe\s*thaken|social\s*history)/i,
    ],
  },
  {
    intent: 'DIET',
    priority: 76,
    patterns: [
      /(what is your diet like|what kind of food do you eat|fatty foods|dietary habits)/i,
      /(খাওয়াদাওয়া\s*কেমন|কী\s*ধরনের\s*খাবার\s*খান|চর্বিযুক্ত\s*খাবার|বাইরের\s*খাবার)/i,
      /(khawa\s*dawa\s*kemon|ki\s*dhoroner\s*khabar|diet)/i,
    ],
  },
  {
    intent: 'SLEEP',
    priority: 76,
    patterns: [
      /(how do you sleep|trouble sleeping|insomnia|how many hours of sleep)/i,
      /(ঘুম\s*কেমন\s*হয়|রাতে\s*ঘুম\s*আসে|ঘুমের\s*সমস্যা|ঘুম)/i,
      /(ghum\s*kemon\s*hoy|sleep\s*kemon)/i,
    ],
  },

  // 31. Previous Episodes & Treatment History
  {
    intent: 'PREVIOUS_EPISODES',
    priority: 75,
    patterns: [
      /(has this happened before|any previous episodes|first time or had it before|ever had this before)/i,
      /(আগে\s*কখনো\s*এমন\s*হয়েছিল|আগেও\s*কি\s*হয়েছিল|প্রথমবার\s*নাকি\s*আগেও|আগে\s*কখনও)/i,
      /(age\s*kono\s*din\s*erokom|first\s*time\s*naki|age\s*hoyeche)/i,
    ],
  },
  {
    intent: 'TREATMENT_HISTORY',
    priority: 75,
    patterns: [
      /(have you taken any medicine for this|did you see any doctor for this|any treatment so far|taken anything for the pain)/i,
      /(এই\s*সমস্যার\s*জন্য\s*কোনো\s*ওষুধ\s*খেয়েছেন|কোনো\s*ডাক্তার\s*দেখিয়েছিলেন|কিছু\s*খেয়েছেন)/i,
      /(ei\s*somossar\s*jonno\s*kono\s*osudh|kono\s*treatment\s*nisen)/i,
    ],
  },

  // 32. Patient Ideas, Concerns, Expectations (ICE)
  {
    intent: 'PATIENT_CONCERN',
    priority: 74,
    patterns: [
      /(what are you most worried about|any particular concerns|what are you afraid it might be|any fears)/i,
      /(কোনো\s*দুশ্চিন্তা|কী\s*ভয়\s*পাচ্ছেন|সবচেয়ে\s*বেশি\s*কী\s*ভয়|ভয়\s*পাচ্ছেন)/i,
      /(kono\s*chinta\s*ache|ki\s*bhoy\s*pachhen|worried\s*kina)/i,
    ],
  },
  {
    intent: 'PATIENT_EXPECTATION',
    priority: 74,
    patterns: [
      /(what are your expectations today|what do you hope we can do for you|how can we help you most)/i,
      /(আজকে\s*কী\s*আশা\s*করছেন|কীভাবে\s*সাহায্য\s*করতে\s*পারি|কী\s*চাচ্ছেন)/i,
      /(ki\s*asha\s*korchen|ki\s*chachhen)/i,
    ],
  },

  // 33. Follow-up short questions
  {
    intent: 'FOLLOW_UP',
    priority: 50,
    patterns: [
      /^(since when|where|how|and then|then what|anything else|is it constant|how bad)\??$/i,
      /^(কখন থেকে|কোথায়|কেমন|তারপর|আর কিছু|সবসময় থাকে|সেখান থেকে কি|ওটা কি)\??$/i,
      /^(since when|kothay|kemon|ar kichu)\??$/i,
    ],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Multi-Question Splitter
// ────────────────────────────────────────────────────────────────────────────

function splitIntoClauses(text: string): string[] {
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
   * Supports multi-question detection, language-aware parsing, and contextual follow-ups.
   */
  public static detectIntents(
    question: string,
    currentContextTopic?: string
  ): IntentDetectionResult {
    const rawTrimmed = question.trim();
    const normalizedText = normalizeInputText(rawTrimmed);
    const language = detectLanguage(normalizedText);
    const clauses = splitIntoClauses(normalizedText);

    const detectedIntentsSet = new Set<ClinicalIntent>();
    let isDirectDiagnosisQuery = false;
    const extractedKeywords: string[] = [];

    // 1. Analyze whole text for high-priority rules
    for (const rule of INTENT_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(rawTrimmed) || pattern.test(normalizedText)) {
          detectedIntentsSet.add(rule.intent);
          if (rule.intent === 'DIRECT_DIAGNOSIS_QUERY') {
            isDirectDiagnosisQuery = true;
          }
          break;
        }
      }
    }

    // 2. Analyze individual clauses to catch multi-part questions
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

    // 3. Resolve contextual follow-up pronouns and short questions
    const lower = rawTrimmed.toLowerCase();
    
    // Example: "সেখান থেকে কি অন্য কোথাও যায়?" (Radiation follow-up)
    if (lower.includes('সেখান থেকে') || lower.includes('অন্য কোথাও যায়') || lower.includes('spreads from there') || lower.includes('moves from there')) {
      detectedIntentsSet.delete('FOLLOW_UP');
      detectedIntentsSet.add('RADIATION');
    }

    // Example: "ওটা কি খাওয়ার পরে বাড়ে?" (Aggravating factor follow-up)
    if ((lower.includes('ওটা') || lower.includes('it')) && (lower.includes('বাড়ে') || lower.includes('worse') || lower.includes('কমে') || lower.includes('better'))) {
      detectedIntentsSet.delete('FOLLOW_UP');
      if (lower.includes('বাড়ে') || lower.includes('worse')) {
        detectedIntentsSet.add('AGGRAVATING_FACTORS');
      } else {
        detectedIntentsSet.add('RELIEVING_FACTORS');
      }
    }

    // Resolve general short follow-ups
    if (detectedIntentsSet.has('FOLLOW_UP') || detectedIntentsSet.size === 0) {
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
      }
    }

    // If still empty, mark as OTHER
    if (detectedIntentsSet.size === 0) {
      detectedIntentsSet.add('OTHER');
    }

    if (detectedIntentsSet.has('UNRELATED_QUERY')) {
      return {
        intents: ['UNRELATED_QUERY'],
        confidence: 0.99,
        detectedLanguage: language,
        isMultiQuestion: false,
        isAmbiguous: false,
        isDirectDiagnosisQuery: false,
        extractedKeywords,
      };
    }

    const finalIntents = Array.from(detectedIntentsSet);

    return {
      intents: finalIntents,
      confidence: finalIntents.includes('OTHER') ? 0.3 : 0.95,
      detectedLanguage: language,
      isMultiQuestion: finalIntents.length > 1,
      isAmbiguous: finalIntents.includes('OTHER') && rawTrimmed.split(/\s+/).length <= 3,
      isDirectDiagnosisQuery,
      extractedKeywords,
    };
  }
}
