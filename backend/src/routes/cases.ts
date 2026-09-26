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


// Get case learning objectives and rubric (Phase 4: protected view for students vs admins)
router.get('/:id/rubric', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rubric = await prisma.clinicalCaseRubric.findUnique({
      where: { patientCaseId: req.params.id },
      include: {
        items: {
          where: { isActive: true },
          select: {
            id: true,
            category: true,
            title: true,
            importance: true,
            // Only include clinicalRationale and sampleQuestions for Admins/Educators
            clinicalRationale: req.user!.role === 'admin',
            sampleQuestions: req.user!.role === 'admin',
            weight: req.user!.role === 'admin',
          },
        },
      },
    });

    if (!rubric) {
      res.status(404).json({ error: 'Rubric not found for this case' });
      return;
    }

    const learningObjectives = rubric.learningObjectives ? JSON.parse(rubric.learningObjectives) : [];
    const scoringWeights = rubric.scoringWeights ? JSON.parse(rubric.scoringWeights) : null;

    res.json({
      rubric: {
        id: rubric.id,
        version: rubric.version,
        learningObjectives,
        scoringWeights: req.user!.role === 'admin' ? scoringWeights : undefined,
        categories: Array.from(new Set(rubric.items.map((i) => i.category))),
        items: req.user!.role === 'admin' ? rubric.items : undefined,
      },
    });
  } catch (error) {
    console.error('Get rubric error:', error);
    res.status(500).json({ error: 'Failed to fetch case rubric' });
  }
});

export default router;
