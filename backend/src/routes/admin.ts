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


// ==========================================
// PHASE 4: CLINICAL RUBRIC MANAGEMENT (ADMIN)
// ==========================================

// Get full rubric for a case
router.get('/cases/:id/rubric', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rubric = await prisma.clinicalCaseRubric.findUnique({
      where: { patientCaseId: req.params.id },
      include: {
        items: {
          orderBy: { category: 'asc' },
        },
      },
    });

    if (!rubric) {
      res.status(404).json({ error: 'Rubric not found' });
      return;
    }

    res.json({
      rubric: {
        ...rubric,
        learningObjectives: rubric.learningObjectives ? JSON.parse(rubric.learningObjectives) : [],
        scoringWeights: rubric.scoringWeights ? JSON.parse(rubric.scoringWeights) : null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin rubric' });
  }
});

// Update case rubric metadata
router.put('/cases/:id/rubric', async (req: AuthRequest, res: Response): Promise<void> => {
  const { learningObjectives, scoringWeights } = req.body;
  try {
    const updated = await prisma.clinicalCaseRubric.upsert({
      where: { patientCaseId: req.params.id },
      update: {
        learningObjectives: learningObjectives ? JSON.stringify(learningObjectives) : undefined,
        scoringWeights: scoringWeights ? JSON.stringify(scoringWeights) : undefined,
      },
      create: {
        patientCaseId: req.params.id,
        learningObjectives: learningObjectives ? JSON.stringify(learningObjectives) : JSON.stringify([]),
        scoringWeights: scoringWeights ? JSON.stringify(scoringWeights) : JSON.stringify({
          historyTaking: 40,
          communication: 20,
          clinicalReasoning: 20,
          patientCenteredness: 10,
          consultationStructure: 10,
        }),
      },
      include: { items: true },
    });
    res.json({ rubric: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update rubric' });
  }
});

// Create rubric item
router.post('/cases/:id/rubric/items', async (req: AuthRequest, res: Response): Promise<void> => {
  const { category, title, description, intent, sampleQuestions, importance, clinicalRationale, weight } = req.body;
  try {
    let rubric = await prisma.clinicalCaseRubric.findUnique({
      where: { patientCaseId: req.params.id },
    });
    if (!rubric) {
      rubric = await prisma.clinicalCaseRubric.create({
        data: { patientCaseId: req.params.id },
      });
    }

    const item = await prisma.rubricItem.create({
      data: {
        rubricId: rubric.id,
        category,
        title,
        description: description || null,
        intent: intent || title.toLowerCase().replace(/\s+/g, '_'),
        sampleQuestions: sampleQuestions ? JSON.stringify(sampleQuestions) : null,
        importance: importance || 'required',
        clinicalRationale: clinicalRationale || null,
        weight: weight !== undefined ? parseFloat(weight) : 1.0,
        isActive: true,
      },
    });

    res.status(201).json({ item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create rubric item' });
  }
});

// Update rubric item
router.put('/rubric/items/:itemId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { itemId } = req.params;
  const { category, title, description, intent, sampleQuestions, importance, clinicalRationale, weight, isActive } = req.body;

  try {
    const updated = await prisma.rubricItem.update({
      where: { id: itemId },
      data: {
        category,
        title,
        description,
        intent,
        sampleQuestions: sampleQuestions ? JSON.stringify(sampleQuestions) : undefined,
        importance,
        clinicalRationale,
        weight: weight !== undefined ? parseFloat(weight) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });
    res.json({ item: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update rubric item' });
  }
});

// Delete/deactivate rubric item
router.delete('/rubric/items/:itemId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { itemId } = req.params;
  try {
    await prisma.rubricItem.delete({
      where: { id: itemId },
    });
    res.json({ success: true, message: 'Rubric item deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rubric item' });
  }
});

export default router;
