import api from './api';
import type {
  MedicalSubject,
  StudyMaterial,
  StudyNote,
  TutorConversation,
  TutorMessage,
  FlashcardDeck,
    QuestionBank,
    MCQPracticeSession,
  VivaSession,
  VivaQuestion,
  StudyProgress,
  LearningHubSummary,
  TutorMode,
} from '../types';

export const learningService = {
  // ────────────────────────────────────────────────────────
  // Subjects & Dashboard
  // ────────────────────────────────────────────────────────
  async getSubjects(): Promise<MedicalSubject[]> {
    const res = await api.get('/learning/subjects');
    return res.data.subjects;
  },

  async getHubSummary(): Promise<LearningHubSummary> {
    const res = await api.get('/learning/hub');
    return res.data;
  },

  // ────────────────────────────────────────────────────────
  // Study Materials
  // ────────────────────────────────────────────────────────
  async getMaterials(subject?: string): Promise<StudyMaterial[]> {
    const params = subject ? { subject } : {};
    const res = await api.get('/learning/materials', { params });
    return res.data.materials;
  },

  async getMaterial(id: string): Promise<StudyMaterial> {
    const res = await api.get(`/learning/materials/${id}`);
    return res.data.material;
  },

  async uploadMaterial(formData: FormData): Promise<StudyMaterial> {
    const res = await api.post('/learning/materials/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.material;
  },

  async deleteMaterial(id: string): Promise<void> {
    await api.delete(`/learning/materials/${id}`);
  },

  async generateSummary(materialId: string, options: {
    summaryType: 'QUICK' | 'DETAILED' | 'EXAM_REVISION' | 'HIGH_YIELD' | 'BEGINNER_FRIENDLY';
    selectedText?: string;
    saveAsNote?: boolean;
  }): Promise<{ summary: any; noteId?: string }> {
    const res = await api.post(`/learning/materials/${materialId}/summary`, options);
    return res.data;
  },

  // ────────────────────────────────────────────────────────
  // Smart Notes
  // ────────────────────────────────────────────────────────
  async getNotes(filters?: { subject?: string; search?: string }): Promise<StudyNote[]> {
    const res = await api.get('/notes', { params: filters });
    return res.data.notes;
  },

  async getNote(id: string): Promise<StudyNote> {
    const res = await api.get(`/notes/${id}`);
    return res.data.note;
  },

  async createNote(data: {
    title: string;
    content: string;
    subject: string;
    topic?: string;
    tags?: string;
    materialId?: string;
    sourceType?: 'PERSONAL' | 'AI_GENERATED' | 'MATERIAL_BASED';
  }): Promise<StudyNote> {
    const res = await api.post('/notes', data);
    return res.data.note;
  },

  async updateNote(id: string, data: Partial<StudyNote>): Promise<StudyNote> {
    const res = await api.put(`/notes/${id}`, data);
    return res.data.note;
  },

  async deleteNote(id: string): Promise<void> {
    await api.delete(`/notes/${id}`);
  },

  async performNoteAIAction(id: string, action: 'improve' | 'summarize' | 'explain' | 'flashcards' | 'mcqs', customPrompt?: string): Promise<any> {
    const res = await api.post(`/notes/${id}/ai-action`, { action, customPrompt });
    return res.data;
  },

  // ────────────────────────────────────────────────────────
  // AI Medical Tutor
  // ────────────────────────────────────────────────────────
  async getTutorSuggestions(): Promise<{
    suggestions: Array<{ title: string; prompt: string; category: string; mode: string }>;
    weakConcepts: string[];
  }> {
    const res = await api.get('/tutor/suggestions');
    return res.data;
  },

  async getTutorConversations(): Promise<TutorConversation[]> {
    const res = await api.get('/tutor/conversations');
    return res.data.conversations;
  },

  async getTutorConversation(id: string): Promise<TutorConversation> {
    const res = await api.get(`/tutor/conversations/${id}`);
    return res.data.conversation;
  },

  async createTutorConversation(data: {
    mode: TutorMode;
    title?: string;
    materialId?: string;
    initialMessage?: string;
  }): Promise<{ conversation: TutorConversation; initialAssistantMessage?: TutorMessage }> {
    const res = await api.post('/tutor/conversations', data);
    return res.data;
  },

  async sendTutorMessage(conversationId: string, message: string, sourceReference?: string): Promise<{
    userMessage: TutorMessage;
    assistantMessage: TutorMessage;
  }> {
    const res = await api.post(`/tutor/conversations/${conversationId}/messages`, { message, sourceReference });
    return res.data;
  },

  // ────────────────────────────────────────────────────────
  // Flashcards
  // ────────────────────────────────────────────────────────
  async getFlashcardDecks(subject?: string): Promise<FlashcardDeck[]> {
    const res = await api.get('/flashcards/decks', { params: { subject } });
    return res.data.decks;
  },

  async getFlashcardDeck(id: string): Promise<FlashcardDeck> {
    const res = await api.get(`/flashcards/decks/${id}`);
    return res.data.deck;
  },

  async createFlashcardDeck(data: {
    title: string;
    subject: string;
    topic?: string;
    description?: string;
    materialId?: string;
    cards: Array<{ question: string; answer: string; explanation?: string; difficulty?: string }>;
  }): Promise<FlashcardDeck> {
    const res = await api.post('/flashcards/decks', data);
    return res.data.deck;
  },

  async generateFlashcards(data: {
    materialId?: string;
    subject: string;
    topic?: string;
    count: number;
    difficulty?: string;
    saveToDeck?: boolean;
    deckTitle?: string;
  }): Promise<{ flashcards: any[]; deck?: FlashcardDeck }> {
    const res = await api.post('/flashcards/generate', data);
    return res.data;
  },

  async recordCardReview(deckId: string, cardId: string, rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'): Promise<void> {
    await api.post(`/flashcards/decks/${deckId}/cards/${cardId}/review`, { rating });
  },

  // ────────────────────────────────────────────────────────
  // MCQ Practice
  // ────────────────────────────────────────────────────────
  async getQuestionBanks(subject?: string): Promise<QuestionBank[]> {
    const res = await api.get('/mcq/banks', { params: { subject } });
    return res.data.banks;
  },

  async startMCQSession(data: {
    bankId?: string;
    materialId?: string;
    subject: string;
    topic?: string;
    count?: number;
    difficulty?: string;
  }): Promise<MCQPracticeSession> {
    const res = await api.post('/mcq/sessions/start', data);
    return res.data.session;
  },

  async submitMCQAnswer(sessionId: string, questionId: string, selectedOption: 'A' | 'B' | 'C' | 'D'): Promise<{
    isCorrect: boolean;
    correctOption: 'A' | 'B' | 'C' | 'D';
    explanation: string;
    sourceReference?: string;
  }> {
    const res = await api.post(`/mcq/sessions/${sessionId}/answer`, { questionId, selectedOption });
    return res.data;
  },

  async getMCQSession(sessionId: string): Promise<MCQPracticeSession> {
    const res = await api.get(`/mcq/sessions/${sessionId}`);
    return res.data.session;
  },

  async completeMCQSession(sessionId: string): Promise<MCQPracticeSession> {
    const res = await api.post(`/mcq/sessions/${sessionId}/complete`);
    return res.data.session;
  },

  async generateMCQBank(data: {
    materialId?: string;
    subject: string;
    topic?: string;
    count: number;
    difficulty?: string;
    title: string;
  }): Promise<QuestionBank> {
    const res = await api.post('/mcq/generate', data);
    return res.data.bank;
  },

  // ────────────────────────────────────────────────────────
  // Academic Viva
  // ────────────────────────────────────────────────────────
  async startVivaSession(data: {
    materialId?: string;
    subject: string;
    topic: string;
    difficulty?: string;
    mode?: 'TEXT' | 'VOICE';
    count?: number;
  }): Promise<VivaSession> {
    const res = await api.post('/viva/start', data);
    return res.data.session;
  },

  async getVivaSession(sessionId: string): Promise<VivaSession> {
    const res = await api.get(`/viva/sessions/${sessionId}`);
    return res.data.session;
  },

  async submitVivaResponse(sessionId: string, questionId: string, responseText: string): Promise<{
    evaluation: any;
    nextQuestion?: VivaQuestion | null;
    isCompleted: boolean;
    overallScore?: number;
  }> {
    const res = await api.post(`/viva/sessions/${sessionId}/respond`, { questionId, responseText });
    return res.data;
  },

  // ────────────────────────────────────────────────────────
  // Study Progress & Search
  // ────────────────────────────────────────────────────────
  async getStudyProgress(): Promise<StudyProgress> {
    const res = await api.get('/learning/progress');
    return res.data;
  },

  async trackStudySession(data: {
    materialId?: string;
    subject: string;
    topic?: string;
    activityType: 'READING' | 'NOTES' | 'MCQ' | 'FLASHCARD' | 'VIVA' | 'AI_TUTOR';
    durationSeconds: number;
  }): Promise<void> {
    await api.post('/learning/study-session', data);
  },

  async searchLearning(query: string, type?: string): Promise<any> {
    const res = await api.get('/learning/search', { params: { q: query, type } });
    return res.data;
  },

  // ────────────────────────────────────────────────────────
  // PHASE 7: Smart Revision & Spaced Repetition
  // ────────────────────────────────────────────────────────
  async getTodayRevision(): Promise<{
    dueCards: any[];
    counts: { overdue: number; dueToday: number; newCards: number; totalDue: number };
    topicsDueReview: any[];
    activeMistakes: any[];
    recommendations: any[];
    todayTasks: any[];
    todayPlanItems: any[];
  }> {
    const res = await api.get('/revision/today');
    return res.data;
  },

  async getPrioritizedDueCards(limit = 50): Promise<{
    dueCards: any[];
    counts: { overdue: number; dueToday: number; newCards: number; totalDue: number };
  }> {
    const res = await api.get('/revision/due-cards', { params: { limit } });
    return res.data;
  },

  async rateFlashcard(cardId: string, rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'): Promise<any> {
    const res = await api.post('/revision/rate-card', { cardId, rating });
    return res.data;
  },

  async getSpacedRepetitionSettings(): Promise<any> {
    const res = await api.get('/revision/settings');
    return res.data;
  },

  async updateSpacedRepetitionSettings(settings: any): Promise<any> {
    const res = await api.put('/revision/settings', settings);
    return res.data;
  },

  // ────────────────────────────────────────────────────────
  // PHASE 7: Adaptive MCQ & Mistake Bank
  // ────────────────────────────────────────────────────────
  async startAdaptiveMCQ(params: {
    subject: string;
    topic?: string;
    count?: number;
    questionType?: string;
    difficulty?: string;
  }): Promise<{ sessionId: string; subject: string; topic?: string; questions: any[] }> {
    const res = await api.post('/adaptive/mcq/start', params);
    return res.data;
  },

  async submitAdaptiveMCQAnswer(params: {
    sessionId: string;
    questionId: string;
    selectedOption: string;
    responseTimeSeconds?: number;
  }): Promise<{
    isCorrect: boolean;
    correctOption: string;
    explanation: string;
    sourceReference?: string;
    conceptTested: string;
    learningDifficultyAdvice: string;
    answerId: string;
  }> {
    const res = await api.post('/adaptive/mcq/submit', params);
    return res.data;
  },

  async getWeakTopics(): Promise<any[]> {
    const res = await api.get('/adaptive/mcq/weak-topics');
    return res.data;
  },

  async getMistakes(params?: { subject?: string; reviewed?: boolean }): Promise<any[]> {
    const res = await api.get('/adaptive/mistakes', { params });
    return res.data;
  },

  async markMistakeReviewed(id: string): Promise<any> {
    const res = await api.post(`/adaptive/mistakes/${id}/reviewed`);
    return res.data;
  },

  // ────────────────────────────────────────────────────────
  // PHASE 7: Mastery & Knowledge Map
  // ────────────────────────────────────────────────────────
  async getTopicMasteries(): Promise<any[]> {
    const res = await api.get('/adaptive/mastery');
    return res.data;
  },

  async getKnowledgeMap(): Promise<any[]> {
    const res = await api.get('/adaptive/knowledge-map');
    return res.data;
  },

  // ────────────────────────────────────────────────────────
  // PHASE 7: Study Plan & Daily Tasks
  // ────────────────────────────────────────────────────────
  async getActiveStudyPlan(): Promise<any> {
    const res = await api.get('/adaptive/study-plan');
    return res.data;
  },

  async createStudyPlan(planData: any): Promise<any> {
    const res = await api.post('/adaptive/study-plan', planData);
    return res.data;
  },

  async getTodayTasks(): Promise<any[]> {
    const res = await api.get('/adaptive/tasks/today');
    return res.data;
  },

  async toggleStudyTask(taskId: string): Promise<any> {
    const res = await api.post(`/adaptive/tasks/${taskId}/toggle`);
    return res.data;
  },

  async getRecommendations(): Promise<any[]> {
    const res = await api.get('/adaptive/recommendations');
    return res.data;
  },

  // ────────────────────────────────────────────────────────
  // PHASE 7: Adaptive Viva
  // ────────────────────────────────────────────────────────
  async startAdaptiveViva(params: {
    subject?: string;
    topic?: string;
    difficulty?: string;
  }): Promise<{ sessionId: string; subject: string; topic: string; currentQuestion: any }> {
    const res = await api.post('/adaptive/viva/start', params);
    return res.data;
  },

  async submitAdaptiveVivaAnswer(params: {
    sessionId: string;
    questionId: string;
    studentAnswer: string;
    topic?: string;
    currentDifficulty?: string;
  }): Promise<{
    evaluation: any;
    isSessionComplete: boolean;
    nextQuestion?: any;
    turnCount: number;
  }> {
    const res = await api.post('/adaptive/viva/submit', params);
    return res.data;
  },

  // ────────────────────────────────────────────────────────
  // PHASE 7: Learning Streak & Multi-timeframe Analytics
  // ────────────────────────────────────────────────────────
  async getLearningStreak(): Promise<{
    currentStreak: number;
    longestStreak: number;
    studyDaysThisMonth: number;
    lastActiveDate: string | null;
    message: string;
  }> {
    const res = await api.get('/adaptive/analytics/streak');
    return res.data;
  },

  async getWeeklyReport(): Promise<any> {
    const res = await api.get('/adaptive/analytics/weekly-report');
    return res.data;
  },

  async getTimeRangeAnalytics(timeframe: '7d' | '30d' | '90d' | 'all'): Promise<any> {
    const res = await api.get('/adaptive/analytics/range', { params: { timeframe } });
    return res.data;
  },
};

export default learningService;
