import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Brain,
  Sparkles,
  Send,
  Plus,
  FileText,
  Volume2,
  VolumeX,
  Copy,
  Check,
  BookmarkPlus,
  Flame,
  Stethoscope,
  BookOpen,
  Globe,
  Mic,
  Radio,
  Square,
  Lightbulb,
  Target,
  Layers,
  Award,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  Activity,
  Pill,
  Zap,
} from 'lucide-react';
import learningService from '../../services/learningService';
import speechRecognitionService from '../../services/speechRecognitionService';
import type {
  TutorConversation,
  TutorMessage,
  StudyMaterial,
  TutorMode,
  ConsultationLanguage,
} from '../../types';

interface SuggestionItem {
  title: string;
  prompt: string;
  category: string;
  mode: string;
}

interface SpecialtyTopic {
  name: string;
  icon: any;
  color: string;
  topics: { label: string; prompt: string }[];
}

const SPECIALTY_TOPICS: SpecialtyTopic[] = [
  {
    name: 'Cardiology',
    icon: HeartPulse,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    topics: [
      {
        label: 'STEMI vs NSTEMI ECG',
        prompt: 'Explain how to differentiate STEMI vs NSTEMI on ECG and the coronary artery territorial leads.',
      },
      {
        label: 'Cardiac Cycle & S1-S4',
        prompt: 'Walk me through the cardiac cycle phases and physiological causes of S1, S2, S3, and S4 heart sounds.',
      },
      {
        label: 'Heart Failure Pathophysiology',
        prompt: 'Explain systolic vs diastolic heart failure, neurohormonal compensations (RAAS, SNS), and BNP.',
      },
      {
        label: 'Murmurs Localization',
        prompt: 'How do I differentiate Aortic Stenosis from Mitral Regurgitation by radiation, timing, and dynamic maneuvers?',
      },
    ],
  },
  {
    name: 'Pulmonology',
    icon: Activity,
    color: 'text-sky-600 bg-sky-50 border-sky-200',
    topics: [
      {
        label: 'Asthma vs COPD',
        prompt: 'Compare asthma and COPD pathophysiologically, with spirometry reversibility (FEV1/FVC) and treatment protocols.',
      },
      {
        label: 'ABG Acid-Base Interpretation',
        prompt: 'Teach me the 4-step systematic approach to Arterial Blood Gas (ABG) analysis including anion gap.',
      },
      {
        label: 'Pneumonia Classifications',
        prompt: 'What are the classic pathogens, radiological signs, and CURB-65 criteria for community-acquired pneumonia?',
      },
      {
        label: 'ARDS Pathophysiology',
        prompt: 'Explain the 3 phases of Acute Respiratory Distress Syndrome (exudative, proliferative, fibrotic) and Berlin definition.',
      },
    ],
  },
  {
    name: 'Pharmacology',
    icon: Pill,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    topics: [
      {
        label: 'Autonomic Receptors (Alpha/Beta)',
        prompt: 'Break down Alpha-1, Alpha-2, Beta-1, Beta-2 receptors, second messenger pathways (Gq/Gi/Gs), and clinical agonists/antagonists.',
      },
      {
        label: 'Antibiotics MOA Overview',
        prompt: 'Give me a clear conceptual breakdown of major antibiotic classes by mechanism: cell wall, protein synthesis (30S/50S), and DNA synthesis.',
      },
      {
        label: 'Antihypertensives Hierarchy',
        prompt: 'Explain the first-line choices for hypertension (ACEi, ARBs, CCBs, Thiazides) and compelling contraindications.',
      },
      {
        label: 'Diuretics Nephron Sites',
        prompt: 'Trace the nephron segments and explain where Acetazolamide, Loop diuretics, Thiazides, and K-sparing diuretics act.',
      },
    ],
  },
  {
    name: 'Neurology',
    icon: Brain,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    topics: [
      {
        label: 'Stroke Territories (MCA vs PCA)',
        prompt: 'How do clinical presentations differ between MCA, ACA, and PCA ischemic strokes, including aphasias and visual field defects?',
      },
      {
        label: 'Cranial Nerves III, IV, VI',
        prompt: 'How do I test and localize ocular cranial nerve palsies (CN III, IV, VI)? What are the clinical signs of Horner syndrome?',
      },
      {
        label: 'Upper vs Lower Motor Neuron',
        prompt: 'Contrast Upper Motor Neuron (UMN) vs Lower Motor Neuron (LMN) lesions in terms of tone, reflexes, fasciculations, and Babinski.',
      },
      {
        label: 'Meningitis CSF Findings',
        prompt: 'Compare CSF opening pressure, protein, glucose, and cell count between Bacterial, Viral, Fungal, and TB meningitis.',
      },
    ],
  },
  {
    name: 'Pathology & Emergencies',
    icon: Zap,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    topics: [
      {
        label: 'Hypersensitivity Types I–IV',
        prompt: 'Explain Type I, II, III, and IV hypersensitivity reactions with mechanisms and high-yield clinical examples (ACID mnemonic).',
      },
      {
        label: 'Shock Classifications',
        prompt: 'Compare Hypovolemic, Cardiogenic, Distributive (Septic/Anaphylactic), and Obstructive shock parameters (CO, SVR, PCWP).',
      },
      {
        label: 'Acute Kidney Injury (AKI)',
        prompt: 'Walk through Prerenal, Intrinsic, and Postrenal AKI differentiation using BUN/Cr ratio, FENa, and urinary osmolarity.',
      },
      {
        label: 'DKA vs HHS Crisis',
        prompt: 'Contrast Diabetic Ketoacidosis (DKA) and Hyperosmolar Hyperglycemic State (HHS) pathogenesis, diagnostic criteria, and management.',
      },
    ],
  },
];

export default function AITutorPage() {
  const [searchParams] = useSearchParams();
  const initialMaterialId = searchParams.get('materialId') || undefined;

  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<TutorConversation | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [weakConcepts, setWeakConcepts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Configuration
  const [selectedMode, setSelectedMode] = useState<TutorMode>('EXPLAIN');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(initialMaterialId || 'NONE');
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [tutorLanguage, setTutorLanguage] = useState<ConsultationLanguage>('en');

  // Speech & Voice State
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoReadVoice, setAutoReadVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');

  // Interactive UI State
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [savedNoteMsgId, setSavedNoteMsgId] = useState<string | null>(null);
  const [savedCardMsgId, setSavedCardMsgId] = useState<string | null>(null);
  const [activeSpecialtyIndex, setActiveSpecialtyIndex] = useState(0);
  const [showExplorer, setShowExplorer] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, interimTranscript]);

  // Clean speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechRecognitionService.stopListening();
    };
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [convos, mats, suggsRes] = await Promise.all([
        learningService.getTutorConversations().catch(() => []),
        learningService.getMaterials().catch(() => []),
        learningService.getTutorSuggestions().catch(() => ({ suggestions: [], weakConcepts: [] })),
      ]);
      setConversations(convos);
      setMaterials(mats);
      if (suggsRes) {
        setSuggestions(suggsRes.suggestions || []);
        setWeakConcepts(suggsRes.weakConcepts || []);
      }

      if (convos.length > 0) {
        handleSelectConversation(convos[0].id);
      } else {
        handleStartNewConversation();
      }
    } catch (err) {
      console.error('Failed to load tutor data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectConversation = async (convoId: string) => {
    try {
      const full = await learningService.getTutorConversation(convoId);
      setActiveConversation(full);
      setMessages(full.messages || []);
      setSelectedMode(full.mode);
      if (full.materialId) setSelectedMaterialId(full.materialId);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const handleStartNewConversation = async (customInitialPrompt?: string) => {
    try {
      const title = `Tutor: ${selectedMode} (${new Date().toLocaleDateString()})`;
      const initialPrompt =
        customInitialPrompt ||
        (selectedMode === 'QUIZ_ME'
          ? 'Please quiz me on a high-yield medical topic with one question at a time.'
          : selectedMode === 'VIVA_ME'
          ? 'Act as an external university viva voce examiner. Challenge me with an initial oral clinical question.'
          : 'Hello Professor! I am ready to study. How can you assist my learning today?');

      const created = await learningService.createTutorConversation({
        mode: selectedMode,
        title,
        materialId: selectedMaterialId === 'NONE' ? undefined : selectedMaterialId,
        initialMessage: initialPrompt,
      });

      setConversations([created.conversation, ...conversations]);
      setActiveConversation(created.conversation);
      if (created.initialAssistantMessage) {
        setMessages([created.initialAssistantMessage]);
        if (autoReadVoice) {
          handleToggleSpeak(created.initialAssistantMessage.id, created.initialAssistantMessage.content);
        }
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to create new tutor conversation:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || !activeConversation || isThinking) return;

    // Stop ongoing speech
    if (speakingMsgId && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    }

    const userMsg: TutorMessage = {
      id: 'temp-' + Date.now(),
      conversationId: activeConversation.id,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsThinking(true);

    try {
      const res = await learningService.sendTutorMessage(
        activeConversation.id,
        text,
        activeConversation.material?.title
          ? `Material: ${activeConversation.material.title}`
          : undefined
      );
      setMessages((prev) => [...prev, res.assistantMessage]);

      // Auto-read voice if enabled
      if (autoReadVoice && res.assistantMessage?.content) {
        handleToggleSpeak(res.assistantMessage.id, res.assistantMessage.content);
      }
    } catch (err) {
      console.error('Send message failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          conversationId: activeConversation.id,
          role: 'ASSISTANT',
          content:
            'I encountered a temporary connection issue. Please verify your message or click any of the interactive study prompts below.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // 🎙️ Voice Input (Speech-to-Text)
  const handleToggleVoiceInput = () => {
    if (isListening) {
      speechRecognitionService.stopListening();
      setIsListening(false);
      return;
    }

    // Stop speaking audio if professor is talking
    if (speakingMsgId && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
    }

    setVoiceNotice('');
    setInterimTranscript('');
    setIsListening(true);

    speechRecognitionService.startListening(tutorLanguage, {
      onStart: () => setIsListening(true),
      onInterimResult: (transcript) => setInterimTranscript(transcript),
      onFinalResult: (finalText) => {
        setIsListening(false);
        setInterimTranscript('');
        if (finalText.trim()) {
          handleSendMessage(finalText.trim());
        }
      },
      onError: (errMsg) => {
        setIsListening(false);
        setVoiceNotice(`Speech recognition notice: ${errMsg}`);
      },
      onEnd: () => {
        setIsListening(false);
        setInterimTranscript('');
      },
    });
  };

  // 🔊 Text-To-Speech (Professor Voice)
  const handleToggleSpeak = (msgId: string, content: string) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for natural reading
    const cleanText = content
      .replace(/[#*`_~]/g, '')
      .replace(/\(.*?mEq\/L.*?\)/g, '')
      .replace(/\(0\.\d+s\)/g, '')
      .slice(0, 1600);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.98;
    utterance.pitch = 1.0;
    if (tutorLanguage === 'bn') {
      utterance.lang = 'bn-BD';
    } else {
      utterance.lang = 'en-US';
    }

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Copy to Clipboard
  const handleCopyText = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Save to Notes
  const handleSaveToNotes = async (msgId: string, text: string) => {
    try {
      const title = `AI Tutor Note: ${activeConversation?.material?.subject || 'Clinical Concept'} (${new Date().toLocaleDateString()})`;
      await learningService.createNote({
        title,
        content: text,
        subject: activeConversation?.material?.subject || 'General Medicine',
        topic: 'AI Tutor Session',
        tags: `AI Tutor, ${selectedMode}`,
      });
      setSavedNoteMsgId(msgId);
      setTimeout(() => setSavedNoteMsgId(null), 2500);
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  // 🗂️ 1-Click Flashcard Creator
  const handleCreateFlashcardFromMessage = async (msgId: string, content: string) => {
    try {
      // Extract brief question and summary
      const firstLine = content.split('\n')[0].replace(/[#*`_~]/g, '').trim() || 'Medical Concept';
      const question = `What are the core concepts and clinical significance of: ${firstLine}?`;
      const answer = content.slice(0, 600);

      await learningService.createFlashcardDeck({
        title: `AI Tutor Deck: ${firstLine.slice(0, 40)}`,
        subject: activeConversation?.material?.subject || 'General Medicine',
        topic: 'AI Tutor Quick Card',
        description: 'Auto-generated flashcard from AI Medical Tutor consultation.',
        cards: [
          {
            question,
            answer,
            explanation: content.slice(0, 400),
            difficulty: 'MEDIUM',
          },
        ],
      });

      setSavedCardMsgId(msgId);
      setTimeout(() => setSavedCardMsgId(null), 2500);
    } catch (err) {
      console.error('Failed to create flashcard:', err);
    }
  };

  // Interactive Follow-up Action triggers
  const handleTriggerFollowUp = (
    type: 'QUIZ' | 'MNEMONIC' | 'SIMPLIFY' | 'CASE' | 'VIVA_CHALLENGE',
    contextText: string
  ) => {
    const summary = contextText.slice(0, 180).replace(/\n/g, ' ');
    if (type === 'QUIZ') {
      handleSendMessage(
        `Based on what you just explained ("${summary}..."), ask me ONE high-yield multiple-choice or active-recall quiz question. Do not reveal the answer yet!`
      );
    } else if (type === 'MNEMONIC') {
      handleSendMessage(
        `Can you give me a catchy, memorable clinical mnemonic or memory trick for: "${summary}..."? Explain what each letter stands for.`
      );
    } else if (type === 'SIMPLIFY') {
      handleSendMessage(
        `Can you explain the core mechanism of: "${summary}..." using an intuitive real-world analogy as if I were a first-year student?`
      );
    } else if (type === 'CASE') {
      handleSendMessage(
        `Present a 1-paragraph USMLE/PLAB style clinical vignette of a patient presenting with issues related to: "${summary}...". Ask me what the most appropriate next step or diagnosis is.`
      );
    } else if (type === 'VIVA_CHALLENGE') {
      handleSendMessage(
        `Challenge me with a tougher viva voce oral exam question on: "${summary}...". What classic question would a strict professor ask next?`
      );
    }
  };

  // Interactive Detection of Option Badges (A, B, C, D)
  const renderMessageContent = (content: string, isUser = false) => {
    if (isUser) {
      return (
        <p className="text-xs sm:text-sm leading-relaxed text-white font-medium whitespace-pre-wrap">
          {content}
        </p>
      );
    }
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Headings
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-extrabold text-navy-900 text-sm mt-3.5 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('#### ')) {
        return (
          <h5 key={idx} className="font-bold text-gray-800 text-xs mt-2.5 mb-1">
            {line.replace('#### ', '')}
          </h5>
        );
      }

      // Clinical Pearl Callout
      if (line.includes('💡') || line.includes('Clinical Pearl:')) {
        return (
          <div key={idx} className="my-2.5 p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 font-medium text-xs flex items-start gap-2 shadow-2xs">
            <Lightbulb className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <span>{line.replace(/^[💡\s*]+/, '')}</span>
          </div>
        );
      }

      // Examiner / Viva Tip
      if (line.includes('Examiner Tip:') || line.includes('Exam Tip:')) {
        return (
          <div key={idx} className="my-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 font-medium text-xs flex items-start gap-2 shadow-2xs">
            <Award className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>{line}</span>
          </div>
        );
      }

      // Interactive MCQ Option Detection: e.g. "A) ...", "B) ...", "A. ...", "(A) ..."
      const optionMatch = line.match(/^(\([A-D]\)|[A-D][\.\)]|\b[A-D]:)\s+(.*)/i);
      if (optionMatch) {
        const optionLabel = optionMatch[1].replace(/[\(\)\.\:]/g, '').toUpperCase();
        const optionText = optionMatch[2];
        return (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(`My answer is Option ${optionLabel}: ${optionText}`)}
            className="w-full my-1 p-2.5 text-left rounded-xl border border-gray-200 bg-white hover:bg-teal-50 hover:border-teal-400 text-gray-800 hover:text-teal-900 transition flex items-center gap-2.5 group shadow-2xs"
            title="Click to submit this answer to the AI Tutor"
          >
            <span className="w-6 h-6 rounded-lg bg-navy-100 group-hover:bg-teal-600 group-hover:text-white text-navy-900 font-extrabold text-xs flex items-center justify-center transition flex-shrink-0">
              {optionLabel}
            </span>
            <span className="text-xs font-medium">{optionText}</span>
          </button>
        );
      }

      // Bullet points
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs leading-relaxed my-0.5 text-gray-700">
            {line.replace(/^[•-]\s*/, '')}
          </li>
        );
      }

      // Regular text
      return line.trim() ? (
        <p key={idx} className="text-xs sm:text-sm leading-relaxed my-1 text-gray-800">
          {line}
        </p>
      ) : (
        <div key={idx} className="h-1.5" />
      );
    });
  };

  const modes: { id: TutorMode; label: string; desc: string; icon: any }[] = [
    { id: 'EXPLAIN', label: 'Explain Concept', desc: 'Clear pathophysiological mechanisms & steps', icon: BookOpen },
    { id: 'TEACH', label: 'Whiteboard Teach', desc: 'Step-by-step from first principles', icon: Brain },
    { id: 'QUIZ_ME', label: 'Interactive Quiz', desc: 'Socratic active recall challenge', icon: Target },
    { id: 'VIVA_ME', label: 'Viva Voce Exam', desc: 'External university oral examiner practice', icon: Award },
    { id: 'REVISE', label: 'Exam Refresher', desc: 'High-yield takeaways & mnemonics', icon: Zap },
  ];

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          <p className="text-xs text-gray-500 font-medium">Initializing AI Medical Tutor...</p>
        </div>
      </div>
    );
  }

  const currentSpecialty = SPECIALTY_TOPICS[activeSpecialtyIndex];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-gray-200 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link to="/learning" className="text-xs text-gray-500 hover:text-teal-700">
              Learning Hub
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs text-teal-800 font-bold">Interactive AI Medical Professor</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 font-extrabold px-1.5 py-0.2 rounded-full">
              REAL-TIME VOICE & VIVA
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-navy-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-teal-600" />
            AI Medical Tutor & Viva Professor
          </h1>
        </div>

        {/* Top Controls: Language + Auto Voice Toggle + Mode Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language Switch */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setTutorLanguage('en')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                tutorLanguage === 'en' ? 'bg-white text-navy-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setTutorLanguage('bn')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                tutorLanguage === 'bn' ? 'bg-teal-600 text-white shadow-2xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              বাংলা
            </button>
          </div>

          {/* Auto-Read Professor Voice Toggle */}
          <button
            onClick={() => setAutoReadVoice(!autoReadVoice)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              autoReadVoice
                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            title="When active, AI Professor will speak explanations aloud automatically"
          >
            {autoReadVoice ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-gray-400" />}
            <span>{autoReadVoice ? 'Auto-Voice: ON' : 'Voice: Manual'}</span>
          </button>

          {/* Mode Selector Pill Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {modes.map((m) => {
              const Icon = m.icon;
              const isActive = (activeConversation?.mode || selectedMode) === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedMode(m.id);
                    if (activeConversation) {
                      setActiveConversation({ ...activeConversation, mode: m.id });
                    }
                  }}
                  title={m.desc}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                    isActive
                      ? 'bg-navy-900 text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Navigation / Right Interactive Chat */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 overflow-hidden">
        {/* Left Column (3 cols): Convo History, Material Grounding, Weak Concepts */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-3.5 flex flex-col h-full shadow-2xs overflow-hidden">
          <button
            onClick={() => handleStartNewConversation()}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 mb-3"
          >
            <Plus className="w-4 h-4" /> New Study Chat
          </button>

          {/* Context Grounding Material Dropdown */}
          <div className="mb-2.5 pb-2.5 border-b border-gray-100">
            <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-teal-600" /> Ground in Study Material:
            </label>
            <select
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none"
            >
              <option value="NONE">General Medical Knowledge</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  📄 {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Weak Concepts to Strengthen (Adaptive Integration) */}
          {weakConcepts.length > 0 && (
            <div className="mb-2.5 pb-2.5 border-b border-gray-100">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-600" /> Need Reinforcement:
              </span>
              <div className="flex flex-wrap gap-1">
                {weakConcepts.map((concept, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      handleSendMessage(
                        `Explain "${concept}" in detail. What is the fundamental mechanism, and what exam traps should I avoid?`
                      )
                    }
                    className="text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-semibold text-left truncate max-w-full"
                  >
                    🎯 {concept}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Conversations List */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Recent Consultations
            </h3>
            <span className="text-[10px] text-gray-400 font-semibold">{conversations.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectConversation(c.id)}
                className={`p-2 rounded-xl border text-left cursor-pointer transition ${
                  activeConversation?.id === c.id
                    ? 'border-teal-500 bg-teal-50/60 shadow-2xs'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100/70 px-1.5 py-0.2 rounded">
                    {c.mode}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-gray-900 truncate mt-1">{c.title}</h4>
              </div>
            ))}
          </div>

          {/* Bilingual Support Note */}
          <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-400 flex items-center gap-1">
            <Globe className="w-3 h-3 text-teal-600 flex-shrink-0" />
            <span>English & বাংলা voice/text queries supported.</span>
          </div>
        </div>

        {/* Right Column (9 cols): Interactive Chat Area */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-gray-200 flex flex-col h-full shadow-2xs overflow-hidden">
          {/* Active Chat Top Bar */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-navy-900 px-2 py-0.5 rounded-md bg-white border border-gray-200 shadow-2xs">
                Active Mode: {activeConversation?.mode || selectedMode}
              </span>
              {activeConversation?.material && (
                <span className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Grounded: {activeConversation.material.title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowExplorer(!showExplorer)}
                className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
              >
                <span>{showExplorer ? 'Hide Topic Explorer' : 'Show Topic Explorer'}</span>
                {showExplorer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* 🫀 Interactive Specialty & Topic Explorer Drawer */}
          {showExplorer && (
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-teal-50/50 via-white to-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  1-Click Medical Specialty Explorer:
                </span>
                <div className="flex items-center gap-1">
                  {SPECIALTY_TOPICS.map((sp, idx) => {
                    const SpIcon = sp.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSpecialtyIndex(idx)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold transition flex items-center gap-1 ${
                          activeSpecialtyIndex === idx
                            ? 'bg-navy-900 text-white shadow-2xs'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <SpIcon className="w-3 h-3" />
                        <span>{sp.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topic chips for selected specialty */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {currentSpecialty.topics.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(t.prompt)}
                    disabled={isThinking}
                    className="flex-shrink-0 bg-white hover:bg-teal-50 border border-gray-200 hover:border-teal-400 text-gray-700 hover:text-teal-900 px-3 py-1 rounded-lg font-medium text-[11px] shadow-2xs transition disabled:opacity-40"
                    title={t.prompt}
                  >
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Flow Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3.5 shadow-2xs ${
                    msg.role === 'USER'
                      ? 'bg-navy-900 text-white rounded-br-xs text-xs sm:text-sm'
                      : 'bg-slate-50 border border-gray-100 text-gray-900 rounded-bl-xs text-xs sm:text-sm'
                  }`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center gap-1.5 mb-1.5 text-[11px]">
                    <span className={`font-bold ${msg.role === 'USER' ? 'text-teal-300' : 'text-navy-900'}`}>
                      {msg.role === 'USER' ? 'You (Medical Student)' : 'AI Medical Professor'}
                    </span>
                    <span className={msg.role === 'USER' ? 'text-slate-300' : 'text-gray-400'}>·</span>
                    <span className={msg.role === 'USER' ? 'text-slate-300' : 'text-gray-400'}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Rendered content */}
                  <div className="space-y-0.5">{renderMessageContent(msg.content, msg.role === 'USER')}</div>

                  {/* Source Reference Tag */}
                  {msg.sourceReference && (
                    <div className="mt-3 pt-2 border-t border-teal-200/60 text-[11px] text-teal-800 font-bold flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Source Reference: {msg.sourceReference}
                    </div>
                  )}

                  {/* ⚡ INTERACTIVE ACTION TOOLBAR FOR TUTOR MESSAGES */}
                  {msg.role === 'ASSISTANT' && (
                    <div className="mt-3 pt-2.5 border-t border-gray-200 flex flex-col gap-2">
                      {/* 1-Click Interactive Learning Follow-ups */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleTriggerFollowUp('QUIZ', msg.content)}
                          disabled={isThinking}
                          className="text-[10px] font-bold bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 hover:border-teal-400 px-2 py-1 rounded-md transition flex items-center gap-1 shadow-2xs disabled:opacity-40"
                          title="Generate a 1-question quiz on this concept"
                        >
                          <Target className="w-3 h-3 text-teal-600" />
                          <span>Quiz Me on This</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTriggerFollowUp('MNEMONIC', msg.content)}
                          disabled={isThinking}
                          className="text-[10px] font-bold bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 hover:border-purple-400 px-2 py-1 rounded-md transition flex items-center gap-1 shadow-2xs disabled:opacity-40"
                          title="Get a memorable mnemonic for this"
                        >
                          <Brain className="w-3 h-3 text-purple-600" />
                          <span>Mnemonic</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTriggerFollowUp('SIMPLIFY', msg.content)}
                          disabled={isThinking}
                          className="text-[10px] font-bold bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 hover:border-amber-400 px-2 py-1 rounded-md transition flex items-center gap-1 shadow-2xs disabled:opacity-40"
                          title="Explain with a simple real-world analogy"
                        >
                          <Lightbulb className="w-3 h-3 text-amber-600" />
                          <span>Simplify (ELI5)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTriggerFollowUp('CASE', msg.content)}
                          disabled={isThinking}
                          className="text-[10px] font-bold bg-white hover:bg-sky-50 text-sky-800 border border-sky-200 hover:border-sky-400 px-2 py-1 rounded-md transition flex items-center gap-1 shadow-2xs disabled:opacity-40"
                          title="Present a clinical case scenario"
                        >
                          <Stethoscope className="w-3 h-3 text-sky-600" />
                          <span>Clinical Case</span>
                        </button>

                        {selectedMode === 'VIVA_ME' && (
                          <button
                            type="button"
                            onClick={() => handleTriggerFollowUp('VIVA_CHALLENGE', msg.content)}
                            disabled={isThinking}
                            className="text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 px-2 py-1 rounded-md transition flex items-center gap-1 shadow-2xs disabled:opacity-40"
                            title="Tougher viva question"
                          >
                            <Zap className="w-3 h-3 text-rose-600" />
                            <span>Tougher Viva Question</span>
                          </button>
                        )}
                      </div>

                      {/* Utility Action Buttons: Voice read, Flashcard, Note, Copy */}
                      <div className="flex items-center gap-3 text-gray-500 text-[11px] pt-1">
                        <button
                          onClick={() => handleToggleSpeak(msg.id, msg.content)}
                          className={`hover:text-teal-700 transition flex items-center gap-1 font-medium ${
                            speakingMsgId === msg.id ? 'text-teal-700 font-bold' : ''
                          }`}
                          title="Listen to explanation"
                        >
                          {speakingMsgId === msg.id ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                              <span className="text-rose-600">Stop Voice</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Read Aloud</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCreateFlashcardFromMessage(msg.id, msg.content)}
                          className="hover:text-teal-700 transition flex items-center gap-1 font-medium"
                          title="Add to Flashcard Deck"
                        >
                          {savedCardMsgId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Added to Flashcards</span>
                            </>
                          ) : (
                            <>
                              <Layers className="w-3.5 h-3.5 text-teal-600" />
                              <span>Create Flashcard</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleSaveToNotes(msg.id, msg.content)}
                          className="hover:text-teal-700 transition flex items-center gap-1 font-medium"
                          title="Save to My Smart Notes"
                        >
                          {savedNoteMsgId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Saved to Notes</span>
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="w-3.5 h-3.5 text-teal-600" />
                              <span>Save as Note</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          className="hover:text-teal-700 transition flex items-center gap-1 font-medium ml-auto"
                          title="Copy explanation"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Thinking Indicator */}
            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-teal-700 italic py-2 px-3 bg-teal-50/60 rounded-xl w-fit border border-teal-100 shadow-2xs">
                <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span>AI Professor is formulating evidence-based medical explanation...</span>
              </div>
            )}

            {/* Live Voice Recording Transcript Banner */}
            {isListening && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 shadow-sm animate-pulse">
                <Radio className="w-4 h-4 text-emerald-600 animate-spin" />
                <div className="flex-1">
                  <span className="font-bold text-emerald-700">Listening to your question: </span>
                  <span className="italic">{interimTranscript || 'Speak your medical question or viva answer now...'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleVoiceInput}
                  className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[10px]"
                >
                  Send
                </button>
              </div>
            )}

            {voiceNotice && (
              <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                {voiceNotice}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bottom Chips */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/80 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0">
              Quick Inquiries:
            </span>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s.prompt)}
                className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-gray-200 rounded-lg whitespace-nowrap text-gray-700 font-medium hover:border-teal-300 transition flex-shrink-0"
              >
                {s.title}
              </button>
            ))}
          </div>

          {/* Input Box with Real-time Voice Input Button */}
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              {/* Microphone / Speech-to-Text Button */}
              <button
                type="button"
                onClick={handleToggleVoiceInput}
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  isListening
                    ? 'bg-rose-600 text-white shadow-md animate-pulse'
                    : 'bg-gray-100 hover:bg-teal-50 text-gray-700 hover:text-teal-700 border border-gray-200'
                }`}
                title={isListening ? 'Stop recording (Send)' : 'Speak your question or viva answer'}
              >
                {isListening ? <Square className="w-4 h-4 fill-white" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  tutorLanguage === 'bn'
                    ? 'প্যাথলজি, ওষুধ বা ভাইভা প্রশ্ন বাংলায় বা Banglish এ জিজ্ঞেস করুন...'
                    : 'Ask about pathophysiology, drugs, viva questions, or click mic to speak...'
                }
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isThinking}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask Professor</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
