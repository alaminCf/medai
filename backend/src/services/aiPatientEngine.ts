import OpenAI from 'openai';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'mock';

export type PatientEmotion =
  | 'neutral'
  | 'calm'
  | 'concerned'
  | 'anxious'
  | 'sad'
  | 'confused'
  | 'relieved';

export interface PatientCaseContext {
  patientName: string;
  patientAge: number;
  patientGender: string;
  chiefComplaint: string;
  personality: string;
  language?: string; // 'en' | 'bn'
  medicalHistory?: string;
  medicationHistory?: string;
  allergyHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  symptomDetails?: string;
}

export interface ConversationTurn {
  role: 'student' | 'patient';
  content: string;
}

export interface AIPatientResponse {
  message: string;
  provider: AIProvider;
  emotion: PatientEmotion;
  intensity: number; // 0.0 to 1.0 (clamped)
}

// ────────────────────────────────────────────────────────────────────────────
// Emotion Analysis Layer
// ────────────────────────────────────────────────────────────────────────────

const ALLOWED_EMOTIONS: PatientEmotion[] = [
  'neutral',
  'calm',
  'concerned',
  'anxious',
  'sad',
  'confused',
  'relieved',
];

export function analyzePatientEmotion(
  text: string,
  personality: string,
  query: string
): { emotion: PatientEmotion; intensity: number } {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let emotion: PatientEmotion = 'neutral';
  let intensity = 0.3;

  // Base emotion from personality
  if (personality === 'anxious') {
    emotion = 'anxious';
    intensity = 0.45;
  } else if (personality === 'calm') {
    emotion = 'calm';
    intensity = 0.3;
  } else if (personality === 'confused') {
    emotion = 'confused';
    intensity = 0.4;
  }

  // Contextual shifts based on dialogue keywords
  if (
    lowerText.includes('worried') ||
    lowerText.includes('scared') ||
    lowerText.includes('duhs चिंता') ||
    lowerText.includes('দুশ্চিন্তা') ||
    lowerText.includes('ভয়') ||
    lowerText.includes('বুক ধড়ফড়') ||
    lowerText.includes('serious')
  ) {
    emotion = 'anxious';
    intensity = Math.max(intensity, 0.55);
  } else if (
    lowerText.includes('pain') ||
    lowerText.includes('hurts') ||
    lowerText.includes('severe') ||
    lowerText.includes('কষ্ট') ||
    lowerText.includes('ব্যথা') ||
    lowerText.includes('অসহ্য')
  ) {
    emotion = 'concerned';
    intensity = Math.max(intensity, 0.5);
  } else if (
    lowerText.includes('not sure') ||
    lowerText.includes('don\'t know') ||
    lowerText.includes('নিশ্চিত নই') ||
    lowerText.includes('মনে নেই')
  ) {
    emotion = 'confused';
    intensity = Math.max(intensity, 0.4);
  } else if (
    lowerText.includes('better') ||
    lowerText.includes('thank you') ||
    lowerText.includes('ধন্যবাদ') ||
    lowerText.includes('একটু ভালো')
  ) {
    emotion = 'relieved';
    intensity = 0.35;
  }

  // Ensure validity and clamping
  if (!ALLOWED_EMOTIONS.includes(emotion)) {
    emotion = 'neutral';
  }
  const clampedIntensity = Math.max(0.0, Math.min(1.0, intensity));

  return { emotion, intensity: clampedIntensity };
}

// ────────────────────────────────────────────────────────────────────────────
// System prompt builder
// ────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(caseContext: PatientCaseContext): string {
  const isBangla = caseContext.language === 'bn';

  const personalityInstructionsEn: Record<string, string> = {
    calm: 'You speak calmly and clearly. You are cooperative and answer questions thoughtfully. You are not overly emotional.',
    anxious: 'You are clearly worried and anxious about your symptoms. You speak with some urgency. You may ask the doctor questions back like "Is it serious, doctor?" or "Should I be worried?". You are cooperative but visibly concerned.',
    talkative: 'You are naturally talkative. You tend to give extra details and sometimes go on tangents before getting to the main point. You are friendly and open.',
    quiet: 'You are reserved and speak briefly. You answer only what is asked. You are not unfriendly but you are a person of few words.',
    confused: 'You are somewhat confused about some details. You may mix up dates or be unsure about some information. You do your best to help.',
    frustrated: 'You have been waiting and are slightly frustrated. You are cooperative but you want answers quickly.',
  };

  const personalityInstructionsBn: Record<string, string> = {
    calm: 'আপনি শান্তভাবে এবং স্পষ্টভাবে কথা বলেন। আপনি ডাক্তারের প্রতি সহযোগিতাপূর্ণ এবং চিন্তাভাবনা করে উত্তর দেন।',
    anxious: 'আপনি আপনার শারীরিক লক্ষণ নিয়ে বেশ উদ্বিগ্ন ও চিন্তিত। আপনি কিছুটা আতঙ্কের সুরে কথা বলেন এবং মাঝে মাঝে ডাক্তারকে জিজ্ঞাসা করেন: "ডাক্তার সাহেব, রোগটা কি খুব জটিল?" বা "আমার কি ভয় পাওয়ার কিছু আছে?"।',
    talkative: 'আপনি বেশি কথা বলতে পছন্দ করেন। মূল বিষয়ে আসার আগে আপনি একটু আশেপাশে কথা বা অতিরিক্ত গল্প জুড়ে দেন, তবে অমায়িক।',
    quiet: 'আপনি কম কথা বলেন। শুধু যতটুকু জানতে চাওয়া হয় ঠিক ততটুকুই সংক্ষেপে বলেন।',
    confused: 'আপনি তারিখ বা সময়ের ব্যাপারে কিছুটা বিভ্রান্ত বা নিশ্চিত নন। তবে ডাক্তারকে সাহায্য করার চেষ্টা করেন।',
    frustrated: 'আপনি বেশিক্ষণ অপেক্ষা করায় কিছুটা বিরক্ত, তবে ডাক্তারের প্রশ্নের উত্তর দ্রুত ও স্পষ্ট পেতে চান।',
  };

  if (isBangla) {
    const personalityStyle = personalityInstructionsBn[caseContext.personality] || personalityInstructionsBn['calm'];

    return `আপনি একজন বাস্তব রোগী, আপনার নাম ${caseContext.patientName}, বয়স ${caseContext.patientAge} বছর, লিঙ্গ ${caseContext.patientGender}। আপনি একজন মেডিকেল স্টুডেন্ট ডাক্তারের সাথে সাধারণ বাংলায় সামনা-সামনি কথা বলছেন।

ব্যক্তিত্ব ও স্বভাব: ${personalityStyle}

আপনার প্রধান সমস্যা (Chief Complaint): ${caseContext.chiefComplaint}

আপনার স্বাস্থ্য বিষয়ক তথ্য (যা কেবল আপনি নিজের শরীর সম্পর্কে জানেন):
${caseContext.symptomDetails ? `- আপনার শারীরিক লক্ষণ: ${caseContext.symptomDetails}` : ''}
${caseContext.medicalHistory ? `- আপনার অতীতের অসুস্থতা: ${caseContext.medicalHistory}` : ''}
${caseContext.medicationHistory ? `- আপনি যেসব ওষুধ খান: ${caseContext.medicationHistory}` : ''}
${caseContext.allergyHistory ? `- আপনার অ্যালার্জি: ${caseContext.allergyHistory}` : ''}
${caseContext.familyHistory ? `- পরিবারের স্বাস্থ্য ইতিহাস: ${caseContext.familyHistory}` : ''}
${caseContext.socialHistory ? `- আপনার জীবনযাত্রা ও পেশা: ${caseContext.socialHistory}` : ''}

অত্যন্ত গুরুত্বপূর্ণ নিয়মাবলী (কঠোরভাবে মেনে চলুন):
১. আপনি কোনো ডাক্তার বা মেডিকেল বিশেষজ্ঞ নন। আপনি কেবল একজন সাধারণ অসুস্থ রোগী।
২. আপনার রোগ বা ডায়াগনোসিস কী তা আপনি জানেন না।
৩. আপনি অবশ্যই স্বাভাবিক, কথ্য দৈনন্দিন বাংলা ভাষায় কথা বলবেন। কোনো মেডিকেল বা কঠিন পুঁথিগত ভাষা ব্যবহার করবেন না।
৪. আপনার উত্তরগুলো সবসময় সংক্ষিপ্ত ও স্বাভাবিক রাখুন (সাধারণত ১ থেকে ৩ বাক্যের মধ্যে)।
৫. একসাথে আপনার সমস্ত অতীত ইতিহাস বা লক্ষণ বলে ফেলবেন না। ডাক্তার প্রশ্ন করলে যতটুকু প্রাসঙ্গিক কেবল ততটুকুই ধীরে ধীরে প্রকাশ করুন।
৬. আপনার প্রদত্ত তথ্যের সাথে সবসময় সামঞ্জস্য বজায় রাখুন। এমন কোনো তথ্য বানাবেন না যা আপনার পূর্ববর্তী কথার বিপরীত হয়।
৭. ডাক্তার যদি এমন কিছু জানতে চায় যা একজন সাধারণ রোগীর জানার কথা নয়, তবে সহজভাবে বলুন: "ডাক্তার সাহেব, আমি ঠিক নিশ্চিত নই" বা "আমি এটার মানে বুঝি না।"
৮. কখনোই কোনো কাল্পনিক ডায়াগনোসিস প্রকাশ করবেন না।
৯. ডাক্তারকে কোনো পরামর্শ বা গাইড করবেন না।
১০. সবসময় রোগীর চরিত্রে থাকুন।

মনে রাখবেন: আপনি ${caseContext.patientName}, অসুস্থ এবং ডাক্তারের কাছে সাহায্য ও চিকিৎসা পাওয়ার আশায় এসেছেন।`;
  }

  // English System Prompt
  const personalityStyle = personalityInstructionsEn[caseContext.personality] || personalityInstructionsEn['calm'];

  return `You are roleplaying as a real patient named ${caseContext.patientName}, a ${caseContext.patientAge}-year-old ${caseContext.patientGender.toLowerCase()}, speaking with a medical student doctor.

PERSONALITY: ${personalityStyle}

CHIEF COMPLAINT: ${caseContext.chiefComplaint}

YOUR MEDICAL CONTEXT (what you as the patient know):
${caseContext.symptomDetails ? `- Your symptoms: ${caseContext.symptomDetails}` : ''}
${caseContext.medicalHistory ? `- Your past health: ${caseContext.medicalHistory}` : ''}
${caseContext.medicationHistory ? `- Your medications: ${caseContext.medicationHistory}` : ''}
${caseContext.allergyHistory ? `- Your allergies: ${caseContext.allergyHistory}` : ''}
${caseContext.familyHistory ? `- Your family health: ${caseContext.familyHistory}` : ''}
${caseContext.socialHistory ? `- Your lifestyle: ${caseContext.socialHistory}` : ''}

CRITICAL RULES — YOU MUST FOLLOW ALL OF THESE:
1. You are NOT a doctor. You do NOT know your diagnosis.
2. You only know what a normal patient would reasonably know about their own body.
3. Answer questions naturally, as if you are a real person, NOT a medical textbook.
4. Keep responses CONCISE (1 to 3 sentences maximum), like real natural speech.
5. Do NOT volunteer all your medical history at once. Reveal information only when the student asks the appropriate questions.
6. Stay completely consistent with the medical context provided above. Never invent facts that contradict it.
7. If asked something the patient would not know (e.g., medical terminology, exact diagnoses), say naturally: "I'm not sure, doctor" or "I don't know what that means."
8. NEVER reveal a hidden diagnosis — you do not know it.
9. Do NOT coach the student. Do NOT tell them what questions to ask next.
10. Do NOT provide medical advice or suggest what might be wrong with you.
11. Remain fully in character as the patient at all times.
12. Use natural conversational English with contractions ("I've", "It's", "doesn't").
13. This is an educational simulation. Always behave as a safe, cooperative patient.

Remember: You are ${caseContext.patientName}, a real person who is worried about their health and trusting this doctor to help them.`;
}

// ────────────────────────────────────────────────────────────────────────────
// Simulated Clinical Patient Fallback (when API key is unset or placeholder)
// ────────────────────────────────────────────────────────────────────────────

function generateSimulatedPatientResponse(
  caseContext: PatientCaseContext,
  _history: ConversationTurn[],
  studentMessage: string
): string {
  const isBangla = caseContext.language === 'bn';
  const query = studentMessage.toLowerCase();

  if (isBangla) {
    const isAnxious = caseContext.personality === 'anxious';
    const prefix = isAnxious ? 'ডাক্তার সাহেব, আমি খুব দুশ্চিন্তায় আছি... ' : '';
    const suffix = isAnxious ? ' এটা কি খুব ভয়ের কিছু ডাক্তার সাহেব?' : '';

    // Greetings
    if (query.includes('কেমন') || query.includes('আছেন') || query.includes('নমস্কার') || query.includes('সালাম') || query.includes('হ্যালো') || query.includes('নাম')) {
      return `জি ডাক্তার সাহেব, সালাম। আমার শরীরটা কদিন ধরে ভালো যাচ্ছে না। ${caseContext.chiefComplaint}`;
    }

    // Pain / Symptoms / Chief complaint
    if (query.includes('ব্যথা') || query.includes('কষ্ট') || query.includes('সমস্যা') || query.includes('কীভাবে') || query.includes('কেমন লাগছে')) {
      if (caseContext.symptomDetails) {
        return `${prefix}${caseContext.symptomDetails.split('.')[0]}। ${caseContext.chiefComplaint}${suffix}`;
      }
      return `${prefix}আমার প্রধান কষ্ট হচ্ছে ${caseContext.chiefComplaint}।${suffix}`;
    }

    // Onset / Duration / When
    if (query.includes('কখন') || query.includes('শুরু') || query.includes('কবে') || query.includes('কতদিন') || query.includes('কত দিন') || query.includes('সময়')) {
      return `${prefix}এটা প্রায় ৩-৪ দিন আগে হঠাৎ শুরু হয়েছে এবং আস্তে আস্তে কষ্টটা বাড়ছে।${suffix}`;
    }

    // Severity / Scale
    if (query.includes('কতটুকু') || query.includes('স্কেল') || query.includes('১০') || query.includes('তীব্র') || query.includes('কেমন')) {
      return `${prefix}১০ এর স্কেলে বলতে গেলে প্রায় ৬ বা ৭ এর মতো কষ্ট হচ্ছে ডাক্তার সাহেব। সহজে সহ্য করা যায় না।${suffix}`;
    }

    // Location / Radiation
    if (query.includes('কোথায়') || query.includes('ছড়ায়') || query.includes('কোন দিকে') || query.includes('জায়গা')) {
      if (caseContext.symptomDetails && (caseContext.symptomDetails.includes('arm') || caseContext.symptomDetails.includes('left'))) {
        return `${prefix}ব্যথাটা বুকের ঠিক মাঝখানে অনুভূত হয় এবং মনে হয় যেন বাম হাত ও ঘাড়ের দিকে ছড়িয়ে পড়ছে।${suffix}`;
      }
      return `${prefix}এটা মূলত বুকের মাঝখানেই বেশি চেপে ধরে আছে।${suffix}`;
    }

    // Medications
    if (query.includes('ওষুধ') || query.includes('ঔষধ') || query.includes('ট্যাবলেট') || query.includes('মেডিসিন') || query.includes('খাচ্ছেন')) {
      if (caseContext.medicationHistory) {
        return `জি ডাক্তার সাহেব, আমি নিয়মিত প্রেশারের ওষুধ খাই। ${caseContext.medicationHistory}`;
      }
      return 'আমি নিয়মিত কোনো বড় ওষুধ খাই না, তবে সমস্যা হলে কখনো কখনো প্যারাসিটামল খাই।';
    }

    // Allergies
    if (query.includes('অ্যালার্জি') || query.includes('এলার্জি') || query.includes('পার্শ্বপ্রতিক্রিয়া')) {
      if (caseContext.allergyHistory) {
        return `${caseContext.allergyHistory}`;
      }
      return 'না ডাক্তার সাহেব, কোনো খাবার বা ওষুধে আমার জানা মতে অ্যালার্জি নেই।';
    }

    // Past medical history
    if (query.includes('আগে') || query.includes('অতীত') || query.includes('ইতিহাস') || query.includes('অসুখ') || query.includes('রোগ') || query.includes('হাসপাতাল')) {
      if (caseContext.medicalHistory) {
        return `আগে থেকেই আমার উচ্চ রক্তচাপের সমস্যা আছে। ${caseContext.medicalHistory}`;
      }
      return 'পূর্বে আমার তেমন কোনো বড় অসুখ বা অপারেশনের ইতিহাস নেই ডাক্তার সাহেব।';
    }

    // Family history
    if (query.includes('পরিবার') || query.includes('বাবা') || query.includes('মা') || query.includes('ভাই') || query.includes('বংশ')) {
      if (caseContext.familyHistory) {
        return `আমাদের পরিবারে, ${caseContext.familyHistory}`;
      }
      return 'পরিবারে তেমন কোনো বংশগত বড় জটিল অসুখ নেই।';
    }

    // Social / Smoking / Habits
    if (query.includes('ধূমপান') || query.includes('বিড়ি') || query.includes('সিগারেট') || query.includes('কাজ') || query.includes('চাকরি') || query.includes('নেশা')) {
      if (caseContext.socialHistory) {
        return `${caseContext.socialHistory}`;
      }
      return 'আমি ধূমপান করি না এবং সাধারণ চাকরি করি। মানসিক চাপ কিছুটা থাকে।';
    }

    // Default Bangla response
    return `${prefix}জি ডাক্তার সাহেব, আমি আপনার কথা বুঝতে পেরেছি। মূলত ${caseContext.chiefComplaint.toLowerCase()} নিয়ে আমি বেশি চিন্তিত।${suffix}`;
  }

  // English Simulated Responses
  const prefix = caseContext.personality === 'anxious' ? 'Doctor, I\'m really worried... ' : '';
  const suffix = caseContext.personality === 'anxious' ? ' Is that normal, doctor?' : '';

  // Greeting / Introduction
  if (query.includes('hello') || query.includes('hi') || query.includes('good morning') || query.includes('good afternoon') || query.includes('my name is')) {
    return `Hello doctor, thank you for seeing me. As I mentioned, ${caseContext.chiefComplaint.toLowerCase()}`;
  }

  // Pain / Symptoms / Chief complaint
  if (query.includes('pain') || query.includes('hurt') || query.includes('discomfort') || query.includes('feel') || query.includes('describe') || query.includes('symptom')) {
    if (caseContext.symptomDetails) {
      return `${prefix}${caseContext.symptomDetails.split('.')[0]}. ${caseContext.chiefComplaint}${suffix}`;
    }
    return `${prefix}It's mainly ${caseContext.chiefComplaint.toLowerCase()}${suffix}`;
  }

  // Onset / Duration / When
  if (query.includes('when') || query.includes('start') || query.includes('how long') || query.includes('duration') || query.includes('days') || query.includes('hours') || query.includes('sudden')) {
    if (caseContext.symptomDetails) {
      return `${prefix}It started about 2 to 3 days ago. ${caseContext.symptomDetails.split('.')[0]}.${suffix}`;
    }
    return `${prefix}It started about 2 to 3 days ago and has been persistent.${suffix}`;
  }

  // Severity / Scale
  if (query.includes('scale') || query.includes('1 to 10') || query.includes('1-10') || query.includes('severe') || query.includes('how bad')) {
    return `${prefix}I would rate it around a 6 or 7 out of 10 at its worst. It's definitely noticeable and uncomfortable.${suffix}`;
  }

  // Radiation / Location / Where
  if (query.includes('where') || query.includes('radiat') || query.includes('spread') || query.includes('move') || query.includes('exact location')) {
    if (caseContext.symptomDetails && (caseContext.symptomDetails.includes('arm') || caseContext.symptomDetails.includes('back') || caseContext.symptomDetails.includes('neck'))) {
      return `${prefix}Yes, it feels like it spreads a bit to my left side and arm when it gets worse.${suffix}`;
    }
    return `${prefix}It's mostly centered right there where the main discomfort is.${suffix}`;
  }

  // Medications
  if (query.includes('medication') || query.includes('medicine') || query.includes('pill') || query.includes('drug') || query.includes('taking')) {
    if (caseContext.medicationHistory) {
      return `Yes, doctor. ${caseContext.medicationHistory}`;
    }
    return "I don't regularly take any prescription medications, just occasional over-the-counter painkillers when needed.";
  }

  // Allergies
  if (query.includes('allerg') || query.includes('reaction')) {
    if (caseContext.allergyHistory) {
      return `${caseContext.allergyHistory}`;
    }
    return "No, I don't have any known drug or food allergies that I know of.";
  }

  // Past medical history
  if (query.includes('past') || query.includes('history') || query.includes('before') || query.includes('condition') || query.includes('diagnos') || query.includes('hospital')) {
    if (caseContext.medicalHistory) {
      return `In the past, ${caseContext.medicalHistory}`;
    }
    return "I've generally been healthy and haven't had any major surgeries or hospital stays.";
  }

  // Family history
  if (query.includes('family') || query.includes('father') || query.includes('mother') || query.includes('parent') || query.includes('genetic') || query.includes('brother') || query.includes('sister')) {
    if (caseContext.familyHistory) {
      return `In my family, ${caseContext.familyHistory}`;
    }
    return "No major genetic or hereditary health issues that I can recall in my family.";
  }

  // Social history: smoking, alcohol, work, diet
  if (query.includes('smoke') || query.includes('alcohol') || query.includes('drink') || query.includes('work') || query.includes('job') || query.includes('stress') || query.includes('diet') || query.includes('exercise')) {
    if (caseContext.socialHistory) {
      return `${caseContext.socialHistory}`;
    }
    return "I work full time, don't smoke, and only drink occasionally at social gatherings.";
  }

  // Associated symptoms: fever, cough, nausea, breath, sweating
  if (query.includes('fever') || query.includes('cough') || query.includes('nausea') || query.includes('vomit') || query.includes('breath') || query.includes('sweat') || query.includes('dizzy')) {
    if (caseContext.symptomDetails) {
      return `${prefix}Yes, I have noticed some associated symptoms. ${caseContext.symptomDetails}${suffix}`;
    }
    return `${prefix}I haven't had any high fever, but I've been feeling generally unwell and fatigued.${suffix}`;
  }

  // Default natural answer
  return `${prefix}I see what you mean, doctor. It's mainly been the ${caseContext.chiefComplaint.toLowerCase()}. What do you think could be causing this?${suffix}`;
}

// ────────────────────────────────────────────────────────────────────────────
// OpenAI Provider
// ────────────────────────────────────────────────────────────────────────────

class OpenAIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse(
    systemPrompt: string,
    conversationHistory: ConversationTurn[],
    studentMessage: string
  ): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((turn) => ({
        role: turn.role === 'student' ? ('user' as const) : ('assistant' as const),
        content: turn.content,
      })),
      { role: 'user', content: studentMessage },
    ];

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('No response from OpenAI');
    return content.trim();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// AI Patient Engine — Main Interface
// ────────────────────────────────────────────────────────────────────────────

export class AIPatientEngine {
  private provider: AIProvider;

  constructor(provider: AIProvider = 'openai') {
    this.provider = provider;
  }

  async generatePatientResponse(
    caseContext: PatientCaseContext,
    conversationHistory: ConversationTurn[],
    studentMessage: string
  ): Promise<AIPatientResponse> {
    const sanitizedMessage = studentMessage.trim().substring(0, 2000);
    const systemPrompt = buildSystemPrompt(caseContext);

    const apiKey = process.env.OPENAI_API_KEY;
    const isKeyConfigured = apiKey && !apiKey.includes('placeholder') && apiKey.startsWith('sk-');

    let textResponse = '';
    let usedProvider: AIProvider = 'mock';

    if (this.provider === 'openai' && isKeyConfigured) {
      try {
        const openai = new OpenAIProvider(apiKey);
        textResponse = await openai.generateResponse(systemPrompt, conversationHistory, sanitizedMessage);
        usedProvider = 'openai';
      } catch (err) {
        console.warn('[AI Patient Engine] OpenAI call failed, falling back to clinical simulation:', err);
      }
    }

    if (!textResponse) {
      textResponse = generateSimulatedPatientResponse(caseContext, conversationHistory, sanitizedMessage);
      usedProvider = 'mock';
    }

    // Phase 3 Emotion Analysis Layer
    const { emotion, intensity } = analyzePatientEmotion(
      textResponse,
      caseContext.personality,
      sanitizedMessage
    );

    return {
      message: textResponse,
      provider: usedProvider,
      emotion,
      intensity,
    };
  }

  getProvider(): AIProvider {
    return this.provider;
  }
}

export const aiPatientEngine = new AIPatientEngine(
  (process.env.AI_PROVIDER as AIProvider) || 'openai'
);

export default aiPatientEngine;
