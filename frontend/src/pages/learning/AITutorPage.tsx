import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Brain,
  Send,
  Plus,
} from 'lucide-react';
import learningService from '../../services/learningService';
import type {
  TutorConversation,
  TutorMessage,
  StudyMaterial,
  TutorMode,
} from '../../types';

export default function AITutorPage() {
  const [searchParams] = useSearchParams();
  const initialMaterialId = searchParams.get('materialId') || undefined;

  const [conversations, setConversations] = useState<TutorConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<TutorConversation | null>(null);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  // const [isLoading, setIsLoading] = useState(true);
  const setIsLoading = (_val: boolean) => {};

  // New Chat configuration
  const [selectedMode, setSelectedMode] = useState<TutorMode>('EXPLAIN');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(initialMaterialId || 'NONE');
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [convos, mats] = await Promise.all([
        learningService.getTutorConversations(),
        learningService.getMaterials(),
      ]);
      setConversations(convos);
      setMaterials(mats);

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
            ? 'Act as a viva voce examiner and ask me an initial oral question.'
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
            "I couldn't find enough information about this in the uploaded material or encountered an AI service timeout. Please try rephrasing.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link to="/learning" className="text-xs text-gray-500 hover:text-teal-700">
              Learning Hub
            </Link>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-xs font-semibold text-navy-800">AI Medical Tutor</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-navy-900 tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-teal-600" />
            AI Medical Academic Tutor
          </h1>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'EXPLAIN', label: 'Explain' },
            { id: 'TEACH', label: 'Teach' },
            { id: 'QUIZ_ME', label: 'Quiz Me' },
            { id: 'VIVA_ME', label: 'Viva Me' },
            { id: 'REVISE', label: 'Revise' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedMode(m.id as TutorMode);
                handleStartNewConversation();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                selectedMode === m.id
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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 overflow-hidden">
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
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Ground in Uploaded Document:
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

          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Recent Tutor Chats
          </h3>

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
        </div>

        {/* Right Column (9 cols): Chat Area */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-gray-200 flex flex-col h-full shadow-2xs overflow-hidden">
          {/* Active Chat Top Bar */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-navy-900">
                Mode: {activeConversation?.mode || selectedMode}
              </span>
              {activeConversation?.material && (
                <span className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-medium">
                  Source: {activeConversation.material.title}
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-400 font-medium">
              Academic Medical Education Engine
            </span>
          </div>

          {/* Messages Flow */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'USER' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    msg.role === 'USER'
                      ? 'bg-navy-900 text-white rounded-br-xs'
                      : 'bg-slate-100 text-gray-900 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                  {msg.sourceReference && (
                    <div className="mt-2 pt-2 border-t border-teal-200/50 text-xs text-teal-800 font-semibold">
                      📖 Source Citation: {msg.sourceReference}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-teal-700 italic py-2">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span>AI Tutor is formulating explanation...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/60 flex items-center gap-2 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleSendMessage('Explain the cardiac cycle phases in physiological order.')}
              className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-gray-200 rounded-lg whitespace-nowrap text-gray-600"
            >
              Cardiac cycle order
            </button>
            <button
              onClick={() => handleSendMessage('Why does heart rate increase during exercise? Give autonomic details.')}
              className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-gray-200 rounded-lg whitespace-nowrap text-gray-600"
            >
              Autonomic regulation
            </button>
            <button
              onClick={() => handleSendMessage('Give me a viva-style explanation of Frank-Starling law.')}
              className="px-2.5 py-1 bg-white hover:bg-purple-50 border border-gray-200 rounded-lg whitespace-nowrap text-gray-600"
            >
              Frank-Starling law
            </button>
          </div>

          {/* Input Box */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask your medical tutor a concept question..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isThinking}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
