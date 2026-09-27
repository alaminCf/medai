import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { LearningAIService } from '../services/learningAIService';

const router = Router();
router.use(authenticate);

// 1. GET /api/tutor/conversations - List conversations
router.get('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { materialId } = req.query;

    const where: any = { userId };
    if (materialId && typeof materialId === 'string') {
      where.materialId = materialId;
    }

    const conversations = await prisma.tutorConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        material: {
          select: { id: true, title: true, subject: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    res.json({ conversations });
  } catch (error) {
    console.error('Error fetching tutor conversations:', error);
    res.status(500).json({ error: 'Failed to fetch tutor conversations.' });
  }
});

// 2. GET /api/tutor/suggestions - Context-aware prompt suggestions
router.get('/suggestions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Fetch student's unreviewed mistakes to generate smart recommendations
    const mistakes = await prisma.mistakeRecord.findMany({
      where: { userId, reviewed: false },
      select: { conceptName: true, conceptId: true, topic: true, subject: true },
      take: 4,
      orderBy: { createdAt: 'desc' },
    });

    const weakConcepts = mistakes.map((m) => (m.conceptName || m.conceptId || '')).filter(Boolean);

    const defaultSuggestions = [
      {
        title: 'Cardiac Cycle & Heart Sounds',
        prompt: 'Explain the phases of the cardiac cycle, valve closures, and how S1 and S2 heart sounds are produced.',
        category: 'Physiology',
        mode: 'EXPLAIN',
      },
      {
        title: 'Frank-Starling Mechanism',
        prompt: 'How does preload affect myocardial contractility according to the Frank-Starling Law? What are its limits?',
        category: 'Physiology',
        mode: 'TEACH',
      },
      {
        title: 'Myocardial Infarction Pathophysiology',
        prompt: 'Walk me through the timeline of myocardial infarction from plaque rupture to transmural necrosis.',
        category: 'Pathology',
        mode: 'EXPLAIN',
      },
      {
        title: 'Viva Voce Exam Practice',
        prompt: 'Please test me on high-yield cardiovascular concepts with viva-style oral exam questions.',
        category: 'Clinical Exam',
        mode: 'VIVA_ME',
      },
      {
        title: 'Asthma vs COPD',
        prompt: 'Compare asthma and COPD pathophysiologically, including spirometry findings (FEV1/FVC) and bronchodilator reversibility.',
        category: 'Respiratory',
        mode: 'REVISE',
      },
    ];

    // If student has weak concepts, prepend targeted revision prompts
    const dynamicSuggestions = weakConcepts.map((concept) => ({
      title: `Reinforce: ${concept}`,
      prompt: `I recently struggled with questions on "${concept}". Can you explain the core mechanism step-by-step and highlight high-yield exam traps?`,
      category: 'Weak Concept Reinforcement',
      mode: 'TEACH',
    }));

    res.json({
      suggestions: [...dynamicSuggestions, ...defaultSuggestions].slice(0, 6),
      weakConcepts,
    });
  } catch (error) {
    console.error('Error fetching tutor suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions.' });
  }
});

// 3. POST /api/tutor/conversations - Create conversation (supports initialMessage)
router.post('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { materialId, subject, topic, mode = 'EXPLAIN', title, initialMessage } = req.body;

    let initialTitle = title;
    if (!initialTitle) {
      if (topic) initialTitle = `${topic} Discussion`;
      else if (subject) initialTitle = `${subject} Session`;
      else initialTitle = `AI Medical Tutor (${mode})`;
    }

    const conversation = await prisma.tutorConversation.create({
      data: {
        userId,
        materialId: materialId || null,
        subject: subject || null,
        topic: topic || null,
        mode: mode || 'EXPLAIN',
        title: initialTitle,
      },
      include: {
        material: {
          select: { id: true, title: true, subject: true, topic: true, extractedText: true },
        },
      },
    });

    let initialAssistantMessage = undefined;
    let initialUserMsg = undefined;

    // If initialMessage was provided, run the first tutor turn immediately
    if (initialMessage && typeof initialMessage === 'string' && initialMessage.trim().length > 0) {
      initialUserMsg = await prisma.tutorMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: initialMessage.trim(),
        },
      });

      // Get user's weak concepts for context
      const mistakes = await prisma.mistakeRecord.findMany({
        where: { userId, reviewed: false },
        select: { conceptName: true, conceptId: true },
        take: 3,
      });
      const weakConcepts = mistakes.map((m) => (m.conceptName || m.conceptId || '')).filter(Boolean);

      const tutorResponse = await LearningAIService.chatWithTutor({
        userMessage: initialMessage.trim(),
        mode: (mode || 'EXPLAIN') as any,
        history: [],
        materialContext: conversation.material?.extractedText || undefined,
        subject: subject || conversation.material?.subject || undefined,
        topic: topic || conversation.material?.topic || undefined,
        weakConcepts,
      });

      initialAssistantMessage = await prisma.tutorMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: tutorResponse.reply,
          sourceReference: tutorResponse.sourceReference || null,
        },
      });

      await prisma.tutorConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    }

    res.status(201).json({
      conversation,
      initialAssistantMessage,
      userMessage: initialUserMsg,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
});

// 4. GET /api/tutor/conversations/:id - Get conversation messages
router.get('/conversations/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const conversation = await prisma.tutorConversation.findFirst({
      where: { id, userId },
      include: {
        material: {
          select: { id: true, title: true, subject: true, topic: true, extractedText: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversation.' });
  }
});

// Helper for sending messages
async function handleTutorMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { message, mode } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message content is required.' });
      return;
    }

    const conversation = await prisma.tutorConversation.findFirst({
      where: { id, userId },
      include: {
        material: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 12,
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    // Save user message
    const userMsg = await prisma.tutorMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message.trim(),
      },
    });

    // Prepare context
    const currentMode = (mode || conversation.mode || 'EXPLAIN') as any;
    const materialText = conversation.material?.extractedText || undefined;
    const subject = conversation.subject || conversation.material?.subject || undefined;
    const topic = conversation.topic || conversation.material?.topic || undefined;

    const history = conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Retrieve student's unreviewed mistake concepts to guide adaptive explanation
    const mistakes = await prisma.mistakeRecord.findMany({
      where: { userId, reviewed: false },
      select: { conceptName: true, conceptId: true },
      take: 4,
    });
    const weakConcepts = mistakes.map((m) => (m.conceptName || m.conceptId || '')).filter(Boolean);

    // Call Tutor AI
    const tutorResponse = await LearningAIService.chatWithTutor({
      userMessage: message.trim(),
      mode: currentMode,
      history,
      materialContext: materialText,
      subject,
      topic,
      weakConcepts,
    });

    // Save assistant message
    const assistantMsg = await prisma.tutorMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: tutorResponse.reply,
        sourceReference: tutorResponse.sourceReference || null,
      },
    });

    // Update conversation mode & timestamp
    await prisma.tutorConversation.update({
      where: { id: conversation.id },
      data: {
        mode: currentMode,
        updatedAt: new Date(),
      },
    });

    res.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });
  } catch (error) {
    console.error('Error sending tutor message:', error);
    res.status(500).json({ error: 'Failed to process AI tutor message.' });
  }
}

// 5. POST /api/tutor/conversations/:id/messages & /message (supporting both paths)
router.post('/conversations/:id/messages', handleTutorMessage);
router.post('/conversations/:id/message', handleTutorMessage);

// 6. DELETE /api/tutor/conversations/:id - Delete conversation
router.delete('/conversations/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const conversation = await prisma.tutorConversation.findFirst({ where: { id, userId } });
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    await prisma.tutorConversation.delete({ where: { id } });
    res.json({ success: true, message: 'Conversation deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete conversation.' });
  }
});

export default router;
