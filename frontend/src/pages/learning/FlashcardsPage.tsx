import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Sparkles,
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  Filter,
  AlertCircle,
  Lightbulb,
  X,
} from 'lucide-react';
import FlashcardGuide from '../../components/learning/FlashcardGuide';
import learningService from '../../services/learningService';
import type { FlashcardDeck, MedicalSubject } from '../../types';

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [subjects, setSubjects] = useState<MedicalSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Active study session state
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [showStudyGuideModal, setShowStudyGuideModal] = useState(false);

  // AI Generator Modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genSubject, setGenSubject] = useState('Physiology');
  const [genTopic, setGenTopic] = useState('Cardiovascular System');
  const [genCount, setGenCount] = useState(10);
  const [genDifficulty, setGenDifficulty] = useState('Mixed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    loadDecks();
  }, [selectedSubject]);

  const loadDecks = async () => {
    try {
      setIsLoading(true);
      const [subjRes, decksRes] = await Promise.all([
        learningService.getSubjects(),
        learningService.getFlashcardDecks(selectedSubject === 'ALL' ? undefined : selectedSubject),
      ]);
      setSubjects(subjRes);
      setDecks(decksRes);
    } catch (err) {
      console.error('Failed to load flashcard decks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartStudy = async (deck: FlashcardDeck) => {
    try {
      const fullDeck = await learningService.getFlashcardDeck(deck.id);
      setActiveDeck(fullDeck);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setReviewCount(0);
    } catch (err) {
      console.error('Failed to start deck study:', err);
    }
  };

  const handleRating = async (rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    if (!activeDeck || !activeDeck.cards?.[currentCardIndex]) return;
    const card = activeDeck.cards[currentCardIndex];
    try {
      await learningService.recordCardReview(activeDeck.id, card.id, rating);
      setReviewCount((prev) => prev + 1);

      if (currentCardIndex + 1 < activeDeck.cards.length) {
        setIsFlipped(false);
        setCurrentCardIndex((prev) => prev + 1);
      } else {
        // Deck completed
        setIsFlipped(false);
        setCurrentCardIndex(activeDeck.cards.length); // Signals completed
      }
    } catch (err) {
      console.error('Rating failed:', err);
    }
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGenerating(true);
      setGenError('');
      const res = await learningService.generateFlashcards({
        subject: genSubject,
        topic: genTopic,
        count: genCount,
        difficulty: genDifficulty,
        saveToDeck: true,
        deckTitle: `${genTopic || genSubject} High-Yield Flashcards`,
      });

      if (res.deck) {
        setDecks([res.deck, ...decks]);
        setShowGenerateModal(false);
        handleStartStudy(res.deck);
      }
    } catch (err: any) {
      setGenError(err.response?.data?.error || 'Flashcard generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/learning" className="text-xs text-gray-500 hover:text-teal-700">
              Learning Hub
            </Link>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-xs font-semibold text-emerald-800">Flashcards</span>
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            Medical Flashcards & Active Recall
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Test retention with active recall cards, high-yield clinical facts, and difficulty ratings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Sparkles className="w-4 h-4" />
            AI Generate Flashcards
          </button>
        </div>
      </div>

      {/* Flashcard Educational Guide */}
      {!activeDeck && <FlashcardGuide defaultOpen={true} />}

      {/* Active Study Session View */}
      {activeDeck ? (
        <div className="max-w-2xl mx-auto py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <button
              onClick={() => setActiveDeck(null)}
              className="text-xs font-semibold text-gray-600 hover:text-navy-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Exit Study Session
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStudyGuideModal(true)}
                className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-full flex items-center gap-1.5 transition border border-teal-200"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Flashcard Guide
              </button>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full">
                {activeDeck.title}
              </span>
            </div>
          </div>

          {currentCardIndex < (activeDeck.cards?.length || 0) ? (
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Card {currentCardIndex + 1} of {activeDeck.cards.length}</span>
                <span>{Math.round(((currentCardIndex + 1) / activeDeck.cards.length) * 100)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${((currentCardIndex + 1) / activeDeck.cards.length) * 100}%` }}
                />
              </div>

              {/* Flashcard Component */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`min-h-[320px] p-8 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between cursor-pointer select-none shadow-md ${
                  isFlipped
                    ? 'bg-slate-900 text-white border-slate-700 shadow-slate-900/10'
                    : 'bg-white text-gray-900 border-emerald-200 shadow-emerald-500/5'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={isFlipped ? 'text-emerald-400' : 'text-emerald-700'}>
                    {isFlipped ? 'REVERSE (ANSWER)' : 'FRONT (QUESTION)'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    isFlipped ? 'bg-white/10 text-slate-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {activeDeck.cards[currentCardIndex].difficulty}
                  </span>
                </div>

                <div className="py-8 text-center">
                  <p className="text-base sm:text-xl font-bold leading-relaxed">
                    {isFlipped
                      ? activeDeck.cards[currentCardIndex].answer
                      : activeDeck.cards[currentCardIndex].question}
                  </p>

                  {isFlipped && activeDeck.cards[currentCardIndex].explanation && (
                    <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300 text-left">
                      <strong className="text-emerald-400">Clinical Explanation: </strong>
                      {activeDeck.cards[currentCardIndex].explanation}
                    </div>
                  )}

                  {isFlipped && activeDeck.cards[currentCardIndex].sourceReference && (
                    <p className="text-[10px] text-teal-400 mt-2 text-left">
                      📖 {activeDeck.cards[currentCardIndex].sourceReference}
                    </p>
                  )}
                </div>

                <div className="text-center text-[11px] opacity-60 flex items-center justify-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  <span>Click card to flip</span>
                </div>
              </div>

              {/* Action Buttons: Show Answer or Rate */}
              {!isFlipped ? (
                <button
                  onClick={() => setIsFlipped(true)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-sm transition"
                >
                  Show Answer
                </button>
              ) : (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <button
                    onClick={() => handleRating('AGAIN')}
                    className="py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition"
                  >
                    Again
                  </button>
                  <button
                    onClick={() => handleRating('HARD')}
                    className="py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl border border-amber-200 transition"
                  >
                    Hard
                  </button>
                  <button
                    onClick={() => handleRating('GOOD')}
                    className="py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition"
                  >
                    Good
                  </button>
                  <button
                    onClick={() => handleRating('EASY')}
                    className="py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition"
                  >
                    Easy
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-gray-900">Deck Session Completed!</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                You reviewed {reviewCount} cards in this session. Review history has been updated.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleStartStudy(activeDeck)}
                  className="btn-primary text-xs"
                >
                  Restart Deck
                </button>
                <button
                  onClick={() => setActiveDeck(null)}
                  className="btn-secondary text-xs"
                >
                  Back to All Decks
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Decks Grid View */
        <div>
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none"
              >
                <option value="ALL">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-xs text-gray-400 animate-pulse">
              Loading flashcard decks...
            </div>
          ) : decks.length === 0 ? (
            <div className="card p-12 text-center max-w-md mx-auto">
              <Layers className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 text-base">No flashcards yet</h3>
              <p className="text-xs text-gray-500 mt-1">
                Generate high-yield active recall flashcards from your study materials or medical subjects.
              </p>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="mt-4 btn-primary text-xs inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Flashcards
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className="card p-6 flex flex-col justify-between hover:shadow-md transition border border-gray-200 hover:border-emerald-400"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                        {deck.subject}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {deck._count?.cards ?? deck.cards?.length ?? 0} cards
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-sm mb-1">{deck.title}</h3>
                    {deck.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{deck.description}</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => handleStartStudy(deck)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Study Deck
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Generator Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-navy-900 text-base">Generate Flashcards</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="space-y-4">
              {genError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>{genError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Subject *
                </label>
                <select
                  value={genSubject}
                  onChange={(e) => setGenSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Topic / Subtopic *
                </label>
                <input
                  type="text"
                  required
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="e.g. Cranial Nerves, Pharmacokinetics, Anti-hypertensives"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Card Count
                  </label>
                  <select
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  >
                    <option value={5}>5 cards</option>
                    <option value={10}>10 cards</option>
                    <option value={20}>20 cards</option>
                    <option value={30}>30 cards</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={genDifficulty}
                    onChange={(e) => setGenDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none"
                  >
                    <option value="Mixed">Mixed</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Synthesizing Cards...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Deck</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {/* Study Guide Modal during Study Session */}
      {showStudyGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="max-w-4xl w-full my-8 bg-slate-950 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-4 bg-slate-900 flex items-center justify-between border-b border-white/10">
              <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" />
                Medical Flashcard Learning Center
              </span>
              <button
                onClick={() => setShowStudyGuideModal(false)}
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
}