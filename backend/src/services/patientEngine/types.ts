// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Stateful AI Patient Conversation Engine Types
// ────────────────────────────────────────────────────────────────────────────

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'gemini' | 'mock';

export type PatientEmotion =
  | 'neutral'
  | 'calm'
  | 'concerned'
  | 'anxious'
  | 'sad'
  | 'confused'
  | 'relieved';

export type PatientPersonality =
  | 'calm'
  | 'anxious'
  | 'talkative'
  | 'quiet'
  | 'concerned'
  | 'frustrated'
  | 'confused';

export type LanguageMode = 'en' | 'bn' | 'banglish';

export type FactImportance = 'critical' | 'important' | 'supporting';

export type FactDisclosureStatus = 'undisclosed' | 'partially_disclosed' | 'disclosed';

// ────────────────────────────────────────────────────────────────────────────
// Clinical Intents
// ────────────────────────────────────────────────────────────────────────────

export type ClinicalIntent =
  // Patient Identity & Demographics
  | 'AGE'
  | 'NAME'
  | 'SEX'
  | 'OCCUPATION'
  | 'MARITAL_STATUS'
  // Opening & General
  | 'INTRODUCTION'
  | 'CHIEF_COMPLAINT'
  | 'CLARIFICATION'
  | 'FOLLOW_UP'
  | 'SUMMARY'
  // SOCRATES Pain & Symptom Exploration
  | 'ONSET'
  | 'DURATION'
  | 'LOCATION'
  | 'CHARACTER'
  | 'SEVERITY'
  | 'TIMING'
  | 'FREQUENCY'
  | 'RADIATION'
  | 'AGGRAVATING_FACTORS'
  | 'RELIEVING_FACTORS'
  | 'PROGRESSION'
  | 'ASSOCIATED_SYMPTOMS'
  // Specific System Review
  | 'FEVER'
  | 'COUGH'
  | 'BREATHING'
  | 'PALPITATION'
  | 'DIZZINESS'
  | 'SYNCOPE'
  | 'NAUSEA'
  | 'VOMITING'
  | 'BOWEL_HABITS'
  | 'BOWEL_CHANGE'
  | 'URINARY_SYMPTOMS'
  | 'APPETITE'
  | 'WEIGHT_CHANGE'
  | 'RASH'
  | 'SWELLING'
  | 'HEADACHE'
  | 'OCULAR_SYMPTOM'
  | 'MENINGISM'
  | 'TRAUMA_HISTORY'
  | 'NEUROLOGICAL_SCREENING'
  | 'PHONOPHOBIA'
  // Patient History
  | 'PAST_MEDICAL_HISTORY'
  | 'PAST_SURGICAL_HISTORY'
  | 'MEDICATION'
  | 'ALLERGY'
  | 'FAMILY_HISTORY'
  | 'PERSONAL_HISTORY'
  | 'SOCIAL_HISTORY'
  | 'SMOKING'
  | 'ALCOHOL'
  | 'DIET'
  | 'SLEEP'
  | 'OCCUPATIONAL_HISTORY'
  | 'MENSTRUAL_HISTORY'
  | 'PREGNANCY_RELATED'
  | 'SEXUAL_HISTORY'
  | 'RISK_FACTORS'
  | 'RED_FLAG'
  | 'PREVIOUS_EPISODES'
  | 'TREATMENT_HISTORY'
  // ICE (Ideas, Concerns, Expectations)
  | 'PATIENT_CONCERN'
  | 'PATIENT_EXPECTATION'
  // Safety & Boundary
  | 'DIRECT_DIAGNOSIS_QUERY'
  | 'UNSUPPORTED_OR_DOCTOR_QUERY'
  | 'UNRELATED_QUERY'
  | 'OTHER';

// ────────────────────────────────────────────────────────────────────────────
// Structured Clinical Fact
// ────────────────────────────────────────────────────────────────────────────

export interface ClinicalFact {
  factId: string;
  category: ClinicalIntent;
  name: string;
  valueEn: string;
  valueBn: string;
  synonyms: string[];
  importance: FactImportance;
  disclosureCondition?: string;
  status: FactDisclosureStatus;
  disclosureCount: number;
  lastDiscussedTurn?: number;
  relatedFacts?: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Patient Case Context (from DB)
// ────────────────────────────────────────────────────────────────────────────

export interface PatientCaseContext {
  id?: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  chiefComplaint: string;
  caseSummary?: string;
  personality: string;
  language?: string; // 'en' | 'bn'
  medicalHistory?: string;
  medicationHistory?: string;
  allergyHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  symptomDetails?: string;
  hiddenDiagnosis?: string; // Stored securely; NEVER revealed to student by patient
  redFlags?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Conversation Turn & State
// ────────────────────────────────────────────────────────────────────────────

export interface ConversationTurn {
  role: 'student' | 'patient' | 'system';
  content: string;
  intents?: ClinicalIntent[];
  timestamp?: string;
}

export interface PatientConversationState {
  sessionId: string;
  caseId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  personality: PatientPersonality;
  language: LanguageMode;
  emotionalState: PatientEmotion;
  emotionIntensity: number;
  conversationTurn: number;
  consultationStage: 'opening' | 'symptom_exploration' | 'system_review' | 'past_history' | 'closing';
  currentTopic: string;
  currentSymptom: string;
  currentIntents: ClinicalIntent[];
  previousQuestions: string[];
  previousAnswers: string[];
  conversationHistory: ConversationTurn[];
  discussedTopics: string[];
  facts: Record<string, ClinicalFact>;
  disclosedFactIds: string[];
  misunderstoodQuestions: string[];
  clarificationRequests: string[];
  redFlagsDisclosed: string[];
  lastStudentMessage?: string;
  lastPatientResponse?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Engine Result & Debug Metadata
// ────────────────────────────────────────────────────────────────────────────

export interface IntentDetectionResult {
  intents: ClinicalIntent[];
  confidence: number;
  detectedLanguage: LanguageMode;
  isMultiQuestion: boolean;
  isAmbiguous: boolean;
  isDirectDiagnosisQuery: boolean;
  extractedKeywords: string[];
}

export interface FactRetrievalResult {
  retrievedFacts: ClinicalFact[];
  missingFactIntents: ClinicalIntent[];
}

export interface ConsistencyValidationResult {
  valid: boolean;
  reason?: string;
  containsHiddenDiagnosis: boolean;
  containsContradiction: boolean;
  answersQuestion: boolean;
}

export interface EngineDebugInfo {
  studentQuestion: string;
  detectedIntents: ClinicalIntent[];
  detectedLanguage: LanguageMode;
  retrievedFacts: Array<{
    intent: ClinicalIntent;
    factId: string;
    value: string;
    previouslyDisclosed: boolean;
    disclosureCount: number;
  }>;
  conversationTurn: number;
  currentTopic: string;
  personalityApplied: string;
  emotionalState: PatientEmotion;
  validationResult: ConsistencyValidationResult;
}

export interface PatientEngineResult {
  message: string;
  provider: AIProvider;
  emotion: PatientEmotion;
  intensity: number;
  intents: ClinicalIntent[];
  debug: EngineDebugInfo;
}

export type AIPatientResponse = PatientEngineResult;
