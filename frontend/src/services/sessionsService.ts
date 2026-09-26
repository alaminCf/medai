import api from './api';
import type {
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
};

export default sessionsService;
