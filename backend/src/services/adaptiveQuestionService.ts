import prisma from '../utils/prisma';

export interface AdaptiveQuestionOptions {
  subject: string;
  topic?: string;
  count?: number;
  questionType?: string;
  difficulty?: string;
}

export class AdaptiveQuestionService {
  /**
   * Selects questions adaptively, prioritizing weak concepts, mistake records, and calibrated learning difficulty.
   */
  static async selectAdaptiveQuestions(userId: string, options: AdaptiveQuestionOptions) {
    const { subject, topic, count = 10, questionType, difficulty } = options;

    // 1. Fetch user mistake records for this subject/topic to reinforce
    const activeMistakes = await prisma.mistakeRecord.findMany({
      where: {
        userId,
        reviewed: false,
        ...(subject ? { subject } : {}),
        ...(topic ? { topic } : {}),
      },
      select: {
        questionId: true,
        conceptName: true,
      },
    });

    const mistakeQuestionIds = activeMistakes.map((m: { questionId: string }) => m.questionId);
    const weakConceptNames = activeMistakes.map((m: { conceptName: string | null }) => m.conceptName).filter(Boolean) as string[];

    // 2. Fetch candidate questions matching subject (and optional topic)
    const candidates = await prisma.mCQQuestion.findMany({
      where: {
        questionBank: {
          subject: { equals: subject },
          ...(topic ? { topic: { equals: topic } } : {}),
        },
        reviewStatus: 'APPROVED',
        ...(questionType && questionType !== 'Mixed' ? { questionType } : {}),
        ...(difficulty ? { difficulty } : {}),
      },
      include: {
        questionBank: true,
      },
    });

    if (candidates.length === 0) {
      // Fallback: fetch any approved questions in the subject
      const fallback = await prisma.mCQQuestion.findMany({
        where: {
          questionBank: { subject },
          reviewStatus: 'APPROVED',
        },
        include: { questionBank: true },
        take: count,
      });
      return fallback.map((q: any) => ({
        id: q.id,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        difficulty: q.difficulty,
        questionType: q.questionType,
        concept: q.concept,
        subtopic: q.subtopic,
        subject: q.questionBank.subject,
        topic: q.questionBank.topic,
        sourceReference: q.sourceReference,
      }));
    }

    // 3. Score candidates adaptively:
    // Priority 1: Unresolved mistakes
    // Priority 2: Matches a weak concept
    // Priority 3: Matches target difficulty
    // Priority 4: Fresh questions
    const scored = candidates.map((q: any) => {
      let score = 0;
      if (mistakeQuestionIds.includes(q.id)) {
        score += 50; // Priority: re-test previously missed question
      }
      if (q.concept && weakConceptNames.includes(q.concept)) {
        score += 30; // Priority: reinforce weak concept
      }
      if (difficulty && q.difficulty === difficulty) {
        score += 15;
      }
      if (questionType && q.questionType === questionType) {
        score += 10;
      }
      // Add slight jitter for variety
      score += Math.random() * 5;
      return { question: q, score };
    });

    scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
    const selected = scored.slice(0, count).map((s: { question: any }) => s.question);

    // Return without exposing correctOption or explanation to client prior to submission
    return selected.map((q: any) => ({
      id: q.id,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      difficulty: q.difficulty,
      questionType: q.questionType,
      concept: q.concept,
      subtopic: q.subtopic,
      subject: q.questionBank.subject,
      topic: q.questionBank.topic,
      sourceReference: q.sourceReference,
    }));
  }

  /**
   * Evaluates student's answer, creates MCQAnswer, updates Mistake Bank, logs event,
   * and dynamically recommends Learning Difficulty progression.
   */
  static async evaluateAnswer(
    userId: string,
    sessionId: string,
    questionId: string,
    selectedOption: string,
    responseTimeSeconds?: number
  ) {
    const question = await prisma.mCQQuestion.findUnique({
      where: { id: questionId },
      include: { questionBank: true },
    });

    if (!question) {
      throw new Error('Question not found');
    }

    const isCorrect = selectedOption.toUpperCase() === question.correctOption.toUpperCase();

    // 1. Record Answer
    const answerRecord = await prisma.mCQAnswer.create({
      data: {
        sessionId,
        questionId,
        selectedOption: selectedOption.toUpperCase(),
        isCorrect,
      },
    });

    // 2. Update session score & accuracy
    const session = await prisma.mCQPracticeSession.findUnique({
      where: { id: sessionId },
      include: { answers: true },
    });

    if (session) {
      const totalAnswers = session.answers.length;
      const correctAnswers = session.answers.filter((a: { isCorrect: boolean }) => a.isCorrect).length;
      const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
      const score = Math.round(accuracy);

      await prisma.mCQPracticeSession.update({
        where: { id: sessionId },
        data: {
          correctAnswers,
          accuracy,
          score,
        },
      });
    }

    // 3. Handle Mistake Bank
    if (!isCorrect) {
      const existingMistake = await prisma.mistakeRecord.findFirst({
        where: { userId, questionId },
      });

      if (existingMistake) {
        await prisma.mistakeRecord.update({
          where: { id: existingMistake.id },
          data: {
            selectedAnswer: selectedOption.toUpperCase(),
            attemptNumber: existingMistake.attemptNumber + 1,
            reviewed: false,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.mistakeRecord.create({
          data: {
            userId,
            questionId,
            selectedAnswer: selectedOption.toUpperCase(),
            correctAnswer: question.correctOption,
            conceptName: question.concept || question.questionBank.topic || 'General Concept',
            subject: question.questionBank.subject,
            topic: question.questionBank.topic,
            explanation: question.explanation,
            sourceReference: question.sourceReference,
            attemptNumber: 1,
            reviewed: false,
          },
        });
      }
    } else {
      // If user got it right, mark existing mistake as reviewed
      await prisma.mistakeRecord.updateMany({
        where: { userId, questionId },
        data: { reviewed: true },
      });
    }

    // 4. Log Learning Event
    await prisma.learningEvent.create({
      data: {
        userId,
        eventType: 'MCQ_ANSWERED',
        entityId: questionId,
        subject: question.questionBank.subject,
        topic: question.questionBank.topic,
        metadata: JSON.stringify({ isCorrect, difficulty: question.difficulty, responseTimeSeconds }),
      },
    });

    // 5. Calculate Learning Difficulty recommendation
    const recentAnswers = session?.answers.slice(-3) || [];
    let nextDifficultyAdvice = 'Maintain current pace';
    if (recentAnswers.length >= 3 && recentAnswers.every((a: { isCorrect: boolean }) => a.isCorrect) && isCorrect) {
      nextDifficultyAdvice = 'High accuracy detected: advancing Learning Difficulty to Challenging concepts.';
    } else if (!isCorrect) {
      nextDifficultyAdvice = 'Concept needs reinforcement: reviewing fundamental mechanism.';
    }

    return {
      isCorrect,
      correctOption: question.correctOption,
      explanation: question.explanation,
      sourceReference: question.sourceReference,
      conceptTested: question.concept || question.questionBank.topic,
      learningDifficultyAdvice: nextDifficultyAdvice,
      answerId: answerRecord.id,
    };
  }
}

export const adaptiveQuestionService = AdaptiveQuestionService;
export default AdaptiveQuestionService;
