import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck,
  Bot,
  Award,
  Stethoscope,
  BookOpen,
  FileText,
  Brain,
  Sparkles,
  Layers,
  ArrowRight,
  Upload,
  Search,
  CheckCircle2,
  GraduationCap,
  Camera,
  Image as ImageIcon,
  Check,
  AlertCircle,
  HelpCircle,
  Zap,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import learningService from '../../services/learningService';
import type { LearningHubSummary } from '../../types';

interface GeneratedHubData {
  subject: string;
  topic: string;
  title: string;
  summary: {
    title: string;
    overview: string;
    keyConcepts: string[];
    importantTerms: Array<{ term: string; definition: string }>;
    clinicalRelevance: string[];
    examPoints: string[];
    quickRevision: string;
  };
  flashcards: Array<{
    question: string;
    answer: string;
    explanation: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
  mcqs: Array<{
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: 'A' | 'B' | 'C' | 'D';
    explanation: string;
    difficulty: string;
  }>;
  vivaQuestions: Array<{
    question: string;
    expectedConcepts: string[];
  }>;
  tutorStarterPrompt: string;
  suggestedSchedule: Array<{
    phase: string;
    dayOffset: number;
    taskType: 'READING' | 'MCQ' | 'FLASHCARD' | 'VIVA' | 'REVISION';
    title: string;
    durationMinutes: number;
  }>;
  savedDeckId?: string;
  savedBankId?: string;
  savedNoteId?: string;
  materialId?: string;
}

const MEDICAL_SUBJECTS = [
  'Cardiology',
  'Respiratory Medicine',
  'Neurology',
  'Gastroenterology',
  'Nephrology',
  'Endocrinology',
  'Pharmacology',
  'Pathology',
  'Dermatology',
  'Hematology',
  'Infectious Disease',
  'Pediatrics',
  'Surgery & Trauma',
];

const CURATED_TOPICS: Record<string, string[]> = {
  'Cardiology': ['Aortic Stenosis & SAD Triad', 'Heart Failure (HFrEF vs HFpEF)', 'Acute Coronary Syndrome (STEMI vs NSTEMI)', 'Infective Endocarditis Duke Criteria'],
  'Respiratory Medicine': ['Asthma vs COPD Exacerbation', 'Pneumonia CURB-65 & Empiric Therapy', 'Pneumothorax & Tension Emergency', 'Pleural Effusion Light Criteria'],
  'Neurology': ['Ischemic Stroke & tPA Windows', 'Meningitis CSF Findings', 'Status Epilepticus Management', 'Parkinson Disease vs Tremors'],
  'Gastroenterology': ['Cirrhosis & Portal Hypertension Complications', 'Acute Pancreatitis Ranson Criteria', 'Upper GI Bleeding & Peptic Ulcer', 'Inflammatory Bowel Disease (Crohn vs UC)'],
  'Nephrology': ['Nephrotic vs Nephritic Syndrome', 'Acute Kidney Injury (Pre-renal, Intrinsic, Post-renal)', 'Glomerulonephritis Classifications', 'Electrolyte Emergencies (Hyperkalemia)'],
  'Pharmacology': ['Antihypertensives & First-Line Regimens', 'Antibiotic Mechanisms & Resistance Pearls', 'Autonomic Nervous System Receptors', 'Anticoagulants & Reversal Agents'],
  'Pathology': ['Cell Injury, Necrosis & Apoptosis Pathways', 'Acute vs Chronic Inflammation Mediators', 'Hemodynamic Shock Mechanisms', 'Neoplasia Hallmarks & Staging'],
  'Dermatology': ['Psoriasis & Auspitz Sign', 'Pemphigus Vulgaris vs Bullous Pemphigoid (Nikolsky Sign)', 'Melanoma ABCDE Criteria', 'Lichen Planus & Drug Eruptions'],
};

export default function LearningHubPage() {
  const { user } = useAuth();

  // General Hub Data
  const [data, setData] = useState<LearningHubSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Active Mode: 'UPLOAD' (Today's Class Material) or 'CURRICULUM' (Standard AI Curriculum)
  const [activeMode, setActiveMode] = useState<'UPLOAD' | 'CURRICULUM'>('UPLOAD');

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadTopic, setUploadTopic] = useState('');
  const [isGeneratingHub, setIsGeneratingHub] = useState(false);
  const [generationStage, setGenerationStage] = useState(1);
  const [generationError, setGenerationError] = useState('');

  // Curriculum Form State
  const [currSubject, setCurrSubject] = useState('Cardiology');
  const [currTopic, setCurrTopic] = useState('Aortic Stenosis & SAD Triad');
  const [customTopicInput, setCustomTopicInput] = useState('');

  // Generated Daily Hub Cockpit State
  const [activeHub, setActiveHub] = useState<GeneratedHubData | null>(null);
  const [activeCockpitTab, setActiveCockpitTab] = useState<'SUMMARY' | 'FLASHCARDS' | 'MCQS' | 'VIVA' | 'PATIENT' | 'TUTOR' | 'OSCE' | 'SCHEDULE'>('SUMMARY');

  // Cockpit Interactive Flashcard State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Cockpit Interactive MCQ State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [scoreTally, setScoreTally] = useState<number | null>(null);

  // Expanded Viva Questions
  const [expandedViva, setExpandedViva] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadHubData();
  }, []);

  const loadHubData = async () => {
    try {
      setIsLoading(true);
      const res = await learningService.getHubSummary();
      setData(res);
    } catch (err) {
      console.error('Failed to load learning hub data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      setIsSearching(true);
      const res = await learningService.searchLearning(searchQuery);
      setSearchResults(res);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setGenerationError('');

    // Generate preview if image
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  const handleGenerateFromUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !uploadTopic) {
      setGenerationError('Please select a handwritten note photo, textbook image, PDF, or enter a topic.');
      return;
    }

    try {
      setIsGeneratingHub(true);
      setGenerationError('');
      setGenerationStage(1);

      // Simulation stages for UX feedback
      const timer1 = setTimeout(() => setGenerationStage(2), 1200);
      const timer2 = setTimeout(() => setGenerationStage(3), 2800);
      const timer3 = setTimeout(() => setGenerationStage(4), 4500);

      const formData = new FormData();
      if (uploadFile) formData.append('file', uploadFile);
      if (uploadTitle) formData.append('title', uploadTitle);
      if (uploadSubject) formData.append('subject', uploadSubject);
      if (uploadTopic) formData.append('topic', uploadTopic);

      const res = await learningService.generateHubFromUpload(formData);

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (res.success && res.hubPackage) {
        setActiveHub({
          ...res.hubPackage,
          savedDeckId: res.savedDeck?.id,
          savedBankId: res.savedBank?.id,
          savedNoteId: res.savedNote?.id,
          materialId: res.material?.id,
        });
        setActiveCockpitTab('SUMMARY');
        setCurrentCardIndex(0);
        setIsCardFlipped(false);
        setSelectedAnswers({});
        setScoreTally(null);
        // Refresh library stats in background
        loadHubData();
      }
    } catch (err: any) {
      console.error('Failed to generate hub:', err);
      setGenerationError(err?.response?.data?.error || 'Failed to process and generate learning hub. Please check your file.');
    } finally {
      setIsGeneratingHub(false);
    }
  };

  const handleGenerateCurriculumHub = async (topicToUse?: string) => {
    const finalTopic = topicToUse || customTopicInput || currTopic;
    if (!finalTopic.trim()) return;

    try {
      setIsGeneratingHub(true);
      setGenerationError('');
      setGenerationStage(2);

      const res = await learningService.generateAICurriculumHub({
        subject: currSubject,
        topic: finalTopic,
        difficulty: 'medium',
      });

      if (res.success && res.hubPackage) {
        setActiveHub({
          ...res.hubPackage,
          savedDeckId: res.savedDeck?.id,
          savedBankId: res.savedBank?.id,
        });
        setActiveCockpitTab('SUMMARY');
        setCurrentCardIndex(0);
        setIsCardFlipped(false);
        setSelectedAnswers({});
        setScoreTally(null);
      }
    } catch (err: any) {
      console.error('Failed to generate curriculum hub:', err);
      setGenerationError('Failed to generate AI curriculum module. Please try again.');
    } finally {
      setIsGeneratingHub(false);
    }
  };

  const handleSelectMCQOption = (questionIndex: number, option: 'A' | 'B' | 'C' | 'D') => {
    if (selectedAnswers[questionIndex]) return; // already answered
    const nextAnswers = { ...selectedAnswers, [questionIndex]: option };
    setSelectedAnswers(nextAnswers);

    // If all answered, calculate score
    if (activeHub?.mcqs && Object.keys(nextAnswers).length === activeHub.mcqs.length) {
      let correct = 0;
      activeHub.mcqs.forEach((q, idx) => {
        if (nextAnswers[idx] === q.correctOption) correct++;
      });
      setScoreTally(correct);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner & Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
                <GraduationCap className="w-3.5 h-3.5" />
                Academic Learning Engine
              </span>
              <span className="text-xs text-gray-500 font-medium">Multimodal AI Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-900 tracking-tight">
              Medical Learning Hub • {user?.name ? user.name.split(" ")[0] : "Doctor"}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              "Turn physical classroom lectures & textbook notes into an interactive, high-retention AI workspace."
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/ai-tutor"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            >
              <Brain className="w-4 h-4 text-teal-400" />
              Open AI Tutor
            </Link>
            <Link
              to="/study-plan"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            >
              <Calendar className="w-4 h-4" />
              Study Plan
            </Link>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="mt-5">
          <form onSubmit={handleSearch} className="relative max-w-2xl">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lectures, study notes, flashcards, MCQs, or clinical topics..."
              className="w-full pl-11 pr-24 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults && (
            <div className="mt-3 p-4 bg-white border border-gray-200 rounded-xl shadow-lg max-w-2xl space-y-3 z-10 relative">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Search Results for "{searchResults.query}"
                </span>
                <button
                  onClick={() => setSearchResults(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Close
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 text-sm">
                {searchResults.results.materials.map((m: any) => (
                  <Link
                    key={m.id}
                    to={`/learning/materials/${m.id}`}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-600" />
                      <span className="font-medium text-gray-900">{m.title}</span>
                    </div>
                    <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded">{m.subject}</span>
                  </Link>
                ))}
                {searchResults.results.notes.map((n: any) => (
                  <Link
                    key={n.id}
                    to="/notes"
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-gray-900">{n.title}</span>
                    </div>
                    <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Note</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* DUAL MODE SELECTION HERO CARDS                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Mode A: Upload Physical Class Material */}
        <div
          onClick={() => setActiveMode('UPLOAD')}
          className={`cursor-pointer p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
            activeMode === 'UPLOAD'
              ? 'bg-gradient-to-br from-teal-50/80 via-white to-emerald-50/50 border-teal-500 shadow-md ring-2 ring-teal-500/20'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeMode === 'UPLOAD' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">
                    Option 1: Upload Today's Class Material
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-teal-100 text-teal-800">
                    Handwriting OCR
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Snap a photo of your handwritten lecture note, textbook page, or upload a class PDF. The AI reads it and builds today's full interactive hub.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-gray-600">
            <span className="bg-white/80 px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1">
              ✍️ Handwritten Notes
            </span>
            <span className="bg-white/80 px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1">
              📖 Textbook Pages
            </span>
            <span className="bg-white/80 px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1">
              📑 PDF / Slides
            </span>
          </div>
        </div>

        {/* Mode B: AI Curriculum Generator */}
        <div
          onClick={() => setActiveMode('CURRICULUM')}
          className={`cursor-pointer p-5 rounded-2xl border-2 transition-all relative overflow-hidden ${
            activeMode === 'CURRICULUM'
              ? 'bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/50 border-purple-500 shadow-md ring-2 ring-purple-500/20'
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                activeMode === 'CURRICULUM' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">
                    Option 2: AI Generated Curriculum Hub
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-purple-100 text-purple-800">
                    Pre-Clinical & Clinical
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Choose from official medical curriculum subjects (Cardiology, Pathology, Pharma, etc.) and let AI generate full clinical modules.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-gray-600">
            <span className="bg-white/80 px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1">
              🎯 High-Yield Syllabus
            </span>
            <span className="bg-white/80 px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1">
              🧠 Clinical Systems
            </span>
            <span className="bg-white/80 px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1">
              ⚡ 1-Click Generation
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODE A: UPLOAD INTERFACE                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeMode === 'UPLOAD' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
            <div>
              <h2 className="font-bold text-navy-900 text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-600" />
                Upload Today's Classroom Material
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Our vision engine will transcribe your handwritten notes or book images and create today's notes, flashcards, MCQs, and study plan.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700">
              Multimodal Vision OCR
            </span>
          </div>

          <form onSubmit={handleGenerateFromUpload} className="space-y-5">
            {generationError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{generationError}</span>
              </div>
            )}

            {/* Drag & Drop File Zone */}
            <div className="relative border-2 border-dashed border-gray-300 hover:border-teal-500 rounded-2xl p-6 transition-all bg-gray-50/50 hover:bg-teal-50/20 text-center">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isGeneratingHub}
              />

              {filePreview ? (
                <div className="space-y-3">
                  <div className="relative inline-block">
                    <img
                      src={filePreview}
                      alt="Uploaded preview"
                      className="max-h-48 rounded-xl object-contain mx-auto shadow-sm border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFile(null);
                        setFilePreview(null);
                      }}
                      className="absolute -top-2 -right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">
                    Selected Image: {uploadFile?.name} ({formatFileSize(uploadFile?.size || 0)})
                  </p>
                  <p className="text-[11px] text-teal-600">
                    Click or drag another file to replace
                  </p>
                </div>
              ) : uploadFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-gray-900">{uploadFile.name}</p>
                  <p className="text-[11px] text-gray-500">{formatFileSize(uploadFile.size)}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadFile(null);
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-2xs">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      Snap or drop your handwritten note photo, textbook image, or lecture PDF
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports JPG, PNG, WEBP, PDF, DOCX (Max 25 MB)
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-gray-700 shadow-2xs">
                      <ImageIcon className="w-4 h-4 text-teal-600" />
                      Browse Files or Capture Photo
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Metadata Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Topic Title <span className="text-gray-400 font-normal">(Optional — auto-detected)</span>
                </label>
                <input
                  type="text"
                  value={uploadTopic}
                  onChange={(e) => setUploadTopic(e.target.value)}
                  placeholder="e.g. Aortic Stenosis, Psoriasis"
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subject <span className="text-gray-400 font-normal">(Optional — auto-detected)</span>
                </label>
                <select
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Auto-Detect Subject</option>
                  {MEDICAL_SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Class Material Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Ward Round Lecture Notes"
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Submit Action & Multi-step Progress */}
            {isGeneratingHub ? (
              <div className="p-5 bg-teal-50/80 border border-teal-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
                    Generating Today's Learning Hub...
                  </span>
                  <span>Step {generationStage} of 4</span>
                </div>

                <div className="w-full bg-teal-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${generationStage * 25}%` }}
                  />
                </div>

                <p className="text-xs text-teal-800 font-medium">
                  {generationStage === 1 && '🔍 Scanning handwriting & optical character recognition (OCR)...'}
                  {generationStage === 2 && '🧬 Transcribing medical shorthand & clinical mechanisms...'}
                  {generationStage === 3 && '🗂️ Generating high-yield Flashcards, MCQs & Viva queries...'}
                  {generationStage === 4 && '📅 Syncing spaced repetition tasks into your active Study Plan...'}
                </p>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Generate Today's Class Learning Hub
              </button>
            )}
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODE B: STANDARD AI CURRICULUM INTERFACE                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeMode === 'CURRICULUM' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs mb-8">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
            <div>
              <h2 className="font-bold text-navy-900 text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Generate AI Medical Curriculum Hub
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Select your academic subject, pick a high-yield core topic, or enter any clinical topic to generate a comprehensive module.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700">
              Platform Curriculum
            </span>
          </div>

          <div className="space-y-6">
            {/* Subject Selector Pills */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Select Medical Discipline:
              </label>
              <div className="flex flex-wrap gap-2">
                {MEDICAL_SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setCurrSubject(sub);
                      const defaultTop = CURATED_TOPICS[sub]?.[0] || 'General Principles';
                      setCurrTopic(defaultTop);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      currSubject === sub
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Recommended High-Yield Topics for Selected Subject */}
            {CURATED_TOPICS[currSubject] && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  High-Yield Core Topics ({currSubject}):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CURATED_TOPICS[currSubject].map((top) => (
                    <button
                      key={top}
                      type="button"
                      onClick={() => {
                        setCurrTopic(top);
                        setCustomTopicInput('');
                        handleGenerateCurriculumHub(top);
                      }}
                      disabled={isGeneratingHub}
                      className="p-3 bg-purple-50/50 hover:bg-purple-100/60 border border-purple-100 rounded-xl text-left transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-gray-900 group-hover:text-purple-800">
                          {top}
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-1 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Topic Input */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Or Type Any Specific Topic / Clinical Syndrome:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTopicInput}
                  onChange={(e) => setCustomTopicInput(e.target.value)}
                  placeholder="e.g. Auspitz sign in Psoriasis, Pheochromocytoma 10% rule"
                  className="flex-1 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => handleGenerateCurriculumHub()}
                  disabled={isGeneratingHub || (!customTopicInput.trim() && !currTopic)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGeneratingHub ? 'Generating...' : 'Generate Module'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TODAY'S GENERATED LEARNING HUB COCKPIT                              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeHub && (
        <div className="bg-white rounded-2xl border-2 border-teal-500/40 shadow-lg p-6 mb-8">
          {/* Header of Cockpit */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">
                  {activeHub.subject}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  Today's Active Hub
                </span>
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Practice
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight">
                {activeHub.topic}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Comprehensive study package generated from your lecture material.
              </p>
            </div>

            {/* Action Shortcuts */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/ai-tutor"
                state={{ initialTopic: activeHub.topic, initialSubject: activeHub.subject }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Brain className="w-3.5 h-3.5 text-teal-400" />
                Ask AI Tutor
              </Link>
              <Link
                to="/study-plan"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold rounded-xl border border-teal-200 transition"
              >
                <Calendar className="w-3.5 h-3.5" />
                View in Study Plan
              </Link>
              {activeHub.materialId && (
                <Link
                  to={`/learning/materials/${activeHub.materialId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Reader
                </Link>
              )}
            </div>
          </div>

          {/* Cockpit Navigation Tabs */}
          <div className="flex flex-wrap gap-2 pt-4 border-b border-gray-100 pb-3">
            <button
              onClick={() => setActiveCockpitTab('SUMMARY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeCockpitTab === 'SUMMARY'
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              1. High-Yield Summary
            </button>

            <button
              onClick={() => setActiveCockpitTab('FLASHCARDS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeCockpitTab === 'FLASHCARDS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              2. Flashcards ({activeHub.flashcards?.length || 0})
            </button>

            <button
              onClick={() => setActiveCockpitTab('MCQS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeCockpitTab === 'MCQS'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              3. Practice MCQs ({activeHub.mcqs?.length || 0})
            </button>

            <button
              onClick={() => setActiveCockpitTab('VIVA')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeCockpitTab === 'VIVA'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              4. Oral Viva ({activeHub.vivaQuestions?.length || 0})
            </button>

            <button
              onClick={() => setActiveCockpitTab('PATIENT')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeCockpitTab === 'PATIENT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              5. Virtual AI Patient
            </button>

            <button
              onClick={() => setActiveCockpitTab('TUTOR')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeCockpitTab === 'TUTOR'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              6. AI Medical Tutor
            </button>

            <button
              onClick={() => setActiveCockpitTab('OSCE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeCockpitTab === 'OSCE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              7. OSCE Station
            </button>

            <button
              onClick={() => setActiveCockpitTab('SCHEDULE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeCockpitTab === 'SCHEDULE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              8. Spaced Plan
            </button>
          </div>

          {/* TAB 1: SUMMARY */}
          {activeCockpitTab === 'SUMMARY' && (
            <div className="pt-5 space-y-6">
              <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-xl">
                <h3 className="font-bold text-navy-900 text-sm mb-1">Clinical Overview</h3>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {activeHub.summary.overview}
                </p>
              </div>

              {/* Key Pathophysiology & Concepts */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Key Concepts & Pathophysiology
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {activeHub.summary.keyConcepts.map((c, i) => (
                    <div key={i} className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical Relevance & Exam Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-2">
                  <h4 className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Clinical Relevance & Management
                  </h4>
                  <ul className="text-xs text-purple-950/80 space-y-1.5 list-disc list-inside">
                    {activeHub.summary.clinicalRelevance.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
                  <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    Examiner Must-Knows & Traps
                  </h4>
                  <ul className="text-xs text-amber-950/80 space-y-1.5 list-disc list-inside">
                    {activeHub.summary.examPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Quick Revision Mnemonic */}
              {activeHub.summary.quickRevision && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                  <h4 className="font-bold text-emerald-900 text-xs mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    High-Retention Mnemonic & Takeaway
                  </h4>
                  <p className="text-xs text-emerald-950 font-medium">
                    {activeHub.summary.quickRevision}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FLASHCARDS */}
          {activeCockpitTab === 'FLASHCARDS' && (
            <div className="pt-5 space-y-5">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Card <strong>{currentCardIndex + 1}</strong> of <strong>{activeHub.flashcards.length}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold uppercase text-[10px]">
                  {activeHub.flashcards[currentCardIndex]?.difficulty || 'Medium'}
                </span>
              </div>

              {/* Interactive Flip Card */}
              <div
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                className={`cursor-pointer min-h-56 p-6 rounded-2xl border-2 transition-all flex flex-col justify-between select-none shadow-sm ${
                  isCardFlipped
                    ? 'bg-gradient-to-br from-emerald-900 via-emerald-950 to-teal-950 border-emerald-600 text-white'
                    : 'bg-white border-gray-200 hover:border-emerald-500 text-gray-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100/20 text-xs font-bold uppercase tracking-wider">
                    <span className={isCardFlipped ? 'text-emerald-300' : 'text-gray-400'}>
                      {isCardFlipped ? 'Answer & Clinical Explanation' : 'Question / Clinical Prompt'}
                    </span>
                    <span className="text-[11px] opacity-75">Click to flip</span>
                  </div>

                  <div className="py-4">
                    {isCardFlipped ? (
                      <div className="space-y-3">
                        <p className="text-base sm:text-lg font-bold text-emerald-100">
                          {activeHub.flashcards[currentCardIndex]?.answer}
                        </p>
                        {activeHub.flashcards[currentCardIndex]?.explanation && (
                          <p className="text-xs text-emerald-200/80 leading-relaxed pt-2 border-t border-emerald-800/40">
                            {activeHub.flashcards[currentCardIndex]?.explanation}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-base sm:text-lg font-bold text-gray-900 leading-relaxed">
                        {activeHub.flashcards[currentCardIndex]?.question}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 text-right text-[11px] opacity-60">
                  {isCardFlipped ? 'Tap to see prompt again' : 'Tap to reveal answer'}
                </div>
              </div>

              {/* Card Nav Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCardFlipped(false);
                    setCurrentCardIndex(Math.max(0, currentCardIndex - 1));
                  }}
                  disabled={currentCardIndex === 0}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <Link
                  to="/flashcards"
                  className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  Open Full Flashcard Deck <ExternalLink className="w-3 h-3" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsCardFlipped(false);
                    setCurrentCardIndex(Math.min(activeHub.flashcards.length - 1, currentCardIndex + 1));
                  }}
                  disabled={currentCardIndex === activeHub.flashcards.length - 1}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MCQS */}
          {activeCockpitTab === 'MCQS' && (
            <div className="pt-5 space-y-6">
              {scoreTally !== null && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-teal-900 text-sm">Practice Quiz Complete!</h4>
                    <p className="text-xs text-teal-700">
                      You scored <strong>{scoreTally}</strong> out of <strong>{activeHub.mcqs.length}</strong> ({Math.round((scoreTally / activeHub.mcqs.length) * 100)}%)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedAnswers({});
                      setScoreTally(null);
                    }}
                    className="px-3 py-1.5 bg-white text-teal-800 text-xs font-bold rounded-lg border border-teal-300 shadow-2xs"
                  >
                    Reset Quiz
                  </button>
                </div>
              )}

              <div className="space-y-6">
                {activeHub.mcqs.map((q, idx) => {
                  const userAnswer = selectedAnswers[idx];
                  const hasAnswered = !!userAnswer;

                  return (
                    <div key={idx} className="p-5 bg-gray-50/60 border border-gray-200 rounded-2xl space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="w-6 h-6 rounded-full bg-navy-900 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-gray-900 flex-1 leading-relaxed">
                          {q.question}
                        </p>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                          const optionText = q[`option${opt}` as keyof typeof q] as string;
                          const isSelected = userAnswer === opt;
                          const isCorrect = q.correctOption === opt;

                          let btnClasses = 'border-gray-200 bg-white hover:border-teal-500 text-gray-800';
                          if (hasAnswered) {
                            if (isCorrect) {
                              btnClasses = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                            } else if (isSelected && !isCorrect) {
                              btnClasses = 'border-red-500 bg-red-50 text-red-900';
                            } else {
                              btnClasses = 'border-gray-200 bg-white opacity-60 text-gray-500';
                            }
                          }

                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => handleSelectMCQOption(idx, opt)}
                              disabled={hasAnswered}
                              className={`p-3 rounded-xl border text-left text-xs transition flex items-start gap-2 ${btnClasses}`}
                            >
                              <span className="font-bold text-[11px] opacity-75">{opt}.</span>
                              <span className="flex-1">{optionText}</span>
                              {hasAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation reveal */}
                      {hasAnswered && (
                        <div className="p-3.5 bg-white border border-teal-200 rounded-xl text-xs space-y-1 mt-2">
                          <p className="font-bold text-teal-900">
                            {userAnswer === q.correctOption ? '✅ Correct Answer!' : `❌ Correct Answer: Option ${q.correctOption}`}
                          </p>
                          <p className="text-gray-700 leading-relaxed">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: VIVA */}
          {activeCockpitTab === 'VIVA' && (
            <div className="pt-5 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Oral examination questions typically asked by external examiners and professors during medical board viva:
              </p>

              <div className="space-y-3">
                {activeHub.vivaQuestions.map((v, idx) => {
                  const isExpanded = !!expandedViva[idx];
                  return (
                    <div key={idx} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            Q{idx + 1}
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-gray-900 leading-relaxed">
                            "{v.question}"
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedViva({ ...expandedViva, [idx]: !isExpanded })}
                          className="text-xs font-bold text-purple-600 hover:text-purple-800 flex-shrink-0 ml-2"
                        >
                          {isExpanded ? 'Hide Key Points' : 'Reveal Model Answer'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="pt-2 border-t border-gray-200/80 space-y-2 text-xs">
                          <span className="font-bold text-purple-900">Expected Core Concepts to Mention:</span>
                          <ul className="space-y-1 list-disc list-inside text-gray-700">
                            {v.expectedConcepts.map((c, ci) => (
                              <li key={ci}>{c}</li>
                            ))}
                          </ul>
                          <div className="pt-1">
                            <Link
                              to="/ai-tutor"
                              state={{
                                initialMessage: `Professor, could you conduct a viva on this question: "${v.question}"?`,
                                initialSubject: activeHub.subject,
                                initialTopic: activeHub.topic,
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline"
                            >
                              Practice this query with AI Tutor <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: VIRTUAL AI PATIENT */}
          {activeCockpitTab === 'PATIENT' && (
            <div className="pt-5 space-y-6">
              <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        Clinical Case Simulation
                      </span>
                      <h3 className="font-bold text-gray-900 text-base mt-1">
                        Virtual Patient Consultation: {activeHub.topic}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Practice real-time interactive patient interview, differential diagnosis, and management plan.
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/cases?topic=${encodeURIComponent(activeHub.topic)}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition whitespace-nowrap"
                  >
                    <UserCheck className="w-4 h-4" />
                    Start Live AI Patient Simulation
                  </Link>
                </div>

                {/* Patient Case Presentation */}
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/90 border border-emerald-100 rounded-xl space-y-2">
                    <h4 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Patient Presentation & Symptoms
                    </h4>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      A patient arrives at the clinic presenting with hallmark signs associated with <strong>{activeHub.topic}</strong> ({activeHub.subject}). Elicit chief complaints, timeline of onset, aggravating factors, and past medical history.
                    </p>
                  </div>

                  <div className="p-4 bg-white/90 border border-emerald-100 rounded-xl space-y-2">
                    <h4 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                      Key Clinical Learning Objectives
                    </h4>
                    <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                      {activeHub.summary.clinicalRelevance.slice(0, 3).map((cr, idx) => (
                        <li key={idx}>{cr}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AI MEDICAL TUTOR */}
          {activeCockpitTab === 'TUTOR' && (
            <div className="pt-5 space-y-6">
              <div className="bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-transparent border border-sky-200 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-sky-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full">
                        Academic Clinical Faculty
                      </span>
                      <h3 className="font-bold text-gray-900 text-base mt-1">
                        AI Medical Tutor: {activeHub.topic}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Ask deep mechanistic questions, clarify confusing concepts, and drill active clinical recall.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/ai-tutor"
                    state={{
                      initialMessage: activeHub.tutorStarterPrompt,
                      initialSubject: activeHub.subject,
                      initialTopic: activeHub.topic,
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md transition whitespace-nowrap"
                  >
                    <Bot className="w-4 h-4" />
                    Open Live Tutor Discussion
                  </Link>
                </div>

                {/* Tutor Starter & Suggested Queries */}
                <div className="mt-5 space-y-4">
                  <div className="p-4 bg-white/90 border border-sky-100 rounded-xl">
                    <h4 className="font-bold text-xs text-sky-900 mb-1">Tutor Initial Assessment:</h4>
                    <p className="text-xs text-gray-800 leading-relaxed font-medium">
                      "{activeHub.tutorStarterPrompt}"
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Suggested Clinical Concept Drills:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        `Explain the core mechanism and pathophysiology of ${activeHub.topic}`,
                        `What are the most frequent exam traps and diagnostic pitfalls in ${activeHub.topic}?`,
                        `Give me a rapid 3-question viva drill on ${activeHub.topic}`,
                      ].map((promptText, pIdx) => (
                        <Link
                          key={pIdx}
                          to="/ai-tutor"
                          state={{
                            initialMessage: promptText,
                            initialSubject: activeHub.subject,
                            initialTopic: activeHub.topic,
                          }}
                          className="p-3 bg-white hover:bg-sky-50/70 border border-sky-100 hover:border-sky-300 rounded-xl text-left transition flex flex-col justify-between group"
                        >
                          <span className="text-xs text-gray-800 group-hover:text-sky-900 font-medium">
                            "{promptText}"
                          </span>
                          <span className="text-[10px] text-sky-600 font-bold mt-2 flex items-center gap-1">
                            Ask Tutor <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition" />
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: OSCE CLINICAL STATION */}
          {activeCockpitTab === 'OSCE' && (
            <div className="pt-5 space-y-6">
              <div className="bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border border-purple-200 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full">
                        Practical Exam Simulation • 8 Minutes
                      </span>
                      <h3 className="font-bold text-gray-900 text-base mt-1">
                        OSCE Station: {activeHub.topic}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Simulated physical examination, patient counseling, and clinical management station.
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/exams?topic=${encodeURIComponent(activeHub.topic)}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition whitespace-nowrap"
                  >
                    <Award className="w-4 h-4" />
                    Launch OSCE Station Exam
                  </Link>
                </div>

                {/* Candidate Instructions & Checklist */}
                <div className="mt-5 space-y-4">
                  <div className="p-4 bg-white/90 border border-purple-100 rounded-xl space-y-2">
                    <h4 className="font-bold text-xs text-purple-900">Candidate Briefing:</h4>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      You are the Junior Doctor in the Medical Admissions Unit. A patient has presented with suspected <strong>{activeHub.topic}</strong>. In the next 8 minutes: take a focused history, identify critical signs/red flags, and explain your investigative strategy and treatment plan.
                    </p>
                  </div>

                  <div className="p-4 bg-white/90 border border-purple-100 rounded-xl space-y-2">
                    <h4 className="font-bold text-xs text-purple-900">OSCE Examiner Marking Criteria:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                      {[
                        '1. Professional introduction, patient consent, and structured rapport.',
                        `2. Accurate elicitation of cardinal symptoms related to ${activeHub.topic}.`,
                        '3. Recognition of clinical red flags and indications for emergency referral.',
                        '4. Clear justification of baseline investigations and confirmatory diagnostic tests.',
                        '5. Empathetic patient communication and clear discharge/management advice.',
                      ].map((crit, cIdx) => (
                        <div key={cIdx} className="p-2.5 bg-purple-50/50 rounded-lg border border-purple-100/60 flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                          <span>{crit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SCHEDULE */}
          {activeCockpitTab === 'SCHEDULE' && (
            <div className="pt-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-navy-900 text-sm">Spaced Repetition Schedule for this Lecture</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Scientifically calculated intervals to prevent the Ebbinghaus forgetting curve.
                  </p>
                </div>
                <Link
                  to="/study-plan"
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 font-bold text-xs rounded-lg border border-blue-200"
                >
                  Go to Today's Tasks
                </Link>
              </div>

              <div className="divide-y divide-gray-100">
                {activeHub.suggestedSchedule.map((s, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 font-bold text-[10px] w-24 text-center">
                        {s.phase}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900">{s.title}</p>
                        <span className="text-[11px] text-gray-500">
                          {s.taskType} • {s.durationMinutes} minutes
                        </span>
                      </div>
                    </div>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                      <Check className="w-3.5 h-3.5" /> Scheduled
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* RECENT MATERIALS & STATS                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column (2 cols): Recent Materials */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h2 className="font-bold text-navy-900 text-base">Your Uploaded Materials</h2>
              </div>
              <Link
                to="/learning/materials"
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
              >
                View Library ({data?.stats?.materialsCount ?? 0}) <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-gray-400 animate-pulse text-sm">
                Loading study materials...
              </div>
            ) : !data?.recentMaterials?.length ? (
              <div className="p-8 text-center">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">No class materials uploaded yet</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Upload a photo of your handwritten lecture note or textbook page to start building your personal learning hub.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {data.recentMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 rounded-xl px-2 transition"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 font-bold text-xs uppercase">
                        {mat.fileType || 'PDF'}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/learning/materials/${mat.id}`}
                          className="font-bold text-gray-900 hover:text-teal-700 text-sm truncate block"
                        >
                          {mat.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                            {mat.subject}
                          </span>
                          {mat.topic && <span>• {mat.topic}</span>}
                          <span>• {formatFileSize(mat.fileSize)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      <Link
                        to={`/learning/materials/${mat.id}`}
                        className="px-3.5 py-1.5 bg-gray-100 hover:bg-teal-50 hover:text-teal-800 text-gray-700 text-xs font-semibold rounded-lg transition"
                      >
                        Open Reader
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Notes & Flashcard Decks */}
        <div className="space-y-6">
          {/* Notes Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-navy-900 text-sm">Recent Lecture Notes</h3>
              </div>
              <Link to="/notes" className="text-xs text-purple-700 hover:underline">
                View all
              </Link>
            </div>
            {!data?.recentNotes?.length ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No lecture notes saved yet. Generate notes from your uploaded lecture photos.
              </p>
            ) : (
              <div className="divide-y divide-gray-50 pt-2">
                {data.recentNotes.map((n) => (
                  <Link
                    key={n.id}
                    to="/notes"
                    className="block py-2.5 hover:bg-gray-50 rounded-lg px-2 transition"
                  >
                    <p className="text-xs font-semibold text-gray-900 truncate">{n.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                      <span className="text-purple-700 font-medium">{n.subject}</span>
                      <span>• {new Date(n.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Flashcards Card */}
          <div className="card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-navy-900 text-sm">Study Flashcards</h3>
              </div>
              <Link to="/flashcards" className="text-xs text-emerald-700 hover:underline">
                View all
              </Link>
            </div>
            {!data?.decks?.length ? (
              <p className="text-xs text-gray-400 py-4 text-center">
                No flashcard decks yet. Generate decks from your class materials.
              </p>
            ) : (
              <div className="divide-y divide-gray-50 pt-2">
                {data.decks.map((d) => (
                  <Link
                    key={d.id}
                    to="/flashcards"
                    className="block py-2.5 hover:bg-gray-50 rounded-lg px-2 transition"
                  >
                    <p className="text-xs font-semibold text-gray-900 truncate">{d.title}</p>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-gray-500">
                      <span className="text-emerald-700 font-medium">{d.subject}</span>
                      <span>{d._count?.cards ?? d.cards?.length ?? 0} cards</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Educational Notice Banner */}
      <div className="p-4 bg-teal-50/60 border border-teal-100 rounded-xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-teal-900/80 leading-relaxed">
          <strong className="font-semibold text-teal-950">Techboloy Med Academic Disclaimer:</strong>{' '}
          Techboloy Med is an educational simulation and study platform. AI-generated educational content may contain errors and should be verified against trusted medical textbooks, institutional teaching materials, and qualified educators. It is not a substitute for clinical supervision or professional medical advice.
        </p>
      </div>
    </div>
  );
}
