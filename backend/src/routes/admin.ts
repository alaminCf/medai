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


// ==========================================
// PHASE 5: OSCE EXAM & RUBRIC MANAGEMENT
// ==========================================

// List all clinical exams for admin
router.get("/exams", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const exams = await prisma.clinicalExam.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        stations: {
          orderBy: { stationNumber: "asc" },
          include: {
            patientCase: {
              select: { id: true, title: true, patientName: true, chiefComplaint: true }
            },
            osceRubric: {
              include: { items: true }
            }
          }
        },
        _count: {
          select: { attempts: true }
        }
      }
    });
    res.json({ exams });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin clinical exams" });
  }
});

// Create new clinical exam
router.post("/exams", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      slug,
      description,
      instructions,
      durationMinutes,
      difficulty,
      voiceRequired,
      showLiveTranscript,
      fullscreenRequired,
      showDetailedFeedback,
      allowRetake,
      maxAttempts,
      passingPercentage,
    } = req.body;

    const exam = await prisma.clinicalExam.create({
      data: {
        title,
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description,
        instructions,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : 30,
        difficulty: difficulty || "intermediate",
        voiceRequired: Boolean(voiceRequired),
        showLiveTranscript: Boolean(showLiveTranscript),
        fullscreenRequired: Boolean(fullscreenRequired),
        showDetailedFeedback: showDetailedFeedback !== undefined ? Boolean(showDetailedFeedback) : true,
        allowRetake: allowRetake !== undefined ? Boolean(allowRetake) : true,
        maxAttempts: maxAttempts ? parseInt(maxAttempts) : 3,
        passingPercentage: passingPercentage ? parseFloat(passingPercentage) : 60.0,
      }
    });

    res.json({ exam });
  } catch (error) {
    console.error("Create exam error:", error);
    res.status(500).json({ error: "Failed to create clinical exam" });
  }
});

// Update clinical exam
router.put("/exams/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updated = await prisma.clinicalExam.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        durationMinutes: data.durationMinutes !== undefined ? parseInt(data.durationMinutes) : undefined,
        difficulty: data.difficulty,
        status: data.status,
        voiceRequired: data.voiceRequired !== undefined ? Boolean(data.voiceRequired) : undefined,
        showLiveTranscript: data.showLiveTranscript !== undefined ? Boolean(data.showLiveTranscript) : undefined,
        fullscreenRequired: data.fullscreenRequired !== undefined ? Boolean(data.fullscreenRequired) : undefined,
        showDetailedFeedback: data.showDetailedFeedback !== undefined ? Boolean(data.showDetailedFeedback) : undefined,
        allowRetake: data.allowRetake !== undefined ? Boolean(data.allowRetake) : undefined,
        maxAttempts: data.maxAttempts !== undefined ? parseInt(data.maxAttempts) : undefined,
        passingPercentage: data.passingPercentage !== undefined ? parseFloat(data.passingPercentage) : undefined,
      }
    });

    res.json({ exam: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update clinical exam" });
  }
});

// Delete clinical exam
router.delete("/exams/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.clinicalExam.delete({ where: { id } });
    res.json({ success: true, message: "Clinical exam deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete clinical exam" });
  }
});

// Add station to exam
router.post("/exams/:id/stations", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { patientCaseId, stationNumber, title, candidateInstructions, instructions, timeLimitSeconds, passingScore } = req.body;

    const station = await prisma.examStation.create({
      data: {
        clinicalExamId: id,
        patientCaseId,
        stationNumber: stationNumber ? parseInt(stationNumber) : 1,
        title,
        candidateInstructions,
        instructions,
        timeLimitSeconds: timeLimitSeconds ? parseInt(timeLimitSeconds) : 360,
        passingScore: passingScore ? parseFloat(passingScore) : 12.0,
        osceRubric: {
          create: {
            title: `${title} Rubric`,
            totalMarks: 20.0,
            passingMarks: passingScore ? parseFloat(passingScore) : 12.0,
          }
        }
      },
      include: {
        osceRubric: true,
        patientCase: true,
      }
    });

    // Update station count on exam
    const count = await prisma.examStation.count({ where: { clinicalExamId: id } });
    await prisma.clinicalExam.update({ where: { id }, data: { stationCount: count } });

    res.json({ station });
  } catch (error) {
    console.error("Create station error:", error);
    res.status(500).json({ error: "Failed to create exam station" });
  }
});

// Update station
router.put("/stations/:stationId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stationId } = req.params;
    const data = req.body;

    const updated = await prisma.examStation.update({
      where: { id: stationId },
      data: {
        title: data.title,
        candidateInstructions: data.candidateInstructions,
        instructions: data.instructions,
        timeLimitSeconds: data.timeLimitSeconds !== undefined ? parseInt(data.timeLimitSeconds) : undefined,
        passingScore: data.passingScore !== undefined ? parseFloat(data.passingScore) : undefined,
        stationNumber: data.stationNumber !== undefined ? parseInt(data.stationNumber) : undefined,
      }
    });

    res.json({ station: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update exam station" });
  }
});

// Delete station
router.delete("/stations/:stationId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stationId } = req.params;
    const station = await prisma.examStation.delete({ where: { id: stationId } });
    const count = await prisma.examStation.count({ where: { clinicalExamId: station.clinicalExamId } });
    await prisma.clinicalExam.update({ where: { id: station.clinicalExamId }, data: { stationCount: count } });
    res.json({ success: true, message: "Station deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete station" });
  }
});

// Create OSCE rubric item
router.post("/rubrics/:rubricId/items", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rubricId } = req.params;
    const { category, criterion, description, intent, marks, required, isCritical, severity } = req.body;

    const item = await prisma.oSCERubricItem.create({
      data: {
        rubricId,
        category: category || "History Taking",
        criterion,
        description,
        intent,
        marks: marks !== undefined ? parseFloat(marks) : 1.0,
        required: required !== undefined ? Boolean(required) : true,
        isCritical: Boolean(isCritical),
        severity: severity || (isCritical ? "critical" : "important"),
      }
    });

    res.json({ item });
  } catch (error) {
    res.status(500).json({ error: "Failed to create OSCE rubric item" });
  }
});

// Update OSCE rubric item
router.put("/osce-items/:itemId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const data = req.body;

    const updated = await prisma.oSCERubricItem.update({
      where: { id: itemId },
      data: {
        category: data.category,
        criterion: data.criterion,
        description: data.description,
        intent: data.intent,
        marks: data.marks !== undefined ? parseFloat(data.marks) : undefined,
        required: data.required !== undefined ? Boolean(data.required) : undefined,
        isCritical: data.isCritical !== undefined ? Boolean(data.isCritical) : undefined,
        severity: data.severity,
      }
    });

    res.json({ item: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update OSCE rubric item" });
  }
});

// Delete OSCE rubric item
router.delete("/osce-items/:itemId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    await prisma.oSCERubricItem.delete({ where: { id: itemId } });
    res.json({ success: true, message: "OSCE rubric item deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete OSCE rubric item" });
  }
});

export default router;
