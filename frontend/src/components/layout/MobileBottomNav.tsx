import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Stethoscope, Brain, GraduationCap, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
  isMenuOpen: boolean;
}

export default function MobileBottomNav({ onOpenMenu, isMenuOpen }: MobileBottomNavProps) {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/cases', label: 'AI Patients', icon: Stethoscope },
    { to: '/ai-tutor', label: 'AI Tutor', icon: Brain },
    { to: '/exams', label: 'OSCE', icon: GraduationCap },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-2 py-1 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center justify-around">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 min-w-[56px] rounded-xl transition-all ${
                isActive
                  ? 'text-teal-600 font-bold scale-105'
                  : 'text-gray-500 hover:text-gray-900 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'bg-teal-50' : 'bg-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Menu Drawer Toggle Button */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open Navigation Menu"
          className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] rounded-xl transition-all ${
            isMenuOpen
              ? 'text-teal-600 font-bold scale-105'
              : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              isMenuOpen ? 'bg-teal-50' : 'bg-transparent'
            }`}
          >
            <Menu className={`w-5 h-5 ${isMenuOpen ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
}
