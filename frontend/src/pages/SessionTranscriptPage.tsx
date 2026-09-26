import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sessionsService } from '../services/sessionsService';
import type { PracticeSession } from '../types';
import { DifficultyBadge, formatDuration } from '../utils/formatters';
import { ArrowLeft, Clock, MessageSquare, BookOpen, Mic, Globe, Award } from 'lucide-react';
import { format } from 'date-fns';

export default function SessionTranscriptPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      sessionsService
        .getSession(sessionId)
        .then(setSession)
        .finally(() => setIsLoading(false));
    }
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/history')} className="btn-ghost mb-4">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <p className="text-gray-400">Session not found.</p>
      </div>
    );
  }

  const pc = session.patientCase;
  const msgs = (session.messages || []).filter((m) => m.sender !== 'system');
  const studentMsgs = msgs.filter((m) => m.sender === 'student').length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/history')} className="btn-ghost mb-5 -ml-2">
        <ArrowLeft className="w-4 h-4" />Back to History
      </button>

      {/* Session info */}
      <div className="card p-5 mb-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-navy-800">{pc.patientName.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 text-lg">{pc.patientName}</h1>
            <p className="text-sm text-gray-500">
              {pc.title} · {pc.category}
            </p>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              session.status === 'completed'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {session.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            {session.duration ? formatDuration(session.duration) : 'In progress'}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
            {studentMsgs} questions asked
          </span>
          <span className="flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            {session.language === 'bn' ? 'বাংলা (Bangla)' : 'English'}
          </span>
          {session.voiceEnabled && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-medium">
              <Mic className="w-3 h-3" />
              Voice Session
            </span>
          )}
          <span>{format(new Date(session.startedAt), 'MMMM d, yyyy · h:mm a')}</span>
          <DifficultyBadge difficulty={pc.difficulty} />
        </div>
      </div>

      {/* Phase 4 Clinical Performance Report banner */}
      <div className="card p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-teal-950 mb-0.5">Clinical Performance Report Ready</p>
            <p className="text-xs text-teal-700 leading-relaxed">
              Structured evaluation across History Taking, Communication, Clinical Reasoning, and Patient-Centeredness with evidence quotes.
            </p>
          </div>
        </div>
        <Link
          to={`/session/${sessionId}/evaluation`}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1.5 shadow-sm"
        >
          <Award className="w-4 h-4" />
          View Clinical Evaluation
        </Link>
      </div>

      {/* Transcript */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-600" />
          Consultation Transcript
        </h2>

        {msgs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No conversation recorded.</p>
        ) : (
          <div className="space-y-4">
            {msgs.map((msg, idx) => {
              const isPatient = msg.sender === 'patient';
              const isVoice = msg.messageType === 'voice';
              return (
                <div key={msg.id || idx} className={`flex items-start gap-3 ${isPatient ? '' : 'flex-row-reverse'}`}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isPatient ? 'bg-navy-100' : 'bg-teal-600 text-white'
                    }`}
                  >
                    <span className={`text-xs font-bold ${isPatient ? 'text-navy-800' : 'text-white'}`}>
                      {isPatient ? pc.patientName.charAt(0) : 'S'}
                    </span>
                  </div>
                  <div className="max-w-[75%]">
                    <p
                      className={`text-[11px] font-medium mb-1 flex items-center gap-1.5 ${
                        isPatient ? 'text-gray-500' : 'text-right justify-end text-gray-500'
                      }`}
                    >
                      <span>{isPatient ? pc.patientName : 'You (Student)'}</span>
                      <span>·</span>
                      <span>{format(new Date(msg.timestamp), 'h:mm a')}</span>
                      {isVoice && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-teal-700 bg-teal-50 px-1 py-0.2 rounded font-medium">
                          <Mic className="w-2.5 h-2.5" />
                          Voice
                        </span>
                      )}
                    </p>
                    <div
                      className={`rounded-xl px-4 py-2.5 ${
                        isPatient ? 'bg-gray-50 border border-gray-100 text-gray-800' : 'bg-navy-900 text-white'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        <Link to="/cases" className="btn-secondary flex-1 justify-center">
          Practice Another Case
        </Link>
        <Link to="/history" className="btn-ghost flex-1 justify-center">
          Back to History
        </Link>
      </div>
    </div>
  );
}
