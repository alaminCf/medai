import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==========================================
// Types & Interfaces
// ==========================================

export interface QuestionClassification {
  category: string;
  intent: string;
  confidence: number;
}

export interface RubricEvaluationItem {
  id: string;
  category: string;
  title: string;
  intent: string;
  importance: string; // 'required' | 'recommended' | 'red_flag'
  clinicalRationale?: string | null;
  sampleQuestions?: string | null;
  weight: number;
}

export interface EvidenceOutput {
  rubricItemId?: string;
  category: string;
  title: string;
  intent?: string;
  status: 'covered' | 'partial' | 'missed' | 'not_applicable' | 'insufficient_evidence';
  studentQuote?: string;
  feedback: string;
  importance: string;
}

export interface StructuredEvaluationOutput {
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
  communicationFeedback: {
    questionStyle: string;
    empathy: string;
    jargonLevel: string;
    listening: string;
  };
  reasoningFeedback: {
    hypothesisDriven: string;
    redFlagExploration: string;
    prematureClosure: string;
  };
  structureFeedback: {
    flow: string;
    openingAndClosing: string;
  };
  missedQuestions: string[];
  prematureDiagnosis: boolean;
  evidence: EvidenceOutput[];
}

export class ClinicalEvaluationEngine {
  // ────────────────────────────────────────────────────────────────────────────
  // Silent Intent Classifier (Fast & Lightweight during active consultation)
  // ────────────────────────────────────────────────────────────────────────────
  public static classifyQuestion(question: string): QuestionClassification {
    const q = question.toLowerCase().trim();

    // 1. Red Flags
    if (
      q.includes('faint') ||
      q.includes('pass out') ||
      q.includes('syncope') ||
      q.includes('palpitation') ||
      q.includes('racing heart') ||
      q.includes('blood') ||
      q.includes('অজ্ঞান') ||
      q.includes('রক্ত') ||
      q.includes('বুক ধড়ফড়')
    ) {
      return { category: 'Red Flags', intent: 'cardiac_red_flags', confidence: 0.92 };
    }

    // 2. Pain Location & Radiation
    if (
      q.includes('where') ||
      q.includes('location') ||
      q.includes('site') ||
      q.includes('point') ||
      q.includes('কোথায়') ||
      q.includes('কোন জায়গায়')
    ) {
      return { category: 'History of Presenting Complaint', intent: 'pain_location', confidence: 0.95 };
    }

    if (
      q.includes('radiat') ||
      q.includes('spread') ||
      q.includes('move') ||
      q.includes('travel') ||
      q.includes('arm') ||
      q.includes('jaw') ||
      q.includes('neck') ||
      q.includes('back') ||
      q.includes('ছড়ায়') ||
      q.includes('হাতে') ||
      q.includes('ঘাড়')
    ) {
      return { category: 'History of Presenting Complaint', intent: 'pain_radiation', confidence: 0.95 };
    }

    // 3. Pain Onset, Duration, Timing
    if (
      q.includes('when') ||
      q.includes('start') ||
      q.includes('begin') ||
      q.includes('how long') ||
      q.includes('duration') ||
      q.includes('sudden') ||
      q.includes('gradual') ||
      q.includes('কখন') ||
      q.includes('কতক্ষণ') ||
      q.includes('শুরু')
    ) {
      return { category: 'History of Presenting Complaint', intent: 'pain_onset_duration', confidence: 0.94 };
    }

    // 4. Pain Character & Severity
    if (
      q.includes('feel like') ||
      q.includes('describe') ||
      q.includes('character') ||
      q.includes('sharp') ||
      q.includes('heavy') ||
      q.includes('pressure') ||
      q.includes('tight') ||
      q.includes('squeez') ||
      q.includes('কেমন') ||
      q.includes('ভারী') ||
      q.includes('চাপ')
    ) {
      return { category: 'History of Presenting Complaint', intent: 'pain_character', confidence: 0.92 };
    }

    if (
      q.includes('scale') ||
      q.includes('1 to 10') ||
      q.includes('severe') ||
      q.includes('how bad') ||
      q.includes('তীব্রতা') ||
      q.includes('কতটা বেশি')
    ) {
      return { category: 'History of Presenting Complaint', intent: 'pain_severity', confidence: 0.90 };
    }

    // 5. Aggravating & Relieving Factors
    if (
      q.includes('worse') ||
      q.includes('better') ||
      q.includes('reliev') ||
      q.includes('aggravat') ||
      q.includes('trigger') ||
      q.includes('walk') ||
      q.includes('stairs') ||
      q.includes('rest') ||
      q.includes('কমে') ||
      q.includes('বাড়ে') ||
      q.includes('বিশ্রাম')
    ) {
      return { category: 'History of Presenting Complaint', intent: 'aggravating_relieving', confidence: 0.91 };
    }

    // 6. Associated Symptoms
    if (
      q.includes('breath') ||
      q.includes('sweat') ||
      q.includes('nausea') ||
      q.includes('vomit') ||
      q.includes('dizzy') ||
      q.includes('শ্বাস') ||
      q.includes('ঘাম') ||
      q.includes('বমি')
    ) {
      return { category: 'Associated Symptoms', intent: 'associated_symptoms', confidence: 0.93 };
    }

    // 7. Past Medical History
    if (
      q.includes('past') ||
      q.includes('history') ||
      q.includes('pressure') ||
      q.includes('hypertension') ||
      q.includes('diabetes') ||
      q.includes('sugar') ||
      q.includes('cholesterol') ||
      q.includes('heart problem') ||
      q.includes('before') ||
      q.includes('ডায়াবেটিস') ||
      q.includes('উচ্চ রক্তচাপ') ||
      q.includes('আগে কখনো')
    ) {
      return { category: 'Past Medical History', intent: 'past_medical_history', confidence: 0.90 };
    }

    // 8. Medication & Allergies
    if (
      q.includes('medicin') ||
      q.includes('drug') ||
      q.includes('tablet') ||
      q.includes('pill') ||
      q.includes('taking') ||
      q.includes('prescrib') ||
      q.includes('ঔষধ') ||
      q.includes('ওষুধ')
    ) {
      return { category: 'Medication History', intent: 'medication_history', confidence: 0.94 };
    }

    if (
      q.includes('allerg') ||
      q.includes('react') ||
      q.includes('এলার্জি')
    ) {
      return { category: 'Allergy History', intent: 'allergy_history', confidence: 0.96 };
    }

    // 9. Family & Social History
    if (
      q.includes('family') ||
      q.includes('father') ||
      q.includes('mother') ||
      q.includes('parent') ||
      q.includes('relative') ||
      q.includes('পরিবার') ||
      q.includes('বাবা') ||
      q.includes('মা')
    ) {
      return { category: 'Family History', intent: 'family_history', confidence: 0.93 };
    }

    if (
      q.includes('smoke') ||
      q.includes('cigarette') ||
      q.includes('tobacco') ||
      q.includes('alcohol') ||
      q.includes('drink') ||
      q.includes('stress') ||
      q.includes('work') ||
      q.includes('ধূমপান') ||
      q.includes('সিগারেট') ||
      q.includes('মদ')
    ) {
      return { category: 'Social History', intent: 'social_risk_factors', confidence: 0.92 };
    }

    // 10. Patient Concerns / ICE
    if (
      q.includes('worr') ||
      q.includes('concern') ||
      q.includes('think it is') ||
      q.includes('fear') ||
      q.includes('expect') ||
      q.includes('চিন্তা') ||
      q.includes('ভয়')
    ) {
      return { category: 'Patient Concerns', intent: 'patient_concerns_ice', confidence: 0.88 };
    }

    return { category: 'General Inquiry', intent: 'general_exploration', confidence: 0.60 };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Full Post-Consultation Evaluation (Two-Layer Engine)
  // ────────────────────────────────────────────────────────────────────────────
  public static async evaluateConsultation(params: {
    caseTitle: string;
    caseSlug: string;
    chiefComplaint: string;
    patientAge: number;
    patientGender: string;
    rubricItems: RubricEvaluationItem[];
    scoringWeights?: {
      historyTaking?: number;
      communication?: number;
      clinicalReasoning?: number;
      patientCenteredness?: number;
      consultationStructure?: number;
    };
    messages: Array<{
      sender: string;
      message: string;
      timestamp: Date | string;
    }>;
  }): Promise<StructuredEvaluationOutput> {
    const { caseTitle, chiefComplaint, rubricItems, messages } = params;

    // Filter student questions and patient replies
    const studentMessages = messages.filter((m) => m.sender === 'student');
    const patientMessages = messages.filter((m) => m.sender === 'patient');

    // Default weights: 40% History, 20% Comm, 20% Reasoning, 10% Patient-centeredness, 10% Structure
    const weights = {
      historyTaking: params.scoringWeights?.historyTaking ?? 40,
      communication: params.scoringWeights?.communication ?? 20,
      clinicalReasoning: params.scoringWeights?.clinicalReasoning ?? 20,
      patientCenteredness: params.scoringWeights?.patientCenteredness ?? 10,
      consultationStructure: params.scoringWeights?.consultationStructure ?? 10,
    };

    // ────────────────────────────────────────────────────────────────────────────
    // LAYER 1: DETERMINISTIC CLINICAL RUBRIC MATCHING & METRICS
    // ────────────────────────────────────────────────────────────────────────────
    const evidenceList: EvidenceOutput[] = [];
    let coveredCount = 0;
    let partialCount = 0;
    let missedCount = 0;
    let weightedScoreSum = 0;
    let totalPossibleWeight = 0;
    const missedQuestionsList: string[] = [];

    // Red flag and premature diagnosis tracking
    let redFlagsExplored = 0;
    let totalRedFlags = 0;
    let prematureDiagnosisDetected = false;

    // Check premature diagnosis assumptions
    const prematureRegex = /(you have|you are having|is this|are you having|i think it is|do you have) (a heart attack|acute coronary syndrome|myocardial infarction|stroke|angina|pneumonia|appendicitis)/i;
    for (let i = 0; i < studentMessages.length; i++) {
      const q = studentMessages[i].message;
      if (prematureRegex.test(q) && i < 4) {
        prematureDiagnosisDetected = true;
      }
    }

    // Evaluate each rubric item against student turns
    for (const item of rubricItems) {
      totalPossibleWeight += item.weight;
      if (item.importance === 'red_flag') totalRedFlags++;

      // Check matching student questions
      let bestMatch: { message: string; score: number } | null = null;

      for (const sm of studentMessages) {
        const text = sm.message;
        const classification = this.classifyQuestion(text);

        // Check exact intent or semantic category match
        let matchScore = 0;
        if (classification.intent === item.intent) {
          matchScore = 1.0;
        } else if (
          (item.intent.includes('radiation') && /(radiat|spread|move|arm|jaw|neck|ঘাড়|হাতে)/i.test(text)) ||
          (item.intent.includes('onset') && /(when|start|begin|long|কখন|শুরু)/i.test(text)) ||
          (item.intent.includes('character') && /(feel like|describe|sharp|pressure|tight|ভারী|চাপ)/i.test(text)) ||
          (item.intent.includes('location') && /(where|site|point|কোথায়)/i.test(text)) ||
          (item.intent.includes('aggravating') && /(worse|better|trigger|reliev|walk|rest|কমে|বাড়ে)/i.test(text)) ||
          (item.intent.includes('associated') && /(breath|sweat|nausea|vomit|ঘাম|শ্বাস)/i.test(text)) ||
          (item.intent.includes('red_flag') && /(faint|syncope|palpitation|racing|অজ্ঞান)/i.test(text)) ||
          (item.intent.includes('past_medical') && /(pressure|hypertension|diabetes|sugar|heart|আগে|ডায়াবেটিস)/i.test(text)) ||
          (item.intent.includes('medication') && /(medicine|drug|tablet|pill|taking|ঔষধ)/i.test(text)) ||
          (item.intent.includes('allergy') && /(allerg|এলার্জি)/i.test(text)) ||
          (item.intent.includes('family') && /(family|relative|পরিবার)/i.test(text)) ||
          (item.intent.includes('social') && /(smoke|cigarette|tobacco|alcohol|stress|ধূমপান)/i.test(text)) ||
          (item.intent.includes('ice') && /(worr|concern|fear|think|চিন্তা)/i.test(text))
        ) {
          matchScore = 0.9;
        } else if (classification.category === item.category) {
          matchScore = 0.5; // partial
        }

        if (matchScore > (bestMatch?.score ?? 0)) {
          bestMatch = { message: text, score: matchScore };
        }
      }

      if (studentMessages.length < 2) {
        // Insufficient evidence
        evidenceList.push({
          rubricItemId: item.id,
          category: item.category,
          title: item.title,
          intent: item.intent,
          status: 'insufficient_evidence',
          studentQuote: undefined,
          feedback: `Consultation was concluded before this clinical area could be explored.`,
          importance: item.importance,
        });
        missedCount++;
      } else if (bestMatch && bestMatch.score >= 0.8) {
        // Covered
        coveredCount++;
        weightedScoreSum += item.weight;
        if (item.importance === 'red_flag') redFlagsExplored++;

        evidenceList.push({
          rubricItemId: item.id,
          category: item.category,
          title: item.title,
          intent: item.intent,
          status: 'covered',
          studentQuote: bestMatch.message,
          feedback: `Good exploration: You specifically asked "${bestMatch.message}". ${item.clinicalRationale || 'This establishes vital diagnostic details.'}`,
          importance: item.importance,
        });
      } else if (bestMatch && bestMatch.score >= 0.4) {
        // Partial
        partialCount++;
        weightedScoreSum += item.weight * 0.5;

        evidenceList.push({
          rubricItemId: item.id,
          category: item.category,
          title: item.title,
          intent: item.intent,
          status: 'partial',
          studentQuote: bestMatch.message,
          feedback: `Partially addressed: You asked "${bestMatch.message}". Consider drilling down further into ${item.title.toLowerCase()}. ${item.clinicalRationale || ''}`,
          importance: item.importance,
        });
      } else {
        // Missed
        missedCount++;
        let sampleQ = '';
        if (item.sampleQuestions) {
          try {
            const parsed = JSON.parse(item.sampleQuestions);
            if (Array.isArray(parsed) && parsed.length > 0) sampleQ = parsed[0];
          } catch {
            sampleQ = '';
          }
        }
        if (sampleQ) missedQuestionsList.push(sampleQ);

        evidenceList.push({
          rubricItemId: item.id,
          category: item.category,
          title: item.title,
          intent: item.intent,
          status: 'missed',
          studentQuote: undefined,
          feedback: `Did not explore ${item.title.toLowerCase()}: ${item.clinicalRationale || 'This is an important area to explore.'}${sampleQ ? ` Consider asking: "${sampleQ}"` : ''}`,
          importance: item.importance,
        });
      }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // COMMUNICATION & STYLE ANALYSIS
    // ────────────────────────────────────────────────────────────────────────────
    let openQuestions = 0;
    let closedQuestions = 0;
    let jargonInstances = 0;
    let empathyExpressions = 0;

    const openRegex = /^(can you tell|tell me|describe|what happened|how did|could you describe|বলুন|কেমন)/i;
    const closedRegex = /^(did|do|is|are|have|has|was|were|হয়েছে|আছে)/i;
    const jargonWords = ['myocardial', 'ischemia', 'infarction', 'angina', 'pathology', 'diaphoresis', 'dyspnea', 'etiology', 'idiopathic'];
    const empathyWords = ['sorry', 'understand', 'worry', 'comfortable', 'take your time', 'here to help', 'ধন্যবাদ', 'বুঝতে পারছি'];

    for (const sm of studentMessages) {
      const q = sm.message.trim();
      if (openRegex.test(q)) openQuestions++;
      else if (closedRegex.test(q)) closedQuestions++;
      else openQuestions++;

      for (const word of jargonWords) {
        if (q.toLowerCase().includes(word)) jargonInstances++;
      }
      for (const word of empathyWords) {
        if (q.toLowerCase().includes(word)) empathyExpressions++;
      }
    }

    // Communication Score calculation
    let commScore = 75;
    if (openQuestions >= 1 && closedQuestions >= 1) commScore += 10; // balanced open/closed
    if (jargonInstances === 0) commScore += 5; // avoided jargon
    else commScore -= jargonInstances * 8;
    if (empathyExpressions > 0) commScore += 10; // showed empathy
    if (studentMessages.length >= 5) commScore += 5; // sustained dialogue
    commScore = Math.min(100, Math.max(30, commScore));

    // History Taking Score calculation
    const rawHistoryScore = totalPossibleWeight > 0 ? (weightedScoreSum / totalPossibleWeight) * 100 : 50;
    const historyScore = Math.round(Math.min(100, Math.max(0, rawHistoryScore)));

    // Clinical Reasoning Score calculation
    let reasoningScore = 70;
    if (totalRedFlags > 0) {
      reasoningScore += (redFlagsExplored / totalRedFlags) * 20;
    }
    if (prematureDiagnosisDetected) {
      reasoningScore -= 25;
    }
    if (coveredCount >= 4) reasoningScore += 10;
    reasoningScore = Math.round(Math.min(100, Math.max(25, reasoningScore)));

    // Patient Centeredness Score
    let patientCenteredScore = 70;
    const askedIce = evidenceList.some((e) => e.intent === 'patient_concerns_ice' && (e.status === 'covered' || e.status === 'partial'));
    if (askedIce) patientCenteredScore += 20;
    if (empathyExpressions > 0) patientCenteredScore += 10;
    patientCenteredScore = Math.round(Math.min(100, Math.max(30, patientCenteredScore)));

    // Consultation Structure Score
    let structureScore = 72;
    if (studentMessages.length >= 4) structureScore += 12;
    if (studentMessages.length >= 8) structureScore += 8;
    structureScore = Math.round(Math.min(100, Math.max(35, structureScore)));

    // Overall Score (Weighted based on Rubric)
    const overallScore = Math.round(
      (historyScore * weights.historyTaking +
        commScore * weights.communication +
        reasoningScore * weights.clinicalReasoning +
        patientCenteredScore * weights.patientCenteredness +
        structureScore * weights.consultationStructure) /
        100
    );

    // Strengths and Improvements lists
    const strengths: string[] = [];
    const improvements: string[] = [];

    const coveredTitles = evidenceList.filter((e) => e.status === 'covered').map((e) => e.title);
    if (coveredTitles.length > 0) {
      strengths.push(`Explored ${coveredTitles.slice(0, 3).join(', ')} thoroughly.`);
    }
    if (openQuestions > 0) {
      strengths.push('Used open questions to allow the patient to express symptoms in their own words.');
    }
    if (jargonInstances === 0) {
      strengths.push('Avoided confusing medical jargon, maintaining patient-accessible language.');
    }
    if (empathyExpressions > 0) {
      strengths.push('Demonstrated reassuring, empathetic listening during symptom disclosure.');
    }

    const missedTitles = evidenceList.filter((e) => e.status === 'missed' && e.importance === 'required').map((e) => e.title);
    if (missedTitles.length > 0) {
      improvements.push(`Inquire about essential areas you missed: ${missedTitles.slice(0, 3).join(', ')}.`);
    }
    if (prematureDiagnosisDetected) {
      improvements.push('Avoid premature diagnostic closure — gather complete chronological history before proposing specific conditions.');
    }
    const missedRedFlags = evidenceList.filter((e) => e.status === 'missed' && e.importance === 'red_flag').map((e) => e.title);
    if (missedRedFlags.length > 0) {
      improvements.push(`Always screen for critical red flags such as ${missedRedFlags.join(', ')}.`);
    }
    if (!askedIce) {
      improvements.push('Elicit patient Ideas, Concerns, and Expectations (ICE) to build deeper rapport.');
    }

    // Personalized Learning Summary
    let overallSummary = `You conducted a focused clinical consultation with ${caseTitle}. You completed ${coveredCount} of ${rubricItems.length} core rubric areas. `;
    if (overallScore >= 80) {
      overallSummary += `Excellent structured history-taking with strong clinical reasoning and patient-centered communication.`;
    } else if (overallScore >= 60) {
      overallSummary += `Good foundational history. Focus next time on systematically covering pain radiation, risk factors, and vital red flags before reaching a conclusion.`;
    } else {
      overallSummary += `Solid start. Practice drilling deeper into the history of presenting complaint and ensuring all essential cardiac safety questions are systematically explored.`;
    }

    return {
      historyScore,
      communicationScore: commScore,
      reasoningScore,
      patientCenterednessScore: patientCenteredScore,
      structureScore,
      overallScore,
      coveredCount,
      partialCount,
      missedCount,
      totalCount: rubricItems.length,
      overallSummary,
      strengths,
      improvements,
      communicationFeedback: {
        questionStyle: `You asked ${openQuestions} open question(s) and ${closedQuestions} closed question(s). A funnel approach starting broad and narrowing into specific details is recommended.`,
        empathy: empathyExpressions > 0 ? 'Empathetic and reassuring demeanor acknowledged patient anxiety.' : 'Consider explicitly validating the patient’s discomfort and anxiety when they describe distressing symptoms.',
        jargonLevel: jargonInstances === 0 ? 'Appropriate lay terminology was maintained throughout.' : 'Avoid technical clinical jargon that may intimidate or confuse the patient.',
        listening: 'Active listening demonstrated through relevant follow-up questions.',
      },
      reasoningFeedback: {
        hypothesisDriven: coveredCount >= 3 ? 'Questions demonstrated logical hypothesis testing.' : 'Aim to link your questions directly to establishing or ruling out acute differential diagnoses.',
        redFlagExploration: redFlagsExplored === totalRedFlags && totalRedFlags > 0 ? 'All vital clinical red flags were screened.' : `Explored ${redFlagsExplored} of ${totalRedFlags} critical red flags. Ensure cardiac emergencies are systematically ruled out.`,
        prematureClosure: prematureDiagnosisDetected
          ? 'Premature diagnostic assumption detected. Complete the full history before suggesting diagnoses to the patient.'
          : 'Appropriately avoided premature diagnostic bias.',
      },
      structureFeedback: {
        flow: studentMessages.length >= 5 ? 'Consultation maintained a cohesive conversational arc.' : 'Expand the consultation length to ensure adequate depth across all history categories.',
        openingAndClosing: 'Maintained professional clinical presence from opening to conclusion.',
      },
      missedQuestions: missedQuestionsList.slice(0, 5),
      prematureDiagnosis: prematureDiagnosisDetected,
      evidence: evidenceList,
    };
  }
}
