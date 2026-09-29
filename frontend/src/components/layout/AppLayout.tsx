import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import { Menu, Stethoscope, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Immersive full-screen clinical simulation & classroom routes:
  // Virtual Patient Consultation (/session/:sessionId), OSCE Station (/exams/.../station/...), and AI Teacher Classroom (/ai-tutor/class)
  // These routes have their own full-screen UI with specialized headers and controls,
  // and MUST NOT be covered or restricted by the global mobile nav or desktop sidebar.
  const isImmersiveRoute =
    location.pathname.startsWith('/session/') ||
    (location.pathname.startsWith('/exams/') && location.pathname.includes('/station/')) ||
    location.pathname.startsWith('/ai-tutor/class');

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // For immersive full-screen clinical simulation routes: render unconstrained full viewport
  if (isImmersiveRoute) {
    return (
      <div className="h-[100dvh] h-screen w-full bg-slate-950 overflow-hidden flex flex-col">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden">
      {/* ────────────────────────────────────────────────────────
          MOBILE TOP APP BAR (Visible only on < md)
         ──────────────────────────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 sticky top-0 z-30 shadow-2xs flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open Navigation Menu"
            className="p-2 -ml-1 text-gray-600 hover:text-navy-900 hover:bg-gray-100 rounded-xl transition-colors active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-navy-900 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-navy-900 text-sm">Techboloy Med</span>
            </div>
          </Link>
        </div>

        {/* User Profile avatar quick link */}
        <Link
          to="/profile"
          className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs hover:bg-teal-100 transition-colors"
          title="My Profile"
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
        </Link>
      </header>

      {/* ────────────────────────────────────────────────────────
          DESKTOP SIDEBAR (Visible on md+)
         ──────────────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* ────────────────────────────────────────────────────────
          MOBILE DRAWER MODAL OVERLAY (Visible on < md when open)
         ──────────────────────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-out Sidebar Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-out">
            <Sidebar onClose={() => setIsMobileMenuOpen(false)} isMobile={true} />
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MAIN ROUTE CONTENT AREA
         ──────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* ────────────────────────────────────────────────────────
          MOBILE BOTTOM NAVIGATION (Fixed at bottom on < md)
         ──────────────────────────────────────────────────────── */}
      <MobileBottomNav
        onOpenMenu={() => setIsMobileMenuOpen(true)}
        isMenuOpen={isMobileMenuOpen}
      />
    </div>
  );
}
