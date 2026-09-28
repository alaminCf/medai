import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. Get all active cases (no hidden clinical data for students)
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cases = await prisma.patientCase.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedDuration: true,
        patientName: true,
        patientAge: true,
        patientGender: true,
        chiefComplaint: true,
        caseSummary: true,
        personality: true,
        isActive: true,
        voiceLanguage: true,
        voiceProvider: true,
        avatarProvider: true,
        avatarStyle: true,
        createdAt: true,
        clinicalData: {
          select: {
            learningObjectives: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });
    res.json({ cases });
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

// Helper: Slug generator
function generateSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') +
    '-' +
    Math.random().toString(36).substring(2, 7)
  );
}

// 2. Generate a custom clinical patient topic (Instant AI / Clinical Template Generator)
router.post('/generate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      topic = 'Acute Chest Pain',
      specialty = 'Cardiology',
      difficulty = 'intermediate',
      language = 'en',
      patientGender = 'Male',
      patientAge,
    } = req.body;

    const lowerTopic = (topic || '').toLowerCase();
    const isBangla = language === 'bn';

    // Clinical Synthesis Templates based on medical specialty & chief complaint
    let name = patientGender === 'Female' ? (isBangla ? 'নুসরাত জাহান' : 'Sarah Jenkins') : (isBangla ? 'রহিম আহমেদ' : 'Michael Davis');
    let age = patientAge ? parseInt(patientAge, 10) : patientGender === 'Female' ? 46 : 54;
    let chiefComplaint = '';
    let symptomDetails = '';
    let medicalHistory = '';
    let medicationHistory = '';
    let allergyHistory = '';
    let familyHistory = '';
    let socialHistory = '';
    let hiddenDiagnosis = '';
    let learningObjectives = [
      'Take a focused, structured clinical history using the SOCRATES framework.',
      'Explore core symptoms, onset, severity, and aggravating/relieving factors.',
      'Identify critical red flags and formulate a preliminary differential diagnosis.',
      'Demonstrate clear, compassionate doctor-patient communication.',
    ];
    let personality = 'concerned';

    if (lowerTopic.includes('chest') || lowerTopic.includes('cardio') || lowerTopic.includes('heart') || lowerTopic.includes('angina')) {
      chiefComplaint = isBangla
        ? 'ডাক্তার সাহেব, প্রায় ২ ঘণ্টা ধরে আমার বুকের মাঝখানে তীব্র চেপে ধরা ব্যথা করছে।'
        : 'Doctor, I have had a severe crushing, tight pain in the center of my chest for the past 2 hours.';
      symptomDetails =
        'Onset 2 hours ago while sitting at home. Retrosternal crushing sensation (8/10 severity), radiating to the left shoulder and jaw. Associated with diaphoresis, shortness of breath, and mild nausea. Not relieved by resting.';
      medicalHistory = 'Diagnosed with essential hypertension 6 years ago. Mild dyslipidemia.';
      medicationHistory = 'Amlodipine 5mg once daily; Atorvastatin 20mg at night. Missed medication yesterday.';
      allergyHistory = 'No known drug allergies (NKDA).';
      familyHistory = 'Father died of myocardial infarction at age 58.';
      socialHistory = 'Smokes 10 cigarettes per day for 20 years. Works as an accountant with high workplace stress.';
      hiddenDiagnosis = 'Acute Coronary Syndrome (Anterior Myocardial Infarction / STEMI).';
      personality = 'anxious';
      age = age || 56;
    } else if (lowerTopic.includes('breath') || lowerTopic.includes('asthma') || lowerTopic.includes('cough') || lowerTopic.includes('wheez')) {
      chiefComplaint = isBangla
        ? 'আমার নিঃশ্বাস নিতে খুব কষ্ট হচ্ছে এবং বুক থেকে বাঁশির মতো আওয়াজ হচ্ছে।'
        : 'I am struggling to catch my breath, and I can hear a whistling wheezing sound in my chest.';
      symptomDetails =
        'Worsening shortness of breath over 24 hours after a viral upper respiratory infection. Dry cough, chest tightness, audible expiratory wheeze. Difficulty completing full sentences without pausing.';
      medicalHistory = 'Childhood bronchial asthma with occasional seasonal flares.';
      medicationHistory = 'Salbutamol (Albuterol) inhaler 2 puffs as needed; has used it 6 times today with minimal relief.';
      allergyHistory = 'Allergic to dust mites, pollen, and cat dander.';
      familyHistory = 'Mother and sister have allergic rhinitis and eczema (atopic diathesis).';
      socialHistory = 'Non-smoker. University student. No pet exposures at home.';
      hiddenDiagnosis = 'Acute Moderate-to-Severe Bronchial Asthma Exacerbation.';
      personality = 'anxious';
      age = age || 24;
    } else if (lowerTopic.includes('appendix') || lowerTopic.includes('belly') || lowerTopic.includes('abdomen') || lowerTopic.includes('stomach') || lowerTopic.includes('gastro')) {
      chiefComplaint = isBangla
        ? 'আমার পেটে প্রচণ্ড ব্যথা, প্রথমে নাভির কাছে শুরু হয়ে এখন পেটের নিচের ডান দিকে চলে গেছে।'
        : 'I have severe abdominal pain that started around my belly button and has now moved to the lower right side.';
      symptomDetails =
        'Started 16 hours ago as a dull periumbilical ache, now sharp and localized to the right iliac fossa (8/10). Worse with coughing or walking. Accompanied by nausea, 1 episode of vomiting, and loss of appetite (anorexia).';
      medicalHistory = 'No significant past medical illness. No previous abdominal surgeries.';
      medicationHistory = 'Took one tablet of Paracetamol 500mg 4 hours ago without relief.';
      allergyHistory = 'No known drug allergies.';
      familyHistory = 'Non-contributory.';
      socialHistory = 'Does not smoke or drink alcohol. College student.';
      hiddenDiagnosis = 'Acute Appendicitis with localized peritoneal irritation at McBurney point.';
      personality = 'concerned';
      age = age || 22;
    } else if (lowerTopic.includes('headache') || lowerTopic.includes('neuro') || lowerTopic.includes('migraine')) {
      chiefComplaint = isBangla
        ? 'আমার মাথায় প্রচণ্ড দপদপ করে ব্যথা করছে এবং আলোর দিকে তাকাতে পারছি না।'
        : 'I have an intense throbbing headache on the right side of my head, and light is making it unbearable.';
      symptomDetails =
        'Unilateral right-sided throbbing headache (8/10) that started 5 hours ago. Preceded by visual scintillating scotoma (zigzag flashing lights) 30 minutes prior. Photophobia, phonophobia, and severe nausea.';
      medicalHistory = 'Recurrent episodic headaches 2-3 times per year. Otherwise healthy.';
      medicationHistory = 'Takes Ibuprofen 400mg occasionally, which usually helps but failed today.';
      allergyHistory = 'Allergic to penicillin (developed rash as a child).';
      familyHistory = 'Mother suffered from classic migraines.';
      socialHistory = 'Works on computers 9 hours daily. High caffeine intake (4 cups of coffee daily).';
      hiddenDiagnosis = 'Classic Migraine with Visual Aura.';
      personality = 'quiet';
      age = age || 34;
    } else if (lowerTopic.includes('fever') || lowerTopic.includes('dengue') || lowerTopic.includes('infection') || lowerTopic.includes('jaundice')) {
      chiefComplaint = isBangla
        ? 'আমার ৪ দিন ধরে তীব্র জ্বর, চোখের পেছনে ব্যথা এবং সারা শরীরে অসহ্য যন্ত্রণা হচ্ছে।'
        : 'I have had a high fever for 4 days, with severe pain behind my eyes and intense body aches.';
      symptomDetails =
        'Continuous high-grade fever up to 103°F with chills. Severe retro-orbital pain, myalgia ("breakbone fever"), arthralgia, and mild flushed rash on forearms. No cough or shortness of breath. No bleeding from gums or nose.';
      medicalHistory = 'No chronic medical conditions.';
      medicationHistory = 'Paracetamol 1g every 6 hours.';
      allergyHistory = 'NKDA.';
      familyHistory = 'Family members healthy; neighbor recently diagnosed with Dengue.';
      socialHistory = 'Lives in an urban area with noticeable mosquito activity. Drinks boiled municipal water.';
      hiddenDiagnosis = 'Acute Dengue Fever (Febrile Phase) without warning signs.';
      personality = 'concerned';
      age = age || 28;
    } else {
      // General Clinical Scenario Generator
      chiefComplaint = isBangla
        ? `ডাক্তার সাহেব, আমি কয়েকদিন ধরে ${topic} সম্পর্কিত অসুস্থতায় কষ্ট পাচ্ছি।`
        : `Doctor, I have been feeling very unwell with ${topic} over the past few days.`;
      symptomDetails = `Gradually progressive symptoms over 3 to 5 days, rated 6-7/10 severity. Interfering with daily work and sleep. Associated with general malaise and fatigue.`;
      medicalHistory = 'Mild hypertension, diagnosed 3 years ago.';
      medicationHistory = 'Takes prescribed daily multivitamin and antihypertensive.';
      allergyHistory = 'No known drug or food allergies.';
      familyHistory = 'No known hereditary medical conditions.';
      socialHistory = 'Non-smoker. Moderate physical activity.';
      hiddenDiagnosis = `Clinical presentation consistent with ${topic}.`;
      personality = 'concerned';
      age = age || 45;
    }

    const title = `${topic.trim()} Consultation`;
    const slug = generateSlug(title);

    // Save Patient Case in Database
    const createdCase = await prisma.patientCase.create({
      data: {
        title,
        slug,
        category: specialty || 'General Medicine',
        difficulty,
        estimatedDuration: 15,
        patientName: name,
        patientAge: age,
        patientGender,
        chiefComplaint,
        caseSummary: `Simulated clinical consultation for ${topic} in ${specialty}. Designed for history taking, clinical communication, and differential diagnosis practice.`,
        personality,
        isActive: true,
        voiceLanguage: language,
        voiceProvider: 'browser',
        speakingStyle: 'natural',
        speakingSpeed: 1.0,
        avatarProvider: 'webgl-3d',
        avatarStyle: 'realistic',
        clinicalData: {
          create: {
            medicalHistory,
            medicationHistory,
            allergyHistory,
            familyHistory,
            socialHistory,
            symptomDetails,
            redFlags: 'Assess for hemodynamic instability, acute severe pain progression, or neurological deficits.',
            hiddenDiagnosis,
            expectedHistory: 'History of present illness (SOCRATES), past medical conditions, drug reconciliation, social risk factors.',
            learningObjectives: JSON.stringify(learningObjectives),
          },
        },
        rubric: {
          create: {
            version: 1,
            learningObjectives: JSON.stringify(learningObjectives),
            scoringWeights: JSON.stringify({
              hpi: 0.35,
              past_history: 0.2,
              meds_allergies: 0.15,
              social_family: 0.15,
              communication: 0.15,
            }),
            items: {
              create: [
                {
                  category: 'history_of_present_illness',
                  title: 'Exploration of Chief Complaint & Onset',
                  description: 'Ask when the main symptom started and what triggered it.',
                  intent: 'onset_exploration',
                  importance: 'required',
                  weight: 1.2,
                },
                {
                  category: 'history_of_present_illness',
                  title: 'Symptom Character, Severity, and Radiation',
                  description: 'Determine the exact pain/symptom character and severity on scale 1-10.',
                  intent: 'character_and_severity',
                  importance: 'required',
                  weight: 1.2,
                },
                {
                  category: 'history_of_present_illness',
                  title: 'Aggravating and Relieving Factors',
                  description: 'Elicit what makes the symptom better or worse.',
                  intent: 'aggravating_relieving',
                  importance: 'important',
                  weight: 1.0,
                },
                {
                  category: 'past_medical_history',
                  title: 'Past Medical & Surgical History',
                  description: 'Inquire about chronic conditions like hypertension, diabetes, or asthma.',
                  intent: 'past_medical_conditions',
                  importance: 'required',
                  weight: 1.0,
                },
                {
                  category: 'medications_and_allergies',
                  title: 'Current Medications & Drug Allergies',
                  description: 'Confirm regular medications and any adverse drug reactions.',
                  intent: 'medications_and_allergies',
                  importance: 'required',
                  weight: 1.0,
                },
                {
                  category: 'communication_and_empathy',
                  title: 'Empathy and Professionalism',
                  description: 'Acknowledge patient distress and maintain compassionate bedside manner.',
                  intent: 'empathy_and_rapport',
                  importance: 'required',
                  weight: 1.0,
                },
              ],
            },
          },
        },
      },
      include: {
        clinicalData: {
          select: { learningObjectives: true },
        },
      },
    });

    res.status(201).json({
      case: createdCase,
      message: 'Clinical patient case created successfully.',
    });
  } catch (error) {
    console.error('Generate case error:', error);
    res.status(500).json({ error: 'Failed to generate clinical patient case.' });
  }
});

// 3. Quick Connect: Start consultation in 1 click
router.post('/quick-connect', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { caseId, language = 'en', voiceEnabled = true, avatarEnabled = true } = req.body;
    const userId = req.user!.id;

    if (!caseId) {
      res.status(400).json({ error: 'Case ID is required.' });
      return;
    }

    const patientCase = await prisma.patientCase.findUnique({
      where: { id: caseId },
      select: {
        id: true,
        title: true,
        patientName: true,
        patientAge: true,
        patientGender: true,
        chiefComplaint: true,
        difficulty: true,
        estimatedDuration: true,
        personality: true,
        voiceProvider: true,
        avatarProvider: true,
        avatarId: true,
      },
    });

    if (!patientCase) {
      res.status(404).json({ error: 'Patient case not found.' });
      return;
    }

    // Create consultation session
    const session = await prisma.practiceSession.create({
      data: {
        userId,
        patientCaseId: caseId,
        status: 'active',
        language,
        voiceEnabled,
        voiceProvider: patientCase.voiceProvider,
        avatarEnabled,
        avatarProvider: patientCase.avatarProvider,
        avatarId: patientCase.avatarId,
      },
      include: {
        patientCase: true,
      },
    });

    // Opening greeting
    const openingText =
      language === 'bn'
        ? `ডাক্তার সাহেব, ${patientCase.chiefComplaint}`
        : `Doctor, ${patientCase.chiefComplaint}`;

    await prisma.conversationMessage.create({
      data: {
        practiceSessionId: session.id,
        sender: 'patient',
        message: openingText,
        messageType: voiceEnabled ? 'voice' : 'text',
        emotion: 'concerned',
        emotionIntensity: 0.35,
      },
    });

    res.status(201).json({
      session,
      sessionId: session.id,
      patientName: patientCase.patientName,
      title: patientCase.title,
    });
  } catch (error) {
    console.error('Quick connect error:', error);
    res.status(500).json({ error: 'Failed to connect with patient.' });
  }
});

// 4. Get a single case by ID (no hidden clinical data for students)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patientCase = await prisma.patientCase.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        difficulty: true,
        estimatedDuration: true,
        patientName: true,
        patientAge: true,
        patientGender: true,
        chiefComplaint: true,
        caseSummary: true,
        personality: true,
        isActive: true,
        voiceLanguage: true,
        voiceProvider: true,
        avatarProvider: true,
        avatarStyle: true,
        createdAt: true,
        clinicalData: {
          select: {
            learningObjectives: true,
          },
        },
      },
    });

    if (!patientCase || !patientCase.isActive) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    res.json({ case: patientCase });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

// 5. Get case learning objectives and rubric (Phase 4: protected view for students vs admins)
router.get('/:id/rubric', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rubric = await prisma.clinicalCaseRubric.findUnique({
      where: { patientCaseId: req.params.id },
      include: {
        items: {
          where: { isActive: true },
          select: {
            id: true,
            category: true,
            title: true,
            importance: true,
            clinicalRationale: req.user!.role === 'admin',
            sampleQuestions: req.user!.role === 'admin',
            weight: req.user!.role === 'admin',
          },
        },
      },
    });

    if (!rubric) {
      res.status(404).json({ error: 'Rubric not found for this case' });
      return;
    }

    const learningObjectives = rubric.learningObjectives ? JSON.parse(rubric.learningObjectives) : [];
    const scoringWeights = rubric.scoringWeights ? JSON.parse(rubric.scoringWeights) : null;

    res.json({
      rubric: {
        id: rubric.id,
        version: rubric.version,
        learningObjectives,
        scoringWeights: req.user!.role === 'admin' ? scoringWeights : undefined,
        categories: Array.from(new Set(rubric.items.map((i) => i.category))),
        items: req.user!.role === 'admin' ? rubric.items : undefined,
      },
    });
  } catch (error) {
    console.error('Get rubric error:', error);
    res.status(500).json({ error: 'Failed to fetch case rubric' });
  }
});

export default router;
