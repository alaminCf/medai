// ────────────────────────────────────────────────────────────────────────────
// User types
// ────────────────────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Auth types
// ────────────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Patient Case types
// ────────────────────────────────────────────────────────────────────────────

export type CaseDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type PatientPersonality = 'calm' | 'anxious' | 'talkative' | 'quiet' | 'confused' | 'frustrated';

export interface PatientCase {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  difficulty: CaseDifficulty;
  estimatedDuration: number;
  patientName: string;
  patientAge: number;
  patientGender: string;
  chiefComplaint: string;
  caseSummary?: string;
  personality: PatientPersonality;
  createdAt: string;
  clinicalData?: {
    learningObjectives?: string;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Session types
// ────────────────────────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'completed' | 'abandoned';
export type MessageSender = 'student' | 'patient' | 'system';

export interface ConversationMessage {
  id: string;
  sender: MessageSender;
  message: string;
  timestamp: string;
}

export interface PracticeSession {
  id: string;
  userId: string;
  patientCaseId: string;
  status: SessionStatus;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
  patientCase: {
    id: string;
    title: string;
    patientName: string;
    patientAge?: number;
    patientGender?: string;
    chiefComplaint?: string;
    difficulty: CaseDifficulty;
    estimatedDuration?: number;
    category?: string;
  };
  messages?: ConversationMessage[];
  _count?: { messages: number };
}

// ────────────────────────────────────────────────────────────────────────────
// Dashboard types
// ────────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  casesAvailable: number;
  sessionsCompleted: number;
  practiceTimeMinutes: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentSessions: PracticeSession[];
}

// ────────────────────────────────────────────────────────────────────────────
// API types
// ────────────────────────────────────────────────────────────────────────────

export interface ApiError {
  error?: string;
  errors?: Array<{ msg: string; path?: string }>;
  message?: string;
}
