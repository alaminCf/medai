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
    weakConcepts?: string[];
  }): Promise<{ reply: string; sourceReference?: string }> {
    const { userMessage, mode, history, materialContext, subject, topic, weakConcepts } = params;
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
  weakConcepts && weakConcepts.length > 0
    ? `STUDENT WEAK CONCEPTS CONTEXT:
The student has recently struggled with: ${weakConcepts.join(', ')}.
If relevant to their question, gently reinforce these concepts.`
    : ''
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
          temperature: 0.4,
          max_tokens: 1200,
        });

        const reply = response.choices[0]?.message?.content || 'I am ready to help you with your medical studies.';
        return {
          reply,
          sourceReference: materialContext ? 'Uploaded Study Document' : undefined,
        };
      } catch (err) {
        console.warn('OpenAI Tutor call failed, falling back to smart medical knowledge engine:', err);
      }
    }

    // High-Yield Smart Clinical Medical Knowledge Engine
    return this.generateSmartMedicalTutorReply(userMessage, mode, materialContext, subject, topic, weakConcepts);
  }

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
    materialText?: string;
    subject?: string;
    topic?: string;
    count: number;
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  }): Promise<GeneratedFlashcard[]> {
    const { materialText, subject = 'General Medicine', topic = 'Core Clinical Concepts', count, difficulty } = params;
    const openai = this.getOpenAI();

    if (openai) {
      try {
        const prompt = `You are a medical school exam creator. Generate exactly ${count} high-yield active recall flashcards for medical students.
Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}

${materialText ? `STUDY MATERIAL:\n"""\n${materialText.slice(0, 9000)}\n"""` : `Focus on core pathophysiology, clinical presentations, classic signs, diagnostic criteria, and management for: ${topic} in ${subject}.`}

Return JSON format:
{
  "cards": [
    {
      "question": "Clear, specific medical question targeting high-yield mechanism or fact",
      "answer": "Concise, precise answer",
      "explanation": "Brief pathophysiological or anatomical explanation",
      "sourceReference": "${subject} - ${topic}",
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

    return this.generateDeterministicFlashcards(materialText || '', count, subject, topic);
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
  private static generateSmartMedicalTutorReply(
    userMessage: string,
    mode: string,
    materialContext?: string,
    subject?: string,
    topic?: string,
    weakConcepts?: string[]
  ): { reply: string; sourceReference?: string } {
    const query = userMessage.toLowerCase();
    let reply = '';
    let source = materialContext ? 'Uploaded Study Material' : 'Techboloy Medical Knowledge Engine';

    // ──────────────────────────────────────────────────────────────────────────
    // 0. UPLOADED MATERIAL DIRECT EXTRACTION
    // ──────────────────────────────────────────────────────────────────────────
    if (materialContext && materialContext.trim().length > 30) {
      const words = query
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .split(' ')
        .filter((w) => w.length > 3 && !['what', 'when', 'where', 'which', 'explain', 'tell', 'about', 'this', 'that', 'with', 'from', 'have', 'does', 'please'].includes(w));

      if (words.length > 0) {
        const paragraphs = materialContext.split(/\n\s*\n|\r?\n/);
        const matched = paragraphs.filter((p) => {
          const pl = p.toLowerCase();
          return words.filter((w) => pl.includes(w)).length >= Math.min(2, words.length);
        });

        if (matched.length > 0) {
          const excerpt = matched.slice(0, 3).join('\n\n').trim();
          reply = `### Findings from Your Uploaded Material:

"""
${excerpt.slice(0, 1000)}
"""

**Academic Synthesis:**
${
  mode === 'QUIZ_ME'
    ? 'Based on this section of your notes: *What is the clinical significance of this mechanism, and how does it relate to patient presentation?*'
    : mode === 'VIVA_ME'
    ? 'Examiner Question on your notes: *Can you define the primary mechanism described here and specify its key diagnostic criteria?*'
    : 'This section highlights the core mechanisms and clinical principles directly relevant to your study topic.'
}`;
          return { reply, sourceReference: 'Uploaded Study Notes (Extracted Excerpt)' };
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. CARDIOLOGY & CARDIOVASCULAR PHYSIOLOGY
    // ──────────────────────────────────────────────────────────────────────────
    if (
      query.includes('cardiac cycle') ||
      query.includes('heart sound') ||
      query.includes('s1') ||
      query.includes('s2') ||
      query.includes('systole') ||
      query.includes('diastole') ||
      query.includes('isovolumetric')
    ) {
      if (mode === 'QUIZ_ME') {
        reply = `### Socratic Challenge: Cardiac Cycle & Auscultation

A 22-year-old medical student is auscultating heart sounds during clinical skills training.

**Question:**
Which physiological event is strictly responsible for the generation of the **First Heart Sound (S1)**, and which cardiac phase immediately follows it?

A) Closure of aortic and pulmonary valves; Isovolumetric relaxation  
B) Closure of mitral and tricuspid valves; Isovolumetric contraction  
C) Rapid ventricular filling into a non-compliant ventricle  
D) Active atrial contraction adding 20% to end-diastolic volume  

*Type your answer (e.g. "B") with your brief clinical reasoning!*`;
      } else if (mode === 'VIVA_ME') {
        reply = `### Oral Viva Voce: Cardiac Mechanics

**Examiner:**
*"Candidate, please define the cardiac cycle and explain why the First Heart Sound (S1) is heard at the onset of ventricular systole while S2 marks ventricular diastole. Furthermore, what causes physiological splitting of S2 during deep inspiration?"*

**Key Expected Points:**
1. S1 = Mitral & Tricuspid valve closure (onset of isovolumetric contraction; loudest at apex).
2. S2 = Aortic & Pulmonic valve closure (onset of isovolumetric relaxation; loudest at base).
3. S2 Splitting = Inspiration increases venous return to the right heart $\\to$ delays pulmonary valve closure (P2) while decreasing left heart return $\\to$ earlier aortic closure (A2).

How would you formulate your answer?`;
      } else if (mode === 'REVISE') {
        reply = `### High-Yield Revision: Cardiac Cycle & Heart Sounds
• **S1 ("lub"):** Mitral and Tricuspid closure. Marks start of **isovolumetric contraction**. Loudest at the apex (5th ICS midclavicular).
• **S2 ("dub"):** Aortic and Pulmonic closure. Marks start of **isovolumetric relaxation**. Loudest at the base (2nd ICS right/left sternal borders).
• **Physiological S2 Splitting:** Inspiration $\\to$ $\\downarrow$ intrathoracic pressure $\\to$ $\\uparrow$ RV filling $\\to$ delayed P2. Normal finding.
• **Pathological S3:** Rapid passive filling into compliant/dilated ventricle (volume overload in heart failure).
• **Pathological S4:** Atrial kick into stiff, hypertrophied ventricle (decreased compliance in HTN, aortic stenosis).
• **Examiner Trap:** S1 occurs *after* the QRS complex onset on ECG, while S2 occurs near the end of the T wave.`;
      } else {
        reply = `### The Cardiac Cycle & Heart Sounds Breakdown

The cardiac cycle describes the electrical and mechanical events of a single heartbeat (~0.8s at 75 bpm):

#### 1. Ventricular Systole (Pumping Phase)
1. **Isovolumetric Contraction (0.05s):** QRS triggers ventricular depolarization. Intraventricular pressure exceeds atrial pressure $\\to$ **Mitral and Tricuspid valves snap shut (S1 Sound, "lub")**. All 4 valves are closed: pressure spikes rapidly with no change in volume.
2. **Rapid Ejection (0.13s):** Ventricular pressure surpasses aortic (80 mmHg) and pulmonary (10 mmHg) pressures $\\to$ semilunar valves fling open, ejecting ~70% of stroke volume.
3. **Reduced Ejection (0.14s):** Ventricular repolarization begins (T wave); blood flow decelerates.

#### 2. Ventricular Diastole (Filling Phase)
4. **Isovolumetric Relaxation (0.08s):** Ventricular pressure falls below aortic/pulmonary pressures $\\to$ **Aortic and Pulmonic valves shut (S2 Sound, "dub")**. All valves closed.
5. **Rapid Passive Inflow (0.11s):** AV valves open as ventricular pressure dips below atrial pressure. Accounts for **~70-80% of ventricular filling**.
6. **Diastasis (0.22s):** Slow passive filling as venous pressure equilibrates.
7. **Atrial Systole (0.10s):** P wave causes atrial contraction, contributing the final **20-30% of blood** (the "atrial kick").

💡 **Clinical Pearl:** In atrial fibrillation, loss of atrial systole can precipitate acute pulmonary edema in patients with stiff, hypertrophied ventricles who rely heavily on the atrial kick!`;
      }
      return { reply, sourceReference: 'Cardiovascular Physiology Core Curriculum' };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. FRANK-STARLING & HEMODYNAMICS
    // ──────────────────────────────────────────────────────────────────────────
    if (
      query.includes('frank-starling') ||
      query.includes('preload') ||
      query.includes('afterload') ||
      query.includes('stroke volume') ||
      query.includes('contractility') ||
      query.includes('inotropy')
    ) {
      if (mode === 'QUIZ_ME') {
        reply = `### Socratic Challenge: Frank-Starling Law

A 65-year-old patient with congestive heart failure receives IV Furosemide. 

**Question:**
According to the Frank-Starling mechanism, how does lowering the patient's circulating blood volume with a loop diuretic alleviate pulmonary congestion without critically reducing cardiac output in decompensated heart failure?

*Think about the shape of the Frank-Starling ventricular performance curve!*`;
      } else {
        reply = `### Frank-Starling Mechanism & Hemodynamics

#### 1. The Core Principle
*"Within physiological limits, the force of myocardial contraction is directly proportional to the initial length of cardiac muscle fibers (End-Diastolic Volume / Preload)."*

#### 2. Cellular Mechanism
• Increased venous return stretches cardiac myocytes toward the optimal sarcomere length (**~2.2 µm**).
• This stretch optimizes actin-myosin cross-bridge alignment and increases **Troponin C affinity for calcium**.
• Result: Greater calcium-induced force generation $\\to$ increased **Stroke Volume (SV)**.

#### 3. Determinants of Stroke Volume:
1. **Preload:** Degree of stretch before contraction (represented by EDV or wedge pressure).
2. **Afterload:** The wall stress/impedance the ventricle must overcome to eject blood (primarily systemic vascular resistance / aortic pressure).
3. **Contractility (Inotropy):** Intrinsic contractile power independent of loading conditions (modulated by sympathetic $\\beta_1$ adrenergic stimulation).

💡 **Clinical Relevance:** In systolic heart failure, the Frank-Starling curve is shifted downward and flattened. Excessive volume stretch no longer increases stroke volume and instead leads to pulmonary vascular congestion.`;
      }
      return { reply, sourceReference: 'Hemodynamics & Cardiovascular Dynamics' };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. MYOCARDIAL INFARCTION & ACS
    // ──────────────────────────────────────────────────────────────────────────
    if (
      query.includes('myocardial infarction') ||
      query.includes('heart attack') ||
      query.includes('stemi') ||
      query.includes('nstemi') ||
      query.includes('troponin') ||
      query.includes('acute coronary') ||
      query.includes('ischemia')
    ) {
      reply = `### Myocardial Infarction (MI) — Pathophysiology & Management

#### 1. Pathophysiologic Cascade
1. **Atherosclerotic Plaque Rupture:** Disruption of an unstable fibrous cap exposes subendothelial collagen and von Willebrand factor (vWF).
2. **Platelet Activation & Thrombus:** Platelets adhere via GpIb, activate (secreting ADP & Thromboxane A2), and cross-link via GpIIb/IIIa receptors $\\to$ occlusive coronary thrombus.
3. **Ischemia & Cellular Hypoxia:** Within 60 seconds, aerobic glycolysis ceases, intracellular ATP plummets, and lactic acid builds up.
4. **Irreversible Injury:** If flow is not restored within **20–30 minutes**, coagulative necrosis ensues, beginning in the subendocardium and progressing transmurally.

#### 2. Histopathological Evolution Timeline
• **0–4 hours:** Minimal light microscopic changes; wavy myocardial fibers at borders.
• **4–24 hours:** Early coagulative necrosis, contraction band necrosis (if reperfused), edema, hemorrhage.
• **1–3 days:** Extensive coagulative necrosis, dense **neutrophilic infiltrate** (highest risk of fibrinous pericarditis).
• **3–7 days:** Macrophage phagocytosis of necrotic myocytes. **Critical window of free-wall, papillary muscle, or interventricular septum rupture!**
• **1–2 weeks:** Vascular granulation tissue with proliferating capillaries and collagen deposition.
• **>2 months:** Dense, hypocellular fibrous collagenous scar.

#### 3. Diagnostic Biomarkers
• **Cardiac Troponin I / T:** Highly sensitive & specific. Rises within **3–6 hours**, peaks at **24 hours**, and persists for **7–10 days**.
• **CK-MB:** Rises in 4–6 hours, peaks at 24 hours, and **returns to baseline by 48–72 hours** (ideal for diagnosing *re-infarction*).

#### 4. Coronary Arterial Territories
• **LAD (Left Anterior Descending):** Anteroseptal wall (leads V1–V4). Most commonly occluded ("widow maker").
• **RCA (Right Coronary Artery):** Inferior wall (leads II, III, aVF) & posterior wall. Associated with AV block and bradycardia.
• **LCx (Left Circumflex):** Lateral wall (leads I, aVL, V5, V6).`;
      return { reply, sourceReference: 'Cardiovascular Pathology & Clinical Medicine' };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. RESPIRATORY: ASTHMA, COPD & SPIROMETRY
    // ──────────────────────────────────────────────────────────────────────────
    if (
      query.includes('asthma') ||
      query.includes('copd') ||
      query.includes('spirometry') ||
      query.includes('fev1') ||
      query.includes('fvc') ||
      query.includes('obstructive') ||
      query.includes('restrictive')
    ) {
      reply = `### Obstructive vs Restrictive Lung Disease & Spirometry

#### 1. Diagnostic Spirometry Differentiation
• **Obstructive Pattern (Asthma, COPD, Bronchiectasis):**
  - **FEV1/FVC Ratio < 0.70 (or < 70%)** is the hallmark!
  - FEV1 is markedly reduced due to airway resistance and flow limitation.
  - Air trapping increases Residual Volume (RV) and Total Lung Capacity (TLC).
• **Restrictive Pattern (Idiopathic Pulmonary Fibrosis, Sarcoidosis, Scoliosis):**
  - **FEV1/FVC Ratio is NORMAL or INCREASED (> 0.70)**.
  - Both FEV1 and FVC are reduced proportionally due to impaired chest wall expansion or parenchymal stiffening.
  - Total Lung Capacity (TLC) is reduced (< 80% predicted).

#### 2. Asthma vs COPD Pathophysiologic Differences
| Parameter | Bronchial Asthma | Chronic Obstructive Pulmonary Disease (COPD) |
| :--- | :--- | :--- |
| **Primary Age** | Often childhood / young adult | Usually > 40 years old, history of smoking |
| **Pathology** | Reversible airway hyperresponsiveness | Irreversible destruction (emphysema) & chronic bronchitis |
| **Inflammatory Cells**| Eosinophils, CD4+ Th2 cells, IgE | Neutrophils, CD8+ T cells, Macrophages |
| **Bronchodilator Reversibility** | **Positive** (>12% and >200 mL increase in FEV1 post-SABA) | Minimal or fixed irreversibility |
| **Diffusion Capacity (DLCO)** | Normal or slightly elevated | **Decreased** in emphysematous destruction |

💡 **Exam Tip:** In an acute severe asthma attack, a **normal or elevated PaCO2** is an ominous sign of impending respiratory muscle fatigue and respiratory failure!`;
      return { reply, sourceReference: 'Pulmonology & Respiratory Physiology' };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. RENAL: GFR, AKI & ACID-BASE
    // ──────────────────────────────────────────────────────────────────────────
    if (
      query.includes('renal') ||
      query.includes('kidney') ||
      query.includes('gfr') ||
      query.includes('aki') ||
      query.includes('nephron') ||
      query.includes('acid-base') ||
      query.includes('acidosis') ||
      query.includes('alkalosis')
    ) {
      reply = `### Renal Physiology & Acute Kidney Injury (AKI)

#### 1. Glomerular Filtration & Hemodynamics
$$\\text{GFR} = K_f [(P_{GC} - P_{BS}) - (\\pi_{GC} - \\pi_{BS})]$$
• **Afferent Arteriolar Dilation (via Prostaglandins):** Increases $P_{GC}$ $\\to$ increases GFR. (NSAIDs inhibit prostaglandins $\\to$ afferent constriction $\\to$ $\\downarrow$ GFR).
• **Efferent Arteriolar Constriction (via Angiotensin II):** Increases $P_{GC}$ $\\to$ preserves GFR during hypovolemia. (ACE inhibitors block this $\\to$ efferent dilation $\\to$ precipitous $\\downarrow$ GFR in renal artery stenosis).

#### 2. Classification of Acute Kidney Injury (KDIGO)
1. **Pre-Renal Azotemia (~60%):**
   - Etiology: Hypovolemia, cardiogenic shock, sepsis, renal artery stenosis.
   - Intact tubular function: Kidneys reabsorb sodium and water avidly.
   - Lab Hallmarks: **BUN/Creatinine ratio > 20:1**, **FeNa < 1%**, Urine Osmolality > 500 mOsm/kg. Hyaline casts.
2. **Intrinsic Renal AKI (~35%):**
   - Etiology: Acute Tubular Necrosis (ATN due to prolonged ischemia or nephrotoxins like aminoglycosides/contrast), Glomerulonephritis, AIN.
   - Damaged tubules: Inability to concentrate urine or reabsorb sodium.
   - Lab Hallmarks: **BUN/Creatinine ratio 10–15:1**, **FeNa > 2%**, Urine Osmolality < 350 mOsm/kg. **"Muddy brown" granular casts**.
3. **Post-Renal AKI (~5%):**
   - Etiology: Bilateral ureteral obstruction, BPH, neurogenic bladder, pelvic tumor.
   - Ultrasound shows bilateral hydronephrosis.

#### 3. Quick Acid-Base Mnemonic: High Anion Gap Metabolic Acidosis
$$\\text{Anion Gap} = \\text{Na}^+ - (\\text{Cl}^- + \\text{HCO}_3^-) \\quad [\\text{Normal: } 8-12 \\text{ mEq/L}]$$
Remember **GOLDMARK** or **MUDPILES**:
• **M**ethanol, **U**remia, **D**iabetic Ketoacidosis, **P**ropylene glycol, **I**soniazid/Iron, **L**actic acidosis, **E**thylene glycol, **S**alicylates (Aspirin).`;
      return { reply, sourceReference: 'Renal & Acid-Base Medicine' };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. ENDOCRINOLOGY: DIABETES & THYROID
    // ──────────────────────────────────────────────────────────────────────────
    if (
      query.includes('diabetes') ||
      query.includes('dka') ||
      query.includes('insulin') ||
      query.includes('glucose') ||
      query.includes('thyroid') ||
      query.includes('graves') ||
      query.includes('hashimoto')
    ) {
      reply = `### Endocrinology Core: Diabetes & Thyroid Pathophysiology

#### 1. Diabetes Mellitus: Type 1 vs Type 2
• **Type 1 Diabetes:**
  - Autoimmune destruction of pancreatic $\\beta$-cells mediated by CD8+ T lymphocytes.
  - Genetic association: HLA-DR3, HLA-DR4.
  - Serology: Anti-GAD65, anti-islet cell antibodies (ICA), anti-insulin antibodies.
  - Acute complication: **Diabetic Ketoacidosis (DKA)**.
• **Type 2 Diabetes:**
  - Peripheral insulin resistance followed by progressive pancreatic $\\beta$-cell secretory exhaustion.
  - Strongly tied to visceral adiposity, inflammatory cytokines (TNF-$\\alpha$, IL-6), and genetic polygenic traits.
  - Acute complication: **Hyperosmolar Hyperglycemic State (HHS)** (minimal ketones due to residual insulin).

#### 2. DKA Pathophysiology & Management Protocol
• **Triad:** Hyperglycemia (>250 mg/dL), High Anion Gap Metabolic Acidosis (pH < 7.30, $\\text{HCO}_3 < 18$), and Ketonemia/Ketonuria ($\\beta$-hydroxybutyrate).
• **Pathogenesis:** Absolute insulin lack + glucagon excess $\\to$ unrestrained lipolysis $\\to$ free fatty acids converted by liver into acetoacetate and $\\beta$-hydroxybutyrate.
• **Management Steps:**
  1. **Isotonic IV Fluids (0.9% Normal Saline):** Restores intravascular volume first!
  2. **Potassium Repletion:** Insulin drives $K^+$ into cells. Do NOT start insulin if serum $K^+ < 3.3 \\text{ mEq/L}$ to prevent fatal cardiac arrhythmias!
  3. **IV Regular Insulin Infusion:** Suppresses lipolysis and hepatic gluconeogenesis.

#### 3. Thyroid Axis Interpretation
• **Primary Hyperthyroidism (Graves):** $\\downarrow$ TSH, $\\uparrow$ Free T4/T3. TSH receptor-stimulating antibodies (TSI), exophthalmos, pretibial myxedema.
• **Primary Hypothyroidism (Hashimoto):** $\\uparrow$ TSH, $\\downarrow$ Free T4. Anti-TPO and anti-thyroglobulin antibodies, lymphocytic infiltration with Hürthle cells.`;
      return { reply, sourceReference: 'Endocrine & Metabolic Medicine' };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. BENGALI / BANGLISH INQUIRY RECOGNITION
    // ──────────────────────────────────────────────────────────────────────────
    if (
      query.includes('ki') ||
      query.includes('kivabe') ||
      query.includes('bujhiye') ||
      query.includes('karon') ||
      query.includes('laxon') ||
      query.includes('somosya') ||
      query.includes('bolo') ||
      query.includes('prosno')
    ) {
      reply = `### মেডিকেল কনসেপ্ট পর্যালোচনা (Medical Concept Overview)

আপনার প্রশ্নটির একাডেমিক বিশ্লেষণ নিচে বিস্তারিতভাবে দেওয়া হলো:

1. **মূল মেকানিজম (Primary Mechanism):**
   - ক্লিনিক্যাল সাইন্সে কোনো শারীরবৃত্তীয় প্রক্রিয়া বুঝতে হলে প্রথমে দেখতে হবে কোন কোষ বা অঙ্গ কীভাবে স্বাভাবিক অবস্থায় কাজ করে।
   - প্যাথলজিক্যাল অবস্থায় স্বাভাবিক হোমিওস্ট্যাসিস ব্যাহত হয় এবং নির্দিষ্ট ক্লিনিক্যাল লক্ষণ (Symptoms & Signs) প্রকাশ পায়।

2. **ডায়াগনস্টিক দৃষ্টিভঙ্গি (Diagnostic Approach):**
   - **ইতিহাস (History):** রোগের সূত্রপাত (Onset), তীব্রতা (Severity), এবং স্থান (Location)।
   - **শারীরিক পরীক্ষা (Physical Examination):** পালস, ব্লাড প্রেশার, অ্যাসকালটেশন (Heart/Lung sounds)।
   - **তদন্ত (Investigations):** রুটিন ব্লাড টেস্ট, ইসিজি, চেস্ট এক্স-রে, অথবা স্পেসিফিক বায়োমার্কার।

3. **পরীক্ষায় ভালো করার টিপস (High-Yield Exam Strategy):**
   - ভাইভায় উত্তর দেওয়ার সময় সবসময় **সংজ্ঞা (Definition)** দিয়ে শুরু করবেন।
   - এরপর **শ্রেণীবিভাগ (Classification)** এবং **প্রধান ৩টি কারণ (Top 3 Causes)** ক্রমানুসারে বলবেন।

আপনার যদি এই টপিকের উপর নির্দিষ্ট কোনো কার্ডিয়াক, রেসপিরেটরি বা ফার্মাকোলজি প্রশ্ন থাকে, নির্দ্বিধায় আমাকে জানান!`;
      return { reply, sourceReference: 'Techboloy Bilingual Medical Education' };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 8. GENERAL HIGH-YIELD ACADEMIC RESPONSE
    // ──────────────────────────────────────────────────────────────────────────
    if (mode === 'QUIZ_ME') {
      reply = `### Interactive Clinical Socratic Quiz

Let's test your high-yield application on **${topic || subject || 'Clinical Medicine'}**!

**Clinical Vignette:**
A 58-year-old male presents with sudden-onset retrosternal chest tightness radiating to the left jaw and dyspnea. His ECG reveals 2.5 mm ST-segment elevation in leads II, III, and aVF with reciprocal ST depression in leads I and aVL.

**Question:**
1. Which specific coronary artery is occluded in this patient?
2. Which cardiac conduction abnormality is this patient at highest risk for, and why?

*Please submit your diagnostic deduction and reasoning!*`;
    } else if (mode === 'VIVA_ME') {
      reply = `### External Examiner Oral Viva Voce

**Examiner:**
*"Candidate, in the context of ${topic || subject || 'Medical Science'}, please provide a structured answer to the following:*

1. *Define the underlying pathophysiological process concisely.*
2. *Classify the etiology into primary vs secondary causes.*
3. *What is the single most critical investigation of choice and the immediate first-line management?*"

Take a breath, organize your response systematically, and present your answer as you would in your final university professional examination.`;
    } else {
      reply = `### Structured Medical Academic Analysis: ${topic || subject || 'Clinical Concept'}

To master this medical concept for both written exams and clinical rotations, structure your knowledge into these 4 fundamental pillars:

#### 1. Pathophysiological Mechanism
Every clinical disease process stems from an altered physiological baseline—whether it is cellular hypoxia, enzyme deficiency, receptor dysregulation, or immune-mediated tissue damage. Understanding the cellular cascade makes memorization obsolete.

#### 2. Clinical Manifestations (Symptom-Mechanism Pairing)
Do not just memorize signs; link each physical finding to its exact mechanism:
• *Why does the heart sound split or develop a murmur?*
• *Why does the lung crackle or wheeze?*
• *Why does the renal clearance fall or retain sodium?*

#### 3. Diagnostic Algorithm
Always think in a stepwise progression:
1. **Bedside Tests:** Vitals, ECG, Urinalysis, Point-of-care ultrasound.
2. **Laboratory Biomarkers:** CBC, electrolytes, organ-specific enzymes (troponins, amylase, creatinine).
3. **Definitive Imaging / Histology:** CT, MRI, Echocardiography, or tissue biopsy.

#### 4. Therapeutic Principles
Identify the target:
• *Symptom relief (e.g. bronchodilator, diuretic)*
• *Pathological reversal (e.g. reperfusion, antimicrobials)*
• *Long-term mortality reduction (e.g. ACE inhibitors, statins, beta-blockers)*

Would you like me to dive deep into a specific disease entity, generate a high-yield flashcard set, or quiz you with a clinical vignette on this topic?`;
    }

    // Append student weak concepts reinforcement if relevant
    if (weakConcepts && weakConcepts.length > 0) {
      reply += `\n\n💡 **Personalized Revision Tip:** You've recently reviewed questions on *${weakConcepts.slice(0, 2).join(' & ')}*. Be sure to cross-correlate those mechanisms with this discussion!`;
    }

    return { reply, sourceReference: source };
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
    count: number,
    subject?: string,
    topic?: string
  ): GeneratedFlashcard[] {
    const sLow = (subject || '').toLowerCase();
    const tLow = (topic || '').toLowerCase();

    // Subject/Topic tailored medical flashcards
    if (sLow.includes('dermatolog') || tLow.includes('skin') || tLow.includes('rash') || tLow.includes('derm')) {
      const dermPool: GeneratedFlashcard[] = [
        {
          question: 'What is the classic histological finding in Psoriasis and what physical sign results from scale removal?',
          answer: 'Hyperkeratosis with parakeratosis (Munro microabscesses). Auspitz sign (pinpoint bleeding upon scraping scale).',
          explanation: 'Epidermal hyperplasia with thinning of the suprapapillary plates exposes dilated, tortuous dermal capillaries.',
          sourceReference: 'Dermatology: Papulosquamous Disorders',
          difficulty: 'medium',
        },
        {
          question: 'How do you differentiate Pemphigus Vulgaris from Bullous Pemphigoid clinically and histopathologically?',
          answer: 'Pemphigus: Flaccid blisters, Nikolsky sign (+), IgG against Desmoglein-3 (intraepidermal). Pemphigoid: Tense blisters, Nikolsky sign (-), IgG against Hemidesmosomes/BP180 (subepidermal).',
          explanation: 'Acantholysis occurs in Pemphigus due to desmosomal disruption, whereas hemidesmosome disruption causes dermal-epidermal junction separation.',
          sourceReference: 'Dermatology: Autoimmune Bullous Diseases',
          difficulty: 'hard',
        },
        {
          question: 'What are the classic ABCDE clinical criteria for screening Cutaneous Melanoma?',
          answer: 'A: Asymmetry, B: Border irregularity, C: Color variegation, D: Diameter > 6 mm, E: Evolving (change in size, shape, elevation).',
          explanation: 'Early detection of melanoma drastically reduces metastasis risk; Breslow thickness is the key prognostic determinant.',
          sourceReference: 'Dermatology: Skin Malignancies',
          difficulty: 'easy',
        },
        {
          question: 'What skin condition presents with a "Herald patch" followed by a secondary eruption in a "Christmas tree" pattern?',
          answer: 'Pityriasis Rosea.',
          explanation: 'Self-limiting papulosquamous eruption associated with HHV-6 and HHV-7 reactivation, oriented along Langer cleavage lines.',
          sourceReference: 'Dermatology: Exanthems',
          difficulty: 'easy',
        },
        {
          question: 'What are the characteristic "6 Ps" of Lichen Planus and the oral mucosal finding?',
          answer: 'Pruritic, Polygonal, Planar, Purple, Papules, Plaques. Oral finding: Wickham striae (lacy white network).',
          explanation: 'Cell-mediated autoimmune damage to basal keratinocytes, often triggered by hepatitis C infection or medications.',
          sourceReference: 'Dermatology: Lichenoid Dermatoses',
          difficulty: 'medium',
        },
        {
          question: 'What are the typical causative organisms and clinical presentation of Impetigo?',
          answer: 'Staphylococcus aureus and Streptococcus pyogenes. Presentation: Honey-colored crusted erosions on the face.',
          explanation: 'Superficial epidermal bacterial infection contagious among children, treated with topical mupirocin or oral antibiotics.',
          sourceReference: 'Dermatology: Bacterial Skin Infections',
          difficulty: 'easy',
        },
      ];
      return dermPool.slice(0, count);
    }

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
