import api from './api';
import type { PatientCase } from '../types';

export const casesService = {
  async getCases(): Promise<PatientCase[]> {
    const { data } = await api.get<{ cases: PatientCase[] }>('/cases');
    return data.cases;
  },

  async getCase(id: string): Promise<PatientCase> {
    const { data } = await api.get<{ case: PatientCase }>(`/cases/${id}`);
    return data.case;
  },
};
