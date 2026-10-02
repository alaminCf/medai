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

  // Detect hesitation, surrender or uncertainty in English, Bangla, and Banglish
  public static isHesitantOrUnknownAnswer(text: string): boolean {
    const clean = (text || '').toLowerCase().trim();
    if (clean.length < 3) return true;

    const unknownPhrases = [
      'i don t know', "i don't know", 'dont know', 'not sure', 'i am not sure',
      'im not sure', 'i forgot', 'cannot remember', "can't remember",
      'no idea', 'skip', 'pass', 'i do not know', 'unsure',
      // Bangla
      'jani na', 'jana nei', 'mone nei', 'mone porche na', 'janina',
      'ami jani na', 'sure na', 'ami sure na', 'ভুলে গেছি', 'মনে নেই', 'জানি না'
    ];

    for (const phrase of unknownPhrases) {
      if (clean === phrase || clean.startsWith(phrase + ' ') || clean.endsWith(' ' + phrase)) {
        return true;
      }
    }
    return false;
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

    // 1. Check immediate hesitation or surrender
    if (this.isHesitantOrUnknownAnswer(cleanAnswer)) {
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
        recommendedNextAction: 'FOUNDATIONAL_GUIDANCE'
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
