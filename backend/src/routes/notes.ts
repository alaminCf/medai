import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { LearningAIService } from '../services/learningAIService';

const router = Router();
router.use(authenticate);

// 1. GET /api/notes - List notes
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subject, topic, search, favoriteOnly, pinnedOnly } = req.query;

    const where: any = { userId };
    if (subject && typeof subject === 'string') where.subject = subject;
    if (topic && typeof topic === 'string') where.topic = topic;
    if (favoriteOnly === 'true') where.isFavorite = true;
    if (pinnedOnly === 'true') where.isPinned = true;
    if (search && typeof search === 'string') {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const notes = await prisma.studyNote.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      include: {
        material: {
          select: { id: true, title: true, subject: true },
        },
      },
    });

    res.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch study notes.' });
  }
});

// 2. POST /api/notes - Create note
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, content, subject, topic, tags, materialId, sourceType = 'PERSONAL', isPinned, isFavorite } = req.body;

    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required.' });
      return;
    }

    const note = await prisma.studyNote.create({
      data: {
        userId,
        materialId: materialId || null,
        title,
        content,
        subject: subject || 'General Medicine',
        topic: topic || null,
        tags: tags || null,
        sourceType,
        isPinned: Boolean(isPinned),
        isFavorite: Boolean(isFavorite),
      },
      include: {
        material: {
          select: { id: true, title: true },
        },
      },
    });

    res.status(201).json({ note });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create study note.' });
  }
});

// 3. GET /api/notes/:id - Get note
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const note = await prisma.studyNote.findFirst({
      where: { id, userId },
      include: {
        material: {
          select: { id: true, title: true, subject: true },
        },
      },
    });

    if (!note) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    res.json({ note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch note.' });
  }
});

// 4. PUT /api/notes/:id - Update note
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.studyNote.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    const updated = await prisma.studyNote.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        content: data.content !== undefined ? data.content : existing.content,
        subject: data.subject !== undefined ? data.subject : existing.subject,
        topic: data.topic !== undefined ? data.topic : existing.topic,
        tags: data.tags !== undefined ? data.tags : existing.tags,
        isPinned: data.isPinned !== undefined ? Boolean(data.isPinned) : existing.isPinned,
        isFavorite: data.isFavorite !== undefined ? Boolean(data.isFavorite) : existing.isFavorite,
      },
    });

    res.json({ note: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note.' });
  }
});

// 5. DELETE /api/notes/:id - Delete note
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.studyNote.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    await prisma.studyNote.delete({ where: { id } });
    res.json({ success: true, message: 'Note deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note.' });
  }
});

// 6. POST /api/notes/:id/ai-action - AI helper actions on notes
router.post('/:id/ai-action', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { action } = req.body; // "improve" | "summarize" | "explain_simply" | "create_flashcards" | "create_mcqs"

    const note = await prisma.studyNote.findFirst({ where: { id, userId } });
    if (!note) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    if (action === 'create_flashcards') {
      const cards = await LearningAIService.generateFlashcards({
        materialText: `${note.title}\n\n${note.content}`,
        count: 5,
        difficulty: 'medium',
      });

      const deck = await prisma.flashcardDeck.create({
        data: {
          userId,
          title: `Flashcards from: ${note.title}`,
          subject: note.subject,
          topic: note.topic,
          description: `Auto-generated from note: ${note.title}`,
          flashcards: {
            create: cards.map((c) => ({
              question: c.question,
              answer: c.answer,
              explanation: c.explanation,
              sourceReference: note.title,
              difficulty: c.difficulty,
            })),
          },
        },
        include: { flashcards: true },
      });

      res.json({ action, deck });
      return;
    }

    if (action === 'create_mcqs') {
      const mcqs = await LearningAIService.generateMCQs({
        materialText: `${note.title}\n\n${note.content}`,
        subject: note.subject,
        topic: note.topic || 'General',
        count: 5,
        difficulty: 'medium',
      });

      const qb = await prisma.questionBank.create({
        data: {
          userId,
          title: `MCQs from: ${note.title}`,
          subject: note.subject,
          topic: note.topic,
          description: `Questions generated from note: ${note.title}`,
          questions: {
            create: mcqs.map((q) => ({
              question: q.question,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              correctOption: q.correctOption,
              explanation: q.explanation,
              difficulty: q.difficulty,
              sourceReference: note.title,
            })),
          },
        },
        include: { questions: true },
      });

      res.json({ action, questionBank: qb });
      return;
    }

    // Text transformation actions
    const prompt =
      action === 'improve'
        ? 'Enhance this medical study note: improve clarity, bullet structure, physiological accuracy, and high-yield emphasis without adding false data.'
        : action === 'summarize'
        ? 'Create a concise 4-bullet executive revision summary of this medical note.'
        : 'Explain the core mechanism in this note in simple, easy-to-understand language for a first-year medical student.';

    const tutorRes = await LearningAIService.chatWithTutor({
      userMessage: `${prompt}\n\nNote:\n${note.content}`,
      mode: 'EXPLAIN',
      history: [],
      subject: note.subject,
      topic: note.topic || undefined,
    });

    res.json({
      action,
      resultText: tutorRes.reply,
      improvedContent: tutorRes.reply,
      summary: tutorRes.reply,
      explanation: tutorRes.reply,
    });
  } catch (error) {
    console.error('Note AI action error:', error);
    res.status(500).json({ error: 'Failed to process AI note action.' });
  }
});

export default router;
