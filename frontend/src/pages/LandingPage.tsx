import { Link } from 'react-router-dom';
import {
  Stethoscope, ArrowRight, CheckCircle2, BookOpen, MessageSquare,
  BarChart3, Shield, Users, ChevronRight
} from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: 'Realistic AI Patients',
    description: 'Practice with AI patients that respond naturally, maintain consistent histories, and behave like real people.',
  },
  {
    icon: BookOpen,
    title: 'Structured Case Library',
    description: 'Access a growing library of patient cases across cardiology, respiratory, neurology, and more.',
  },
  {
    icon: BarChart3,
    title: 'Track Your Progress',
    description: 'Review consultation transcripts and monitor your practice sessions over time.',
  },
  {
    icon: Shield,
    title: 'Safe Learning Environment',
    description: 'Practice without risk. Make mistakes, explore clinical reasoning, and develop confidence.',
  },
];

const steps = [
  { number: '01', title: 'Select an AI Patient Case', description: 'Choose from our library of realistic AI patient scenarios.' },
  { number: '02', title: 'Meet Your AI Patient', description: 'Review AI patient details and learning objectives before you begin.' },
  { number: '03', title: 'Conduct Consultation', description: 'Ask history questions and receive natural AI patient responses.' },
  { number: '04', title: 'Review Your Session', description: 'Read back through your consultation transcript and reflect on your practice.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-navy-900 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-navy-900">Techboloy Med</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-gray-600">Sign in</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-navy-50 text-navy-700 rounded-full text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 bg-navy-700 rounded-full" />
            Medical Education Platform
          </div>
          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-5 tracking-tight">
            Meet Your AI Patient.<br />
            <span className="text-navy-900">Practice Your Clinical Skills.</span>
          </h1>
          <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-2xl">
            Practice history taking, clinical communication and patient interaction through realistic
            AI-powered virtual patients. Build confidence before the ward.
          </p>
          <div className="flex items-center gap-3">
            <Link to="/register" className="btn-primary text-base px-6 py-3">
              Start Practicing
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-secondary text-base px-6 py-3">
              Explore Cases
            </Link>
          </div>
        </div>

        {/* Mock consultation UI */}
        <div className="mt-16 bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-navy-50 rounded-full flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-navy-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Clinical Consultation</p>
                <p className="text-xs text-gray-400">Rahim Ahmed, 52M — Chest Pain</p>
              </div>
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">● Active</span>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex gap-3 max-w-md">
              <div className="w-7 h-7 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-navy-800">P</span>
              </div>
              <div className="bg-white rounded-xl rounded-tl-sm px-4 py-2.5 shadow-card border border-gray-100">
                <p className="text-sm text-gray-700">Doctor, I've been having some discomfort in my chest for the past few days. It's making me quite worried.</p>
              </div>
            </div>
            <div className="flex gap-3 max-w-md ml-auto flex-row-reverse">
              <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-green-800">S</span>
              </div>
              <div className="bg-navy-900 rounded-xl rounded-tr-sm px-4 py-2.5">
                <p className="text-sm text-white">When did the discomfort start, and where exactly do you feel it?</p>
              </div>
            </div>
            <div className="flex gap-3 max-w-md">
              <div className="w-7 h-7 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-navy-800">P</span>
              </div>
              <div className="bg-white rounded-xl rounded-tl-sm px-4 py-2.5 shadow-card border border-gray-100">
                <p className="text-sm text-gray-700">It started about three days ago. It's right here in the middle of my chest — like a heavy pressure. Sometimes it goes into my left arm.</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 px-5 py-3 bg-white flex items-center gap-3">
            <div className="flex-1 bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-400 border border-gray-200">
              Ask the AI patient a question...
            </div>
            <button className="w-9 h-9 bg-navy-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 border-y border-gray-100 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">How It Works</h2>
          <p className="text-gray-500 mb-10">Four steps to a complete practice consultation.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.number} className="bg-white rounded-xl p-5 border border-gray-100 shadow-card">
                <span className="text-3xl font-bold text-gray-100">{step.number}</span>
                <h3 className="font-semibold text-gray-900 mt-2 mb-1.5">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Built for Medical Education</h2>
        <p className="text-gray-500 mb-10">Every feature designed to improve clinical communication skills.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4 p-5 bg-white rounded-xl border border-gray-100 shadow-card">
              <div className="w-10 h-10 bg-navy-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-navy-700" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Clinical Practice callout */}
      <section className="bg-navy-900 py-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Practice?</h2>
            <p className="text-navy-300 text-sm">Join medical students already improving their clinical skills.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-navy-900 font-medium rounded-lg hover:bg-gray-100 transition-all text-sm">
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-navy-900 rounded-md flex items-center justify-center">
              <Stethoscope className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-navy-900">Techboloy Med</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <CheckCircle2 className="w-3 h-3 text-gray-300" />
            Educational simulation only — does not replace clinical supervision or professional medical judgment.
          </div>
        </div>
      </footer>
    </div>
  );
}
