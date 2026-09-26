import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all active cases (no hidden clinical data)
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cases = await prisma.patientCase.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedDuration: true,
        patientName: true,
        patientAge: true,
        patientGender: true,
        chiefComplaint: true,
        caseSummary: true,
        personality: true,
        isActive: true,
        createdAt: true,
        clinicalData: {
          select: {
            learningObjectives: true,
            // NEVER include hiddenDiagnosis, redFlags, symptomDetails, etc.
          },
        },
      },
      orderBy: [
        { difficulty: 'asc' },
        { title: 'asc' },
      ],
    });
    res.json({ cases });
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// Get a single case by ID (no hidden clinical data)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patientCase = await prisma.patientCase.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedDuration: true,
        patientName: true,
        patientAge: true,
        patientGender: true,
        chiefComplaint: true,
        caseSummary: true,
        personality: true,
        isActive: true,
        createdAt: true,
        clinicalData: {
          select: {
            learningObjectives: true,
            // IMPORTANT: hiddenDiagnosis, redFlags, symptomDetails NOT included
          },
        },
      },
    });

    if (!patientCase || !patientCase.isActive) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    res.json({ case: patientCase });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

export default router;
