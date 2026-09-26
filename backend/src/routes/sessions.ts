import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { aiPatientEngine, PatientCaseContext, ConversationTurn } from '../services/aiPatientEngine';
import speechRecognitionService from '../services/speechRecognitionService';
import textToSpeechService from '../services/textToSpeechService';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max for audio
});

// Start a new practice session (Phase 2: accepts language and voiceEnabled)
router.post(
  '/start',
  authenticate,
  [
    body('caseId').isUUID().withMessage('Valid case ID required'),
    body('language').optional().isIn(['en', 'bn']).withMessage('Language must be "en" or "bn"'),
    body('voiceEnabled').optional().isBoolean().withMessage('voiceEnabled must be a boolean'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { caseId, language = 'en', voiceEnabled = true } = req.body;
    const userId = req.user!.id;

    try {
      // Verify case exists and is active
      const patientCase = await prisma.patientCase.findUnique({
        where: { id: caseId },
        select: {
          id: true,
          isActive: true,
          chiefComplaint: true,
          patientName: true,
          patientAge: true,
          patientGender: true,
          difficulty: true,
          estimatedDuration: true,
          title: true,
          voiceProvider: true,
          voiceId: true,
          speakingSpeed: true,
        },
      });

      if (!patientCase || !patientCase.isActive) {
        res.status(404).json({ error: 'Case not found or inactive' });
        return;
      }

      // Create session with Phase 2 voice/language settings
      const session = await prisma.practiceSession.create({
        data: {
          userId,
          patientCaseId: caseId,
          status: 'active',
          language,
          voiceEnabled,
          voiceProvider: patientCase.voiceProvider,
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
              voiceProvider: true,
              voiceId: true,
              speakingSpeed: true,
            },
          },
        },
      });

      // Opening patient greeting based on language
      const openingText =
        language === 'bn'
          ? `ডাক্তার সাহেব, ${patientCase.chiefComplaint}`
          : `Doctor, ${patientCase.chiefComplaint}`;

      // Create opening patient message
      const openingMessage = await prisma.conversationMessage.create({
        data: {
          practiceSessionId: session.id,
          sender: 'patient',
          message: openingText,
          messageType: voiceEnabled ? 'voice' : 'text',
        },
      });

      res.status(201).json({ session, openingMessage });
    } catch (error) {
      console.error('Start session error:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  }
);

// Transcribe audio using backend STT (Whisper / provider abstraction)
router.post(
  '/:sessionId/voice/transcribe',
  authenticate,
  upload.single('audio'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    try {
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        select: { id: true, userId: true, language: true, status: true },
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
      if (!req.file) {
        res.status(400).json({ error: 'No audio file provided' });
        return;
      }

      const transcription = await speechRecognitionService.transcribeAudio(
        req.file.buffer,
        req.file.mimetype,
        { language: session.language }
      );

      res.json({ transcription });
    } catch (error) {
      console.error('Transcription error:', error);
      res.status(500).json({ error: 'Audio transcription failed' });
    }
  }
);

// Synthesize TTS audio for a patient text response
router.post(
  '/:sessionId/voice/tts',
  authenticate,
  [body('text').trim().notEmpty().withMessage('Text to synthesize is required')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { sessionId } = req.params;
    const { text, voice, speed } = req.body;
    const userId = req.user!.id;

    try {
      const session = await prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: { patientCase: true },
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      if (session.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const chosenVoice = (voice || session.patientCase.voiceId || 'alloy') as any;
      const chosenSpeed = typeof speed === 'number' ? speed : session.patientCase.speakingSpeed;

      const ttsResult = await textToSpeechService.synthesizeSpeech(text, {
        voice: chosenVoice,
        speed: chosenSpeed,
        language: session.language,
      });

      if (!ttsResult) {
        // Return 204 No Content so frontend knows to use browser native SpeechSynthesis
        res.status(204).end();
        return;
      }

      res.set({
        'Content-Type': ttsResult.contentType,
        'Content-Length': ttsResult.audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      });
      res.send(ttsResult.audioBuffer);
    } catch (error) {
      console.error('TTS error:', error);
      res.status(500).json({ error: 'Speech synthesis failed' });
    }
  }
);

// Send a message in an active session (supports both text and voice message types)
router.post(
  '/:sessionId/message',
  authenticate,
  [
    body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message required (max 2000 chars)'),
    body('messageType').optional().isIn(['text', 'voice']).withMessage('messageType must be "text" or "voice"'),
    body('transcription').optional().isString(),
    body('audioUrl').optional().isString(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { sessionId } = req.params;
    const { message, messageType, transcription, audioUrl } = req.body;
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

      const activeMessageType = messageType || (session.voiceEnabled ? 'voice' : 'text');

      // Get conversation history
      const history = await prisma.conversationMessage.findMany({
        where: { practiceSessionId: sessionId },
        orderBy: { timestamp: 'asc' },
      });

      const conversationHistory: ConversationTurn[] = history
        .filter((m) => m.sender !== 'system')
        .map((m) => ({
          role: m.sender === 'student' ? ('student' as const) : ('patient' as const),
          content: m.message,
        }));

      // Save student message
      const studentMsg = await prisma.conversationMessage.create({
        data: {
          practiceSessionId: sessionId,
          sender: 'student',
          message: message.trim(),
          messageType: activeMessageType,
          transcription: transcription || (activeMessageType === 'voice' ? message.trim() : null),
          audioUrl: audioUrl || null,
        },
      });

      // Build case context for AI
      const caseCtx = session.patientCase;
      const clinicalData = caseCtx.clinicalData;

      const patientContext: PatientCaseContext = {
        patientName: caseCtx.patientName,
        patientAge: caseCtx.patientAge,
        patientGender: caseCtx.patientGender,
        chiefComplaint: caseCtx.chiefComplaint,
        personality: caseCtx.personality,
        language: session.language,
        medicalHistory: clinicalData?.medicalHistory || undefined,
        medicationHistory: clinicalData?.medicationHistory || undefined,
        allergyHistory: clinicalData?.allergyHistory || undefined,
        familyHistory: clinicalData?.familyHistory || undefined,
        socialHistory: clinicalData?.socialHistory || undefined,
        symptomDetails: clinicalData?.symptomDetails || undefined,
        // hiddenDiagnosis and redFlags are NEVER passed to the AI context
      };

      // Generate AI patient response
      const aiResponse = await aiPatientEngine.generatePatientResponse(
        patientContext,
        conversationHistory,
        message.trim()
      );

      // Save patient response
      const patientMsg = await prisma.conversationMessage.create({
        data: {
          practiceSessionId: sessionId,
          sender: 'patient',
          message: aiResponse.message,
          messageType: activeMessageType,
        },
      });

      // Check if backend TTS is available
      const hasBackendTTS = textToSpeechService.isAvailable();

      res.json({
        studentMessage: studentMsg,
        patientMessage: patientMsg,
        provider: aiResponse.provider,
        hasBackendTTS,
        language: session.language,
        voiceConfig: {
          voiceId: caseCtx.voiceId,
          voiceGender: caseCtx.voiceGender,
          speakingSpeed: caseCtx.speakingSpeed,
        },
      });
    } catch (error) {
      console.error('Message error:', error);
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
            voiceProvider: true,
            voiceId: true,
            voiceGender: true,
            speakingSpeed: true,
          },
        },
        messages: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            sender: true,
            message: true,
            messageType: true,
            transcription: true,
            audioUrl: true,
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
