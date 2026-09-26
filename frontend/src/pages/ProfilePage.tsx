import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersService } from '../services/usersService';
import { getApiError } from '../services/api';
import { User, Mail, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setName(user?.name || ''); }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!name.trim()) { setError('Name is required'); return; }
    setIsLoading(true);
    try {
      const updated = await usersService.updateProfile(name.trim());
      updateUser({ ...user!, ...updated });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-14 h-14 bg-navy-100 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold text-navy-800">{user?.name?.charAt(0)}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2.5 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" />{user?.email}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-gray-600">
            <User className="w-4 h-4 text-gray-400" />Role: <span className="capitalize">{user?.role}</span>
          </div>
          {user?.createdAt && (
            <div className="flex items-center gap-2.5 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />Member since {format(new Date(user.createdAt), 'MMMM yyyy')}
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label" htmlFor="profile-name">Full Name</label>
            <input id="profile-name" type="text" value={name} onChange={e => setName(e.target.value)} className="input-field" />
          </div>
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />{success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
