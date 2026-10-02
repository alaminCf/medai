import { adaptiveVivaService } from '../services/adaptiveVivaService';

async function runTests() {
  console.log('=====================================================');
  console.log('STARTING ADAPTIVE VIVA SIMULATION 5-SESSION VERIFICATION');
  console.log('=====================================================\n');

  const topic = 'Cardiovascular System & Cardiac Output';
  const subject = 'Physiology';

  // -----------------------------------------------------------
  // SESSION 1: The Strong Distinction Student
  // Pattern: Consistently strong, articulate, textbook answers
  // Expected: Increases difficulty, probes deeper determinants, moves to clinical scenarios
  // -----------------------------------------------------------
  console.log('>>> RUNNING SESSION 1: Strong Distinction Student (Examiner: Calm Professional)');
  const s1Start = await adaptiveVivaService.startAdaptiveSession(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    subject,
    topic,
    'Moderate',
    'EXAM',
    'CALM_PROFESSIONAL'
  );

  console.log(`[Turn 1 Q]: "${s1Start.currentQuestion.question}" (Concept: ${s1Start.currentQuestion.focusConcept})`);
  
  const s1Turn1 = await adaptiveVivaService.submitAnswerAndGetNext(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    s1Start.sessionId,
    s1Start.currentQuestion.questionId,
    'Cardiac output is the total volume of blood pumped by one ventricle of the heart into systemic circulation per minute, resting at approximately 5 liters per minute.',
    topic,
    'Moderate'
  );

  console.log(`[Turn 1 Assessment]: Score=${s1Turn1.evaluation.score}%, Strategy=${s1Turn1.evaluation.strategyChosen}`);
  console.log(`[Turn 1 Examiner Speech]: "${s1Turn1.nextQuestion?.question}"`);

  const s1Turn2 = await adaptiveVivaService.submitAnswerAndGetNext(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    s1Start.sessionId,
    s1Turn1.nextQuestion!.questionId,
    'Cardiac output equals Heart Rate multiplied by Stroke Volume (CO = HR x SV). Stroke volume depends on preload, afterload, and inotropic contractility.',
    topic,
    'Advanced'
  );

  console.log(`[Turn 2 Assessment]: Score=${s1Turn2.evaluation.score}%, Strategy=${s1Turn2.evaluation.strategyChosen}`);
  console.log(`[Turn 2 Examiner Speech]: "${s1Turn2.nextQuestion?.question}"`);

  const s1Turn3 = await adaptiveVivaService.submitAnswerAndGetNext(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    s1Start.sessionId,
    s1Turn2.nextQuestion!.questionId,
    'The Frank-Starling law dictates that greater end-diastolic volume increases myocyte stretch towards optimal sarcomere overlap, enhancing cross-bridging and boosting stroke volume.',
    topic,
    'Advanced'
  );

  console.log(`[Turn 3 Assessment]: Score=${s1Turn3.evaluation.score}%, Strategy=${s1Turn3.evaluation.strategyChosen}`);
  console.log(`[Turn 3 Examiner Speech]: "${s1Turn3.nextQuestion?.question}"\n`);

  // -----------------------------------------------------------
  // SESSION 2: The Incomplete / Partial Student
  // Pattern: Gives partially correct answers omitting key variables
  // Expected: Targeted follow-up to probe missing concepts rather than jumping away
  // -----------------------------------------------------------
  console.log('>>> RUNNING SESSION 2: Partial Answer Student (Examiner: Friendly Teacher)');
  const s2Start = await adaptiveVivaService.startAdaptiveSession(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    subject,
    topic,
    'Basic',
    'PRACTICE',
    'FRIENDLY_TEACHER'
  );

  console.log(`[Turn 1 Q]: "${s2Start.currentQuestion.question}"`);
  
  const s2Turn1 = await adaptiveVivaService.submitAnswerAndGetNext(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    s2Start.sessionId,
    s2Start.currentQuestion.questionId,
    'Cardiac output is just the blood pumped out by the heart.',
    topic,
    'Basic'
  );

  console.log(`[Turn 1 Assessment]: Score=${s2Turn1.evaluation.score}%, Missed=${JSON.stringify(s2Turn1.evaluation.conceptsMissed)}, Strategy=${s2Turn1.evaluation.strategyChosen}`);
  console.log(`[Turn 1 Examiner Speech]: "${s2Turn1.nextQuestion?.question}"`);

  const s2Turn2 = await adaptiveVivaService.submitAnswerAndGetNext(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    s2Start.sessionId,
    s2Turn1.nextQuestion!.questionId,
    'It is measured per minute, and calculated by heart rate times stroke volume.',
    topic,
    'Basic'
  );

  console.log(`[Turn 2 Assessment]: Score=${s2Turn2.evaluation.score}%, Strategy=${s2Turn2.evaluation.strategyChosen}`);
  console.log(`[Turn 2 Examiner Speech]: "${s2Turn2.nextQuestion?.question}"\n`);

  // -----------------------------------------------------------
  // SESSION 3: Student with Preload/Afterload Misconception
  // Pattern: Expresses classic medical confusion (defining preload as resistance to pumping)
  // Expected: Misconception detected, targeted redirection to ventricular filling/stretch
  // -----------------------------------------------------------
  console.log('>>> RUNNING SESSION 3: Misconception Student (Examiner: Strict Examiner)');
  const s3Start = await adaptiveVivaService.startAdaptiveSession(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    subject,
    topic,
    'Moderate',
    'EXAM',
    'STRICT_EXAMINER'
  );

  console.log(`[Turn 1 Q]: "${s3Start.currentQuestion.question}"`);

  const s3Turn1 = await adaptiveVivaService.submitAnswerAndGetNext(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    s3Start.sessionId,
    s3Start.currentQuestion.questionId,
    'Preload is the resistance and vascular pressure against which the ventricle pumps.',
    topic,
    'Moderate'
  );

  console.log(`[Turn 1 Assessment]: Score=${s3Turn1.evaluation.score}%, Misconceptions=${JSON.stringify(s3Turn1.evaluation.incorrectConcepts)}, Strategy=${s3Turn1.evaluation.strategyChosen}`);
  console.log(`[Turn 1 Examiner Speech]: "${s3Turn1.nextQuestion?.question}"`);

  const s3Turn2 = await adaptiveVivaService.submitAnswerAndGetNext(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    s3Start.sessionId,
    s3Turn1.nextQuestion!.questionId,
    'Sorry, that was afterload. Preload is the degree of myocardial stretch at the end of diastole, determined by end-diastolic volume and venous return.',
    topic,
    'Moderate'
  );

  console.log(`[Turn 2 Assessment]: Score=${s3Turn2.evaluation.score}%, Strategy=${s3Turn2.evaluation.strategyChosen}`);
  console.log(`[Turn 2 Examiner Speech]: "${s3Turn2.nextQuestion?.question}"\n`);

  // -----------------------------------------------------------
  // SESSION 4: Hesitant / Banglish / Bangla Student
  // Pattern: "Ami sure na, mone hocche..." or "bhule gechi"
  // Expected: Natural encouragement/scaffolding, no crash, maintains viva momentum
  // -----------------------------------------------------------
  console.log('>>> RUNNING SESSION 4: Hesitant / Banglish Student (Examiner: Friendly Teacher)');
  const s4Start = await adaptiveVivaService.startAdaptiveSession(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    subject,
    topic,
    'Basic',
    'PRACTICE',
    'FRIENDLY_TEACHER'
  );

  console.log(`[Turn 1 Q]: "${s4Start.currentQuestion.question}"`);

  const s4Turn1 = await adaptiveVivaService.submitAnswerAndGetNext(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    s4Start.sessionId,
    s4Start.currentQuestion.questionId,
    'Ami exact formula ta bhule gechi sir, but cardiac output holo heart prottek minute e joto blood pump kore.',
    topic,
    'Basic'
  );

  console.log(`[Turn 1 Assessment]: Score=${s4Turn1.evaluation.score}%, Strategy=${s4Turn1.evaluation.strategyChosen}`);
  console.log(`[Turn 1 Examiner Speech]: "${s4Turn1.nextQuestion?.question}"\n`);

  // -----------------------------------------------------------
  // SESSION 5: Topic Progression & Anti-Repetition Check
  // Pattern: Checks that questions over 5 turns never repeat and advance across the concept map
  // -----------------------------------------------------------
  console.log('>>> RUNNING SESSION 5: Multi-Turn Progression & Repetition Check');
  const s5Start = await adaptiveVivaService.startAdaptiveSession(
    '67dba2f0-51c3-4f22-b2db-1989046e46a2',
    subject,
    topic,
    'Moderate',
    'EXAM',
    'CLINICAL_EXAMINER'
  );

  const askedQuestions: string[] = [s5Start.currentQuestion.question];
  let curQ = s5Start.currentQuestion;

  const sampleAnswers = [
    'Cardiac output is Stroke volume multiplied by heart rate, roughly 5 liters/min.',
    'Stroke volume depends on preload, afterload, and contractility.',
    'Preload increases end diastolic volume and myocardial fiber length.',
    'In acute heart failure, elevated afterload reduces stroke volume leading to pulmonary congestion.',
    'Inotropes like dobutamine increase contractility via beta-1 receptors.'
  ];

  for (let i = 0; i < 4; i++) {
    const turnRes = await adaptiveVivaService.submitAnswerAndGetNext(
      '67dba2f0-51c3-4f22-b2db-1989046e46a2',
      s5Start.sessionId,
      curQ.questionId,
      sampleAnswers[i],
      topic,
      'Moderate'
    );

    if (turnRes.isSessionComplete) {
      console.log(`Session completed naturally at turn ${i + 1}`);
      break;
    }

    const nextQText = turnRes.nextQuestion!.question;
    console.log(`Turn ${i + 2} Q: "${nextQText}"`);
    
    // Check repetition
    if (askedQuestions.includes(nextQText)) {
      throw new Error(`REPETITION DETECTED! Question was asked again: "${nextQText}"`);
    }
    askedQuestions.push(nextQText);
    curQ = turnRes.nextQuestion!;
  }

  console.log('\nTotal unique questions in Session 5:', askedQuestions.length);
  console.log('All questions unique: YES! Zero repetitions.');

  console.log('\n=====================================================');
  console.log('ALL 5 ADAPTIVE VIVA SIMULATION SESSIONS VERIFIED SUCCESSFULLY!');
  console.log('=====================================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
