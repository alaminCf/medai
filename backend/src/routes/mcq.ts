import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { LearningAIService } from '../services/learningAIService';

const router = Router();
router.use(authenticate);

// 1. GET /api/mcq/banks - List question banks
router.get('/banks', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subject } = req.query;

    const where: any = {
      OR: [{ userId }, { userId: null }], // User's custom banks + public system banks
    };
    if (subject && typeof subject === 'string') {
      where.subject = subject;
    }

    const banks = await prisma.questionBank.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { questions: true } },
      },
    });

    res.json({ banks });
  } catch (error) {
    console.error('Error fetching question banks:', error);
    res.status(500).json({ error: 'Failed to fetch question banks.' });
  }
});

// 2. POST /api/mcq/generate - AI MCQ generation
router.post('/generate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subject, topic, count = 10, difficulty = 'medium', materialId, bankTitle } = req.body;

    let materialText = '';
    if (materialId) {
      const mat = await prisma.studyMaterial.findFirst({ where: { id: materialId, userId } });
      if (mat?.extractedText) materialText = mat.extractedText;
    }

    const generated = await LearningAIService.generateMCQs({
      materialText: materialText || undefined,
      subject: subject || 'Physiology',
      topic: topic || 'General Clinical Medicine',
      count: parseInt(count, 10) || 10,
      difficulty,
    });

    const bank = await prisma.questionBank.create({
      data: {
        userId,
        materialId: materialId || null,
        title: bankTitle || `${subject}: ${topic || 'Practice Questions'}`,
        subject: subject || 'Physiology',
        topic: topic || null,
        description: `Generated ${generated.length} ${difficulty} questions.`,
        questions: {
          create: generated.map((q) => ({
            question: q.question,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctOption: q.correctOption,
            explanation: q.explanation,
            difficulty: q.difficulty,
            sourceReference: q.sourceReference || `${subject} - ${topic}`,
          })),
        },
      },
      include: { questions: true },
    });

    res.status(201).json({ questionBank: bank });
  } catch (error) {
    console.error('MCQ generation error:', error);
    res.status(500).json({ error: 'Failed to generate MCQs.' });
  }
});

// 3. POST /api/mcq/sessions/start - Start MCQ practice session
// CRITICAL SECURITY: correctOption is STRIPPED from response!
router.post('/sessions/start', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subject, topic, questionCount = 10, difficulty = 'medium', questionBankId, materialId } = req.body;

    const count = Math.min(30, Math.max(5, parseInt(questionCount, 10) || 10));

    // Find questions from specified bank or matching subject
    let pool: any[] = [];
    if (questionBankId) {
      pool = await prisma.mCQQuestion.findMany({
        where: { questionBankId },
      });
    } else if (materialId) {
      const qb = await prisma.questionBank.findFirst({
        where: { materialId },
        include: { questions: true },
      });
      if (qb) pool = qb.questions;
    }

    if (pool.length === 0 && subject) {
      pool = await prisma.mCQQuestion.findMany({
        where: {
          questionBank: { subject },
        },
      });
    }

    // If still no questions in DB, dynamically generate them via AI
    if (pool.length === 0) {
      let matText = '';
      if (materialId) {
        const mat = await prisma.studyMaterial.findFirst({ where: { id: materialId, userId } });
        if (mat?.extractedText) matText = mat.extractedText;
      }

      const generated = await LearningAIService.generateMCQs({
        materialText: matText || undefined,
        subject: subject || 'Physiology',
        topic: topic || 'Cardiovascular System',
        count,
        difficulty,
      });

      const newBank = await prisma.questionBank.create({
        data: {
          userId,
          materialId: materialId || null,
          title: `${subject || 'Physiology'} Practice Bank`,
          subject: subject || 'Physiology',
          topic: topic || null,
          questions: {
            create: generated.map((q) => ({
              question: q.question,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              correctOption: q.correctOption,
              explanation: q.explanation,
              difficulty: q.difficulty,
              sourceReference: q.sourceReference,
            })),
          },
        },
        include: { questions: true },
      });
      pool = newBank.questions;
    }

    // Shuffle and pick desired count
    const selected = pool.sort(() => 0.5 - Math.random()).slice(0, count);

    // Create MCQ practice session
    const session = await prisma.mCQPracticeSession.create({
      data: {
        userId,
        questionBankId: selected[0]?.questionBankId || null,
        subject: subject || selected[0]?.questionBank?.subject || 'Physiology',
        topic: topic || null,
        totalQuestions: selected.length,
        status: 'active',
      },
    });

    // STRIP correctOption and explanation to protect exam integrity!
    const sanitizedQuestions = selected.map((q, idx) => ({
      id: q.id,
      index: idx + 1,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      difficulty: q.difficulty,
    }));

    res.status(201).json({
      session: {
        id: session.id,
        subject: session.subject,
        topic: session.topic,
        totalQuestions: session.totalQuestions,
        status: session.status,
        startedAt: session.startedAt,
        questions: sanitizedQuestions,
      },
      questions: sanitizedQuestions,
    });
  } catch (error) {
    console.error('Start MCQ session error:', error);
    res.status(500).json({ error: 'Failed to start MCQ practice session.' });
  }
});

// 4. GET /api/mcq/sessions/:sessionId - Get active session status
router.get('/sessions/:sessionId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await prisma.mCQPracticeSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        answers: true,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'MCQ session not found.' });
      return;
    }

    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch MCQ session.' });
  }
});

// 5. POST /api/mcq/sessions/:sessionId/answer - Submit answer for a question
// Server validates and returns result + explanation
router.post('/sessions/:sessionId/answer', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const { questionId, selectedOption } = req.body; // "A" | "B" | "C" | "D"

    const session = await prisma.mCQPracticeSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) {
      res.status(404).json({ error: 'MCQ session not found.' });
      return;
    }

    if (session.status !== 'active') {
      res.status(400).json({ error: 'This practice session is already completed.' });
      return;
    }

    const question = await prisma.mCQQuestion.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      res.status(404).json({ error: 'Question not found.' });
      return;
    }

    const isCorrect = question.correctOption.toUpperCase() === selectedOption.toUpperCase();

    // Check if already answered in this session
    const existingAnswer = await prisma.mCQAnswer.findFirst({
      where: { sessionId: session.id, questionId },
    });

    if (!existingAnswer) {
      await prisma.mCQAnswer.create({
        data: {
          sessionId: session.id,
          questionId,
          selectedOption: selectedOption.toUpperCase(),
          isCorrect,
        },
      });

      if (isCorrect) {
        await prisma.mCQPracticeSession.update({
          where: { id: session.id },
          data: { correctAnswers: { increment: 1 } },
        });
      }
    }

    res.json({
      questionId,
      selectedOption: selectedOption.toUpperCase(),
      isCorrect,
      correctOption: question.correctOption,
      explanation: question.explanation,
      sourceReference: question.sourceReference,
    });
  } catch (error) {
    console.error('Answer submission error:', error);
    res.status(500).json({ error: 'Failed to evaluate answer.' });
  }
});

// 6. POST /api/mcq/sessions/:sessionId/complete - Finalize session
router.post('/sessions/:sessionId/complete', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await prisma.mCQPracticeSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        answers: true,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }

    const correctCount = session.answers.filter((a) => a.isCorrect).length;
    const accuracy = session.totalQuestions > 0 ? Math.round((correctCount / session.totalQuestions) * 1000) / 10 : 0;
    const score = correctCount;

    const completed = await prisma.mCQPracticeSession.update({
      where: { id: session.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        correctAnswers: correctCount,
        score,
        accuracy,
      },
    });

    // Record study session duration
    const duration = Math.max(60, Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000));
    await prisma.studySession.create({
      data: {
        userId,
        subject: session.subject,
        topic: session.topic,
        activityType: 'MCQ',
        durationSeconds: duration,
        endedAt: new Date(),
      },
    });

    res.json({
      session: completed,
      summary: {
        totalQuestions: session.totalQuestions,
        correctAnswers: correctCount,
        incorrectAnswers: session.totalQuestions - correctCount,
        accuracy,
        durationSeconds: duration,
      },
    });
  } catch (error) {
    console.error('Complete MCQ session error:', error);
    res.status(500).json({ error: 'Failed to complete MCQ session.' });
  }
});

export default router;
