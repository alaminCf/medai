import {
  AnswerAssessmentResult,
  ExaminerResponseType,
  ExaminerStyle,
  NextQuestionStrategyType,
  VivaConcept,
  VivaQuestionItem
} from './vivaTypes';

export class ExaminerResponseEngine {
  /**
   * Formulates a natural conversational transition prefix from the examiner
   */
  public static generateTransitionFeedback(params: {
    assessment: AnswerAssessmentResult;
    style: ExaminerStyle;
    currentQuestion: VivaQuestionItem;
    targetConcept?: VivaConcept;
  }): { feedback: string; responseType: ExaminerResponseType } {
    const { assessment, style, currentQuestion, targetConcept } = params;

    // 0. Student Query / Explanation Request: Directly deliver the medical explanation!
    if (assessment.isStudentQuery && assessment.directExplanationToStudent) {
      let prefix = assessment.directExplanationToStudent;
      if (style === 'FRIENDLY_TEACHER' && !prefix.startsWith('কোনো') && !prefix.startsWith('Of course')) {
        prefix = `Of course! ${prefix}`;
      }
      return { feedback: prefix, responseType: 'ENCOURAGE' };
    }

    // 1. Misconception response: directly address the misconception without being rude
    if (assessment.detectedMisconceptions.length > 0) {
      const misc = assessment.detectedMisconceptions[0];
      const match = targetConcept?.commonMisconceptions?.find(m => m.misconception === misc);
      const correction = match?.correction || 'Let us clarify that specific mechanism.';

      let feedback = '';
      switch (style) {
        case 'STRICT_EXAMINER':
          feedback = `No, that is inaccurate. ${correction}`;
          break;
        case 'FRIENDLY_TEACHER':
          feedback = `I see why you might think that, but that actually describes a different concept. ${correction} Let us revisit:`;
          break;
        case 'CLINICAL_EXAMINER':
          feedback = `In clinical practice, that distinction is crucial. ${correction} Consider:`;
          break;
        case 'RAPID_FIRE':
          feedback = `Not quite. ${correction}`;
          break;
        case 'CALM_PROFESSIONAL':
        default:
          feedback = `You are touching on another concept. ${correction} Let us focus back:`;
          break;
      }
      return { feedback, responseType: 'CORRECT' };
    }

    // 2. Hesitant / Unknown response
    if (assessment.isHesitantOrUnknown) {
      let feedback = '';
      switch (style) {
        case 'STRICT_EXAMINER':
          feedback = 'Understood. Let us move to a foundational principle.';
          break;
        case 'FRIENDLY_TEACHER':
          feedback = 'That is perfectly okay—take a breath. Let us break it down into an easier building block.';
          break;
        case 'CLINICAL_EXAMINER':
          feedback = 'No problem. Let us walk back to bedside fundamentals.';
          break;
        case 'RAPID_FIRE':
          feedback = 'Noted. Next concept:';
          break;
        case 'CALM_PROFESSIONAL':
        default:
          feedback = 'Understood. Let us approach it from a more fundamental angle.';
          break;
      }
      return { feedback, responseType: 'ENCOURAGE' };
    }

    // 3. Partially correct answer
    if (assessment.correctness === 'PARTIAL') {
      const demonstrated = assessment.demonstratedConcepts.slice(0, 2).join(' and ');
      const missing = assessment.missingConcepts[0] || 'the precise regulatory mechanism';

      const pool = [
        `You mentioned ${demonstrated || 'key components'}, which is on the right track. However, you omitted ${missing}.`,
        `Good start. You identified ${demonstrated || 'the initial event'}, but let us be more precise regarding ${missing}.`,
        `That is partly correct. Think about how ${missing} factors into this.`,
        `Right in principle, but incomplete. Let us look closer at ${missing}.`
      ];
      const pick = pool[Math.floor(Math.random() * pool.length)];

      let prefix = pick;
      if (style === 'STRICT_EXAMINER') {
        prefix = `Partly correct. You missed ${missing}.`;
      } else if (style === 'FRIENDLY_TEACHER') {
        prefix = `Good effort! You got ${demonstrated || 'the main idea'} right. Can you also think about ${missing}?`;
      }
      return { feedback: prefix, responseType: 'ASK_FOLLOWUP' };
    }

    // 4. Correct answer - use varied natural responses (NOT just repetitive "Excellent!")
    const naturalPraise = [
      'Yes, that is accurate.',
      'Correct.',
      'Right.',
      'Good. Now let us go one step deeper.',
      'That is an accurate explanation.',
      'Exactly right.',
      'Well stated. Let us take that further.'
    ];
    const pick = naturalPraise[Math.floor(Math.random() * naturalPraise.length)];

    let feedback = pick;
    if (style === 'STRICT_EXAMINER') {
      feedback = 'Correct. Proceeding:';
    } else if (style === 'CLINICAL_EXAMINER') {
      feedback = 'Correct. Now let us translate that into a clinical setting.';
    } else if (style === 'RAPID_FIRE') {
      feedback = 'Right. Next:';
    }

    return { feedback, responseType: 'PRAISE_BRIEFLY' };
  }

  /**
   * Formulates an adaptive follow-up or next-tier question
   */
  public static generateNextAdaptiveQuestion(params: {
    strategy: NextQuestionStrategyType;
    concept: VivaConcept;
    assessment: AnswerAssessmentResult;
    turnNumber: number;
    style: ExaminerStyle;
    clinicalScenario?: string;
  }): { questionText: string; questionType: any; expectedConcepts: string[] } {
    const { strategy, concept, assessment, turnNumber, style, clinicalScenario } = params;

    // 1. MISCONCEPTION CORRECTION STRATEGY
    if (strategy === 'MISCONCEPTION_CORRECTION' && concept.commonMisconceptions.length > 0) {
      const probe = concept.commonMisconceptions[0].probeQuestion;
      return {
        questionText: probe,
        questionType: 'Correction / Misconception Check',
        expectedConcepts: concept.expectedConcepts.slice(0, 3)
      };
    }

    // 2. TARGETED FOLLOW-UP STRATEGY
    if (strategy === 'TARGETED_FOLLOW_UP' && assessment.missingConcepts.length > 0) {
      const missingIdx = (turnNumber - 1) % assessment.missingConcepts.length;
      const missingTarget = assessment.missingConcepts[missingIdx];
      const templates = [
        `Building on what you said, can you specify what role ${missingTarget} plays here?`,
        `You touched on important principles, but how does ${missingTarget} specifically fit into this mechanism?`,
        `Can you elaborate further on ${missingTarget} in this physiological context?`,
        `How would you quantitatively or functionally define ${missingTarget} in relation to this?`
      ];
      const qText = templates[(turnNumber - 1) % templates.length];
      return {
        questionText: qText,
        questionType: 'Follow-up',
        expectedConcepts: [missingTarget, concept.name]
      };
    }

    // 3. FOUNDATIONAL GUIDANCE STRATEGY (When student says "I don't know" or struggles)
    if (strategy === 'FOUNDATIONAL_GUIDANCE') {
      const basicExpected = concept.expectedConcepts[0] || concept.name;
      const guidanceTemplates = [
        `Let us take a step back: can you explain the most fundamental purpose of ${concept.name}?`,
        `That is completely fine. Think simply about the basic components of ${concept.name}—what happens first?`,
        `Let us break it down: how would you define ${concept.name} in simple clinical terms?`
      ];
      const qText = guidanceTemplates[(turnNumber - 1) % guidanceTemplates.length];
      return {
        questionText: qText,
        questionType: 'Definition',
        expectedConcepts: [basicExpected]
      };
    }

    // 4. CLINICAL SCENARIO APPLICATION STRATEGY
    if (strategy === 'CLINICAL_SCENARIO_APPLICATION' && clinicalScenario) {
      return {
        questionText: `${clinicalScenario} Considering the mechanisms of ${concept.name}, how would you assess and manage this patient?`,
        questionType: 'Scenario-Based',
        expectedConcepts: ['Clinical synthesis', concept.name, 'Diagnostic/management logic']
      };
    }

    // 5. DEEPEN CURRENT CONCEPT STRATEGY (Ask for mechanism, determinants, or calculation)
    if (strategy === 'DEEPEN_CURRENT_CONCEPT' && concept.followUpPossibilities.length > 0) {
      const followUp = concept.followUpPossibilities[(turnNumber - 1) % concept.followUpPossibilities.length];
      return {
        questionText: followUp,
        questionType: 'Mechanism',
        expectedConcepts: concept.expectedConcepts
      };
    }

    // 6. DEFAULT ADVANCE / REGULATION - Natural question type variation
    const qTypes = ['Mechanism', 'Explanation', 'Compare & Contrast', 'Why Question', 'Clinical Application'];
    const chosenType = qTypes[turnNumber % qTypes.length] as any;
    
    let qText = '';
    if (chosenType === 'Mechanism') {
      qText = `What is the precise physiological mechanism governing ${concept.name}?`;
    } else if (chosenType === 'Compare & Contrast') {
      qText = `How does ${concept.name} physiologically compare and contrast with other related hemodynamic variables?`;
    } else if (chosenType === 'Why Question') {
      qText = `Why is ${concept.name} critical for cardiovascular and hemodynamic regulation?`;
    } else if (chosenType === 'Clinical Application') {
      qText = `In a clinical patient setting, what pathological conditions would directly alter ${concept.name}?`;
    } else {
      qText = `Moving into ${concept.name}: how does it adapt under physiological stress or exercise?`;
    }

    return {
      questionText: qText,
      questionType: chosenType,
      expectedConcepts: concept.expectedConcepts
    };
  }
}
