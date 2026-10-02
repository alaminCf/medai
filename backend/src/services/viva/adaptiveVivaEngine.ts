import prisma from '../../utils/prisma';
import {
  AnswerAssessmentResult,
  ConceptMasteryLevel,
  ExaminerStyle,
  NextQuestionStrategyType,
  VivaBlueprint,
  VivaConcept,
  VivaDebugTurn,
  VivaDifficultyLevel,
  VivaQuestionHistoryItem,
  VivaQuestionItem,
  VivaQuestionType,
  VivaSessionState,
  VivaSessionType
} from './vivaTypes';
import { QuestionSimilarityService } from './questionSimilarityService';
import { VivaBlueprintService } from './vivaBlueprintService';
import { AnswerAssessmentEngine } from './answerAssessmentEngine';
import { ExaminerResponseEngine } from './examinerResponseEngine';

export class AdaptiveVivaEngine {
  // In-memory active session cache
  private static sessionCache = new Map<string, VivaSessionState>();

  /**
   * Initializes a stateful, non-repetitive, concept-driven Adaptive Viva session
   */
  public static async startSession(params: {
    userId: string;
    subject: string;
    topic: string;
    subtopic?: string;
    difficulty?: string;
    sessionType?: VivaSessionType;
    examinerStyle?: ExaminerStyle;
    totalTargetQuestions?: number;
    materialId?: string;
  }): Promise<{ session: VivaSessionState; blueprint: VivaBlueprint }> {
    const {
      userId,
      subject = 'Physiology',
      topic = 'Cardiovascular System',
      subtopic,
      difficulty = 'Intermediate',
      sessionType = 'PRACTICE',
      examinerStyle = 'CALM_PROFESSIONAL',
      totalTargetQuestions = 5,
      materialId
    } = params;

    // 1. Get or generate the dynamic topic blueprint
    const blueprint = await VivaBlueprintService.getBlueprintForTopic(subject, topic);
    const firstConcept = blueprint.concepts[0] || {
      id: 'c1_foundation',
      name: `${topic} Foundations`,
      learningObjective: `Core definitions and principles of ${topic}`,
      tier: 'FOUNDATIONAL',
      difficulty: 'Basic' as VivaDifficultyLevel,
      expectedConcepts: ['Fundamental definition', 'Key anatomical or physiological landmarks'],
      acceptedKeywords: [topic.toLowerCase()],
      commonMisconceptions: [],
      followUpPossibilities: [],
      relatedConcepts: []
    };

    // 2. Formulate the opening non-repetitive question
    const firstQText = `To begin our viva on ${blueprint.topic}, could you define ${firstConcept.name} and explain its core physiological or anatomical significance?`;
    const initialDifficulty: VivaDifficultyLevel = (difficulty as VivaDifficultyLevel) || 'Basic';

    // 3. Create database session record
    const dbSession = await prisma.vivaSession.create({
      data: {
        userId,
        subject: blueprint.subject,
        topic: blueprint.topic,
        difficulty: initialDifficulty.toLowerCase(),
        mode: 'TEXT',
        status: 'in_progress',
        totalQuestions: totalTargetQuestions,
        currentQuestionIndex: 0
      }
    });

    // 4. Create first question in DB
    const firstDbQ = await prisma.vivaQuestion.create({
      data: {
        sessionId: dbSession.id,
        questionNumber: 1,
        question: firstQText,
        expectedConcepts: JSON.stringify(firstConcept.expectedConcepts),
        sourceReference: `Concept: ${firstConcept.name} (${firstConcept.tier})`
      }
    });

    const currentQuestion: VivaQuestionItem = {
      id: firstDbQ.id,
      questionNumber: 1,
      questionText: firstQText,
      questionType: 'Definition',
      targetConcept: firstConcept.name,
      difficulty: initialDifficulty,
      expectedConcepts: firstConcept.expectedConcepts,
      acceptedAnswerConcepts: firstConcept.acceptedKeywords,
      commonMisconceptions: firstConcept.commonMisconceptions,
      intent: 'Opening conceptual foundation'
    };

    // 5. Initialize live knowledge state for all blueprint concepts
    const knowledgeState: Record<string, any> = {};
    for (const c of blueprint.concepts) {
      knowledgeState[c.name] = {
        conceptId: c.id,
        conceptName: c.name,
        level: 'NOT_TESTED' as ConceptMasteryLevel,
        attempts: 0,
        correctCount: 0,
        partialCount: 0,
        incorrectCount: 0,
        lastAttemptAt: new Date().toISOString(),
        notes: []
      };
    }

    const state: VivaSessionState = {
      sessionId: dbSession.id,
      userId,
      subject: blueprint.subject,
      topic: blueprint.topic,
      subtopic,
      sessionType,
      examinerStyle,
      currentDifficulty: initialDifficulty,
      currentQuestion,
      currentQuestionIntent: 'Opening foundational assessment',
      currentConcept: firstConcept.name,
      previousQuestions: [
        {
          questionId: currentQuestion.id,
          questionNumber: 1,
          questionText: currentQuestion.questionText,
          questionType: currentQuestion.questionType,
          targetConcept: currentQuestion.targetConcept,
          difficulty: currentQuestion.difficulty
        }
      ],
      previousAnswers: [],
      askedQuestionIds: [currentQuestion.id],
      askedConceptIds: [firstConcept.id],
      coveredConcepts: [],
      masteredConcepts: [],
      weakConcepts: [],
      misunderstoodConcepts: [],
      partiallyUnderstoodConcepts: [],
      incorrectConcepts: [],
      repeatedMistakes: [],
      skippedQuestions: 0,
      followUpCount: 0,
      questionCount: 1,
      totalTargetQuestions,
      correctCount: 0,
      incorrectCount: 0,
      partialCount: 0,
      confidence: 1.0,
      conversationContext: [
        {
          role: 'examiner',
          content: firstQText,
          concept: firstConcept.name,
          timestamp: new Date().toISOString()
        }
      ],
      knowledgeState,
      debugTurns: [],
      sessionStartTime: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      sessionStatus: 'IN_PROGRESS'
    };

    this.sessionCache.set(dbSession.id, state);
    return { session: state, blueprint };
  }

  /**
   * Evaluates student oral response, assesses concepts, updates knowledge state,
   * generates examiner feedback, and adaptively selects the next non-repetitive question.
   */
  public static async submitAnswer(params: {
    userId: string;
    sessionId: string;
    questionId: string;
    studentAnswer: string;
  }): Promise<{
    sessionState: VivaSessionState;
    assessment: AnswerAssessmentResult;
    examinerFeedback: string;
    nextQuestion: VivaQuestionItem | null;
    isCompleted: boolean;
    turnNumber: number;
    endOfVivaReport?: any;
  }> {
    const { userId, sessionId, questionId, studentAnswer } = params;

    // 1. Retrieve session state
    let state: VivaSessionState | null | undefined = this.sessionCache.get(sessionId);
    if (!state) {
      state = await this.reconstructSessionState(sessionId, userId);
    }
    if (!state) {
      throw new Error(`Active Viva session not found for id: ${sessionId}`);
    }

    const currentQ = state.currentQuestion;
    const blueprint = await VivaBlueprintService.getBlueprintForTopic(state.subject, state.topic);
    const activeConcept = blueprint.concepts.find(c => c.name === state!.currentConcept) || blueprint.concepts[0];

    // 2. Assess student answer semantically
    const assessment = await AnswerAssessmentEngine.assessAnswer({
      question: currentQ,
      studentAnswer,
      targetConcept: activeConcept,
      previousContext: state.conversationContext.slice(-3).map(c => `${c.role}: ${c.content}`).join('\n')
    });

    // 3. Update Concept Knowledge State
    const conceptName = state.currentConcept;
    const kState = state.knowledgeState[conceptName] || {
      conceptId: activeConcept?.id || 'c_active',
      conceptName,
      level: 'NOT_TESTED',
      attempts: 0,
      correctCount: 0,
      partialCount: 0,
      incorrectCount: 0,
      lastAttemptAt: new Date().toISOString(),
      notes: []
    };

    kState.attempts += 1;
    kState.lastAttemptAt = new Date().toISOString();

    if (assessment.correctness === 'CORRECT') {
      state.correctCount += 1;
      kState.correctCount += 1;
      kState.level = kState.attempts >= 2 ? 'MASTERED' : 'STRONG';
      if (!state.masteredConcepts.includes(conceptName) && kState.level === 'MASTERED') {
        state.masteredConcepts.push(conceptName);
      }
      if (!state.coveredConcepts.includes(conceptName)) {
        state.coveredConcepts.push(conceptName);
      }
    } else if (assessment.correctness === 'PARTIAL') {
      state.partialCount += 1;
      kState.partialCount += 1;
      kState.level = 'PARTIAL';
      if (!state.partiallyUnderstoodConcepts.includes(conceptName)) {
        state.partiallyUnderstoodConcepts.push(conceptName);
      }
      if (!state.coveredConcepts.includes(conceptName)) {
        state.coveredConcepts.push(conceptName);
      }
    } else {
      state.incorrectCount += 1;
      kState.incorrectCount += 1;
      kState.level = 'WEAK';
      if (!state.weakConcepts.includes(conceptName)) {
        state.weakConcepts.push(conceptName);
      }
      if (assessment.detectedMisconceptions.length > 0) {
        for (const m of assessment.detectedMisconceptions) {
          if (!state.misunderstoodConcepts.includes(m)) {
            state.misunderstoodConcepts.push(m);
          }
        }
      }
    }
    state.knowledgeState[conceptName] = kState;

    // 4. Generate examiner conversational transition feedback
    const { feedback: examinerFeedback } = ExaminerResponseEngine.generateTransitionFeedback({
      assessment,
      style: state.examinerStyle,
      currentQuestion: currentQ,
      targetConcept: activeConcept
    });

    // Append student answer & examiner feedback to conversation context
    state.conversationContext.push({
      role: 'student',
      content: studentAnswer,
      concept: conceptName,
      timestamp: new Date().toISOString()
    });

    state.previousAnswers.push({
      questionId,
      studentAnswer,
      assessment,
      timestamp: new Date().toISOString()
    });

    // 5. Persist to Prisma DB (VivaResponse & VivaConceptPerformance)
    try {
      await prisma.vivaResponse.create({
        data: {
          questionId,
          responseText: studentAnswer,
          score: Math.round(assessment.scoreOutOf10 * 10),
          keyConceptsCovered: JSON.stringify(assessment.demonstratedConcepts),
          conceptsMissed: JSON.stringify(assessment.missingConcepts),
          conceptsIncorrect: JSON.stringify(assessment.detectedMisconceptions),
          clarityScore: assessment.communicationClarity === 'Clear' ? 9.0 : (assessment.communicationClarity === 'Adequate' ? 7.0 : 5.0),
          feedback: `${examinerFeedback} ${assessment.examinerRemark}`
        }
      });

      for (const concept of currentQ.expectedConcepts) {
        const isMentioned = assessment.demonstratedConcepts.includes(concept);
        const isMissed = assessment.missingConcepts.includes(concept);
        const isIncorrect = assessment.detectedMisconceptions.includes(concept);

        let status = 'COVERED';
        if (isIncorrect) status = 'INCORRECT';
        else if (isMissed) status = 'MISSED';
        else if (!isMentioned) status = 'PARTIALLY_COVERED';

        await prisma.vivaConceptPerformance.create({
          data: {
            userId,
            vivaSessionId: sessionId,
            conceptName: concept,
            status,
            feedback: assessment.examinerRemark
          }
        });
      }
    } catch (dbErr) {
      console.warn('DB persistence warning for viva turn:', dbErr);
    }

    const currentTurnNumber = state.previousAnswers.length;
    const isCompleted = currentTurnNumber >= state.totalTargetQuestions;

    let nextQuestion: VivaQuestionItem | null = null;
    let strategyChosen: NextQuestionStrategyType = assessment.recommendedNextAction;
    let strategyRationale = '';

    if (!isCompleted) {
      // 6. Dynamic Strategy Determination
      let nextConcept = activeConcept;

      // Count how many questions were already asked on active concept
      const conceptTurns = state.conversationContext.filter(c => c.concept === activeConcept.name).length;

      if (strategyChosen === 'MISCONCEPTION_CORRECTION') {
        strategyRationale = 'Candidate voiced clinical or mechanical misconception. Probing underlying distinction.';
        nextConcept = activeConcept;
      } else if (strategyChosen === 'TARGETED_FOLLOW_UP') {
        // If concept has already been followed up once, rotate to prevent concept fatigue
        if (conceptTurns >= 2) {
          const unaskedConcepts = blueprint.concepts.filter(
            c => !state!.coveredConcepts.includes(c.name) && c.name !== activeConcept.name
          );
          nextConcept = unaskedConcepts.length > 0 ? unaskedConcepts[0] : blueprint.concepts[currentTurnNumber % blueprint.concepts.length];
          strategyChosen = 'EXPAND_TOPIC_COVERAGE';
          strategyRationale = `Follow-up completed on ${activeConcept.name}. Expanding to next curriculum concept: ${nextConcept.name}.`;
        } else {
          strategyRationale = 'Candidate answer was partial. Probing the omitted components.';
          nextConcept = activeConcept;
          state.followUpCount += 1;
        }
      } else if (strategyChosen === 'FOUNDATIONAL_GUIDANCE') {
        strategyRationale = 'Candidate was hesitant or unsure. Stepping back to primary definition.';
        nextConcept = activeConcept;
      } else if (strategyChosen === 'CLINICAL_SCENARIO_APPLICATION' && blueprint.clinicalScenarios.length > 0) {
        strategyRationale = 'Candidate demonstrated solid mastery. Introducing bedside clinical scenario.';
        const scenarioConcept = blueprint.concepts.find(c => c.tier === 'CLINICAL_APPLICATION') || activeConcept;
        nextConcept = scenarioConcept;
      } else {
        // Expand topic coverage to next unmastered concept on blueprint!
        const remainingConcepts = blueprint.concepts.filter(
          c => !state!.coveredConcepts.includes(c.name) && c.name !== activeConcept.name
        );
        if (remainingConcepts.length > 0) {
          nextConcept = remainingConcepts[0];
          strategyChosen = 'EXPAND_TOPIC_COVERAGE';
          strategyRationale = `Broadening topic coverage to next curriculum tier: ${nextConcept.name} (${nextConcept.tier}).`;
        } else {
          // Cycle to next concept in blueprint sequence
          const curIdx = blueprint.concepts.findIndex(c => c.name === activeConcept.name);
          nextConcept = blueprint.concepts[(curIdx + 1) % blueprint.concepts.length];
          strategyChosen = 'INCREASE_DIFFICULTY_ADVANCE';
          strategyRationale = 'Advancing to high-level clinical synthesis.';
        }
      }

      state.currentConcept = nextConcept.name;

      // 7. Dynamic Question Generation with NO REPETITION GUARANTEE
      let candidate: { questionText: string; questionType: VivaQuestionType; expectedConcepts: string[] };
      if (assessment.isStudentQuery && assessment.followUpGuidedQuestion) {
        candidate = {
          questionText: assessment.followUpGuidedQuestion,
          questionType: 'Mechanism',
          expectedConcepts: nextConcept.expectedConcepts
        };
      } else {
        candidate = ExaminerResponseEngine.generateNextAdaptiveQuestion({
          strategy: strategyChosen,
          concept: nextConcept,
          assessment,
          turnNumber: currentTurnNumber + 1,
          style: state.examinerStyle,
          clinicalScenario: blueprint.clinicalScenarios[0]?.scenario
        });
      }

      // Semantic Duplicate Check with iterative rotation
      let simCheck = QuestionSimilarityService.isQuestionDuplicate(
        candidate.questionText,
        nextConcept.name,
        state.previousQuestions
      );

      let attempts = 0;
      while (simCheck.isDuplicate && attempts < blueprint.concepts.length + 3) {
        attempts++;
        console.warn(`[Anti-Repetition] Question duplicate detected: ${simCheck.reason}. Synthesizing alternative angle (attempt ${attempts}).`);

        // Advance to next concept on blueprint
        const curIdx = blueprint.concepts.findIndex(c => c.name === nextConcept.name);
        nextConcept = blueprint.concepts[(curIdx + 1) % blueprint.concepts.length];
        state.currentConcept = nextConcept.name;

        const altTypes: VivaQuestionType[] = ['Compare & Contrast', 'Why Question', 'Clinical Application', 'How Question', 'Mechanism'];
        const altType = altTypes[(currentTurnNumber + attempts) % altTypes.length];

        let altText = '';
        if (nextConcept.followUpPossibilities && nextConcept.followUpPossibilities.length > 0) {
          const possible = nextConcept.followUpPossibilities[attempts % nextConcept.followUpPossibilities.length];
          if (!state.previousQuestions.some(pq => pq.questionText === possible)) {
            altText = possible;
          }
        }

        if (!altText) {
          if (altType === 'Clinical Application' && blueprint.clinicalScenarios.length > 0) {
            altText = `In a clinical scenario involving impaired ${nextConcept.name}: what initial compensatory changes would occur?`;
          } else if (altType === 'Compare & Contrast') {
            altText = `How does ${nextConcept.name} contrast with surrounding hemodynamic parameters during stress?`;
          } else if (altType === 'Why Question') {
            altText = `Why is ${nextConcept.name} considered a rate-limiting factor in physiological perfusion?`;
          } else {
            altText = `Can you describe the step-by-step physiological mechanism underlying ${nextConcept.name}?`;
          }
        }

        candidate = {
          questionText: altText,
          questionType: altType,
          expectedConcepts: nextConcept.expectedConcepts
        };

        simCheck = QuestionSimilarityService.isQuestionDuplicate(
          candidate.questionText,
          nextConcept.name,
          state.previousQuestions
        );
      }

      // Create next question in DB
      let nextDbQ: any = null;
      try {
        nextDbQ = await prisma.vivaQuestion.create({
          data: {
            sessionId,
            questionNumber: currentTurnNumber + 1,
            question: candidate.questionText,
            expectedConcepts: JSON.stringify(candidate.expectedConcepts),
            sourceReference: `Concept: ${nextConcept.name} (${nextConcept.tier})`
          }
        });
      } catch (err) {
        nextDbQ = { id: `q_turn_${currentTurnNumber + 1}` };
      }

      nextQuestion = {
        id: nextDbQ.id,
        questionNumber: currentTurnNumber + 1,
        questionText: candidate.questionText,
        questionType: candidate.questionType,
        targetConcept: nextConcept.name,
        difficulty: nextConcept.difficulty,
        expectedConcepts: candidate.expectedConcepts,
        acceptedAnswerConcepts: nextConcept.acceptedKeywords,
        commonMisconceptions: nextConcept.commonMisconceptions
      };

      state.currentQuestion = nextQuestion;
      state.questionCount += 1;
      state.previousQuestions.push({
        questionId: nextQuestion.id,
        questionNumber: nextQuestion.questionNumber,
        questionText: nextQuestion.questionText,
        questionType: nextQuestion.questionType,
        targetConcept: nextQuestion.targetConcept,
        difficulty: nextQuestion.difficulty
      });

      state.conversationContext.push({
        role: 'examiner',
        content: candidate.questionText,
        concept: nextConcept.name,
        timestamp: new Date().toISOString()
      });
    }

    // 8. Log Debug Turn
    const debugTurn: VivaDebugTurn = {
      turnNumber: currentTurnNumber,
      questionText: currentQ.questionText,
      questionType: currentQ.questionType,
      targetConcept: currentQ.targetConcept,
      studentAnswer,
      correctness: assessment.correctness,
      score: assessment.scoreOutOf10,
      demonstratedConcepts: assessment.demonstratedConcepts,
      missingConcepts: assessment.missingConcepts,
      detectedMisconceptions: assessment.detectedMisconceptions,
      strategyChosen,
      strategyRationale,
      nextQuestionPreview: nextQuestion?.questionText || 'End of examination session',
      similarityCheckPassed: true
    };
    state.debugTurns.push(debugTurn);

    // 9. Handle Session Completion
    let endOfVivaReport: any = null;
    if (isCompleted) {
      state.sessionStatus = 'COMPLETED';
      const avgScore = Math.round(
        (state.previousAnswers.reduce((sum, a) => sum + a.assessment.scoreOutOf10, 0) / state.previousAnswers.length) * 10
      );

      try {
        await prisma.vivaSession.update({
          where: { id: sessionId },
          data: {
            status: 'completed',
            overallScore: avgScore,
            completedAt: new Date()
          }
        });

        await prisma.learningEvent.create({
          data: {
            userId,
            eventType: 'VIVA_COMPLETED',
            entityId: sessionId,
            subject: state.subject,
            topic: state.topic,
            metadata: JSON.stringify({
              overallScore: avgScore,
              turnsCount: currentTurnNumber,
              masteredCount: state.masteredConcepts.length,
              weakCount: state.weakConcepts.length
            })
          }
        });
      } catch (err) {
        console.warn('Completion DB event warning:', err);
      }

      endOfVivaReport = {
        sessionId,
        subject: state.subject,
        topic: state.topic,
        overallScore: avgScore,
        totalTurns: currentTurnNumber,
        correctCount: state.correctCount,
        partialCount: state.partialCount,
        incorrectCount: state.incorrectCount,
        masteredConcepts: state.masteredConcepts,
        coveredConcepts: state.coveredConcepts,
        weakConcepts: state.weakConcepts,
        misunderstoodConcepts: state.misunderstoodConcepts,
        clinicalReasoningFeedback:
          avgScore >= 80
            ? 'Demonstrated strong systematic clinical reasoning, confident physiological articulation, and clear pathophysiological correlation.'
            : (avgScore >= 60
              ? 'Adequate conceptual understanding with solid baseline knowledge. Minor hesitation in fine regulatory distinctions.'
              : 'Requires dedicated targeted revision on core regulatory mechanisms and differential pathophysiological principles.'),
        recommendedLearningActions: [
          {
            title: `Study with AI Medical Tutor: ${state.topic}`,
            type: 'AI_TUTOR',
            actionUrl: `/ai-tutor?topic=${encodeURIComponent(state.topic)}&subject=${encodeURIComponent(state.subject)}`,
            description: 'Interactive personalized lecture focusing on your identified weak concepts.'
          },
          {
            title: `Practice 5 Adaptive MCQs on ${state.topic}`,
            type: 'MCQ',
            actionUrl: `/mcq?topic=${encodeURIComponent(state.topic)}&subject=${encodeURIComponent(state.subject)}`,
            description: 'Cement active recall and clinical decision-making.'
          },
          {
            title: `Spaced Repetition Flashcards`,
            type: 'FLASHCARD',
            actionUrl: `/flashcards?topic=${encodeURIComponent(state.topic)}`,
            description: 'Rapid drill on memory retention and diagnostic criteria.'
          },
          {
            title: `Retake Adaptive Viva`,
            type: 'VIVA',
            actionUrl: `/viva/adaptive?subject=${encodeURIComponent(state.subject)}&topic=${encodeURIComponent(state.topic)}`,
            description: 'Test yourself again with fresh, non-repeating oral questions.'
          }
        ]
      };
    }

    state.lastActivityAt = new Date().toISOString();
    this.sessionCache.set(sessionId, state);

    return {
      sessionState: state,
      assessment,
      examinerFeedback,
      nextQuestion,
      isCompleted,
      turnNumber: currentTurnNumber,
      endOfVivaReport
    };
  }

  /**
   * Returns live session state with recovery support
   */
  public static async getSessionState(sessionId: string, userId: string): Promise<VivaSessionState | null> {
    const cached = this.sessionCache.get(sessionId);
    if (cached && cached.userId === userId) {
      return cached;
    }
    return this.reconstructSessionState(sessionId, userId);
  }

  /**
   * Reconstructs session state from DB if server restarted or student switched devices
   */
  private static async reconstructSessionState(sessionId: string, userId: string): Promise<VivaSessionState | null> {
    const session = await prisma.vivaSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        questions: {
          include: { response: true },
          orderBy: { questionNumber: 'asc' }
        }
      }
    });

    if (!session) return null;

    const blueprint = await VivaBlueprintService.getBlueprintForTopic(session.subject, session.topic);
    const completedQuestions = session.questions.filter((q: any) => q.response !== null);
    const lastQ = session.questions[session.questions.length - 1] || session.questions[0];

    const currentQuestion: VivaQuestionItem = {
      id: lastQ.id,
      questionNumber: lastQ.questionNumber,
      questionText: lastQ.question,
      questionType: 'Explanation',
      targetConcept: session.topic,
      difficulty: 'Intermediate',
      expectedConcepts: JSON.parse(lastQ.expectedConcepts || '[]')
    };

    const state: VivaSessionState = {
      sessionId: session.id,
      userId,
      subject: session.subject,
      topic: session.topic,
      sessionType: 'PRACTICE',
      examinerStyle: 'CALM_PROFESSIONAL',
      currentDifficulty: 'Intermediate',
      currentQuestion,
      currentQuestionIntent: 'Resumed examination',
      currentConcept: session.topic,
      previousQuestions: session.questions.map((q: any) => ({
        questionId: q.id,
        questionNumber: q.questionNumber,
        questionText: q.question,
        questionType: 'Explanation' as VivaQuestionType,
        targetConcept: session.topic,
        difficulty: 'Intermediate' as VivaDifficultyLevel
      })),
      previousAnswers: completedQuestions.map((q: any) => ({
        questionId: q.id,
        studentAnswer: q.response.responseText,
        assessment: {
          correctness: q.response.score >= 70 ? 'CORRECT' : (q.response.score >= 40 ? 'PARTIAL' : 'INCORRECT'),
          scoreOutOf10: q.response.score / 10,
          confidence: 0.8,
          demonstratedConcepts: JSON.parse(q.response.keyConceptsCovered || '[]'),
          missingConcepts: JSON.parse(q.response.conceptsMissed || '[]'),
          detectedMisconceptions: JSON.parse(q.response.conceptsIncorrect || '[]'),
          isHesitantOrUnknown: false,
          communicationClarity: 'Adequate',
          relevanceDepth: 'Good',
          examinerRemark: q.response.feedback || '',
          recommendedNextAction: 'EXPAND_TOPIC_COVERAGE'
        },
        timestamp: q.response.createdAt.toISOString()
      })),
      askedQuestionIds: session.questions.map((q: any) => q.id),
      askedConceptIds: [],
      coveredConcepts: [],
      masteredConcepts: [],
      weakConcepts: [],
      misunderstoodConcepts: [],
      partiallyUnderstoodConcepts: [],
      incorrectConcepts: [],
      repeatedMistakes: [],
      skippedQuestions: 0,
      followUpCount: 0,
      questionCount: session.questions.length,
      totalTargetQuestions: session.totalQuestions || 5,
      correctCount: completedQuestions.filter((q: any) => q.response.score >= 70).length,
      incorrectCount: completedQuestions.filter((q: any) => q.response.score < 40).length,
      partialCount: completedQuestions.filter((q: any) => q.response.score >= 40 && q.response.score < 70).length,
      confidence: 1.0,
      conversationContext: [],
      knowledgeState: {},
      debugTurns: [],
      sessionStartTime: session.startedAt.toISOString(),
      lastActivityAt: (session.completedAt || session.startedAt).toISOString(),
      sessionStatus: session.status === 'completed' ? 'COMPLETED' : 'IN_PROGRESS'
    };

    this.sessionCache.set(sessionId, state);
    return state;
  }
}
