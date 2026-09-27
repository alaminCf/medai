import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import AppLayout from './components/layout/AppLayout';

// Public pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Protected pages: Clinical Simulation (Phases 1-5)
import DashboardPage from './pages/DashboardPage';
import CasesPage from './pages/CasesPage';
import CaseDetailPage from './pages/CaseDetailPage';
import PracticeSessionPage from './pages/PracticeSessionPage';
import SessionHistoryPage from './pages/SessionHistoryPage';
import SessionTranscriptPage from './pages/SessionTranscriptPage';
import ClinicalEvaluationPage from './pages/ClinicalEvaluationPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AdminPage from './pages/AdminPage';
import ExamHubPage from './pages/ExamHubPage';
import OSCEStationPage from './pages/OSCEStationPage';
import OSCEResultPage from './pages/OSCEResultPage';

// Protected pages: Academic Learning Hub & Study Workspace (Phase 6)
import LearningHubPage from './pages/learning/LearningHubPage';
import MaterialsLibraryPage from './pages/learning/MaterialsLibraryPage';
import DocumentReaderPage from './pages/learning/DocumentReaderPage';
import NotesPage from './pages/learning/NotesPage';
import FlashcardsPage from './pages/learning/FlashcardsPage';
import MCQPracticePage from './pages/learning/MCQPracticePage';
import VivaPracticePage from './pages/learning/VivaPracticePage';
import AITutorPage from './pages/learning/AITutorPage';
import ProgressPage from './pages/learning/ProgressPage';

// Phase 7: Adaptive Learning & Smart Revision
import TodayPage from './pages/learning/TodayPage';
import SmartRevisionPage from './pages/learning/SmartRevisionPage';
import AdaptiveFlashcardsPage from './pages/learning/AdaptiveFlashcardsPage';
import AdaptiveMCQPage from './pages/learning/AdaptiveMCQPage';
import AdaptiveVivaPage from './pages/learning/AdaptiveVivaPage';
import MistakesBankPage from './pages/learning/MistakesBankPage';
import KnowledgeMapPage from './pages/learning/KnowledgeMapPage';
import StudyPlanPage from './pages/learning/StudyPlanPage';
import SubjectDetailPage from './pages/learning/SubjectDetailPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected — wrapped in AppLayout sidebar */}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        {/* Core & Clinical Simulation */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/session/:sessionId" element={<PracticeSessionPage />} />
        <Route path="/session/:sessionId/evaluation" element={<ClinicalEvaluationPage />} />
        <Route path="/sessions/:sessionId/evaluation" element={<ClinicalEvaluationPage />} />
        <Route path="/history" element={<SessionHistoryPage />} />
        <Route path="/history/:sessionId" element={<SessionTranscriptPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Phase 5: OSCE Clinical Exam Routes */}
        <Route path="/exams" element={<ExamHubPage />} />
        <Route path="/exams/:id/station/:stationId" element={<OSCEStationPage />} />
        <Route path="/exams/results/:attemptId" element={<OSCEResultPage />} />

        {/* Phase 6: Academic Learning Hub & Study Workspace */}
        <Route path="/learning" element={<LearningHubPage />} />
        <Route path="/learning/materials" element={<MaterialsLibraryPage />} />
        <Route path="/learning/materials/:id" element={<DocumentReaderPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/flashcards" element={<FlashcardsPage />} />
        <Route path="/mcq" element={<MCQPracticePage />} />
        <Route path="/viva" element={<VivaPracticePage />} />
        <Route path="/ai-tutor" element={<AITutorPage />} />
        <Route path="/progress" element={<ProgressPage />} />

        {/* Phase 7: Adaptive Learning + Smart Revision Routes */}
        <Route path="/today" element={<TodayPage />} />
        <Route path="/revision" element={<SmartRevisionPage />} />
        <Route path="/flashcards/review" element={<AdaptiveFlashcardsPage />} />
        <Route path="/mcq/adaptive" element={<AdaptiveMCQPage />} />
        <Route path="/viva/adaptive" element={<AdaptiveVivaPage />} />
        <Route path="/progress/mistakes" element={<MistakesBankPage />} />
        <Route path="/progress/knowledge-map" element={<KnowledgeMapPage />} />
        <Route path="/study-plan" element={<StudyPlanPage />} />
        <Route path="/subjects/:subject" element={<SubjectDetailPage />} />
        <Route path="/subjects/:subject/topics/:topic" element={<SubjectDetailPage />} />

        <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
