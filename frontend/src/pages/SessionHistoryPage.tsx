import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionsService } from '../services/sessionsService';
import type { PracticeSession } from '../types';
import { DifficultyBadge, formatDuration } from '../utils/formatters';
import { History, Clock, MessageSquare, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function SessionHistoryPage() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    sessionsService.getSessions().then(setSessions).finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Session History</h1>
        <p className="text-gray-500 text-sm">Review your past consultation sessions and transcripts.</p>
      </div>

      {isLoading ? (
        <div className="card divide-y divide-gray-50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 animate-pulse flex gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-lg" />
              <div className="flex-1"><div className="h-4 bg-gray-100 rounded w-1/3 mb-2" /><div className="h-3 bg-gray-100 rounded w-1/4" /></div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card p-12 text-center">
          <History className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-gray-600 mb-1">No sessions yet</p>
          <p className="text-sm text-gray-400 mb-4">Start your first consultation to begin your practice history.</p>
          <Link to="/cases" className="btn-primary">Browse Cases</Link>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {sessions.map(session => (
            <Link key={session.id} to={`/history/${session.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
              <div className="w-10 h-10 bg-navy-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-navy-800">{session.patientCase.patientName.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{session.patientCase.patientName}</p>
                <p className="text-xs text-gray-400 truncate">{session.patientCase.title} · {session.patientCase.category}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-400">
                <span>{format(new Date(session.createdAt), 'MMM d, yyyy')}</span>
                {session.duration && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(session.duration)}</span>
                )}
                {session._count && (
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{session._count.messages}</span>
                )}
                <DifficultyBadge difficulty={session.patientCase.difficulty} />
                <span className={`font-medium px-2 py-0.5 rounded-full ${session.status === 'completed' ? 'bg-green-50 text-green-700' : session.status === 'active' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                  {session.status}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-navy-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
