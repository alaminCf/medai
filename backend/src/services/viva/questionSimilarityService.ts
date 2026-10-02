import { VivaQuestionHistoryItem, VivaQuestionType } from './vivaTypes';

export class QuestionSimilarityService {
  private static DEFAULT_THRESHOLD = 0.62;

  // Clean and normalize strings for robust semantic comparison
  public static normalizeQuestion(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Strip conversational examiner filler / stems to extract core medical query
  public static extractCoreQueryIntent(text: string): string {
    let clean = this.normalizeQuestion(text);
    const fillerStems = [
      'what is', 'what are', 'define', 'can you define', 'can you explain',
      'could you explain', 'tell me about', 'what do you understand by',
      'please explain', 'how would you define', 'what do you mean by',
      'describe', 'can you describe', 'elaborate on', 'state the definition of',
      'in your own words explain', 'in the context of', 'speaking of',
      'let us consider', 'can you tell me', 'what can you tell me about',
      'could you tell me', 'briefly explain', 'give me a brief overview of'
    ];

    for (const stem of fillerStems) {
      if (clean.startsWith(stem + ' ')) {
        clean = clean.substring(stem.length + 1).trim();
      }
    }
    return clean;
  }

  // N-gram token overlap (bi-gram and tri-gram Dice coefficient)
  public static calculateDiceCoefficient(textA: string, textB: string): number {
    const a = this.normalizeQuestion(textA);
    const b = this.normalizeQuestion(textB);

    if (a === b) return 1.0;
    if (a.length < 2 || b.length < 2) return 0.0;

    const getBigrams = (str: string) => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
      }
      return bigrams;
    };

    const bigramsA = getBigrams(a);
    const bigramsB = getBigrams(b);

    let intersection = 0;
    for (const bg of bigramsA) {
      if (bigramsB.has(bg)) intersection++;
    }

    return (2.0 * intersection) / (bigramsA.size + bigramsB.size);
  }

  // Word token Jaccard similarity
  public static calculateJaccardSimilarity(textA: string, textB: string): number {
    const stopWords = new Set(['what', 'is', 'the', 'of', 'and', 'in', 'to', 'a', 'can', 'you', 'explain', 'tell', 'me', 'how', 'does', 'do', 'it', 'on', 'for', 'about']);
    const getTokens = (t: string) =>
      new Set(this.normalizeQuestion(t).split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w)));

    const tokensA = getTokens(textA);
    const tokensB = getTokens(textB);

    if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

    let matchCount = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) matchCount++;
    }

    const unionSize = new Set([...tokensA, ...tokensB]).size;
    return matchCount / unionSize;
  }

  // Calculate composite semantic similarity score (0.0 to 1.0)
  public static calculateSimilarity(candidateText: string, existingText: string): number {
    const normA = this.normalizeQuestion(candidateText);
    const normB = this.normalizeQuestion(existingText);

    // 1. Exact match after basic normalization
    if (normA === normB) return 1.0;

    // 2. Intent comparison after stripping filler prefixes
    const intentA = this.extractCoreQueryIntent(candidateText);
    const intentB = this.extractCoreQueryIntent(existingText);
    if (intentA === intentB && intentA.length > 4) {
      return 0.95; // Core query target is identical (e.g. 'cardiac output')
    }

    const diceScore = this.calculateDiceCoefficient(normA, normB);
    const jaccardScore = this.calculateJaccardSimilarity(normA, normB);
    const intentJaccard = this.calculateJaccardSimilarity(intentA, intentB);

    return Math.max(diceScore * 0.7 + jaccardScore * 0.3, intentJaccard);
  }

  /**
   * Comprehensive check before every question dispatch:
   * 1. Exact duplication check
   * 2. Semantic similarity check against recent question history
   * 3. Intent duplication check
   * 4. Concept saturation check
   */
  public static isQuestionDuplicate(
    candidateText: string,
    candidateConcept: string,
    previousQuestions: VivaQuestionHistoryItem[],
    threshold: number = this.DEFAULT_THRESHOLD
  ): { isDuplicate: boolean; reason?: string; similarToQuestion?: string; similarityScore?: number } {
    if (!previousQuestions || previousQuestions.length === 0) {
      return { isDuplicate: false };
    }

    const candidateIntent = this.extractCoreQueryIntent(candidateText);

    for (const prev of previousQuestions) {
      const prevIntent = this.extractCoreQueryIntent(prev.questionText);
      const simScore = this.calculateSimilarity(candidateText, prev.questionText);

      // Check identical core target
      if (candidateIntent === prevIntent && candidateIntent.length > 3) {
        return {
          isDuplicate: true,
          reason: 'Semantic intent identical to question #' + prev.questionNumber + ': "' + prev.questionText + '"',
          similarToQuestion: prev.questionText,
          similarityScore: 0.95,
        };
      }

      // Check threshold match
      if (simScore >= threshold) {
        return {
          isDuplicate: true,
          reason: 'Semantic similarity score ' + (simScore * 100).toFixed(1) + '% exceeds allowable threshold (' + (threshold * 100).toFixed(0) + '%) with #' + prev.questionNumber,
          similarToQuestion: prev.questionText,
          similarityScore: simScore,
        };
      }
    }

    // Check recent concept fatigue: if the candidate concept is the same as the last 2 questions
    const recent = previousQuestions.slice(-2);
    const sameConceptInRecentTurns = recent.filter(q => q.targetConcept.toLowerCase() === candidateConcept.toLowerCase()).length;
    if (sameConceptInRecentTurns >= 2 && !candidateText.toLowerCase().includes('more specifically') && !candidateText.toLowerCase().includes('reconsider')) {
      return {
        isDuplicate: true,
        reason: 'Concept "' + candidateConcept + '" was already targeted in the last 2 consecutive turns. Topic coverage must broaden.',
        similarityScore: 0.8,
      };
    }

    return { isDuplicate: false };
  }

  // Prevent question type fatigue (e.g. asking 3 "Definition" questions in a row)
  public static isQuestionTypeRepeated(recentTypes: VivaQuestionType[], candidateType: VivaQuestionType): boolean {
    if (recentTypes.length < 2) return false;
    const lastTwo = recentTypes.slice(-2);
    return lastTwo.every(t => t === candidateType);
  }
}
