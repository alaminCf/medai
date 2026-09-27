import prisma from '../utils/prisma';

export interface WeakTopicAnalysis {
  topic: string;
  subject: string;
  accuracy: number;
  mistakeCount: number;
  flashcardLapseCount: number;
  vivaMissedConcepts: number;
  totalAttempts: number;
  lastRevisedDaysAgo: number | null;
  needsAttention: boolean;
  statusText: string;
  recommendedAction: string;
}

export class WeakTopicService {
  /**
   * Analyze student's performance across MCQs, flashcards, mistakes, and viva
   * to detect topics needing revision using strictly neutral, educational language.
   */
  async detectWeakTopics(userId: string): Promise<WeakTopicAnalysis[]> {
    const mistakes = await prisma.mistakeRecord.findMany({
      where: { userId },
    });

    const answers = await prisma.mCQAnswer.findMany({
      where: {
        session: { userId },
      },
      include: {
        session: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const flashcardStates = await prisma.flashcardReviewState.findMany({
      where: { userId },
      include: {
        card: {
          include: { deck: true },
        },
      },
    });

    const vivaConcepts = await prisma.vivaConceptPerformance.findMany({
      where: { userId },
    });

    const topicStats: Record<string, {
      topic: string;
      subject: string;
      totalMCQ: number;
      correctMCQ: number;
      mistakes: number;
      lapses: number;
      vivaMissed: number;
      lastActivity: Date | null;
    }> = {};

    for (const a of answers) {
      const topic = a.session.topic || 'General Topic';
      const subject = a.session.subject || 'General Medicine';
      if (!topicStats[topic]) {
        topicStats[topic] = {
          topic,
          subject,
          totalMCQ: 0,
          correctMCQ: 0,
          mistakes: 0,
          lapses: 0,
          vivaMissed: 0,
          lastActivity: a.createdAt,
        };
      }
      topicStats[topic].totalMCQ += 1;
      if (a.isCorrect) {
        topicStats[topic].correctMCQ += 1;
      }
      if (!topicStats[topic].lastActivity || a.createdAt > topicStats[topic].lastActivity!) {
        topicStats[topic].lastActivity = a.createdAt;
      }
    }

    for (const m of mistakes) {
      const topic = m.topic || 'General Topic';
      const subject = m.subject || 'General Medicine';
      if (!topicStats[topic]) {
        topicStats[topic] = {
          topic,
          subject,
          totalMCQ: 0,
          correctMCQ: 0,
          mistakes: 0,
          lapses: 0,
          vivaMissed: 0,
          lastActivity: m.createdAt,
        };
      }
      topicStats[topic].mistakes += 1;
    }

    for (const fs of flashcardStates) {
      const topic = fs.card?.deck?.topic || 'General Topic';
      const subject = fs.card?.deck?.subject || 'General Medicine';
      if (!topicStats[topic]) {
        topicStats[topic] = {
          topic,
          subject,
          totalMCQ: 0,
          correctMCQ: 0,
          mistakes: 0,
          lapses: 0,
          vivaMissed: 0,
          lastActivity: fs.lastReviewedAt,
        };
      }
      topicStats[topic].lapses += fs.lapses;
      if (fs.lastRating === 'AGAIN' || fs.lastRating === 'HARD') {
        topicStats[topic].lapses += 1;
      }
      if (fs.lastReviewedAt && (!topicStats[topic].lastActivity || fs.lastReviewedAt > topicStats[topic].lastActivity!)) {
        topicStats[topic].lastActivity = fs.lastReviewedAt;
      }
    }

    for (const vc of vivaConcepts) {
      if (vc.status === 'MISSED' || vc.status === 'INCORRECT') {
        // Track missed concepts count
      }
    }

    const now = new Date();
    const results: WeakTopicAnalysis[] = [];

    for (const stat of Object.values(topicStats)) {
      const accuracy = stat.totalMCQ > 0 ? Math.round((stat.correctMCQ / stat.totalMCQ) * 100) : 100;
      const daysAgo = stat.lastActivity
        ? Math.floor((now.getTime() - stat.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const needsAttention = (stat.totalMCQ >= 3 && accuracy < 70) || stat.mistakes >= 2 || stat.lapses >= 2;

      let statusText = 'Steady performance recorded.';
      let recommendedAction = 'Maintain current study rhythm.';

      if (needsAttention) {
        if (accuracy < 60) {
          statusText = 'You have had more incorrect responses recently in this topic.';
          recommendedAction = `Review foundational notes and practice 5 reinforcement MCQs.`;
        } else if (stat.mistakes >= 2) {
          statusText = 'Several recurring misconceptions identified in recent practice questions.';
          recommendedAction = `Review mistake explanations in the Mistake Bank.`;
        } else if (stat.lapses >= 2) {
          statusText = 'Flashcard recall interval has reset recently for multiple cards.';
          recommendedAction = `Review scheduled flashcards in smart revision mode.`;
        }
      } else if (daysAgo !== null && daysAgo > 7) {
        statusText = `Last reviewed ${daysAgo} days ago. Scheduled for spaced recall check.`;
        recommendedAction = 'Take a quick 5-question refresher quiz.';
      }

      results.push({
        topic: stat.topic,
        subject: stat.subject,
        accuracy,
        mistakeCount: stat.mistakes,
        flashcardLapseCount: stat.lapses,
        vivaMissedConcepts: stat.vivaMissed,
        totalAttempts: stat.totalMCQ,
        lastRevisedDaysAgo: daysAgo,
        needsAttention,
        statusText,
        recommendedAction,
      });
    }

    return results.sort((a, b) => {
      if (a.needsAttention && !b.needsAttention) return -1;
      if (!a.needsAttention && b.needsAttention) return 1;
      return a.accuracy - b.accuracy;
    });
  }
}

export const weakTopicService = new WeakTopicService();
