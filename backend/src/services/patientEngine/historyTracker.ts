// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 3: Dynamic Clinical History Tracker
// ────────────────────────────────────────────────────────────────────────────

import { ClinicalIntent, PatientCaseContext, PatientConversationState } from './types';

export interface HistoryDomainItem {
  id: string;
  titleEn: string;
  titleBn: string;
  category: 'core_hpi' | 'associated' | 'background' | 'safety';
  status: 'covered' | 'uncovered';
  turnDisclosed: number | null;
  keyFactDisclosed?: string;
  matchingIntents: ClinicalIntent[];
}

export interface HistoryTrackerSummary {
  coveredCount: number;
  totalCount: number;
  coveragePercentage: number;
  items: HistoryDomainItem[];
  coveredItems: string[];
  missedItems: string[];
  redFlagsCovered: boolean;
}

export class ClinicalHistoryTracker {
  private static DOMAINS: Omit<HistoryDomainItem, 'status' | 'turnDisclosed' | 'keyFactDisclosed'>[] = [
    {
      id: 'patient_identity',
      titleEn: 'Patient Identity & Demographics',
      titleBn: 'রোগীর পরিচয় ও সাধারণ তথ্য',
      category: 'core_hpi',
      matchingIntents: ['NAME', 'AGE', 'SEX', 'OCCUPATION', 'MARITAL_STATUS'],
    },
    {
      id: 'chief_complaint',
      titleEn: 'Chief Complaint',
      titleBn: 'প্রধান সমস্যা (Chief Complaint)',
      category: 'core_hpi',
      matchingIntents: ['CHIEF_COMPLAINT'],
    },
    {
      id: 'duration',
      titleEn: 'Onset & Duration',
      titleBn: 'শুরুর সময় ও স্থায়িত্ব (Duration)',
      category: 'core_hpi',
      matchingIntents: ['DURATION', 'ONSET'],
    },
    {
      id: 'location',
      titleEn: 'Site & Anatomical Location',
      titleBn: 'ব্যথার স্থান ও অবস্থান (Location)',
      category: 'core_hpi',
      matchingIntents: ['LOCATION'],
    },
    {
      id: 'character',
      titleEn: 'Nature & Character of Pain',
      titleBn: 'ব্যথার ধরন ও বৈশিষ্ট্য (Character)',
      category: 'core_hpi',
      matchingIntents: ['CHARACTER'],
    },
    {
      id: 'severity',
      titleEn: 'Severity & Functional Impact',
      titleBn: 'ব্যথার তীব্রতা (Severity Scale 1-10)',
      category: 'core_hpi',
      matchingIntents: ['SEVERITY'],
    },
    {
      id: 'radiation',
      titleEn: 'Radiation / Referral of Pain',
      titleBn: 'ব্যথা ছড়িয়ে পড়া (Radiation)',
      category: 'core_hpi',
      matchingIntents: ['RADIATION'],
    },
    {
      id: 'aggravating',
      titleEn: 'Aggravating / Exacerbating Factors',
      titleBn: 'যেসব কারণে বাড়ে (Aggravating Factors)',
      category: 'core_hpi',
      matchingIntents: ['AGGRAVATING_FACTORS'],
    },
    {
      id: 'relieving',
      titleEn: 'Relieving / Easing Factors',
      titleBn: 'যেসব কারণে উপশম হয় (Relieving Factors)',
      category: 'core_hpi',
      matchingIntents: ['RELIEVING_FACTORS'],
    },
    {
      id: 'associated',
      titleEn: 'Associated Symptoms (Fever, Nausea, Vomiting)',
      titleBn: 'অন্যান্য উপসর্গ (জ্বর, বমি, বমি বমি ভাব)',
      category: 'associated',
      matchingIntents: ['ASSOCIATED_SYMPTOMS', 'FEVER', 'NAUSEA', 'VOMITING'],
    },
    {
      id: 'past_history',
      titleEn: 'Past Medical & Surgical History',
      titleBn: 'পূর্ববর্তী চিকিৎসার ইতিহাস',
      category: 'background',
      matchingIntents: ['PAST_MEDICAL_HISTORY', 'PAST_SURGICAL_HISTORY', 'PREVIOUS_EPISODES'],
    },
    {
      id: 'medications',
      titleEn: 'Current Medications & Treatment',
      titleBn: 'গৃহীত ঔষধের ইতিহাস (Medications)',
      category: 'background',
      matchingIntents: ['MEDICATION'],
    },
    {
      id: 'allergies',
      titleEn: 'Allergies & Drug Reactions',
      titleBn: 'অ্যালার্জি ও বিরূপ প্রতিক্রিয়া',
      category: 'background',
      matchingIntents: ['ALLERGY'],
    },
    {
      id: 'family_history',
      titleEn: 'Family Medical History',
      titleBn: 'পারিবারিক রোগের ইতিহাস',
      category: 'background',
      matchingIntents: ['FAMILY_HISTORY'],
    },
    {
      id: 'social_history',
      titleEn: 'Personal & Social History (Habits)',
      titleBn: 'ব্যক্তিগত ও সামাজিক ইতিহাস (ধূমপান/অভ্যাস)',
      category: 'background',
      matchingIntents: ['SOCIAL_HISTORY', 'SMOKING', 'ALCOHOL'],
    },
    {
      id: 'red_flags',
      titleEn: 'Red Flag & Alarm Features',
      titleBn: 'বিপদচিহ্ন বা আশঙ্কাজনক লক্ষণ (Red Flags)',
      category: 'safety',
      matchingIntents: ['RED_FLAG'],
    },
  ];

  /**
   * Tracks and updates covered clinical history domains for the current turn.
   */
  public static trackTurn(
    state: PatientConversationState,
    intents: ClinicalIntent[],
    disclosedFactKeys: string[]
  ): HistoryTrackerSummary {
    if (!state.sessionHistoryTracker) {
      state.sessionHistoryTracker = {};
    }

    const currentTurn = state.conversationTurn;

    // Check which domains match current intents or disclosed facts
    for (const domain of this.DOMAINS) {
      const isMatched = domain.matchingIntents.some(i => intents.includes(i));
      if (isMatched && !state.sessionHistoryTracker[domain.id]) {
        state.sessionHistoryTracker[domain.id] = {
          turnDisclosed: currentTurn,
          keyFactDisclosed: disclosedFactKeys[0] || domain.id,
        };
      }
    }

    return this.getCoverageSummary(state);
  }

  /**
   * Generates dynamic summary of clinical history progress.
   */
  public static getCoverageSummary(state: PatientConversationState): HistoryTrackerSummary {
    const tracker = state.sessionHistoryTracker || {};
    let coveredCount = 0;

    const items: HistoryDomainItem[] = this.DOMAINS.map(domain => {
      const record = tracker[domain.id];
      const isCovered = Boolean(record);
      if (isCovered) coveredCount++;

      return {
        ...domain,
        status: isCovered ? 'covered' : 'uncovered',
        turnDisclosed: record ? record.turnDisclosed : null,
        keyFactDisclosed: record ? record.keyFactDisclosed : undefined,
      };
    });

    const totalCount = this.DOMAINS.length;
    const coveragePercentage = Math.round((coveredCount / totalCount) * 100);

    const coveredItems = items.filter(i => i.status === 'covered').map(i => i.id);
    const missedItems = items.filter(i => i.status === 'uncovered').map(i => i.id);
    const redFlagsCovered = Boolean(tracker['red_flags']);

    return {
      coveredCount,
      totalCount,
      coveragePercentage,
      items,
      coveredItems,
      missedItems,
      redFlagsCovered,
    };
  }

  /**
   * Generates comprehensive consultation debrief for Post-Consultation Summary.
   */
  public static generateConsultationDebrief(
    state: PatientConversationState,
    caseContext: PatientCaseContext
  ) {
    const summary = this.getCoverageSummary(state);

    const coveredTitles = summary.items
      .filter(i => i.status === 'covered')
      .map(i => `${i.titleBn} (${i.titleEn})`);

    const missedTitles = summary.items
      .filter(i => i.status === 'uncovered')
      .map(i => `${i.titleBn} (${i.titleEn})`);

    return {
      chiefComplaint: caseContext.chiefComplaint,
      patientName: caseContext.patientName,
      coveredCount: summary.coveredCount,
      totalCount: summary.totalCount,
      coveragePercentage: summary.coveragePercentage,
      coveredHistory: coveredTitles,
      missedHistory: missedTitles,
      redFlagsAsked: summary.redFlagsCovered,
      totalTurns: state.conversationTurn,
      communicationObservations: [
        summary.coveragePercentage >= 75
          ? 'Comprehensive and structured history taking covering all primary domains.'
          : 'Focused history taking; recommend exploring all SOCRATES pain dimensions.',
        summary.redFlagsCovered
          ? 'Crucial red flag alarm symptoms were appropriately screened.'
          : 'Warning: Red flag alarm symptoms were not explicitly excluded during consultation.',
      ],
    };
  }
}

export default ClinicalHistoryTracker;
