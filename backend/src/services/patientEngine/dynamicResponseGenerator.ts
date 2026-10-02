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
import { TruthLayerBuilder } from './truthLayer';

export interface GenerationOutput {
  response: string;
  disclosedFactKeys: string[];
  emotion: PatientEmotion;
  intensity: number;
  provider: 'openai' | 'google' | 'gemini' | 'mock';
}

export class DynamicPatientResponseGenerator {
  /**
   * Builds rich clinical prompt with full patient case facts and pertinent negatives.
   */
  private static buildGroundingPrompt(
    state: PatientConversationState,
    caseContext: PatientCaseContext,
    truth: ReturnType<typeof TruthLayerBuilder.build>,
    language: LanguageMode
  ): string {
    const isBn = language === 'bn';
    const personality = state.personality;

    return `You are roleplaying as a real patient in a clinical history-taking session with a medical student or doctor.
Patient Demographics:
- Name: ${caseContext.patientName}
- Age: ${caseContext.patientAge}
- Gender: ${caseContext.patientGender}
- Personality: ${personality}
- Language: Respond strictly in ${isBn ? 'Bengali (বাংলা)' : 'English'}, matching the doctor's language.

CLINICAL CASE FACTS (Authoritative Ground Truth):
- Chief Complaint: ${caseContext.chiefComplaint}
- Duration & Onset: ${isBn ? truth.hpi.durationBn : truth.hpi.duration}, ${isBn ? truth.hpi.onsetBn : truth.hpi.onset}
- Location of Pain: ${isBn ? truth.hpi.locationBn : truth.hpi.location}
- Character: ${isBn ? truth.hpi.characterBn : truth.hpi.character}
- Severity: ${isBn ? truth.hpi.severityBn : truth.hpi.severity}
- Radiation: ${isBn ? truth.hpi.radiationBn : truth.hpi.radiation}
- Aggravating Factors: ${isBn ? truth.hpi.aggravatingFactorsBn.join(', ') : truth.hpi.aggravatingFactors.join(', ')}
- Relieving Factors: ${isBn ? truth.hpi.relievingFactorsBn.join(', ') : truth.hpi.relievingFactors.join(', ')}
- Ocular / Eye Symptoms: ${isBn ? truth.associatedSymptoms.ocular?.descriptionBn : truth.associatedSymptoms.ocular?.descriptionEn}
- Light / Noise Sensitivity: ${isBn ? truth.associatedSymptoms.phonophobia?.descriptionBn : truth.associatedSymptoms.phonophobia?.descriptionEn}
- Nausea & Vomiting: ${isBn ? truth.associatedSymptoms.nausea.descriptionBn : truth.associatedSymptoms.nausea.descriptionEn}, ${isBn ? truth.associatedSymptoms.vomiting.descriptionBn : truth.associatedSymptoms.vomiting.descriptionEn}
- Fever & Chills: ${isBn ? truth.associatedSymptoms.fever.descriptionBn : truth.associatedSymptoms.fever.descriptionEn}
- Pertinent Negatives (Symptoms you DO NOT have - state clearly if asked):
  * Neck Stiffness / Meningism: ${isBn ? truth.associatedSymptoms.neckStiffness?.descriptionBn : truth.associatedSymptoms.neckStiffness?.descriptionEn}
  * Head Trauma / Physical Injury: ${isBn ? truth.associatedSymptoms.trauma?.descriptionBn : truth.associatedSymptoms.trauma?.descriptionEn}
  * Limb Numbness / Weakness: ${isBn ? truth.associatedSymptoms.neurologicalDeficit?.descriptionBn : truth.associatedSymptoms.neurologicalDeficit?.descriptionEn}
- Past Medical History: ${isBn ? truth.pastMedicalHistory.descriptionBn : truth.pastMedicalHistory.descriptionEn}
- Past Surgical History: ${isBn ? truth.pastSurgicalHistory.descriptionBn : truth.pastSurgicalHistory.descriptionEn}
- Medications: ${isBn ? truth.medications.descriptionBn : truth.medications.descriptionEn}
- Allergies: ${isBn ? truth.allergies.descriptionBn : truth.allergies.descriptionEn}
- Family History: ${isBn ? truth.familyHistory.descriptionBn : truth.familyHistory.descriptionEn}
- Social Habits (Smoking/Alcohol): ${isBn ? truth.socialHistory.smoking.detailsBn : truth.socialHistory.smoking.detailsEn}

STRICT PATIENT ROLEPLAY RULES:
1. You are a REAL PATIENT, NOT a doctor, medical teacher, or AI assistant.
2. NEVER state your medical diagnosis name (e.g., do NOT say "I have migraine", "I have appendicitis", "I have angina"). You do not know your diagnosis; you only feel your symptoms.
3. Answer ANY clinical inquiry the doctor asks directly, naturally, and honestly based on the facts above.
4. If asked about an anatomical site (like vertex vs occipital vs frontal vs temples), clearly state where it hurts and where it does not hurt.
5. If asked about a symptom listed in Pertinent Negatives (like fever, head trauma, stiff neck, or limb numbness), truthfully state that you do not have it.
6. Keep your answer conversational, realistic, and concise (1-2 sentences maximum).
7. Respond in ${isBn ? 'Bengali (বাংলা)' : 'English'}.`;
  }

  /**
   * Calls Google Gemini API if GEMINI_API_KEY is configured.
   */
  private static async callGemini(
    prompt: string,
    studentMessage: string
  ): Promise<string | null> {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.Gemini_api_key ||
      process.env.gemini_api_key ||
      Object.entries(process.env).find(([k]) => k.toLowerCase() === 'gemini_api_key')?.[1];

    if (!apiKey || apiKey.includes('placeholder') || apiKey.length < 10) {
      return null;
    }

    const models = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite-preview',
      'gemini-flash-lite-latest',
    ];
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `${prompt}\n\nDoctor asked: "${studentMessage}"\nPatient (answer directly in character):`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 90,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          const parts = data?.candidates?.[0]?.content?.parts || [];
          const candidate = parts.map((p: any) => p.text).filter(Boolean).join(' ').trim();
          if (candidate && candidate.length > 2) {
            return candidate;
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        // Try next model if any
      }
    }
    return null;
  }

  /**
   * Calls OpenAI API if OPENAI_API_KEY is configured.
   */
  private static async callOpenAI(
    prompt: string,
    studentMessage: string
  ): Promise<string | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('placeholder') || !apiKey.startsWith('sk-')) {
      return null;
    }

    try {
      const openai = new OpenAI({ apiKey, timeout: 6500 });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: studentMessage },
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      const candidate = completion.choices[0]?.message?.content?.trim();
      if (candidate && candidate.length > 2) {
        return candidate;
      }
    } catch (err) {
      console.warn('[DynamicPatientResponseGenerator] OpenAI call failed:', err);
    }
    return null;
  }

  /**
   * Smart Clinical Query Reasoning Engine (Zero-API-Key Fallback).
   * Semantically analyzes doctor's clinical questions against the patient's case profile.
   * Never yields a generic refusal for valid clinical questions.
   */
  private static smartClinicalQueryReasoning(
    studentMessage: string,
    truth: ReturnType<typeof TruthLayerBuilder.build>,
    caseContext: PatientCaseContext,
    isBn: boolean,
    personality: PatientPersonality
  ): string {
    const norm = studentMessage
      .toLowerCase()
      .replace(/ব্যাথা/g, 'ব্যথা')
      .replace(/বেথা/g, 'ব্যথা')
      .replace(/চক্ষু/g, 'চোখ')
      .replace(/ডানপাশে/g, 'ডান পাশে')
      .replace(/বামপাশে/g, 'বাম পাশে')
      .replace(/মাঝামাঝি/g, 'মাঝখানে');

    // 0a. Patient Demographics (Age)
    if (norm.includes('বয়স') || norm.includes('বয়েস') || norm.includes('age') || norm.includes('how old') || norm.includes('boyos')) {
      const enToBnDigits = (n: number | string) =>
        String(n).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'.charAt(parseInt(d, 10)));
      return isBn ? `আমার বয়স ${enToBnDigits(caseContext.patientAge)} বছর, ডাক্তার।` : `I am ${caseContext.patientAge} years old, doctor.`;
    }

    // 0b. Patient Demographics (Name)
    if (norm.includes('নাম') || norm.includes('name')) {
      return isBn ? `আমার নাম ${caseContext.patientName}।` : `My name is ${caseContext.patientName}.`;
    }

    // 0c. Hand, Leg, Bone, Joint, Muscle Pain (Dengue Breakbone / Myalgia)
    if (
      norm.includes('হাত পা') ||
      norm.includes('হাত-পা') ||
      norm.includes('গা হাত পা') ||
      norm.includes('শরীরে ব্যথা') ||
      norm.includes('শরীর ব্যথা') ||
      norm.includes('হাড়ে') ||
      norm.includes('হাড়ভাঙা') ||
      norm.includes('মাংসপেশি') ||
      norm.includes('গায়ে ব্যথা') ||
      norm.includes('পায়ে ব্যথা') ||
      norm.includes('হাতে ব্যথা') ||
      norm.includes('body ache') ||
      norm.includes('joint pain') ||
      norm.includes('bone pain') ||
      norm.includes('muscle pain') ||
      norm.includes('breakbone') ||
      norm.includes('limb pain')
    ) {
      if (isBn) {
        if (
          caseContext.chiefComplaint.toLowerCase().includes('dengue') ||
          (truth.hpi.characterBn && (truth.hpi.characterBn.includes('কামড়ানো') || truth.hpi.characterBn.includes('ভাঙার মতো') || truth.hpi.characterBn.includes('মাংসপেশি')))
        ) {
          return 'জি ডাক্তার সাহেব, হাত-পা ও সারা শরীরের হাড়ে তীব্র কামড়ানো অসহ্য যন্ত্রণা হচ্ছে, যেন হাড় ভেঙে যাচ্ছে। ব্যথায় একটুও নড়াচড়া করতে পারছি না।';
        }
        return `না ডাক্তার সাহেব, হাত-পায়ে নির্দিষ্ট কোনো ব্যথা নেই, আমার সমস্যাটা মূলত ${truth.hpi.locationBn || caseContext.chiefComplaint} নিয়ে।`;
      }
      return caseContext.chiefComplaint.toLowerCase().includes('dengue')
        ? 'Yes doctor, I have excruciating deep bone and muscle pain in my arms and legs, feeling like my bones are literally breaking.'
        : `No doctor, my arms and legs do not ache; my primary issue is ${truth.hpi.location}.`;
    }

    // 1. Location / Anatomical Site (Headache, chest, abdomen, etc.)
    if (
      norm.includes('কোথায়') ||
      norm.includes('জায়গা') ||
      norm.includes('কোন পাশে') ||
      norm.includes('কোন দিকে') ||
      norm.includes('উপরের দিকে') ||
      norm.includes('পেছনের দিক') ||
      norm.includes('সামনের দিকে') ||
      norm.includes('মাঝখানে') ||
      norm.includes('মাঝামাঝি') ||
      norm.includes('ডান') ||
      norm.includes('বাম') ||
      norm.includes('রগ') ||
      norm.includes('কপাল') ||
      norm.includes('front') ||
      norm.includes('back of head') ||
      norm.includes('top of head') ||
      norm.includes('temple') ||
      norm.includes('where is the pain')
    ) {
      if (isBn) {
        if (norm.includes('উপর') || norm.includes('পেছন') || norm.includes('সামনে') || norm.includes('মাঝ')) {
          if (
            caseContext.chiefComplaint.toLowerCase().includes('dengue') ||
            (truth.hpi.locationBn && truth.hpi.locationBn.includes('চোখের পেছনে'))
          ) {
            return 'ডাক্তার সাহেব, মাথার নির্দিষ্ট সামনে বা পেছনের চেয়ে আমার মূলত দুই চোখের পেছনের দিকে তীব্র চাপ ও ব্যথা অনুভূত হচ্ছে, আর সারা শরীরের হাড়ে অসহ্য যন্ত্রণা।';
          }
          return `না ডাক্তার সাহেব, মাথার উপরে বা পেছনের দিকে নয়, মূলত আমার মাথার ডান পাশে কানের ওপরের দিকে আর রগের কাছে বেশি ব্যথাটা দপদপ করছে।`;
        }
        return truth.hpi.locationBn || truth.hpi.location;
      }
      return truth.hpi.location;
    }

    // 2. Eye / Ocular / Vision / Photophobia
    if (
      norm.includes('চোখ') ||
      norm.includes('চক্ষু') ||
      norm.includes('দৃষ্টি') ||
      norm.includes('ঝাপসা') ||
      norm.includes('আলো') ||
      norm.includes('eye') ||
      norm.includes('vision') ||
      norm.includes('photophobia') ||
      norm.includes('blur')
    ) {
      if (isBn) {
        return (
          truth.associatedSymptoms.ocular?.descriptionBn ||
          'জি ডাক্তার, ডান চোখের পেছনে এবং চারপাশেও বেশ চাপ ও টনটন করে ব্যথা লাগে, বিশেষ করে আলো দেখলে চোখ মেলাই দায় হয়ে যায়।'
        );
      }
      return (
        truth.associatedSymptoms.ocular?.descriptionEn ||
        'Yes doctor, there is throbbing pain behind my right eye, and light makes it unbearable to keep my eyes open.'
      );
    }

    // 3. Neck Stiffness / Meningism
    if (norm.includes('ঘাড়') || norm.includes('ঘাড় শক্ত') || norm.includes('neck') || norm.includes('stiff')) {
      if (isBn) {
        return (
          truth.associatedSymptoms.neckStiffness?.descriptionBn ||
          'না ডাক্তার সাহেব, আমার ঘাড়ে কোনো ব্যথা বা টান লাগার সমস্যা নেই, ঘাড় স্বাভাবিকভাবেই সবদিকে নাড়াতে পারছি।'
        );
      }
      return (
        truth.associatedSymptoms.neckStiffness?.descriptionEn ||
        'No doctor, my neck is completely supple and moves without any pain.'
      );
    }

    // 4. Head Trauma / Injury
    if (
      norm.includes('আঘাত') ||
      norm.includes('চোট') ||
      norm.includes('পড়ে যাওয়া') ||
      norm.includes('দুর্ঘটনা') ||
      norm.includes('trauma') ||
      norm.includes('injury') ||
      norm.includes('accident')
    ) {
      if (isBn) {
        return (
          truth.associatedSymptoms.trauma?.descriptionBn ||
          'না ডাক্তার, আমার মাথায় বা শরীরে কোনো আঘাত বা চোট লাগেনি।'
        );
      }
      return (
        truth.associatedSymptoms.trauma?.descriptionEn ||
        'No doctor, I have not had any head injury, fall, or physical trauma.'
      );
    }

    // 5. Neurological Screening (Numbness / Weakness / Slurred Speech)
    if (
      norm.includes('অবশ') ||
      norm.includes('দুর্বল') ||
      norm.includes('প্যারালাইসিস') ||
      norm.includes('কথা জড়িয়ে') ||
      norm.includes('খিঁচুনি') ||
      norm.includes('weakness') ||
      norm.includes('numbness') ||
      norm.includes('slurred') ||
      norm.includes('seizure')
    ) {
      if (isBn) {
        return (
          truth.associatedSymptoms.neurologicalDeficit?.descriptionBn ||
          'না ডাক্তার সাহেব, কোনো অঙ্গ অবশ হওয়া বা কথা জড়িয়ে যাওয়ার মতো কোনো সমস্যা হয়নি।'
        );
      }
      return (
        truth.associatedSymptoms.neurologicalDeficit?.descriptionEn ||
        'No doctor, I have no weakness or numbness in my limbs, and no difficulty speaking.'
      );
    }

    // 6. Sound / Noise / Phonophobia
    if (
      norm.includes('শব্দ') ||
      norm.includes('আওয়াজ') ||
      norm.includes('গোলমাল') ||
      norm.includes('noise') ||
      norm.includes('sound') ||
      norm.includes('phonophobia')
    ) {
      if (isBn) {
        return (
          truth.associatedSymptoms.phonophobia?.descriptionBn ||
          'জি ডাক্তার, একটু জোরে আওয়াজ বা শব্দ হলেও মাথায় খুব বেশি যন্ত্রণা লাগে।'
        );
      }
      return (
        truth.associatedSymptoms.phonophobia?.descriptionEn ||
        'Yes doctor, loud sounds and noise make the headache much worse.'
      );
    }

    // 7. Nausea / Vomiting
    if (norm.includes('বমি') || norm.includes('গা গুলানো') || norm.includes('nausea') || norm.includes('vomit')) {
      if (norm.includes('বমি হয়েছে') || norm.includes('actually vomited')) {
        return isBn
          ? truth.associatedSymptoms.vomiting.descriptionBn
          : truth.associatedSymptoms.vomiting.descriptionEn;
      }
      return isBn
        ? truth.associatedSymptoms.nausea.descriptionBn
        : truth.associatedSymptoms.nausea.descriptionEn;
    }

    // 8. Fever / Temperature
    if (
      norm.includes('জ্বর') ||
      norm.includes('গা গরম') ||
      norm.includes('তাপমাত্রা') ||
      norm.includes('fever') ||
      norm.includes('temperature') ||
      norm.includes('chills')
    ) {
      return isBn
        ? truth.associatedSymptoms.fever.descriptionBn
        : truth.associatedSymptoms.fever.descriptionEn;
    }

    // 9. Radiation
    if (norm.includes('ছড়ায়') || norm.includes('অন্য কোথাও') || norm.includes('radiate') || norm.includes('spread')) {
      return isBn ? truth.hpi.radiationBn : truth.hpi.radiation;
    }

    // 10. Severity
    if (
      norm.includes('স্কেল') ||
      norm.includes('১০ এর মধ্যে') ||
      norm.includes('তীব্র') ||
      norm.includes('severe') ||
      norm.includes('severity') ||
      norm.includes('scale')
    ) {
      return isBn ? truth.hpi.severityBn : truth.hpi.severity;
    }

    // 11. Character
    if (
      norm.includes('কেমন ব্যথা') ||
      norm.includes('ধরন') ||
      norm.includes('দপদপ') ||
      norm.includes('character') ||
      norm.includes('feel like')
    ) {
      return isBn ? truth.hpi.characterBn : truth.hpi.character;
    }

    // 12. Aggravating / Relieving
    if (norm.includes('বাড়ে') || norm.includes('বৃদ্ধি') || norm.includes('worse') || norm.includes('trigger')) {
      return isBn
        ? truth.hpi.aggravatingFactorsBn.length > 0
          ? truth.hpi.aggravatingFactorsBn.join(' এবং ')
          : 'না ডাক্তার, নির্দিষ্ট কোনো কিছুতে এটা খুব একটা বাড়ে বলে মনে হয়নি।'
        : truth.hpi.aggravatingFactors.length > 0
        ? truth.hpi.aggravatingFactors.join(' Also, ')
        : 'Nothing specific seems to make it noticeably worse.';
    }

    if (
      norm.includes('কমে') ||
      norm.includes('আরাম') ||
      norm.includes('better') ||
      norm.includes('relieve') ||
      norm.includes('ease')
    ) {
      return isBn
        ? truth.hpi.relievingFactorsBn.length > 0
          ? truth.hpi.relievingFactorsBn.join(' এবং ')
          : 'চুপচাপ শুয়ে বিশ্রাম নিলে কিছুটা স্বস্তি পাই ডাক্তার।'
        : truth.hpi.relievingFactors.length > 0
        ? truth.hpi.relievingFactors.join(' Also, ')
        : 'Resting quietly helps ease the discomfort slightly.';
    }

    // 13. General Greetings / Check-ins
    if (
      norm.includes('সালাম') ||
      norm.includes('নমস্কার') ||
      norm.includes('hello') ||
      norm.includes('hi') ||
      norm.includes('কেমন আছেন') ||
      norm.includes('how are you')
    ) {
      return isBn
        ? `জি ডাক্তার সাহেব, সালাম। শরীরটা খুব খারাপ লাগছে, ${caseContext.chiefComplaint.toLowerCase()} নিয়ে খুব কষ্টে আছি।`
        : `Hello doctor. I've been feeling quite unwell with ${caseContext.chiefComplaint.toLowerCase()}.`;
    }

    // 14. Default Grounded Clinical Statement
    if (isBn) {
      return `জি ডাক্তার সাহেব, ${caseContext.chiefComplaint} নিয়ে কদিন ধরে খুব কষ্টে দিন কাটাচ্ছি। আপনি যদি কোনো নির্দিষ্ট লক্ষণ বা সমস্যার কথা জানতে চান, তবে বলুন।`;
    }
    return `Doctor, I have been suffering badly with ${caseContext.chiefComplaint.toLowerCase()}. Please let me know what specific questions you have about my symptoms.`;
  }

  /**
   * Generates a clinically grounded, state-aware patient response.
   * Priority:
   * 1. Safety & Diagnosis Guardrails
   * 2. Multimodal LLM (Gemini or OpenAI) with FULL Patient Clinical Context
   * 3. Deterministic Fact Aggregator (when facts matched directly)
   * 4. Smart Clinical Case Reasoning Engine (answering any clinical query realistically)
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
    const truth = TruthLayerBuilder.build(caseContext);

    // 1. Direct Diagnosis Query Guardrail (Safety Boundary)
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

    // 3. Ambiguous Query Check (Only for very short 1-2 word utterances)
    if (intents.includes('OTHER') && studentMessage.trim().split(/\s+/).length <= 2) {
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
        const val = isBn ? fact.valueBn : fact.valueEn;
        factResponses.push(val);
      }
    }

    // 5. If Introduction intent was detected
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

    // 6. Try Generative AI (Gemini or OpenAI) with FULL CLINICAL CASE CONTEXT
    const groundingPrompt = this.buildGroundingPrompt(state, caseContext, truth, language);

    // 6a. Try Google Gemini first
    const geminiResponse = await this.callGemini(groundingPrompt, studentMessage);
    if (geminiResponse) {
      return {
        response: geminiResponse,
        disclosedFactKeys: disclosedFactKeys.length > 0 ? disclosedFactKeys : ['chief_complaint'],
        emotion: highestEmotion,
        intensity: emotionIntensity,
        provider: 'gemini',
      };
    }

    // 6b. Try OpenAI if Gemini not configured or failed
    const openaiResponse = await this.callOpenAI(groundingPrompt, studentMessage);
    if (openaiResponse) {
      return {
        response: openaiResponse,
        disclosedFactKeys: disclosedFactKeys.length > 0 ? disclosedFactKeys : ['chief_complaint'],
        emotion: highestEmotion,
        intensity: emotionIntensity,
        provider: 'openai',
      };
    }

    // 7. If facts matched directly, format and modulate response
    if (factResponses.length > 0) {
      let combinedResponse = '';
      if (factResponses.length === 1) {
        combinedResponse = factResponses[0];
      } else {
        combinedResponse = isBn ? factResponses.join(' এবং ') : factResponses.join(' Also, ');
      }

      if (!combinedResponse.includes('যেমনটা আগেই') && !combinedResponse.includes('As I mentioned')) {
        combinedResponse = PatientDisclosureRules.applyPersonality(
          combinedResponse,
          personality,
          language,
          intents[0]
        );
      }

      return {
        response: combinedResponse,
        disclosedFactKeys,
        emotion: highestEmotion,
        intensity: emotionIntensity,
        provider: 'mock',
      };
    }

    // 8. Smart Clinical Case Reasoning Engine (Zero-API-Key Fallback)
    const smartResponse = this.smartClinicalQueryReasoning(
      studentMessage,
      truth,
      caseContext,
      isBn,
      personality
    );

    return {
      response: smartResponse,
      disclosedFactKeys: ['chief_complaint'],
      emotion: highestEmotion,
      intensity: emotionIntensity,
      provider: 'mock',
    };
  }
}
