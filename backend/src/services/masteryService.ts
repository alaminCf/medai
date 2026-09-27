import prisma from '../utils/prisma';

export interface MasteryIndicator {
  subject: string;
  topic: string;
  status: 'NEW' | 'LEARNING' | 'REVIEW' | 'STRONG';
  masteryPercentage: number;
  mcqAccuracy: number | null;
  mcqAttempts: number;
  flashcardRetention: number | null;
  flashcardCardsReviewed: number;
  vivaCoverage: number | null;
  lastRevisedDaysAgo: number | null;
  explanation: string;
}

export interface KnowledgeMapNode {
  id: string;
  name: string;
  type: 'subject' | 'topic' | 'subtopic' | 'concept';
  status: 'NEW' | 'LEARNING' | 'REVIEW' | 'STRONG';
  masteryPercentage: number;
  notesCount: number;
  flashcardsCount: number;
  mcqsCount: number;
  vivaCount: number;
  children?: KnowledgeMapNode[];
}

export class MasteryService {
  /**
   * Calculate transparent mastery for a given topic.
   */
  async calculateTopicMastery(userId: string, subject: string, topic: string): Promise<MasteryIndicator> {
    const now = new Date();

    // 1. MCQ metrics for this topic
    const mcqAnswers = await prisma.mCQAnswer.findMany({
      where: {
        session: {
          userId,
          topic,
        },
      },
      include: {
        session: true,
      },
    });

    const mcqAttempts = mcqAnswers.length;
    let mcqAccuracy: number | null = null;
    if (mcqAttempts > 0) {
      const correct = mcqAnswers.filter((a: any) => a.isCorrect).length;
      mcqAccuracy = Math.round((correct / mcqAttempts) * 100);
    }

    // 2. Flashcard retention for this topic
    const flashcardStates = await prisma.flashcardReviewState.findMany({
      where: {
        userId,
        card: {
          deck: { topic },
        },
      },
    });

    const flashcardCardsReviewed = flashcardStates.length;
    let flashcardRetention: number | null = null;
    if (flashcardCardsReviewed > 0) {
      const goodOrEasy = flashcardStates.filter((s: any) => s.lastRating === 'GOOD' || s.lastRating === 'EASY').length;
      flashcardRetention = Math.round((goodOrEasy / flashcardCardsReviewed) * 100);
    }

    // 3. Viva coverage for this topic
    const vivaSessions = await prisma.vivaSession.findMany({
      where: { userId, topic },
    });
    const vivaCount = vivaSessions.length;
    let vivaCoverage: number | null = null;
    if (vivaCount > 0) {
      const scores = vivaSessions.map((v: any) => v.overallScore).filter((s: any): s is number => s !== null && s !== undefined);
      if (scores.length > 0) {
        vivaCoverage = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
      }
    }

    // 4. Last revised days ago
    let latestActivity: Date | null = null;
    for (const a of mcqAnswers) {
      if (!latestActivity || a.createdAt > latestActivity) latestActivity = a.createdAt;
    }
    for (const f of flashcardStates) {
      if (f.lastReviewedAt && (!latestActivity || f.lastReviewedAt > latestActivity)) {
        latestActivity = f.lastReviewedAt;
      }
    }
    for (const v of vivaSessions) {
      if (!latestActivity || v.startedAt > latestActivity) latestActivity = v.startedAt;
    }

    const lastRevisedDaysAgo = latestActivity
      ? Math.floor((now.getTime() - latestActivity.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let status: 'NEW' | 'LEARNING' | 'REVIEW' | 'STRONG' = 'NEW';
    let masteryPercentage = 0;
    let explanation = '';

    if (mcqAttempts === 0 && flashcardCardsReviewed === 0 && vivaCount === 0) {
      status = 'NEW';
      masteryPercentage = 0;
      explanation = 'No active study sessions recorded for this topic yet.';
    } else {
      let totalWeight = 0;
      let weightedSum = 0;

      if (mcqAccuracy !== null) {
        weightedSum += mcqAccuracy * 0.45;
        totalWeight += 0.45;
      }
      if (flashcardRetention !== null) {
        weightedSum += flashcardRetention * 0.35;
        totalWeight += 0.35;
      }
      if (vivaCoverage !== null) {
        weightedSum += vivaCoverage * 0.20;
        totalWeight += 0.20;
      }

      const rawMastery = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 20;
      masteryPercentage = Math.min(100, Math.max(10, rawMastery));

      if (lastRevisedDaysAgo !== null && lastRevisedDaysAgo > 14) {
        masteryPercentage = Math.max(15, masteryPercentage - 15);
      }

      if (masteryPercentage >= 80 && (lastRevisedDaysAgo === null || lastRevisedDaysAgo <= 14)) {
        status = 'STRONG';
        explanation = `Consistently high retention across ${mcqAttempts} MCQs (${mcqAccuracy ?? 'N/A'}%) and ${flashcardCardsReviewed} flashcards (${flashcardRetention ?? 'N/A'}%).`;
      } else if (lastRevisedDaysAgo !== null && lastRevisedDaysAgo > 7) {
        status = 'REVIEW';
        explanation = `Good baseline mastery (${masteryPercentage}%), but topic has not been reviewed for ${lastRevisedDaysAgo} days. Spaced revision recommended.`;
      } else {
        status = 'LEARNING';
        explanation = `Active learning phase: ${mcqAttempts} MCQs attempted (${mcqAccuracy ?? 0}%), ${flashcardCardsReviewed} flashcards reviewed.`;
      }
    }

    // Persist or update TopicMastery record
    await prisma.topicMastery.upsert({
      where: {
        userId_subject_topic: {
          userId,
          subject,
          topic,
        },
      },
      update: {
        status,
        masteryPercentage,
        mcqAccuracy: mcqAccuracy ? Number(mcqAccuracy) : 0,
        flashcardRetention: flashcardRetention ? Number(flashcardRetention) : 0,
        vivaCoverage: vivaCoverage ? Number(vivaCoverage) : 0,
        totalAttempts: mcqAttempts + flashcardCardsReviewed + vivaCount,
        lastStudiedAt: latestActivity,
      },
      create: {
        userId,
        subject,
        topic,
        status,
        masteryPercentage,
        mcqAccuracy: mcqAccuracy ? Number(mcqAccuracy) : 0,
        flashcardRetention: flashcardRetention ? Number(flashcardRetention) : 0,
        vivaCoverage: vivaCoverage ? Number(vivaCoverage) : 0,
        totalAttempts: mcqAttempts + flashcardCardsReviewed + vivaCount,
        lastStudiedAt: latestActivity,
      },
    });

    return {
      subject,
      topic,
      status,
      masteryPercentage,
      mcqAccuracy,
      mcqAttempts,
      flashcardRetention,
      flashcardCardsReviewed,
      vivaCoverage,
      lastRevisedDaysAgo,
      explanation,
    };
  }

  /**
   * Get all mastery indicators for user across subjects
   */
  async getAllTopicMasteries(userId: string): Promise<MasteryIndicator[]> {
    const qbTopics = await prisma.questionBank.findMany({
      select: { subject: true, topic: true },
      distinct: ['subject', 'topic'],
    });
    const deckTopics = await prisma.flashcardDeck.findMany({
      select: { subject: true, topic: true },
      distinct: ['subject', 'topic'],
    });

    const topicMap = new Map<string, { subject: string; topic: string }>();
    for (const item of [...qbTopics, ...deckTopics]) {
      if (item.topic) {
        const key = `${item.subject}:::${item.topic}`;
        if (!topicMap.has(key)) {
          topicMap.set(key, { subject: item.subject, topic: item.topic });
        }
      }
    }

    if (topicMap.size === 0) {
      topicMap.set('Physiology:::Cardiovascular System', { subject: 'Physiology', topic: 'Cardiovascular System' });
      topicMap.set('Physiology:::Respiratory System', { subject: 'Physiology', topic: 'Respiratory System' });
      topicMap.set('Physiology:::Renal System', { subject: 'Physiology', topic: 'Renal System' });
      topicMap.set('Anatomy:::Cardiovascular Anatomy', { subject: 'Anatomy', topic: 'Cardiovascular Anatomy' });
      topicMap.set('Biochemistry:::Enzymology', { subject: 'Biochemistry', topic: 'Enzymology' });
    }

    const results: MasteryIndicator[] = [];
    for (const { subject, topic } of topicMap.values()) {
      const mastery = await this.calculateTopicMastery(userId, subject, topic);
      results.push(mastery);
    }

    return results;
  }

  /**
   * Build complete Knowledge Map tree for user:
   * Subject -> Topic -> Subtopic -> Concepts
   */
  async getKnowledgeMap(userId: string): Promise<KnowledgeMapNode[]> {
    const masteries = await this.getAllTopicMasteries(userId);
    const masteryLookup = new Map(masteries.map((m: MasteryIndicator) => [`${m.subject}:::${m.topic}`, m]));

    const notes = await prisma.studyNote.findMany({
      where: { userId },
      select: { subject: true, topic: true },
    });
    const flashcards = await prisma.flashcard.findMany({
      where: { deck: { userId } },
      include: { deck: true },
    });
    const mcqs = await prisma.mCQQuestion.findMany({
      include: { questionBank: true },
    });

    const subjectsMap = new Map<string, Map<string, typeof mcqs>>();

    for (const q of mcqs) {
      const subject = q.questionBank.subject;
      const topic = q.questionBank.topic || 'General Topic';
      if (!subjectsMap.has(subject)) {
        subjectsMap.set(subject, new Map());
      }
      const topicMap = subjectsMap.get(subject)!;
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)!.push(q);
    }

    for (const m of masteries) {
      if (!subjectsMap.has(m.subject)) {
        subjectsMap.set(m.subject, new Map());
      }
      const topicMap = subjectsMap.get(m.subject)!;
      if (!topicMap.has(m.topic)) {
        topicMap.set(m.topic, []);
      }
    }

    const tree: KnowledgeMapNode[] = [];

    for (const [subjectName, topicMap] of subjectsMap.entries()) {
      const topicNodes: KnowledgeMapNode[] = [];
      let subjectMasterySum = 0;
      let subjectTopicCount = 0;

      for (const [topicName, questions] of topicMap.entries()) {
        const mastery = masteryLookup.get(`${subjectName}:::${topicName}`) || {
          status: 'NEW' as const,
          masteryPercentage: 0,
        };

        subjectMasterySum += mastery.masteryPercentage;
        subjectTopicCount += 1;

        const subtopicMap = new Map<string, string[]>();
        for (const q of questions) {
          const sub = q.subtopic || 'General Concepts';
          if (!subtopicMap.has(sub)) {
            subtopicMap.set(sub, []);
          }
          if (q.concept && !subtopicMap.get(sub)!.includes(q.concept)) {
            subtopicMap.get(sub)!.push(q.concept);
          }
        }

        const subtopicNodes: KnowledgeMapNode[] = [];
        for (const [subName, concepts] of subtopicMap.entries()) {
          const conceptNodes: KnowledgeMapNode[] = concepts.map((c: string, idx: number) => ({
            id: `concept-${subjectName}-${topicName}-${subName}-${idx}`,
            name: c,
            type: 'concept',
            status: mastery.status,
            masteryPercentage: mastery.masteryPercentage,
            notesCount: 0,
            flashcardsCount: 0,
            mcqsCount: 1,
            vivaCount: 0,
          }));

          subtopicNodes.push({
            id: `subtopic-${subjectName}-${topicName}-${subName}`,
            name: subName,
            type: 'subtopic',
            status: mastery.status,
            masteryPercentage: mastery.masteryPercentage,
            notesCount: 0,
            flashcardsCount: 0,
            mcqsCount: questions.filter((q: any) => (q.subtopic || 'General Concepts') === subName).length,
            vivaCount: 0,
            children: conceptNodes,
          });
        }

        const notesCount = notes.filter((n: any) => n.subject === subjectName && n.topic === topicName).length;
        const flashcardsCount = flashcards.filter((f: any) => f.deck.subject === subjectName && f.deck.topic === topicName).length;
        const mcqsCount = questions.length;

        topicNodes.push({
          id: `topic-${subjectName}-${topicName}`,
          name: topicName,
          type: 'topic',
          status: mastery.status,
          masteryPercentage: mastery.masteryPercentage,
          notesCount,
          flashcardsCount,
          mcqsCount,
          vivaCount: 1,
          children: subtopicNodes,
        });
      }

      const avgSubjectMastery = subjectTopicCount > 0 ? Math.round(subjectMasterySum / subjectTopicCount) : 0;
      let subjectStatus: 'NEW' | 'LEARNING' | 'REVIEW' | 'STRONG' = 'NEW';
      if (avgSubjectMastery >= 75) subjectStatus = 'STRONG';
      else if (avgSubjectMastery >= 40) subjectStatus = 'LEARNING';
      else if (avgSubjectMastery > 0) subjectStatus = 'REVIEW';

      tree.push({
        id: `subject-${subjectName}`,
        name: subjectName,
        type: 'subject',
        status: subjectStatus,
        masteryPercentage: avgSubjectMastery,
        notesCount: notes.filter((n: any) => n.subject === subjectName).length,
        flashcardsCount: flashcards.filter((f: any) => f.deck.subject === subjectName).length,
        mcqsCount: Array.from(topicMap.values()).reduce((sum: number, qArr: any[]) => sum + qArr.length, 0),
        vivaCount: 2,
        children: topicNodes,
      });
    }

    return tree;
  }
}

export const masteryService = new MasteryService();
