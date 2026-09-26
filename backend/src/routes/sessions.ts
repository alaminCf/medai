import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { aiPatientEngine, PatientCaseContext, ConversationTurn } from '../services/aiPatientEngine';

const router = Router();

// Start a new practice session
router.post(
  '/start',
  authenticate,
  [body('caseId').isUUID().withMessage('Valid case ID required')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { caseId } = req.body;
    const userId = req.user!.id;

    try {
      // Verify case exists and is active
      const patientCase = await prisma.patientCase.findUnique({
        where: { id: caseId },
        select: { id: true, isActive: true, chiefComplaint: true, patientName: true },
      });

      if (!patientCase || !patientCase.isActive) {
        res.status(404).json({ error: 'Case not found or inactive' });
        return;
      }

      // Create session
      const session = await prisma.practiceSession.create({
        data: {
          userId,
          patientCaseId: caseId,
          status: 'active',
        },
        include: {
          patientCase: {
            select: {
              id: true,
              title: true,
              patientName: true,
              patientAge: true,
              patientGender: true,
              chiefComplaint: true,
              difficulty: true,
              estimatedDuration: true,
            },
          },
        },
      });

      // Create opening patient message
      const openingMessage = await prisma.conversationMessage.create({
        data: {
          practiceSessionId: session.id,
          sender: 'patient',
          message: `Doctor, ${patientCase.chiefComplaint}`,
        },
      });

      res.status(201).json({ session, openingMessage });
    } catch (error) {
      console.error('Start session error:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  }
);

// Send a message in an active session
router.post(
  '/:sessionId/message',
  authenticate,
  [body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message required (max 2000 chars)')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { sessionId } = req.params;
    const { message } = req.body;
    const userId = req.user!.id;

    try {
      // Verify session belongs to this user and is active
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          patientCase: {
            include: { clinicalData: true },
          },
        },
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      if (session.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      if (session.status !== 'active') {
        res.status(400).json({ error: 'Session is not active' });
        return;
      }

      // Get conversation history
      const history = await prisma.conversationMessage.findMany({
        where: { practiceSessionId: sessionId },
        orderBy: { timestamp: 'asc' },
      });

      const conversationHistory: ConversationTurn[] = history
        .filter(m => m.sender !== 'system')
        .map(m => ({
          role: m.sender === 'student' ? 'student' : 'patient',
          content: m.message,
        }));

      // Save student message
      const studentMsg = await prisma.conversationMessage.create({
        data: {
          practiceSessionId: sessionId,
          sender: 'student',
          message: message.trim(),
        },
      });

      // Build case context for AI (includes clinical data — never returned to frontend directly)
      const caseCtx = session.patientCase;
      const clinicalData = caseCtx.clinicalData;

      const patientContext: PatientCaseContext = {
        patientName: caseCtx.patientName,
        patientAge: caseCtx.patientAge,
        patientGender: caseCtx.patientGender,
        chiefComplaint: caseCtx.chiefComplaint,
        personality: caseCtx.personality,
        medicalHistory: clinicalData?.medicalHistory || undefined,
        medicationHistory: clinicalData?.medicationHistory || undefined,
        allergyHistory: clinicalData?.allergyHistory || undefined,
        familyHistory: clinicalData?.familyHistory || undefined,
        socialHistory: clinicalData?.socialHistory || undefined,
        symptomDetails: clinicalData?.symptomDetails || undefined,
        // hiddenDiagnosis and redFlags are NOT passed to the AI context
      };

      // Generate AI patient response
      const aiResponse = await aiPatientEngine.generatePatientResponse(
        patientContext,
        conversationHistory,
        message.trim()
      );

      // Save patient (AI) response
      const patientMsg = await prisma.conversationMessage.create({
        data: {
          practiceSessionId: sessionId,
          sender: 'patient',
          message: aiResponse.message,
        },
      });

      res.json({
        studentMessage: studentMsg,
        patientMessage: patientMsg,
        provider: aiResponse.provider,
      });
    } catch (error) {
      console.error('Message error:', error);
      if ((error as Error).message?.includes('OPENAI_API_KEY')) {
        res.status(503).json({ error: 'AI service not configured. Please add OPENAI_API_KEY.' });
        return;
      }
      res.status(500).json({ error: 'Failed to process message' });
    }
  }
);

// End a session
router.post('/:sessionId/end', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { sessionId } = req.params;
  const userId = req.user!.id;

  try {
    const session = await prisma.practiceSession.findUnique({ where: { id: sessionId } });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    if (session.status !== 'active') {
      res.status(400).json({ error: 'Session is not active' });
      return;
    }

    const messageCount = await prisma.conversationMessage.count({
      where: { practiceSessionId: sessionId },
    });

    const startedAt = session.startedAt;
    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    const updated = await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        endedAt,
        duration: durationSeconds,
      },
      include: {
        patientCase: {
          select: {
            id: true,
            title: true,
            patientName: true,
            difficulty: true,
          },
        },
      },
    });

    res.json({
      session: updated,
      messageCount,
      duration: durationSeconds,
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Get session details + transcript
router.get('/:sessionId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { sessionId } = req.params;
  const userId = req.user!.id;

  try {
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        patientCase: {
          select: {
            id: true,
            title: true,
            patientName: true,
            patientAge: true,
            patientGender: true,
            chiefComplaint: true,
            difficulty: true,
            estimatedDuration: true,
            category: true,
          },
        },
        messages: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            sender: true,
            message: true,
            timestamp: true,
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.userId !== userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Get all sessions for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const sessions = await prisma.practiceSession.findMany({
      where: { userId },
      include: {
        patientCase: {
          select: {
            id: true,
            title: true,
            patientName: true,
            patientAge: true,
            patientGender: true,
            difficulty: true,
            category: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

export default router;
