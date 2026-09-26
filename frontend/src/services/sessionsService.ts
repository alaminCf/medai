import api from './api';
import type { PracticeSession, ConversationMessage } from '../types';

export const sessionsService = {
  async startSession(caseId: string): Promise<{ session: PracticeSession; openingMessage: ConversationMessage }> {
    const { data } = await api.post('/sessions/start', { caseId });
    return data;
  },

  async sendMessage(
    sessionId: string,
    message: string
  ): Promise<{ studentMessage: ConversationMessage; patientMessage: ConversationMessage }> {
    const { data } = await api.post(`/sessions/${sessionId}/message`, { message });
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
