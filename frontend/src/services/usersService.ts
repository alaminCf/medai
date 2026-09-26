import api from './api';
import type { User, DashboardData } from '../types';

export const usersService = {
  async getDashboard(): Promise<DashboardData> {
    const { data } = await api.get<DashboardData>('/users/dashboard');
    return data;
  },

  async getProfile(): Promise<User> {
    const { data } = await api.get<{ user: User }>('/users/profile');
    return data.user;
  },

  async updateProfile(name: string): Promise<User> {
    const { data } = await api.patch<{ user: User }>('/users/profile', { name });
    return data.user;
  },
};
