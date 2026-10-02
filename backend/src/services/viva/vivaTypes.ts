export type VivaSessionType = 'PRACTICE' | 'EXAM';

export type VivaDifficultyLevel = 'Beginner' | 'Basic' | 'Intermediate' | 'Advanced' | 'Clinical Reasoning';

export type ExaminerStyle =
  | 'CALM_PROFESSIONAL'
  | 'FRIENDLY_TEACHER'
  | 'STRICT_EXAMINER'
  | 'CLINICAL_EXAMINER'
  | 'RAPID_FIRE';

export type VivaQuestionType =
  | 'Definition'
  | 'Explanation'
  | 'Mechanism'
  | 'Compare & Contrast'
  | 'Cause'
  | 'Effect'
  | 'Classification'
  | 'Example'
  | 'Clinical Application'
  | 'Interpretation'
  | 'Scenario-Based'
  | 'Why Question'
  | 'How Question'
  | 'What-if Question'
  | 'Rapid Recall'
  | 'Follow-up'
  | 'Correction / Misconception Check'
  | 'Clinical Reasoning';

export type ConceptMasteryLevel =
  | 'NOT_TESTED'
  | 'INTRODUCED'
  | 'WEAK'
  | 'PARTIAL'
  | 'COMPETENT'
  | 'STRONG'
  | 'MASTERED';

export type ExaminerResponseType =
  | 'ACKNOWLEDGE'
  | 'PRAISE_BRIEFLY'
  | 'CLARIFY'
  | 'PROBE_DEEPER'
  | 'CORRECT'
  | 'CHALLENGE'
  | 'ASK_FOLLOWUP'
  | 'REDIRECT'
  | 'ENCOURAGE'
  | 'MOVE_ON'
  | 'SUMMARIZE';

export type NextQuestionStrategyType =
  | 'OPENING_FOUNDATION'
  | 'DEEPEN_CURRENT_CONCEPT'
  | 'TARGETED_FOLLOW_UP'
  | 'MISCONCEPTION_CORRECTION'
  | 'FOUNDATIONAL_GUIDANCE'
  | 'INCREASE_DIFFICULTY_ADVANCE'
  | 'CLINICAL_SCENARIO_APPLICATION'
  | 'EXPAND_TOPIC_COVERAGE'
  | 'RAPID_RECALL_CHALLENGE'
  | 'CONCLUDE_VIVA';

export interface VivaConcept {
  id: string;
  name: string;
  subtopic?: string;
  learningObjective: string;
  tier: 'FOUNDATIONAL' | 'CORE_MECHANISM' | 'REGULATION' | 'PATHOPHYSIOLOGY' | 'CLINICAL_APPLICATION';
  difficulty: VivaDifficultyLevel;
  expectedConcepts: string[];
  acceptedKeywords: string[];
  commonMisconceptions: Array<{
    misconception: string;
    correction: string;
    probeQuestion: string;
  }>;
  followUpPossibilities: string[];
  relatedConcepts: string[];
}

export interface VivaBlueprint {
  subject: string;
  topic: string;
  overview: string;
  concepts: VivaConcept[];
  clinicalScenarios: Array<{
    scenario: string;
    leadConcept: string;
    questions: string[];
  }>;
}

export interface VivaQuestionItem {
  id: string;
  questionNumber: number;
  questionText: string;
  questionType: VivaQuestionType;
  targetConcept: string;
  difficulty: VivaDifficultyLevel;
  expectedConcepts: string[];
  acceptedAnswerConcepts?: string[];
  commonMisconceptions?: Array<{ misconception: string; correction: string }>;
  clinicalRelevance?: string;
  sourceReference?: string;
  intent?: string;
}

export interface AnswerAssessmentResult {
  correctness: 'CORRECT' | 'PARTIAL' | 'INCORRECT' | 'UNKNOWN';
  scoreOutOf10: number;
  confidence: number;
  demonstratedConcepts: string[];
  missingConcepts: string[];
  detectedMisconceptions: string[];
  isHesitantOrUnknown: boolean;
  communicationClarity: 'Clear' | 'Adequate' | 'Hesitant' | 'Disorganized';
  relevanceDepth: 'Shallow' | 'Good' | 'Detailed & Analytical';
  examinerRemark: string;
  recommendedNextAction: NextQuestionStrategyType;
}

export interface ConceptMasteryState {
  conceptId: string;
  conceptName: string;
  level: ConceptMasteryLevel;
  attempts: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  lastAttemptAt: string;
  notes: string[];
}

export interface VivaQuestionHistoryItem {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionType: VivaQuestionType;
  targetConcept: string;
  difficulty: VivaDifficultyLevel;
}

export interface VivaAnswerHistoryItem {
  questionId: string;
  studentAnswer: string;
  assessment: AnswerAssessmentResult;
  timestamp: string;
}

export interface VivaDebugTurn {
  turnNumber: number;
  questionText: string;
  questionType: VivaQuestionType;
  targetConcept: string;
  studentAnswer: string;
  correctness: string;
  score: number;
  demonstratedConcepts: string[];
  missingConcepts: string[];
  detectedMisconceptions: string[];
  strategyChosen: NextQuestionStrategyType;
  strategyRationale: string;
  nextQuestionPreview: string;
  similarityCheckPassed: boolean;
}

export interface VivaSessionState {
  sessionId: string;
  userId: string;
  subject: string;
  topic: string;
  subtopic?: string;
  sessionType: VivaSessionType;
  examinerStyle: ExaminerStyle;
  currentDifficulty: VivaDifficultyLevel;
  currentQuestion: VivaQuestionItem;
  currentQuestionIntent: string;
  currentConcept: string;
  previousQuestions: VivaQuestionHistoryItem[];
  previousAnswers: VivaAnswerHistoryItem[];
  askedQuestionIds: string[];
  askedConceptIds: string[];
  coveredConcepts: string[];
  masteredConcepts: string[];
  weakConcepts: string[];
  misunderstoodConcepts: string[];
  partiallyUnderstoodConcepts: string[];
  incorrectConcepts: string[];
  repeatedMistakes: string[];
  skippedQuestions: number;
  followUpCount: number;
  questionCount: number;
  totalTargetQuestions: number;
  correctCount: number;
  incorrectCount: number;
  partialCount: number;
  confidence: number;
  conversationContext: Array<{
    role: 'examiner' | 'student';
    content: string;
    concept?: string;
    timestamp: string;
  }>;
  knowledgeState: Record<string, ConceptMasteryState>;
  debugTurns: VivaDebugTurn[];
  sessionStartTime: string;
  lastActivityAt: string;
  sessionStatus: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED';
}
