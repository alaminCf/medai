import OpenAI from 'openai';
import { AnswerAssessmentResult, NextQuestionStrategyType, VivaConcept, VivaQuestionItem } from './vivaTypes';

export class AnswerAssessmentEngine {
  private static getOpenAI(): OpenAI | null {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.startsWith('sk-') && !apiKey.includes('placeholder')) {
      return new OpenAI({ apiKey });
    }
    return null;
  }

  /**
   * Detects whether candidate is asking a question, requesting clarification,
   * asking for details, or stating they forgot / need teaching.
   */
  public static isStudentAskingQuestionOrExplanation(text: string): boolean {
    const clean = (text || '').toLowerCase().trim();
    if (!clean) return false;

    // Bengali triggers
    const bengaliTriggers = [
      'ব্যাখ্যা', 'বুঝিয়ে', 'বুঝান', 'বুঝতে পারছি না', 'ডিটেইলস', 'বিস্তারিত',
      'অঙ্গ-প্রত্যঙ্গ', 'অঙ্গ প্রত্যঙ্গ', 'শরীরের অঙ্গ', 'অঙ্গসমূহ',
      'ভুলে গেছি', 'ভুলে গিয়েছি', 'ভুলে গেসি', 'ভুলে গেলাম', 'সব ভুলে',
      'মনে নেই', 'মনে নাই', 'মনে পরছে না', 'মনে পড়ছে না', 'কিছু মনে নেই',
      'একটু বলুন', 'একটু বুঝিয়ে', 'একটু বল', 'বলুন তো', 'বলো তো', 'বলো না',
      'কী', 'কি', 'কেন', 'কিভাবে', 'কীভাবে', 'ক্লু দিন', 'সাহায্য করুন',
      'সহজ করে বলুন', 'সহজভাবে বলুন', 'শিখিয়ে দিন', 'জানতে চাই'
    ];
    for (const trig of bengaliTriggers) {
      if (clean.includes(trig)) return true;
    }

    // English triggers
    const englishTriggers = [
      'explain', 'explanation', 'more details', 'details please', 'can you more details',
      'tell me more', 'give details', 'can you explain', 'could you explain', 'please explain',
      'what is', 'what are', 'what does', 'why is', 'why does', 'how does', 'how do',
      'i forgot', 'forgot everything', 'forgot all', 'cannot remember', "can't remember",
      'tell me about', 'give me a clue', 'give me a hint', 'need a clue', 'clinical context',
      'help me understand', 'teach me', "i don't understand", 'could you clarify', 'elaborate'
    ];
    for (const trig of englishTriggers) {
      if (clean.includes(trig)) return true;
    }

    // Banglish triggers
    const banglishTriggers = [
      'bujhiye bolo', 'explain koro', 'aro details', 'details bolo', 'vule gechi',
      'kisu mone nai', 'ki eta', 'ki vabe', 'kivabe hoy', 'help koro', 'clue dao'
    ];
    for (const trig of banglishTriggers) {
      if (clean.includes(trig)) return true;
    }

    // Question marks or very short queries
    if (clean.endsWith('?') || clean.includes('?')) return true;

    return false;
  }

  // Detect simple hesitation, surrender or uncertainty in English, Bangla, and Banglish
  public static isHesitantOrUnknownAnswer(text: string): boolean {
    const clean = (text || '').toLowerCase().trim();
    if (clean.length < 3) return true;

    const unknownPhrases = [
      'i don t know', "i don't know", 'dont know', 'not sure', 'i am not sure',
      'im not sure', 'no idea', 'skip', 'pass', 'i do not know', 'unsure',
      'jani na', 'jana nei', 'mone nei', 'janina', 'ami jani na', 'sure na', 'ami sure na'
    ];

    for (const phrase of unknownPhrases) {
      if (clean === phrase || clean.startsWith(phrase + ' ') || clean.endsWith(' ' + phrase)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generates a high-yield medical explanation and targeted follow-up question
   * when a candidate asks a question, requests details, or states they forgot.
   */
  public static async generateDirectExplanation(params: {
    studentQuery: string;
    question: VivaQuestionItem;
    targetConcept?: VivaConcept;
  }): Promise<{
    explanation: string;
    followUpQuestion: string;
    targetConceptName: string;
    expectedConcepts: string[];
  }> {
    const { studentQuery, question, targetConcept } = params;
    const lower = studentQuery.toLowerCase();

    // 1. Try OpenAI if configured
    const openai = this.getOpenAI();
    if (openai) {
      try {
        const prompt = `You are a compassionate, world-class medical professor and oral viva examiner.
The student is sitting in an oral viva examination.
The student asked or requested:
"${studentQuery}"

Context of current question:
"${question.questionText}"
Target Concept: ${question.targetConcept}
Expected Key Points: ${JSON.stringify(question.expectedConcepts)}

TASK:
1. Provide a direct, medically accurate, clear, and encouraging explanation (2-4 sentences) that directly answers what the student asked.
   - If the student asked in Bengali or Banglish, answer in natural Bengali using standard medical terminology.
   - If in English, answer in clear medical English.
2. Formulate a gentle, interactive, fresh follow-up question (do NOT repeat the previous question) to test their understanding of what you just explained.
Return valid JSON:
{
  "explanation": "...",
  "followUpQuestion": "...",
  "targetConceptName": "...",
  "expectedConcepts": ["concept 1", "concept 2"]
}`;

        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2
        });

        const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
        if (parsed.explanation && parsed.followUpQuestion) {
          return {
            explanation: parsed.explanation,
            followUpQuestion: parsed.followUpQuestion,
            targetConceptName: parsed.targetConceptName || question.targetConcept,
            expectedConcepts: Array.isArray(parsed.expectedConcepts) ? parsed.expectedConcepts : question.expectedConcepts
          };
        }
      } catch (err) {
        console.warn('OpenAI explanation generation failed, using rich clinical fallback:', err);
      }
    }

    // 2. High-Yield Medical Fallback Engine

    // Case A: Body organs / anatomy / general organ systems request
    if (lower.includes('অঙ্গ') || lower.includes('প্রত্যঙ্গ') || lower.includes('organ') || lower.includes('anatomy') || lower.includes('শরীর') || lower.includes('সব ভুলে')) {
      const isBengali = /[\u0980-\u09FF]/.test(studentQuery) || lower.includes('vule') || lower.includes('bolo');
      if (isBengali) {
        return {
          explanation: 'কোনো সমস্যা নেই, মেডিকেল ভাইভায় একটু জড়তা বা ভুলে যাওয়া একদম স্বাভাবিক। আসুন শান্ত হয়ে শুরু করি। আমাদের মানবদেহ মূলত কয়েকটি প্রধান তন্ত্র (systems) ও অত্যাবশ্যকীয় অঙ্গের সমন্বয়ে কাজ করে: ১. সংবহনতন্ত্রের প্রধান পাম্প হলো হৃৎপিণ্ড (Heart), যা রক্তনালির মাধ্যমে সারা শরীরে অক্সিজেনযুক্ত রক্ত পৌঁছে দেয়। ২. শ্বসনতন্ত্রের ফুসফুস (Lungs) গ্যাসীয় বিনিময় সম্পন্ন করে। ৩. স্নায়ুতন্ত্রের মস্তিষ্ক (Brain) সমস্ত শারীরিক ক্রিয়া নিয়ন্ত্রণ করে। ৪. পরিপাকতন্ত্রে পাকস্থলী ও অন্ত্র খাদ্য পরিপাক করে এবং বৃক্ক (Kidneys) রেচন বর্জ্য নিষ্কাশন করে।',
          followUpQuestion: 'যেহেতু আজ আমাদের ভাইভার মূল বিষয় কার্ডিওভাসকুলার বা সংবহনতন্ত্র—আপনি কি বলতে পারবেন হৃৎপিণ্ডে মোট কয়টি প্রকোষ্ঠ (chambers) থাকে এবং অক্সিজেনযুক্ত রক্ত কোন প্রকোষ্ঠ থেকে সারা শরীরে ছড়িয়ে পড়ে?',
          targetConceptName: 'Cardiac Chamber Anatomy & Systemic Output',
          expectedConcepts: ['Right Atrium', 'Right Ventricle', 'Left Atrium', 'Left Ventricle', 'Aorta']
        };
      } else {
        return {
          explanation: 'That is completely understandable—take a steady breath. The human body is organized into major vital organ systems: the Cardiovascular system with the heart pumping blood through vascular circuits, the Respiratory system with lungs facilitating gas exchange, the Central Nervous system with the brain orchestrating bodily control, and the Renal system filtering metabolic waste.',
          followUpQuestion: 'Given that our topic today is the Cardiovascular System, could you identify the four chambers of the human heart and describe which chamber pumps oxygenated blood into the systemic circulation?',
          targetConceptName: 'Cardiac Chamber Anatomy & Systemic Output',
          expectedConcepts: ['Right Atrium', 'Right Ventricle', 'Left Atrium', 'Left Ventricle', 'Systemic Circulation via Aorta']
        };
      }
    }

    // Case B: Details request on Isovolumetric Ventricular Contraction / Cardiac cycle
    if (lower.includes('isovolumetric') || lower.includes('detail') || lower.includes('ডিটেইলস') || lower.includes('ব্যাখ্যা') || lower.includes('ventric') || lower.includes('sound') || lower.includes('শব্দ')) {
      const isBengali = /[\u0980-\u09FF]/.test(studentQuery) || lower.includes('bujhiye') || lower.includes('bolo');
      if (isBengali) {
        return {
          explanation: 'আইসোভলিউমেট্রিক ভেন্ট্রিকুলার কনট্রাকশন হলো ভেন্ট্রিকল সংকোচনের প্রাথমিক গুরুত্বপূর্ণ পর্যায়। এই ধাপে ভেন্ট্রিকুলার মায়োকার্ডিয়ামের সংকোচন শুরু হলে ভেন্ট্রিকলের ভেতরের প্রেশার এট্রিয়ামের চেয়ে বেড়ে যায়, ফলে সাথে সাথে বাইকাসপিড (মাইট্রাল) ও ট্রাইকাসপিড ভালভ সজোরে বন্ধ হয়ে যায় এবং ১ম হার্ট সাউন্ড (S1 বা "Lubb") তৈরি হয়। এ সময় সেমিলুনার ভালভগুলোও (Aortic & Pulmonary) বন্ধ থাকে। চারটি ভালভই বন্ধ থাকায় ভেন্ট্রিকল থেকে রক্ত বের হতে পারে না, ফলে পেশিতে টান বাড়লেও ভেন্ট্রিকলের ভেতরের রক্তের আয়তন (volume) সম্পূর্ণ অপরিবর্তিত থাকে।',
          followUpQuestion: 'এখন বলুন তো, বাম ভেন্ট্রিকলের প্রেশার কত মিলিমিটার পারদ (mmHg) অতিক্রম করলে অ্যাওর্টিক ভালভ খুলে যায় এবং ভেন্ট্রিকল থেকে অ্যাওর্টায় রক্তের ইজেকশন শুরু হয়?',
          targetConceptName: 'Ventricular Ejection & Aortic Opening Pressure',
          expectedConcepts: ['80 mmHg diastolic aortic pressure', 'Aortic semilunar valve opening', 'Rapid ejection phase']
        };
      } else {
        return {
          explanation: 'Here is the precise mechanical breakdown of Isovolumetric Ventricular Contraction: 1. As the ventricles depolarize and contract, intraventricular pressure sharply rises above atrial pressure, snapping the atrioventricular (Mitral and Tricuspid) valves shut, which produces the First Heart Sound (S1). 2. At this moment, aortic and pulmonary semilunar valves remain firmly closed because ventricular pressure has not yet exceeded arterial diastolic pressure (~80 mmHg in the aorta). 3. Because all four cardiac valves are closed, the blood is contained in a closed space; muscle tension rises without fiber shortening, keeping ventricular volume strictly constant.',
          followUpQuestion: 'Following this isovolumetric tension phase, what pressure threshold must the left ventricle generate to force open the aortic valve and initiate rapid blood ejection?',
          targetConceptName: 'Ventricular Ejection & Aortic Opening Pressure',
          expectedConcepts: ['80 mmHg aortic diastolic pressure', 'Aortic valve opening', 'Rapid ventricular ejection']
        };
      }
    }

    // Case C: Preload / Frank-Starling / Regulation
    if (lower.includes('preload') || lower.includes('starling') || lower.includes('filling')) {
      return {
        explanation: 'Preload refers to the degree of stretch on ventricular myocardial fibers at the very end of diastole, clinically represented by End-Diastolic Volume (EDV). According to the Frank-Starling Law of the heart, greater venous return increases end-diastolic filling, stretching myocytes closer to their optimal actin-myosin overlap and resulting in a more forceful contraction and increased stroke volume.',
        followUpQuestion: 'What are the two primary physiological factors that regulate venous return and thereby determine ventricular preload?',
        targetConceptName: 'Venous Return & Preload Determinants',
        expectedConcepts: ['Skeletal muscle pump', 'Thoracic respiratory pump', 'Venous vascular tone']
      };
    }

    // Default Fallback
    const isBengali = /[\u0980-\u09FF]/.test(studentQuery);
    if (isBengali) {
      return {
        explanation: `বিষয়টি সহজভাবে বুঝে নেওয়া যাক। ${question.targetConcept}-এর ক্ষেত্রে মূল বিষয় হলো শারীরিক ক্রিয়াকলাপের সুনির্দিষ্ট ভারসাম্য রক্ষা করা। এখানে প্রধান মূলনীতিগুলো হলো: ${(question.expectedConcepts || []).slice(0, 2).join(' এবং ')}।`,
        followUpQuestion: `এখন এই ধারণার ওপর ভিত্তি করে বলুন তো, ${(question.expectedConcepts || [])[0] || question.targetConcept} কীভাবে শারীরবৃত্তীয় পরিবর্তন বা চাপের সময় কার্যকর ভূমিকা পালন করে?`,
        targetConceptName: question.targetConcept,
        expectedConcepts: question.expectedConcepts
      };
    } else {
      return {
        explanation: `Let us clarify this foundational concept. Regarding ${question.targetConcept}, the core clinical mechanism centers around: ${(question.expectedConcepts || []).slice(0, 2).join(' and ')}.`,
        followUpQuestion: `Building on this principle, how does ${(question.expectedConcepts || [])[0] || question.targetConcept} adapt when the body experiences acute physical stress or altered hemodynamics?`,
        targetConceptName: question.targetConcept,
        expectedConcepts: question.expectedConcepts
      };
    }
  }

  /**
   * Assesses student viva response with academic clinical rigor and semantic understanding
   */
  public static async assessAnswer(params: {
    question: VivaQuestionItem;
    studentAnswer: string;
    targetConcept?: VivaConcept;
    previousContext?: string;
  }): Promise<AnswerAssessmentResult> {
    const { question, studentAnswer, targetConcept } = params;
    const cleanAnswer = (studentAnswer || '').trim();

    // 1. Check if student is ASKING A QUESTION, REQUESTING AN EXPLANATION, OR ASKING FOR HELP
    if (this.isStudentAskingQuestionOrExplanation(cleanAnswer)) {
      const directExp = await this.generateDirectExplanation({
        studentQuery: cleanAnswer,
        question,
        targetConcept
      });

      return {
        correctness: 'UNKNOWN',
        scoreOutOf10: 4.0,
        confidence: 0.95,
        demonstratedConcepts: [],
        missingConcepts: question.expectedConcepts,
        detectedMisconceptions: [],
        isHesitantOrUnknown: true,
        communicationClarity: 'Clear',
        relevanceDepth: 'Good',
        examinerRemark: 'Candidate actively requested an explanation or conceptual guidance. Provided comprehensive medical explanation.',
        recommendedNextAction: 'FOUNDATIONAL_GUIDANCE',
        isStudentQuery: true,
        studentQueryType: 'EXPLANATION_REQUEST',
        directExplanationToStudent: directExp.explanation,
        followUpGuidedQuestion: directExp.followUpQuestion
      };
    }

    // 2. Check immediate hesitation or surrender
    if (this.isHesitantOrUnknownAnswer(cleanAnswer)) {
      const directExp = await this.generateDirectExplanation({
        studentQuery: cleanAnswer,
        question,
        targetConcept
      });

      return {
        correctness: 'UNKNOWN',
        scoreOutOf10: 2.0,
        confidence: 0.2,
        demonstratedConcepts: [],
        missingConcepts: question.expectedConcepts,
        detectedMisconceptions: [],
        isHesitantOrUnknown: true,
        communicationClarity: 'Hesitant',
        relevanceDepth: 'Shallow',
        examinerRemark: 'Candidate stated lack of certainty or requested guidance.',
        recommendedNextAction: 'FOUNDATIONAL_GUIDANCE',
        isStudentQuery: true,
        studentQueryType: 'AMNESIA_HELP',
        directExplanationToStudent: directExp.explanation,
        followUpGuidedQuestion: directExp.followUpQuestion
      };
    }

    const openai = this.getOpenAI();
    if (openai) {
      try {
        const prompt = `You are a distinguished medical school oral viva voce examiner.
Evaluate the medical student's answer to this oral examination question with high semantic understanding.
Support multilingual inputs: English, Bangla, and Banglish (Bengali written in English letters).

QUESTION:
"${question.questionText}"

QUESTION TYPE: ${question.questionType}
DIFFICULTY: ${question.difficulty}
TARGET MEDICAL CONCEPT: ${question.targetConcept}
EXPECTED KEY CONCEPTS:
${JSON.stringify(question.expectedConcepts)}

${targetConcept?.commonMisconceptions ? `KNOWN COMMON MISCONCEPTIONS TO WATCH FOR:
${JSON.stringify(targetConcept.commonMisconceptions)}` : ''}

STUDENT ORAL ANSWER:
"${cleanAnswer}"

EVALUATION RULES:
1. Accept semantically equivalent answers! If the student expresses the correct physiological or clinical mechanism in their own words (or in Bangla / Banglish), count it as correct. Do NOT require exact verbatim textbook phrasing.
2. Carefully detect misconceptions. For example, if discussing preload but the student describes vascular resistance or afterload, explicitly flag that misconception!
3. Extract what was demonstrated, what was omitted, and evaluate communication clarity.
4. Recommend next examiner strategy from:
   - "INCREASE_DIFFICULTY_ADVANCE" (if strong, complete, and confident)
   - "DEEPEN_CURRENT_CONCEPT" (if basic definition was correct and examiner should probe determinants or calculation)
   - "TARGETED_FOLLOW_UP" (if partially correct with missing elements)
   - "MISCONCEPTION_CORRECTION" (if student expressed a factual or conceptual confusion)
   - "FOUNDATIONAL_GUIDANCE" (if student is struggling or incomplete)
   - "CLINICAL_SCENARIO_APPLICATION" (if candidate demonstrates mature competence)

Return valid JSON with the exact structure:
{
  "correctness": "CORRECT" | "PARTIAL" | "INCORRECT",
  "scoreOutOf10": number (0.0 to 10.0),
  "confidence": number (0.0 to 1.0),
  "demonstratedConcepts": ["array of concepts accurately articulated"],
  "missingConcepts": ["array of expected concepts omitted"],
  "detectedMisconceptions": ["array of specific misconceptions voiced, if any"],
  "communicationClarity": "Clear" | "Adequate" | "Hesitant" | "Disorganized",
  "relevanceDepth": "Shallow" | "Good" | "Detailed & Analytical",
  "examinerRemark": "Brief 1-2 sentence examiner comment noting what was right and what needs refinement",
  "recommendedNextAction": "INCREASE_DIFFICULTY_ADVANCE" | "DEEPEN_CURRENT_CONCEPT" | "TARGETED_FOLLOW_UP" | "MISCONCEPTION_CORRECTION" | "FOUNDATIONAL_GUIDANCE" | "CLINICAL_SCENARIO_APPLICATION"
}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.15,
        });

        const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
        if (parsed.correctness) {
          return {
            correctness: parsed.correctness,
            scoreOutOf10: Number(parsed.scoreOutOf10) || 5.0,
            confidence: Number(parsed.confidence) || 0.7,
            demonstratedConcepts: Array.isArray(parsed.demonstratedConcepts) ? parsed.demonstratedConcepts : [],
            missingConcepts: Array.isArray(parsed.missingConcepts) ? parsed.missingConcepts : [],
            detectedMisconceptions: Array.isArray(parsed.detectedMisconceptions) ? parsed.detectedMisconceptions : [],
            isHesitantOrUnknown: false,
            communicationClarity: parsed.communicationClarity || 'Adequate',
            relevanceDepth: parsed.relevanceDepth || 'Good',
            examinerRemark: parsed.examinerRemark || 'Response noted.',
            recommendedNextAction: parsed.recommendedNextAction || 'DEEPEN_CURRENT_CONCEPT'
          };
        }
      } catch (err) {
        console.warn('OpenAI answer assessment error, using robust semantic fallback:', err);
      }
    }

    // High-yield Clinical Rule-Based Fallback Engine
    return this.evaluateSemanticFallback(question, cleanAnswer, targetConcept);
  }

  // Robust Semantic Fallback Engine
  private static evaluateSemanticFallback(
    question: VivaQuestionItem,
    answer: string,
    targetConcept?: VivaConcept
  ): AnswerAssessmentResult {
    const lowerAnswer = answer.toLowerCase();
    const expected = question.expectedConcepts || [];
    const demonstrated: string[] = [];
    const missing: string[] = [];
    const misconceptions: string[] = [];

    // Check known misconceptions
    if (targetConcept?.commonMisconceptions) {
      for (const misc of targetConcept.commonMisconceptions) {
        const miscKeywords = misc.misconception.toLowerCase().split(' ').filter(w => w.length > 4);
        const match = miscKeywords.filter(k => lowerAnswer.includes(k)).length;
        if (match >= 2) {
          misconceptions.push(misc.misconception);
        }
      }
    }

    // Match keywords & concepts
    for (const exp of expected) {
      const expTokens = exp.toLowerCase().split(/[^a-z0-9]/).filter(t => t.length > 3);
      const matches = expTokens.filter(t => lowerAnswer.includes(t));
      if (matches.length >= Math.max(1, Math.floor(expTokens.length * 0.4))) {
        demonstrated.push(exp);
      } else {
        missing.push(exp);
      }
    }

    let correctness: 'CORRECT' | 'PARTIAL' | 'INCORRECT' = 'PARTIAL';
    let score = 5.0;
    let nextAction: NextQuestionStrategyType = 'TARGETED_FOLLOW_UP';

    if (misconceptions.length > 0) {
      correctness = 'INCORRECT';
      score = 3.0;
      nextAction = 'MISCONCEPTION_CORRECTION';
    } else if (demonstrated.length >= Math.ceil(expected.length * 0.6) || (answer.length > 35 && missing.length === 0)) {
      correctness = 'CORRECT';
      score = 8.5;
      nextAction = 'INCREASE_DIFFICULTY_ADVANCE';
    } else if (demonstrated.length === 0 && answer.length < 25) {
      correctness = 'INCORRECT';
      score = 3.0;
      nextAction = 'FOUNDATIONAL_GUIDANCE';
    }

    return {
      correctness,
      scoreOutOf10: score,
      confidence: 0.8,
      demonstratedConcepts: demonstrated.length > 0 ? demonstrated : [expected[0] || question.targetConcept],
      missingConcepts: missing,
      detectedMisconceptions: misconceptions,
      isHesitantOrUnknown: false,
      communicationClarity: answer.length > 40 ? 'Clear' : 'Adequate',
      relevanceDepth: answer.length > 80 ? 'Detailed & Analytical' : 'Good',
      examinerRemark: correctness === 'CORRECT'
        ? 'Well articulated. Core mechanisms identified accurately.'
        : (correctness === 'PARTIAL' ? 'Partially correct. Important components were recognized, though key specifics were omitted.' : 'Reconsider the fundamental mechanisms.'),
      recommendedNextAction: nextAction
    };
  }
}
