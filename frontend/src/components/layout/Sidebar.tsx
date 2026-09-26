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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cases', icon: BookOpen, label: 'Patient Cases' },
  { to: '/exams', icon: GraduationCap, label: 'Clinical OSCE' },
  { to: '/history', icon: History, label: 'Session History' },
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
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col h-full shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-navy-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-navy-900 text-sm leading-tight">Techboloy Med</p>
            <p className="text-xs text-gray-400">AI Patient</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item'
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item'
            }
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            Admin
          </NavLink>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? 'sidebar-item-active' : 'sidebar-item'
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {/* User info */}
        <div className="px-3 py-2.5 mt-2">
          <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
        </div>

        <button
          onClick={handleLogout}
          className="sidebar-item text-red-500 hover:bg-red-50 hover:text-red-600 w-full"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
