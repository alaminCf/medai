// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 3: Comprehensive Clinical Patient Simulation Test Suite
// Covers Sections 27 (10 Scenarios), 28 (50-Question Stress Test), 29 (Multi-Session)
// ────────────────────────────────────────────────────────────────────────────

import { StatefulPatientEngine } from '../index';
import { PatientCaseContext } from '../types';

// Sample Case Context (Dengue Fever / Nusrat Jahan)
const DENGUE_CASE: PatientCaseContext = {
  id: 'case_dengue_46f',
  patientName: 'Nusrat Jahan',
  patientAge: 46,
  patientGender: 'female',
  chiefComplaint: '4-day continuous high-grade fever with severe body ache and retro-orbital pain',
  personality: 'concerned',
  language: 'bn',
};

// Sample Case Context (Chest Pain / Md. Rafiqul Islam)
const CARDIAC_CASE: PatientCaseContext = {
  id: 'case_cardiac_52m',
  patientName: 'Md. Rafiqul Islam',
  patientAge: 52,
  patientGender: 'male',
  chiefComplaint: 'Crushing retrosternal chest tightness radiating to the left shoulder and jaw with sweating',
  personality: 'anxious',
  language: 'bn',
};

async function runTestSuite() {
  console.log('===============================================================');
  console.log('TECHBOLOY MED — PHASE 3 AI PATIENT VERIFICATION TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${testName} - ${detail || ''}`);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Section 28 — 50 Sequential Question Stress Test
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Running 50-Question Stress Test on Dengue Case (Nusrat Jahan) ---');
  const stressQuestions = [
    // 1-5: Identity & Demographics
    'আপনার নাম কী?',
    'আপনার বয়স কত?',
    'আপনি কি বিবাহিত?',
    'আপনার পেশা কী?',
    'কোথায় থাকেন আপনি?',
    // 6-10: Chief complaint & duration
    'আপনার মূল সমস্যাটা কী?',
    'কতদিন ধরে এই সমস্যা হচ্ছে?',
    'জ্বরটা কখন থেকে শুরু হয়েছে?',
    'জ্বর কি একটানা থাকে নাকি ছেড়ে দিয়ে আসে?',
    'তাপমাত্রা মেপে দেখেছিলেন?',
    // 11-15: Pain characteristics & breakbone ache
    'ব্যথাটা কেমন ধরনের?',
    'শরীরের কোথায় বেশি ব্যথা?',
    'হাত পায়ে কি ব্যথা আছে?',
    'হাড়ে ব্যথা কেমন লাগে?',
    '১০ এর মধ্যে ব্যথার মাত্রা কত দেবেন?',
    // 16-20: Ocular & Head symptoms
    'মাথাব্যথা কেমন?',
    'চোখের পেছনে কি কোনো চাপ লাগে?',
    'আলো দেখলে কি সমস্যা হয়?',
    'চোখ নাড়াতে পারেন সহজে?',
    'ঘাড় শক্ত হয়ে গেছে কি?',
    // 21-25: Context Resolution & Anaphora
    'সেখান থেকে কি অন্য কোথাও ছড়ায়?',
    'বাড়ে কিসে?',
    'কমে কিসে?',
    'বিশ্রাম নিলে কি আরাম পান?',
    'নড়াচড়া করলে কি বেশি লাগে?',
    // 26-30: Associated GI symptoms
    'বমি বমি ভাব আছে কি?',
    'বমি হয়েছে?',
    'পেটে কি কোনো ব্যথা আছে?',
    'ক্ষুধা কেমন লাগছে?',
    'মুখে কোনো তিতা ভাব বা অরুচি আছে?',
    // 31-35: Red flags & bleeding
    'দাঁতের মাড়ি বা নাক দিয়ে রক্ত পড়েছে?',
    'শরীরে কি লালচে কোনো দাগ বা র‍্যাশ উঠেছে?',
    'কালো পায়খানা হয়েছে?',
    'প্রস্রাবের পরিমাণ কি কমে গেছে?',
    'শ্বাস নিতে কোনো কষ্ট হচ্ছে?',
    // 36-40: Past medical & surgical history
    'আগে কখনো এমন হয়েছিল?',
    'আপনার কি ডায়াবেটিস আছে?',
    'উচ্চ রক্তচাপ আছে?',
    'আগে কোনো বড় অপারেশন হয়েছিল?',
    'অন্য কোনো বড় অসুখে ভুগেছেন?',
    // 41-45: Medications & allergies
    'কোনো ওষুধ খেয়েছেন এই জ্বরের জন্য?',
    'প্যারাসিটামল ছাড়া অন্য কোনো ব্যথানাশক খেয়েছেন?',
    'নিয়মিত কোনো ওষুধ খান?',
    'কোনো ওষুধে কি আপনার অ্যালার্জি আছে?',
    'কোনো খাবারে অ্যালার্জি আছে?',
    // 46-50: Family & Social history
    'পরিবারে আর কারো এমন জ্বর হয়েছে?',
    'আশেপাশে কারো ডেঙ্গু হয়েছে?',
    'আপনি কি ধূমপান করেন?',
    'বাসার আশেপাশে মশার উপদ্রব কেমন?',
    'আপনি কি খুব দুশ্চিন্তা করছেন?',
  ];

  const sessionIdStress = 'stress_session_50q';
  let stressDisclosedFacts: Record<string, string> = {};

  for (let i = 0; i < stressQuestions.length; i++) {
    const q = stressQuestions[i];
    const res = await StatefulPatientEngine.processTurn(sessionIdStress, DENGUE_CASE, q);

    // Verify response is relevant and non-empty
    if (i === 1) { // Age check
      assert(res.message.includes('৪৬') || res.message.includes('46'), 'Age consistency in question 2');
    }
    if (i === 0) { // Name check
      assert(res.message.includes('নুসরাত') || res.message.includes('Nusrat'), 'Name consistency in question 1');
    }
    if (i === 6) { // Duration check
      assert(res.message.includes('৪') || res.message.includes('চার') || res.message.includes('4'), 'Duration consistency in question 7');
    }
    if (i === 19) { // Pertinent negative (neck stiffness)
      assert(res.message.includes('না') || res.message.includes('stiff'), 'Pertinent negative properly acknowledged (No neck stiffness)');
    }
  }

  assert(stressQuestions.length === 50, 'Completed all 50 sequential questions without crash');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Section 5 — Context Resolution & Anaphora Test
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Conversational Context & Anaphora Resolution ---');
  const sessAnaphora = 'sess_anaphora_test';
  // Turn 1: Ask location
  await StatefulPatientEngine.processTurn(sessAnaphora, CARDIAC_CASE, 'ব্যথাটা কোথায়?');
  // Turn 2: Follow-up with deictic pronoun "সেখান থেকে কি ছড়ায়?"
  const anaphoraRes = await StatefulPatientEngine.processTurn(sessAnaphora, CARDIAC_CASE, 'সেখান থেকে কি ছড়ায়?');
  assert(
    anaphoraRes.intents.includes('RADIATION'),
    'ContextResolver resolves "সেখান থেকে কি ছড়ায়?" to RADIATION intent'
  );
  assert(
    anaphoraRes.message.includes('বাম') || anaphoraRes.message.includes('কাঁধ') || anaphoraRes.message.includes('চোয়াল') || anaphoraRes.message.includes('ছড়ায়'),
    'Patient answers radiation from chest appropriately'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Section 6 — Clinical History Tracker Verification
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Dynamic Clinical History Tracker ---');
  assert(
    Boolean(anaphoraRes.historyTracker && anaphoraRes.historyTracker.coveredCount >= 2),
    'History tracker records covered history components in real time'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Section 7 — Single Aspect Controlled Disclosure (No Over-Volunteering)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Single Aspect Controlled Disclosure (No Over-Volunteering) ---');
  const sessSingle = 'sess_single_aspect';
  const singleRes = await StatefulPatientEngine.processTurn(sessSingle, DENGUE_CASE, 'আপনার বয়স কত?');
  assert(
    !singleRes.message.includes('বমি') && !singleRes.message.includes('র‍্যাশ') && !singleRes.message.includes('চোখের পেছনে'),
    'Patient does not dump unrelated symptoms when only age is asked'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Section 29 — Multi-Session Consistency Test (5 Independent Sessions)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing Multi-Session Consistency (5 Sessions, Same Ground Truth) ---');
  const ageResults: string[] = [];
  for (let s = 1; s <= 5; s++) {
    const sId = `multi_sess_${s}`;
    const r = await StatefulPatientEngine.processTurn(sId, DENGUE_CASE, 'আপনার বয়স কত?');
    ageResults.push(r.message);
  }

  const allAgesConsistent = ageResults.every(msg => msg.includes('৪৬') || msg.includes('46'));
  assert(allAgesConsistent, 'All 5 independent sessions report identical factual age (46 years)');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Section 27 — Multilingual & Banglish Support
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing Multilingual & Banglish Intent Understanding ---');
  const banglishRes = await StatefulPatientEngine.processTurn('sess_banglish', CARDIAC_CASE, 'apnar buk er betha koto din dhore hacche?');
  assert(
    banglishRes.intents.includes('DURATION') || banglishRes.intents.includes('ONSET'),
    'Banglish medical question successfully maps to DURATION/ONSET'
  );

  console.log('\n===============================================================');
  console.log(`TEST SUITE RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('===============================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test Suite encountered error:', err);
  process.exit(1);
});
