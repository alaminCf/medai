import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  History,
  User,
  Settings,
  LogOut,
  Stethoscope,
  ShieldCheck,
  Brain,
  Layers,
  CheckCircle2,
  MessageSquare,
  TrendingUp,
  FolderOpen,
  RotateCcw,
  CalendarCheck,
  Compass,
  AlertCircle,
  Network,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const clinicalItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cases', icon: Stethoscope, label: 'Patients' },
  { to: '/exams', icon: GraduationCap, label: 'OSCE / Exams' },
  { to: '/history', icon: History, label: 'Session History' },
];

const adaptiveItems = [
  { to: '/today', icon: CalendarCheck, label: "Today's Plan", badge: 'NEW' },
  { to: '/revision', icon: RotateCcw, label: 'Smart Revision' },
  { to: '/study-plan', icon: Compass, label: 'Study Plan' },
  { to: '/progress/knowledge-map', icon: Network, label: 'Knowledge Map' },
  { to: '/progress/mistakes', icon: AlertCircle, label: 'Mistake Bank' },
];

const academicItems = [
  { to: '/learning', icon: GraduationCap, label: 'Learning Hub' },
  { to: '/learning/materials', icon: FolderOpen, label: 'Study Materials' },
  { to: '/notes', icon: BookOpen, label: 'My Notes' },
  { to: '/flashcards', icon: Layers, label: 'Flashcards' },
  { to: '/mcq', icon: CheckCircle2, label: 'MCQ Practice' },
  { to: '/viva', icon: MessageSquare, label: 'Viva Practice' },
  { to: '/ai-tutor', icon: Brain, label: 'AI Tutor' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
];

const bottomItems = [
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-full shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-navy-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-navy-900 text-sm leading-tight">Techboloy Med</p>
            <p className="text-[10px] text-gray-400 font-medium">Virtual Patient & Academic Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation List (Scrollable) */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {/* Adaptive Learning Section (Phase 7) */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1">
            <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-teal-600" />
              Adaptive Revision
            </p>
            <span className="text-[9px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-bold">
              PHASE 7
            </span>
          </div>
          <div className="space-y-0.5">
            {adaptiveItems.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? 'sidebar-item-active bg-teal-50 text-teal-900 font-semibold'
                    : 'sidebar-item hover:text-teal-900 hover:bg-teal-50/50'
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-teal-600" />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="text-[9px] bg-teal-600 text-white font-bold px-1.5 py-0.2 rounded">
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Clinical Simulation Section */}
        <div>
          <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Clinical Simulation
          </p>
          <div className="space-y-0.5">
            {clinicalItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive ? 'sidebar-item-active' : 'sidebar-item'
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* Academic Workspace Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Study Workspace
            </p>
          </div>
          <div className="space-y-0.5">
            {academicItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  isActive
                    ? 'sidebar-item-active'
                    : 'sidebar-item'
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {user?.role === 'admin' && (
          <div>
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Administration
            </p>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                isActive ? 'sidebar-item-active' : 'sidebar-item'
              }
            >
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Admin Management</span>
            </NavLink>
          </div>
        )}
      </nav>

      {/* Bottom Profile / Settings */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-0.5 flex-shrink-0">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item'
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* User info */}
        <div className="px-3 py-2 mt-1">
          <p className="text-xs font-semibold text-gray-900 truncate">{user?.name}</p>
          <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
        </div>

        <button
          onClick={handleLogout}
          className="sidebar-item text-red-500 hover:bg-red-50 hover:text-red-600 w-full"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
