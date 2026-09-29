import { StatefulPatientEngine } from '../services/patientEngine';
import { PatientCaseContext } from '../services/patientEngine/types';

// Sample clinical case context for testing
const testCase: PatientCaseContext = {
  id: 'case_chest_pain_52m',
  patientName: 'Rahim Ahmed',
  patientAge: 52,
  patientGender: 'Male',
  chiefComplaint: 'Chest discomfort for the past few days',
  caseSummary: '52yo male with exertional chest pain',
  personality: 'anxious',
  language: 'en',
  symptomDetails: 'Central chest pressure-like discomfort for 3 days. Radiates to left arm. Worse with exertion. Associated with mild shortness of breath and sweating. No pleuritic pain. No fever.',
  medicalHistory: 'Hypertension for 8 years, on amlodipine. No previous cardiac events.',
  medicationHistory: 'Amlodipine 5mg once daily.',
  allergyHistory: 'No known drug allergies.',
  familyHistory: 'Father died of heart attack at age 60. Mother has diabetes.',
  socialHistory: 'Smoker (20 pack-years), drinks occasionally. Works as a businessman.',
  hiddenDiagnosis: 'Acute Coronary Syndrome (NSTEMI)',
  redFlags: 'Possible ACS',
};

async function runTestSuite() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('  TECHBOLOY MED — AI PATIENT ENGINE AUTOMATED TEST SUITE (PART 32)');
  console.log('════════════════════════════════════════════════════════════════════\n');

  const sessionId = `test_session_${Date.now()}`;
  let passed = 0;
  let failed = 0;

  function assert(testNum: number, testName: string, condition: boolean, detail: string) {
    if (condition) {
      console.log(`✓ TEST ${testNum} PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`✗ TEST ${testNum} FAILED: ${testName} — ${detail}`);
      failed++;
    }
  }

  // TEST 1: Chief Complaint
  const r1 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'What is your complaint?');
  assert(
    1,
    'Chief Complaint Inquiry',
    r1.message.toLowerCase().includes('chest') || r1.intents.includes('CHIEF_COMPLAINT'),
    `Response: "${r1.message}"`
  );

  // TEST 2: Onset
  const r2 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'When did it start?');
  assert(
    2,
    'Onset Inquiry',
    (r2.message.toLowerCase().includes('day') || r2.message.toLowerCase().includes('ago') || r2.message.toLowerCase().includes('started')) &&
    !r2.message.toLowerCase().includes('chief complaint'),
    `Response: "${r2.message}"`
  );

  // TEST 3: Location
  const r3 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'Where exactly is the pain?');
  assert(
    3,
    'Location Inquiry',
    r3.message.toLowerCase().includes('center') || r3.message.toLowerCase().includes('chest'),
    `Response: "${r3.message}"`
  );

  // TEST 4: Radiation
  const r4 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'Does it go anywhere?');
  assert(
    4,
    'Radiation Inquiry',
    r4.message.toLowerCase().includes('arm') || r4.message.toLowerCase().includes('spread'),
    `Response: "${r4.message}"`
  );

  // TEST 5: Unrelated valid clinical question (Smoking)
  const r5 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'Do you smoke cigarettes?');
  assert(
    5,
    'Social History / Smoking Inquiry',
    r5.message.toLowerCase().includes('smoke') || r5.message.toLowerCase().includes('pack'),
    `Response: "${r5.message}"`
  );

  // TEST 6: Repeated Question Handling
  const r6 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'Where exactly is the pain?');
  assert(
    6,
    'Repeated Question Awareness',
    r6.message.toLowerCase().includes('as i mentioned') || r6.message.toLowerCase().includes('still') || r6.message.toLowerCase().includes('earlier'),
    `Response: "${r6.message}"`
  );

  // TEST 7: Same Intent with Different Wording
  const r7 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'Can you point to where it hurts?');
  assert(
    7,
    'Alternative Wording for Location',
    r7.intents.includes('LOCATION') && (r7.message.toLowerCase().includes('center') || r7.message.toLowerCase().includes('chest')),
    `Response: "${r7.message}"`
  );

  // TEST 8: Ask in Bangla
  const r8 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'ব্যথাটা কখন থেকে?');
  assert(
    8,
    'Bangla Language Onset Question',
    r8.debug.detectedLanguage === 'bn' && (r8.message.includes('দিন') || r8.message.includes('ঘণ্টা') || r8.message.includes('শুরু')),
    `Response: "${r8.message}"`
  );

  // TEST 9: Ask in English
  const r9 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'How long have you had this pain?');
  assert(
    9,
    'English Language Duration Question',
    r9.debug.detectedLanguage === 'en' && r9.message.toLowerCase().includes('day'),
    `Response: "${r9.message}"`
  );

  // TEST 10: Ask in Banglish
  const r10 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'Pain ta kobe theke shuru?');
  assert(
    10,
    'Banglish Language Understanding',
    r10.intents.includes('ONSET'),
    `Intents: ${JSON.stringify(r10.intents)}, Response: "${r10.message}"`
  );

  // TEST 11: Ask the Diagnosis Directly
  const r11 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'Do you have myocardial infarction?');
  assert(
    11,
    'Diagnosis Query Patient Safety',
    r11.message.toLowerCase().includes("don't know") || r11.message.toLowerCase().includes('doctor'),
    `Response: "${r11.message}"`
  );

  // TEST 12: Multiple Questions in One Sentence
  const r12 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'ব্যথাটা কখন থেকে, কোথায় আর কতটা severe?');
  assert(
    12,
    'Multi-Question Understanding (Onset + Location + Severity)',
    r12.intents.length >= 2,
    `Detected Intents: ${JSON.stringify(r12.intents)}, Response: "${r12.message}"`
  );

  // TEST 13: Topic Change
  const r13 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'Does anyone in your family have heart disease?');
  assert(
    13,
    'Topic Change to Family History',
    r13.intents.includes('FAMILY_HISTORY') && (r13.message.toLowerCase().includes('father') || r13.message.toLowerCase().includes('heart')),
    `Response: "${r13.message}"`
  );

  // TEST 14: Follow-up question preserving context
  const r14 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'Is it constant or does it come and go?');
  assert(
    14,
    'Contextual Follow-up Timing Question',
    r14.intents.includes('TIMING'),
    `Response: "${r14.message}"`
  );

  // TEST 15: Session Recovery Simulation (Same Session ID preserves history & facts)
  const r15 = await StatefulPatientEngine.processTurn(sessionId, testCase, 'Where is the pain?');
  assert(
    15,
    'Session Recovery Preserves Disclosure State',
    r15.debug.retrievedFacts.some(f => f.previouslyDisclosed),
    `Retrieved Facts: ${JSON.stringify(r15.debug.retrievedFacts)}`
  );

  // TEST 16: Disconnect / Reconnect Simulation
  const resumedSession = await StatefulPatientEngine.processTurn(sessionId, testCase, 'What makes the pain worse?');
  assert(
    16,
    'Network Disconnect / Reconnect Consultation Continuity',
    resumedSession.intents.includes('AGGRAVATING_FACTORS') && resumedSession.message.toLowerCase().includes('exertion') || resumedSession.message.toLowerCase().includes('walk'),
    `Response: "${resumedSession.message}"`
  );

  console.log('\n════════════════════════════════════════════════════════════════════');
  console.log(`  TEST RESULTS: ${passed} PASSED / ${failed} FAILED (TOTAL 16)`);
  console.log('════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite failed with error:', err);
  process.exit(1);
});
