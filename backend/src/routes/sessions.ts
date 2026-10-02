import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { aiPatientEngine, PatientCaseContext, ConversationTurn } from '../services/aiPatientEngine';
import speechRecognitionService from '../services/speechRecognitionService';
import textToSpeechService from '../services/textToSpeechService';
import { ClinicalEvaluationEngine } from '../services/clinicalEvaluationEngine';
import { PatientCharacterSystem } from '../services/patientEngine/characterSystem';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max for audio
});


// Phase 2: Get all realistic patient characters catalog
router.get('/characters', (_req, res) => {
  res.json({
    characters: PatientCharacterSystem.getAllCharacters(),
  });
});

// Start a new practice session (Phase 2 & Phase 3: accepts language, voiceEnabled, avatarEnabled)
router.post(
  '/start',
  authenticate,
  [
    body('caseId').isUUID().withMessage('Valid case ID required'),
    body('language').optional().isIn(['en', 'bn']).withMessage('Language must be "en" or "bn"'),
    body('voiceEnabled').optional().isBoolean().withMessage('voiceEnabled must be a boolean'),
    body('avatarEnabled').optional().isBoolean().withMessage('avatarEnabled must be a boolean'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const {
      caseId,
      language = 'en',
      voiceEnabled = true,
      avatarEnabled = true,
    } = req.body;
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
          avatarProvider: true,
          avatarId: true,
          avatarGender: true,
          avatarAgeGroup: true,
          avatarStyle: true,
        },
      });

      if (!patientCase || !patientCase.isActive) {
        res.status(404).json({ error: 'Case not found or inactive' });
        return;
      }

      // Create session with Phase 2 voice & Phase 3 avatar settings
      const session = await prisma.practiceSession.create({
        data: {
          userId,
          patientCaseId: caseId,
          status: 'active',
          language,
          voiceEnabled,
          voiceProvider: patientCase.voiceProvider,
          avatarEnabled,
          avatarProvider: patientCase.avatarProvider,
          avatarId: patientCase.avatarId,
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
              avatarProvider: true,
              avatarId: true,
              avatarGender: true,
              avatarAgeGroup: true,
              avatarStyle: true,
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
          emotion: 'concerned',
          emotionIntensity: 0.35,
        },
      });

      const character = PatientCharacterSystem.getCharacterForCase({
        patientName: patientCase.patientName,
        patientGender: patientCase.patientGender,
        patientAge: patientCase.patientAge,
        chiefComplaint: patientCase.chiefComplaint,
        title: patientCase.title,
        avatarGender: patientCase.avatarGender,
        avatarAgeGroup: patientCase.avatarAgeGroup,
      });

      res.status(201).json({ session, openingMessage, character });
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

// Phase 3: Avatar session configuration endpoint (secure token generation)
router.post(
  '/:sessionId/avatar/session',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { sessionId } = req.params;
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

      const pc = session.patientCase;

      const character = PatientCharacterSystem.getCharacterForCase({
        patientName: pc.patientName,
        patientGender: pc.patientGender,
        patientAge: pc.patientAge,
        chiefComplaint: pc.chiefComplaint,
        title: pc.title,
        avatarGender: pc.avatarGender,
        avatarAgeGroup: pc.avatarAgeGroup,
      });

      res.json({
        avatarProvider: 'realistic-human',
        avatarId: character.characterId,
        avatarGender: character.sex,
        avatarAgeGroup: character.age < 30 ? 'young-adult' : character.age < 60 ? 'middle-aged' : 'elderly',
        avatarStyle: 'realistic',
        patientName: pc.patientName,
        character,
        status: 'ready',
      });
    } catch (error) {
      console.error('Avatar session error:', error);
      res.status(500).json({ error: 'Failed to initialize avatar session' });
    }
  }
);

// Send a message in an active session (supports text, voice, and emotion metadata)
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

      // Silent clinical intent classification (Phase 4)
      const classification = ClinicalEvaluationEngine.classifyQuestion(message.trim());

      // Save student message with silent tracking (never leaked to student during session)
      const studentMsg = await prisma.conversationMessage.create({
        data: {
          practiceSessionId: sessionId,
          sender: 'student',
          message: message.trim(),
          messageType: activeMessageType,
          transcription: transcription || (activeMessageType === 'voice' ? message.trim() : null),
          audioUrl: audioUrl || null,
          detectedCategory: classification.category,
          detectedIntent: classification.intent,
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

      // Generate AI patient response with Stateful Clinical Conversation Engine
      const aiResponse = await aiPatientEngine.generatePatientResponse(
        patientContext,
        conversationHistory,
        message.trim(),
        sessionId
      );

      // Save patient response with Phase 3 emotion metadata
      const patientMsg = await prisma.conversationMessage.create({
        data: {
          practiceSessionId: sessionId,
          sender: 'patient',
          message: aiResponse.message,
          messageType: activeMessageType,
          emotion: aiResponse.emotion,
          emotionIntensity: aiResponse.intensity,
        },
      });

      // Check if backend TTS is available
      const hasBackendTTS = textToSpeechService.isAvailable();

      res.json({
        studentMessage: {
          id: studentMsg.id,
          sender: studentMsg.sender,
          message: studentMsg.message,
          messageType: studentMsg.messageType,
          transcription: studentMsg.transcription,
          audioUrl: studentMsg.audioUrl,
          timestamp: studentMsg.timestamp,
        },
        patientMessage: patientMsg,
        provider: aiResponse.provider,
        emotion: aiResponse.emotion,
        intensity: aiResponse.intensity,
        hasBackendTTS,
        language: session.language,
        voiceConfig: {
          voiceId: caseCtx.voiceId,
          voiceGender: caseCtx.voiceGender,
          speakingSpeed: caseCtx.speakingSpeed,
        },
        avatarConfig: {
          avatarProvider: session.avatarProvider || caseCtx.avatarProvider,
          avatarId: session.avatarId || caseCtx.avatarId,
          avatarGender: caseCtx.avatarGender,
          avatarAgeGroup: caseCtx.avatarAgeGroup,
          avatarStyle: caseCtx.avatarStyle,
        },
        _debug: req.user?.role === 'admin' || (req.query && req.query.debug === 'true') ? aiResponse.debug : undefined,
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
            slug: true,
            patientName: true,
            patientAge: true,
            patientGender: true,
            chiefComplaint: true,
            difficulty: true,
          },
        },
      },
    });

    // Phase 4: Create or update PracticeAttempt
    const existingAttemptsCount = await prisma.practiceAttempt.count({
      where: { practiceSessionId: sessionId },
    });
    const attemptNumber = existingAttemptsCount + 1;

    const attempt = await prisma.practiceAttempt.create({
      data: {
        practiceSessionId: sessionId,
        attemptNumber,
        startedAt: session.startedAt,
        endedAt,
        duration: durationSeconds,
        status: 'completed',
      },
    });

    // Phase 4: Run Two-Layer Clinical Evaluation
    let evaluation: any = null;
    try {
      const rubric = await prisma.clinicalCaseRubric.findUnique({
        where: { patientCaseId: session.patientCaseId },
        include: { items: { where: { isActive: true } } },
      });

      if (rubric && rubric.items.length > 0) {
        const messages = await prisma.conversationMessage.findMany({
          where: { practiceSessionId: sessionId },
          orderBy: { timestamp: 'asc' },
        });

        const scoringWeights = rubric.scoringWeights ? JSON.parse(rubric.scoringWeights) : undefined;

        const evalResult = await ClinicalEvaluationEngine.evaluateConsultation({
          caseTitle: updated.patientCase.title,
          caseSlug: updated.patientCase.slug,
          chiefComplaint: updated.patientCase.chiefComplaint,
          patientAge: updated.patientCase.patientAge,
          patientGender: updated.patientCase.patientGender,
          rubricItems: rubric.items,
          scoringWeights,
          messages: messages.map((m) => ({
            sender: m.sender,
            message: m.message,
            timestamp: m.timestamp,
          })),
        });

        // Store ClinicalEvaluation
        evaluation = await prisma.clinicalEvaluation.create({
          data: {
            practiceAttemptId: attempt.id,
            historyScore: evalResult.historyScore,
            communicationScore: evalResult.communicationScore,
            reasoningScore: evalResult.reasoningScore,
            patientCenterednessScore: evalResult.patientCenterednessScore,
            structureScore: evalResult.structureScore,
            overallScore: evalResult.overallScore,
            coveredCount: evalResult.coveredCount,
            partialCount: evalResult.partialCount,
            missedCount: evalResult.missedCount,
            totalCount: evalResult.totalCount,
            overallSummary: evalResult.overallSummary,
            strengths: JSON.stringify(evalResult.strengths),
            improvements: JSON.stringify(evalResult.improvements),
            communicationFeedback: JSON.stringify(evalResult.communicationFeedback),
            reasoningFeedback: JSON.stringify(evalResult.reasoningFeedback),
            structureFeedback: JSON.stringify(evalResult.structureFeedback),
            missedQuestions: JSON.stringify(evalResult.missedQuestions),
            prematureDiagnosis: evalResult.prematureDiagnosis,
          },
          include: {
            evidence: true,
          },
        });

        // Store EvaluationEvidence
        for (const ev of evalResult.evidence) {
          await prisma.evaluationEvidence.create({
            data: {
              clinicalEvaluationId: evaluation.id,
              rubricItemId: ev.rubricItemId || null,
              category: ev.category,
              title: ev.title,
              intent: ev.intent || null,
              status: ev.status,
              studentQuote: ev.studentQuote || null,
              feedback: ev.feedback,
              importance: ev.importance,
            },
          });
        }

        // Update Attempt with scores
        await prisma.practiceAttempt.update({
          where: { id: attempt.id },
          data: {
            historyScore: evalResult.historyScore,
            communicationScore: evalResult.communicationScore,
            reasoningScore: evalResult.reasoningScore,
            patientCenterednessScore: evalResult.patientCenterednessScore,
            structureScore: evalResult.structureScore,
            overallScore: evalResult.overallScore,
            status: 'evaluated',
          },
        });
      }
    } catch (evalError) {
      console.error('Clinical evaluation calculation error:', evalError);
      // Gracefully continue without breaking session completion
    }

    res.json({
      session: updated,
      attempt,
      evaluation,
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
            avatarProvider: true,
            avatarId: true,
            avatarGender: true,
            avatarAgeGroup: true,
            avatarStyle: true,
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
            emotion: true,
            emotionIntensity: true,
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
            avatarProvider: true,
            avatarGender: true,
            avatarAgeGroup: true,
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


// ==========================================
// PHASE 4: EVALUATION & ATTEMPTS ENDPOINTS
// ==========================================

// Get latest evaluation for a session
router.get('/:sessionId/evaluation', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
            slug: true,
            patientName: true,
            patientAge: true,
            patientGender: true,
            chiefComplaint: true,
            difficulty: true,
            category: true,
            rubric: {
              select: {
                learningObjectives: true,
              },
            },
          },
        },
        attempts: {
          orderBy: { attemptNumber: 'desc' },
          take: 1,
          include: {
            evaluation: {
              include: {
                evidence: {
                  include: {
                    rubricItem: {
                      select: {
                        id: true,
                        category: true,
                        title: true,
                        importance: true,
                        clinicalRationale: true,
                        sampleQuestions: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.userId !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const latestAttempt = session.attempts[0] || null;
    const evaluation = latestAttempt?.evaluation || null;

    if (!evaluation) {
      res.status(404).json({
        error: 'Evaluation not found',
        message: 'Your consultation was saved. Evaluation is temporarily unavailable.',
      });
      return;
    }

    // Parse JSON fields safely
    const parsedEval = {
      ...evaluation,
      strengths: evaluation.strengths ? JSON.parse(evaluation.strengths) : [],
      improvements: evaluation.improvements ? JSON.parse(evaluation.improvements) : [],
      communicationFeedback: evaluation.communicationFeedback ? JSON.parse(evaluation.communicationFeedback) : null,
      reasoningFeedback: evaluation.reasoningFeedback ? JSON.parse(evaluation.reasoningFeedback) : null,
      structureFeedback: evaluation.structureFeedback ? JSON.parse(evaluation.structureFeedback) : null,
      missedQuestions: evaluation.missedQuestions ? JSON.parse(evaluation.missedQuestions) : [],
    };

    res.json({
      session: {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        duration: session.duration,
        patientCase: session.patientCase,
      },
      attempt: {
        id: latestAttempt.id,
        attemptNumber: latestAttempt.attemptNumber,
        startedAt: latestAttempt.startedAt,
        endedAt: latestAttempt.endedAt,
        duration: latestAttempt.duration,
        scores: {
          history: latestAttempt.historyScore,
          communication: latestAttempt.communicationScore,
          reasoning: latestAttempt.reasoningScore,
          patientCenteredness: latestAttempt.patientCenterednessScore,
          structure: latestAttempt.structureScore,
          overall: latestAttempt.overallScore,
        },
      },
      evaluation: parsedEval,
    });
  } catch (error) {
    console.error('Get evaluation error:', error);
    res.status(500).json({ error: 'Failed to fetch clinical evaluation' });
  }
});

// Get all attempts for a session (progress tracking across multiple attempts)
router.get('/:sessionId/attempts', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { sessionId } = req.params;
  const userId = req.user!.id;

  try {
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.userId !== userId && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const attempts = await prisma.practiceAttempt.findMany({
      where: { practiceSessionId: sessionId },
      orderBy: { attemptNumber: 'asc' },
      select: {
        id: true,
        attemptNumber: true,
        startedAt: true,
        endedAt: true,
        duration: true,
        historyScore: true,
        communicationScore: true,
        reasoningScore: true,
        patientCenterednessScore: true,
        structureScore: true,
        overallScore: true,
        status: true,
        evaluation: {
          select: {
            id: true,
            coveredCount: true,
            partialCount: true,
            missedCount: true,
            totalCount: true,
            overallSummary: true,
          },
        },
      },
    });

    res.json({ attempts });
  } catch (error) {
    console.error('Get attempts error:', error);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

// Retry consultation (Phase 4 "Try Again" functionality)
router.post('/:sessionId/retry', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
            chiefComplaint: true,
            personality: true,
            patientName: true,
            voiceProvider: true,
            voiceId: true,
            speakingSpeed: true,
            avatarProvider: true,
            avatarId: true,
            avatarGender: true,
            avatarAgeGroup: true,
            avatarStyle: true,
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

    const existingAttemptsCount = await prisma.practiceAttempt.count({
      where: { practiceSessionId: sessionId },
    });
    const newAttemptNumber = existingAttemptsCount + 1;

    // Reactivate session
    const updatedSession = await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: 'active',
        startedAt: new Date(),
        endedAt: null,
        duration: null,
      },
      include: {
        patientCase: true,
      },
    });

    // Delete prior active messages for fresh retry consultation attempt
    await prisma.conversationMessage.deleteMany({
      where: { practiceSessionId: sessionId },
    });

    // Create fresh initial opening message
    const isBangla = session.language === 'bn';
    const openingText = isBangla
      ? `ডাক্তার সাহেব, ${session.patientCase.chiefComplaint}`
      : `Hello doctor. ${session.patientCase.chiefComplaint}`;

    const openingMessage = await prisma.conversationMessage.create({
      data: {
        practiceSessionId: sessionId,
        sender: 'patient',
        message: openingText,
        messageType: session.voiceEnabled ? 'voice' : 'text',
        emotion: session.patientCase.personality === 'anxious' ? 'anxious' : 'concerned',
        emotionIntensity: 0.35,
      },
    });

    res.json({
      session: updatedSession,
      attemptNumber: newAttemptNumber,
      openingMessage,
      avatarConfig: {
        avatarProvider: session.avatarProvider,
        avatarId: session.avatarId,
        avatarGender: session.patientCase.avatarGender,
        avatarAgeGroup: session.patientCase.avatarAgeGroup,
        avatarStyle: session.patientCase.avatarStyle,
      },
    });
  } catch (error) {
    console.error('Retry session error:', error);
    res.status(500).json({ error: 'Failed to retry consultation' });
  }
});

export default router;
