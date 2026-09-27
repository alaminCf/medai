import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  Flame, 
  Brain, 
  BookOpen, 
  HelpCircle, 
  Mic, 
  
  Sparkles,
  
  Clock,
  ChevronRight
} from 'lucide-react';
import learningService from '../../services/learningService';
import { useAuth } from '../../context/AuthContext';
import { StudyPlanTask, LearningStreakInfo, LearningRecommendation } from '../../types';

export const TodayPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<StudyPlanTask[]>([]);
  const [streak, setStreak] = useState<LearningStreakInfo | null>(null);
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]);
  const [dueCardsCount, setDueCardsCount] = useState(0);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      setLoading(true);
      const [todayTasks, streakData, recsData, revisionData] = await Promise.all([
        learningService.getTodayTasks(),
        learningService.getLearningStreak().catch(() => null),
        learningService.getRecommendations().catch(() => []),
        learningService.getTodayRevision().catch(() => null)
      ]);

      setTasks(todayTasks);
      setStreak(streakData);
      setRecommendations(recsData);
      setDueCardsCount(revisionData?.counts?.totalDue || 0);
    } catch (err) {
      console.error('Failed to load today study data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      const updated = await learningService.toggleStudyTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: updated.isCompleted } : t));
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Brain className="w-96 h-96" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Daily Adaptive Learning
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Doctor'}
            </h1>
            <p className="text-slate-300 text-base max-w-xl">
              Here is your structured learning plan for today. Focused on spaced recall, adaptive clinical reasoning, and concept mastery.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {streak && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30">
                  <Flame className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{streak.currentStreak} Days</div>
                  <div className="text-xs text-slate-300 font-medium">Learning Streak</div>
                </div>
              </div>
            )}
            
            <button
              onClick={() => {
                const firstPending = tasks.find(t => !t.isCompleted);
                if (firstPending?.actionUrl) {
                  navigate(firstPending.actionUrl);
                } else {
                  navigate('/revision');
                }
              }}
              className="px-6 py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2 hover:translate-x-0.5"
            >
              Start Today's Plan
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-300">Daily Progress:</span>
            <span className="text-sm font-bold text-teal-300">{completedCount} of {tasks.length} tasks completed</span>
          </div>
          <div className="w-full sm:w-64 h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid: 4 Core Learning Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Revision */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Spaced Repetition</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Due Revision</h3>
              <p className="text-xs text-slate-500 mt-1">
                {dueCardsCount > 0 ? `${dueCardsCount} flashcards scheduled for retention check.` : 'All scheduled cards completed for today.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/flashcards/review')}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold transition flex items-center justify-center gap-2"
          >
            Review Flashcards
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Practice */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Adaptive MCQ</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Recommended Practice</h3>
              <p className="text-xs text-slate-500 mt-1">
                10 clinical scenario and conceptual questions targeted at your recent weak points.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/mcq/adaptive')}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-sm font-bold transition flex items-center justify-center gap-2"
          >
            Start Adaptive Quiz
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Oral Viva */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Oral Simulation</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Adaptive Viva</h3>
              <p className="text-xs text-slate-500 mt-1">
                5 examiner questions that dynamically probe your physiology concepts and clarity.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/viva/adaptive')}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold transition flex items-center justify-center gap-2"
          >
            Practice Viva
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4. New Learning */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Curriculum</span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">New Learning</h3>
              <p className="text-xs text-slate-500 mt-1">
                Deep dive into high-yield mechanisms and clinical case correlations in your study notes.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/notes')}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-bold transition flex items-center justify-center gap-2"
          >
            Study Notes
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Task List & Recommendations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Task Checklist (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Today's Schedule Checklist</h2>
              <p className="text-xs text-slate-500 mt-0.5">Track and complete each learning milestone</p>
            </div>
            <button
              onClick={() => navigate('/study-plan')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Customize Plan
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  task.isCompleted 
                    ? 'bg-slate-50/80 border-slate-200/60 opacity-80' 
                    : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button 
                    onClick={() => handleToggleTask(task.id)}
                    className="flex-shrink-0 text-slate-400 hover:text-teal-600 transition"
                  >
                    {task.isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-teal-600 fill-teal-50" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        task.taskType === 'FLASHCARD' ? 'bg-indigo-100 text-indigo-700' :
                        task.taskType === 'MCQ' ? 'bg-teal-100 text-teal-700' :
                        task.taskType === 'VIVA' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {task.taskType}
                      </span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.durationMinutes} min
                      </span>
                    </div>
                    <div className={`text-sm font-bold ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.title || `${task.subject}: ${task.topic}`}
                    </div>
                  </div>
                </div>

                {task.actionUrl && (
                  <button
                    onClick={() => navigate(task.actionUrl!)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      task.isCompleted
                        ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                    }`}
                  >
                    {task.isCompleted ? 'Revisit' : 'Start'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations & Quick Links (1 Col) */}
        <div className="space-y-6">
          {/* Smart Recommendations */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-slate-900 text-base">Adaptive Insights</h3>
            </div>
            
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="text-xs font-bold text-slate-800">{rec.title}</div>
                  <p className="text-xs text-slate-500 leading-relaxed">{rec.description}</p>
                  <button
                    onClick={() => navigate(rec.actionUrl)}
                    className="text-xs font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"
                  >
                    {rec.actionLabel || 'Review Now'}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Hub Launchers */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4">
            <h3 className="font-bold text-sm tracking-wider uppercase text-teal-400">Quick Access</h3>
            <div className="space-y-2">
              <button 
                onClick={() => navigate('/progress/mistakes')}
                className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-between text-xs font-semibold text-slate-200"
              >
                <span>Mistake Bank</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button 
                onClick={() => navigate('/progress/knowledge-map')}
                className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-between text-xs font-semibold text-slate-200"
              >
                <span>Knowledge Map</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button 
                onClick={() => navigate('/revision')}
                className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition flex items-center justify-between text-xs font-semibold text-slate-200"
              >
                <span>Smart Revision</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodayPage;
