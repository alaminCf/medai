import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate, AuthRequest } from "../middleware/auth";
import { ExamPatientContext } from "../services/examPatientContext";
import { AIPatientEngine } from "../services/aiPatientEngine";
import { OSCEEvaluationEngine } from "../services/osceEvaluationEngine";

const router = Router();
const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────────────────────────
// 1. GET /api/exams - List available clinical exams
// ────────────────────────────────────────────────────────────────────────────
router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const exams = await prisma.clinicalExam.findMany({
      where: { status: "published" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        durationMinutes: true,
        stationCount: true,
        difficulty: true,
        voiceRequired: true,
        fullscreenRequired: true,
        allowRetake: true,
        passingPercentage: true,
        stations: {
          orderBy: { stationNumber: "asc" },
          select: {
            id: true,
            stationNumber: true,
            title: true,
            candidateInstructions: true,
            timeLimitSeconds: true,
            passingScore: true,
          }
        }
      }
    });

    res.json({ exams });
  } catch (err: any) {
    console.error("Error fetching exams:", err);
    res.status(500).json({ error: "Failed to fetch clinical exams" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 2. GET /api/exams/my-exams - Student exam history
// ────────────────────────────────────────────────────────────────────────────
router.get("/my-exams", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const attempts = await prisma.examAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      include: {
        clinicalExam: {
          select: {
            id: true,
            title: true,
            slug: true,
            stationCount: true,
            durationMinutes: true,
            difficulty: true,
          }
        },
        stationAttempts: {
          select: {
            id: true,
            status: true,
            score: true,
            maximumScore: true,
            outcome: true,
          }
        }
      }
    });

    res.json({ attempts });
  } catch (err: any) {
    console.error("Error fetching my exams:", err);
    res.status(500).json({ error: "Failed to fetch exam attempts" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 3. GET /api/exams/:id - Exam overview & candidate instructions
// ────────────────────────────────────────────────────────────────────────────
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await prisma.clinicalExam.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        stations: {
          orderBy: { stationNumber: "asc" },
          select: {
            id: true,
            stationNumber: true,
            title: true,
            candidateInstructions: true,
            timeLimitSeconds: true,
            passingScore: true,
            patientCase: {
              select: {
                id: true,
                patientName: true, patientAge: true, patientGender: true,
                avatarId: true,
                voiceGender: true,
              }
            }
          }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({ error: "Clinical exam not found" });
    }

    res.json({ exam });
  } catch (err: any) {
    console.error("Error fetching exam:", err);
    res.status(500).json({ error: "Failed to fetch exam" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 4. POST /api/exams/:id/start - Start an exam attempt
// ────────────────────────────────────────────────────────────────────────────
router.post("/:id/start", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { language = "en" } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const exam = await prisma.clinicalExam.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        stations: {
          orderBy: { stationNumber: "asc" }
        }
      }
    });

    if (!exam) {
      return res.status(404).json({ error: "Clinical exam not found" });
    }

    // Check retake configuration
    const previousAttempts = await prisma.examAttempt.count({
      where: { userId, clinicalExamId: exam.id }
    });

    if (!exam.allowRetake && previousAttempts > 0) {
      return res.status(403).json({ error: "Retakes are not permitted for this examination." });
    }

    if (exam.maxAttempts && previousAttempts >= exam.maxAttempts) {
      return res.status(403).json({ error: `Maximum allowed attempts (${exam.maxAttempts}) reached.` });
    }

    // Create ExamAttempt
    const attempt = await prisma.examAttempt.create({
      data: {
        userId,
        clinicalExamId: exam.id,
        attemptNumber: previousAttempts + 1,
        language: language === "bn" ? "bn" : "en",
        status: "in_progress",
        stationAttempts: {
          create: exam.stations.map((st) => ({
            stationId: st.id,
            status: "ready",
          }))
        }
      },
      include: {
        stationAttempts: {
          include: {
            station: {
              select: {
                id: true,
                stationNumber: true,
                title: true,
                candidateInstructions: true,
                timeLimitSeconds: true,
                passingScore: true,
                patientCase: {
                  select: {
                    id: true,
                    patientName: true, patientAge: true, patientGender: true,
                    avatarId: true,
                    voiceGender: true,
                  }
                }
              }
            }
          },
          orderBy: {
            station: {
              stationNumber: "asc"
            }
          }
        }
      }
    });

    res.json({
      attemptId: attempt.id,
      status: attempt.status,
      language: attempt.language,
      stations: attempt.stationAttempts.map((sa) => ({
        stationAttemptId: sa.id,
        stationId: sa.stationId,
        stationNumber: sa.station.stationNumber,
        title: sa.station.title,
        candidateInstructions: sa.station.candidateInstructions,
        timeLimitSeconds: sa.station.timeLimitSeconds,
        patient: sa.station.patientCase,
        status: sa.status,
      }))
    });
  } catch (err: any) {
    console.error("Error starting exam attempt:", err);
    res.status(500).json({ error: "Failed to start exam attempt" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 5. GET /api/exams/attempts/:attemptId - Get attempt status & station progress
// ────────────────────────────────────────────────────────────────────────────
router.get("/attempts/:attemptId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        clinicalExam: true,
        stationAttempts: {
          include: {
            station: {
              select: {
                id: true,
                stationNumber: true,
                title: true,
                candidateInstructions: true,
                timeLimitSeconds: true,
                passingScore: true,
                patientCase: {
                  select: {
                    id: true,
                    patientName: true, patientAge: true, patientGender: true,
                    avatarId: true,
                    voiceGender: true,
                  }
                }
              }
            }
          },
          orderBy: {
            station: {
              stationNumber: "asc"
            }
          }
        }
      }
    });

    if (!attempt || attempt.userId !== userId) {
      return res.status(404).json({ error: "Exam attempt not found" });
    }

    const now = new Date();

    const stationsProgress = attempt.stationAttempts.map((sa) => {
      let isTimeUp = false;
      let remainingSeconds = sa.station.timeLimitSeconds;

      if (sa.status === "active" && sa.deadline) {
        const diffMs = sa.deadline.getTime() - now.getTime();
        remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
        if (remainingSeconds <= 0) {
          isTimeUp = true;
        }
      }

      return {
        stationAttemptId: sa.id,
        stationId: sa.stationId,
        stationNumber: sa.station.stationNumber,
        title: sa.station.title,
        candidateInstructions: sa.station.candidateInstructions,
        timeLimitSeconds: sa.station.timeLimitSeconds,
        patient: sa.station.patientCase,
        status: isTimeUp ? "time_up" : sa.status,
        startedAt: sa.startedAt,
        deadline: sa.deadline,
        remainingSeconds,
        isTimeUp,
      };
    });

    res.json({
      attemptId: attempt.id,
      examId: attempt.clinicalExamId,
      examTitle: attempt.clinicalExam.title,
      status: attempt.status,
      language: attempt.language,
      voiceRequired: attempt.clinicalExam.voiceRequired,
      showLiveTranscript: attempt.clinicalExam.showLiveTranscript,
      fullscreenRequired: attempt.clinicalExam.fullscreenRequired,
      stations: stationsProgress,
    });
  } catch (err: any) {
    console.error("Error fetching attempt state:", err);
    res.status(500).json({ error: "Failed to fetch attempt state" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 6. POST /api/exams/attempts/:attemptId/stations/:stationId/start - Start Station & Server Timer
// ────────────────────────────────────────────────────────────────────────────
router.post("/attempts/:attemptId/stations/:stationId/start", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId, stationId } = req.params;
    const userId = req.user?.id;

    const stationAttempt = await prisma.stationAttempt.findFirst({
      where: {
        examAttemptId: attemptId,
        OR: [{ stationId }, { id: stationId }],
        examAttempt: { userId }
      },
      include: {
        station: true,
        examAttempt: true,
      }
    });

    if (!stationAttempt) {
      return res.status(404).json({ error: "Station attempt not found" });
    }

    if (stationAttempt.status === "completed" || stationAttempt.status === "evaluated") {
      return res.status(400).json({ error: "Station has already been completed." });
    }

    // Set server authoritative start time & deadline
    const startedAt = new Date();
    const deadline = new Date(startedAt.getTime() + stationAttempt.station.timeLimitSeconds * 1000);

    const updated = await prisma.stationAttempt.update({
      where: { id: stationAttempt.id },
      data: {
        status: "active",
        startedAt,
        deadline,
      }
    });

    res.json({
      stationAttemptId: updated.id,
      status: updated.status,
      startedAt: updated.startedAt,
      deadline: updated.deadline,
      timeLimitSeconds: stationAttempt.station.timeLimitSeconds,
      remainingSeconds: stationAttempt.station.timeLimitSeconds,
    });
  } catch (err: any) {
    console.error("Error starting station:", err);
    res.status(500).json({ error: "Failed to start station" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 7. POST /api/exams/attempts/:attemptId/stations/:stationId/message - Send consultation message
// ────────────────────────────────────────────────────────────────────────────
router.post("/attempts/:attemptId/stations/:stationId/message", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId, stationId } = req.params;
    const { message, messageType = "voice" } = req.body;
    const userId = req.user?.id;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message text is required" });
    }

    const stationAttempt = await prisma.stationAttempt.findFirst({
      where: {
        examAttemptId: attemptId,
        OR: [{ stationId }, { id: stationId }],
        examAttempt: { userId }
      },
      include: {
        station: {
          include: {
            patientCase: true,
          }
        },
        examAttempt: true,
        messages: {
          orderBy: { timestamp: "asc" }
        }
      }
    });

    if (!stationAttempt) {
      return res.status(404).json({ error: "Station attempt not found" });
    }

    if (stationAttempt.status !== "active") {
      return res.status(400).json({ error: `Station is not active (current status: ${stationAttempt.status})` });
    }

    // SERVER-AUTHORITATIVE TIMER CHECK
    const now = new Date();
    if (stationAttempt.deadline && now.getTime() > stationAttempt.deadline.getTime()) {
      await prisma.stationAttempt.update({
        where: { id: stationAttempt.id },
        data: { status: "time_up" }
      });
      return res.status(403).json({
        error: "Time is up for this examination station.",
        isTimeUp: true,
        remainingSeconds: 0,
      });
    }

    const remainingSeconds = stationAttempt.deadline
      ? Math.max(0, Math.floor((stationAttempt.deadline.getTime() - now.getTime()) / 1000))
      : stationAttempt.station.timeLimitSeconds;

    // 1. Save student message
    const studentMsg = await prisma.stationMessage.create({
      data: {
        stationAttemptId: stationAttempt.id,
        sender: "student",
        message: message.trim(),
        messageType,
      }
    });

    // 2. Prepare Layperson Exam Patient Context (NO hidden diagnosis, NO rubrics)
    const language = stationAttempt.examAttempt.language || "en";
    const visibleFacts = ExamPatientContext.extractVisibleFacts(stationAttempt.station.patientCase, language);
    const examSystemPrompt = ExamPatientContext.buildExamSystemPrompt(visibleFacts);

    // Build history for context
    const conversationHistory = stationAttempt.messages.map((m) => ({
      role: m.sender as "student" | "patient",
      content: m.message,
    }));
    conversationHistory.push({ role: "student", content: message.trim() });

    // 3. Generate Patient Response
    const aiEngine = new AIPatientEngine();
    const patientCaseContext = {
      patientName: visibleFacts.name,
      patientAge: visibleFacts.age,
      patientGender: visibleFacts.gender,
      chiefComplaint: visibleFacts.chiefComplaint,
      personality: visibleFacts.personality,
      language: visibleFacts.language,
      symptomsDetails: visibleFacts.symptoms,
      medicalHistory: visibleFacts.medicalHistory || undefined,
      medicationHistory: visibleFacts.medicationHistory || undefined,
      allergyHistory: visibleFacts.allergyHistory || undefined,
      familyHistory: visibleFacts.familyHistory || undefined,
      socialHistory: visibleFacts.socialHistory || undefined,
    };

    const aiResult = await aiEngine.generatePatientResponse(
      patientCaseContext,
      conversationHistory,
      message.trim()
    );

    // 4. Save Patient Message
    const patientMsg = await prisma.stationMessage.create({
      data: {
        stationAttemptId: stationAttempt.id,
        sender: "patient",
        message: aiResult.message,
        messageType: "voice",
        emotion: aiResult.emotion,
        emotionIntensity: aiResult.intensity,
      }
    });

    res.json({
      studentMessage: {
        id: studentMsg.id,
        message: studentMsg.message,
        sender: "student",
        timestamp: studentMsg.timestamp,
      },
      patientMessage: {
        id: patientMsg.id,
        message: patientMsg.message,
        sender: "patient",
        emotion: patientMsg.emotion,
        emotionIntensity: patientMsg.emotionIntensity,
        timestamp: patientMsg.timestamp,
      },
      remainingSeconds,
      isTimeUp: false,
    });
  } catch (err: any) {
    console.error("Error handling station consultation message:", err);
    res.status(500).json({ error: "Failed to process consultation message" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 8. POST /api/exams/attempts/:attemptId/stations/:stationId/end - End Station & Auto-evaluate
// ────────────────────────────────────────────────────────────────────────────
router.post("/attempts/:attemptId/stations/:stationId/end", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId, stationId } = req.params;
    const userId = req.user?.id;

    const stationAttempt = await prisma.stationAttempt.findFirst({
      where: {
        examAttemptId: attemptId,
        OR: [{ stationId }, { id: stationId }],
        examAttempt: { userId }
      },
      include: {
        station: {
          include: {
            osceRubric: {
              include: {
                items: true
              }
            }
          }
        },
        messages: {
          orderBy: { timestamp: "asc" }
        },
        examAttempt: {
          include: {
            stationAttempts: {
              include: {
                station: true
              },
              orderBy: {
                station: {
                  stationNumber: "asc"
                }
              }
            }
          }
        }
      }
    });

    if (!stationAttempt) {
      return res.status(404).json({ error: "Station attempt not found" });
    }

    const completedAt = new Date();

    // Run OSCE Evaluation silently in the background
    const rubricItems = stationAttempt.station.osceRubric?.items || [];
    const evaluation = OSCEEvaluationEngine.evaluateStation({
      stationTitle: stationAttempt.station.title,
      passingScore: stationAttempt.station.passingScore,
      rubricItems,
      messages: stationAttempt.messages,
    });

    // Save or update evaluation
    const existingEval = await prisma.oSCEEvaluation.findUnique({
      where: { stationAttemptId: stationAttempt.id }
    });

    if (existingEval) {
      await prisma.oSCEEvaluation.delete({ where: { id: existingEval.id } });
    }

    await prisma.oSCEEvaluation.create({
      data: {
        stationAttemptId: stationAttempt.id,
        summary: evaluation.summary,
        strengths: JSON.stringify(evaluation.strengths),
        improvements: JSON.stringify(evaluation.improvements),
        score: evaluation.score,
        totalMarks: evaluation.totalMarks,
        percentage: evaluation.percentage,
        hasCriticalFailure: evaluation.hasCriticalFailure,
        items: {
          create: evaluation.items.map((it) => ({
            rubricItemId: it.rubricItemId,
            status: it.status,
            marksAwarded: it.marksAwarded,
            maximumMarks: it.maximumMarks,
            evidence: it.evidence,
            feedback: it.feedback,
          }))
        }
      }
    });

    // Update StationAttempt
    await prisma.stationAttempt.update({
      where: { id: stationAttempt.id },
      data: {
        status: "completed",
        completedAt,
        score: evaluation.score,
        maximumScore: evaluation.totalMarks,
        percentage: evaluation.percentage,
        outcome: evaluation.outcome,
      }
    });

    // Find next station in order
    const currentNumber = stationAttempt.station.stationNumber;
    const allStationAttempts = stationAttempt.examAttempt.stationAttempts;
    const nextSA = allStationAttempts.find((sa) => sa.station.stationNumber === currentNumber + 1);

    res.json({
      stationAttemptId: stationAttempt.id,
      status: "completed",
      isLastStation: !nextSA,
      nextStation: nextSA
        ? {
            stationAttemptId: nextSA.id,
            stationId: nextSA.stationId,
            stationNumber: nextSA.station.stationNumber,
            title: nextSA.station.title,
            timeLimitSeconds: nextSA.station.timeLimitSeconds,
          }
        : null,
    });
  } catch (err: any) {
    console.error("Error ending station:", err);
    res.status(500).json({ error: "Failed to complete station" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 9. POST /api/exams/attempts/:attemptId/complete - Complete Exam & Aggregate Results
// ────────────────────────────────────────────────────────────────────────────
router.post("/attempts/:attemptId/complete", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        clinicalExam: true,
        stationAttempts: {
          include: {
            station: true,
            evaluation: true,
          }
        }
      }
    });

    if (!attempt || attempt.userId !== userId) {
      return res.status(404).json({ error: "Exam attempt not found" });
    }

    let totalScore = 0;
    let totalMarks = 0;
    let hasAnyCriticalFailure = false;

    for (const sa of attempt.stationAttempts) {
      totalScore += sa.score || 0;
      totalMarks += sa.maximumScore || 20;
      if (sa.evaluation?.hasCriticalFailure || sa.outcome === "review_required") {
        hasAnyCriticalFailure = true;
      }
    }

    const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 1000) / 10 : 0;

    let outcome: "passed" | "not_passed" | "review_required" = "passed";
    if (hasAnyCriticalFailure) {
      outcome = "review_required";
    } else if (percentage < attempt.clinicalExam.passingPercentage) {
      outcome = "not_passed";
    }

    const completed = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        totalScore: Math.round(totalScore * 10) / 10,
        totalMarks: Math.round(totalMarks * 10) / 10,
        percentage,
        outcome,
      }
    });

    res.json({
      attemptId: completed.id,
      status: completed.status,
      totalScore: completed.totalScore,
      totalMarks: completed.totalMarks,
      percentage: completed.percentage,
      outcome: completed.outcome,
    });
  } catch (err: any) {
    console.error("Error completing exam attempt:", err);
    res.status(500).json({ error: "Failed to complete exam" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 10. GET /api/exams/attempts/:attemptId/result - Full OSCE Result & Evidence Feedback
// ────────────────────────────────────────────────────────────────────────────
router.get("/attempts/:attemptId/result", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user?.id;

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        clinicalExam: true,
        stationAttempts: {
          include: {
            station: {
              include: {
                patientCase: {
                  select: {
                    id: true,
                    patientName: true, patientAge: true, patientGender: true,
                    avatarId: true,
                  }
                }
              }
            },
            messages: {
              orderBy: { timestamp: "asc" },
              select: {
                id: true,
                sender: true,
                message: true,
                timestamp: true,
              }
            },
            evaluation: {
              include: {
                items: {
                  include: {
                    rubricItem: true,
                  }
                }
              }
            }
          },
          orderBy: {
            station: {
              stationNumber: "asc"
            }
          }
        },
        integrityEvents: {
          orderBy: { timestamp: "asc" }
        }
      }
    });

    if (!attempt || attempt.userId !== userId) {
      return res.status(404).json({ error: "Exam attempt not found" });
    }

    if (attempt.status !== "completed") {
      return res.status(403).json({
        error: "Exam results are locked until the entire clinical examination is completed.",
        status: attempt.status,
      });
    }

    // Build overall domain performance aggregations across stations
    const domainTotals: Record<string, { marksAwarded: number; maximumMarks: number }> = {};

    const stationsReport = attempt.stationAttempts.map((sa) => {
      const evalData = sa.evaluation;
      const strengths = evalData?.strengths ? JSON.parse(evalData.strengths) : [];
      const improvements = evalData?.improvements ? JSON.parse(evalData.improvements) : [];

      const itemsReport = evalData?.items.map((it) => {
        const cat = it.rubricItem.category;
        if (!domainTotals[cat]) {
          domainTotals[cat] = { marksAwarded: 0, maximumMarks: 0 };
        }
        domainTotals[cat].marksAwarded += it.marksAwarded;
        domainTotals[cat].maximumMarks += it.maximumMarks;

        return {
          id: it.id,
          rubricItemId: it.rubricItemId,
          category: it.rubricItem.category,
          criterion: it.rubricItem.criterion,
          status: it.status,
          marksAwarded: it.marksAwarded,
          maximumMarks: it.maximumMarks,
          evidence: it.evidence,
          feedback: it.feedback,
          isCritical: it.rubricItem.isCritical,
          severity: it.rubricItem.severity,
        };
      }) || [];

      return {
        stationAttemptId: sa.id,
        stationId: sa.stationId,
        stationNumber: sa.station.stationNumber,
        title: sa.station.title,
        candidateInstructions: sa.station.candidateInstructions,
        patient: sa.station.patientCase,
        status: sa.status,
        score: sa.score,
        maximumScore: sa.maximumScore,
        percentage: sa.percentage,
        outcome: sa.outcome,
        summary: evalData?.summary,
        strengths,
        improvements,
        hasCriticalFailure: evalData?.hasCriticalFailure || false,
        items: attempt.clinicalExam.showDetailedFeedback ? itemsReport : [],
        transcript: attempt.clinicalExam.showDetailedFeedback ? sa.messages : [],
      };
    });

    const domainBreakdown: Record<string, { marksAwarded: number; maximumMarks: number; percentage: number }> = {};
    for (const [dom, stat] of Object.entries(domainTotals)) {
      domainBreakdown[dom] = {
        marksAwarded: Math.round(stat.marksAwarded * 10) / 10,
        maximumMarks: Math.round(stat.maximumMarks * 10) / 10,
        percentage: stat.maximumMarks > 0 ? Math.round((stat.marksAwarded / stat.maximumMarks) * 100) : 0,
      };
    }

    res.json({
      attemptId: attempt.id,
      examId: attempt.clinicalExamId,
      examTitle: attempt.clinicalExam.title,
      examDescription: attempt.clinicalExam.description,
      language: attempt.language,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      totalScore: attempt.totalScore,
      totalMarks: attempt.totalMarks,
      percentage: attempt.percentage,
      outcome: attempt.outcome,
      passingPercentage: attempt.clinicalExam.passingPercentage,
      allowRetake: attempt.clinicalExam.allowRetake,
      showDetailedFeedback: attempt.clinicalExam.showDetailedFeedback,
      domainBreakdown,
      stations: stationsReport,
      integritySignalsCount: attempt.integrityEvents.length,
    });
  } catch (err: any) {
    console.error("Error fetching exam result:", err);
    res.status(500).json({ error: "Failed to fetch exam result" });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 11. POST /api/exams/attempts/:attemptId/integrity - Log Exam Integrity Signal
// ────────────────────────────────────────────────────────────────────────────
router.post("/attempts/:attemptId/integrity", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { stationAttemptId, eventType, metadata } = req.body;
    const userId = req.user?.id;

    const attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, userId }
    });

    if (!attempt) {
      return res.status(404).json({ error: "Exam attempt not found" });
    }

    const event = await prisma.examIntegrityEvent.create({
      data: {
        examAttemptId: attempt.id,
        stationAttemptId: stationAttemptId || null,
        eventType: eventType || "unspecified",
        metadata: metadata ? (typeof metadata === "string" ? metadata : JSON.stringify(metadata)) : null,
      }
    });

    res.json({ success: true, eventId: event.id });
  } catch (err: any) {
    console.error("Error logging exam integrity event:", err);
    res.status(500).json({ error: "Failed to log integrity event" });
  }
});

export default router;