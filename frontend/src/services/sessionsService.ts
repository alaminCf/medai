import api from './api';
import type {
  EvaluationReportData,
  PracticeAttempt,
  ClinicalCaseRubric,
  PracticeSession,
  ConversationMessage,
  ConsultationLanguage,
  MessageType,
  PatientEmotion,
  AvatarConfig,
} from '../types';

export interface StartSessionOptions {
  language?: ConsultationLanguage;
  voiceEnabled?: boolean;
  avatarEnabled?: boolean;
}

export interface SendMessagePayload {
  message: string;
  messageType?: MessageType;
  transcription?: string;
  audioUrl?: string;
}

export interface SendMessageResponse {
  studentMessage: ConversationMessage;
  patientMessage: ConversationMessage;
  provider: string;
  emotion?: PatientEmotion;
  intensity?: number;
  hasBackendTTS?: boolean;
  language?: ConsultationLanguage;
  voiceConfig?: {
    voiceId?: string;
    voiceGender?: string;
    speakingSpeed?: number;
  };
  avatarConfig?: AvatarConfig;
  historyTracker?: any;
  _debug?: any;
}

export const sessionsService = {
  async startSession(
    caseId: string,
    options?: StartSessionOptions
  ): Promise<{ session: PracticeSession; openingMessage: ConversationMessage }> {
    const { data } = await api.post('/sessions/start', {
      caseId,
      language: options?.language || 'en',
      voiceEnabled: options?.voiceEnabled !== false,
      avatarEnabled: options?.avatarEnabled !== false,
    });
    return data;
  },

  async sendMessage(
    sessionId: string,
    payload: string | SendMessagePayload
  ): Promise<SendMessageResponse> {
    const body = typeof payload === 'string' ? { message: payload } : payload;
    const { data } = await api.post<SendMessageResponse>(`/sessions/${sessionId}/message`, body);
    return data;
  },

  async getAvatarSession(sessionId: string): Promise<AvatarConfig> {
    const { data } = await api.post<AvatarConfig>(`/sessions/${sessionId}/avatar/session`);
    return data;
  },

  async endSession(sessionId: string): Promise<{ session: PracticeSession; messageCount: number; duration: number }> {
    const { data } = await api.post(`/sessions/${sessionId}/end`);
    return data;
  },

  async getSession(sessionId: string): Promise<PracticeSession> {
    const { data } = await api.get<{ session: PracticeSession }>(`/sessions/${sessionId}`);
    return data.session;
  },

  async getSessions(): Promise<PracticeSession[]> {
    const { data } = await api.get<{ sessions: PracticeSession[] }>('/sessions');
    return data.sessions;
  },

  // Phase 4: Clinical Evaluation & Attempts
  async getEvaluation(sessionId: string): Promise<EvaluationReportData> {
    const { data } = await api.get<EvaluationReportData>(`/sessions/${sessionId}/evaluation`);
    return data;
  },

  async getAttempts(sessionId: string): Promise<{ attempts: PracticeAttempt[] }> {
    const { data } = await api.get<{ attempts: PracticeAttempt[] }>(`/sessions/${sessionId}/attempts`);
    return data;
  },

  async retrySession(sessionId: string): Promise<{ session: PracticeSession; attemptNumber: number; openingMessage: ConversationMessage }> {
    const { data } = await api.post(`/sessions/${sessionId}/retry`);
    return data;
  },

  async getCaseRubric(caseId: string): Promise<{ rubric: ClinicalCaseRubric }> {
    const { data } = await api.get<{ rubric: ClinicalCaseRubric }>(`/cases/${caseId}/rubric`);
    return data;
  },

  async getHistorySummary(sessionId: string): Promise<any> {
    const { data } = await api.get(`/sessions/${sessionId}/history-summary`);
    return data;
  },

  async getTimeline(sessionId: string): Promise<any> {
    const { data } = await api.get(`/sessions/${sessionId}/timeline`);
    return data;
  },
};

export default sessionsService;
