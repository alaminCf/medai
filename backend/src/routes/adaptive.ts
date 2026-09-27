import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { adaptiveQuestionService } from '../services/adaptiveQuestionService';
import { weakTopicService } from '../services/weakTopicService';
import { masteryService } from '../services/masteryService';
import { studyPlanService } from '../services/studyPlanService';
import { adaptiveVivaService } from '../services/adaptiveVivaService';
import { recommendationService } from '../services/recommendationService';
import { learningAnalyticsService } from '../services/learningAnalyticsService';

const router = Router();

// ==========================================
// 1. ADAPTIVE MCQ & LEARNING DIFFICULTY
// ==========================================

/**
 * POST /api/adaptive/mcq/start
 * Initialize adaptive MCQ practice session.
 * Protects correct options and explanations until user submission.
 */
router.post('/mcq/start', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subject = 'Physiology', topic, count = 10, questionType = 'Mixed', difficulty } = req.body;

    // 1. Create practice session
    const session = await prisma.mCQPracticeSession.create({
      data: {
        userId,
        subject,
        topic: topic || null,
        totalQuestions: count,
        status: 'active',
      },
    });

    // 2. Select questions adaptively based on student history and weak concepts
    const questions = await adaptiveQuestionService.selectAdaptiveQuestions(userId, {
      subject,
      topic,
      count,
      questionType,
      difficulty,
    });

    // 3. Log event
    await learningAnalyticsService.logEvent(userId, 'MCQ_STARTED', {
      sessionId: session.id,
      subject,
      topic,
      count: questions.length,
    });

    res.json({
      sessionId: session.id,
      subject,
      topic,
      questions,
    });
  } catch (error) {
    console.error('Error starting adaptive MCQ:', error);
    res.status(500).json({ error: 'Failed to start adaptive quiz session' });
  }
});

/**
 * POST /api/adaptive/mcq/submit
 * Evaluate student answer, update Mistake Bank, and return calibrated difficulty advice.
 */
router.post('/mcq/submit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId, questionId, selectedOption, responseTimeSeconds } = req.body;

    if (!sessionId || !questionId || !selectedOption) {
      res.status(400).json({ error: 'Missing required submission fields' });
      return;
    }

    const evaluation = await adaptiveQuestionService.evaluateAnswer(
      userId,
      sessionId,
      questionId,
      selectedOption,
      responseTimeSeconds
    );

    res.json(evaluation);
  } catch (error) {
    console.error('Error evaluating MCQ answer:', error);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

/**
 * GET /api/adaptive/mcq/weak-topics
 * Detect topics needing revision using strictly neutral educational language
 */
router.get('/mcq/weak-topics', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const analysis = await weakTopicService.detectWeakTopics(userId);
    res.json(analysis);
  } catch (error) {
    console.error('Error detecting weak topics:', error);
    res.status(500).json({ error: 'Failed to analyze learning performance' });
  }
});

// ==========================================
// 2. MISTAKE BANK & WRONG ANSWER ANALYSIS
// ==========================================

/**
 * GET /api/adaptive/mistakes
 * Retrieve student Mistake Bank records
 */
router.get('/mistakes', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const subject = req.query.subject as string;
    const reviewed = req.query.reviewed !== undefined ? req.query.reviewed === 'true' : undefined;

    const mistakes = await prisma.mistakeRecord.findMany({
      where: {
        userId,
        ...(subject ? { subject } : {}),
        ...(reviewed !== undefined ? { reviewed } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(mistakes);
  } catch (error) {
    console.error('Error fetching mistakes:', error);
    res.status(500).json({ error: 'Failed to fetch Mistake Bank' });
  }
});

/**
 * POST /api/adaptive/mistakes/:id/reviewed
 * Mark mistake as resolved/reviewed
 */
router.post('/mistakes/:id/reviewed', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const updated = await prisma.mistakeRecord.updateMany({
      where: { id, userId },
      data: { reviewed: true, updatedAt: new Date() },
    });

    res.json({ success: true, count: updated.count });
  } catch (error) {
    console.error('Error marking mistake reviewed:', error);
    res.status(500).json({ error: 'Failed to update mistake status' });
  }
});

// ==========================================
// 3. TOPIC MASTERY & KNOWLEDGE MAP
// ==========================================

/**
 * GET /api/adaptive/mastery
 * Transparent, explainable topic mastery indicators
 */
router.get('/mastery', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const indicators = await masteryService.getAllTopicMasteries(userId);
    res.json(indicators);
  } catch (error) {
    console.error('Error fetching mastery:', error);
    res.status(500).json({ error: 'Failed to calculate mastery' });
  }
});

/**
 * GET /api/adaptive/knowledge-map
 * Hierarchical Subject -> Topic -> Subtopic -> Concepts visualization tree
 */
router.get('/knowledge-map', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const tree = await masteryService.getKnowledgeMap(userId);
    res.json(tree);
  } catch (error) {
    console.error('Error building knowledge map:', error);
    res.status(500).json({ error: 'Failed to generate Knowledge Map' });
  }
});

// ==========================================
// 4. PERSONALIZED STUDY PLAN & DAILY TASKS
// ==========================================

/**
 * GET /api/adaptive/study-plan
 * Get user's active study plan
 */
router.get('/study-plan', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const plan = await studyPlanService.getActivePlan(userId);
    res.json(plan);
  } catch (error) {
    console.error('Error fetching study plan:', error);
    res.status(500).json({ error: 'Failed to fetch study plan' });
  }
});

/**
 * POST /api/adaptive/study-plan
 * Create or customize personalized study plan
 */
router.post('/study-plan', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, goal, subjects, topics, availableDays, dailyTimeMinutes, examDate } = req.body;

    if (!goal) {
      res.status(400).json({ error: 'Study goal is required' });
      return;
    }

    const plan = await studyPlanService.createOrUpdatePlan(userId, {
      title,
      goal,
      subjects: subjects || ['Physiology', 'Anatomy'],
      topics,
      availableDays: availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      dailyTimeMinutes: dailyTimeMinutes || 90,
      examDate,
    });

    res.json(plan);
  } catch (error) {
    console.error('Error creating study plan:', error);
    res.status(500).json({ error: 'Failed to create study plan' });
  }
});

/**
 * GET /api/adaptive/tasks/today
 * Retrieve today's study tasks (/today)
 */
router.get('/tasks/today', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const tasks = await studyPlanService.getTodayTasks(userId);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching today tasks:', error);
    res.status(500).json({ error: 'Failed to fetch today tasks' });
  }
});

/**
 * POST /api/adaptive/tasks/:id/toggle
 * Toggle completion of a study plan task
 */
router.post('/tasks/:id/toggle', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const task = await studyPlanService.toggleTaskCompletion(userId, id);

    if (task.isCompleted) {
      await learningAnalyticsService.logEvent(userId, 'STUDY_PLAN_TASK_COMPLETED', {
        taskId: task.id,
        taskType: task.taskType,
        topic: task.topic,
      });
    }

    res.json(task);
  } catch (error) {
    console.error('Error toggling task completion:', error);
    res.status(500).json({ error: 'Failed to toggle task completion' });
  }
});

// ==========================================
// 5. SMART RECOMMENDATIONS
// ==========================================

/**
 * GET /api/adaptive/recommendations
 * Non-manipulative factual study prompts based on actual data
 */
router.get('/recommendations', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const recs = await recommendationService.getRecommendations(userId);
    res.json(recs);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// ==========================================
// 6. ADAPTIVE VIVA ORAL PRACTICE
// ==========================================

/**
 * POST /api/adaptive/viva/start
 * Start an adaptive viva oral examination
 */
router.post('/viva/start', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subject = 'Physiology', topic = 'Cardiovascular System', difficulty = 'medium' } = req.body;

    const session = await adaptiveVivaService.startAdaptiveSession(userId, subject, topic, difficulty);

    await learningAnalyticsService.logEvent(userId, 'VIVA_STARTED', {
      sessionId: session.sessionId,
      subject,
      topic,
    });

    res.json(session);
  } catch (error) {
    console.error('Error starting adaptive viva:', error);
    res.status(500).json({ error: 'Failed to start adaptive viva' });
  }
});

/**
 * POST /api/adaptive/viva/submit
 * Submit oral viva answer, evaluate concept coverage, and advance question
 */
router.post('/viva/submit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId, questionId, studentAnswer, topic, currentDifficulty = 'Moderate' } = req.body;

    if (!sessionId || !questionId || !studentAnswer) {
      res.status(400).json({ error: 'Missing required viva submission fields' });
      return;
    }

    const result = await adaptiveVivaService.submitAnswerAndGetNext(
      userId,
      sessionId,
      questionId,
      studentAnswer,
      topic || 'General Topic',
      currentDifficulty
    );

    res.json(result);
  } catch (error) {
    console.error('Error evaluating viva turn:', error);
    res.status(500).json({ error: 'Failed to evaluate viva turn' });
  }
});

// ==========================================
// 7. LEARNING STREAK & ADVANCED ANALYTICS
// ==========================================

/**
 * GET /api/adaptive/analytics/streak
 * Calculate current and longest learning streaks
 */
router.get('/analytics/streak', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const streak = await learningAnalyticsService.getStreakInfo(userId);
    res.json(streak);
  } catch (error) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ error: 'Failed to fetch streak info' });
  }
});

/**
 * GET /api/adaptive/analytics/weekly-report
 * Generate weekly learning summary report
 */
router.get('/analytics/weekly-report', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const report = await learningAnalyticsService.getWeeklyReport(userId);
    res.json(report);
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

/**
 * GET /api/adaptive/analytics/range
 * Fetch multi-timeframe analytics (7d, 30d, 90d, all)
 */
router.get('/analytics/range', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const timeframe = (req.query.timeframe as '7d' | '30d' | '90d' | 'all') || '7d';
    const analytics = await learningAnalyticsService.getTimeRangeAnalytics(userId, timeframe);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching range analytics:', error);
    res.status(500).json({ error: 'Failed to fetch range analytics' });
  }
});

export default router;
