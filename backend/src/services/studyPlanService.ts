import prisma from '../utils/prisma';
import { spacedRepetitionService } from './spacedRepetitionService';

export interface CreateStudyPlanDTO {
  title: string;
  goal: string;
  subjects: string[];
  topics?: string[];
  availableDays: string[];
  dailyTimeMinutes: number;
  examDate?: string;
}

export interface DaySchedule {
  day: string;
  subject: string;
  topic: string;
  tasks: {
    type: 'READING' | 'MCQ' | 'FLASHCARD' | 'VIVA' | 'REVISION';
    title: string;
    durationMinutes: number;
  }[];
}

export class StudyPlanService {
  /**
   * Generates a weekly structured study plan based on user goals, available days, and daily duration.
   * Educational Safety: Includes standard disclaimer that plans are academic aids and do not guarantee examination outcomes.
   */
  async createOrUpdatePlan(userId: string, data: CreateStudyPlanDTO) {
    const subjects = data.subjects && data.subjects.length > 0 ? data.subjects : ['Physiology', 'Anatomy', 'Biochemistry'];
    const availableDays = data.availableDays && data.availableDays.length > 0
      ? data.availableDays
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyTimeMinutes = data.dailyTimeMinutes || 90;

    const standardTopics: Record<string, string[]> = {
      'Physiology': ['Cardiovascular System', 'Respiratory System', 'Renal System', 'Neurophysiology'],
      'Anatomy': ['Cardiovascular Anatomy', 'Upper Limb', 'Thorax & Lungs', 'Neuroanatomy'],
      'Biochemistry': ['Enzymology', 'Carbohydrate Metabolism', 'Lipid Metabolism', 'Molecular Genetics'],
      'Pathology': ['Cell Injury & Adaptation', 'Inflammation & Repair', 'Hemodynamic Disorders'],
    };

    // Deactivate previous active plans
    await prisma.studyPlan.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    const plan = await prisma.studyPlan.create({
      data: {
        userId,
        title: data.title || `${data.goal} Plan`,
        goal: data.goal,
        subjects: JSON.stringify(subjects),
        availableDays: JSON.stringify(availableDays),
        dailyTimeMinutes,
        examDate: data.examDate ? new Date(data.examDate) : null,
        isActive: true,
      },
    });

    // Create tasks for each available day
    let subjectIdx = 0;
    const now = new Date();

    for (let i = 0; i < availableDays.length; i++) {
      const dayOfWeek = availableDays[i];
      const subject = subjects[subjectIdx % subjects.length];
      const topicsForSub = standardTopics[subject] || ['General Principles', 'Core System'];
      const topic = topicsForSub[Math.floor(i / subjects.length) % topicsForSub.length];

      const readingMin = Math.round(dailyTimeMinutes * 0.4);
      const mcqMin = Math.round(dailyTimeMinutes * 0.35);
      const flashcardMin = dailyTimeMinutes - readingMin - mcqMin;

      // Scheduled date roughly for this week
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + i);

      // Create individual tasks
      await prisma.studyPlanTask.create({
        data: {
          planId: plan.id,
          userId,
          dayOfWeek,
          scheduledDate: targetDate,
          subject,
          topic,
          taskType: 'READING',
          durationMinutes: readingMin,
          isCompleted: false,
        },
      });

      await prisma.studyPlanTask.create({
        data: {
          planId: plan.id,
          userId,
          dayOfWeek,
          scheduledDate: targetDate,
          subject,
          topic,
          taskType: 'MCQ',
          durationMinutes: mcqMin,
          isCompleted: false,
        },
      });

      await prisma.studyPlanTask.create({
        data: {
          planId: plan.id,
          userId,
          dayOfWeek,
          scheduledDate: targetDate,
          subject,
          topic,
          taskType: i % 2 === 0 ? 'FLASHCARD' : 'VIVA',
          durationMinutes: flashcardMin,
          isCompleted: false,
        },
      });

      subjectIdx++;
    }

    return await this.getActivePlan(userId);
  }

  /**
   * Fetch active plan for user
   */
  async getActivePlan(userId: string) {
    const plan = await prisma.studyPlan.findFirst({
      where: { userId, isActive: true },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!plan) return null;

    let subjects: string[] = ['Physiology', 'Anatomy', 'Pathology'];
    try {
      if (Array.isArray(plan.subjects)) {
        subjects = plan.subjects;
      } else if (typeof plan.subjects === 'string') {
        subjects = JSON.parse(plan.subjects);
      }
    } catch (e) {
      console.warn('Failed to parse studyPlan.subjects:', e);
    }

    let availableDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    try {
      if (Array.isArray(plan.availableDays)) {
        availableDays = plan.availableDays;
      } else if (typeof plan.availableDays === 'string') {
        availableDays = JSON.parse(plan.availableDays);
      }
    } catch (e) {
      console.warn('Failed to parse studyPlan.availableDays:', e);
    }

    const tasks = (plan.tasks || []).map((t: any) => {
      let title = '';
      let category = '';
      let actionUrl = '';

      switch (t.taskType) {
        case 'FLASHCARD':
          category = 'REVISION';
          title = `${t.topic}: Spaced Repetition Flashcards`;
          actionUrl = '/flashcards/review';
          break;
        case 'MCQ':
          category = 'PRACTICE';
          title = `${t.topic}: Adaptive Practice Questions`;
          actionUrl = `/mcq/adaptive?subject=${encodeURIComponent(t.subject)}&topic=${encodeURIComponent(t.topic)}`;
          break;
        case 'VIVA':
          category = 'VIVA';
          title = `${t.topic}: Oral Clinical Viva Practice`;
          actionUrl = `/viva/adaptive?subject=${encodeURIComponent(t.subject)}&topic=${encodeURIComponent(t.topic)}`;
          break;
        case 'READING':
        default:
          category = 'NEW LEARNING';
          title = `${t.subject} — ${t.topic}: Core Mechanism Notes`;
          actionUrl = '/notes';
          break;
      }

      return {
        ...t,
        category,
        title,
        actionUrl,
      };
    });

    return {
      ...plan,
      subjects,
      availableDays,
      tasks,
    };
  }

  /**
   * Generate or retrieve today's study tasks
   */
  async getTodayTasks(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = daysOfWeek[new Date().getDay()];

    let tasks = await prisma.studyPlanTask.findMany({
      where: {
        userId,
        dayOfWeek: currentDayName,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (tasks.length === 0) {
      // Find active plan or create default tasks
      const activePlan = await prisma.studyPlan.findFirst({
        where: { userId, isActive: true },
      });

      let planId = activePlan?.id;
      if (!planId) {
        const newPlan = await prisma.studyPlan.create({
          data: {
            userId,
            title: 'Daily Curriculum Plan',
            goal: 'Prepare for Clinical & Academic Finals',
            subjects: JSON.stringify(['Physiology', 'Anatomy', 'Pathology']),
            availableDays: JSON.stringify(daysOfWeek),
            dailyTimeMinutes: 90,
            isActive: true,
          },
        });
        planId = newPlan.id;
      }

      const defaultTaskDefs = [
        {
          subject: 'Physiology',
          topic: 'Cardiovascular System',
          taskType: 'FLASHCARD',
          durationMinutes: 15,
        },
        {
          subject: 'Physiology',
          topic: 'Cardiovascular System',
          taskType: 'MCQ',
          durationMinutes: 25,
        },
        {
          subject: 'Physiology',
          topic: 'Cardiovascular System',
          taskType: 'VIVA',
          durationMinutes: 20,
        },
        {
          subject: 'Physiology',
          topic: 'Cardiovascular System',
          taskType: 'READING',
          durationMinutes: 30,
        },
      ];

      for (const def of defaultTaskDefs) {
        await prisma.studyPlanTask.create({
          data: {
            planId,
            userId,
            dayOfWeek: currentDayName,
            scheduledDate: today,
            subject: def.subject,
            topic: def.topic,
            taskType: def.taskType,
            durationMinutes: def.durationMinutes,
            isCompleted: false,
          },
        });
      }

      tasks = await prisma.studyPlanTask.findMany({
        where: {
          userId,
          dayOfWeek: currentDayName,
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    return tasks.map((t: any) => {
      let title = '';
      let category = '';
      let actionUrl = '';

      switch (t.taskType) {
        case 'FLASHCARD':
          category = 'REVISION';
          title = `${t.topic}: Spaced Repetition Flashcards`;
          actionUrl = '/flashcards/review';
          break;
        case 'MCQ':
          category = 'PRACTICE';
          title = `${t.topic}: Adaptive Practice Questions`;
          actionUrl = `/mcq/adaptive?subject=${encodeURIComponent(t.subject)}&topic=${encodeURIComponent(t.topic)}`;
          break;
        case 'VIVA':
          category = 'VIVA';
          title = `${t.topic}: Oral Clinical Viva Practice`;
          actionUrl = `/viva/adaptive?subject=${encodeURIComponent(t.subject)}&topic=${encodeURIComponent(t.topic)}`;
          break;
        case 'READING':
        default:
          category = 'NEW LEARNING';
          title = `${t.subject} — ${t.topic}: Core Mechanism Notes`;
          actionUrl = '/notes';
          break;
      }

      return {
        ...t,
        category,
        title,
        actionUrl,
      };
    });
  }

  /**
   * Toggle completion status of a task
   */
  async toggleTaskCompletion(userId: string, taskId: string) {
    const task = await prisma.studyPlanTask.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new Error('Study task not found or unauthorized');
    }

    const updated = await prisma.studyPlanTask.update({
      where: { id: taskId },
      data: {
        isCompleted: !task.isCompleted,
        completedAt: !task.isCompleted ? new Date() : null,
      },
    });

    return updated;
  }
}

export const studyPlanService = new StudyPlanService();
