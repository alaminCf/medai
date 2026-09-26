import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionsService } from '../services/sessionsService';
import type { PracticeSession, ConversationMessage } from '../types';
import { DifficultyBadge, formatDuration } from '../utils/formatters';
import { getApiError } from '../services/api';
import {
  Send, Square, Clock, MessageSquare, AlertCircle,
  Stethoscope, User, X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function useTimer(startedAt: string | undefined, isActive: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt || !isActive) return;
    const update = () => {
      const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      setElapsed(secs);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt, isActive]);
  return elapsed;
}

export default function PracticeSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isActive = session?.status === 'active';
  const elapsed = useTimer(session?.startedAt, isActive);
  const questionCount = messages.filter(m => m.sender === 'student').length;
  const turnCount = messages.filter(m => m.sender !== 'system').length;

  useEffect(() => {
    if (!sessionId) return;
    sessionsService.getSession(sessionId)
      .then(s => {
        setSession(s);
        setMessages(s.messages || []);
      })
      .catch(() => setError('Session not found.'))
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending || !isActive || !sessionId) return;

    setInput('');
    setIsSending(true);
    setError('');

    // Optimistically add student message
    const tempStudent: ConversationMessage = {
      id: `temp-${Date.now()}`,
      sender: 'student',
      message: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempStudent]);

    try {
      const { studentMessage, patientMessage } = await sessionsService.sendMessage(sessionId, text);
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempStudent.id),
        studentMessage,
        patientMessage,
      ]);
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempStudent.id));
      setError(getApiError(err));
      setInput(text); // Restore input
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [input, isSending, isActive, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEnd = async () => {
    if (!sessionId || isEnding) return;
    setIsEnding(true);
    try {
      await sessionsService.endSession(sessionId);
      navigate(`/history/${sessionId}`);
    } catch (err) {
      setError(getApiError(err));
      setIsEnding(false);
    }
    setShowEndConfirm(false);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!session) return (
    <div className="p-6"><p className="text-gray-400">Session not found.</p></div>
  );

  const pc = session.patientCase;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-navy-50 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-navy-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Clinical Consultation</p>
            <p className="text-xs text-gray-400">{pc.patientName} — {pc.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm font-mono font-medium text-gray-700">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            {formatDuration(elapsed)}
          </div>
          {isActive && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              End Consultation
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-100 p-4 flex-shrink-0 overflow-y-auto">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-navy-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-navy-800">{pc.patientName.charAt(0)}</span>
            </div>
            <p className="font-semibold text-gray-900 text-sm">{pc.patientName}</p>
            <p className="text-xs text-gray-400">{pc.patientAge} yrs · {pc.patientGender}</p>
          </div>

          <div className="space-y-3">
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
              <p className="text-xs font-medium text-amber-700 mb-1">Chief Complaint</p>
              <p className="text-xs text-gray-700 italic leading-relaxed">"{pc.chiefComplaint}"</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-400 mb-2">Case Details</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Difficulty</span>
                  <DifficultyBadge difficulty={pc.difficulty} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Category</span>
                  <span className="text-xs text-gray-700 font-medium">{pc.category}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                <span className="font-semibold">Reminder:</span> This is an educational simulation. Focus on systematic history taking.
              </p>
            </div>
          </div>
        </aside>

        {/* Center — Conversation */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
            {/* Opening system message */}
            <div className="flex justify-center">
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                Consultation started · {pc.patientName} is ready to speak with you
              </span>
            </div>

            {messages.filter(m => m.sender !== 'system').map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isSending && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-navy-800">{pc.patientName.charAt(0)}</span>
                </div>
                <div className="bg-white rounded-xl rounded-tl-sm px-4 py-3 shadow-card border border-gray-100">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="mx-4 mb-2 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 flex-1">{error}</p>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 bg-white px-4 py-3 flex-shrink-0">
            {!isActive ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-400">This consultation has ended.</p>
                <button onClick={() => navigate(`/history/${sessionId}`)} className="btn-primary mt-2 text-sm">
                  View Transcript
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask the patient a question... (Enter to send)"
                  rows={1}
                  className="flex-1 input-field resize-none min-h-[40px] max-h-32 py-2.5"
                  style={{ height: 'auto' }}
                  onInput={e => {
                    const t = e.currentTarget;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                  }}
                  disabled={isSending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isSending}
                  className="w-10 h-10 bg-navy-900 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <aside className="hidden xl:flex flex-col w-56 bg-white border-l border-gray-100 p-4 flex-shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Session Progress</p>
          <div className="space-y-3">
            <StatCard label="Duration" value={formatDuration(elapsed)} icon={<Clock className="w-3.5 h-3.5 text-blue-600" />} />
            <StatCard label="Questions Asked" value={String(questionCount)} icon={<MessageSquare className="w-3.5 h-3.5 text-purple-600" />} />
            <StatCard label="Conversation Turns" value={String(turnCount)} icon={<User className="w-3.5 h-3.5 text-green-600" />} />
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 leading-relaxed">
              Clinical scoring will be available in a future version.
            </p>
          </div>
        </aside>
      </div>

      {/* End confirmation modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">End Consultation?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will end the session. You'll be able to review the full transcript in Session History.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="btn-secondary flex-1">
                Continue
              </button>
              <button onClick={handleEnd} disabled={isEnding} className="btn-primary flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-600">
                {isEnding ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Ending...
                  </span>
                ) : 'End Consultation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isPatient = message.sender === 'patient';
  return (
    <div className={`flex items-start gap-2.5 ${isPatient ? '' : 'flex-row-reverse'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isPatient ? 'bg-navy-100' : 'bg-green-100'}`}>
        <span className={`text-xs font-bold ${isPatient ? 'text-navy-800' : 'text-green-800'}`}>
          {isPatient ? 'P' : 'S'}
        </span>
      </div>
      <div className={`max-w-[70%] ${isPatient ? '' : ''}`}>
        <div className={`rounded-xl px-4 py-2.5 ${isPatient ? 'bg-white shadow-card border border-gray-100 rounded-tl-sm' : 'bg-navy-900 rounded-tr-sm'}`}>
          <p className={`text-sm leading-relaxed ${isPatient ? 'text-gray-800' : 'text-white'}`}>
            {message.message}
          </p>
        </div>
        <p className={`text-xs text-gray-400 mt-1 ${isPatient ? 'ml-1' : 'mr-1 text-right'}`}>
          {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
