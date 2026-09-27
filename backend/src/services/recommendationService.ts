import prisma from '../utils/prisma';
import { spacedRepetitionService } from './spacedRepetitionService';
import { weakTopicService } from './weakTopicService';

export interface RecommendationDTO {
  id?: string;
  type: 'FLASHCARD_DUE' | 'WEAK_CONCEPT' | 'UNREVIEWED_TOPIC' | 'PRACTICE_MCQ' | 'VIVA_PROMPT';
  title: string;
  description: string;
  subject?: string;
  topic?: string;
  actionUrl: string;
  actionLabel: string;
  priority: number;
}

export class RecommendationService {
  /**
   * Generates actionable recommendations based on actual user activity.
   * Completely avoids fear-based urgency, shaming, or manipulative notifications.
   */
  async getRecommendations(userId: string): Promise<RecommendationDTO[]> {
    const recommendations: RecommendationDTO[] = [];

    // 1. Spaced Repetition check
    const dueCards = await spacedRepetitionService.getAdaptiveDueCards(userId, 50);
    if (dueCards.length > 0) {
      recommendations.push({
        type: 'FLASHCARD_DUE',
        title: `${dueCards.length} Flashcard${dueCards.length > 1 ? 's' : ''} Scheduled for Review`,
        description: `Spaced repetition algorithm has scheduled ${dueCards.length} card${dueCards.length > 1 ? 's' : ''} to reinforce memory consolidation.`,
        actionUrl: '/flashcards/review',
        actionLabel: 'Review Flashcards',
        priority: 1,
      });
    }

    // 2. Weak concepts / Mistake bank
    const mistakes = await prisma.mistakeRecord.findMany({
      where: { userId, reviewed: false },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    if (mistakes.length > 0) {
      const topMistake = mistakes[0];
      const conceptName = topMistake.conceptName || topMistake.topic || 'Clinical Concepts';
      recommendations.push({
        type: 'WEAK_CONCEPT',
        title: `Targeted Concept Review: ${conceptName}`,
        description: `You recently missed a question on ${conceptName}. Reviewing the underlying physiological mechanisms now aids long-term retention.`,
        subject: topMistake.subject || undefined,
        topic: topMistake.topic || undefined,
        actionUrl: `/progress/mistakes`,
        actionLabel: 'Review Mistake Bank',
        priority: 2,
      });
    }

    // 3. Weak topics detected
    const weakTopics = await weakTopicService.detectWeakTopics(userId);
    const attentionTopics = weakTopics.filter((t: any) => t.needsAttention);

    if (attentionTopics.length > 0) {
      const target = attentionTopics[0];
      recommendations.push({
        type: 'PRACTICE_MCQ',
        title: `Reinforce ${target.topic}`,
        description: target.statusText,
        subject: target.subject,
        topic: target.topic,
        actionUrl: `/mcq/adaptive?subject=${encodeURIComponent(target.subject)}&topic=${encodeURIComponent(target.topic)}`,
        actionLabel: 'Start Adaptive Quiz',
        priority: 3,
      });
    }

    // 4. Inactive topics (>7 days without review)
    const staleTopic = weakTopics.find((t: any) => t.lastRevisedDaysAgo !== null && t.lastRevisedDaysAgo > 7);
    if (staleTopic) {
      recommendations.push({
        type: 'UNREVIEWED_TOPIC',
        title: `Scheduled Spaced Check: ${staleTopic.topic}`,
        description: `You have not reviewed this topic for ${staleTopic.lastRevisedDaysAgo} days. A quick refresher prevents decay.`,
        subject: staleTopic.subject,
        topic: staleTopic.topic,
        actionUrl: `/subjects/${encodeURIComponent(staleTopic.subject.toLowerCase())}/topics/${encodeURIComponent(staleTopic.topic.toLowerCase())}`,
        actionLabel: 'Open Topic Hub',
        priority: 4,
      });
    }

    // 5. Default encouraging recommendation if user is new or fully caught up
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'PRACTICE_MCQ',
        title: `Begin Today's Practice`,
        description: `Explore adaptive quizzes tailored to your study curriculum in Cardiovascular Physiology.`,
        subject: 'Physiology',
        topic: 'Cardiovascular System',
        actionUrl: `/mcq/adaptive`,
        actionLabel: 'Explore Adaptive Practice',
        priority: 5,
      });
    }

    // Persist top recommendations into LearningRecommendation table for record
    for (const rec of recommendations.slice(0, 3)) {
      await prisma.learningRecommendation.create({
        data: {
          userId,
          title: rec.title,
          description: rec.description,
          type: rec.type,
          subject: rec.subject,
          topic: rec.topic,
          actionUrl: rec.actionUrl,
          priority: rec.priority <= 2 ? 'HIGH' : 'NORMAL',
        },
      });
    }

    return recommendations;
  }
}

export const recommendationService = new RecommendationService();
