import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  BookmarkPlus,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Send,
  Award,
  Radio,
  Lightbulb,
  User,
} from 'lucide-react';
import learningService from '../../services/learningService';
import speechRecognitionService from '../../services/speechRecognitionService';
import TeacherAvatarCanvas from '../../components/avatar/TeacherAvatarCanvas';
import type { AvatarState } from '../../types';

interface LessonStep {
  stepNumber: number;
  title: string;
  spokenScript: string;
  whiteboardNotes: string[];
  pearl?: string;
  checkQuestion?: {
    question: string;
    options: string[];
    correctOption: string;
    explanation: string;
  };
}

interface TeacherLesson {
  id: string;
  title: string;
  subject: string;
  topic: string;
  language: 'en' | 'bn';
  totalSteps: number;
  currentStep: number;
  steps: LessonStep[];
}

export default function AITeacherClassPage() {
  const [searchParams] = useSearchParams();

  const subjectParam = searchParams.get('subject') || 'Cardiology';
  const topicParam = searchParams.get('topic') || 'Cardiac Cycle & S1-S4 Murmurs';
  const langParam = (searchParams.get('lang') || 'en') as 'en' | 'bn';

  const [lesson, setLesson] = useState<TeacherLesson | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Classroom & Avatar States
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [isPaused, setIsPaused] = useState(false);
  const [speakingText, setSpeakingText] = useState('');
  const [isMuted] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // Student Interaction States
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [checkFeedback, setCheckFeedback] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Chat Drawer & Notes
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'teacher' | 'student'; text: string; time: string }>>([]);
  const [typedQuestion, setTypedQuestion] = useState('');
  const [savedNoteBanner, setSavedNoteBanner] = useState(false);

  // Active Tab in Board
  const [activeBoardTab, setActiveBoardTab] = useState<'whiteboard' | 'pearls' | 'transcript'>('whiteboard');
  const [mobileView, setMobileView] = useState<'avatar' | 'whiteboard'>('avatar');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Initialize Lesson
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError('');

    learningService
      .startTeacherLesson({
        subject: subjectParam,
        topic: topicParam,
        language: langParam,
      })
      .then((res) => {
        if (!mounted) return;
        setConversationId(res.conversationId);
        setLesson(res.lesson);
        setCurrentStepIndex(0);

        if (res.lesson?.steps?.[0]) {
          const firstStep = res.lesson.steps[0];
          setChatMessages([
            {
              sender: 'teacher',
              text: firstStep.spokenScript,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
          // Begin spoken lecture after smooth mounting
          setTimeout(() => {
            speakTeacherScript(firstStep.spokenScript, langParam);
          }, 600);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Failed to start teacher class:', err);
        setError('Failed to initialize virtual classroom. Please check your connection and try again.');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
      stopSpeech();
      speechRecognitionService.stopListening();
    };
  }, [subjectParam, topicParam, langParam]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isEvaluating]);

  // Speech Synthesis Helper
  const speakTeacherScript = (text: string, language: 'en' | 'bn') => {
    if (isMuted || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    setSpeakingText(text);
    setAvatarState('speaking');
    setIsPaused(false);

    const clean = text.replace(/[#*`_~]/g, '').slice(0, 1800);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';

    utterance.onend = () => {
      setAvatarState('idle');
      setSpeakingText('');
    };
    utterance.onerror = () => {
      setAvatarState('idle');
      setSpeakingText('');
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setAvatarState('idle');
    setSpeakingText('');
  };

  const handleTogglePause = () => {
    if (!('speechSynthesis' in window)) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      if (speakingText) setAvatarState('speaking');
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setAvatarState('idle');
    }
  };

  const handleRepeatStep = () => {
    if (!lesson) return;
    const step = lesson.steps[currentStepIndex];
    if (step) {
      speakTeacherScript(step.spokenScript, lesson.language);
    }
  };

  const handleNextStep = () => {
    if (!lesson || currentStepIndex >= lesson.steps.length - 1) return;
    const nextIdx = currentStepIndex + 1;
    setCurrentStepIndex(nextIdx);
    setSelectedOption(null);
    setCheckFeedback(null);

    const nextStep = lesson.steps[nextIdx];
    if (nextStep) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'teacher',
          text: nextStep.spokenScript,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      speakTeacherScript(nextStep.spokenScript, lesson.language);
    }
  };

  // 🎙️ Voice Inquiries (Student asks question to teacher)
  const handleToggleStudentVoice = () => {
    if (isListening) {
      speechRecognitionService.stopListening();
      setIsListening(false);
      return;
    }

    // Stop teacher speech when student begins speaking
    stopSpeech();
    setIsListening(true);
    setAvatarState('listening');
    setInterimTranscript('');

    speechRecognitionService.startListening(lesson?.language || 'en', {
      onStart: () => {
        setIsListening(true);
        setAvatarState('listening');
      },
      onInterimResult: (transcript) => setInterimTranscript(transcript),
      onFinalResult: (finalText) => {
        setIsListening(false);
        setInterimTranscript('');
        if (finalText.trim()) {
          handleSendStudentInquiry(finalText.trim());
        } else {
          setAvatarState('idle');
        }
      },
      onError: (errMsg) => {
        setIsListening(false);
        setAvatarState('idle');
        console.warn('Speech error:', errMsg);
      },
      onEnd: () => {
        setIsListening(false);
        setInterimTranscript('');
      },
    });
  };

  // Send Student Question or Checkpoint Answer
  const handleSendStudentInquiry = async (messageText: string) => {
    if (!messageText.trim() || !conversationId || !lesson) return;

    // Add student message to transcript
    setChatMessages((prev) => [
      ...prev,
      {
        sender: 'student',
        text: messageText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setTypedQuestion('');
    setIsEvaluating(true);
    setAvatarState('thinking');

    try {
      const res = await learningService.interactWithTeacher({
        conversationId,
        studentMessage: messageText,
        stepNumber: currentStepIndex + 1,
        topic: lesson.topic,
        subject: lesson.subject,
        language: lesson.language,
      });

      // Add teacher answer to transcript
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'teacher',
          text: res.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // Speak response
      speakTeacherScript(res.reply, lesson.language);
    } catch (err) {
      console.error('Teacher interaction error:', err);
      const fallback = 'That is an insightful observation. In clinical medicine, always verify the physiological basis of symptoms before forming your final differential.';
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'teacher',
          text: fallback,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      speakTeacherScript(fallback, lesson.language);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Checkpoint Quiz Option Click
  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    const step = lesson?.steps[currentStepIndex];
    if (!step?.checkQuestion) return;

    const isCorrect = option === step.checkQuestion.correctOption;
    const feedback = isCorrect
      ? `Excellent! Correct answer. ${step.checkQuestion.explanation}`
      : `Good attempt, but not quite. ${step.checkQuestion.explanation}`;

    setCheckFeedback(feedback);
    handleSendStudentInquiry(`I select: "${option}" for the checkpoint question.`);
  };

  // 📝 Save Whiteboard to Notes
  const handleSaveLessonToNotes = async () => {
    if (!lesson) return;
    const currentStep = lesson.steps[currentStepIndex];
    const notesContent = `## ${lesson.topic} (${lesson.subject})
**Phase ${currentStepIndex + 1}: ${currentStep.title}**

### Whiteboard Summary:
${currentStep.whiteboardNotes.map((n) => `• ${n}`).join('\n')}

${currentStep.pearl ? `\n### Clinical Pearl:\n${currentStep.pearl}` : ''}

### Spoken Lecture Transcript:
${currentStep.spokenScript}
`;

    try {
      await learningService.createNote({
        title: `AI Teacher Class: ${lesson.topic}`,
        content: notesContent,
        subject: lesson.subject,
        topic: lesson.topic,
        tags: `AI Teacher, Virtual Class, ${lesson.subject}`,
      });
      setSavedNoteBanner(true);
      setTimeout(() => setSavedNoteBanner(false), 2500);
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-3">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <h3 className="text-base font-extrabold text-navy-900">Setting Up Virtual Classroom...</h3>
        <p className="text-xs text-gray-500">Preparing curriculum, 3D anatomical environment & AI Teacher engine</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-gray-200 shadow-md text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-900 mb-1">Classroom Notice</h3>
        <p className="text-xs text-gray-500 mb-5 leading-relaxed">{error || 'Unable to load lesson.'}</p>
        <Link
          to="/ai-tutor"
          className="px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-bold hover:bg-navy-800 transition"
        >
          Return to AI Tutor Hub
        </Link>
      </div>
    );
  }

  const currentStep = lesson.steps[currentStepIndex];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2 sm:py-3 min-h-[calc(100vh-4.5rem)] lg:h-[calc(100vh-4.5rem)] flex flex-col">
      {/* ────────────────────────────────────────────────────────
          TOP CLASSROOM BAR
         ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/ai-tutor"
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            title="Exit Classroom"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 tracking-wider">
                {lesson.subject}
              </span>
              <span className="text-[10px] font-bold text-gray-400">
                {lesson.language === 'bn' ? 'বাংলা লেকচার' : 'English Lecture'}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-navy-900 flex items-center gap-2 truncate">
              {lesson.topic}
            </h1>
          </div>
        </div>

        {/* Phase / Step Progress Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {lesson.steps.map((st, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <button
                key={idx}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  speakTeacherScript(st.spokenScript, lesson.language);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isCurrent
                    ? 'bg-navy-900 text-white shadow-xs'
                    : isDone
                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={`Phase ${idx + 1}: ${st.title}`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                )}
                <span className="hidden md:inline">{st.title.split('&')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          MOBILE VIEW SELECTOR (Visible on < lg)
         ──────────────────────────────────────────────────────── */}
      <div className="flex lg:hidden items-center justify-center p-1 bg-gray-100 rounded-xl my-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => setMobileView('avatar')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileView === 'avatar'
              ? 'bg-navy-900 text-white shadow-2xs'
              : 'text-gray-600 hover:text-navy-900'
          }`}
        >
          <User className="w-3.5 h-3.5 text-teal-400" />
          <span>3D Teacher Avatar</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView('whiteboard')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobileView === 'whiteboard'
              ? 'bg-navy-900 text-white shadow-2xs'
              : 'text-gray-600 hover:text-navy-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-teal-400" />
          <span>Whiteboard & Notes</span>
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────
          CENTER STAGE: 3D TEACHER AVATAR + DIGITAL WHITEBOARD
         ──────────────────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 py-1 sm:py-3 overflow-hidden">
        {/* Left (7 cols): 3D Teacher Avatar Stage */}
        <div className={`lg:col-span-7 flex flex-col h-full overflow-hidden relative ${mobileView === 'whiteboard' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex-1 w-full h-full rounded-2xl overflow-hidden relative shadow-md border border-slate-800">
            <TeacherAvatarCanvas
              avatarState={avatarState}
              speakingText={speakingText}
              currentConceptTitle={currentStep.title}
              focusMode={focusMode}
              onToggleFocusMode={() => setFocusMode(!focusMode)}
              isPaused={isPaused}
              onTogglePause={handleTogglePause}
              language={lesson.language}
            />

            {/* Subtitle / Teleprompter Banner at bottom of avatar */}
            {speakingText && (
              <div className="absolute bottom-12 left-4 right-4 z-20 pointer-events-none">
                <div className="p-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl text-xs text-slate-100 leading-relaxed shadow-xl max-h-24 overflow-y-auto">
                  <p className="font-medium">{speakingText}</p>
                </div>
              </div>
            )}

            {/* Live Student Voice Recognition Indicator */}
            {isListening && (
              <div className="absolute top-16 left-4 right-4 z-30 pointer-events-none animate-pulse">
                <div className="p-3 bg-emerald-950/90 backdrop-blur-md border border-emerald-500 rounded-2xl text-xs text-emerald-100 flex items-center gap-2.5 shadow-2xl">
                  <Radio className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
                  <div>
                    <span className="font-extrabold text-emerald-400">Hearing speech: </span>
                    <span className="italic">{interimTranscript || 'Speak your question or answer clearly...'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right (5 cols): Interactive Classroom Whiteboard & Slide Panel */}
        <div className={`lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col h-full overflow-hidden ${mobileView === 'avatar' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Mobile Back to Avatar bar */}
          <div className="lg:hidden px-4 py-2 bg-navy-900 text-white flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
              Whiteboard & Lesson Notes
            </span>
            <button
              type="button"
              onClick={() => setMobileView('avatar')}
              className="px-2.5 py-1 bg-teal-500 text-slate-950 rounded-lg font-bold text-[11px]"
            >
              ← 3D Teacher
            </button>
          </div>
          {/* Whiteboard Tab Switcher */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveBoardTab('whiteboard')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeBoardTab === 'whiteboard'
                    ? 'bg-white text-navy-900 shadow-2xs border border-gray-200'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                <span>Class Whiteboard</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveBoardTab('transcript')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeBoardTab === 'transcript'
                    ? 'bg-white text-navy-900 shadow-2xs border border-gray-200'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>Live Q&A Transcript</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveLessonToNotes}
              className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center gap-1"
              title="Save current whiteboard to My Notes"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{savedNoteBanner ? '✓ Saved!' : 'Save Notes'}</span>
            </button>
          </div>

          {/* Whiteboard Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {activeBoardTab === 'whiteboard' ? (
              <div className="space-y-4">
                {/* Active Phase Badge & Title */}
                <div className="border-b border-gray-100 pb-3">
                  <span className="text-[10px] font-extrabold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                    Phase {currentStepIndex + 1} of {lesson.totalSteps}
                  </span>
                  <h3 className="text-base font-extrabold text-navy-900 mt-1">{currentStep.title}</h3>
                </div>

                {/* Whiteboard Core Notes */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    Whiteboard Teaching Points:
                  </h4>
                  <ul className="space-y-2">
                    {currentStep.whiteboardNotes.map((note, nIdx) => (
                      <li key={nIdx} className="text-xs sm:text-sm text-gray-800 flex items-start gap-2.5 leading-relaxed">
                        <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {nIdx + 1}
                        </span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Clinical Pearl Box */}
                {currentStep.pearl && (
                  <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl flex items-start gap-2.5 shadow-2xs">
                    <Lightbulb className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-teal-900 mb-0.5">Professor's Clinical Pearl:</p>
                      <p className="text-xs text-teal-800 leading-relaxed">{currentStep.pearl}</p>
                    </div>
                  </div>
                )}

                {/* Interactive Checkpoint Question (Step 4) */}
                {currentStep.checkQuestion && (
                  <div className="p-4 bg-navy-900 text-white rounded-2xl space-y-3 shadow-md">
                    <div className="flex items-center gap-2 text-teal-300 text-xs font-bold">
                      <Award className="w-4 h-4" />
                      <span>Oral Viva / Checkpoint Challenge</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                      {currentStep.checkQuestion.question}
                    </p>

                    {/* Options Buttons */}
                    <div className="space-y-1.5">
                      {currentStep.checkQuestion.options.map((opt, oIdx) => {
                        const optLetter = String.fromCharCode(65 + oIdx);
                        const isChosen = selectedOption === opt;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleSelectOption(opt)}
                            className={`w-full p-2.5 text-left rounded-xl text-xs font-medium transition flex items-center gap-2.5 border ${
                              isChosen
                                ? 'bg-teal-600 border-teal-400 text-white shadow-sm'
                                : 'bg-navy-800/80 hover:bg-navy-700/80 border-navy-700 text-slate-200'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center font-bold text-[10px]">
                              {optLetter}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Feedback Alert */}
                    {checkFeedback && (
                      <div className="p-3 rounded-xl bg-teal-950/80 border border-teal-500/80 text-teal-200 text-xs leading-relaxed animate-fade-in">
                        {checkFeedback}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Q&A / Dialogue Transcript Tab */
              <div className="space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === 'student' ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-gray-400 mb-0.5 px-1 font-bold">
                      {msg.sender === 'student' ? 'You' : 'Prof. Sterling'} · {msg.time}
                    </span>
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-2xs ${
                        msg.sender === 'student'
                          ? 'bg-navy-900 text-white rounded-tr-xs'
                          : 'bg-slate-100 text-gray-900 rounded-tl-xs border border-gray-200/80'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isEvaluating && (
                  <div className="flex items-center gap-2 text-xs text-teal-700 italic p-2">
                    <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <span>Professor is evaluating your answer...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          BOTTOM CLASSROOM CONTROL DECK
         ──────────────────────────────────────────────────────── */}
      <div className="pt-2 pb-1 border-t border-gray-200 flex-shrink-0 bg-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Main Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 🎤 Voice Ask Button */}
            <button
              type="button"
              onClick={handleToggleStudentVoice}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              }`}
              title="Speak a question to the AI teacher"
            >
              {isListening ? <Square className="w-3.5 h-3.5 fill-white" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{isListening ? 'Stop (Send Voice)' : 'Ask Teacher by Voice'}</span>
            </button>

            {/* ⏸ Pause / Resume */}
            <button
              type="button"
              onClick={handleTogglePause}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
              title={isPaused ? 'Resume class lecture' : 'Pause teacher speaking'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-teal-600" /> : <Pause className="w-3.5 h-3.5 text-gray-600" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            {/* 🔁 Repeat Concept */}
            <button
              type="button"
              onClick={handleRepeatStep}
              className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs transition flex items-center gap-1.5 shadow-2xs"
              title="Repeat current explanation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
              <span>Repeat Concept</span>
            </button>

            {/* ⏭ Next Step */}
            {currentStepIndex < lesson.totalSteps - 1 && (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
                title="Proceed to next lesson phase"
              >
                <span>Next Concept</span>
                <SkipForward className="w-3.5 h-3.5 text-teal-400" />
              </button>
            )}
          </div>

          {/* Quick Typed Q&A Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (typedQuestion.trim()) {
                handleSendStudentInquiry(typedQuestion.trim());
              }
            }}
            className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:max-w-md"
          >
            <input
              type="text"
              value={typedQuestion}
              onChange={(e) => setTypedQuestion(e.target.value)}
              placeholder="Type a clinical question to professor..."
              className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={!typedQuestion.trim() || isEvaluating}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1 flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
