import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Stethoscope, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { getApiError } from '../../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { user, token } = await authService.login({ email, password });
      login(token, user);
      navigate('/dashboard');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (type: 'student' | 'admin') => {
    if (type === 'student') {
      setEmail('student@techboloy.med');
      setPassword('Student123!');
    } else {
      setEmail('admin@techboloy.med');
      setPassword('Admin123!');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="hidden lg:flex flex-col w-96 bg-navy-900 p-10 text-white">
        <Link to="/" className="flex items-center gap-2.5 mb-auto">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold">Techboloy Med</span>
        </Link>
        <div>
          <p className="text-xl font-bold leading-tight mb-3">
            "The AI patient is remarkably realistic. It really improves my history-taking skills."
          </p>
          <p className="text-navy-300 text-sm">— Medical Student, Year 3</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 bg-navy-900 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-navy-900 text-sm">Techboloy Med</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-500 text-sm mb-5">Sign in to continue practicing.</p>

          {/* Quick Demo Access Buttons */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-5">
            <div className="flex items-center gap-1.5 text-teal-800 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Quick Demo Fill</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('student')}
                className="text-xs font-medium py-1.5 px-2.5 bg-white text-navy-900 border border-teal-200 rounded hover:bg-teal-100 transition-colors text-center"
              >
                Demo Student
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('admin')}
                className="text-xs font-medium py-1.5 px-2.5 bg-white text-navy-900 border border-teal-200 rounded hover:bg-teal-100 transition-colors text-center"
              >
                Demo Admin
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" className="input-field" required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Your password"
                  className="input-field pr-10" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
              {isLoading ? <span className="flex items-center gap-2 justify-center"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Signing in...</span> : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            No account? <Link to="/register" className="text-navy-900 font-medium hover:underline">Create one</Link>
          </p>
          <p className="mt-6 text-xs text-gray-400 text-center border-t border-gray-100 pt-4">
            Educational simulation — does not replace clinical supervision.
          </p>
        </div>
      </div>
    </div>
  );
}
