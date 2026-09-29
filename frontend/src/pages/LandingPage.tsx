import { Link } from 'react-router-dom';
import {
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  Users,
  ChevronRight,
  Mic,
  Award,
  Globe,
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Dynamic AI Patients',
    description: 'Stateful, clinically realistic virtual patients who understand follow-ups, remember conversation history, and never give robotic generic answers.',
  },
  {
    icon: Globe,
    title: 'Bangla & English Voice',
    description: 'Speak naturally in Bangla, English, or Banglish with real-time speech recognition and synchronized 3D avatar lip-sync.',
  },
  {
    icon: Award,
    title: 'OSCE Rubric Evaluation',
    description: 'Receive instant clinical scoring on SOCRATES exploration, pertinent negatives, red flags, and bedside communication.',
  },
  {
    icon: BookOpen,
    title: 'AI Medical Tutor & Hub',
    description: 'Master clinical medicine with interactive lecture avatars, adaptive flashcards, high-yield MCQs, and Viva practice.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Select a Clinical Case',
    description: 'Choose from cardiology, respiratory, gastroenterology, neurology, and acute abdomen cases.',
  },
  {
    number: '02',
    title: 'Meet Your AI Patient',
    description: 'Review patient demographic profile, triage vitals, and target history-taking objectives.',
  },
  {
    number: '03',
    title: 'Voice Consultation',
    description: 'Speak or type naturally. Explore onset, character, radiation, past history, and red flags.',
  },
  {
    number: '04',
    title: 'Clinical Feedback',
    description: 'Get instant comprehensive evaluation on your diagnostic reasoning and missed questions.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* Navigation Bar (Mobile-First Sticky Header)                 */}
      {/* ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-navy-900 rounded-xl flex items-center justify-center shadow-xs group-hover:bg-navy-800 transition-colors">
              <Stethoscope className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-teal-400" />
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-navy-900">
              Techboloy <span className="text-teal-600">Med</span>
            </span>
          </Link>

          {/* Right Header CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              to="/login"
              className="text-xs sm:text-sm font-semibold text-gray-700 hover:text-navy-900 px-2.5 sm:px-3.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center justify-center text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white shadow-xs transition-all active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Hero Section (Optimized for 320px–430px Mobile & Desktop)   */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 md:pt-16 pb-10 sm:pb-16 flex-1 w-full">
        <div className="max-w-3xl">
          {/* Platform Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200/60 text-teal-800 rounded-full text-[11px] sm:text-xs font-semibold mb-4 sm:mb-5 shadow-2xs">
            <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-pulse" />
            <span>AI Clinical Patient & Medical Simulation</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-navy-950 tracking-tight leading-[1.18] mb-3.5 sm:mb-5">
            Meet Your AI Patient.{' '}
            <span className="block text-navy-900 bg-gradient-to-r from-navy-900 via-navy-800 to-teal-700 bg-clip-text text-transparent mt-1">
              Practice Clinical Skills.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-6 sm:mb-8 leading-relaxed max-w-2xl">
            Practice medical history-taking, diagnostic communication, and patient empathy with interactive
            AI virtual patients. Build confidence before ward rounds and clinical OSCE exams.
          </p>

          {/* Action Buttons (Stacked on Mobile, Inline on Desktop) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5 w-full sm:w-auto">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] text-sm sm:text-base min-h-[48px]"
            >
              <span>Start Practicing Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm sm:text-base min-h-[48px]"
            >
              <span>Explore Patient Cases</span>
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-5 text-[11px] sm:text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
              <span>Bangla & English Support</span>
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
              <span>Interactive 3D Avatar</span>
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
              <span>Instant OSCE Scoring</span>
            </span>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────── */}
        {/* Mock Consultation UI (Mobile-First Interactive Preview)   */}
        {/* ────────────────────────────────────────────────────────── */}
        <div className="mt-8 sm:mt-14 bg-gray-50 rounded-2xl border border-gray-200/90 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="bg-white border-b border-gray-100 px-3.5 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-teal-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">Clinical Consultation</p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">Rahim Ahmed, 52M — Central Chest Pain</p>
              </div>
            </div>
            <span className="text-[10px] sm:text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200/60 px-2 py-0.5 rounded-full flex-shrink-0">
              ● Active Consultation
            </span>
          </div>

          {/* Conversation Dialogue */}
          <div className="p-3 sm:p-5 space-y-2.5 sm:space-y-3.5 bg-slate-900/5">
            {/* Patient Message */}
            <div className="flex gap-2 sm:gap-3 max-w-full sm:max-w-md">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-navy-800 text-[10px] sm:text-xs font-bold">
                P
              </div>
              <div className="bg-white rounded-2xl rounded-tl-xs px-3 sm:px-4 py-2 sm:py-2.5 shadow-2xs border border-gray-100 text-xs sm:text-sm text-gray-800 leading-relaxed">
                Doctor, I've had this severe pressing pain in my chest for the past 2 hours. It feels heavy, like someone is squeezing my chest.
              </div>
            </div>

            {/* Doctor Question */}
            <div className="flex gap-2 sm:gap-3 max-w-full sm:max-w-md ml-auto flex-row-reverse">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-[10px] sm:text-xs font-bold">
                Dr
              </div>
              <div className="bg-navy-900 rounded-2xl rounded-tr-xs px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white leading-relaxed">
                When did it start, and does the pain radiate anywhere like your left arm, neck, or back?
              </div>
            </div>

            {/* Patient Answer */}
            <div className="flex gap-2 sm:gap-3 max-w-full sm:max-w-md">
              <div className="w-6 h-6 sm:w-7 sm:h-7 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-navy-800 text-[10px] sm:text-xs font-bold">
                P
              </div>
              <div className="bg-white rounded-2xl rounded-tl-xs px-3 sm:px-4 py-2 sm:py-2.5 shadow-2xs border border-gray-100 text-xs sm:text-sm text-gray-800 leading-relaxed">
                It started about two hours ago while walking up the stairs. Yes, it radiates down towards my left arm, and I broke into cold sweats.
              </div>
            </div>
          </div>

          {/* Simulated Input Bar */}
          <div className="border-t border-gray-100 px-3 sm:px-5 py-2.5 sm:py-3 bg-white flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-400 border border-gray-200/80 truncate">
              Ask your next clinical question...
            </div>
            <button className="w-8 h-8 sm:w-9 sm:h-9 bg-navy-900 rounded-xl flex items-center justify-center flex-shrink-0 text-white">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* How it Works Section (4 Steps)                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="bg-gray-50/80 border-y border-gray-100 py-10 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-6 sm:mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Simple 4-Step Process</span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-navy-950 mt-1">How Techboloy Med Works</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">From initial chief complaint to comprehensive clinical audit.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {steps.map((step) => (
              <div key={step.number} className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-gray-200">{step.number}</span>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 mt-1.5 mb-1">{step.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Core Features Grid (Mobile-Optimized)                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full">
        <div className="max-w-2xl mb-6 sm:mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Comprehensive Learning</span>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-navy-950 mt-1">Built for Medical Education</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Every module is designed to accelerate clinical confidence before wards.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-3.5 sm:gap-4 p-4 sm:p-5 bg-white rounded-2xl border border-gray-100 shadow-2xs hover:border-teal-200 transition-all">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-teal-700" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-1">{title}</h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Final CTA Banner (Mobile-First Card)                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <section className="bg-navy-900 py-10 sm:py-14 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-8 text-center sm:text-left">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Ready to Master Clinical History Taking?</h2>
            <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-xl">
              Start practicing with realistic clinical cases, AI avatars, and instant rubric feedback.
            </p>
          </div>
          <div className="w-full sm:w-auto flex-shrink-0">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-500 hover:bg-teal-400 text-navy-950 font-bold rounded-xl transition-all shadow-md text-sm sm:text-base"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Footer                                                      */}
      {/* ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-6 sm:py-8 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-navy-900 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-3 h-3 text-teal-400" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-navy-900">Techboloy Med</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-[11px] text-gray-400 max-w-md">
            <span>Educational simulation only — does not replace certified clinical supervision.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
