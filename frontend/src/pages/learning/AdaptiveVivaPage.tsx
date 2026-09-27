import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mic,
  MicOff,
  CheckCircle,
  ArrowRight,
  Brain,
  Sparkles,
  Send
} from 'lucide-react';
import learningService from '../../services/learningService';

export const AdaptiveVivaPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [subject, setSubject] = useState(searchParams.get('subject') || 'Physiology');
  const [topic, setTopic] = useState(searchParams.get('topic') || 'Cardiovascular System');

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<any | null>(null);
  const [turnCount, setTurnCount] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);

  // Audio simulation state
  const [isRecording, setIsRecording] = useState(false);

  const handleStartViva = async () => {
    try {
      setIsSubmitting(true);
      const res = await learningService.startAdaptiveViva({
        subject,
        topic,
        difficulty: 'medium',
      });

      setSessionId(res.sessionId);
      setCurrentQuestion(res.currentQuestion);
      setStudentAnswer('');
      setLastEvaluation(null);
      setTurnCount(1);
      setIsCompleted(false);
    } catch (err) {
      console.error('Failed to start adaptive viva:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!sessionId || !currentQuestion || !studentAnswer.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await learningService.submitAdaptiveVivaAnswer({
        sessionId,
        questionId: currentQuestion.questionId,
        studentAnswer,
        topic,
        currentDifficulty: currentQuestion.difficulty || 'Moderate',
      });

      setLastEvaluation(res.evaluation);
      setTurnCount(res.turnCount);

      if (res.isSessionComplete) {
        setIsCompleted(true);
      } else {
        setCurrentQuestion(res.nextQuestion);
        setStudentAnswer('');
      }
    } catch (err) {
      console.error('Error submitting viva response:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simulate real-time speech-to-text input
      setTimeout(() => {
        setStudentAnswer(prev => prev ? prev + ' Under physiological conditions, ventricular filling occurs predominantly during early diastole.' : 'Under physiological conditions, ventricular filling occurs predominantly during early diastole.');
        setIsRecording(false);
      }, 2500);
    } else {
      setIsRecording(false);
    }
  };

  // Completion Screen
  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-8">
        <div className="w-20 h-20 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600 shadow-xl shadow-teal-600/10">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Viva Examination Complete</h1>
          <p className="text-slate-500 text-sm">
            Your oral responses have been evaluated against standard clinical curriculum competencies.
          </p>
        </div>

        {lastEvaluation && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Performance</div>
                <div className="text-3xl font-black text-slate-900 mt-1">{lastEvaluation.score || 85} / 100</div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                Clarity: {lastEvaluation.clinicalCommunicationClarity}
              </span>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Key Concepts Addressed:</div>
              <div className="flex flex-wrap gap-2">
                {lastEvaluation.conceptsMentioned?.map((c: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-100 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 uppercase">Examiner Summary:</span>
              <p className="leading-relaxed">{lastEvaluation.feedback}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/revision')}
            className="px-6 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-sm text-slate-700 transition"
          >
            Back to Revision Hub
          </button>
          <button
            onClick={() => {
              setSessionId(null);
              setIsCompleted(false);
            }}
            className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 font-bold text-sm text-white shadow-md transition"
          >
            Start Another Viva
          </button>
        </div>
      </div>
    );
  }

  // Active Viva Simulation Session
  if (sessionId && currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase">
              Adaptive Oral Viva
            </span>
            <span className="text-xs font-bold text-slate-400">
              {subject} • {topic}
            </span>
          </div>

          <span className="text-sm font-black text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl">
            Question {currentQuestion.questionNumber || turnCount} of 5
          </span>
        </div>

        {/* Examiner Question Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider uppercase text-teal-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Examiner ({currentQuestion.difficulty || 'Moderate'} Difficulty)
            </span>
            {currentQuestion.focusConcept && (
              <span className="text-xs font-bold text-slate-400">
                Focus: {currentQuestion.focusConcept}
              </span>
            )}
          </div>

          <div className="text-xl sm:text-2xl font-bold leading-relaxed">
            "{currentQuestion.question}"
          </div>
        </div>

        {/* Previous Turn Feedback (if any) */}
        {lastEvaluation && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-400">Previous Response Feedback</span>
              <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                Clarity: {lastEvaluation.clinicalCommunicationClarity}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{lastEvaluation.feedback}</p>
          </div>
        )}

        {/* Student Response Area */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Articulation</label>
            <button
              onClick={toggleRecording}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-rose-600" />}
              {isRecording ? 'Listening...' : 'Voice Input'}
            </button>
          </div>

          <textarea
            rows={5}
            placeholder="Articulate your physiological explanation clearly as you would in a formal viva..."
            value={studentAnswer}
            onChange={(e) => setStudentAnswer(e.target.value)}
            className="w-full p-4 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed"
          />

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400">
              Expected concepts are evaluated after submission.
            </span>
            <button
              disabled={!studentAnswer.trim() || isSubmitting}
              onClick={handleSubmitResponse}
              className="px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
            >
              {isSubmitting ? 'Evaluating Concept Coverage...' : 'Submit Oral Answer'}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Launcher Setup Screen
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">
          <Mic className="w-3.5 h-3.5" />
          Oral Examination Practice
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Adaptive Oral Viva Simulation</h1>
        <p className="text-slate-500 text-sm mt-1">
          Simulate a rigorous academic oral viva where questions dynamically probe missed concepts and test your depth of understanding.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-slate-900">Configure Viva Station</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Physiology">Physiology</option>
              <option value="Anatomy">Anatomy</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Pathology">Pathology</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3 text-xs text-slate-600">
          <Brain className="w-5 h-5 text-teal-600 flex-shrink-0" />
          <span>The AI examiner assesses definition accuracy, physiological drivers, and clinical communication clarity turn-by-turn.</span>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleStartViva}
            disabled={isSubmitting}
            className="px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
          >
            {isSubmitting ? 'Starting...' : 'Enter Oral Examination'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdaptiveVivaPage;
