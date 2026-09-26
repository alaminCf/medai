import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sessionsService } from '../services/sessionsService';
import type { PracticeSession } from '../types';
import { DifficultyBadge, formatDuration } from '../utils/formatters';
import { ArrowLeft, Clock, MessageSquare, Info, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

export default function SessionTranscriptPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessionId) sessionsService.getSession(sessionId).then(setSession).finally(() => setIsLoading(false));
  }, [sessionId]);

  if (isLoading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!session) return (
    <div className="p-6">
      <button onClick={() => navigate('/history')} className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4" />Back</button>
      <p className="text-gray-400">Session not found.</p>
    </div>
  );

  const pc = session.patientCase;
  const msgs = (session.messages || []).filter(m => m.sender !== 'system');
  const studentMsgs = msgs.filter(m => m.sender === 'student').length;

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
            <h1 className="font-bold text-gray-900">{pc.patientName}</h1>
            <p className="text-sm text-gray-400">{pc.title} · {pc.category}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${session.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {session.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.duration ? formatDuration(session.duration) : 'In progress'}</span>
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{studentMsgs} questions asked</span>
          <span>{format(new Date(session.startedAt), 'MMMM d, yyyy · h:mm a')}</span>
          <DifficultyBadge difficulty={pc.difficulty} />
        </div>
      </div>

      {/* Future feedback notice */}
      <div className="card p-4 mb-5 flex items-start gap-3 bg-blue-50 border-blue-100">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 mb-0.5">Clinical Feedback</p>
          <p className="text-xs text-blue-600">Detailed clinical feedback and scoring will be available in a future version.</p>
        </div>
      </div>

      {/* Transcript */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-400" />
          Consultation Transcript
        </h2>

        {msgs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No conversation recorded.</p>
        ) : (
          <div className="space-y-4">
            {msgs.map((msg, idx) => {
              const isPatient = msg.sender === 'patient';
              return (
                <div key={msg.id || idx} className={`flex items-start gap-3 ${isPatient ? '' : 'flex-row-reverse'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isPatient ? 'bg-navy-100' : 'bg-green-100'}`}>
                    <span className={`text-xs font-bold ${isPatient ? 'text-navy-800' : 'text-green-800'}`}>
                      {isPatient ? pc.patientName.charAt(0) : 'S'}
                    </span>
                  </div>
                  <div className={`max-w-[75%] ${isPatient ? '' : ''}`}>
                    <p className={`text-xs font-medium mb-1 ${isPatient ? 'text-gray-500' : 'text-right text-gray-500'}`}>
                      {isPatient ? pc.patientName : 'You'} · {format(new Date(msg.timestamp), 'h:mm a')}
                    </p>
                    <div className={`rounded-xl px-4 py-2.5 ${isPatient ? 'bg-gray-50 border border-gray-100' : 'bg-navy-900'}`}>
                      <p className={`text-sm leading-relaxed ${isPatient ? 'text-gray-800' : 'text-white'}`}>
                        {msg.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <Link to="/cases" className="btn-secondary flex-1 justify-center">Practice Again</Link>
        <Link to="/history" className="btn-ghost flex-1 justify-center">Back to History</Link>
      </div>
    </div>
  );
}
