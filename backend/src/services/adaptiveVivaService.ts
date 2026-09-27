import prisma from '../utils/prisma';
import { LearningAIService } from './learningAIService';

export interface AdaptiveVivaQuestionState {
  questionId: string;
  questionNumber: number;
  question: string;
  topic: string;
  difficulty: string;
  focusConcept?: string;
}

export interface VivaTurnEvaluation {
  conceptsExpected: string[];
  conceptsMentioned: string[];
  conceptsMissed: string[];
  incorrectConcepts: string[];
  feedback: string;
  clinicalCommunicationClarity: 'Clear' | 'Adequate' | 'Hesitant' | 'Disorganized';
  suggestedNextDifficulty: 'Basic' | 'Moderate' | 'Advanced';
  nextFocusConcept?: string;
  score: number;
}

export class AdaptiveVivaService {
  /**
   * Start an adaptive viva session. Initial question starts at Basic or Moderate.
   * Expected concepts and internal rubric are strictly hidden on the server until the student responds.
   */
  async startAdaptiveSession(userId: string, subject: string, topic: string, difficulty = 'medium') {
    const session = await prisma.vivaSession.create({
      data: {
        userId,
        subject,
        topic,
        difficulty,
        mode: 'TEXT',
        status: 'in_progress',
        totalQuestions: 5,
        currentQuestionIndex: 0,
      },
    });

    // Create the first question
    const firstQText = `In the context of ${topic}, can you explain the primary physiological mechanisms and define its core anatomical or functional boundaries?`;
    const firstExpectedConcepts = ['Core Definition', 'Primary Mechanism', 'Hemodynamic Function'];

    const question = await prisma.vivaQuestion.create({
      data: {
        sessionId: session.id,
        questionNumber: 1,
        question: firstQText,
        expectedConcepts: JSON.stringify(firstExpectedConcepts),
        sourceReference: `${subject} Curriculum Core: ${topic}`,
      },
    });

    const currentQuestion: AdaptiveVivaQuestionState = {
      questionId: question.id,
      questionNumber: 1,
      question: firstQText,
      topic,
      difficulty: 'Basic',
      focusConcept: 'Core Mechanism',
    };

    return {
      sessionId: session.id,
      subject,
      topic,
      currentQuestion,
    };
  }

  /**
   * Evaluates the student's oral answer, analyzes concept coverage, and dynamically generates
   * the appropriate follow-up question (probing missed concepts or advancing difficulty).
   */
  async submitAnswerAndGetNext(
    userId: string,
    sessionId: string,
    questionId: string,
    studentAnswer: string,
    topic: string,
    currentDifficulty: 'Basic' | 'Moderate' | 'Advanced'
  ) {
    const session = await prisma.vivaSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        questions: {
          include: { response: true },
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    if (!session) {
      throw new Error('Viva session not found or unauthorized');
    }

    const currentQ = session.questions.find((q: any) => q.id === questionId);
    const questionText = currentQ ? currentQ.question : `Question on ${topic}`;
    const expectedConcepts: string[] = currentQ ? JSON.parse(currentQ.expectedConcepts || '[]') : ['Core Mechanism', 'Physiology'];

    // Evaluate answer with AI via LearningAIService
    const evalResult = await LearningAIService.evaluateVivaResponse({
      question: questionText,
      expectedConcepts,
      studentResponse: studentAnswer,
    });

    const covered = evalResult.keyConceptsCovered || [];
    const missed = evalResult.conceptsMissed || [];
    const incorrect = evalResult.conceptsIncorrect || [];
    const scoreOutOf100 = Math.round((evalResult.score / 10) * 100);

    const clarityScore = evalResult.clarityScore || 8;
    const clinicalCommunicationClarity: 'Clear' | 'Adequate' | 'Hesitant' | 'Disorganized' =
      clarityScore >= 8 ? 'Clear' : (clarityScore >= 6 ? 'Adequate' : 'Hesitant');

    let suggestedNextDifficulty: 'Basic' | 'Moderate' | 'Advanced' = currentDifficulty;
    if (scoreOutOf100 >= 80) {
      suggestedNextDifficulty = currentDifficulty === 'Basic' ? 'Moderate' : 'Advanced';
    } else if (scoreOutOf100 < 50) {
      suggestedNextDifficulty = currentDifficulty === 'Advanced' ? 'Moderate' : 'Basic';
    }

    const nextFocusConcept = missed.length > 0 ? missed[0] : (covered.length > 0 ? `${covered[0]} Regulation` : 'Clinical Application');

    const evaluation: VivaTurnEvaluation = {
      conceptsExpected: expectedConcepts,
      conceptsMentioned: covered,
      conceptsMissed: missed,
      incorrectConcepts: incorrect,
      feedback: evalResult.feedback,
      clinicalCommunicationClarity,
      suggestedNextDifficulty,
      nextFocusConcept,
      score: scoreOutOf100,
    };

    // Save VivaResponse
    if (currentQ) {
      await prisma.vivaResponse.create({
        data: {
          questionId: currentQ.id,
          responseText: studentAnswer,
          score: evaluation.score,
          keyConceptsCovered: JSON.stringify(covered),
          conceptsMissed: JSON.stringify(missed),
          conceptsIncorrect: JSON.stringify(incorrect),
          clarityScore: evalResult.clarityScore,
          feedback: evalResult.feedback,
        },
      });
    }

    // Persist concept performance records
    for (const concept of evaluation.conceptsExpected) {
      const isMentioned = covered.includes(concept);
      const isMissed = missed.includes(concept);
      const isIncorrect = incorrect.includes(concept);

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
          feedback: evaluation.feedback,
        },
      });
    }

    const completedTurnCount = session.questions.filter((q: any) => q.response !== null).length + 1;
    const isSessionComplete = completedTurnCount >= session.totalQuestions;

    let nextQuestion: AdaptiveVivaQuestionState | null = null;

    if (!isSessionComplete) {
      const nextQNum = completedTurnCount + 1;
      let nextQText = `Continuing with ${topic}, could you explain how ${nextFocusConcept} operates under acute physiological stress?`;
      let nextExpected = [nextFocusConcept, 'Compensatory Mechanisms'];

      try {
        const generated = await LearningAIService.generateVivaQuestions({
          subject: session.subject,
          topic: `${topic} - ${nextFocusConcept}`,
          count: 1,
          difficulty: suggestedNextDifficulty.toLowerCase(),
        });
        if (generated.length > 0) {
          nextQText = generated[0].question;
          nextExpected = generated[0].expectedConcepts;
        }
      } catch {
        // Fallback to contextual question text
      }

      const createdQ = await prisma.vivaQuestion.create({
        data: {
          sessionId,
          questionNumber: nextQNum,
          question: nextQText,
          expectedConcepts: JSON.stringify(nextExpected),
          sourceReference: `${session.subject} Curriculum Core: ${topic}`,
        },
      });

      nextQuestion = {
        questionId: createdQ.id,
        questionNumber: nextQNum,
        question: nextQText,
        topic,
        difficulty: suggestedNextDifficulty,
        focusConcept: nextFocusConcept,
      };

      await prisma.vivaSession.update({
        where: { id: sessionId },
        data: {
          currentQuestionIndex: completedTurnCount,
        },
      });
    } else {
      const allResponses = await prisma.vivaResponse.findMany({
        where: {
          question: { sessionId },
        },
      });
      const avgScore = allResponses.length > 0
        ? Math.round(allResponses.reduce((sum: number, r: any) => sum + r.score, 0) / allResponses.length)
        : evaluation.score;

      await prisma.vivaSession.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          overallScore: avgScore,
          completedAt: new Date(),
        },
      });

      await prisma.learningEvent.create({
        data: {
          userId,
          eventType: 'VIVA_COMPLETED',
          entityId: sessionId,
          subject: session.subject,
          topic: session.topic,
          metadata: JSON.stringify({ overallScore: avgScore, questionsCount: completedTurnCount }),
        },
      });
    }

    return {
      evaluation,
      isSessionComplete,
      nextQuestion,
      turnCount: completedTurnCount,
    };
  }
}

export const adaptiveVivaService = new AdaptiveVivaService();
