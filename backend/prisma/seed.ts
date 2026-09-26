import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with Phase 3 realistic avatar profiles...');

  // Seed demo student and admin users
  const studentPasswordHash = await bcrypt.hash('Student123!', 10);
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);

  const studentUser = await prisma.user.upsert({
    where: { email: 'student@techboloy.med' },
    update: {},
    create: {
      name: 'Dr. Alamin Student',
      email: 'student@techboloy.med',
      passwordHash: studentPasswordHash,
      role: 'student',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@techboloy.med' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@techboloy.med',
      passwordHash: adminPasswordHash,
      role: 'admin',
    },
  });

  console.log('✅ Seeded users:', studentUser.email, adminUser.email);

  // Case 1: Chest Pain (Rahim Ahmed)
  const case1 = await prisma.patientCase.upsert({
    where: { slug: 'chest-pain-rahim' },
    update: {
      voiceProvider: 'browser',
      voiceId: 'onyx',
      voiceGender: 'male',
      voiceLanguage: 'en',
      speakingStyle: 'anxious',
      speakingSpeed: 1.0,
      avatarProvider: 'webgl-3d',
      avatarId: 'rahim-male-52',
      avatarGender: 'male',
      avatarAgeGroup: 'middle-aged',
      avatarStyle: 'realistic',
    },
    create: {
      title: 'Chest Pain',
      slug: 'chest-pain-rahim',
      description: 'A middle-aged man presenting with chest discomfort. Practice cardiac history taking.',
      category: 'Cardiology',
      difficulty: 'intermediate',
      estimatedDuration: 20,
      patientName: 'Rahim Ahmed',
      patientAge: 52,
      patientGender: 'Male',
      chiefComplaint: 'I have been having some discomfort in my chest for the past few days.',
      caseSummary: 'A 52-year-old male presenting with chest discomfort. History taking should explore cardiac risk factors.',
      personality: 'anxious',
      voiceProvider: 'browser',
      voiceId: 'onyx',
      voiceGender: 'male',
      voiceLanguage: 'en',
      speakingStyle: 'anxious',
      speakingSpeed: 1.0,
      avatarProvider: 'webgl-3d',
      avatarId: 'rahim-male-52',
      avatarGender: 'male',
      avatarAgeGroup: 'middle-aged',
      avatarStyle: 'realistic',
      isActive: true,
      clinicalData: {
        create: {
          medicalHistory: 'Hypertension for 8 years, on amlodipine. No previous cardiac events.',
          medicationHistory: 'Amlodipine 5mg once daily for hypertension.',
          allergyHistory: 'No known drug allergies.',
          familyHistory: 'Father died of heart attack at age 60. Mother has diabetes.',
          socialHistory: 'Smoker (20 pack-years), drinks occasionally. Works as a businessman. Sedentary lifestyle.',
          symptomDetails: 'Central chest pressure-like discomfort for 3 days. Radiates to left arm. Worse with exertion. Associated with mild shortness of breath and sweating. No pleuritic pain. No fever.',
          redFlags: 'Cardiac chest pain, radiation to arm, exertional component, sweating — possible ACS.',
          hiddenDiagnosis: 'Acute Coronary Syndrome (NSTEMI)',
          expectedHistory: 'Site, onset, character, radiation, associations, timing, exacerbating/relieving factors, cardiac risk factors.',
          learningObjectives: '["Practice open-ended questioning","Explore symptom history systematically","Identify relevant cardiac risk factors","Practice patient communication and empathy","Assess for associated symptoms"]',
        },
      },
    },
  });

  // Case 2: Fever (Fatima Begum)
  const case2 = await prisma.patientCase.upsert({
    where: { slug: 'fever-fatima' },
    update: {
      voiceProvider: 'browser',
      voiceId: 'nova',
      voiceGender: 'female',
      voiceLanguage: 'en',
      speakingStyle: 'quiet',
      speakingSpeed: 0.95,
      avatarProvider: 'webgl-3d',
      avatarId: 'fatima-female-28',
      avatarGender: 'female',
      avatarAgeGroup: 'young-adult',
      avatarStyle: 'realistic',
    },
    create: {
      title: 'Fever and Malaise',
      slug: 'fever-fatima',
      description: 'A young female presenting with persistent fever. Practice infectious disease history taking.',
      category: 'Infectious Disease',
      difficulty: 'beginner',
      estimatedDuration: 15,
      patientName: 'Fatima Begum',
      patientAge: 28,
      patientGender: 'Female',
      chiefComplaint: 'I have had a high fever for the last 4 days that will not go down.',
      caseSummary: 'A 28-year-old female presenting with 4-day history of high fever, body aches, and fatigue.',
      personality: 'quiet',
      voiceProvider: 'browser',
      voiceId: 'nova',
      voiceGender: 'female',
      voiceLanguage: 'en',
      speakingStyle: 'quiet',
      speakingSpeed: 0.95,
      avatarProvider: 'webgl-3d',
      avatarId: 'fatima-female-28',
      avatarGender: 'female',
      avatarAgeGroup: 'young-adult',
      avatarStyle: 'realistic',
      isActive: true,
      clinicalData: {
        create: {
          medicalHistory: 'Generally healthy, no chronic medical conditions.',
          medicationHistory: 'Paracetamol 500mg taken twice with minimal relief.',
          allergyHistory: 'No known drug allergies.',
          familyHistory: 'Parents healthy. One sibling had dengue last year.',
          socialHistory: 'School teacher. Lives in an apartment. No recent foreign travel. Mosquitos common in neighborhood.',
          symptomDetails: 'High fever for 4 days (up to 39.5°C) with chills. Severe retro-orbital headache, generalized myalgia (bone-breaking ache), nausea, loss of appetite. Mild non-pruritic rash on arms. No cough, no dysuria.',
          redFlags: 'High fever with severe headache, retro-orbital pain, myalgia, rash in endemic area — suspect Dengue.',
          hiddenDiagnosis: 'Dengue Fever',
          expectedHistory: 'Fever pattern, travel/exposure history, associated symptoms (joint pain, rash, bleeding), red flags.',
          learningObjectives: '["Take a systematic fever history","Ask about relevant travel and environmental exposures","Screen for warning signs/red flags","Communicate reassurance effectively","Identify non-fever associated symptoms"]',
        },
      },
    },
  });

  // Case 3: Headache (Tanvir Hossain)
  const case3 = await prisma.patientCase.upsert({
    where: { slug: 'headache-tanvir' },
    update: {
      voiceProvider: 'browser',
      voiceId: 'echo',
      voiceGender: 'male',
      voiceLanguage: 'en',
      speakingStyle: 'talkative',
      speakingSpeed: 1.05,
      avatarProvider: 'webgl-3d',
      avatarId: 'tanvir-male-34',
      avatarGender: 'male',
      avatarAgeGroup: 'young-adult',
      avatarStyle: 'realistic',
    },
    create: {
      title: 'Recurrent Headache',
      slug: 'headache-tanvir',
      description: 'A young professional with severe throbbing headaches. Practice neurological history taking.',
      category: 'Neurology',
      difficulty: 'beginner',
      estimatedDuration: 15,
      patientName: 'Tanvir Hossain',
      patientAge: 34,
      patientGender: 'Male',
      chiefComplaint: 'I get these terrible throbbing headaches that make it impossible to work.',
      caseSummary: 'A 34-year-old software engineer presenting with episodic unilateral throbbing headaches.',
      personality: 'talkative',
      voiceProvider: 'browser',
      voiceId: 'echo',
      voiceGender: 'male',
      voiceLanguage: 'en',
      speakingStyle: 'talkative',
      speakingSpeed: 1.05,
      avatarProvider: 'webgl-3d',
      avatarId: 'tanvir-male-34',
      avatarGender: 'male',
      avatarAgeGroup: 'young-adult',
      avatarStyle: 'realistic',
      isActive: true,
      clinicalData: {
        create: {
          medicalHistory: 'Occasional tension headaches in the past. No other medical history.',
          medicationHistory: 'Ibuprofen occasionally provides partial relief.',
          allergyHistory: 'No known allergies.',
          familyHistory: 'Mother had severe migraines.',
          socialHistory: 'Software engineer, works 9-10 hours on screens daily. High stress at work. Drinks 3-4 coffees daily. Poor sleep (5-6 hours/night).',
          symptomDetails: 'Unilateral (right-sided) throbbing headache lasting 6–12 hours. Occurs 2-3 times per month for the last 6 months. Preceded by visual scintillations (flashing lights) 20 minutes prior. Photophobia and phonophobia. Nausea during attacks.',
          redFlags: 'Rule out secondary headaches: no sudden thunderclap onset, no fever, no neck stiffness, no focal deficits.',
          hiddenDiagnosis: 'Migraine with Aura',
          expectedHistory: 'Headache SOCRATES, aura symptoms, triggers, family history, impact on daily life.',
          learningObjectives: '["Distinguish primary vs secondary headache features","Explore aura and associated sensory symptoms","Identify lifestyle triggers","Assess functional disability caused by symptoms","Demonstrate empathetic communication"]',
        },
      },
    },
  });

  // Case 4: Abdominal Pain (Nusrat Jahan)
  const case4 = await prisma.patientCase.upsert({
    where: { slug: 'abdominal-pain-nusrat' },
    update: {
      voiceProvider: 'browser',
      voiceId: 'shimmer',
      voiceGender: 'female',
      voiceLanguage: 'en',
      speakingStyle: 'anxious',
      speakingSpeed: 1.0,
      avatarProvider: 'webgl-3d',
      avatarId: 'nusrat-female-22',
      avatarGender: 'female',
      avatarAgeGroup: 'young-adult',
      avatarStyle: 'realistic',
    },
    create: {
      title: 'Acute Abdominal Pain',
      slug: 'abdominal-pain-nusrat',
      description: 'A young female presenting with worsening right lower quadrant abdominal pain.',
      category: 'Gastroenterology',
      difficulty: 'intermediate',
      estimatedDuration: 20,
      patientName: 'Nusrat Jahan',
      patientAge: 22,
      patientGender: 'Female',
      chiefComplaint: 'My stomach has been hurting really badly since yesterday and it seems to be getting worse.',
      caseSummary: 'A 22-year-old female presenting with acute onset abdominal pain shifting from periumbilical to right iliac fossa.',
      personality: 'anxious',
      voiceProvider: 'browser',
      voiceId: 'shimmer',
      voiceGender: 'female',
      voiceLanguage: 'en',
      speakingStyle: 'anxious',
      speakingSpeed: 1.0,
      avatarProvider: 'webgl-3d',
      avatarId: 'nusrat-female-22',
      avatarGender: 'female',
      avatarAgeGroup: 'young-adult',
      avatarStyle: 'realistic',
      isActive: true,
      clinicalData: {
        create: {
          medicalHistory: 'No significant past medical or surgical history.',
          medicationHistory: 'None.',
          allergyHistory: 'No known allergies.',
          familyHistory: 'Unremarkable.',
          socialHistory: 'University student. Non-smoker, non-drinker. Lives in student housing.',
          symptomDetails: 'Started yesterday morning as dull, poorly localized discomfort around the navel (periumbilical). Over the last 12 hours, moved to the right lower belly (RIF) and became sharp and constant. Worse with walking and coughing. Anorexia (refused dinner), low-grade fever, 2 episodes of vomiting. LMP was 2 weeks ago (regular).',
          redFlags: 'Peritoneal irritation signs, shifting pain, fever, vomiting — surgical abdomen (appendicitis).',
          hiddenDiagnosis: 'Acute Appendicitis',
          expectedHistory: 'Pain migration, character change, aggravating factors, gynecological history, systemic signs.',
          learningObjectives: '["Trace pain migration accurately","Differentiate visceral from somatic pain","Take a sensitive gynecological and LMP history","Assess acute abdomen red flags","Maintain patient reassurance in acute distress"]',
        },
      },
    },
  });

  // Case 5: Shortness of Breath (Abdul Karim)
  const case5 = await prisma.patientCase.upsert({
    where: { slug: 'dyspnea-abdul' },
    update: {
      voiceProvider: 'browser',
      voiceId: 'fable',
      voiceGender: 'male',
      voiceLanguage: 'en',
      speakingStyle: 'confused',
      speakingSpeed: 0.9,
      avatarProvider: 'webgl-3d',
      avatarId: 'abdul-male-68',
      avatarGender: 'male',
      avatarAgeGroup: 'elderly',
      avatarStyle: 'realistic',
    },
    create: {
      title: 'Shortness of Breath',
      slug: 'dyspnea-abdul',
      description: 'An elderly man presenting with progressive breathlessness. Practice respiratory and cardiac evaluation.',
      category: 'Cardiology',
      difficulty: 'advanced',
      estimatedDuration: 25,
      patientName: 'Abdul Karim',
      patientAge: 68,
      patientGender: 'Male',
      chiefComplaint: 'I cannot catch my breath even when just walking across the room, doctor.',
      caseSummary: 'A 68-year-old male with progressive dyspnea, orthopnea, and bilateral lower limb swelling.',
      personality: 'confused',
      voiceProvider: 'browser',
      voiceId: 'fable',
      voiceGender: 'male',
      voiceLanguage: 'en',
      speakingStyle: 'confused',
      speakingSpeed: 0.9,
      avatarProvider: 'webgl-3d',
      avatarId: 'abdul-male-68',
      avatarGender: 'male',
      avatarAgeGroup: 'elderly',
      avatarStyle: 'realistic',
      isActive: true,
      clinicalData: {
        create: {
          medicalHistory: 'Type 2 Diabetes for 15 years. Ischemic heart disease — had MI 4 years ago. Hypertension for 20 years.',
          medicationHistory: 'Metformin 850mg BD, Aspirin 75mg OD, Atorvastatin 20mg OD, Ramipril 5mg OD. Admits to missing doses frequently.',
          allergyHistory: 'Penicillin allergy — rash.',
          familyHistory: 'Brother had heart failure. Father died of stroke.',
          socialHistory: 'Retired government officer. Ex-smoker (30 pack-years, stopped 5 years ago). Non-drinker. Lives alone. Poor mobility.',
          symptomDetails: 'Progressive dyspnea for 3 months. Initially on exertion, now at rest. Orthopnea — needs 3 pillows. Paroxysmal nocturnal dyspnea twice last week. Bilateral ankle swelling. Reduced exercise tolerance. No hemoptysis. Mild productive cough. No pleuritic chest pain. Weight gain of 3kg in one month.',
          redFlags: 'Orthopnea, PND, bilateral ankle edema, weight gain — heart failure.',
          hiddenDiagnosis: 'Congestive Heart Failure',
          expectedHistory: 'Dyspnea on exertion, orthopnea, PND, ankle edema, cardiac risk factors, functional capacity.',
          learningObjectives: '["Practice comprehensive dyspnea history","Identify orthopnea and PND","Explore cardiac risk factors thoroughly","Assess functional capacity","Differentiate cardiac from respiratory causes"]',
        },
      },
    },
  });

  console.log('✅ Seeded patient cases with Phase 3 avatar profiles:', [case1, case2, case3, case4, case5].map(c => c.title).join(', '));
  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
