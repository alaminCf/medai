const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedExam() {
  console.log('Seeding Phase 5 Demo 5-Station Clinical Exam...');

  // 1. Fetch the 5 patient cases
  const caseChestPain = await prisma.patientCase.findUnique({ where: { slug: 'chest-pain-rahim' } });
  const caseHeadache = await prisma.patientCase.findUnique({ where: { slug: 'headache-tanvir' } });
  const caseAbdominal = await prisma.patientCase.findUnique({ where: { slug: 'abdominal-pain-nusrat' } });
  const caseDyspnea = await prisma.patientCase.findUnique({ where: { slug: 'dyspnea-abdul' } });
  const caseFever = await prisma.patientCase.findUnique({ where: { slug: 'fever-fatima' } });

  if (!caseChestPain || !caseHeadache || !caseAbdominal || !caseDyspnea || !caseFever) {
    throw new Error('Could not find all 5 patient cases. Please ensure Phase 1 cases are seeded.');
  }

  // 2. Upsert the ClinicalExam
  const examSlug = 'clinical-history-taking-osce-demo';
  const existingExam = await prisma.clinicalExam.findUnique({ where: { slug: examSlug } });

  if (existingExam) {
    console.log('Exam already exists, removing old stations and rubrics to re-seed cleanly...');
    await prisma.clinicalExam.delete({ where: { id: existingExam.id } });
  }

  const exam = await prisma.clinicalExam.create({
    data: {
      title: 'Clinical History Taking OSCE — Demo',
      slug: examSlug,
      description: 'A formal 5-station objective structured clinical examination testing focused medical history taking, communication, red-flag screening, and patient-centered clinical skills.',
      instructions: `EXAMINATION RULES:
• Read the station candidate instructions carefully before starting each consultation.
• Each station has a strict time limit of 6 minutes (360 seconds).
• The station timer is server-authoritative and cannot be paused.
• The virtual patient will answer according to case facts but will not coach you or volunteer unprompted clinical data.
• At 00:00, the station will automatically end and transition to the next station.
• No checklist or marks will be visible during the consultation.
• Full structured OSCE marking, domain breakdowns, and evidence-based feedback will be revealed upon exam completion.`,
      durationMinutes: 30,
      stationCount: 5,
      difficulty: 'intermediate',
      status: 'published',
      voiceRequired: false,
      showLiveTranscript: true,
      fullscreenRequired: false,
      showDetailedFeedback: true,
      allowRetake: true,
      maxAttempts: 5,
      passingPercentage: 60.0,
      stations: {
        create: [
          // Station 1: Chest Pain
          {
            stationNumber: 1,
            title: 'Station 1: Chest Pain — Focused History',
            instructions: 'Examiner notes: Patient is Rahim Ahmed with acute coronary syndrome / unstable angina. Critical safety: must screen for diaphoresis, radiation, cardiac risk factors and red flags.',
            candidateInstructions: 'You are seeing Mr. Rahim Ahmed, a 52-year-old businessman presenting to the emergency assessment clinic with retrosternal chest tightness. You have 6 minutes to take a focused clinical history. Introduce yourself, clarify the chief complaint, rule out red flags, and explore relevant medical/lifestyle history. You do not need to perform an examination or state a final diagnosis.',
            timeLimitSeconds: 360,
            passingScore: 12.0,
            patientCaseId: caseChestPain.id,
            osceRubric: {
              create: {
                title: 'Chest Pain Station OSCE Rubric',
                totalMarks: 20.0,
                passingMarks: 12.0,
                items: {
                  create: [
                    { category: 'Introduction & Consent', criterion: 'Introduces self with name and professional role', intent: 'introduction', marks: 1.0, required: true, severity: 'important' },
                    { category: 'Introduction & Consent', criterion: 'Confirms patient identity and secures verbal consent', intent: 'consent', marks: 1.0, required: true, severity: 'important' },
                    { category: 'History of Presenting Complaint', criterion: 'Explores pain onset and temporal characteristics', intent: 'pain_onset', marks: 2.0, required: true, severity: 'important' },
                    { category: 'History of Presenting Complaint', criterion: 'Clarifies exact site and radiation (jaw, left arm, neck)', intent: 'pain_radiation', marks: 2.0, required: true, isCritical: true, severity: 'critical' },
                    { category: 'History of Presenting Complaint', criterion: 'Assesses severity on 1-10 numerical scale and pain character', intent: 'pain_character_severity', marks: 2.0, required: true, severity: 'important' },
                    { category: 'History of Presenting Complaint', criterion: 'Explores aggravating/relieving factors (exertion, rest, nitroglycerin)', intent: 'pain_aggravating_relieving', marks: 1.5, required: true, severity: 'important' },
                    { category: 'Red Flags & Associated Symptoms', criterion: 'Screens for diaphoresis (sweating) and dyspnea', intent: 'associated_diaphoresis_dyspnea', marks: 2.0, required: true, isCritical: true, severity: 'critical' },
                    { category: 'Red Flags & Associated Symptoms', criterion: 'Screens for nausea, lightheadedness, or palpitations', intent: 'associated_nausea_presyncope', marks: 1.5, required: false, severity: 'important' },
                    { category: 'Past History & Risk Factors', criterion: 'Inquires about hypertension, diabetes, hyperlipidemia, and family history of CAD', intent: 'cardiac_risk_factors', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Medications & Habits', criterion: 'Clarifies current medications, smoking status, and substance use', intent: 'medications_and_smoking', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Patient-Centeredness', criterion: 'Explores patient Ideas, Concerns, and Expectations (ICE)', intent: 'ice_exploration', marks: 1.5, required: false, severity: 'supplementary' },
                    { category: 'Communication & Structure', criterion: 'Empathic tone, active listening, and structured closing summary', intent: 'closing_summary', marks: 1.5, required: true, severity: 'important' },
                  ]
                }
              }
            }
          },
          // Station 2: Headache
          {
            stationNumber: 2,
            title: 'Station 2: Headache — Focused History',
            instructions: 'Examiner notes: Tanvir Hossain presenting with recurring unilateral pulsating headache with photo/phonophobia (migraine). Red flag check: subarachnoid thunderclap, fever, neck stiffness.',
            candidateInstructions: 'You are seeing Mr. Tanvir Hossain, a 28-year-old software engineer presenting with severe recurrent headaches. You have 6 minutes to conduct a focused neurological history. Explore headache characteristics, identify triggers, exclude intracranial red flags, and evaluate impact on daily functioning.',
            timeLimitSeconds: 360,
            passingScore: 12.0,
            patientCaseId: caseHeadache.id,
            osceRubric: {
              create: {
                title: 'Headache Station OSCE Rubric',
                totalMarks: 20.0,
                passingMarks: 12.0,
                items: {
                  create: [
                    { category: 'Introduction & Consent', criterion: 'Professional introduction and rapport establishment', intent: 'introduction', marks: 1.5, required: true, severity: 'important' },
                    { category: 'History of Presenting Complaint', criterion: 'Explores headache onset, frequency, and duration of attacks', intent: 'headache_temporal', marks: 2.0, required: true, severity: 'important' },
                    { category: 'History of Presenting Complaint', criterion: 'Identifies unilateral vs bilateral location and pulsating character', intent: 'headache_character', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Red Flags', criterion: 'Explicitly rules out thunderclap onset ("worst headache of life")', intent: 'red_flag_thunderclap', marks: 2.5, required: true, isCritical: true, severity: 'critical' },
                    { category: 'Red Flags', criterion: 'Screens for fever, neck stiffness, rash, or focal neurological deficits', intent: 'red_flag_meningism_deficits', marks: 2.5, required: true, isCritical: true, severity: 'critical' },
                    { category: 'Associated Symptoms', criterion: 'Asks about nausea/vomiting, photophobia, and phonophobia', intent: 'migraine_features', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Associated Symptoms', criterion: 'Screens for visual aura (scintillating scotoma, zigzags) before headache', intent: 'aura_exploration', marks: 1.5, required: false, severity: 'important' },
                    { category: 'Triggers & Lifestyle', criterion: 'Explores triggers (screen time, sleep deprivation, stress, caffeine/meals)', intent: 'headache_triggers', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Medications', criterion: 'Reviews current analgesics and warns about medication-overuse headache', intent: 'medication_use', marks: 1.5, required: false, severity: 'supplementary' },
                    { category: 'Patient-Centeredness & Communication', criterion: 'Validates discomfort and provides empathetic closing', intent: 'empathy_and_closing', marks: 2.5, required: true, severity: 'important' },
                  ]
                }
              }
            }
          },
          // Station 3: Abdominal Pain
          {
            stationNumber: 3,
            title: 'Station 3: Abdominal Pain — Focused History',
            instructions: 'Examiner notes: Nusrat Jahan with right iliac fossa pain (acute appendicitis suspect). Red flags: peritoneal signs, vomiting, fever, last menstrual period to exclude ectopic.',
            candidateInstructions: 'You are seeing Ms. Nusrat Jahan, a 34-year-old teacher presenting with worsening lower abdominal pain. You have 6 minutes to obtain a focused gastrointestinal and gynecological history. Elicit pain evolution, evaluate peritoneal red flags, and assess relevant menstrual and surgical history.',
            timeLimitSeconds: 360,
            passingScore: 12.0,
            patientCaseId: caseAbdominal.id,
            osceRubric: {
              create: {
                title: 'Abdominal Pain Station OSCE Rubric',
                totalMarks: 20.0,
                passingMarks: 12.0,
                items: {
                  create: [
                    { category: 'Introduction & Consent', criterion: 'Appropriate greeting, introduction, and privacy reassurance', intent: 'introduction', marks: 1.5, required: true, severity: 'important' },
                    { category: 'History of Presenting Complaint', criterion: 'Traces pain migration from periumbilical to right iliac fossa', intent: 'pain_migration', marks: 2.5, required: true, isCritical: true, severity: 'critical' },
                    { category: 'History of Presenting Complaint', criterion: 'Explores pain quality, aggravating factors (coughing/movement/bumps)', intent: 'peritoneal_irritation_clues', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Associated Symptoms', criterion: 'Asks regarding anorexia, nausea, and vomiting sequence', intent: 'anorexia_vomiting', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Associated Symptoms', criterion: 'Evaluates bowel habits (diarrhea/constipation) and urinary symptoms (dysuria)', intent: 'bowel_and_urinary', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Red Flags & Gynecological', criterion: 'Inquires about Last Menstrual Period (LMP) and pregnancy risk (ectopic)', intent: 'gyne_lmp_screen', marks: 2.5, required: true, isCritical: true, severity: 'critical' },
                    { category: 'Red Flags', criterion: 'Asks about fever, chills, and rigors', intent: 'fever_screen', marks: 1.5, required: true, severity: 'important' },
                    { category: 'Past Medical & Surgical', criterion: 'Screens for past abdominal surgeries (appendectomy/laparoscopy) and medical conditions', intent: 'surgical_history', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Patient-Centeredness', criterion: 'Explores patient concerns and pain management expectations', intent: 'patient_concerns', marks: 2.0, required: false, severity: 'supplementary' },
                    { category: 'Communication & Structure', criterion: 'Logical flow, clear non-jargoned questions, and professional closure', intent: 'consultation_structure', marks: 2.0, required: true, severity: 'important' },
                  ]
                }
              }
            }
          },
          // Station 4: Shortness of Breath
          {
            stationNumber: 4,
            title: 'Station 4: Shortness of Breath — Focused History',
            instructions: 'Examiner notes: Abdul Karim, 64 yo with progressive dyspnea, orthopnea, ankle swelling (congestive heart failure / COPD overlap). Red flags: chest pain, hemoptysis, syncope.',
            candidateInstructions: 'You are seeing Mr. Abdul Karim, a 64-year-old retired clerk presenting with worsening shortness of breath over the past three weeks. You have 6 minutes to take a comprehensive cardiopulmonary history. Clarify functional exercise tolerance, evaluate heart failure and pulmonary symptoms, and exclude acute red flags.',
            timeLimitSeconds: 360,
            passingScore: 12.0,
            patientCaseId: caseDyspnea.id,
            osceRubric: {
              create: {
                title: 'Dyspnea Station OSCE Rubric',
                totalMarks: 20.0,
                passingMarks: 12.0,
                items: {
                  create: [
                    { category: 'Introduction & Consent', criterion: 'Introduces self, acknowledges breathlessness, and adjusts pace', intent: 'introduction', marks: 1.5, required: true, severity: 'important' },
                    { category: 'History of Presenting Complaint', criterion: 'Assesses onset, progression, and exercise tolerance (walking distance / stairs)', intent: 'exercise_tolerance', marks: 2.5, required: true, severity: 'important' },
                    { category: 'Cardiovascular Assessment', criterion: 'Explicitly inquires about orthopnea (pillows needed) and paroxysmal nocturnal dyspnea (PND)', intent: 'orthopnea_pnd', marks: 2.5, required: true, isCritical: true, severity: 'critical' },
                    { category: 'Cardiovascular Assessment', criterion: 'Checks for bilateral peripheral ankle edema', intent: 'peripheral_edema', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Respiratory Assessment', criterion: 'Explores cough, sputum color/volume, and wheezing', intent: 'cough_and_sputum', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Red Flags', criterion: 'Excludes acute chest pain, hemoptysis (blood in sputum), and syncope/collapse', intent: 'respiratory_red_flags', marks: 2.5, required: true, isCritical: true, severity: 'critical' },
                    { category: 'Risk Factors & Smoking', criterion: 'Details smoking history in pack-years and occupational dust/toxin exposures', intent: 'smoking_pack_years', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Past Medical & Medications', criterion: 'Inquires about cardiac history, inhalers, diuretics, or medication compliance', intent: 'cardiopulmonary_meds', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Patient-Centeredness & ICE', criterion: 'Asks about fear of losing independence or nightly sleep disruption', intent: 'patient_concerns', marks: 1.5, required: false, severity: 'supplementary' },
                    { category: 'Communication & Closure', criterion: 'Structured summary with reassuring and supportive bedside manner', intent: 'closing_summary', marks: 1.5, required: true, severity: 'important' },
                  ]
                }
              }
            }
          },
          // Station 5: Fever & Malaise
          {
            stationNumber: 5,
            title: 'Station 5: Fever & Malaise — Focused History',
            instructions: 'Examiner notes: Fatima Begum with 5 days high-grade fever, retro-orbital headache, severe arthralgia (dengue fever suspicion in endemic setting). Red flags: mucosal bleeding, severe abdominal pain, persistent vomiting, oliguria.',
            candidateInstructions: 'You are seeing Ms. Fatima Begum, a 42-year-old homemaker presenting with 5 days of high continuous fever, severe body ache, and profound fatigue. You have 6 minutes to gather a focused infective history. Localize the potential source of infection, screen for hemodynamic and bleeding warning signs, and investigate epidemiological risks.',
            timeLimitSeconds: 360,
            passingScore: 12.0,
            patientCaseId: caseFever.id,
            osceRubric: {
              create: {
                title: 'Fever Station OSCE Rubric',
                totalMarks: 20.0,
                passingMarks: 12.0,
                items: {
                  create: [
                    { category: 'Introduction & Consent', criterion: 'Warm professional greeting, role clarification, and consent', intent: 'introduction', marks: 1.5, required: true, severity: 'important' },
                    { category: 'History of Presenting Complaint', criterion: 'Explores fever pattern, measured temperature, chills, and duration', intent: 'fever_characteristics', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Systemic Review & Source Search', criterion: 'Asks regarding retro-orbital eye pain, rash, and intense bone/joint aches', intent: 'dengue_symptoms', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Systemic Review & Source Search', criterion: 'Screens respiratory (cough), urinary (dysuria), and GI (diarrhea) foci', intent: 'infection_source_search', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Red Flags & Warning Signs', criterion: 'Explicitly checks for bleeding manifestations (epistaxis, gum bleed, melena, petechiae)', intent: 'bleeding_warning_signs', marks: 2.5, required: true, isCritical: true, severity: 'critical' },
                    { category: 'Red Flags & Warning Signs', criterion: 'Screens for severe abdominal pain, persistent vomiting, and fluid intake / urine output', intent: 'hemodynamic_warning_signs', marks: 2.5, required: true, isCritical: true, severity: 'critical' },
                    { category: 'Epidemiological History', criterion: 'Inquires about mosquito exposure, local dengue outbreak, and travel history', intent: 'mosquito_travel_exposure', marks: 2.0, required: true, severity: 'important' },
                    { category: 'Medications & Antipyretics', criterion: 'Reviews paracetamol dosage and cautions against NSAIDs (ibuprofen/aspirin)', intent: 'antipyretic_use', marks: 1.5, required: true, severity: 'important' },
                    { category: 'Past Medical & Family', criterion: 'Screens for diabetes, immunosuppression, or family members with similar fever', intent: 'past_history', marks: 1.5, required: false, severity: 'supplementary' },
                    { category: 'Communication & Closure', criterion: 'Empathetic wrap-up, checks understanding, outlines next steps reassuringly', intent: 'closing_summary', marks: 2.5, required: true, severity: 'important' },
                  ]
                }
              }
            }
          }
        ]
      }
    },
    include: {
      stations: {
        include: {
          osceRubric: {
            include: {
              items: true
            }
          }
        }
      }
    }
  });

  console.log(`Successfully seeded ClinicalExam: "${exam.title}" (ID: ${exam.id})`);
  console.log(`Stations created: ${exam.stations.length}`);
  for (const st of exam.stations) {
    console.log(`  - ${st.title} (Time: ${st.timeLimitSeconds}s, Passing: ${st.passingScore}/20, Rubric items: ${st.osceRubric ? st.osceRubric.items.length : 0})`);
  }
}

seedExam()
  .catch((e) => {
    console.error('Failed to seed exam:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
