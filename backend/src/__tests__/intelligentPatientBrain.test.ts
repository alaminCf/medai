import { StatefulPatientEngine } from "../services/patientEngine";
import { PatientCaseContext } from "../services/patientEngine/types";

// Nusrat Jahan Case Profile (From prompt specification: 46yo female with RLQ abdominal pain)
const nusratJahanCase: PatientCaseContext = {
  id: "case_nusrat_jahan_46f",
  patientName: "Nusrat Jahan",
  patientAge: 46,
  patientGender: "Female",
  chiefComplaint: "Right lower quadrant abdominal pain for 3 days",
  caseSummary: "46yo female presenting with 3-day history of right lower quadrant abdominal pain, mild fever, and nausea.",
  personality: "concerned",
  language: "bn",
  symptomDetails: "Pain started 3 days ago around the belly button and shifted to the right lower quadrant. Dull aching character, severity 6/10. No radiation to back or shoulder. Walking and movement make it worse, rest relieves it slightly. Constant throughout the day, gradually worsening. Associated with mild fever and persistent nausea. No vomiting, no diarrhea, normal urination. Loss of appetite.",
  medicalHistory: "No chronic medical illnesses like diabetes or hypertension.",
  medicationHistory: "No regular medications, only took paracetamol twice yesterday.",
  allergyHistory: "No known drug allergies.",
  familyHistory: "No significant family history of gastrointestinal diseases.",
  socialHistory: "Non-smoker, housewife, lives with husband and two children.",
  hiddenDiagnosis: "Acute Appendicitis",
  redFlags: "Right iliac fossa tenderness, localized peritonism",
};

async function runIntelligentBrainTestSuite() {
  console.log("════════════════════════════════════════════════════════════════════");
  console.log("  TECHBOLOY MED — INTELLIGENT PATIENT BRAIN TEST SUITE (PHASE 1)");
  console.log("  Testing Case: Nusrat Jahan, 46F — Acute Abdominal Pain");
  console.log("════════════════════════════════════════════════════════════════════\n");

  const sessionId = "test_brain_nusrat_" + Date.now();
  let passed = 0;
  let failed = 0;

  function assert(num: number, name: string, condition: boolean, details: string) {
    if (condition) {
      console.log(`✓ TEST ${num.toString().padStart(2, "0")} PASSED: ${name}`);
      passed++;
    } else {
      console.error(`✗ TEST ${num.toString().padStart(2, "0")} FAILED: ${name} — ${details}`);
      failed++;
    }
  }

  // 1. Age (Bangla)
  const t1 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "আপনার বয়স কত?");
  assert(1, "Demographics: Age in Bangla (আপনার বয়স কত?)", 
    t1.intents.includes("AGE") && (t1.message.includes("৪৬") || t1.message.includes("46")),
    `Response: "${t1.message}"`);

  // 2. Age (English)
  const t2 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "Could you tell me your age?");
  assert(2, "Demographics: Age in English", 
    t2.intents.includes("AGE") && (t2.message.includes("46") || t2.message.includes("৪৬")),
    `Response: "${t2.message}"`);

  // 3. Age (Banglish)
  const t3 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "Age koto apnar?");
  assert(3, "Demographics: Age in Banglish", 
    t3.intents.includes("AGE") && (t3.message.includes("46") || t3.message.includes("৪৬")),
    `Response: "${t3.message}"`);

  // 4. Name
  const t4 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "আপনার নাম কী?");
  assert(4, "Demographics: Name (আপনার নাম কী?)", 
    t4.intents.includes("NAME") && (t4.message.includes("Nusrat") || t4.message.includes("নুসরাত")),
    `Response: "${t4.message}"`);

  // 5. Occupation
  const t5 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "আপনি কি কোনো কাজ করেন? পেশা কী?");
  assert(5, "Demographics: Occupation", 
    t5.intents.includes("OCCUPATION"),
    `Response: "${t5.message}"`);

  // 6. Chief Complaint (Bangla)
  const t6 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "মূল সমস্যাটা কী বলুন তো?");
  assert(6, "Chief Complaint: Bangla (মূল সমস্যাটা কী?)", 
    t6.intents.includes("CHIEF_COMPLAINT") && (t6.message.toLowerCase().includes("pain") || t6.message.includes("ব্যথা")),
    `Response: "${t6.message}"`);

  // 7. Chief Complaint (English)
  const t7 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "What brings you in today?");
  assert(7, "Chief Complaint: English", 
    t7.intents.includes("CHIEF_COMPLAINT") && (t7.message.toLowerCase().includes("pain") || t7.message.includes("ব্যথা")),
    `Response: "${t7.message}"`);

  // 8. Duration (Bangla)
  const t8 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "কতদিন ধরে এই ব্যথা?");
  assert(8, "Duration: Bangla (কতদিন ধরে?)", 
    t8.intents.includes("DURATION") && (t8.message.includes("৩") || t8.message.includes("3") || t8.message.includes("তিন")),
    `Response: "${t8.message}"`);

  // 9. Duration (English)
  const t9 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "How long have you had this pain?");
  assert(9, "Duration: English", 
    t9.intents.includes("DURATION") && (t9.message.includes("3") || t9.message.includes("৩")),
    `Response: "${t9.message}"`);

  // 10. Location (Bangla)
  const t10 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "ব্যথাটা কোথায়?");
  assert(10, "Location: Bangla (ব্যথাটা কোথায়?)", 
    t10.intents.includes("LOCATION") && (t10.message.includes("ডান") || t10.message.includes("নিচে") || t10.message.toLowerCase().includes("right lower")),
    `Response: "${t10.message}"`);

  // 11. Location (English)
  const t11 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "Where exactly does it hurt?");
  assert(11, "Location: English", 
    t11.intents.includes("LOCATION") && (t11.message.toLowerCase().includes("lower") || t11.message.toLowerCase().includes("right") || t11.message.includes("ডান")),
    `Response: "${t11.message}"`);

  // 12. Character (Bangla)
  const t12 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "ব্যথাটা কেমন ধরনের?");
  assert(12, "Character: Bangla (ব্যথাটা কেমন?)", 
    t12.intents.includes("CHARACTER"),
    `Response: "${t12.message}"`);

  // 13. Severity (Bangla)
  const t13 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "ব্যথাটা কতটা তীব্র? ১ থেকে ১০ এর স্কেলে কত?");
  assert(13, "Severity: Bangla (১ থেকে ১০ এর মধ্যে কত?)", 
    t13.intents.includes("SEVERITY") && (t13.message.includes("৬") || t13.message.includes("6") || t13.message.includes("10") || t13.message.includes("১০")),
    `Response: "${t13.message}"`);

  // 14. Radiation (Bangla)
  const t14 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "ব্যথা কি অন্য কোথাও ছড়ায়?");
  assert(14, "Radiation: Bangla (অন্য কোথাও ছড়ায়?)", 
    t14.intents.includes("RADIATION") && (t14.message.includes("না") || t14.message.toLowerCase().includes("not spread")),
    `Response: "${t14.message}"`);

  // 15. Radiation (English)
  const t15 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "Does it go anywhere else?");
  assert(15, "Radiation: English (Does it go anywhere else?)", 
    t15.intents.includes("RADIATION"),
    `Response: "${t15.message}"`);

  // 16. Aggravating factors (Bangla)
  const t16 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "কিসে ব্যথা বাড়ে?");
  assert(16, "Aggravating: Bangla (কিসে বাড়ে?)", 
    t16.intents.includes("AGGRAVATING_FACTORS"),
    `Response: "${t16.message}"`);

  // 17. Aggravating factors (English)
  const t17 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "What makes the pain worse?");
  assert(17, "Aggravating: English", 
    t17.intents.includes("AGGRAVATING_FACTORS"),
    `Response: "${t17.message}"`);

  // 18. Relieving factors (Bangla)
  const t18 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "কিসে একটু আরাম পান?");
  assert(18, "Relieving: Bangla (কিসে আরাম পান?)", 
    t18.intents.includes("RELIEVING_FACTORS"),
    `Response: "${t18.message}"`);

  // 19. Fever (Bangla)
  const t19 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "জ্বর এসেছে কি?");
  assert(19, "Review of Systems: Fever (জ্বর এসেছে কি?)", 
    t19.intents.includes("FEVER") && (t19.message.includes("জ্বর") || t19.message.includes("গরম") || t19.message.toLowerCase().includes("fever")),
    `Response: "${t19.message}"`);

  // 20. Nausea (Bangla)
  const t20 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "বমি বমি ভাব বা nausea লাগছে?");
  assert(20, "Review of Systems: Nausea", 
    t20.intents.includes("NAUSEA") && (t20.message.includes("বমি বমি") || t20.message.includes("জি") || t20.message.toLowerCase().includes("nauseous")),
    `Response: "${t20.message}"`);

  // 21. Vomiting (Bangla - Negative finding: No vomiting)
  const t21 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "বমি হয়েছে?");
  assert(21, "Review of Systems: Vomiting Negative (বমি হয়েছে?)", 
    t21.intents.includes("VOMITING") && (t21.message.includes("না") || t21.message.toLowerCase().includes("haven't") || t21.message.toLowerCase().includes("no")),
    `Response: "${t21.message}"`);

  // 22. Vomiting (English)
  const t22 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "Have you vomited?");
  assert(22, "Review of Systems: Vomiting English", 
    t22.intents.includes("VOMITING") && (t22.message.toLowerCase().includes("no") || t22.message.toLowerCase().includes("haven't") || t22.message.includes("না")),
    `Response: "${t22.message}"`);

  // 23. Bowel habits (Bangla)
  const t23 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "পায়খানা কেমন হচ্ছে? পাতলা পায়খানা আছে?");
  assert(23, "Review of Systems: Bowel habits", 
    t23.intents.includes("BOWEL_HABITS") || t23.intents.includes("BOWEL_CHANGE"),
    `Response: "${t23.message}"`);

  // 24. Urinary symptoms (Bangla)
  const t24 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "প্রস্রাবে কোনো জ্বালাপোড়া বা কষ্ট আছে?");
  assert(24, "Review of Systems: Urinary symptoms", 
    t24.intents.includes("URINARY_SYMPTOMS"),
    `Response: "${t24.message}"`);

  // 25. Past Medical History (Bangla)
  const t25 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "আগে কি কোনো বড় অসুখ হয়েছিল? প্রেশার বা ডায়াবেটিস?");
  assert(25, "Past Medical History", 
    t25.intents.includes("PAST_MEDICAL_HISTORY"),
    `Response: "${t25.message}"`);

  // 26. Past Surgical History (Bangla)
  const t26 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "আগে কোনো অপারেশন বা সার্জারি হয়েছিল?");
  assert(26, "Past Surgical History", 
    t26.intents.includes("PAST_SURGICAL_HISTORY"),
    `Response: "${t26.message}"`);

  // 27. Medication History (Bangla)
  const t27 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "নিয়মিত কোনো ওষুধ খান?");
  assert(27, "Medication History", 
    t27.intents.includes("MEDICATION"),
    `Response: "${t27.message}"`);

  // 28. Allergy History (Bangla)
  const t28 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "কোনো ওষুধ বা খাবারে অ্যালার্জি আছে?");
  assert(28, "Allergy History", 
    t28.intents.includes("ALLERGY"),
    `Response: "${t28.message}"`);

  // 29. Family History (Bangla)
  const t29 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "পরিবারে কারও এমন কোনো রোগ আছে?");
  assert(29, "Family History", 
    t29.intents.includes("FAMILY_HISTORY"),
    `Response: "${t29.message}"`);

  // 30. Social History (Bangla)
  const t30 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "ধূমপান বা জর্দা খাওয়ার অভ্যাস আছে?");
  assert(30, "Social History / Smoking", 
    t30.intents.includes("SMOKING") || t30.intents.includes("SOCIAL_HISTORY"),
    `Response: "${t30.message}"`);

  // 31. Contextual Follow-up (Pronoun "সেখান থেকে")
  const t31 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "সেখান থেকে কি অন্য কোথাও যায়?");
  assert(31, "Contextual Follow-up: Pronoun Radiation (সেখান থেকে কি অন্য কোথাও যায়?)", 
    t31.intents.includes("RADIATION"),
    `Response: "${t31.message}"`);

  // 32. Contextual Follow-up (Pronoun "ওটা কি")
  const t32 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "ওটা কি খাওয়ার পরে বাড়ে?");
  assert(32, "Contextual Follow-up: Pronoun Aggravating (ওটা কি খাওয়ার পরে বাড়ে?)", 
    t32.intents.includes("AGGRAVATING_FACTORS"),
    `Response: "${t32.message}"`);

  // 33. Repeated Question Consistency (Age repeated)
  const t33 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "আপনার বয়স যেন কত বললেন?");
  assert(33, "Repetition Awareness & Consistency (বয়স কত বললেন?)", 
    (t33.message.includes("বলেছিলাম") || t33.message.includes("৪৬") || t33.message.includes("46")),
    `Response: "${t33.message}"`);

  // 34. Patient Boundary: Refuse Direct Diagnosis Query
  const t34 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "আপনার কি appendicitis হয়েছে?");
  assert(34, "Patient Boundary: Do Not Leak Diagnosis (আপনার কি appendicitis?)", 
    t34.intents.includes("DIRECT_DIAGNOSIS_QUERY") && (t34.message.includes("ডাক্তার") || t34.message.includes("জানি না")),
    `Response: "${t34.message}"`);

  // 35. Topic Boundary: Unrelated Question Handling
  const t35 = await StatefulPatientEngine.processTurn(sessionId, nusratJahanCase, "আজকে তো বিশ্বকাপ ফুটবল ফাইনাল, আপনি কাকে সাপোর্ট করছেন?");
  assert(35, "Topic Boundary: Unrelated Query (ফুটবল বিশ্বকাপ ফাইনাল)", 
    t35.intents.includes("UNRELATED_QUERY") && (t35.message.includes("চিকিৎসা") || t35.message.includes("অসুস্থ") || t35.message.includes("সম্পর্ক")),
    `Response: "${t35.message}"`);


  // ── Dengue Fever Case Tests (Bengali Chief Complaint & Colloquial Prompts) ──
  const dengueCase: PatientCaseContext = {
    id: "dengue-nusrat-46",
    patientName: "নুসরাত জাহান",
    patientAge: 46,
    patientGender: "Female",
    chiefComplaint: "আমার ৪ দিন ধরে তীব্র জ্বর, চোখের পেছনে ব্যথা এবং সারা শরীরে অসহ্য যন্ত্রণা হচ্ছে।",
    personality: "concerned",
    language: "bn",
  };
  const dengueSessionId = "dengue_session_" + Date.now();

  // 36. Colloquial Age: "তোমার এজ কত"
  const t36 = await StatefulPatientEngine.processTurn(dengueSessionId, dengueCase, "তোমার এজ কত");
  assert(36, "Colloquial Age: তোমার এজ কত",
    t36.intents.includes("AGE") && (t36.message.includes("৪৬") || t36.message.includes("46")),
    `Response: "${t36.message}"`);

  // 37. Colloquial Duration: "কতদিন যাবৎ তোমার এই সমস্যা হচ্ছে"
  const t37 = await StatefulPatientEngine.processTurn(dengueSessionId, dengueCase, "কতদিন যাবৎ তোমার এই সমস্যা হচ্ছে");
  assert(37, "Colloquial Duration: কতদিন যাবৎ তোমার এই সমস্যা হচ্ছে",
    t37.intents.includes("DURATION") && t37.message.includes("৪ দিন"),
    `Response: "${t37.message}"`);

  // 38. Decomposed Unicode Location: "ব্যথাটা ঠিক কোথায় হচ্ছে আঙুল দিয়ে দেখাবেন?"
  const t38 = await StatefulPatientEngine.processTurn(dengueSessionId, dengueCase, "ব্যথাটা ঠিক কোথায় হচ্ছে আঙুল দিয়ে দেখাবেন?");
  assert(38, "Decomposed Unicode Location: ব্যথাটা ঠিক কোথায় হচ্ছে আঙুল দিয়ে দেখাবেন?",
    t38.intents.includes("LOCATION") && (t38.message.includes("চোখের পেছনে") || t38.message.includes("সারা শরীরে")),
    `Response: "${t38.message}"`);

  // 39. Decomposed Unicode Radiation: "ব্যথা কি অন্য কোথাও যেমন হাত, গলা বা পিঠে ছড়িয়ে পড়ে?"
  const t39 = await StatefulPatientEngine.processTurn(dengueSessionId, dengueCase, "ব্যথা কি অন্য কোথাও যেমন হাত, গলা বা পিঠে ছড়িয়ে পড়ে?");
  assert(39, "Decomposed Unicode Radiation: ব্যথা কি অন্য কোথাও যেমন হাত, গলা বা পিঠে ছড়িয়ে পড়ে?",
    t39.intents.includes("RADIATION") && t39.message.includes("ছড়ায় না"),
    `Response: "${t39.message}"`);

  // 40. Decomposed Unicode Onset: "আপনার এই সমস্যা কবে থেকে শুরু হয়েছে?"
  const t40 = await StatefulPatientEngine.processTurn(dengueSessionId, dengueCase, "আপনার এই সমস্যা কবে থেকে শুরু হয়েছে?");
  assert(40, "Decomposed Unicode Onset: আপনার এই সমস্যা কবে থেকে শুরু হয়েছে?",
    t40.intents.includes("ONSET") && (t40.message.includes("৪ দিন আগে") || t40.message.includes("কয়েকদিন আগে")),
    `Response: "${t40.message}"`);

  // 41. Live Doctor Query: Vertex vs Occipital vs Midline Headache Localization
  const headacheCase = {
    id: "64935ee6-737e-4457-9ea0-39b50cc03a02",
    patientName: "নুসরাত জাহান",
    patientAge: 46,
    patientGender: "Female",
    chiefComplaint: "মাথার ডান পাশে তীব্র দপদপানি ব্যথা, আর আলো সহ্য হচ্ছে না।",
    personality: "concerned",
    language: "bn",
    symptomDetails: "Unilateral right-sided throbbing headache (8/10) that started 5 hours ago. Preceded by visual scintillating scotoma (zigzag flashing lights) 30 minutes prior. Photophobia, phonophobia, and severe nausea. No fever, no trauma, no neck stiffness, no weakness.",
    medicalHistory: "Recurrent episodic headaches 2-3 times per year. Otherwise healthy.",
    medicationHistory: "Takes Ibuprofen 400mg occasionally.",
    allergyHistory: "Allergic to penicillin.",
    familyHistory: "Mother suffered from classic migraines.",
    socialHistory: "Housewife, non-smoker.",
    hiddenDiagnosis: "Classic Migraine with Visual Aura",
  };
  const headacheSessionId = "session_headache_test_" + Date.now();

  const t41 = await StatefulPatientEngine.processTurn(headacheSessionId, headacheCase, "মাথার উপরের দিকে নাকি পেছনের দিক নাকি মাঝামাঝি অবস্থায় ব্যাথা করছে একটু ব্যাখ্যা কর বলতো");
  assert(41, "Headache Site: মাথার উপরে নাকি পেছনে নাকি মাঝামাঝি",
    t41.intents.includes("LOCATION") && t41.message.includes("ডানপাশে") && !t41.message.includes("মনে পড়ছে না"),
    `Response: "${t41.message}"`);

  // 42. Live Doctor Query: Frontal vs Occipital Headache Clarification
  const t42 = await StatefulPatientEngine.processTurn(headacheSessionId, headacheCase, "আমি বলছি তোমার মাথার সামনের দিকে ব্যথা বেশি হচ্ছে নাকি পেছনের দিকে");
  assert(42, "Headache Site Follow-up: সামনের দিকে নাকি পেছনের দিকে",
    t42.intents.includes("LOCATION") && t42.message.includes("ডানপাশে") && !t42.message.includes("মনে পড়ছে না"),
    `Response: "${t42.message}"`);

  // 43. Live Doctor Query: Ocular / Eye Ache In Migraine (চক্ষু ব্যথা)
  const t43 = await StatefulPatientEngine.processTurn(headacheSessionId, headacheCase, "মাথা ব্যথার সাথে কি তোমার চক্ষু ব্যথা করে");
  assert(43, "Ocular / Photophobia Assessment: চক্ষু ব্যথা করে কি",
    t43.intents.includes("OCULAR_SYMPTOM") && (t43.message.includes("চোখ") || t43.message.includes("আলো")) && !t43.message.includes("মনে পড়ছে না"),
    `Response: "${t43.message}"`);

  // 44. Pertinent Negative Screening: Neck Stiffness (Meningism)
  const t44 = await StatefulPatientEngine.processTurn(headacheSessionId, headacheCase, "ঘাড় কি শক্ত মনে হয়?");
  assert(44, "Pertinent Negative: ঘাড় শক্ত মনে হয় কি",
    t44.intents.includes("MENINGISM") && (t44.message.includes("ঘাড়ে কোনো ব্যথা") || t44.message.includes("না")),
    `Response: "${t44.message}"`);

  // 45. Pertinent Negative Screening: Head Trauma / Injury
  const t45 = await StatefulPatientEngine.processTurn(headacheSessionId, headacheCase, "মাথায় কোনো চোট লেগেছিল কি?");
  assert(45, "Pertinent Negative: মাথায় চোট লেগেছিল কি",
    t45.intents.includes("TRAUMA_HISTORY") && (t45.message.includes("আঘাত বা চোট লাগেনি") || t45.message.includes("না")),
    `Response: "${t45.message}"`);

  console.log("\n════════════════════════════════════════════════════════════════════");
  console.log(`  INTELLIGENT BRAIN TEST RESULTS: ${passed} PASSED / ${failed} FAILED (TOTAL 45)`);
  console.log("════════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runIntelligentBrainTestSuite().catch(err => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
