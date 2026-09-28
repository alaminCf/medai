import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { LearningAIService } from '../services/learningAIService';

const router = Router();
router.use(authenticate);

// 1. GET /api/tutor/conversations - List conversations
router.get('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { materialId } = req.query;

    const where: any = { userId };
    if (materialId && typeof materialId === 'string') {
      where.materialId = materialId;
    }

    const conversations = await prisma.tutorConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        material: {
          select: { id: true, title: true, subject: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    res.json({ conversations });
  } catch (error) {
    console.error('Error fetching tutor conversations:', error);
    res.status(500).json({ error: 'Failed to fetch tutor conversations.' });
  }
});

// 2. GET /api/tutor/suggestions - Context-aware prompt suggestions
router.get('/suggestions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Fetch student's unreviewed mistakes to generate smart recommendations
    const mistakes = await prisma.mistakeRecord.findMany({
      where: { userId, reviewed: false },
      select: { conceptName: true, conceptId: true, topic: true, subject: true },
      take: 4,
      orderBy: { createdAt: 'desc' },
    });

    const weakConcepts = mistakes.map((m) => (m.conceptName || m.conceptId || '')).filter(Boolean);

    const defaultSuggestions = [
      {
        title: 'Cardiac Cycle & Heart Sounds',
        prompt: 'Explain the phases of the cardiac cycle, valve closures, and how S1 and S2 heart sounds are produced.',
        category: 'Physiology',
        mode: 'EXPLAIN',
      },
      {
        title: 'Frank-Starling Mechanism',
        prompt: 'How does preload affect myocardial contractility according to the Frank-Starling Law? What are its limits?',
        category: 'Physiology',
        mode: 'TEACH',
      },
      {
        title: 'Myocardial Infarction Pathophysiology',
        prompt: 'Walk me through the timeline of myocardial infarction from plaque rupture to transmural necrosis.',
        category: 'Pathology',
        mode: 'EXPLAIN',
      },
      {
        title: 'Viva Voce Exam Practice',
        prompt: 'Please test me on high-yield cardiovascular concepts with viva-style oral exam questions.',
        category: 'Clinical Exam',
        mode: 'VIVA_ME',
      },
      {
        title: 'Asthma vs COPD',
        prompt: 'Compare asthma and COPD pathophysiologically, including spirometry findings (FEV1/FVC) and bronchodilator reversibility.',
        category: 'Respiratory',
        mode: 'REVISE',
      },
    ];

    // If student has weak concepts, prepend targeted revision prompts
    const dynamicSuggestions = weakConcepts.map((concept) => ({
      title: `Reinforce: ${concept}`,
      prompt: `I recently struggled with questions on "${concept}". Can you explain the core mechanism step-by-step and highlight high-yield exam traps?`,
      category: 'Weak Concept Reinforcement',
      mode: 'TEACH',
    }));

    res.json({
      suggestions: [...dynamicSuggestions, ...defaultSuggestions].slice(0, 6),
      weakConcepts,
    });
  } catch (error) {
    console.error('Error fetching tutor suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions.' });
  }
});

// 3. POST /api/tutor/conversations - Create conversation (supports initialMessage)
router.post('/conversations', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { materialId, subject, topic, mode = 'EXPLAIN', title, initialMessage } = req.body;

    let initialTitle = title;
    if (!initialTitle) {
      if (topic) initialTitle = `${topic} Discussion`;
      else if (subject) initialTitle = `${subject} Session`;
      else initialTitle = `AI Medical Tutor (${mode})`;
    }

    const conversation = await prisma.tutorConversation.create({
      data: {
        userId,
        materialId: materialId || null,
        subject: subject || null,
        topic: topic || null,
        mode: mode || 'EXPLAIN',
        title: initialTitle,
      },
      include: {
        material: {
          select: { id: true, title: true, subject: true, topic: true, extractedText: true },
        },
      },
    });

    let initialAssistantMessage = undefined;
    let initialUserMsg = undefined;

    // If initialMessage was provided, run the first tutor turn immediately
    if (initialMessage && typeof initialMessage === 'string' && initialMessage.trim().length > 0) {
      initialUserMsg = await prisma.tutorMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: initialMessage.trim(),
        },
      });

      // Get user's weak concepts for context
      const mistakes = await prisma.mistakeRecord.findMany({
        where: { userId, reviewed: false },
        select: { conceptName: true, conceptId: true },
        take: 3,
      });
      const weakConcepts = mistakes.map((m) => (m.conceptName || m.conceptId || '')).filter(Boolean);

      const tutorResponse = await LearningAIService.chatWithTutor({
        userMessage: initialMessage.trim(),
        mode: (mode || 'EXPLAIN') as any,
        history: [],
        materialContext: conversation.material?.extractedText || undefined,
        subject: subject || conversation.material?.subject || undefined,
        topic: topic || conversation.material?.topic || undefined,
        weakConcepts,
      });

      initialAssistantMessage = await prisma.tutorMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: tutorResponse.reply,
          sourceReference: tutorResponse.sourceReference || null,
        },
      });

      await prisma.tutorConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });
    }

    res.status(201).json({
      conversation,
      initialAssistantMessage,
      userMessage: initialUserMsg,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
});

// 4. GET /api/tutor/conversations/:id - Get conversation messages
router.get('/conversations/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const conversation = await prisma.tutorConversation.findFirst({
      where: { id, userId },
      include: {
        material: {
          select: { id: true, title: true, subject: true, topic: true, extractedText: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversation.' });
  }
});

// Helper for sending messages
async function handleTutorMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { message, mode } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message content is required.' });
      return;
    }

    const conversation = await prisma.tutorConversation.findFirst({
      where: { id, userId },
      include: {
        material: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 12,
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    // Save user message
    const userMsg = await prisma.tutorMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message.trim(),
      },
    });

    // Prepare context
    const currentMode = (mode || conversation.mode || 'EXPLAIN') as any;
    const materialText = conversation.material?.extractedText || undefined;
    const subject = conversation.subject || conversation.material?.subject || undefined;
    const topic = conversation.topic || conversation.material?.topic || undefined;

    const history = conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Retrieve student's unreviewed mistake concepts to guide adaptive explanation
    const mistakes = await prisma.mistakeRecord.findMany({
      where: { userId, reviewed: false },
      select: { conceptName: true, conceptId: true },
      take: 4,
    });
    const weakConcepts = mistakes.map((m) => (m.conceptName || m.conceptId || '')).filter(Boolean);

    // Call Tutor AI
    const tutorResponse = await LearningAIService.chatWithTutor({
      userMessage: message.trim(),
      mode: currentMode,
      history,
      materialContext: materialText,
      subject,
      topic,
      weakConcepts,
    });

    // Save assistant message
    const assistantMsg = await prisma.tutorMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: tutorResponse.reply,
        sourceReference: tutorResponse.sourceReference || null,
      },
    });

    // Update conversation mode & timestamp
    await prisma.tutorConversation.update({
      where: { id: conversation.id },
      data: {
        mode: currentMode,
        updatedAt: new Date(),
      },
    });

    res.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });
  } catch (error) {
    console.error('Error sending tutor message:', error);
    res.status(500).json({ error: 'Failed to process AI tutor message.' });
  }
}

// 5. POST /api/tutor/conversations/:id/messages & /message (supporting both paths)
router.post('/conversations/:id/messages', handleTutorMessage);
router.post('/conversations/:id/message', handleTutorMessage);

// 6. DELETE /api/tutor/conversations/:id - Delete conversation
router.delete('/conversations/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const conversation = await prisma.tutorConversation.findFirst({ where: { id, userId } });
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    await prisma.tutorConversation.delete({ where: { id } });
    res.json({ success: true, message: 'Conversation deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete conversation.' });
  }
});


// 7. POST /api/tutor/teacher/start-lesson - Phase 7.5: AI Avatar Classroom Lesson Engine
router.post('/teacher/start-lesson', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { subject = 'General Medicine', topic = 'Clinical Pathophysiology', language = 'en' } = req.body;

    const isBangla = language === 'bn';

    // Generate structured 4-step classroom curriculum
    const steps = [
      {
        stepNumber: 1,
        title: isBangla ? 'ক্লিনিক্যাল পরিচিতি ও পটভূমি' : 'Clinical Orientation & Fundamentals',
        spokenScript: isBangla
          ? `নমস্কার! আজকের ক্লাসে আমি আপনাদের "${topic}" বিষয়ের মূল ভিত্তি এবং চিকিৎসাবিজ্ঞানে এর গুরুত্ব বিশদভাবে বোঝাব। মনোযোগ দিয়ে লক্ষ্য করুন।`
          : `Welcome to our medical class. Today, we will explore "${topic}" from first principles. This concept is foundational in ${subject} and essential for both your ward rotations and examinations.`,
        whiteboardNotes: [
          isBangla ? `বিষয়: ${subject} — ${topic}` : `Core Subject: ${subject} — ${topic}`,
          isBangla ? 'ক্লিনিক্যাল গুরুত্ব: রোগ নির্ণয় ও চিকিৎসার সঠিক পথনির্দেশ' : 'Clinical Scope: Diagnostic reasoning & hemodynamic foundation',
          isBangla ? 'প্রথম নীতি: এনাটমি এবং ফিজিওলজির নিখুঁত সংযোগ' : 'First Principles: Integration of physiological anatomy with clinical pathology',
        ],
        pearl: isBangla
          ? 'ক্লিনিক্যাল পার্ল: যে কোনো রোগ বুঝতে হলে আগে সাধারণ ফিজিওলজি পরিষ্কার থাকতে হবে।'
          : `Clinical Pearl: Always anchor the clinical manifestation to the underlying ${subject} mechanism.`,
      },
      {
        stepNumber: 2,
        title: isBangla ? 'প্যাথোফিজিওলজিক্যাল মেকানিজম ও ধাপসমূহ' : 'Pathophysiological Mechanisms & Steps',
        spokenScript: isBangla
          ? `এখন আমরা এর মেকানিজম বা কার্যকরী প্রক্রিয়ার গভীর ধাপে প্রবেশ করব। প্রতিটি ধাপ ক্রমানুসারে বুঝুন যাতে পরীক্ষায় কখনো তালগোল না পাকায়।`
          : `Let us now deconstruct the exact physiological sequence of "${topic}". Notice how each step drives the next, and where compensatory mechanisms attempt to maintain homeostasis.`,
        whiteboardNotes: [
          isBangla ? 'ধাপ ১: প্রাথমিক উদ্দীপনা বা মূল পরিবর্তন' : 'Phase 1: Initial physiological trigger or molecular event',
          isBangla ? 'ধাপ ২: অঙ্গ ও সেলুলার প্রতিক্রিয়ার ধারাবাহিকতা' : 'Phase 2: Cellular response & organ-level mechanical progression',
          isBangla ? 'ধাপ ৩: কম্পেনসেটরি ফিডব্যাক ও হেমোডাইনামিক ব্যালেন্স' : 'Phase 3: Compensatory neurohormonal or metabolic feedback',
          isBangla ? 'ধাপ ৪: মেকানিজম ব্যর্থ হলে ক্লিনিক্যাল লক্ষণ প্রকাশ' : 'Phase 4: Decompensation & emergence of hallmark clinical signs',
        ],
        pearl: isBangla
          ? 'পরীক্ষকের টিপ: ধারাবাহিক ধাপগুলো ধারাবাহিকভাবে উপস্থাপন করলে ভাইভাতে সর্বোচ্চ নম্বর পাওয়া যায়।'
          : 'Examiner Tip: Never jump straight to late symptoms; describe the sequential chain of events first.',
      },
      {
        stepNumber: 3,
        title: isBangla ? 'ক্লিনিক্যাল পার্লস ও পরীক্ষার ফাঁদ' : 'Clinical Pearls & Examiner Traps',
        spokenScript: isBangla
          ? `এই ধাপে আমি আপনাদের বলব পরীক্ষায় সিনিয়র প্রফেসররা কোন সাধারণ ভুলগুলোতে স্টুডেন্টদের ফাঁদে ফেলেন এবং কীভাবে সেগুলো এড়িয়ে চলবেন।`
          : `Now let us focus on what senior examiners specifically test during rounds and viva voce. Many candidates confuse the timeline and classic presentations—let us master the high-yield distinctions.`,
        whiteboardNotes: [
          isBangla ? 'উচ্চ-মূল্যবান বিষয়: সাধারণ ভুলের ক্ষেত্রসমূহ' : `High-Yield Nuance: Classic exam pitfalls in ${topic}`,
          isBangla ? 'ল্যাব ও সাইন কোরিলেশন' : 'Diagnostic Pearls: Correlating physical signs with lab & imaging markers',
          isBangla ? 'মেমোরি ট্রিক ও নেমোনিক' : 'Memory Framework: Mnemonic associations for long-term retention',
        ],
        pearl: isBangla
          ? 'গোল্ডেন রুল: ক্লিনিক্যাল প্র্যাকটিসে আর্লি সাইন ধরাটাই আসল ডাক্তারি।'
          : 'Golden Rule: Look for early compensatory signs before full-blown organ failure occurs.',
      },
      {
        stepNumber: 4,
        title: isBangla ? 'ইন্টারেক্টিভ ভাইভা ও কমপ্রিহেনশন চ্যালেঞ্জ' : 'Interactive Viva Checkpoint Challenge',
        spokenScript: isBangla
          ? `চমৎকার! আমরা ক্লাসের শেষ পর্যায়ে চলে এসেছি। এবার আমি আপনাকে একটি ইন্টারেক্টিভ ক্লিনিক্যাল প্রশ্ন করছি। মাইক্রোফোনে বা টেক্সটে আপনার উত্তর দিন।`
          : `Outstanding work so far. Before we complete our classroom session, let us test your clinical grasp with this checkpoint challenge. You can answer verbally using the microphone or type below.`,
        whiteboardNotes: [
          isBangla ? 'ভাইভা চ্যালেঞ্জ স্ক্রিনে প্রদর্শিত' : 'Interactive Oral Viva / Checkpoint Challenge Active',
          isBangla ? 'মাইক্রোফোনে কথা বলে উত্তর দিন' : 'Answer using voice microphone or typed submission',
        ],
        checkQuestion: {
          question: isBangla
            ? `"${topic}" বিষয়ে সবচেয়ে গুরুত্বপূর্ণ ডায়াগনস্টিক বা ফিজিওলজিক্যাল মার্কার কোনটি?`
            : `In the context of ${topic}, what is the primary diagnostic or physiological mechanism you must confirm first?`,
          options: [
            isBangla ? 'একিউট ক্লিনিক্যাল সাইন ও ফোকাসড হিস্ট্রি' : 'Acute physical signs and focused hemodynamic parameters',
            isBangla ? 'স্পেসিফিক ল্যাব বায়োমার্কার বা সেলুলার পরিবর্তন' : 'Specific confirmatory lab biomarker or cellular pathology',
            isBangla ? 'কম্পেনসেটরি ফিডব্যাকের পর্যায় পর্যবেক্ষণ' : 'Evaluating compensatory neurohormonal response stage',
            isBangla ? 'উপরের সবগুলোই সমন্বিতভাবে বিবেচনা করা' : 'Comprehensive integration of mechanism, signs, and labs',
          ],
          correctOption: isBangla
            ? 'উপরের সবগুলোই সমন্বিতভাবে বিবেচনা করা'
            : 'Comprehensive integration of mechanism, signs, and labs',
          explanation: isBangla
            ? 'সঠিক উত্তর! ক্লিনিক্যাল চিকিৎসায় একক কোনো সাইনের চেয়ে পুরো মেকানিজম সামগ্রিকভাবে বিবেচনা করাই আদর্শ চিকিৎসা পদ্ধতি।'
            : 'Excellent! Sound clinical practice requires synthesizing the physiological mechanism, physical examination findings, and diagnostic markers together.',
        },
      },
    ];

    // Create a tutor conversation in Prisma
    const conversation = await prisma.tutorConversation.create({
      data: {
        userId,
        mode: 'TEACH',
        subject,
        topic,
        title: `AI Teacher Class: ${topic}`,
      },
    });

    // Save opening teacher message
    await prisma.tutorMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: steps[0].spokenScript,
        sourceReference: `Techboloy Med Academic Faculty — ${subject}`,
      },
    });

    const lesson = {
      id: `lesson-${conversation.id}`,
      title: `${topic} (${subject})`,
      subject,
      topic,
      language,
      totalSteps: steps.length,
      currentStep: 1,
      steps,
    };

    res.status(201).json({
      conversationId: conversation.id,
      lesson,
    });
  } catch (error) {
    console.error('Error starting teacher lesson:', error);
    res.status(500).json({ error: 'Failed to start AI Teacher lesson.' });
  }
});

// 8. POST /api/tutor/teacher/interact - Student asks question or answers checkpoint
router.post('/teacher/interact', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { conversationId, studentMessage, stepNumber, topic, subject, language = 'en' } = req.body;

    if (!conversationId || !studentMessage) {
      res.status(400).json({ error: 'Conversation ID and message are required.' });
      return;
    }

    const conversation = await prisma.tutorConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 8,
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: 'Classroom session not found.' });
      return;
    }

    // Save student message
    const userMsg = await prisma.tutorMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: studentMessage.trim(),
      },
    });

    const history = conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Generate professor reply
    const prompt = `Student asked or answered during classroom lesson on ${topic} (${subject}) at step ${stepNumber}: "${studentMessage}".
Please respond as an encouraging, authoritative medical professor.
If the student asked a question, answer concisely with physiological reasoning.
If the student answered a checkpoint question, provide supportive constructive feedback and explain the core takeaway.
Keep response direct and engaging (2 to 4 sentences). Language: ${language === 'bn' ? 'Bengali' : 'English'}.`;

    const aiRes = await LearningAIService.chatWithTutor({
      userMessage: prompt,
      mode: 'TEACH',
      history,
      subject,
      topic,
    });

    // Save professor reply
    const assistantMsg = await prisma.tutorMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiRes.reply,
        sourceReference: `Techboloy Med Academic Faculty — ${subject}`,
      },
    });

    res.json({
      studentMessage: userMsg,
      teacherMessage: assistantMsg,
      reply: aiRes.reply,
    });
  } catch (error) {
    console.error('Error interacting with AI teacher:', error);
    res.status(500).json({ error: 'Failed to interact with AI teacher.' });
  }
});

export default router;
