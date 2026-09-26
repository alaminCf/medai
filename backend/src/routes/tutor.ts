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

// 2. POST /api/tutor/conversations - Create conversation
router.post('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { materialId, subject, topic, mode = 'EXPLAIN', title } = req.body;

    let initialTitle = title;
    if (!initialTitle) {
      if (topic) initialTitle = `${topic} Discussion`;
      else if (subject) initialTitle = `${subject} Session`;
      else initialTitle = 'AI Medical Tutor Session';
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
          select: { id: true, title: true, subject: true, topic: true },
        },
      },
    });

    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
});

// 3. GET /api/tutor/conversations/:id - Get conversation messages
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

// 4. POST /api/tutor/conversations/:id/message - Chat with tutor
router.post('/conversations/:id/message', async (req: AuthRequest, res: Response): Promise<void> => {
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
          take: 10,
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

    // Call Tutor AI
    const tutorResponse = await LearningAIService.chatWithTutor({
      userMessage: message.trim(),
      mode: currentMode,
      history,
      materialContext: materialText,
      subject,
      topic,
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
});

// 5. DELETE /api/tutor/conversations/:id - Delete conversation
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
