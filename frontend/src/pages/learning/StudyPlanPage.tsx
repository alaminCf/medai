import React, { useState, useEffect } from 'react';

import {
  Calendar,
  Clock,
  Sparkles,
  BookOpen,
  HelpCircle,
  Brain,
  Mic,
  
  AlertCircle,
  
  
} from 'lucide-react';
import learningService from '../../services/learningService';
import { StudyPlan } from '../../types';

export const StudyPlanPage: React.FC = () => {
  

  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Form inputs
  const [goal, setGoal] = useState('Prepare for 2nd Year Final Examination');
  const [title, setTitle] = useState('Comprehensive Finals Revision');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Physiology', 'Anatomy', 'Pathology']);
  const [availableDays, setAvailableDays] = useState<string[]>([
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ]);
  const [dailyMinutes, setDailyMinutes] = useState(90);
  const [examDate, setExamDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadActivePlan();
  }, []);

  const loadActivePlan = async () => {
    try {
      setLoading(true);
      const plan = await learningService.getActiveStudyPlan();
      setActivePlan(plan);
      if (!plan) {
        setShowConfig(true);
      }
    } catch (err) {
      console.error('Failed to load study plan:', err);
    } finally {
      setLoading(false);
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
      setShowConfig(false);
    } catch (err) {
      console.error('Failed to create plan:', err);
    } finally {
      setIsSubmitting(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const allSubs = ['Physiology', 'Anatomy', 'Biochemistry', 'Pathology', 'Pharmacology'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Curriculum Planner
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Personalized Study Plan</h1>
          <p className="text-slate-500 text-sm mt-1">
            Structured weekly roadmap balanced between concept reading, active recall, adaptive MCQs, and oral vivas.
          </p>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-sm transition self-start md:self-auto"
        >
          {showConfig ? 'View Active Schedule' : 'Customize Study Plan'}
        </button>
      </div>

      {/* Educational Safety Notice */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">Medical Education Notice:</span> This personalized plan is an academic organizational tool. Medical mastery depends on clinical practice and rigorous curriculum engagement; adherence to this schedule does not guarantee examination success.
        </div>
      </div>

      {/* Plan Configurator Form */}
      {showConfig ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Configure Study Schedule</h2>

          <form onSubmit={handleCreatePlan} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Goal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Primary Goal</label>
                <input
                  type="text"
                  required
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Plan Name</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Daily Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Daily Study Time</label>
                <div className="flex gap-2">
                  {[60, 90, 120, 150].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDailyMinutes(mins)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${
                        dailyMinutes === mins
                          ? 'bg-teal-600 text-white border-teal-600'
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Target Exam Date (Optional)</label>
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Target Subjects</label>
              <div className="flex flex-wrap gap-2">
                {allSubs.map(sub => {
                  const isSelected = selectedSubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubject(sub)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Available Days */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Available Study Days</label>
              <div className="flex flex-wrap gap-2">
                {allDays.map(day => {
                  const isSelected = availableDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              {activePlan && (
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold shadow-md transition disabled:opacity-50"
              >
                {isSubmitting ? 'Generating Plan...' : 'Generate Weekly Study Plan'}
              </button>
            </div>
          </form>
        </div>
      ) : activePlan ? (
        /* Active Plan View */
        <div className="space-y-6">
          {/* Plan Info Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Active Study Roadmap</span>
              <h2 className="text-2xl font-black text-slate-900">{activePlan.title}</h2>
              <p className="text-xs text-slate-500">Goal: {activePlan.goal}</p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{activePlan.dailyTimeMinutes} min / day</span>
              </div>
              <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{activePlan.availableDays?.length || 6} days / week</span>
              </div>
            </div>
          </div>

          {/* Weekly Schedule Days Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activePlan.availableDays || allDays).map((day: string, idx: number) => {
              const subjects = activePlan.subjects || ['Physiology', 'Anatomy'];
              const assignedSubject = subjects[idx % subjects.length];
              const dailyMin = activePlan.dailyTimeMinutes || 90;

              return (
                <div key={day} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 hover:border-teal-300 transition">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-base font-black text-slate-900">{day}</span>
                    <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full">
                      {assignedSubject}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        <span className="font-bold text-slate-800">Concept Reading & Notes</span>
                      </div>
                      <span className="text-slate-400 font-semibold">{Math.round(dailyMin * 0.4)} min</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-teal-600" />
                        <span className="font-bold text-slate-800">Adaptive Practice Questions</span>
                      </div>
                      <span className="text-slate-400 font-semibold">{Math.round(dailyMin * 0.35)} min</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {idx % 2 === 0 ? <Brain className="w-4 h-4 text-indigo-600" /> : <Mic className="w-4 h-4 text-rose-600" />}
                        <span className="font-bold text-slate-800">{idx % 2 === 0 ? 'Spaced Repetition Cards' : 'Oral Viva Practice'}</span>
                      </div>
                      <span className="text-slate-400 font-semibold">{dailyMin - Math.round(dailyMin * 0.4) - Math.round(dailyMin * 0.35)} min</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StudyPlanPage;
