// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 3: Consultation Timeline & Replay Event Logger
// ────────────────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  type:
    | 'DoctorQuestion'
    | 'IntentDetected'
    | 'ContextResolved'
    | 'FactRetrieved'
    | 'EmotionChanged'
    | 'HistoryItemCovered'
    | 'PatientAnswer'
    | 'DoctorInterrupted';
  data: any;
}

export class ConsultationTimelineService {
  private static timelines: Record<string, TimelineEvent[]> = {};

  public static logEvent(
    sessionId: string,
    type: TimelineEvent['type'],
    data: any
  ): TimelineEvent {
    if (!this.timelines[sessionId]) {
      this.timelines[sessionId] = [];
    }

    const event: TimelineEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      sessionId,
      timestamp: Date.now(),
      type,
      data,
    };

    this.timelines[sessionId].push(event);

    // Keep memory bounded to 250 events per session
    if (this.timelines[sessionId].length > 250) {
      this.timelines[sessionId].shift();
    }

    return event;
  }

  public static getTimeline(sessionId: string): TimelineEvent[] {
    return this.timelines[sessionId] || [];
  }

  public static clear(sessionId: string): void {
    delete this.timelines[sessionId];
  }
}

export default ConsultationTimelineService;
