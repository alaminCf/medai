import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Stethoscope, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { getApiError } from '../../services/api';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      {checks.map(c => (
        <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-green-600' : 'text-gray-400'}`}>
          <CheckCircle2 className={`w-3 h-3 ${c.ok ? 'text-green-500' : 'text-gray-300'}`} />
          {c.label}
        </div>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const { user, token } = await authService.register(form);
      login(token, user);
      navigate('/dashboard');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setIsLoading(false);
    }
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
          <h2 className="text-xl font-bold mb-3">Start your clinical practice journey.</h2>
          <p className="text-navy-300 text-sm leading-relaxed">
            Practice with realistic AI patients. Improve your history-taking. Build confidence before the ward.
          </p>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
          <p className="text-gray-500 text-sm mb-7">Start practicing with AI patients today.</p>
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Full Name</label>
              <input id="name" type="text" value={form.name} onChange={set('name')}
                placeholder="Dr. Jane Smith" className="input-field" required autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="reg-email">Email</label>
              <input id="reg-email" type="email" value={form.email} onChange={set('email')}
                placeholder="your@email.com" className="input-field" required autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="reg-password">Password</label>
              <div className="relative">
                <input id="reg-password" type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={set('password')} placeholder="Create a strong password"
                  className="input-field pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" type="password" value={form.confirmPassword} onChange={set('confirmPassword')}
                placeholder="Repeat your password" className="input-field" required />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
              {isLoading ? <span className="flex items-center gap-2 justify-center"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating account...</span> : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account? <Link to="/login" className="text-navy-900 font-medium hover:underline">Sign in</Link>
          </p>
          <p className="mt-6 text-xs text-gray-400 text-center border-t border-gray-100 pt-4">
            Educational simulation — does not replace clinical supervision.
          </p>
        </div>
      </div>
    </div>
  );
}
