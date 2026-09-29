import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  RotateCw,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  Lightbulb,
  X,
  
  
  
  
  
  
} from 'lucide-react';
import learningService from '../../services/learningService';
import { PrioritizedFlashcard, ReviewRating } from '../../types';
import FlashcardGuide from '../../components/learning/FlashcardGuide';

export const AdaptiveFlashcardsPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<PrioritizedFlashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Session summary stats
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [ratingCounts, setRatingCounts] = useState<{ AGAIN: number; HARD: number; GOOD: number; EASY: number }>({
    AGAIN: 0,
    HARD: 0,
    GOOD: 0,
    EASY: 0,
  });

  useEffect(() => {
    loadDueCards();
  }, []);

  const loadDueCards = async () => {
    try {
      setLoading(true);
      const res = await learningService.getPrioritizedDueCards(30);
      setCards(res.dueCards || []);
    } catch (err) {
      console.error('Failed to load prioritized due cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRateCard = async (rating: ReviewRating) => {
    if (cards.length === 0 || submittingRating) return;
    const currentCard = cards[currentIndex];

    try {
      setSubmittingRating(true);
      await learningService.rateFlashcard(currentCard.id, rating);

      setRatingCounts(prev => ({ ...prev, [rating]: prev[rating] + 1 }));

      if (currentIndex + 1 < cards.length) {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        setSessionCompleted(true);
      }
    } catch (err) {
      console.error('Error rating flashcard:', err);
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Completion Screen
  if (sessionCompleted) {
    const totalReviewed = ratingCounts.AGAIN + ratingCounts.HARD + ratingCounts.GOOD + ratingCounts.EASY;
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-8">
        <div className="w-20 h-20 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-600 shadow-xl shadow-teal-600/10">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Revision Complete</h1>
          <p className="text-slate-500 text-sm">
            Excellent recall session. Your memory consolidation intervals have been updated.
          </p>
        </div>

        {/* Breakdown Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Performance</div>
          <div className="text-4xl font-black text-slate-900">{totalReviewed} Cards Reviewed</div>

          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-700">
              <div className="text-2xl font-black">{ratingCounts.AGAIN}</div>
              <div className="text-xs font-bold uppercase mt-0.5">Again</div>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-700">
              <div className="text-2xl font-black">{ratingCounts.HARD}</div>
              <div className="text-xs font-bold uppercase mt-0.5">Hard</div>
            </div>
            <div className="p-3 rounded-2xl bg-teal-50 text-teal-700">
              <div className="text-2xl font-black">{ratingCounts.GOOD}</div>
              <div className="text-xs font-bold uppercase mt-0.5">Good</div>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700">
              <div className="text-2xl font-black">{ratingCounts.EASY}</div>
              <div className="text-xs font-bold uppercase mt-0.5">Easy</div>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium pt-2">
            Next scheduled review: <span className="font-bold text-slate-800">Tomorrow morning</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigate('/revision')}
            className="px-6 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-sm text-slate-700 transition"
          >
            Back to Revision Hub
          </button>
          <button
            onClick={() => navigate('/today')}
            className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 font-bold text-sm text-white shadow-md transition"
          >
            Go to Today's Plan
          </button>
        </div>
      </div>
    );
  }

  // Empty state if no cards due
  if (cards.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Brain className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">All Caught Up!</h2>
          <p className="text-slate-500 text-sm">
            No flashcards are currently scheduled for review right now.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate('/flashcards')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-sm text-slate-700"
          >
            Browse All Decks
          </button>
          <button
            onClick={() => navigate('/today')}
            className="px-5 py-2.5 rounded-xl bg-teal-600 font-bold text-sm text-white"
          >
            Return to Today
          </button>
        </div>

        <div className="pt-8 text-left">
          <FlashcardGuide defaultOpen={true} />
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Progress */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/revision')}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Exit Session
          </button>
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-full text-xs font-bold border border-teal-200 transition"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            ফ্ল্যাশকার্ড গাইড
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progress</span>
          <span className="text-sm font-black text-slate-800 px-3 py-1 bg-slate-100 rounded-full">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-indigo-600 transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Priority Badge Indicator */}
      <div className="flex items-center gap-2">
        {currentCard.isOverdue && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-xs font-bold">
            <AlertTriangle className="w-3 h-3" /> Overdue Recall
          </span>
        )}
        {currentCard.reviewState?.lastRating === 'AGAIN' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-bold">
            Needs Reinforcement
          </span>
        )}
        {currentCard.isNew && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-800 text-xs font-bold">
            New Concept
          </span>
        )}
        <span className="text-xs font-semibold text-slate-400 ml-auto">
          {currentCard.subject} {currentCard.topic ? `• ${currentCard.topic}` : ''}
        </span>
      </div>

      {/* Flashcard Component */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[380px] flex flex-col justify-between transition-all">
        {/* Card Header */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
            {showAnswer ? 'Answer & Clinical Context' : 'Question / Recall Prompt'}
          </div>

          <div className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed">
            {currentCard.question}
          </div>

          {/* Answer Section */}
          {showAnswer && (
            <div className="pt-6 mt-6 border-t border-slate-100 space-y-4 animate-in fade-in duration-300">
              <div className="text-lg text-slate-800 font-medium leading-relaxed bg-teal-50/50 p-5 rounded-2xl border border-teal-100/60">
                {currentCard.answer}
              </div>

              {currentCard.explanation && (
                <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl space-y-1">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Medical Explanation:</div>
                  <p>{currentCard.explanation}</p>
                </div>
              )}

              {currentCard.sourceReference && (
                <div className="text-xs text-slate-400 italic">
                  Source: {currentCard.sourceReference}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Footer / Action Controls */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-md transition flex items-center justify-center gap-2"
            >
              <RotateCw className="w-5 h-5" />
              Show Answer
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                How easily did you recall this concept?
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* AGAIN */}
                <button
                  disabled={submittingRating}
                  onClick={() => handleRateCard('AGAIN')}
                  className="py-3 px-4 rounded-2xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-700 font-bold text-sm shadow-sm transition flex flex-col items-center gap-1 group"
                >
                  <span className="text-base group-hover:scale-110 transition">Again</span>
                  <span className="text-[10px] text-slate-400 font-normal">Reset (&lt;1d)</span>
                </button>

                {/* HARD */}
                <button
                  disabled={submittingRating}
                  onClick={() => handleRateCard('HARD')}
                  className="py-3 px-4 rounded-2xl bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-amber-700 font-bold text-sm shadow-sm transition flex flex-col items-center gap-1 group"
                >
                  <span className="text-base group-hover:scale-110 transition">Hard</span>
                  <span className="text-[10px] text-slate-400 font-normal">Slight incr.</span>
                </button>

                {/* GOOD */}
                <button
                  disabled={submittingRating}
                  onClick={() => handleRateCard('GOOD')}
                  className="py-3 px-4 rounded-2xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-teal-700 font-bold text-sm shadow-sm transition flex flex-col items-center gap-1 group"
                >
                  <span className="text-base group-hover:scale-110 transition">Good</span>
                  <span className="text-[10px] text-slate-400 font-normal">Standard SM-2</span>
                </button>

                {/* EASY */}
                <button
                  disabled={submittingRating}
                  onClick={() => handleRateCard('EASY')}
                  className="py-3 px-4 rounded-2xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-700 font-bold text-sm shadow-sm transition flex flex-col items-center gap-1 group"
                >
                  <span className="text-base group-hover:scale-110 transition">Easy</span>
                  <span className="text-[10px] text-slate-400 font-normal">Long interval</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    
      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-4xl w-full my-8 bg-slate-950 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-4 bg-slate-900 flex items-center justify-between border-b border-white/10">
              <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" />
                মেডিকেল ফ্ল্যাশকার্ড সহায়তা কেন্দ্র
              </span>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
              <FlashcardGuide defaultOpen={true} />
            </div>
          </div>
        </div>
      )}
</div>
  );
};

export default AdaptiveFlashcardsPage;