import api from "./api";
import {
  ClinicalExam,
  ExamAttemptState,
  ExamResultResponse,
} from "../types";

export const examsService = {
  async getExams(): Promise<ClinicalExam[]> {
    const res = await api.get("/exams");
    return res.data.exams;
  },

  async getExam(id: string): Promise<ClinicalExam> {
    const res = await api.get(`/exams/${id}`);
    return res.data.exam;
  },

  async getMyExams(): Promise<any[]> {
    const res = await api.get("/exams/my-exams");
    return res.data.attempts;
  },

  async startExam(id: string, language: string = "en"): Promise<{
    attemptId: string;
    status: string;
    language: string;
    stations: any[];
  }> {
    const res = await api.post(`/exams/${id}/start`, { language });
    return res.data;
  },

  async getExamAttempt(attemptId: string): Promise<ExamAttemptState> {
    const res = await api.get(`/exams/attempts/${attemptId}`);
    return res.data;
  },

  async startStation(attemptId: string, stationId: string): Promise<{
    stationAttemptId: string;
    status: string;
    startedAt: string;
    deadline: string;
    timeLimitSeconds: number;
    remainingSeconds: number;
  }> {
    const res = await api.post(`/exams/attempts/${attemptId}/stations/${stationId}/start`);
    return res.data;
  },

  async sendStationMessage(
    attemptId: string,
    stationId: string,
    message: string,
    messageType: string = "voice"
  ): Promise<{
    studentMessage: any;
    patientMessage: any;
    remainingSeconds: number;
    isTimeUp: boolean;
  }> {
    const res = await api.post(
      `/exams/attempts/${attemptId}/stations/${stationId}/message`,
      { message, messageType }
    );
    return res.data;
  },

  async endStation(attemptId: string, stationId: string): Promise<{
    stationAttemptId: string;
    status: string;
    isLastStation: boolean;
    nextStation: {
      stationAttemptId: string;
      stationId: string;
      stationNumber: number;
      title: string;
      timeLimitSeconds: number;
    } | null;
  }> {
    const res = await api.post(`/exams/attempts/${attemptId}/stations/${stationId}/end`);
    return res.data;
  },

  async completeExam(attemptId: string): Promise<{
    attemptId: string;
    status: string;
    totalScore: number;
    totalMarks: number;
    percentage: number;
    outcome: string;
  }> {
    const res = await api.post(`/exams/attempts/${attemptId}/complete`);
    return res.data;
  },

  async getExamResult(attemptId: string): Promise<ExamResultResponse> {
    const res = await api.get(`/exams/attempts/${attemptId}/result`);
    return res.data;
  },

  async logIntegrityEvent(
    attemptId: string,
    data: { stationAttemptId?: string; eventType: string; metadata?: any }
  ): Promise<void> {
    try {
      await api.post(`/exams/attempts/${attemptId}/integrity`, data);
    } catch (e) {
      console.warn("Failed to log integrity signal:", e);
    }
  },
};

export default examsService;