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

  // Phase 3: Avatar settings
  avatarProvider?: string;
  avatarId?: string;
  avatarGender?: string;
  avatarAgeGroup?: string;
  avatarStyle?: string;

  clinicalData?: {
    learningObjectives?: string;
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Session & Avatar types
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

export type AvatarState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'paused'
  | 'error';

export type PatientEmotion =
  | 'neutral'
  | 'calm'
  | 'concerned'
  | 'anxious'
  | 'sad'
  | 'confused'
  | 'relieved';

export interface ConversationMessage {
  id: string;
  sender: MessageSender;
  message: string;
  timestamp: string;
  messageType?: MessageType;
  audioUrl?: string | null;
  transcription?: string | null;
  emotion?: PatientEmotion | null;
  emotionIntensity?: number | null;
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

  // Phase 3: Avatar settings
  avatarEnabled?: boolean;
  avatarProvider?: string | null;
  avatarId?: string | null;
  avatarSessionId?: string | null;

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
    personality?: PatientPersonality;
    voiceProvider?: string;
    voiceId?: string;
    voiceGender?: string;
    speakingSpeed?: number;
    avatarProvider?: string;
    avatarId?: string;
    avatarGender?: string;
    avatarAgeGroup?: string;
    avatarStyle?: string;
  };
  messages?: ConversationMessage[];
  _count?: { messages: number };
}

// Avatar Config & Session Types
export interface AvatarConfig {
  avatarProvider: string;
  avatarId: string;
  avatarGender?: string;
  avatarAgeGroup?: string;
  avatarStyle?: string;
  patientName?: string;
}

// Phase 3 Viseme & Animation Event Types
export interface VisemeFrame {
  jawOpen: number; // 0.0 - 1.0
  mouthOpen: number;
  lipPucker: number;
  lipFunnel: number;
  mouthWide: number;
}

export interface PatientVoiceEvents {
  onResponseStarted?: () => void;
  onAudioReady?: (audioUrl: string | Blob) => void;
  onAudioPlaying?: () => void;
  onAudioFinished?: () => void;
  onAudioNodeReady?: (sourceNode: AudioNode, audioContext: AudioContext) => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Dashboard types
// ────────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  casesAvailable: number;
  sessionsCompleted: number;
  practiceTimeMinutes: number;
  averageHistoryCoverage?: number;
  recentImprovement?: number;
  totalEvaluations?: number;
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

// ────────────────────────────────────────────────────────────────────────────
// PHASE 4: Clinical Evaluation & Rubric types
// ────────────────────────────────────────────────────────────────────────────

export type EvaluationStatus = 'covered' | 'partial' | 'missed' | 'not_applicable' | 'insufficient_evidence';
export type EvaluationImportance = 'required' | 'recommended' | 'red_flag';

export interface EvaluationEvidenceItem {
  id: string;
  category: string;
  title: string;
  intent?: string;
  status: EvaluationStatus;
  studentQuote?: string;
  feedback: string;
  importance: EvaluationImportance;
  rubricItem?: {
    id?: string;
    clinicalRationale?: string;
    sampleQuestions?: string;
  };
}

export interface ClinicalEvaluation {
  id: string;
  practiceAttemptId: string;
  historyScore: number;
  communicationScore: number;
  reasoningScore: number;
  patientCenterednessScore: number;
  structureScore: number;
  overallScore: number;
  coveredCount: number;
  partialCount: number;
  missedCount: number;
  totalCount: number;
  overallSummary: string;
  strengths: string[];
  improvements: string[];
  communicationFeedback?: {
    questionStyle?: string;
    empathy?: string;
    jargonLevel?: string;
    listening?: string;
  } | null;
  reasoningFeedback?: {
    hypothesisDriven?: string;
    redFlagExploration?: string;
    prematureClosure?: string;
  } | null;
  structureFeedback?: {
    flow?: string;
    openingAndClosing?: string;
  } | null;
  missedQuestions: string[];
  prematureDiagnosis: boolean;
  evidence: EvaluationEvidenceItem[];
  createdAt?: string;
}

export interface PracticeAttempt {
  id: string;
  attemptNumber: number;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  historyScore?: number;
  communicationScore?: number;
  reasoningScore?: number;
  patientCenterednessScore?: number;
  structureScore?: number;
  overallScore?: number;
  status: string;
  evaluation?: ClinicalEvaluation;
}

export interface EvaluationReportData {
  session: {
    id: string;
    status: string;
    startedAt: string;
    endedAt?: string;
    duration?: number;
    patientCase: {
      id: string;
      title: string;
      slug: string;
      patientName: string;
      patientAge: number;
      patientGender: string;
      chiefComplaint: string;
      difficulty: string;
      category: string;
      estimatedDuration?: number;
      rubric?: {
        learningObjectives?: string[];
      };
    };
  };
  attempt: {
    id: string;
    attemptNumber: number;
    startedAt: string;
    endedAt?: string;
    duration?: number;
    scores: {
      history?: number;
      communication?: number;
      reasoning?: number;
      patientCenteredness?: number;
      structure?: number;
      overall?: number;
    };
  };
  evaluation: ClinicalEvaluation;
}

export interface RubricItem {
  id: string;
  rubricId?: string;
  category: string;
  title: string;
  description?: string;
  intent: string;
  sampleQuestions?: string;
  importance: EvaluationImportance;
  clinicalRationale?: string;
  weight: number;
  isActive: boolean;
}

export interface ClinicalCaseRubric {
  id: string;
  patientCaseId: string;
  version: number;
  learningObjectives: string[];
  scoringWeights?: {
    historyTaking: number;
    communication: number;
    clinicalReasoning: number;
    patientCenteredness: number;
    consultationStructure: number;
  };
  categories: string[];
  items?: RubricItem[];
}


// ────────────────────────────────────────────────────────────────────────────
// PHASE 5: OSCE & CLINICAL EXAMINATION TYPES
// ────────────────────────────────────────────────────────────────────────────

export interface ExamStation {
  id: string;
  stationNumber: number;
  title: string;
  candidateInstructions: string;
  timeLimitSeconds: number;
  passingScore: number;
  patientCase?: {
    id: string;
    patientName?: string;
    name?: string;
    patientAge?: number;
    age?: number;
    patientGender?: string;
    gender?: string;
    avatarId?: string;
    voiceGender?: string;
  };
}

export interface ClinicalExam {
  id: string;
  title: string;
  slug: string;
  description?: string;
  instructions?: string;
  durationMinutes: number;
  stationCount: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  status: "draft" | "published" | "archived";
  voiceRequired: boolean;
  showLiveTranscript: boolean;
  fullscreenRequired: boolean;
  showDetailedFeedback: boolean;
  allowRetake: boolean;
  maxAttempts: number;
  passingPercentage: number;
  stations?: ExamStation[];
}

export interface StationAttemptProgress {
  stationAttemptId: string;
  stationId: string;
  stationNumber: number;
  title: string;
  candidateInstructions: string;
  timeLimitSeconds: number;
  patient?: any;
  status: "ready" | "active" | "time_up" | "completed" | "evaluated";
  startedAt?: string;
  deadline?: string;
  remainingSeconds: number;
  isTimeUp: boolean;
}

export interface ExamAttemptState {
  attemptId: string;
  examId: string;
  examTitle: string;
  status: "not_started" | "in_progress" | "completed" | "abandoned";
  language: "en" | "bn";
  voiceRequired: boolean;
  showLiveTranscript: boolean;
  fullscreenRequired: boolean;
  stations: StationAttemptProgress[];
}

export interface StationMessageItem {
  id: string;
  sender: "student" | "patient";
  message: string;
  emotion?: string;
  emotionIntensity?: number;
  timestamp: string;
}

export interface OSCERubricItemResult {
  id: string;
  rubricItemId: string;
  category: string;
  criterion: string;
  status: "achieved" | "partially_achieved" | "not_achieved" | "not_applicable" | "insufficient_evidence";
  marksAwarded: number;
  maximumMarks: number;
  evidence?: string | null;
  feedback?: string | null;
  isCritical: boolean;
  severity: string;
}

export interface StationResultSummary {
  stationAttemptId: string;
  stationId: string;
  stationNumber: number;
  title: string;
  candidateInstructions: string;
  patient?: any;
  status: string;
  score: number;
  maximumScore: number;
  percentage: number;
  outcome: "passed" | "not_passed" | "review_required";
  summary?: string;
  strengths: string[];
  improvements: string[];
  hasCriticalFailure: boolean;
  items: OSCERubricItemResult[];
  transcript: StationMessageItem[];
}

export interface ExamResultResponse {
  attemptId: string;
  examId: string;
  examTitle: string;
  examDescription?: string;
  language: "en" | "bn";
  startedAt: string;
  completedAt?: string;
  totalScore: number;
  totalMarks: number;
  percentage: number;
  outcome: "passed" | "not_passed" | "review_required";
  passingPercentage: number;
  allowRetake: boolean;
  showDetailedFeedback: boolean;
  domainBreakdown: Record<string, { marksAwarded: number; maximumMarks: number; percentage: number }>;
  stations: StationResultSummary[];
  integritySignalsCount: number;
}
