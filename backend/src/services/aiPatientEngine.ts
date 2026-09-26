import OpenAI from 'openai';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'mock';

export interface PatientCaseContext {
  patientName: string;
  patientAge: number;
  patientGender: string;
  chiefComplaint: string;
  personality: string;
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
}

// ────────────────────────────────────────────────────────────────────────────
// System prompt builder
// ────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(caseContext: PatientCaseContext): string {
  const personalityInstructions: Record<string, string> = {
    calm: 'You speak calmly and clearly. You are cooperative and answer questions thoughtfully. You are not overly emotional.',
    anxious: 'You are clearly worried and anxious about your symptoms. You speak with some urgency. You may ask the doctor questions back like "Is it serious, doctor?" or "Should I be worried?". You are cooperative but visibly concerned.',
    talkative: 'You are naturally talkative. You tend to give extra details and sometimes go on tangents before getting to the main point. You are friendly and open.',
    quiet: 'You are reserved and speak briefly. You answer only what is asked. You are not unfriendly but you are a person of few words.',
    confused: 'You are somewhat confused about some details. You may mix up dates or be unsure about some information. You do your best to help.',
    frustrated: 'You have been waiting and are slightly frustrated. You are cooperative but you want answers quickly.',
  };

  const personalityStyle = personalityInstructions[caseContext.personality] || personalityInstructions['calm'];

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
4. Do NOT volunteer all your medical history at once. Reveal information only when the student asks the appropriate questions.
5. Stay completely consistent with the medical context provided above. Never invent facts that contradict it.
6. If asked something the patient would not know (e.g., medical terminology, exact diagnoses), say naturally: "I'm not sure, doctor" or "I don't know what that means."
7. NEVER reveal a hidden diagnosis — you do not know it.
8. Do NOT coach the student. Do NOT tell them what questions to ask next.
9. Do NOT provide medical advice or suggest what might be wrong with you.
10. Remain fully in character as the patient at all times.
11. Keep responses concise and conversational — like a real person speaking, not a written report.
12. Use natural language. Use "I've" instead of "I have", speak in first person.
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
  const query = studentMessage.toLowerCase();
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
      return `${prefix}It started a few days ago and has been bothering me quite a bit. ${caseContext.symptomDetails.split('.')[0]}.${suffix}`;
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
      max_tokens: 400,
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

    if (this.provider === 'openai' && isKeyConfigured) {
      try {
        const openai = new OpenAIProvider(apiKey);
        const message = await openai.generateResponse(systemPrompt, conversationHistory, sanitizedMessage);
        return { message, provider: 'openai' };
      } catch (err) {
        console.warn('[AI Patient Engine] OpenAI call failed, falling back to clinical simulation:', err);
      }
    }

    // Fallback: Simulated Clinical Patient engine
    const simulatedMsg = generateSimulatedPatientResponse(caseContext, conversationHistory, sanitizedMessage);
    return { message: simulatedMsg, provider: 'mock' };
  }

  getProvider(): AIProvider {
    return this.provider;
  }
}

export const aiPatientEngine = new AIPatientEngine(
  (process.env.AI_PROVIDER as AIProvider) || 'openai'
);

export default aiPatientEngine;
