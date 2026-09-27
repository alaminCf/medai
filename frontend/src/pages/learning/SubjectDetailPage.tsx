import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layers,
  BookOpen,
  Brain,
  HelpCircle,
  Mic,
  
  
  ChevronLeft,
  ChevronRight,
  
  
  ArrowRight
} from 'lucide-react';
import learningService from '../../services/learningService';

export const SubjectDetailPage: React.FC = () => {
  const { subject, topic } = useParams<{ subject: string; topic?: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [masteries, setMasteries] = useState<any[]>([]);

  const formattedSubject = (subject || 'Physiology').charAt(0).toUpperCase() + (subject || 'Physiology').slice(1);
  const formattedTopic = topic ? decodeURIComponent(topic) : null;

  useEffect(() => {
    loadSubjectData();
  }, [subject, topic]);

  const loadSubjectData = async () => {
    try {
      setLoading(true);
      const res = await learningService.getTopicMasteries();
      setMasteries(res || []);
    } catch (err) {
      console.error('Failed to load topic masteries:', err);
    } finally {
      setLoading(false);
    }
  };

  const subjectTopics = masteries.filter(
    m => m.subject.toLowerCase() === formattedSubject.toLowerCase()
  );

  const currentTopicMastery = formattedTopic
    ? subjectTopics.find(m => m.topic.toLowerCase() === formattedTopic.toLowerCase()) || {
        topic: formattedTopic,
        subject: formattedSubject,
        status: 'LEARNING',
        masteryPercentage: 65,
        mcqAccuracy: 70,
        flashcardRetention: 75,
        vivaCoverage: 60,
        explanation: 'Active learning phase with balanced question and flashcard retention.',
      }
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // TOPIC SPECIFIC VIEW
  if (formattedTopic && currentTopicMastery) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <button
          onClick={() => navigate(`/subjects/${subject?.toLowerCase()}`)}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {formattedSubject} Overview
        </button>

        {/* Topic Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Topic Learning Hub</span>
              <h1 className="text-3xl font-black text-slate-900 mt-1">{currentTopicMastery.topic}</h1>
              <p className="text-slate-500 text-sm mt-1">Core curriculum unit in {formattedSubject}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-400 uppercase">Mastery Level</div>
                <div className="text-2xl font-black text-slate-900">{currentTopicMastery.masteryPercentage}%</div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                currentTopicMastery.status === 'STRONG' ? 'bg-emerald-100 text-emerald-800' :
                currentTopicMastery.status === 'REVIEW' ? 'bg-amber-100 text-amber-800' :
                'bg-teal-100 text-teal-800'
              }`}>
                {currentTopicMastery.status}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1">
            <span className="font-bold text-slate-900 uppercase">Performance Summary:</span>
            <p>{currentTopicMastery.explanation}</p>
          </div>
        </div>

        {/* Quick Launchpad Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <BookOpen className="w-6 h-6 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">Study Notes</h3>
              <p className="text-xs text-slate-500">Review foundational mechanisms and summary outlines.</p>
            </div>
            <button
              onClick={() => navigate(`/notes?topic=${encodeURIComponent(currentTopicMastery.topic)}`)}
              className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs"
            >
              Open Notes
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <Brain className="w-6 h-6 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Flashcards</h3>
              <p className="text-xs text-slate-500">Spaced recall checks for key definitions and parameters.</p>
            </div>
            <button
              onClick={() => navigate('/flashcards/review')}
              className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs"
            >
              Review Cards
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <HelpCircle className="w-6 h-6 text-teal-600" />
              <h3 className="text-base font-bold text-slate-900">Adaptive MCQs</h3>
              <p className="text-xs text-slate-500">Clinical vignettes and concept questions for this topic.</p>
            </div>
            <button
              onClick={() => navigate(`/mcq/adaptive?subject=${encodeURIComponent(formattedSubject)}&topic=${encodeURIComponent(currentTopicMastery.topic)}`)}
              className="w-full py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs"
            >
              Start Quiz
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <Mic className="w-6 h-6 text-rose-600" />
              <h3 className="text-base font-bold text-slate-900">Oral Viva</h3>
              <p className="text-xs text-slate-500">Practice viva examination with dynamic follow-up prompts.</p>
            </div>
            <button
              onClick={() => navigate(`/viva/adaptive?subject=${encodeURIComponent(formattedSubject)}&topic=${encodeURIComponent(currentTopicMastery.topic)}`)}
              className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs"
            >
              Practice Viva
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SUBJECT OVERVIEW
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Subject Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5" />
            Curriculum Discipline
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{formattedSubject} Hub</h1>
          <p className="text-slate-500 text-sm mt-1">
            Explore topic mastery, scheduled spaced revisions, and comprehensive practice modules.
          </p>
        </div>

        <button
          onClick={() => navigate('/revision')}
          className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
        >
          Review Scheduled Topics
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Topics List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Curriculum Topics ({subjectTopics.length})</h2>

        {subjectTopics.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No topics currently tracked for this subject.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {subjectTopics.map((m) => (
              <div
                key={m.topic}
                onClick={() => navigate(`/subjects/${subject?.toLowerCase()}/topics/${encodeURIComponent(m.topic.toLowerCase())}`)}
                className="py-4 hover:bg-slate-50/80 px-4 rounded-2xl cursor-pointer transition flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-base font-bold text-slate-900">{m.topic}</div>
                  <p className="text-xs text-slate-500">{m.explanation}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 uppercase">Mastery</span>
                    <div className="text-lg font-black text-slate-900">{m.masteryPercentage}%</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectDetailPage;
