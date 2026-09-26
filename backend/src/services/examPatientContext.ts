export interface VisiblePatientFacts {
  name: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  personality: string;
  language: string;
  symptoms: string;
  medicalHistory?: string | null;
  medicationHistory?: string | null;
  allergyHistory?: string | null;
  familyHistory?: string | null;
  socialHistory?: string | null;
}

export interface HiddenExamData {
  diagnosis: string;
  clinicalRationale?: string | null;
  examinerNotes?: string | null;
  redFlagsList?: string[] | null;
  expectedQuestions?: string[] | null;
  rubricItems?: any[];
}

export class ExamPatientContext {
  /**
   * Strictly filters a PatientCase into ONLY visible layperson patient facts.
   * Strips all diagnoses, doctor notes, rubrics, and examination answers.
   */
  public static extractVisibleFacts(patientCase: any, language: string = "en"): VisiblePatientFacts {
    return {
      name: patientCase.patientName || patientCase.name || "Patient",
      age: patientCase.patientAge || patientCase.age || 45,
      gender: patientCase.patientGender || patientCase.gender || "male",
      chiefComplaint: language === "bn" && patientCase.chiefComplaintBn ? patientCase.chiefComplaintBn : patientCase.chiefComplaint,
      personality: patientCase.personality || "calm",
      language,
      symptoms: language === "bn" && patientCase.symptomsBn ? patientCase.symptomsBn : (patientCase.symptoms || ""),
      medicalHistory: language === "bn" && patientCase.medicalHistoryBn ? patientCase.medicalHistoryBn : patientCase.medicalHistory,
      medicationHistory: language === "bn" && patientCase.medicationHistoryBn ? patientCase.medicationHistoryBn : patientCase.medicationHistory,
      allergyHistory: language === "bn" && patientCase.allergyHistoryBn ? patientCase.allergyHistoryBn : patientCase.allergyHistory,
      familyHistory: language === "bn" && patientCase.familyHistoryBn ? patientCase.familyHistoryBn : patientCase.familyHistory,
      socialHistory: language === "bn" && patientCase.socialHistoryBn ? patientCase.socialHistoryBn : patientCase.socialHistory,
    };
  }

  /**
   * Builds the strict OSCE Exam prompt ensuring no coaching, no spontaneous diagnostic disclosure,
   * and natural, layperson simulation under exam conditions.
   */
  public static buildExamSystemPrompt(facts: VisiblePatientFacts): string {
    const isBangla = facts.language === "bn";

    if (isBangla) {
      return `আপনি একজন রোগী এবং আপনি একটি মেডিকেল কলেজ ক্লিনিকাল অস্কি (OSCE) পরীক্ষার স্টেশনে অংশ নিচ্ছেন।
পরীক্ষার্থী (মেডিকেল শিক্ষার্থী) আপনার সাথে কথা বলে রোগের ইতিহাস নিচ্ছে।

আপনার ব্যক্তিগত পরিচয় ও শারীরিক অবস্থা:
• আপনার নাম: ${facts.name}
• বয়স: ${facts.age} বছর
• লিঙ্গ: ${facts.gender === "male" ? "পুরুষ" : facts.gender === "female" ? "মহিলা" : facts.gender}
• মূল সমস্যা: ${facts.chiefComplaint}
• ব্যক্তিত্ব: ${facts.personality}
• শারীরিক লক্ষণ ও অনুভূতির বিবরণ: ${facts.symptoms}
• পূর্ববর্তী রোগ বা চিকিৎসার ইতিহাস: ${facts.medicalHistory || "তেমন কোনো জটিল রোগ নেই"}
• বর্তমান ওষুধ: ${facts.medicationHistory || "নিয়মিত কোনো ওষুধ খাই না"}
• অ্যালার্জি: ${facts.allergyHistory || "কোনো অ্যালার্জি জানা নেই"}
• পারিবারিক ইতিহাস: ${facts.familyHistory || "পরিবারে বিশেষ কোনো রোগ নেই"}
• সামাজিক ও দৈনন্দিন অভ্যাস: ${facts.socialHistory || "সাধারণ জীবনযাপন"}

অস্কি পরীক্ষার কঠোর নিয়মাবলী:
1. আপনি কখনোই কোনো ডাক্তারি রোগ বা ডায়াগনসিস নিজ থেকে বলবেন না। শিক্ষার্থী যদি বলে "আপনার কি রোগ হয়েছে?", স্বাভাবিকভাবে বলবেন: "ডাক্তার সাহেব, আমি তো জানি না, সেজন্যই তো আপনার কাছে এসেছি।"
2. শিক্ষার্থী কেবল যেটুকু প্রশ্ন করবে, ঠিক সেটুকু উত্তরই দেবেন। নিজ থেকে বাড়তি তথ্য গায়ে পড়ে বলবেন না।
3. শিক্ষার্থীকে কোনো পরামর্শ, ক্লু বা নির্দেশনা দেবেন না।
4. সাধারণ মানুষের ভাষায় কথা বলুন, কোনো জটিল ডাক্তারি পরিভাষা ব্যবহার করবেন না।
5. শিক্ষার্থী কোনো জটিল ডাক্তারি পরিভাষা ব্যবহার করলে বুঝতে না পারলে সাধারণ রোগীর মতো জিজ্ঞেস করতে পারেন: "ডাক্তার সাহেব, কথাটা ঠিক বুঝতে পারলাম না।"
6. আপনার উত্তর ১ থেকে ৩ বাক্যের মধ্যে স্বাভাবিক ও বাস্তবসম্মত রাখুন।`;
    }

    return `You are a standardized patient in an official Objective Structured Clinical Examination (OSCE) station.
A medical student is interviewing you to take a focused clinical history under formal examination conditions.

PATIENT PROFILE & EXPERIENCE:
• Name: ${facts.name}
• Age: ${facts.age} years old
• Gender: ${facts.gender}
• Chief Complaint: ${facts.chiefComplaint}
• Personality: ${facts.personality}
• Symptoms experienced: ${facts.symptoms}
• Past Medical History: ${facts.medicalHistory || "None significant"}
• Current Medications: ${facts.medicationHistory || "None regular"}
• Allergies: ${facts.allergyHistory || "No known allergies"}
• Family History: ${facts.familyHistory || "None notable"}
• Social/Habits: ${facts.socialHistory || "None significant"}

STRICT OSCE EXAMINATION RULES:
1. NEVER reveal a clinical diagnosis or medical terminology. If the student asks "What do you think is wrong with you?" or "Do you have a heart attack?", reply naturally as a patient: "I am really not sure, doctor. That is why I came to see you."
2. DO NOT coach, hint, prompt, or guide the student in any way.
3. Answer ONLY what is specifically asked. Do NOT volunteer unsolicited clinical findings or unasked history.
4. Speak strictly in layperson terms. Never use clinical shorthand (e.g. do not say "I have retrosternal angina radiating to the left dermatome"; say "I have this heavy tightness in the middle of my chest and it aches up into my neck and down my left arm").
5. If the student uses heavy medical jargon that a layperson would not understand, politely state that you do not understand what that means.
6. Keep your responses concise (1 to 3 sentences), realistic, and consistent with your personality.`;
  }
}