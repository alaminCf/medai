import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { LearningAIService } from '../services/learningAIService';

const router = Router();
router.use(authenticate);

// 1. GET /api/viva/history - User's viva sessions
router.get('/history', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const sessions = await prisma.vivaSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: {
        _count: { select: { questions: true } },
      },
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Error fetching viva history:', error);
    res.status(500).json({ error: 'Failed to fetch viva sessions.' });
  }
});

// 2. POST /api/viva/start - Start Viva Session
// CRITICAL: expectedConcepts is stripped from returned questions!
router.post('/start', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subject, topic, difficulty = 'medium', questionCount = 3, mode = 'TEXT', materialId } = req.body;

    const count = Math.min(10, Math.max(1, parseInt(questionCount, 10) || 3));

    let materialText = '';
    if (materialId) {
      const mat = await prisma.studyMaterial.findFirst({ where: { id: materialId, userId } });
      if (mat?.extractedText) materialText = mat.extractedText;
    }

    const generated = await LearningAIService.generateVivaQuestions({
      subject: subject || 'Physiology',
      topic: topic || 'Cardiovascular System',
      count,
      difficulty,
      materialText: materialText || undefined,
    });

    const session = await prisma.vivaSession.create({
      data: {
        userId,
        subject: subject || 'Physiology',
        topic: topic || 'Cardiovascular System',
        difficulty,
        mode: mode === 'VOICE' ? 'VOICE' : 'TEXT',
        status: 'in_progress',
        totalQuestions: generated.length,
        currentQuestionIndex: 0,
        questions: {
          create: generated.map((q, idx) => ({
            questionNumber: idx + 1,
            question: q.question,
            expectedConcepts: JSON.stringify(q.expectedConcepts),
            sourceReference: q.sourceReference || `${subject} - ${topic}`,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    // Provide first question without revealing expected answers
    const firstQ = session.questions[0];

    const sanitizedQuestions = session.questions.map(q => ({
      id: q.id,
      questionNumber: q.questionNumber,
      question: q.question,
      sourceReference: q.sourceReference,
    }));

    res.status(201).json({
      session: {
        id: session.id,
        subject: session.subject,
        topic: session.topic,
        difficulty: session.difficulty,
        mode: session.mode,
        totalQuestions: session.totalQuestions,
        currentQuestionIndex: 0,
        startedAt: session.startedAt,
        questions: sanitizedQuestions,
      },
      questions: sanitizedQuestions,
      currentQuestion: {
        id: firstQ.id,
        questionNumber: firstQ.questionNumber,
        question: firstQ.question,
        sourceReference: firstQ.sourceReference,
      },
    });
  } catch (error) {
    console.error('Start viva error:', error);
    res.status(500).json({ error: 'Failed to start viva session.' });
  }
});

// 3. GET /api/viva/sessions/:id - Get viva session state
router.get('/sessions/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const session = await prisma.vivaSession.findFirst({
      where: { id, userId },
      include: {
        questions: {
          orderBy: { questionNumber: 'asc' },
          include: { response: true },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Viva session not found.' });
      return;
    }

    const currentQ = session.questions[session.currentQuestionIndex];

    res.json({
      session: {
        id: session.id,
        subject: session.subject,
        topic: session.topic,
        difficulty: session.difficulty,
        mode: session.mode,
        status: session.status,
        totalQuestions: session.totalQuestions,
        currentQuestionIndex: session.currentQuestionIndex,
        overallScore: session.overallScore,
      },
      currentQuestion:
        currentQ && session.status === 'in_progress'
          ? {
              id: currentQ.id,
              questionNumber: currentQ.questionNumber,
              question: currentQ.question,
              sourceReference: currentQ.sourceReference,
            }
          : null,
      evaluatedQuestions: session.questions.map((q) => {
        let expected = [];
        try {
          expected = JSON.parse(q.expectedConcepts);
        } catch (e) {}

        return {
          id: q.id,
          questionNumber: q.questionNumber,
          question: q.question,
          sourceReference: q.sourceReference,
          response: q.response
            ? {
                responseText: q.response.responseText,
                score: q.response.score,
                clarityScore: q.response.clarityScore,
                keyConceptsCovered: q.response.keyConceptsCovered ? JSON.parse(q.response.keyConceptsCovered) : [],
                conceptsMissed: q.response.conceptsMissed ? JSON.parse(q.response.conceptsMissed) : [],
                feedback: q.response.feedback,
                expectedConcepts: expected, // Revealed only for evaluated questions
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching viva session:', error);
    res.status(500).json({ error: 'Failed to fetch viva session.' });
  }
});

// 4. POST /api/viva/sessions/:id/respond - Submit viva response and receive evaluation
router.post('/sessions/:id/respond', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { questionId, responseText, responseAudioUrl } = req.body;

    if (!responseText || typeof responseText !== 'string') {
      res.status(400).json({ error: 'Response answer text is required.' });
      return;
    }

    const session = await prisma.vivaSession.findFirst({
      where: { id, userId },
      include: {
        questions: {
          orderBy: { questionNumber: 'asc' },
          include: { response: true },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Viva session not found.' });
      return;
    }

    if (session.status !== 'in_progress') {
      res.status(400).json({ error: 'Viva session is already completed.' });
      return;
    }

    const question = session.questions.find((q) => q.id === questionId);
    if (!question) {
      res.status(404).json({ error: 'Question not found in this session.' });
      return;
    }

    let expectedConcepts: string[] = [];
    try {
      expectedConcepts = JSON.parse(question.expectedConcepts);
    } catch (e) {
      expectedConcepts = [question.question];
    }

    // AI Evaluation of student's viva response
    const evaluation = await LearningAIService.evaluateVivaResponse({
      question: question.question,
      expectedConcepts,
      studentResponse: responseText.trim(),
    });

    // Save response
    const responseRecord = await prisma.vivaResponse.create({
      data: {
        questionId: question.id,
        responseText: responseText.trim(),
        responseAudioUrl: responseAudioUrl || null,
        score: evaluation.score,
        keyConceptsCovered: JSON.stringify(evaluation.keyConceptsCovered),
        conceptsMissed: JSON.stringify(evaluation.conceptsMissed),
        conceptsIncorrect: JSON.stringify(evaluation.conceptsIncorrect),
        clarityScore: evaluation.clarityScore,
        feedback: evaluation.feedback,
      },
    });

    // Advance question index
    const nextIndex = session.currentQuestionIndex + 1;
    const isCompleted = nextIndex >= session.totalQuestions;

    let overallScore: number | null = null;
    if (isCompleted) {
      // Calculate overall session score
      const allScores = session.questions
        .map((q) => (q.id === question.id ? evaluation.score : q.response?.score || 0));
      const avg = allScores.reduce((acc, s) => acc + s, 0) / allScores.length;
      overallScore = Math.round(avg * 10) / 10;

      await prisma.vivaSession.update({
        where: { id: session.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          overallScore,
          currentQuestionIndex: nextIndex,
        },
      });

      // Record study session duration
      const duration = Math.max(60, Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000));
      await prisma.studySession.create({
        data: {
          userId,
          subject: session.subject,
          topic: session.topic,
          activityType: 'VIVA',
          durationSeconds: duration,
          endedAt: new Date(),
        },
      });
    } else {
      await prisma.vivaSession.update({
        where: { id: session.id },
        data: {
          currentQuestionIndex: nextIndex,
        },
      });
    }

    const nextQ = !isCompleted ? session.questions[nextIndex] : null;

    res.json({
      evaluation: {
        score: evaluation.score,
        keyConceptsCovered: evaluation.keyConceptsCovered,
        conceptsMissed: evaluation.conceptsMissed,
        clarityScore: evaluation.clarityScore,
        feedback: evaluation.feedback,
        expectedConcepts,
      },
      isCompleted,
      overallScore,
      nextQuestion: nextQ
        ? {
            id: nextQ.id,
            questionNumber: nextQ.questionNumber,
            question: nextQ.question,
            sourceReference: nextQ.sourceReference,
          }
        : null,
    });
  } catch (error) {
    console.error('Viva response submission error:', error);
    res.status(500).json({ error: 'Failed to evaluate viva response.' });
  }
});

export default router;
