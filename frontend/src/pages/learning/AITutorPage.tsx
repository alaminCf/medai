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
  Globe
} from 'lucide-react';
import learningService from '../../services/learningService';
import type {
  TutorConversation,
  TutorMessage,
  StudyMaterial,
  TutorMode,
} from '../../types';

interface SuggestionItem {
  title: string;
  prompt: string;
  category: string;
  mode: string;
}

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

  // New Chat configuration
  const [selectedMode, setSelectedMode] = useState<TutorMode>('EXPLAIN');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(initialMaterialId || 'NONE');
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Audio / Speech State
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [savedNoteMsgId, setSavedNoteMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
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

  const handleStartNewConversation = async () => {
    try {
      const title = `Tutor: ${selectedMode} (${new Date().toLocaleDateString()})`;
      const created = await learningService.createTutorConversation({
        mode: selectedMode,
        title,
        materialId: selectedMaterialId === 'NONE' ? undefined : selectedMaterialId,
        initialMessage:
          selectedMode === 'QUIZ_ME'
            ? 'Please quiz me on a high-yield medical topic with one question at a time.'
            : selectedMode === 'VIVA_ME'
            ? 'Act as an external viva voce examiner and challenge me with an initial oral clinical question.'
            : 'Hello! I am ready to study. How can you assist me today?',
      });

      setConversations([created.conversation, ...conversations]);
      setActiveConversation(created.conversation);
      if (created.initialAssistantMessage) {
        setMessages([created.initialAssistantMessage]);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to create new tutor conversation:', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || !activeConversation) return;

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
    } catch (err) {
      console.error('Send message failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          conversationId: activeConversation.id,
          role: 'ASSISTANT',
          content:
            "I encountered a temporary connection issue. Please verify your message or click any of the high-yield study prompts below.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Text-To-Speech
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
      .slice(0, 1500);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
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

  // Render markdown text cleanly
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Heading 3 / 4
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-extrabold text-navy-900 text-sm mt-3 mb-1.5 flex items-center gap-1.5">
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
          <div key={idx} className="my-2 p-2.5 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-950 font-medium text-xs">
            {line}
          </div>
        );
      }
      // Examiner Tip
      if (line.includes('Examiner Tip:') || line.includes('Exam Tip:')) {
        return (
          <div key={idx} className="my-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 font-medium text-xs">
            {line}
          </div>
        );
      }
      // Bullet point
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs leading-relaxed my-0.5">
            {line.replace(/^[•-]\s*/, '')}
          </li>
        );
      }
      // Standard line
      return line.trim() ? (
        <p key={idx} className="text-xs sm:text-sm leading-relaxed my-1">
          {line}
        </p>
      ) : (
        <div key={idx} className="h-1.5" />
      );
    });
  };

  const modes: { id: TutorMode; label: string; desc: string }[] = [
    { id: 'EXPLAIN', label: 'Explain Concept', desc: 'Clear pathophysiological mechanisms & steps' },
    { id: 'TEACH', label: 'Whiteboard Teach', desc: 'Step-by-step from first principles' },
    { id: 'QUIZ_ME', label: 'Quiz Me', desc: 'Socratic active recall challenge' },
    { id: 'VIVA_ME', label: 'Viva Voce Exam', desc: 'External university oral examiner practice' },
    { id: 'REVISE', label: 'Exam Refresher', desc: 'High-yield takeaways & mnemonics' },
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-gray-200 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link to="/learning" className="text-xs text-gray-500 hover:text-teal-700">
              Learning Hub
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs text-teal-800 font-bold">AI Medical Tutor</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 font-extrabold px-1.5 py-0.2 rounded-full">
              SMART ADAPTIVE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 flex items-center gap-2">
            <Brain className="w-6 h-6 text-teal-600" />
            AI Medical Professor & Viva Tutor
          </h1>
        </div>

        {/* Mode Selector Pill Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMode(m.id);
                if (activeConversation) {
                  setActiveConversation({ ...activeConversation, mode: m.id });
                }
              }}
              title={m.desc}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                (activeConversation?.mode || selectedMode) === m.id
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout: Convo List on Left / Chat on Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 overflow-hidden">
        {/* Left Column (3 cols): Convo History & Context Grounding */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-4 flex flex-col h-full shadow-2xs overflow-hidden">
          <button
            onClick={handleStartNewConversation}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 mb-3"
          >
            <Plus className="w-4 h-4" /> New Study Chat
          </button>

          {/* Context Grounding Material Dropdown */}
          <div className="mb-3 pb-3 border-b border-gray-100">
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

          {/* Weak Concepts to Strengthen (Phase 7 Adaptive Integration) */}
          {weakConcepts.length > 0 && (
            <div className="mb-3 pb-3 border-b border-gray-100">
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

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Recent Chats
            </h3>
            <span className="text-[10px] text-gray-400 font-semibold">{conversations.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectConversation(c.id)}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                  activeConversation?.id === c.id
                    ? 'border-teal-500 bg-teal-50/50 shadow-2xs'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-100/60 px-1.5 py-0.2 rounded">
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
            <span>English & বাংলা / Banglish queries fully supported.</span>
          </div>
        </div>

        {/* Right Column (9 cols): Chat Area */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-gray-200 flex flex-col h-full shadow-2xs overflow-hidden">
          {/* Active Chat Top Bar */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-navy-900 px-2 py-0.5 rounded-md bg-white border border-gray-200 shadow-2xs">
                Mode: {activeConversation?.mode || selectedMode}
              </span>
              {activeConversation?.material && (
                <span className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Grounded: {activeConversation.material.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              <span>Evidence-Based Medical Curriculum</span>
            </div>
          </div>

          {/* Messages Flow */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'USER' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3.5 shadow-2xs ${
                    msg.role === 'USER'
                      ? 'bg-navy-900 text-white rounded-br-xs text-xs sm:text-sm'
                      : 'bg-slate-50 border border-gray-100 text-gray-900 rounded-bl-xs text-xs sm:text-sm'
                  }`}
                >
                  {/* Content */}
                  <div className="space-y-0.5">
                    {renderMessageContent(msg.content)}
                  </div>

                  {/* Source Reference Tag */}
                  {msg.sourceReference && (
                    <div className="mt-3 pt-2 border-t border-teal-200/60 text-[11px] text-teal-800 font-bold flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      Source Reference: {msg.sourceReference}
                    </div>
                  )}

                  {/* Assistant Message Action Buttons */}
                  {(msg.role === 'ASSISTANT') && (
                    <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center gap-3 text-gray-500 text-[11px]">
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
                            <span className="text-rose-600">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Read Aloud</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopyText(msg.id, msg.content)}
                        className="hover:text-teal-700 transition flex items-center gap-1 font-medium"
                        title="Copy explanation"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleSaveToNotes(msg.id, msg.content)}
                        className="hover:text-teal-700 transition flex items-center gap-1 font-medium ml-auto"
                        title="Save to My Smart Notes"
                      >
                        {savedNoteMsgId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Saved to Notes</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5 text-teal-600" />
                            <span className="text-teal-700">Save as Note</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-teal-700 italic py-2 px-3 bg-teal-50/50 rounded-xl w-fit border border-teal-100">
                <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span>AI Tutor is formulating evidence-based medical explanation...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/80 flex items-center gap-2 overflow-x-auto text-[11px]">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0">
              Quick Prompts:
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
            {suggestions.length === 0 && (
              <>
                <button
                  onClick={() => handleSendMessage('Explain the cardiac cycle phases in physiological order with S1 and S2 heart sounds.')}
                  className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-gray-200 rounded-lg whitespace-nowrap text-gray-700 font-medium"
                >
                  Cardiac cycle order
                </button>
                <button
                  onClick={() => handleSendMessage('Explain the Frank-Starling law of the heart and its cellular mechanism.')}
                  className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-gray-200 rounded-lg whitespace-nowrap text-gray-700 font-medium"
                >
                  Frank-Starling law
                </button>
                <button
                  onClick={() => handleSendMessage('What is the timeline of myocardial infarction pathology and troponin biomarkers?')}
                  className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-gray-200 rounded-lg whitespace-nowrap text-gray-700 font-medium"
                >
                  MI & Troponin timeline
                </button>
              </>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3.5 sm:p-4 border-t border-gray-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about pathophysiology, drugs, anatomy, or ask in বাংলা / Banglish..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isThinking}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask Tutor</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
