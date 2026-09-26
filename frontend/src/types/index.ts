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
  
  // Phase 2: Voice settings
  voiceProvider?: string;
  voiceId?: string;
  voiceGender?: string;
  voiceLanguage?: string;
  speakingStyle?: string;
  speakingSpeed?: number;

  clinicalData?: {
    learningObjectives?: string;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Session types
// ────────────────────────────────────────────────────────────────────────────

export type SessionStatus = 'active' | 'completed' | 'abandoned';
export type MessageSender = 'student' | 'patient' | 'system';
export type MessageType = 'text' | 'voice';
export type ConsultationLanguage = 'en' | 'bn';
export type ConsultationMode = 'voice' | 'text';

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'paused'
  | 'error';

export interface ConversationMessage {
  id: string;
  sender: MessageSender;
  message: string;
  timestamp: string;
  messageType?: MessageType;
  audioUrl?: string | null;
  transcription?: string | null;
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
  
  // Phase 2: Session settings
  language?: ConsultationLanguage;
  voiceEnabled?: boolean;
  voiceProvider?: string | null;

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
    voiceProvider?: string;
    voiceId?: string;
    voiceGender?: string;
    speakingSpeed?: number;
  };
  messages?: ConversationMessage[];
  _count?: { messages: number };
}

// Phase 3 Preparation Event Types
export interface PatientVoiceEvents {
  onResponseStarted?: () => void;
  onAudioReady?: (audioUrl: string | Blob) => void;
  onAudioPlaying?: () => void;
  onAudioFinished?: () => void;
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
