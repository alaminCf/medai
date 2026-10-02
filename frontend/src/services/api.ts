import axios, { AxiosError } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach token to every request and ensure FormData uploads set dynamic boundary
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('techboloy_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // When sending FormData, delete Content-Type so the browser automatically sets
  // multipart/form-data WITH the correct boundary parameter!
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('techboloy_token');
      localStorage.removeItem('techboloy_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; errors?: Array<{ msg: string }> };
    if (data?.error) return data.error;
    if (data?.errors?.length) return data.errors.map(e => e.msg).join(', ');
    if (error.message) return error.message;
  }
  return 'An unexpected error occurred';
}

export default api;
