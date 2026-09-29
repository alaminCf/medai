import React, { useState } from 'react';
import {
  Brain,
  Zap,
  RotateCw,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Award,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Target,
} from 'lucide-react';

export const FlashcardGuide: React.FC<{ defaultOpen?: boolean }> = ({ defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'what' | 'how' | 'benefits' | 'demo'>('what');

  // Demo card state
  const [demoFlipped, setDemoFlipped] = useState(false);
  const [demoRatingFeedback, setDemoRatingFeedback] = useState<string | null>(null);

  const handleDemoRating = (rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY') => {
    switch (rating) {
      case 'AGAIN':
        setDemoRatingFeedback(
          '🔴 Again চাপার ফলে সিস্টেম বুঝে নিল আপনি এটি মনে করতে পারেননি। তাই অ্যালগরিদম এই কার্ডটি আজকের মধ্যেই আবার আপনার সামনে আনবে।'
        );
        break;
      case 'HARD':
        setDemoRatingFeedback(
          '🟡 Hard চাপার ফলে সিস্টেম বুঝল কষ্ট হয়েছে। এটি আগামীকাল বা ১ দিন পর আবার রিভিশনে পাঠাবে।'
        );
        break;
      case 'GOOD':
        setDemoRatingFeedback(
          '🟢 Good চাপার ফলে সিস্টেম বুঝল আপনার স্মৃতি ভালো আছে। এটি ৩ থেকে ৪ দিন পর আবার রিভিশনে দেবে।'
        );
        break;
      case 'EASY':
        setDemoRatingFeedback(
          '💎 Easy চাপার ফলে সিস্টেম বুঝল এটি আপনার একদম মুখস্থ! অযথা সময় নষ্ট না করে এটি ১ থেকে ২ সপ্তাহ পর সরাসরি আপনার লং-টার্ম মেমোরিতে চেক করবে।'
        );
        break;
    }
  };

  const resetDemo = () => {
    setDemoFlipped(false);
    setDemoRatingFeedback(null);
  };

  return (
    <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-teal-500/20 mb-8 overflow-hidden relative">
      {/* Decorative Glow */}
      <div className="absolute -right-12 -top-12 w-56 h-56 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 pb-4 border-b border-white/10">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-400/20">
                Medical Revision Guide
              </span>
              <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">• নতুনদের জন্য সহায়িকা</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
              মেডিকেলে ফ্ল্যাশকার্ড কেন এবং কীভাবে ব্যবহার করবেন?
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200 transition border border-white/10 self-start sm:self-auto"
        >
          <span>{isOpen ? 'গাইড লুকান' : 'বিস্তারিত গাইড পড়ুন'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-5 space-y-6 relative z-10">
          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
            বই বারবার রিডিং পড়লে মানুষ কয়েক দিনেই ৮০% পড়া ভুলে যায়। কিন্তু চিকিৎসাবিজ্ঞানের হাজার হাজার এনাটমি,
            ফার্মাকোলজি ড্রাগ ও প্যাথলজি সাইন আজীবন মনে রাখার একমাত্র প্রমাণিত বৈজ্ঞানিক হাতিয়ার হলো{' '}
            <strong className="text-teal-300 font-bold">Active Recall ও Spaced Repetition ফ্ল্যাশকার্ড</strong>।
          </p>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('what')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'what'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>১. ফ্ল্যাশকার্ড আসলে কী?</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('how')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'how'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>২. ব্যবহারের ৩টি সহজ ধাপ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('benefits')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'benefits'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-white/10 hover:bg-white/15 text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>৩. এর বৈজ্ঞানিক লাভ ও সুবিধা</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('demo')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'demo'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>৪. নিজে ট্রাই করে দেখুন (Live Demo)</span>
            </button>
          </div>

          {/* Tab 1: What is a Flashcard */}
          {activeTab === 'what' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center text-xs font-black">
                  ক
                </div>
                <h3 className="text-sm font-bold text-white">একটি ভার্চুয়াল ২-পিঠের কার্ড</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  একটি সাধারণ কাগজের কার্ডের কথা ভাবুন। কার্ডের <strong>সামনের পিঠে (Front)</strong> থাকে একটি মেডিকেল প্রশ্ন বা ক্লিনিক্যাল ক্লু, আর <strong>পেছনের পিঠে (Back)</strong> থাকে তার সঠিক উত্তর ও মেকানিজম।
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xs font-black">
                  খ
                </div>
                <h3 className="text-sm font-bold text-white">প্যাসিভ রিডিংয়ের বিপরীত</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  বইয়ের লাইন দেখে পড়া হলো প্যাসিভ পড়া—যা মানুষ দ্রুত ভুলে যায়। কিন্তু ফ্ল্যাশকার্ডে প্রথমে উত্তর লুকানো থাকে, ফলে মস্তিষ্ক স্মৃতি হাতড়ে উত্তর খোঁজার সক্রিয় চ্যালেঞ্জ গ্রহণ করে।
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-black">
                  গ
                </div>
                <h3 className="text-sm font-bold text-white">স্মার্ট অ্যালগরিদম (SM-2)</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  সব প্রশ্ন বারবার পড়ার দরকার নেই। যা আপনার মুখস্থ হয়ে গেছে তা সিস্টেম দূরে পাঠিয়ে দেয়, আর যা আপনি ভুল করেছেন তা খুব দ্রুত রিভিশনের জন্য আপনার সামনে ফিরিয়ে আনে।
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: How to Use */}
          {activeTab === 'how' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    ১
                  </span>
                  <h4 className="font-bold text-sm text-teal-300">প্রশ্ন দেখে মনে করার চেষ্টা করুন</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  কার্ডের সামনে প্রশ্ন আসার পর সাথে সাথে উল্টাবেন না! অন্তত ৪-৫ সেকেন্ড চোখ বন্ধ করে মনে মনে উত্তরটি সাজানোর চেষ্টা করুন (একে বলে <em>Active Recall</em>)।
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    ২
                  </span>
                  <h4 className="font-bold text-sm text-teal-300">Flip করে উত্তর মিলিয়ে নিন</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  এবার কার্ডে ট্যাপ করে বা "Show Answer"-এ ক্লিক করে কার্ডটি উল্টান। সঠিক উত্তর ও ক্লিনিক্যাল ব্যাখ্যাটি পড়ে নিজের ভাবনার সাথে মিলিয়ে নিন।
                </p>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center">
                    ৩
                  </span>
                  <h4 className="font-bold text-sm text-teal-300">সততার সাথে রেটিং দিন</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  নিচে ৪টি বাটন আসবে:
                  <br />• <strong className="text-rose-400">Again:</strong> একদম মনে আসেনি (আজই আবার আসবে)
                  <br />• <strong className="text-amber-400">Hard:</strong> কষ্ট হয়েছে (১ দিন পর আসবে)
                  <br />• <strong className="text-teal-400">Good:</strong> মনে করতে পেরেছি (৩ দিন পর)
                  <br />• <strong className="text-emerald-400">Easy:</strong> খুব সহজ (১-২ সপ্তাহ পর)
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Benefits and Science */}
          {activeTab === 'benefits' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white">৯ গুণ শক্তিশালী মেমোরি রিটেনশন</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    বিজ্ঞানীদের মতে, সাধারণ বই রিডিং পড়ার চেয়ে কোনো প্রশ্ন সক্রিয়ভাবে মনে করার চেষ্টা করলে মস্তিষ্কের নিউরনে স্থায়ী মেমোরি ট্রেস তৈরি হয়।
                  </p>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white">অযথা রিভিশনে সময় নষ্ট বন্ধ</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    বই রিভিশন দিতে গেলে জানা জিনিসও বারবার পড়তে হয়। ফ্ল্যাশকার্ড শুধুমাত্র আপনার দুর্বল প্রশ্নগুলো বারবার সামনে আনে, যা পড়ার সময় অর্ধেক কমিয়ে দেয়।
                  </p>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white">পরীক্ষার হলে দ্রুত উত্তর মনে আসা</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    মেডিকেলের ভাইভা ও এসবিএ (SBA/MCQ) পরীক্ষায় সিদ্ধান্ত নেওয়ার সময় খুব কম থাকে। ফ্ল্যাশকার্ড তাৎক্ষণিকভাবে সঠিক তথ্য রিকল করার স্পিড তৈরি করে।
                  </p>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white">প্রতিদিন মাত্র ১০-১৫ মিনিটের রুটিন</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    আপনাকে সারাদিন পড়তে হবে না। হোস্টেল থেকে কলেজে যাওয়ার পথে বা রাতে ঘুমানোর আগে মাত্র ১৫ মিনিট ফ্ল্যাশকার্ড সেশন করলেই আপনার পরীক্ষার সব হাই-ইল্ড পয়েন্ট নখদর্পণে থাকবে।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Interactive Live Demo */}
          {activeTab === 'demo' && (
            <div className="bg-white/5 rounded-3xl p-5 sm:p-6 border border-amber-400/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                    Interactive Hands-On Demo
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    নিচের কার্ডটিতে ক্লিক করে ফ্লিপ করুন এবং অভিজ্ঞতা নিন:
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={resetDemo}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 self-start sm:self-auto"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  পুনরায় শুরু করুন
                </button>
              </div>

              {/* Demo Card */}
              <div
                onClick={() => setDemoFlipped(!demoFlipped)}
                className={`min-h-[180px] p-6 rounded-2xl border-2 transition-all duration-300 flex flex-col justify-between cursor-pointer select-none ${
                  demoFlipped
                    ? 'bg-slate-900 border-teal-400 text-white shadow-lg'
                    : 'bg-white text-slate-900 border-white/20 hover:border-teal-400'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className={demoFlipped ? 'text-teal-400' : 'text-teal-700'}>
                    {demoFlipped ? 'REVERSE (ANSWER)' : 'FRONT (QUESTION)'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                    High-Yield Cardiology
                  </span>
                </div>

                <div className="py-4 text-center">
                  {!demoFlipped ? (
                    <div className="space-y-1">
                      <p className="text-base sm:text-lg font-bold text-slate-900">
                        What are the 4 classic anatomical defects in Tetralogy of Fallot (TOF)?
                      </p>
                      <p className="text-xs text-slate-500">
                        (মনে মনে ৪টি পয়েন্ট ভাবুন, তারপর কার্ডে ট্যাপ করুন)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-left">
                      <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
                        সঠিক উত্তর (PROVE Mnemonic):
                      </p>
                      <ul className="text-xs sm:text-sm font-medium space-y-1 text-slate-100 list-disc list-inside">
                        <li><strong>P</strong>ulmonary Infundibular Stenosis</li>
                        <li><strong>R</strong>ight Ventricular Hypertrophy (RVH)</li>
                        <li><strong>O</strong>verriding Aorta</li>
                        <li><strong>V</strong>entricular Septal Defect (VSD)</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="text-center text-[10px] opacity-60 flex items-center justify-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  <span>{demoFlipped ? 'পুনরায় প্রশ্ন দেখতে ট্যাপ করুন' : 'উত্তর দেখতে কার্ডে ট্যাপ করুন'}</span>
                </div>
              </div>

              {/* Demo Rating Buttons */}
              {demoFlipped && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-slate-300 font-semibold text-center">
                    প্রশ্নটি দেখার পর আপনার অনুভূতি কেমন ছিল? নিচের যেকোনো বাটনে ট্যাপ করুন:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDemoRating('AGAIN')}
                      className="py-2.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition flex flex-col items-center"
                    >
                      <span>Again (ভুলে গেছি)</span>
                      <span className="text-[10px] opacity-70">আজকেই আবার</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoRating('HARD')}
                      className="py-2.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex flex-col items-center"
                    >
                      <span>Hard (কঠিন লেগেছে)</span>
                      <span className="text-[10px] opacity-70">১ দিন পর</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoRating('GOOD')}
                      className="py-2.5 px-3 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-bold transition flex flex-col items-center"
                    >
                      <span>Good (মনে ছিল)</span>
                      <span className="text-[10px] opacity-70">৩-৪ দিন পর</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDemoRating('EASY')}
                      className="py-2.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex flex-col items-center"
                    >
                      <span>Easy (খুব সহজ)</span>
                      <span className="text-[10px] opacity-70">১-২ সপ্তাহ পর</span>
                    </button>
                  </div>

                  {demoRatingFeedback && (
                    <div className="p-3.5 rounded-2xl bg-teal-500/15 border border-teal-400/30 text-xs text-teal-200 leading-relaxed animate-fade-in flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0 mt-0.5" />
                      <div>{demoRatingFeedback}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FlashcardGuide;
