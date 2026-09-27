import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { spacedRepetitionService } from '../services/spacedRepetitionService';
import { weakTopicService } from '../services/weakTopicService';
import { recommendationService } from '../services/recommendationService';
import { studyPlanService } from '../services/studyPlanService';
import { learningAnalyticsService } from '../services/learningAnalyticsService';

const router = Router();

/**
 * GET /api/revision/today
 * Main Smart Revision command center overview
 */
router.get('/today', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // 1. Spaced Repetition Due Cards
    const { dueCards, counts } = await spacedRepetitionService.getPrioritizedDueCards(userId, 50);

    // 2. Topics needing attention
    const weakTopics = await weakTopicService.detectWeakTopics(userId);
    const topicsDueReview = weakTopics.filter(t => t.needsAttention);

    // 3. Unresolved mistakes / weak concepts
    const activeMistakes = await prisma.mistakeRecord.findMany({
      where: { userId, reviewed: false },
      take: 6,
      orderBy: { createdAt: 'desc' },
    });

    // 4. Actionable recommendations
    const recommendations = await recommendationService.getRecommendations(userId);

    // 5. Today's study tasks
    const todayTasks = await studyPlanService.getTodayTasks(userId);

    // 6. Build structured revision plan
    const todayPlanItems = [
      {
        id: 'plan-1',
        title: `${counts.totalDue > 0 ? counts.totalDue : 12} Flashcards Scheduled`,
        type: 'FLASHCARD',
        count: counts.totalDue > 0 ? counts.totalDue : 12,
        actionUrl: '/flashcards/review',
      },
      {
        id: 'plan-2',
        title: `${topicsDueReview.length > 0 ? topicsDueReview[0].topic : 'Heart Sounds'} — 8 Adaptive MCQs`,
        type: 'MCQ',
        count: 8,
        actionUrl: `/mcq/adaptive?topic=${encodeURIComponent(topicsDueReview.length > 0 ? topicsDueReview[0].topic : 'Heart Sounds')}`,
      },
      {
        id: 'plan-3',
        title: `${topicsDueReview.length > 1 ? topicsDueReview[1].topic : 'Cardiac Cycle'} — 5 Viva Questions`,
        type: 'VIVA',
        count: 5,
        actionUrl: `/viva/adaptive?topic=${encodeURIComponent(topicsDueReview.length > 1 ? topicsDueReview[1].topic : 'Cardiac Cycle')}`,
      },
    ];

    res.json({
      dueCards,
      counts,
      topicsDueReview,
      activeMistakes,
      recommendations,
      todayTasks,
      todayPlanItems,
    });
  } catch (error) {
    console.error('Error fetching today revision data:', error);
    res.status(500).json({ error: 'Failed to fetch revision data' });
  }
});

/**
 * GET /api/revision/due-cards
 * Returns prioritized due flashcards for spaced repetition session
 */
router.get('/due-cards', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const data = await spacedRepetitionService.getPrioritizedDueCards(userId, limit);
    res.json(data);
  } catch (error) {
    console.error('Error fetching due cards:', error);
    res.status(500).json({ error: 'Failed to fetch due cards' });
  }
});

/**
 * POST /api/revision/rate-card
 * Record card review rating (AGAIN, HARD, GOOD, EASY)
 */
router.post('/rate-card', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { cardId, rating } = req.body;

    if (!cardId || !['AGAIN', 'HARD', 'GOOD', 'EASY'].includes(rating)) {
      res.status(400).json({ error: 'Valid cardId and rating (AGAIN, HARD, GOOD, EASY) are required' });
      return;
    }

    const state = await spacedRepetitionService.recordCardReview(userId, cardId, rating);

    await learningAnalyticsService.logEvent(userId, 'FLASHCARD_REVIEWED', {
      cardId,
      rating,
      intervalDays: state.intervalDays,
      dueAt: state.dueAt,
    });

    res.json({
      success: true,
      reviewState: state,
    });
  } catch (error) {
    console.error('Error recording card review:', error);
    res.status(500).json({ error: 'Failed to record card review' });
  }
});

/**
 * GET /api/revision/settings
 * Fetch spaced repetition user configuration
 */
router.get('/settings', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    let settings = await prisma.spacedRepetitionSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.spacedRepetitionSettings.create({
        data: {
          userId,
          newCardsPerDay: 20,
          maxReviewsPerDay: 50,
          reminderEnabled: true,
          preferredReminderTime: '09:00',
        },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/revision/settings
 * Update spaced repetition settings
 */
router.put('/settings', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { newCardsPerDay, maxReviewsPerDay, reminderEnabled, preferredReminderTime } = req.body;

    const updated = await prisma.spacedRepetitionSettings.upsert({
      where: { userId },
      update: {
        ...(typeof newCardsPerDay === 'number' ? { newCardsPerDay } : {}),
        ...(typeof maxReviewsPerDay === 'number' ? { maxReviewsPerDay } : {}),
        ...(typeof reminderEnabled === 'boolean' ? { reminderEnabled } : {}),
        ...(preferredReminderTime ? { preferredReminderTime } : {}),
      },
      create: {
        userId,
        newCardsPerDay: newCardsPerDay || 20,
        maxReviewsPerDay: maxReviewsPerDay || 50,
        reminderEnabled: reminderEnabled ?? true,
        preferredReminderTime: preferredReminderTime || '09:00',
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
