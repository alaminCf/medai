import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Search,
  Brain,
  Sparkles,
  ArrowLeft,
  Send,
  AlertCircle,
  Check,
  PanelRightClose,
  CheckCircle2,
  Layers,
  MessageSquare,
} from 'lucide-react';
import learningService from '../../services/learningService';
import type { StudyMaterial, TutorConversation, TutorMessage } from '../../types';

export default function DocumentReaderPage() {
  const { id } = useParams<{ id: string }>();
  // const navigate = useNavigate();

  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedText, setSelectedText] = useState('');

  // Right Panel AI Tutor state
  const [isTutorOpen, setIsTutorOpen] = useState(true);
  const [tutorConversation, setTutorConversation] = useState<TutorConversation | null>(null);
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Summary Generator Modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryType, setSummaryType] = useState<'HIGH_YIELD' | 'QUICK' | 'DETAILED' | 'EXAM_REVISION' | 'BEGINNER_FRIENDLY'>('HIGH_YIELD');
  const [generatedSummary, setGeneratedSummary] = useState<any | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [savedNoteSuccess, setSavedNoteSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const readerContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadMaterial(id);
      loadTutorConversation(id);
    }
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorMessages, isThinking]);

  const loadMaterial = async (materialId: string) => {
    try {
      setIsLoading(true);
      const res = await learningService.getMaterial(materialId);
      setMaterial(res);
      // Track reading session
      learningService.trackStudySession({
        materialId: res.id,
        subject: res.subject,
        topic: res.topic,
        activityType: 'READING',
        durationSeconds: 60,
      }).catch(() => {});
    } catch (err) {
      console.error('Failed to load study material:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTutorConversation = async (materialId: string) => {
    try {
      const convos = await learningService.getTutorConversations();
      const existing = convos.find((c) => c.materialId === materialId);
      if (existing) {
        const full = await learningService.getTutorConversation(existing.id);
        setTutorConversation(full);
        setTutorMessages(full.messages || []);
      } else {
        // Create initial tutor conversation grounded in this material
        const created = await learningService.createTutorConversation({
          mode: 'EXPLAIN',
          title: `Tutor: Study Session`,
          materialId,
          initialMessage: `I am reviewing this material. Give me a 2-sentence orientation of what this covers.`,
        });
        setTutorConversation(created.conversation);
        if (created.initialAssistantMessage) {
          setTutorMessages([created.initialAssistantMessage]);
        }
      }
    } catch (err) {
      console.error('Failed to initialize tutor conversation:', err);
    }
  };

  const handleSendTutorMessage = async (textToSend?: string) => {
    const message = textToSend || inputQuestion;
    if (!message.trim() || !tutorConversation) return;

    const userMsg: TutorMessage = {
      id: 'temp-' + Date.now(),
      conversationId: tutorConversation.id,
      role: 'USER',
      content: message,
      createdAt: new Date().toISOString(),
    };
    setTutorMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuestion('');
    setIsThinking(true);

    try {
      const res = await learningService.sendTutorMessage(
        tutorConversation.id,
        message,
        material?.title ? `Material: ${material.title}` : undefined
      );
      setTutorMessages((prev) => [...prev, res.assistantMessage]);
    } catch (err) {
      console.error('Tutor message failed:', err);
      setTutorMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          conversationId: tutorConversation.id,
          role: 'ASSISTANT',
          content: 'Sorry, I encountered a communication error with the medical reasoning service. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!material) return;
    try {
      setIsGeneratingSummary(true);
      setSavedNoteSuccess(false);
      const res = await learningService.generateSummary(material.id, {
        summaryType,
        selectedText: selectedText || undefined,
        saveAsNote: true,
      });
      setGeneratedSummary(res.summary);
      setSavedNoteSuccess(true);
    } catch (err) {
      console.error('Summary generation failed:', err);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSelection = () => {
    const sel = window.getSelection()?.toString();
    if (sel && sel.trim().length > 5) {
      setSelectedText(sel.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-gray-500">Opening study workspace...</p>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900">Study Material Not Found</h2>
        <p className="text-xs text-gray-500 mt-1">
          The requested document could not be located or you do not have permission to view it.
        </p>
        <Link to="/learning/materials" className="mt-4 btn-primary inline-flex">
          Back to Materials
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/learning/materials"
            className="p-1.5 text-gray-500 hover:text-navy-900 hover:bg-gray-100 rounded-lg transition"
            title="Back to library"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-900 text-sm sm:text-base truncate">
              {material.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.2 rounded">
                {material.subject}
              </span>
              {material.topic && <span>• {material.topic}</span>}
              <span>• {material.extractedText ? `${material.extractedText.split(/\s+/).length} words` : '0 words'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowSummaryModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Summary</span>
          </button>
          <Link
            to={`/mcq?materialId=${material.id}&subject=${encodeURIComponent(material.subject)}&topic=${encodeURIComponent(material.topic || '')}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">Generate MCQs</span>
          </Link>
          <Link
            to={`/flashcards?materialId=${material.id}&subject=${encodeURIComponent(material.subject)}&topic=${encodeURIComponent(material.topic || '')}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Flashcards</span>
          </Link>
          <Link
            to={`/viva?materialId=${material.id}&subject=${encodeURIComponent(material.subject)}&topic=${encodeURIComponent(material.topic || '')}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold rounded-lg transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Practice Viva</span>
          </Link>

          <button
            onClick={() => setIsTutorOpen(!isTutorOpen)}
            className={`p-2 rounded-lg border transition ${
              isTutorOpen
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
            title={isTutorOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
          >
            <Brain className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split Layout: Left Content Reader / Right AI Tutor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Study Document Reader */}
        <div
          ref={readerContentRef}
          onMouseUp={handleSelection}
          className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-4xl mx-auto w-full"
        >
          {/* Search bar inside document */}
          <div className="mb-6 flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find in document..."
                className="w-full text-xs text-gray-800 focus:outline-none"
              />
            </div>
            {selectedText && (
              <button
                onClick={() => handleSendTutorMessage(`Explain this excerpt from the lecture: "${selectedText}"`)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md transition"
              >
                <Brain className="w-3 h-3" />
                Ask AI about selection
              </button>
            )}
          </div>

          {/* Document Content Paper */}
          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-xs border border-gray-100 min-h-full">
            <div className="border-b pb-6 mb-8">
              <span className="text-xs font-bold text-teal-700 tracking-wider uppercase">
                {material.subject} • {material.topic || 'Lecture Study Material'}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {material.title}
              </h2>
              {material.description && (
                <p className="text-xs text-gray-500 mt-2">{material.description}</p>
              )}
            </div>

            {/* Extracted Text Body */}
            <div className="prose prose-slate max-w-none text-sm leading-relaxed text-gray-800 whitespace-pre-line select-text font-normal font-sans">
              {material.extractedText || (
                <p className="text-gray-400 italic">No text could be extracted from this document.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: AI Learning Assistant Panel */}
        {isTutorOpen && (
          <div className="w-full sm:w-96 md:w-[420px] bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-20 flex-shrink-0 animate-in slide-in-from-right duration-200">
            {/* Tutor Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-teal-50/50 to-white">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-900 text-xs">AI Medical Tutor</h3>
                  <p className="text-[10px] text-teal-700 font-medium">Grounded in this lecture</p>
                </div>
              </div>
              <button
                onClick={() => setIsTutorOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            {/* Suggestion Chips */}
            <div className="px-3 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <button
                onClick={() => handleSendTutorMessage('What are the top 3 high-yield exam takeaways from this material?')}
                className="whitespace-nowrap px-2 py-1 bg-white hover:bg-teal-50 border border-gray-200 hover:border-teal-300 rounded text-gray-600 transition"
              >
                Top exam takeaways
              </button>
              <button
                onClick={() => handleSendTutorMessage('Explain the most difficult mechanism in this lecture in simple terms.')}
                className="whitespace-nowrap px-2 py-1 bg-white hover:bg-teal-50 border border-gray-200 hover:border-teal-300 rounded text-gray-600 transition"
              >
                Explain simply
              </button>
              <button
                onClick={() => handleSendTutorMessage('Quiz me with 1 clinical viva question from this material.')}
                className="whitespace-nowrap px-2 py-1 bg-white hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded text-gray-600 transition"
              >
                Quiz me
              </button>
            </div>

            {/* Messages Chat List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {tutorMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'USER' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'USER'
                        ? 'bg-navy-900 text-white rounded-br-xs'
                        : 'bg-slate-100 text-gray-900 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                    {msg.sourceReference && (
                      <div className="mt-1.5 pt-1.5 border-t border-teal-200/40 text-[10px] text-teal-800 font-medium">
                        📖 {msg.sourceReference}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex items-center gap-2 text-xs text-gray-400 italic py-2">
                  <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <span>Consulting lecture notes...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-gray-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendTutorMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  placeholder="Ask a question about this material..."
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={!inputQuestion.trim() || isThinking}
                  className="p-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* AI Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-navy-900 text-sm sm:text-base">
                  Generate Structured Study Summary
                </h3>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Options */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Select Summary Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'HIGH_YIELD', label: 'High-Yield Points' },
                    { id: 'QUICK', label: 'Quick Summary' },
                    { id: 'DETAILED', label: 'Detailed Study' },
                    { id: 'EXAM_REVISION', label: 'Exam Revision' },
                    { id: 'BEGINNER_FRIENDLY', label: 'Beginner Friendly' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSummaryType(t.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition ${
                        summaryType === t.id
                          ? 'border-teal-600 bg-teal-50 text-teal-900'
                          : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {!generatedSummary ? (
                <div className="py-8 text-center">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-2 transition"
                  >
                    {isGeneratingSummary ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Synthesizing Medical Knowledge...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate & Save Summary Note</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-gray-200 text-xs">
                  {savedNoteSuccess && (
                    <div className="p-2 bg-emerald-50 text-emerald-800 rounded-md font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>Summary successfully created and saved to My Notes!</span>
                    </div>
                  )}

                  <h4 className="font-bold text-gray-900 text-sm">{generatedSummary.title}</h4>
                  <p className="text-gray-700 leading-relaxed">{generatedSummary.overview}</p>

                  {generatedSummary.keyConcepts?.length > 0 && (
                    <div>
                      <span className="font-bold text-teal-900 block mb-1">Key Concepts:</span>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        {generatedSummary.keyConcepts.map((c: string, idx: number) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {generatedSummary.clinicalRelevance && (
                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                      <span className="font-bold text-amber-900 block mb-0.5">Clinical Relevance:</span>
                      <p className="text-amber-950">{generatedSummary.clinicalRelevance}</p>
                    </div>
                  )}

                  {generatedSummary.examPoints?.length > 0 && (
                    <div>
                      <span className="font-bold text-purple-900 block mb-1">High-Yield Exam Points:</span>
                      <ul className="list-disc list-inside space-y-1 text-purple-950">
                        {generatedSummary.examPoints.map((ep: string, idx: number) => (
                          <li key={idx}>{ep}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <Link to="/notes" className="text-xs text-teal-700 font-semibold hover:underline">
                View My Notes →
              </Link>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
