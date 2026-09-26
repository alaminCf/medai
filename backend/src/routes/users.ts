import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { sessions: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.patch(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name } = req.body;

    try {
      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: { name },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          updatedAt: true,
        },
      });

      res.json({ user: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

// Get user dashboard stats
router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const [completedSessions, recentSessions, totalCases, totalPracticeTime] = await Promise.all([
      prisma.practiceSession.count({
        where: { userId, status: 'completed' },
      }),
      prisma.practiceSession.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          patientCase: {
            select: {
              id: true,
              title: true,
              patientName: true,
              difficulty: true,
              category: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.patientCase.count({ where: { isActive: true } }),
      prisma.practiceSession.aggregate({
        where: { userId, status: 'completed' },
        _sum: { duration: true },
      }),
    ]);

    const practiceTimeMinutes = Math.floor((totalPracticeTime._sum.duration || 0) / 60);

    // Phase 4: Fetch user evaluations for clinical progress stats
    const userEvaluations = await prisma.clinicalEvaluation.findMany({
      where: {
        practiceAttempt: {
          practiceSession: { userId },
        },
      },
      select: {
        historyScore: true,
        overallScore: true,
        coveredCount: true,
        totalCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let averageHistoryCoverage = 0;
    if (userEvaluations.length > 0) {
      const sumHistory = userEvaluations.reduce((acc, curr) => acc + curr.historyScore, 0);
      averageHistoryCoverage = Math.round(sumHistory / userEvaluations.length);
    }

    let recentImprovement = 0;
    if (userEvaluations.length >= 2) {
      recentImprovement = Math.round(userEvaluations[0].overallScore - userEvaluations[1].overallScore);
    } else if (userEvaluations.length === 1) {
      recentImprovement = Math.round(userEvaluations[0].overallScore);
    }

    res.json({
      stats: {
        casesAvailable: totalCases,
        sessionsCompleted: completedSessions,
        practiceTimeMinutes,
        averageHistoryCoverage,
        recentImprovement,
        totalEvaluations: userEvaluations.length,
      },
      recentSessions,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
