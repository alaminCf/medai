import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Camera,
  Upload,
  Clock,
  Sparkles,
  BookOpen,
  HelpCircle,
  Brain,
  Mic,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sliders,
  Flame,
  Check,
  RotateCcw,
  Zap,
  Target,
  GraduationCap,
  ChevronRight,
  Award,
} from 'lucide-react';
import learningService from '../../services/learningService';
import { StudyPlan, StudyPlanTask } from '../../types';

interface PlanPreset {
  id: string;
  name: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  goal: string;
  title: string;
  dailyMinutes: number;
  subjects: string[];
  days: string[];
  description: string;
}

const PRESETS: PlanPreset[] = [
  {
    id: 'mbbs_sprint',
    name: 'MBBS Prof Exam Sprint',
    badge: 'Most Popular',
    icon: Flame,
    goal: 'Pass 2nd Year MBBS Prof Examinations with Distinction',
    title: 'MBBS Prof Exam Sprint Plan',
    dailyMinutes: 90,
    subjects: ['Physiology', 'Anatomy', 'Biochemistry', 'Pathology'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    description: 'High-yield mix of intensive MCQ drills, Spaced Flashcards, and Oral Viva scenarios.',
  },
  {
    id: 'clinical_clerkship',
    name: 'Ward & Clinical Clerkship',
    badge: 'Clinical Prep',
    icon: GraduationCap,
    goal: 'Master Ward Round Presentations, Case History & OSCE Stations',
    title: 'Ward & Clinical Clerkship Roadmap',
    dailyMinutes: 60,
    subjects: ['Pathology', 'Pharmacology', 'Physiology'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    description: 'Targeted for hospital rotations: diagnostic criteria, oral viva queries and pathology notes.',
  },
  {
    id: 'daily_recall',
    name: '30-Min Fast Active Recall',
    badge: 'Quick Habit',
    icon: Zap,
    goal: 'Maintain Daily Active Recall & Long-Term Retention',
    title: 'Daily High-Retention Habit Plan',
    dailyMinutes: 30,
    subjects: ['Physiology', 'Pathology', 'Pharmacology'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    description: 'Bite-sized daily retention habit: flashcard review + adaptive practice questions.',
  },
  {
    id: 'foundation_deep',
    name: 'Deep Conceptual Mastery',
    badge: 'Comprehensive',
    icon: Target,
    goal: 'Build Rock-Solid Foundations in Pre-Clinical Sciences',
    title: 'Pre-Clinical Deep Dive Curriculum',
    dailyMinutes: 120,
    subjects: ['Physiology', 'Anatomy', 'Biochemistry'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    description: 'Deep textbook notes review, followed by viva practice and clinical case correlation.',
  },
];

const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const allSubs = ['Physiology', 'Anatomy', 'Biochemistry', 'Pathology', 'Pharmacology'];

const safeArray = (val: any, fallback: string[]): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
  }
  return fallback;
};

export const StudyPlanPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [todayTasks, setTodayTasks] = useState<StudyPlanTask[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'config'>('today');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');

  // Form inputs for customization
  const [goal, setGoal] = useState('Prepare for 2nd Year Final Examination');
  const [title, setTitle] = useState('Comprehensive Finals Revision');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Physiology', 'Anatomy', 'Pathology']);
  const [availableDays, setAvailableDays] = useState<string[]>([
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]);
  const [dailyMinutes, setDailyMinutes] = useState(90);
  const [examDate, setExamDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyingPresetId, setApplyingPresetId] = useState<string | null>(null);
  // Class Material Sync State
  const [showClassUpload, setShowClassUpload] = useState(false);
  const [classFile, setClassFile] = useState<File | null>(null);
  const [classTopic, setClassTopic] = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [classMinutes, setClassMinutes] = useState(45);
  const [isSyncingClass, setIsSyncingClass] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState('');
  const [syncError, setSyncError] = useState('');


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plan, tasks] = await Promise.all([
        learningService.getActiveStudyPlan(),
        learningService.getTodayTasks().catch(() => []),
      ]);

      if (plan) {
        setActivePlan(plan);
        setTitle(plan.title || 'My Study Plan');
        setGoal(plan.goal || '');
        setSelectedSubjects(safeArray(plan.subjects, ['Physiology', 'Anatomy', 'Pathology']));
        setAvailableDays(safeArray(plan.availableDays, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']));
        setDailyMinutes(plan.dailyTimeMinutes || 90);
        if (plan.examDate) {
          setExamDate(new Date(plan.examDate).toISOString().split('T')[0]);
        }
      } else {
        setActiveTab('config');
      }

      setTodayTasks(tasks || []);
    } catch (err) {
      console.error('Failed to load study plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncClassMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classFile && !classTopic.trim()) {
      setSyncError('Please upload a photo of your handwritten class note, textbook page, or enter a topic.');
      return;
    }

    try {
      setIsSyncingClass(true);
      setSyncError('');
      setSyncSuccessMessage('');

      const formData = new FormData();
      if (classFile) formData.append('file', classFile);
      if (classTopic) formData.append('topic', classTopic);
      if (classSubject) formData.append('subject', classSubject);
      formData.append('dailyMinutes', String(classMinutes));

      const res = await learningService.createStudyPlanFromClassMaterial(formData);

      if (res.success && res.plan) {
        setActivePlan(res.plan);
        setTitle(res.plan.title);
        setGoal(res.plan.goal);
        setTodayTasks(res.todayTasks || []);
        setActiveTab('today');
        setSyncSuccessMessage(`✅ Successfully synchronized class lecture on "${res.detectedTopic || classTopic || 'Class Topic'}"! Day 0 consolidation tasks are ready below.`);
        setShowClassUpload(false);
        setClassFile(null);
        setClassTopic('');
      }
    } catch (err: any) {
      console.error('Failed to sync class material into study plan:', err);
      setSyncError(err?.response?.data?.error || 'Failed to analyze class note. Please try again.');
    } finally {
      setIsSyncingClass(false);
    }
  };

  const handleApplyPreset = async (preset: PlanPreset) => {
    try {
      setApplyingPresetId(preset.id);
      const created = await learningService.createStudyPlan({
        title: preset.title,
        goal: preset.goal,
        subjects: preset.subjects,
        availableDays: preset.days,
        dailyTimeMinutes: preset.dailyMinutes,
        examDate: examDate || undefined,
      });

      setActivePlan(created);
      setTitle(preset.title);
      setGoal(preset.goal);
      setSelectedSubjects(preset.subjects);
      setAvailableDays(preset.days);
      setDailyMinutes(preset.dailyMinutes);

      // Refresh today tasks
      const updatedTasks = await learningService.getTodayTasks().catch(() => []);
      setTodayTasks(updatedTasks || []);

      setActiveTab('today');
    } catch (err) {
      console.error('Failed to apply preset plan:', err);
    } finally {
      setApplyingPresetId(null);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const created = await learningService.createStudyPlan({
        title,
        goal,
        subjects: selectedSubjects,
        availableDays,
        dailyTimeMinutes: dailyMinutes,
        examDate: examDate || undefined,
      });

      setActivePlan(created);
      const updatedTasks = await learningService.getTodayTasks().catch(() => []);
      setTodayTasks(updatedTasks || []);
      setActiveTab('today');
    } catch (err) {
      console.error('Failed to create plan:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      // Optimistic update
      setActivePlan(prev => {
        if (!prev || !prev.tasks) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map(t =>
            t.id === taskId
              ? { ...t, isCompleted: !t.isCompleted, completedAt: !t.isCompleted ? new Date().toISOString() : null }
              : t
          ),
        };
      });

      setTodayTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? { ...t, isCompleted: !t.isCompleted, completedAt: !t.isCompleted ? new Date().toISOString() : null }
            : t
        )
      );

      await learningService.toggleStudyTask(taskId);
    } catch (err) {
      console.error('Failed to toggle task:', err);
      loadData();
    }
  };

  const toggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      if (availableDays.length > 1) {
        setAvailableDays(availableDays.filter(d => d !== day));
      }
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter(s => s !== sub));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'FLASHCARD':
        return <Brain className="w-4 h-4 text-indigo-500" />;
      case 'MCQ':
        return <HelpCircle className="w-4 h-4 text-teal-600" />;
      case 'VIVA':
        return <Mic className="w-4 h-4 text-rose-500" />;
      case 'READING':
      default:
        return <BookOpen className="w-4 h-4 text-amber-500" />;
    }
  };

  const getTaskActionLabel = (type: string) => {
    switch (type) {
      case 'FLASHCARD':
        return 'Review Cards';
      case 'MCQ':
        return 'Practice MCQs';
      case 'VIVA':
        return 'Oral Viva';
      case 'READING':
      default:
        return 'Read Notes';
    }
  };

  const getTaskActionUrl = (t: StudyPlanTask) => {
    if (t.actionUrl) return t.actionUrl;
    switch (t.taskType) {
      case 'FLASHCARD':
        return '/flashcards/review';
      case 'MCQ':
        return `/mcq/adaptive?subject=${encodeURIComponent(t.subject)}&topic=${encodeURIComponent(t.topic)}`;
      case 'VIVA':
        return `/viva/adaptive?subject=${encodeURIComponent(t.subject)}&topic=${encodeURIComponent(t.topic)}`;
      case 'READING':
      default:
        return `/notes?topic=${encodeURIComponent(t.topic)}`;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
        <p className="text-xs font-semibold text-slate-500">Loading your personalized study schedule...</p>
      </div>
    );
  }

  const parsedSubjects = safeArray(activePlan?.subjects, ['Physiology', 'Anatomy', 'Pathology']);
  const parsedDays = safeArray(activePlan?.availableDays, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const planTasks = activePlan?.tasks || [];

  const completedTodayCount = todayTasks.filter(t => t.isCompleted).length;
  const todayProgress = todayTasks.length > 0 ? Math.round((completedTodayCount / todayTasks.length) * 100) : 0;

  const totalWeeklyTasks = planTasks.length;
  const completedWeeklyTasks = planTasks.filter(t => t.isCompleted).length;
  const weeklyProgress = totalWeeklyTasks > 0 ? Math.round((completedWeeklyTasks / totalWeeklyTasks) * 100) : 0;

  // Days mapping for weekly view
  const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              AI Adaptive Curriculum Planner
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {activePlan?.title || 'Personalized Medical Study Plan'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {activePlan?.goal || 'Structured weekly curriculum balanced between active recall, adaptive MCQs, clinical notes, and viva.'}
            </p>
          </div>

          {/* Quick Metrics */}
          {activePlan && (
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-3 min-w-[130px]">
                <Clock className="w-5 h-5 text-teal-300 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-300 uppercase font-semibold">Daily Time</div>
                  <div className="text-base font-black text-white">{activePlan.dailyTimeMinutes} min</div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-3 min-w-[130px]">
                <Award className="w-5 h-5 text-amber-300 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-300 uppercase font-semibold">Weekly Goal</div>
                  <div className="text-base font-black text-white">{parsedDays.length} Days</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync Class Material Action Card / Banner */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-white rounded-2xl border-2 border-teal-500/30 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-navy-900 text-sm sm:text-base">
                Option 1: Sync Today's Physical Class Note or Book Photo
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-100 text-teal-800">
                Classroom Sync
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Snap a picture of what you studied in physical class today. The AI reads your handwriting or book page and creates a dedicated Spaced Repetition study plan.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowClassUpload(!showClassUpload)}
          className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs shrink-0"
        >
          <Upload className="w-4 h-4 text-teal-400" />
          {showClassUpload ? 'Close Uploader' : 'Snap / Upload Class Note'}
        </button>
      </div>

      {/* Expandable Class Note Uploader */}
      {showClassUpload && (
        <div className="bg-white rounded-2xl border border-teal-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h4 className="font-bold text-navy-900 text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-teal-600" />
                Upload Classroom Lecture Note or Book Topic
              </h4>
              <p className="text-xs text-gray-500">
                Supports photos of handwritten notes, whiteboard diagrams, book pages, or lecture slides.
              </p>
            </div>
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
              Handwriting & PDF OCR
            </span>
          </div>

          <form onSubmit={handleSyncClassMaterial} className="space-y-4">
            {syncError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{syncError}</span>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 hover:border-teal-500 rounded-xl p-5 text-center bg-gray-50/50 transition">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.txt"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setClassFile(f);
                  if (f && !classTopic) {
                    setClassTopic(f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
                  }
                }}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
              />
              <p className="text-[11px] text-gray-500 mt-2">
                Supports JPG, PNG, WEBP, PDF (Max 25 MB). Optical character recognition will extract all medical terms automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Topic Name (Optional)
                </label>
                <input
                  type="text"
                  value={classTopic}
                  onChange={(e) => setClassTopic(e.target.value)}
                  placeholder="e.g. Aortic Stenosis, Psoriasis"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subject (Optional)
                </label>
                <select
                  value={classSubject}
                  onChange={(e) => setClassSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="">Auto-Detect Subject</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Respiratory Medicine">Respiratory Medicine</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Gastroenterology">Gastroenterology</option>
                  <option value="Nephrology">Nephrology</option>
                  <option value="Pharmacology">Pharmacology</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Physiology">Physiology</option>
                  <option value="Anatomy">Anatomy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Daily Study Target
                </label>
                <select
                  value={classMinutes}
                  onChange={(e) => setClassMinutes(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value={30}>30 Minutes / day</option>
                  <option value={45}>45 Minutes / day (Recommended)</option>
                  <option value={60}>60 Minutes / day</option>
                  <option value={90}>90 Minutes / day</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSyncingClass}
              className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {isSyncingClass ? 'Transcribing & Scheduling Spaced Repetition...' : 'Create Spaced-Repetition Plan for This Lecture'}
            </button>
          </form>
        </div>
      )}

      {syncSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-medium">
          <span>{syncSuccessMessage}</span>
          <button onClick={() => setSyncSuccessMessage('')} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Segmented Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'today'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Today's Focus</span>
            {todayTasks.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'today' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {completedTodayCount}/{todayTasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('week')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'week'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Weekly Roadmap</span>
            {planTasks.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'week' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {weeklyProgress}%
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'config'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Customize Plan</span>
          </button>
        </div>

        {activePlan && activeTab !== 'config' && (
          <button
            onClick={() => setActiveTab('config')}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 px-3 py-1.5 rounded-lg hover:bg-teal-50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Switch Plan / Presets
          </button>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          TAB 1: TODAY'S FOCUS TASKS (Execution Cockpit)
          ────────────────────────────────────────────────────────── */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Today's Progress Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">{currentDayName}'s Agenda</span>
                <span className="text-[10px] bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded-full border border-teal-100">
                  {completedTodayCount === todayTasks.length && todayTasks.length > 0 ? 'All Completed! 🎉' : `${todayTasks.length - completedTodayCount} tasks remaining`}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">Today's Active Study Session</h2>
              <p className="text-xs text-slate-500">
                Check off items as you complete them to maintain your spaced repetition streak.
              </p>
            </div>

            {/* Progress Bar Container */}
            <div className="sm:w-64 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-slate-600">Daily Completion</span>
                <span className="text-teal-600 font-black">{todayProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/50">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${todayProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Today Tasks List */}
          {todayTasks.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">No Specific Tasks Scheduled for Today</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Take a restful break or pick any high-yield topic from your weekly roadmap to stay ahead.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('week')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow transition"
              >
                <span>Browse Weekly Roadmap</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayTasks.map((t) => {
                const actionUrl = getTaskActionUrl(t);
                const actionLabel = getTaskActionLabel(t.taskType);

                return (
                  <div
                    key={t.id}
                    className={`bg-white rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between gap-4 shadow-sm ${
                      t.isCompleted
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-200 hover:border-teal-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(t.id)}
                        className="mt-0.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-full"
                        title={t.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                      >
                        {t.isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100 transition" />
                        ) : (
                          <Circle className="w-6 h-6 text-slate-300 hover:text-teal-600 transition" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1.5">
                            {getTaskIcon(t.taskType)}
                            {t.taskType}
                          </span>
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                            {t.subject}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t.durationMinutes} min
                          </span>
                        </div>

                        <h4
                          className={`text-sm sm:text-base font-bold text-slate-900 leading-snug truncate ${
                            t.isCompleted ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {t.title || `${t.topic} Practice`}
                        </h4>

                        <p className="text-xs text-slate-500 line-clamp-1">
                          Topic: <span className="font-semibold text-slate-700">{t.topic}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {t.isCompleted ? '✓ Completed' : 'Pending practice'}
                      </span>

                      <button
                        onClick={() => navigate(actionUrl)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                          t.isCompleted
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                        }`}
                      >
                        <span>{t.isCompleted ? 'Review Again' : actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 2: WEEKLY ROADMAP (Full Schedule & Days View)
          ────────────────────────────────────────────────────────── */}
      {activeTab === 'week' && (
        <div className="space-y-6">
          {/* Weekly Stats Header */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Weekly Curriculum</span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">7-Day Study Distribution</h2>
              <p className="text-xs text-slate-500">
                Subjects are cyclically rotated to guarantee spaced repetition across all disciplines.
              </p>
            </div>

            {/* Filter by Day */}
            <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
              <button
                onClick={() => setSelectedDayFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedDayFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white'
                }`}
              >
                All Days
              </button>
              {parsedDays.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDayFilter(day)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedDayFilter === day
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {parsedDays
              .filter(day => selectedDayFilter === 'ALL' || selectedDayFilter === day)
              .map((day, idx) => {
                const assignedSubject = parsedSubjects[idx % parsedSubjects.length];
                const dayTasks = planTasks.filter(t => t.dayOfWeek === day);
                const isCurrentDay = day === currentDayName;
                const completedDayTasks = dayTasks.filter(t => t.isCompleted).length;

                return (
                  <div
                    key={day}
                    className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all space-y-4 shadow-sm ${
                      isCurrentDay
                        ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Day Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-slate-900">{day}</span>
                          {isCurrentDay && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500 text-white">
                              Today
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md inline-block mt-1">
                          {assignedSubject}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-700">{activePlan?.dailyTimeMinutes || 90}m</span>
                        {dayTasks.length > 0 && (
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {completedDayTasks}/{dayTasks.length} done
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tasks within Day */}
                    <div className="space-y-2.5">
                      {dayTasks.length > 0 ? (
                        dayTasks.map(task => {
                          const actionUrl = getTaskActionUrl(task);
                          return (
                            <div
                              key={task.id}
                              className={`p-3 rounded-2xl border transition-all text-xs flex items-center justify-between gap-3 ${
                                task.isCompleted
                                  ? 'bg-emerald-50/30 border-emerald-200 text-slate-400'
                                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100/70 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTask(task.id)}
                                  className="focus:outline-none shrink-0"
                                >
                                  {task.isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-300 hover:text-teal-600" />
                                  )}
                                </button>
                                <div className="truncate">
                                  <div className={`font-bold truncate ${task.isCompleted ? 'line-through text-slate-400' : ''}`}>
                                    {task.title || `${task.topic} (${task.taskType})`}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <span>{task.durationMinutes} min</span>
                                    <span>•</span>
                                    <span>{task.taskType}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => navigate(actionUrl)}
                                className="shrink-0 p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200 transition"
                                title="Open module"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        /* Default standard distribution if tasks aren't populated */
                        <div className="space-y-2">
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-amber-500" />
                              <span className="font-bold text-slate-800">Concept Reading & Notes</span>
                            </div>
                            <span className="text-slate-400 font-semibold">{Math.round((activePlan?.dailyTimeMinutes || 90) * 0.4)}m</span>
                          </div>
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-teal-600" />
                              <span className="font-bold text-slate-800">Adaptive Practice MCQs</span>
                            </div>
                            <span className="text-slate-400 font-semibold">{Math.round((activePlan?.dailyTimeMinutes || 90) * 0.35)}m</span>
                          </div>
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              {idx % 2 === 0 ? <Brain className="w-4 h-4 text-indigo-500" /> : <Mic className="w-4 h-4 text-rose-500" />}
                              <span className="font-bold text-slate-800">{idx % 2 === 0 ? 'Spaced Repetition Cards' : 'Oral Viva Practice'}</span>
                            </div>
                            <span className="text-slate-400 font-semibold">
                              {(activePlan?.dailyTimeMinutes || 90) - Math.round((activePlan?.dailyTimeMinutes || 90) * 0.4) - Math.round((activePlan?.dailyTimeMinutes || 90) * 0.35)}m
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          TAB 3: CUSTOMIZE PLAN & 1-TAP PRESETS
          ────────────────────────────────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="space-y-8">
          {/* Quick Presets Section */}
          <div className="space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Recommended Quick Presets
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                1-Tap Medical Study Routines
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Select a medically calibrated curriculum blueprint, or scroll down to design your custom plan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PRESETS.map((p) => {
                const IconComponent = p.icon;
                const isApplying = applyingPresetId === p.id;

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {p.badge}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100">
                          {p.dailyMinutes}m / day
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-100">
                          {p.days.length} days / wk
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isApplying || isSubmitting}
                      onClick={() => handleApplyPreset(p)}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-teal-600 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isApplying ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Applying...</span>
                        </>
                      ) : (
                        <>
                          <span>Use This Blueprint</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Configuration Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Custom Plan Creator</span>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Fine-Tune Your Schedule</h2>
              <p className="text-xs text-slate-500">
                Choose specific subjects, set target examination deadlines, and calibrate your daily study allocation.
              </p>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Goal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Primary Academic Goal
                  </label>
                  <input
                    type="text"
                    required
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g. Pass 2nd Year MBBS Prof Examination"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Finals Revision Sprint"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Daily Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Daily Study Time
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 60, 90, 120].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDailyMinutes(mins)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                          dailyMinutes === mins
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Exam Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Target Exam Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Subjects Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Target Medical Disciplines
                </label>
                <div className="flex flex-wrap gap-2">
                  {allSubs.map(sub => {
                    const isSelected = selectedSubjects.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubject(sub)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Available Days */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Available Study Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {allDays.map(day => {
                    const isSelected = availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Educational Safety Notice */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold">Medical Education Notice:</span> This personalized plan is an academic organizational tool. Medical mastery depends on clinical practice and rigorous curriculum engagement; adherence to this schedule does not guarantee examination success.
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
                {activePlan && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('today')}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel & Return
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Plan...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate & Save Study Plan</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyPlanPage;
