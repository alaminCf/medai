import api from './api';
import type { PatientCase, PracticeSession } from '../types';

export interface GenerateCaseParams {
  topic: string;
  specialty?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: 'en' | 'bn';
  patientGender?: 'Male' | 'Female';
  patientAge?: number;
}

export interface QuickConnectParams {
  caseId: string;
  language?: 'en' | 'bn';
  voiceEnabled?: boolean;
  avatarEnabled?: boolean;
}

export const casesService = {
  async getCases(): Promise<PatientCase[]> {
    const { data } = await api.get<{ cases: PatientCase[] }>('/cases');
    return data.cases;
  },

  async getCase(id: string): Promise<PatientCase> {
    const { data } = await api.get<{ case: PatientCase }>(`/cases/${id}`);
    return data.case;
  },

  async generateCase(params: GenerateCaseParams): Promise<PatientCase> {
    const { data } = await api.post<{ case: PatientCase; message: string }>('/cases/generate', params);
    return data.case;
  },

  async quickConnect(params: QuickConnectParams): Promise<{ session: PracticeSession; sessionId: string }> {
    const { data } = await api.post<{ session: PracticeSession; sessionId: string }>('/cases/quick-connect', params);
    return data;
  },
};
