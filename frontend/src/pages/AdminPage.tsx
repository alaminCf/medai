import { useEffect, useState } from 'react';
import api from '../services/api';
import { Users, BookOpen, Activity } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalCases: number;
  totalSessions: number;
  activeSessions: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data.stats)).finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Panel</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse"><div className="h-4 bg-gray-100 rounded w-1/2 mb-2" /><div className="h-7 bg-gray-100 rounded w-1/3" /></div>
          ))
        ) : [
          { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Patient Cases', value: stats?.totalCases ?? 0, icon: BookOpen, color: 'text-green-600 bg-green-50' },
          { label: 'Total Sessions', value: stats?.totalSessions ?? 0, icon: Activity, color: 'text-purple-600 bg-purple-50' },
          { label: 'Active Sessions', value: stats?.activeSessions ?? 0, icon: Activity, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mb-2`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="card p-6">
        <p className="font-semibold text-gray-900 mb-2">Admin Features</p>
        <p className="text-sm text-gray-500">
          Full case management, user management, and clinical content editing will be available in future admin versions.
        </p>
      </div>
    </div>
  );
}
