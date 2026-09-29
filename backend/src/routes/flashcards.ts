import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { LearningAIService } from '../services/learningAIService';

const router = Router();
router.use(authenticate);

// POST /api/flashcards/generate - AI Flashcard Generation
router.post('/generate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      subject,
      topic,
      count = 10,
      difficulty = 'Mixed',
      materialId,
      saveToDeck = true,
      deckTitle,
    } = req.body;

    let materialText = '';
    if (materialId) {
      const mat = await prisma.studyMaterial.findFirst({ where: { id: materialId, userId } });
      if (mat?.extractedText) materialText = mat.extractedText;
    }

    const diff = (difficulty ? String(difficulty).toLowerCase() : 'mixed') as 'easy' | 'medium' | 'hard' | 'mixed';
    const cardCount = parseInt(String(count), 10) || 10;
    const cleanSubject = subject || 'General Medicine';
    const cleanTopic = topic || 'Core Clinical Concepts';

    const generated = await LearningAIService.generateFlashcards({
      materialText: materialText || undefined,
      subject: cleanSubject,
      topic: cleanTopic,
      count: cardCount,
      difficulty: diff,
    });

    let deck: any = null;
    if (saveToDeck) {
      deck = await prisma.flashcardDeck.create({
        data: {
          userId,
          materialId: materialId || null,
          title: deckTitle || `${cleanTopic || cleanSubject} High-Yield Flashcards`,
          subject: cleanSubject,
          topic: cleanTopic || null,
          description: `Auto-generated ${generated.length} ${difficulty} flashcards on ${cleanTopic}.`,
          flashcards: {
            create: generated.map((c) => ({
              question: c.question,
              answer: c.answer,
              explanation: c.explanation || null,
              sourceReference: c.sourceReference || `${cleanSubject} - ${cleanTopic}`,
              difficulty: c.difficulty || 'medium',
            })),
          },
        },
        include: {
          flashcards: true,
          _count: { select: { reviews: true } },
        },
      });
      deck = { ...deck, cards: deck.flashcards };
    }

    res.status(201).json({ flashcards: generated, deck });
  } catch (error) {
    console.error('Flashcard generation error:', error);
    res.status(500).json({ error: 'Failed to generate flashcards.' });
  }
});


// 1. GET /api/flashcards/decks - List decks
router.get('/decks', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subject, topic } = req.query;

    const where: any = { userId };
    if (subject && typeof subject === 'string') where.subject = subject;
    if (topic && typeof topic === 'string') where.topic = topic;

    const decks = await prisma.flashcardDeck.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        material: {
          select: { id: true, title: true },
        },
        _count: {
          select: { flashcards: true, reviews: true },
        },
      },
    });

    res.json({ decks });
  } catch (error) {
    console.error('Error fetching decks:', error);
    res.status(500).json({ error: 'Failed to fetch flashcard decks.' });
  }
});

// 2. POST /api/flashcards/decks - Create deck
router.post('/decks', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, subject, topic, description, materialId } = req.body;

    if (!title || !subject) {
      res.status(400).json({ error: 'Title and subject are required.' });
      return;
    }

    const deck = await prisma.flashcardDeck.create({
      data: {
        userId,
        materialId: materialId || null,
        title,
        subject,
        topic: topic || null,
        description: description || null,
      },
    });

    res.status(201).json({ deck });
  } catch (error) {
    console.error('Error creating deck:', error);
    res.status(500).json({ error: 'Failed to create flashcard deck.' });
  }
});

// 3. GET /api/flashcards/decks/:id - Get deck with cards
router.get('/decks/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deck = await prisma.flashcardDeck.findFirst({
      where: { id, userId },
      include: {
        material: {
          select: { id: true, title: true, subject: true },
        },
        flashcards: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { reviews: true },
        },
      },
    });

    if (!deck) {
      res.status(404).json({ error: 'Flashcard deck not found.' });
      return;
    }

    res.json({ deck: { ...deck, cards: deck.flashcards } });
  } catch (error) {
    console.error('Error fetching deck:', error);
    res.status(500).json({ error: 'Failed to fetch flashcard deck.' });
  }
});

// 4. PUT /api/flashcards/decks/:id - Update deck
router.put('/decks/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.flashcardDeck.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Deck not found.' });
      return;
    }

    const updated = await prisma.flashcardDeck.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : existing.title,
        subject: data.subject !== undefined ? data.subject : existing.subject,
        topic: data.topic !== undefined ? data.topic : existing.topic,
        description: data.description !== undefined ? data.description : existing.description,
      },
    });

    res.json({ deck: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update deck.' });
  }
});

// 5. DELETE /api/flashcards/decks/:id - Delete deck
router.delete('/decks/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.flashcardDeck.findFirst({ where: { id, userId } });
    if (!existing) {
      res.status(404).json({ error: 'Deck not found.' });
      return;
    }

    await prisma.flashcardDeck.delete({ where: { id } });
    res.json({ success: true, message: 'Flashcard deck deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete deck.' });
  }
});

// 6. POST /api/flashcards/decks/:id/cards - Add card
router.post('/decks/:id/cards', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { question, answer, explanation, sourceReference, difficulty = 'medium' } = req.body;

    const deck = await prisma.flashcardDeck.findFirst({ where: { id, userId } });
    if (!deck) {
      res.status(404).json({ error: 'Deck not found.' });
      return;
    }

    if (!question || !answer) {
      res.status(400).json({ error: 'Question and answer are required.' });
      return;
    }

    const card = await prisma.flashcard.create({
      data: {
        deckId: deck.id,
        question,
        answer,
        explanation: explanation || null,
        sourceReference: sourceReference || null,
        difficulty,
      },
    });

    res.status(201).json({ card });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create flashcard.' });
  }
});

// 7. PUT /api/flashcards/cards/:cardId - Edit card
router.put('/cards/:cardId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { cardId } = req.params;
    const data = req.body;

    const card = await prisma.flashcard.findFirst({
      where: { id: cardId, deck: { userId } },
    });
    if (!card) {
      res.status(404).json({ error: 'Flashcard not found.' });
      return;
    }

    const updated = await prisma.flashcard.update({
      where: { id: cardId },
      data: {
        question: data.question !== undefined ? data.question : card.question,
        answer: data.answer !== undefined ? data.answer : card.answer,
        explanation: data.explanation !== undefined ? data.explanation : card.explanation,
        sourceReference: data.sourceReference !== undefined ? data.sourceReference : card.sourceReference,
        difficulty: data.difficulty || card.difficulty,
      },
    });

    res.json({ card: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update flashcard.' });
  }
});

// 8. DELETE /api/flashcards/cards/:cardId - Delete card
router.delete('/cards/:cardId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { cardId } = req.params;

    const card = await prisma.flashcard.findFirst({
      where: { id: cardId, deck: { userId } },
    });
    if (!card) {
      res.status(404).json({ error: 'Flashcard not found.' });
      return;
    }

    await prisma.flashcard.delete({ where: { id: cardId } });
    res.json({ success: true, message: 'Flashcard removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete flashcard.' });
  }
});

// 9. POST /api/flashcards/decks/:id/review - Record card review rating
router.post('/decks/:id/review', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { cardId, rating } = req.body; // "again" | "hard" | "good" | "easy"

    const deck = await prisma.flashcardDeck.findFirst({ where: { id, userId } });
    if (!deck) {
      res.status(404).json({ error: 'Deck not found.' });
      return;
    }

    const review = await prisma.flashcardReview.create({
      data: {
        userId,
        deckId: deck.id,
        cardId,
        rating: rating || 'good',
      },
    });

    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record card review.' });
  }
});

// Support /decks/:deckId/cards/:cardId/review
router.post("/decks/:deckId/cards/:cardId/review", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { deckId, cardId } = req.params;
    const { rating } = req.body;

    const deck = await prisma.flashcardDeck.findFirst({ where: { id: deckId, userId } });
    if (!deck) {
      res.status(404).json({ error: "Deck not found." });
      return;
    }

    const review = await prisma.flashcardReview.create({
      data: {
        userId,
        deckId: deck.id,
        cardId,
        rating: rating ? String(rating).toLowerCase() : "good",
      },
    });

    res.json({ success: true, review });
  } catch (error) {
    res.status(500).json({ error: "Failed to record card review." });
  }
});

export default router;
