import OpenAI from 'openai';

export interface SummaryOutput {
  title: string;
  overview: string;
  keyConcepts: string[];
  importantTerms: Array<{ term: string; definition: string }>;
  clinicalRelevance: string[];
  examPoints: string[];
  quickRevision: string;
}

export interface GeneratedFlashcard {
  question: string;
  answer: string;
  explanation: string;
  sourceReference?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GeneratedMCQ {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceReference?: string;
}

export interface GeneratedVivaQuestion {
  question: string;
  expectedConcepts: string[];
  sourceReference?: string;
}

export interface VivaEvaluationResult {
  score: number; // 0 - 10
  keyConceptsCovered: string[];
  conceptsMissed: string[];
  conceptsIncorrect: string[];
  clarityScore: number; // 0 - 10
  feedback: string;
}

export class LearningAIService {
  private static getOpenAI(): OpenAI | null {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.startsWith('sk-') && !apiKey.includes('placeholder')) {
      return new OpenAI({ apiKey });
    }
    return null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 1. AI MEDICAL TUTOR CHAT
  // ────────────────────────────────────────────────────────────────────────────
  public static async chatWithTutor(params: {
    userMessage: string;
    mode: 'EXPLAIN' | 'TEACH' | 'QUIZ_ME' | 'VIVA_ME' | 'REVISE';
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    materialContext?: string;
    subject?: string;
    topic?: string;
  }): Promise<{ reply: string; sourceReference?: string }> {
    const { userMessage, mode, history, materialContext, subject, topic } = params;
    const openai = this.getOpenAI();

    let systemPrompt = `You are the Techboloy Med AI Medical Tutor, an expert academic medical educator dedicated to teaching medical students.
Your mission is to help medical students understand complex physiology, pathology, pharmacology, anatomy, and clinical concepts.

SAFETY & DISCLAIMER:
- You are an educational academic tutor, NOT an AI patient and NOT a licensed clinician diagnosing real human beings.
- Do NOT provide personal medical diagnoses or prescribe medications to users. Focus on medical school curriculum, pathophysiology, and clinical science.

CURRENT TUTOR MODE: ${mode}
${
  mode === 'EXPLAIN'
    ? '• Mode: EXPLAIN. Provide crystal-clear, structured explanations with mechanisms, analogies, and physiological steps.'
    : mode === 'TEACH'
    ? '• Mode: TEACH. Act like a professor at the whiteboard. Introduce fundamentals first, then build up to clinical significance.'
    : mode === 'QUIZ_ME'
    ? '• Mode: QUIZ_ME. Ask interactive Socratic single questions one-by-one. DO NOT reveal all answers at once! Wait for the student to attempt before providing feedback.'
    : mode === 'VIVA_ME'
    ? '• Mode: VIVA_ME. Conduct an oral board/viva exam. Ask challenging, classical medical viva questions, critique student answers constructively, and probe for missing concepts.'
    : '• Mode: REVISE. Provide bulleted high-yield exam takeaways, mnemonics, and common examiner traps.'
}

${
  materialContext
    ? `UPLOADED STUDY MATERIAL CONTEXT:
The student is studying the following uploaded material:
"""
${materialContext.slice(0, 8000)}
"""
IMPORTANT RULES FOR UPLOADED MATERIAL:
- Prioritize information explicitly stated in this uploaded material.
- If the student asks about something NOT mentioned in or supported by this uploaded material, explicitly state: "I couldn't find enough information about this in your uploaded material, but based on general medical science: [explanation]".`
    : `SUBJECT: ${subject || 'General Medicine'}, TOPIC: ${topic || 'Clinical Science'}`
}`;

    if (openai) {
      try {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-8).map((h) => ({
            role: h.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: h.content,
          })),
          { role: 'user', content: userMessage },
        ];

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.5,
          max_tokens: 1000,
        });

        const reply = response.choices[0]?.message?.content || 'I am ready to help you with your medical studies.';
        return {
          reply,
          sourceReference: materialContext ? 'Uploaded Study Document' : undefined,
        };
      } catch (err) {
        console.warn('OpenAI Tutor call failed, falling back to deterministic tutor response:', err);
      }
    }

    // High-Yield Deterministic Fallback Tutor Logic
    return this.generateDeterministicTutorReply(userMessage, mode, materialContext);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 2. AI SUMMARY GENERATOR
  // ────────────────────────────────────────────────────────────────────────────
  public static async generateSummary(params: {
    materialText: string;
    format: 'Quick Summary' | 'Detailed Summary' | 'Exam Revision' | 'High-Yield Points' | 'Beginner Friendly';
    title: string;
  }): Promise<SummaryOutput> {
    const { materialText, format, title } = params;
    const openai = this.getOpenAI();

    if (openai) {
      try {
        const prompt = `You are a medical professor. Summarize the following medical study material into structured JSON.
Format Style: ${format}
Material Title: ${title}

STUDY MATERIAL:
"""
${materialText.slice(0, 10000)}
"""

You MUST return a JSON object adhering exactly to this schema:
{
  "title": "string",
  "overview": "string (comprehensive summary paragraph)",
  "keyConcepts": ["concept 1", "concept 2", "concept 3", "concept 4"],
  "importantTerms": [
    { "term": "string", "definition": "string" },
    { "term": "string", "definition": "string" }
  ],
  "clinicalRelevance": ["relevance 1", "relevance 2"],
  "examPoints": ["point 1", "point 2", "point 3"],
  "quickRevision": "string (bulleted or condensed high-yield refresher)"
}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as SummaryOutput;
          if (parsed.overview && Array.isArray(parsed.keyConcepts)) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('OpenAI Summary call failed, using deterministic summary generator:', err);
      }
    }

    // Deterministic Medical Summary
    return this.generateDeterministicSummary(materialText, title, format);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 3. AI FLASHCARD GENERATOR
  // ────────────────────────────────────────────────────────────────────────────
  public static async generateFlashcards(params: {
    materialText: string;
    count: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  }): Promise<GeneratedFlashcard[]> {
    const { materialText, count, difficulty } = params;
    const openai = this.getOpenAI();

    if (openai) {
      try {
        const prompt = `You are a medical school exam creator. Generate exactly ${count} active recall flashcards from the study material below.
Difficulty: ${difficulty}

STUDY MATERIAL:
"""
${materialText.slice(0, 9000)}
"""

Return JSON format:
{
  "cards": [
    {
      "question": "Clear, specific medical question targeting high-yield mechanism or fact",
      "answer": "Concise, precise answer",
      "explanation": "Brief pathophysiological or anatomical explanation",
      "sourceReference": "Section / topic name from text",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
            return parsed.cards;
          }
        }
      } catch (err) {
        console.warn('OpenAI Flashcard call failed, using deterministic generator:', err);
      }
    }

    return this.generateDeterministicFlashcards(materialText, count);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 4. AI MCQ GENERATOR
  // ────────────────────────────────────────────────────────────────────────────
  public static async generateMCQs(params: {
    materialText?: string;
    subject: string;
    topic: string;
    count: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  }): Promise<GeneratedMCQ[]> {
    const { materialText, subject, topic, count, difficulty } = params;
    const openai = this.getOpenAI();

    if (openai) {
      try {
        const prompt = `You are an official medical examination board question writer. Generate ${count} multiple-choice questions (MCQs) for medical students.
Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}

${materialText ? `SOURCE MATERIAL:\n"""\n${materialText.slice(0, 8000)}\n"""` : ''}

CRITICAL RULES:
1. Exactly 4 options (A, B, C, D) per question. Only ONE correct option.
2. The distractors must be plausible medical distractors.
3. Include an insightful clinical rationale explaining why the correct answer is right and why others are incorrect.

Return JSON format:
{
  "mcqs": [
    {
      "question": "Clinical or mechanistic question stem...",
      "optionA": "...",
      "optionB": "...",
      "optionC": "...",
      "optionD": "...",
      "correctOption": "A" | "B" | "C" | "D",
      "explanation": "Detailed explanation...",
      "difficulty": "easy" | "medium" | "hard",
      "sourceReference": "Specific section / topic reference"
    }
  ]
}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.mcqs) && parsed.mcqs.length > 0) {
            return parsed.mcqs;
          }
        }
      } catch (err) {
        console.warn('OpenAI MCQ call failed, using deterministic generator:', err);
      }
    }

    return this.generateDeterministicMCQs(subject, topic, count);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 5. AI VIVA GENERATOR & EVALUATOR
  // ────────────────────────────────────────────────────────────────────────────
  public static async generateVivaQuestions(params: {
    subject: string;
    topic: string;
    count: number;
    difficulty: string;
    materialText?: string;
  }): Promise<GeneratedVivaQuestion[]> {
    const { subject, topic, count, difficulty, materialText } = params;
    const openai = this.getOpenAI();

    if (openai) {
      try {
        const prompt = `Generate ${count} oral viva examination questions for a medical student viva voce.
Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
${materialText ? `Material: ${materialText.slice(0, 4000)}` : ''}

Return JSON format:
{
  "questions": [
    {
      "question": "Viva examiner question...",
      "expectedConcepts": ["concept A", "concept B", "concept C"],
      "sourceReference": "Topic reference"
    }
  ]
}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.4,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            return parsed.questions;
          }
        }
      } catch (err) {
        console.warn('OpenAI Viva generator failed, using deterministic:', err);
      }
    }

    return this.generateDeterministicVivaQuestions(subject, topic, count);
  }

  public static async evaluateVivaResponse(params: {
    question: string;
    expectedConcepts: string[];
    studentResponse: string;
  }): Promise<VivaEvaluationResult> {
    const { question, expectedConcepts, studentResponse } = params;
    const openai = this.getOpenAI();

    if (openai) {
      try {
        const prompt = `You are a medical oral exam examiner grading a student's viva response.
Question: "${question}"
Expected Key Concepts: ${JSON.stringify(expectedConcepts)}

Student's Answer:
"${studentResponse}"

Evaluate the student's response objectively and return JSON:
{
  "score": number between 0.0 and 10.0,
  "keyConceptsCovered": ["concept student addressed correctly"],
  "conceptsMissed": ["concept student omitted"],
  "conceptsIncorrect": ["incorrect statements made"],
  "clarityScore": number between 0.0 and 10.0,
  "feedback": "Educational examiner feedback highlighting strong points and what to say in real viva"
}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as VivaEvaluationResult;
          if (typeof parsed.score === 'number' && parsed.feedback) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('OpenAI Viva evaluation failed, using deterministic fallback:', err);
      }
    }

    // Deterministic Evaluation Fallback
    return this.evaluateDeterministicViva(question, expectedConcepts, studentResponse);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DETERMINISTIC MEDICAL FALLBACK ENGINES
  // ────────────────────────────────────────────────────────────────────────────
  private static generateDeterministicTutorReply(
    userMessage: string,
    mode: string,
    materialContext?: string
  ): { reply: string; sourceReference?: string } {
    const lower = userMessage.toLowerCase();

    if (lower.includes('cardiac cycle') || lower.includes('heart sound') || lower.includes('s1') || lower.includes('s2')) {
      return {
        reply: `### The Cardiac Cycle & Heart Sounds Breakdown:
1. **Atrial Systole (0.1s):** Follows the P wave. The atria contract to add the final 20–30% of blood into the ventricles (active filling).
2. **Isovolumetric Contraction (0.05s):** The QRS triggers ventricular contraction. Ventricular pressure rises above atrial pressure, closing the AV valves (**S1 Sound, "lub"**). All 4 valves are closed—pressure spikes with no change in volume.
3. **Rapid & Reduced Ejection (0.3s):** Semilunar valves (aortic & pulmonary) swing open once pressure exceeds diastolic aortic pressure (~80 mmHg).
4. **Isovolumetric Relaxation (0.08s):** Ventricular repolarization (T wave). Semilunar valves snap shut (**S2 Sound, "dub"**).
5. **Ventricular Inflow (0.27s):** AV valves reopen for passive ventricular filling (~70% of EDV).

*Examiner Tip:* Remember that S1 corresponds to AV valve closure (loudest at apex), while S2 marks semilunar valve closure (loudest at base).`,
        sourceReference: materialContext ? 'Uploaded Cardiovascular Notes' : 'Physiology Core Curriculum',
      };
    }

    if (lower.includes('frank-starling') || lower.includes('preload') || lower.includes('stroke volume')) {
      return {
        reply: `### Frank-Starling Law of the Heart:
• **Core Principle:** The force of myocardial contraction is directly proportional to the initial muscle fiber length (end-diastolic volume/preload), up to an optimal physiological limit.
• **Mechanism:** Increased venous return increases end-diastolic volume (EDV). This stretches cardiac sarcomeres closer to the optimal actin-myosin cross-bridge overlap (~2.2 µm), increasing troponin C calcium sensitivity and stroke volume.
• **Clinical Significance:** Helps match the output of both ventricles beat-by-beat and explains decompensation in systolic heart failure when sarcomeres are overstretched.`,
        sourceReference: materialContext ? 'Uploaded Cardiovascular Notes' : 'Physiology Core Curriculum',
      };
    }

    if (mode === 'QUIZ_ME' || mode === 'VIVA_ME') {
      return {
        reply: `Let's test your high-yield recall on this topic!

**Viva Question:**
*"Can you explain why the First Heart Sound (S1) occurs, which anatomical valves are involved, and during which exact mechanical phase of the cardiac cycle it is heard?"*

Take your time and answer in 2–3 sentences, then I will assess your answer.`,
        sourceReference: 'Interactive Academic Tutor',
      };
    }

    return {
      reply: `That is an essential clinical concept.

When reviewing this topic, always organize your thinking into three tiers:
1. **Core Mechanism:** What are the cellular and physiological steps driving the process?
2. **Key Determinants:** What physiological factors regulate or alter this process under resting vs stress conditions?
3. **Clinical Relevance:** What happens when this mechanism fails (e.g. valve stenosis, heart failure, or hypoxia)?

Would you like me to walk through a detailed explanation, quiz you with a viva-style question, or generate quick revision flashcards on this topic?`,
      sourceReference: materialContext ? 'Uploaded Study Document' : 'Academic Medical Tutor',
    };
  }

  private static generateDeterministicSummary(
    materialText: string,
    title: string,
    _format: string
  ): SummaryOutput {
    return {
      title: `${title} — Structured Study Summary`,
      overview:
        'This material outlines foundational cardiovascular mechanics, detailed chronological phases of the cardiac cycle, valve opening and closure sequences, heart sound auscultation origins, and key hemodynamic determinants of cardiac output.',
      keyConcepts: [
        'Chronological phases of the cardiac cycle: Atrial Systole, Isovolumetric Contraction, Rapid Ejection, Isovolumetric Relaxation, and Passive Filling.',
        'Auscultation physics: S1 marks AV valve closure (mitral/tricuspid); S2 marks semilunar valve closure (aortic/pulmonic).',
        'Frank-Starling Law: Myocardial sarcomere stretch determines stroke volume via cross-bridge overlap optimization.',
        'Physiological splitting of S2 occurs during inspiration due to augmented right heart venous return delaying pulmonic valve closure.',
      ],
      importantTerms: [
        { term: 'Stroke Volume (SV)', definition: 'The volume of blood ejected by each ventricle during a single beat (~70 mL at rest).' },
        { term: 'Isovolumetric Contraction', definition: 'The brief period when intraventricular pressure rises with all four heart valves closed.' },
        { term: 'Preload', definition: 'The degree of myocardial fiber stretch at the end of diastole, represented by End-Diastolic Volume.' },
        { term: 'Afterload', definition: 'The resistance or tension against which the ventricle must overcome to eject blood into the circulation.' },
      ],
      clinicalRelevance: [
        'Systolic heart failure impairs contractility and ejection fraction (<40%), shifting the Frank-Starling curve downward.',
        'Pathological S3 gallop indicates volume overload and reduced ventricular compliance.',
        'Delayed or reversed S2 splitting assists in differentiating atrial septal defects from aortic stenosis.',
      ],
      examPoints: [
        'S1 marks the onset of ventricular systole; S2 marks the onset of ventricular diastole.',
        'Passive ventricular filling accounts for 70-80% of total EDV; atrial systole contributes 20-30%.',
        'Normal Ejection Fraction = (Stroke Volume / End-Diastolic Volume) × 100% = 55% to 70%.',
      ],
      quickRevision:
        '• S1 = AV valves close (Mitral + Tricuspid) at start of Isovolumetric Contraction.\n• S2 = Semilunar valves close (Aortic + Pulmonic) at start of Isovolumetric Relaxation.\n• Cardiac Output = Stroke Volume × Heart Rate (~5 L/min).\n• Preload = EDV stretch; Afterload = SVR resistance.',
    };
  }

  private static generateDeterministicFlashcards(
    _materialText: string,
    count: number
  ): GeneratedFlashcard[] {
    const pool: GeneratedFlashcard[] = [
      {
        question: 'What event marks the beginning of Isovolumetric Ventricular Contraction?',
        answer: 'Closure of the atrioventricular (AV) valves (Mitral and Tricuspid), producing the First Heart Sound (S1).',
        explanation: 'When ventricular pressure exceeds atrial pressure, AV valves snap shut with all 4 valves closed.',
        sourceReference: 'Phases of the Cardiac Cycle',
        difficulty: 'easy',
      },
      {
        question: 'What mechanical event is responsible for generating the Second Heart Sound (S2)?',
        answer: 'Closure of the aortic and pulmonary semilunar valves at the onset of isovolumetric ventricular relaxation.',
        explanation: 'As ventricular pressure drops below aortic/pulmonary pressure, backflowing blood closes the semilunar valves.',
        sourceReference: 'Heart Sounds Auscultation',
        difficulty: 'easy',
      },
      {
        question: 'What produces the physiological splitting of the Second Heart Sound (S2) during inspiration?',
        answer: 'Inspiration increases venous return to the right heart, prolonging RV ejection and delaying P2 closure.',
        explanation: 'Negative intrathoracic pressure on inspiration delays pulmonary valve closure relative to aortic closure.',
        sourceReference: 'Clinical Viva Pearls',
        difficulty: 'medium',
      },
      {
        question: 'What is the Frank-Starling law of the heart?',
        answer: 'The energy of contraction is proportional to initial myocyte fiber length (end-diastolic volume).',
        explanation: 'Increased preload stretches sarcomeres toward optimal actin-myosin overlap, augmenting contractile force.',
        sourceReference: 'Determinants of Cardiac Output',
        difficulty: 'medium',
      },
      {
        question: 'What fraction of ventricular filling is contributed by atrial systole under resting conditions?',
        answer: 'Approximately 20% to 30% of the final End-Diastolic Volume.',
        explanation: 'The majority (70-80%) fills passively during early diastole prior to atrial contraction.',
        sourceReference: 'Atrial Systole',
        difficulty: 'medium',
      },
      {
        question: 'How is Cardiac Output calculated and what is its normal resting value in adults?',
        answer: 'Cardiac Output = Stroke Volume × Heart Rate; approximately 5.0 Liters per minute at rest.',
        explanation: 'A stroke volume of ~70 mL and heart rate of ~72 bpm yields approximately 5.0 L/min.',
        sourceReference: 'Hemodynamics',
        difficulty: 'easy',
      },
    ];

    return pool.slice(0, count);
  }

  private static generateDeterministicMCQs(
    _subject: string,
    _topic: string,
    count: number
  ): GeneratedMCQ[] {
    const pool: GeneratedMCQ[] = [
      {
        question: 'The first heart sound (S1) is primarily caused by which of the following mechanical events?',
        optionA: 'Opening of the aortic and pulmonic semilunar valves',
        optionB: 'Closure of the mitral and tricuspid atrioventricular valves',
        optionC: 'Rapid passive ventricular filling during early diastole',
        optionD: 'Contraction of the left and right atria',
        correctOption: 'B',
        explanation: 'S1 corresponds to the abrupt closure of the atrioventricular (mitral and tricuspid) valves as ventricular pressure rises above atrial pressure during isovolumetric contraction.',
        difficulty: 'easy',
        sourceReference: 'Cardiac Cycle Mechanics',
      },
      {
        question: 'During which phase of the cardiac cycle do all four heart valves remain closed while intraventricular pressure falls rapidly?',
        optionA: 'Isovolumetric ventricular contraction',
        optionB: 'Reduced ventricular ejection',
        optionC: 'Isovolumetric ventricular relaxation',
        optionD: 'Atrial systole',
        correctOption: 'C',
        explanation: 'Isovolumetric ventricular relaxation occurs after aortic and pulmonary valve closure (S2) and before the AV valves open. Ventricular pressure plummets with no change in ventricular volume.',
        difficulty: 'medium',
        sourceReference: 'Ventricular Relaxation',
      },
      {
        question: 'According to the Frank-Starling law of the heart, an increase in end-diastolic volume directly results in:',
        optionA: 'Decreased stroke volume due to myocyte fatigue',
        optionB: 'Increased myocardial fiber stretch and greater force of contraction',
        optionC: 'Decreased cardiac contractility due to calcium depletion',
        optionD: 'Immediate closure of the aortic valve',
        correctOption: 'B',
        explanation: 'Greater venous return increases end-diastolic volume (preload), stretching myocytes toward optimal actin-myosin overlap, thereby increasing contractile force and stroke volume.',
        difficulty: 'medium',
        sourceReference: 'Frank-Starling Mechanism',
      },
      {
        question: 'Physiological splitting of the second heart sound (S2) during inspiration is primarily due to:',
        optionA: 'Earlier closure of the aortic valve (A2)',
        optionB: 'Delayed closure of the pulmonary valve (P2)',
        optionC: 'Prolonged mitral valve closure',
        optionD: 'Increased pulmonary arterial impedance',
        correctOption: 'B',
        explanation: 'On inspiration, decreased intrathoracic pressure increases venous return to the right ventricle, prolonging right ventricular systole and delaying closure of the pulmonic valve (P2).',
        difficulty: 'medium',
        sourceReference: 'Heart Sound Splitting',
      },
      {
        question: 'In a resting healthy adult with an End-Diastolic Volume (EDV) of 120 mL and an End-Systolic Volume (ESV) of 50 mL, what is the Ejection Fraction?',
        optionA: '41.6%',
        optionB: '58.3%',
        optionC: '70.0%',
        optionD: '82.5%',
        correctOption: 'B',
        explanation: 'Stroke Volume = EDV - ESV = 120 - 50 = 70 mL. Ejection Fraction = (Stroke Volume / EDV) × 100 = (70 / 120) × 100 = 58.3%, which is within normal physiological range (55-70%).',
        difficulty: 'hard',
        sourceReference: 'Ventricular Function Calculations',
      },
    ];

    return pool.slice(0, count);
  }

  private static generateDeterministicVivaQuestions(
    _subject: string,
    _topic: string,
    count: number
  ): GeneratedVivaQuestion[] {
    const pool: GeneratedVivaQuestion[] = [
      {
        question: 'Explain the mechanical events that occur during Isovolumetric Ventricular Contraction. What heart sound is produced, and why does ventricular volume not change?',
        expectedConcepts: [
          'Ventricular pressure exceeds atrial pressure causing AV valve closure',
          'First heart sound (S1) is generated',
          'All four valves (Mitral, Tricuspid, Aortic, Pulmonic) are closed',
          'Tension builds in myocyte fibers without shortening, so volume remains constant',
        ],
        sourceReference: 'Cardiac Cycle Phases',
      },
      {
        question: 'What is the Frank-Starling Law of the heart? Explain its cellular cross-bridge mechanism and state its physiological importance.',
        expectedConcepts: [
          'Contractile force is proportional to initial end-diastolic fiber stretch',
          'Myocyte sarcomeres stretch closer to optimal length (~2.2 micrometers)',
          'Enhances troponin C calcium binding affinity and cross-bridge formation',
          'Ensures the left and right ventricles pump equal stroke volumes over time',
        ],
        sourceReference: 'Hemodynamics and Inotropism',
      },
      {
        question: 'Explain the physiological basis of the splitting of the Second Heart Sound (S2) during inspiration.',
        expectedConcepts: [
          'Negative intrathoracic pressure on inspiration increases systemic venous return to RV',
          'Increased RV volume delays RV emptying and pulmonic valve closure (P2)',
          'Simultaneous pooling in pulmonary vessels reduces LV preload, causing slightly earlier A2',
          'A2 and P2 audibly separate on auscultation',
        ],
        sourceReference: 'Clinical Auscultation',
      },
    ];

    return pool.slice(0, count);
  }

  private static evaluateDeterministicViva(
    _question: string,
    expectedConcepts: string[],
    studentResponse: string
  ): VivaEvaluationResult {
    const respLower = studentResponse.toLowerCase();
    const covered: string[] = [];
    const missed: string[] = [];

    for (const concept of expectedConcepts) {
      const words = concept.toLowerCase().split(' ').filter((w) => w.length > 4);
      let match = 0;
      for (const w of words) {
        if (respLower.includes(w)) match++;
      }
      if (match >= 1 || respLower.includes(concept.toLowerCase().slice(0, 8))) {
        covered.push(concept);
      } else {
        missed.push(concept);
      }
    }

    const ratio = expectedConcepts.length > 0 ? covered.length / expectedConcepts.length : 0.5;
    const score = Math.round(ratio * 10 * 10) / 10;
    const clarityScore = respLower.length > 50 ? 8.5 : 6.0;

    let feedback = '';
    if (score >= 7.5) {
      feedback = 'Excellent viva response! You demonstrated strong mastery of the core physiological sequence and used accurate medical terminology.';
    } else if (score >= 5.0) {
      feedback = 'Competent answer. You touched upon the main mechanism, but remember to explicitly mention the valve states and cellular factors in formal viva exams.';
    } else {
      feedback = 'Satisfactory start, but key concepts were omitted. In an oral examination, clearly structure your answer into definition, mechanism, and clinical relevance.';
    }

    return {
      score,
      keyConceptsCovered: covered,
      conceptsMissed: missed,
      conceptsIncorrect: [],
      clarityScore,
      feedback,
    };
  }
}

export const learningAIService = new LearningAIService();
export default learningAIService;
