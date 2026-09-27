import prisma from '../utils/prisma';

export type ReviewRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface SpacedRepetitionResult {
  repetitionCount: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: Date;
  lapses: number;
}

export class SpacedRepetitionService {
  /**
   * SuperMemo SM-2-inspired configurable algorithm for medical active recall.
   * Calculates next review interval, updated ease factor, and due timestamp.
   */
  static calculateNextReview(
    currentState: {
      repetitionCount: number;
      intervalDays: number;
      easeFactor: number;
      lapses: number;
    },
    rating: ReviewRating
  ): SpacedRepetitionResult {
    let { repetitionCount, intervalDays, easeFactor, lapses } = currentState;
    const now = new Date();

    const MIN_EASE = 1.3;
    const INITIAL_EASE = 2.5;
    if (!easeFactor || easeFactor < MIN_EASE) {
      easeFactor = INITIAL_EASE;
    }

    switch (rating) {
      case 'AGAIN': {
        repetitionCount = 0;
        intervalDays = 1;
        lapses += 1;
        easeFactor = Math.max(MIN_EASE, Number((easeFactor - 0.2).toFixed(2)));
        break;
      }

      case 'HARD': {
        repetitionCount += 1;
        intervalDays = intervalDays === 0 ? 1 : Math.max(1, Math.round(intervalDays * 1.2));
        easeFactor = Math.max(MIN_EASE, Number((easeFactor - 0.15).toFixed(2)));
        break;
      }

      case 'GOOD': {
        repetitionCount += 1;
        if (repetitionCount === 1) {
          intervalDays = 1;
        } else if (repetitionCount === 2) {
          intervalDays = 6;
        } else {
          intervalDays = Math.round(intervalDays * easeFactor);
        }
        break;
      }

      case 'EASY': {
        repetitionCount += 1;
        if (repetitionCount === 1) {
          intervalDays = 4;
        } else if (repetitionCount === 2) {
          intervalDays = 10;
        } else {
          intervalDays = Math.round(intervalDays * easeFactor * 1.3);
        }
        easeFactor = Number((easeFactor + 0.15).toFixed(2));
        break;
      }
    }

    const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    return {
      repetitionCount,
      intervalDays,
      easeFactor,
      dueAt,
      lapses,
    };
  }

  /**
   * Records a user's rating for a specific flashcard and updates or creates its FlashcardReviewState.
   */
  async recordCardReview(
    userId: string,
    cardId: string,
    rating: ReviewRating
  ) {
    const existing = await prisma.flashcardReviewState.findUnique({
      where: {
        userId_cardId: {
          userId,
          cardId,
        },
      },
    });

    const currentState = existing
      ? {
          repetitionCount: existing.repetitionCount,
          intervalDays: existing.intervalDays,
          easeFactor: existing.easeFactor,
          lapses: existing.lapses,
        }
      : {
          repetitionCount: 0,
          intervalDays: 0,
          easeFactor: 2.5,
          lapses: 0,
        };

    const next = SpacedRepetitionService.calculateNextReview(currentState, rating);

    const reviewState = await prisma.flashcardReviewState.upsert({
      where: {
        userId_cardId: {
          userId,
          cardId,
        },
      },
      update: {
        repetitionCount: next.repetitionCount,
        intervalDays: next.intervalDays,
        easeFactor: next.easeFactor,
        dueAt: next.dueAt,
        lastReviewedAt: new Date(),
        lastRating: rating,
        lapses: next.lapses,
      },
      create: {
        userId,
        cardId,
        repetitionCount: next.repetitionCount,
        intervalDays: next.intervalDays,
        easeFactor: next.easeFactor,
        dueAt: next.dueAt,
        lastReviewedAt: new Date(),
        lastRating: rating,
        lapses: next.lapses,
      },
    });

    return reviewState;
  }

  /**
   * Retrieves due cards prioritized strictly by:
   * 1. Overdue cards (dueAt < now)
   * 2. Cards marked AGAIN / with high lapses
   * 3. Cards with low ease factor
   * 4. Cards due today
   * 5. New cards never reviewed
   */
  async getPrioritizedDueCards(userId: string, limit = 50) {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const cards = await prisma.flashcard.findMany({
      where: {
        deck: {
          userId,
        },
      },
      include: {
        reviewStates: {
          where: { userId },
        },
        deck: true,
      },
    });

    const overdue: typeof cards = [];
    const dueToday: typeof cards = [];
    const newCards: typeof cards = [];

    for (const card of cards) {
      const state = card.reviewStates[0];
      if (!state) {
        newCards.push(card);
      } else if (state.dueAt < now) {
        overdue.push(card);
      } else if (state.dueAt <= endOfDay) {
        dueToday.push(card);
      }
    }

    overdue.sort((a: any, b: any) => {
      const stateA = a.reviewStates[0];
      const stateB = b.reviewStates[0];
      if (!stateA || !stateB) return 0;
      if (stateA.lastRating === 'AGAIN' && stateB.lastRating !== 'AGAIN') return -1;
      if (stateB.lastRating === 'AGAIN' && stateA.lastRating !== 'AGAIN') return 1;
      return stateA.easeFactor - stateB.easeFactor;
    });

    const prioritized = [...overdue, ...dueToday, ...newCards].slice(0, limit);

    return {
      dueCards: prioritized.map((c: any) => ({
        id: c.id,
        deckId: c.deckId,
        deckTitle: c.deck.title,
        subject: c.deck.subject,
        topic: c.deck.topic,
        question: c.question,
        answer: c.answer,
        explanation: c.explanation,
        sourceReference: c.sourceReference,
        difficulty: c.difficulty,
        reviewState: c.reviewStates[0] || null,
        isOverdue: c.reviewStates[0] ? c.reviewStates[0].dueAt < now : false,
        isNew: !c.reviewStates[0],
      })),
      counts: {
        overdue: overdue.length,
        dueToday: dueToday.length,
        newCards: newCards.length,
        totalDue: overdue.length + dueToday.length + newCards.length,
      },
    };
  }

  async getAdaptiveDueCards(userId: string, limit = 50) {
    const res = await this.getPrioritizedDueCards(userId, limit);
    return res.dueCards;
  }
}

export const spacedRepetitionService = new SpacedRepetitionService();
export default SpacedRepetitionService;
