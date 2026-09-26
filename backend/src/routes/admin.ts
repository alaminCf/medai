import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// Admin dashboard stats
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalUsers, totalCases, totalSessions, activeSessions] = await Promise.all([
      prisma.user.count(),
      prisma.patientCase.count(),
      prisma.practiceSession.count(),
      prisma.practiceSession.count({ where: { status: 'active' } }),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalCases,
        totalSessions,
        activeSessions,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// List all users (admin only)
router.get('/users', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// List all cases (admin only - includes full data)
router.get('/cases', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cases = await prisma.patientCase.findMany({
      include: { clinicalData: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ cases });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// Toggle case active status (admin only)
router.patch('/cases/:id/toggle', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patientCase = await prisma.patientCase.findUnique({ where: { id: req.params.id } });
    if (!patientCase) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }
    const updated = await prisma.patientCase.update({
      where: { id: req.params.id },
      data: { isActive: !patientCase.isActive },
    });
    res.json({ case: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update case' });
  }
});

export default router;
