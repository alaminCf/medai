import { AdaptiveVivaEngine } from './viva/adaptiveVivaEngine';
import { ExaminerStyle, VivaSessionType } from './viva/vivaTypes';

export interface AdaptiveVivaQuestionState {
  questionId: string;
  id?: string;
  questionNumber: number;
  question: string;
  questionText?: string;
  questionType?: string;
  topic: string;
  difficulty: string;
  focusConcept: string;
  targetConcept?: string;
}

export interface VivaTurnEvaluation {
  conceptsExpected: string[];
  conceptsMentioned: string[];
  conceptsMissed: string[];
  incorrectConcepts: string[];
  feedback: string;
  examinerFeedback?: string;
  clinicalCommunicationClarity: 'Clear' | 'Adequate' | 'Hesitant' | 'Disorganized';
  suggestedNextDifficulty: 'Basic' | 'Moderate' | 'Advanced';
  nextFocusConcept: string;
  score: number;
  strategyChosen?: string;
}

export class AdaptiveVivaService {
  /**
   * Initializes stateful concept-driven Adaptive Viva session using the master engine
   */
  async startAdaptiveSession(
    userId: string,
    subject: string,
    topic: string,
    difficulty = 'medium',
    sessionType: VivaSessionType = 'PRACTICE',
    examinerStyle: ExaminerStyle = 'CALM_PROFESSIONAL'
  ) {
    const { session, blueprint } = await AdaptiveVivaEngine.startSession({
      userId,
      subject,
      topic,
      difficulty,
      sessionType,
      examinerStyle,
      totalTargetQuestions: 5
    });

    const currentQ = session.currentQuestion;

    const currentQuestion: AdaptiveVivaQuestionState = {
      questionId: currentQ.id,
      id: currentQ.id,
      questionNumber: currentQ.questionNumber,
      question: currentQ.questionText,
      questionText: currentQ.questionText,
      questionType: currentQ.questionType,
      topic: session.topic,
      difficulty: currentQ.difficulty,
      focusConcept: currentQ.targetConcept,
      targetConcept: currentQ.targetConcept
    };

    return {
      sessionId: session.sessionId,
      subject: session.subject,
      topic: session.topic,
      sessionType: session.sessionType,
      examinerStyle: session.examinerStyle,
      currentQuestion,
      sessionState: session,
      blueprint
    };
  }

  /**
   * Evaluates oral answer, updates knowledge state, and dynamically selects next question
   */
  async submitAnswerAndGetNext(
    userId: string,
    sessionId: string,
    questionId: string,
    studentAnswer: string,
    topic: string,
    currentDifficulty: 'Basic' | 'Moderate' | 'Advanced'
  ) {
    const result = await AdaptiveVivaEngine.submitAnswer({
      userId,
      sessionId,
      questionId,
      studentAnswer
    });

    const nextQ = result.nextQuestion;
    const nextQuestionState: AdaptiveVivaQuestionState | null = nextQ
      ? {
          questionId: nextQ.id,
          id: nextQ.id,
          questionNumber: nextQ.questionNumber,
          question: nextQ.questionText,
          questionText: nextQ.questionText,
          questionType: nextQ.questionType,
          topic,
          difficulty: nextQ.difficulty,
          focusConcept: nextQ.targetConcept,
          targetConcept: nextQ.targetConcept
        }
      : null;

    const evaluation: VivaTurnEvaluation = {
      conceptsExpected: result.assessment.demonstratedConcepts.concat(result.assessment.missingConcepts),
      conceptsMentioned: result.assessment.demonstratedConcepts,
      conceptsMissed: result.assessment.missingConcepts,
      incorrectConcepts: result.assessment.detectedMisconceptions,
      feedback: `${result.examinerFeedback} ${result.assessment.examinerRemark}`,
      examinerFeedback: result.examinerFeedback,
      clinicalCommunicationClarity: result.assessment.communicationClarity,
      suggestedNextDifficulty:
        result.assessment.scoreOutOf10 >= 8 ? 'Advanced' : (result.assessment.scoreOutOf10 >= 5 ? 'Moderate' : 'Basic'),
      nextFocusConcept: result.sessionState.currentConcept,
      score: Math.round(result.assessment.scoreOutOf10 * 10),
      strategyChosen: result.assessment.recommendedNextAction
    };

    return {
      evaluation,
      isSessionComplete: result.isCompleted,
      nextQuestion: nextQuestionState,
      turnCount: result.turnNumber,
      sessionState: result.sessionState,
      endOfVivaReport: result.endOfVivaReport
    };
  }

  async getSessionState(sessionId: string, userId: string) {
    return AdaptiveVivaEngine.getSessionState(sessionId, userId);
  }
}

export const adaptiveVivaService = new AdaptiveVivaService();
