import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Pin,
  Star,
  Trash2,
  Sparkles,
  Layers,
  CheckCircle2,
  Save,
} from 'lucide-react';
import learningService from '../../services/learningService';
import type { StudyNote, MedicalSubject } from '../../types';

export default function NotesPage() {
  // const navigate = useNavigate();
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [subjects, setSubjects] = useState<MedicalSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Note editor / modal state
  const [activeNote, setActiveNote] = useState<StudyNote | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorSubject, setEditorSubject] = useState('General Medicine');
  const [editorTopic, setEditorTopic] = useState('');
  const [editorTags, setEditorTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // AI Action in-progress state
  const [aiActionInProgress, setAiActionInProgress] = useState<string | null>(null);
  const [aiResultNotice, setAiResultNotice] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, [selectedSubject]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const [subjRes, notesRes] = await Promise.all([
        learningService.getSubjects(),
        learningService.getNotes(selectedSubject === 'ALL' ? undefined : { subject: selectedSubject }),
      ]);
      setSubjects(subjRes);
      setNotes(notesRes);
      if (notesRes.length > 0 && !activeNote && !isCreatingNew) {
        setActiveNote(notesRes[0]);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectNote = (note: StudyNote) => {
    setActiveNote(note);
    setIsCreatingNew(false);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorSubject(note.subject);
    setEditorTopic(note.topic || '');
    setEditorTags(note.tags || '');
    setAiResultNotice(null);
  };

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setActiveNote(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorSubject(subjects[0]?.name || 'General Medicine');
    setEditorTopic('');
    setEditorTags('');
    setAiResultNotice(null);
  };

  const handleSaveNote = async () => {
    if (!editorTitle.trim() || !editorContent.trim()) return;
    try {
      setIsSaving(true);
      if (isCreatingNew) {
        const created = await learningService.createNote({
          title: editorTitle,
          content: editorContent,
          subject: editorSubject,
          topic: editorTopic || undefined,
          tags: editorTags || undefined,
          sourceType: 'PERSONAL',
        });
        setNotes([created, ...notes]);
        setActiveNote(created);
        setIsCreatingNew(false);
      } else if (activeNote) {
        const updated = await learningService.updateNote(activeNote.id, {
          title: editorTitle,
          content: editorContent,
          subject: editorSubject,
          topic: editorTopic || undefined,
          tags: editorTags || undefined,
        });
        setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));
        setActiveNote(updated);
      }
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this study note?')) return;
    try {
      await learningService.deleteNote(id);
      const remaining = notes.filter((n) => n.id !== id);
      setNotes(remaining);
      if (activeNote?.id === id) {
        setActiveNote(remaining[0] || null);
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleTogglePin = async (note: StudyNote) => {
    try {
      const updated = await learningService.updateNote(note.id, { isPinned: !note.isPinned });
      setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));
      if (activeNote?.id === note.id) setActiveNote(updated);
    } catch (err) {
      console.error('Pin toggle failed:', err);
    }
  };

  const handleToggleFavorite = async (note: StudyNote) => {
    try {
      const updated = await learningService.updateNote(note.id, { isFavorite: !note.isFavorite });
      setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));
      if (activeNote?.id === note.id) setActiveNote(updated);
    } catch (err) {
      console.error('Favorite toggle failed:', err);
    }
  };

  const handleAIAction = async (action: 'improve' | 'summarize' | 'explain' | 'flashcards' | 'mcqs') => {
    if (!activeNote) return;
    try {
      setAiActionInProgress(action);
      setAiResultNotice(null);
      const res = await learningService.performNoteAIAction(activeNote.id, action);

      if (action === 'improve' && res.improvedContent) {
        setEditorContent(res.improvedContent);
        setAiResultNotice('Note enhanced with structured medical terminology!');
      } else if (action === 'summarize' && res.summary) {
        setAiResultNotice(`Executive Summary: ${res.summary}`);
      } else if (action === 'explain' && res.explanation) {
        setAiResultNotice(`Simplified Explanation: ${res.explanation}`);
      } else if (action === 'flashcards' && res.deck) {
        setAiResultNotice(`Created Flashcard Deck with ${res.deck.cards?.length || 5} cards!`);
      } else if (action === 'mcqs' && res.bank) {
        setAiResultNotice(`Created Question Bank with ${res.bank.questions?.length || 5} MCQs!`);
      }
    } catch (err) {
      console.error('AI action failed:', err);
    } finally {
      setAiActionInProgress(null);
    }
  };

  const filteredNotes = notes.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.subject.toLowerCase().includes(q) ||
      (n.topic && n.topic.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/learning" className="text-xs text-gray-500 hover:text-teal-700">
              Learning Hub
            </Link>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-xs font-semibold text-purple-800">My Smart Notes</span>
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            Smart Medical Notes
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Organize personal study notes, lecture summaries, and high-yield clinical pearls.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Create New Note
        </button>
      </div>

      {/* Main Split Layout: Notes List on Left, Active Editor on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* Left Column (4 cols): Notes Browser */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-4 flex flex-col shadow-2xs">
          {/* Search & Subject Filter */}
          <div className="space-y-2 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
                Loading notes...
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs">No study notes found.</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`p-3 rounded-xl border transition cursor-pointer text-left ${
                    activeNote?.id === note.id && !isCreatingNew
                      ? 'border-purple-500 bg-purple-50/50 shadow-2xs'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                      {note.subject}
                    </span>
                    <div className="flex items-center gap-1 text-gray-400">
                      {note.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                      {note.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{note.title}</h4>
                  <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{note.content}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2">
                    <span className="capitalize">{note.sourceType.toLowerCase().replace('_', ' ')}</span>
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column (8 cols): Note Editor & AI Enhancements */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 p-6 flex flex-col shadow-2xs">
          {/* Top Note Metadata / Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-200 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-md">
                {isCreatingNew ? 'New Note' : activeNote?.sourceType || 'Personal Note'}
              </span>
              {activeNote && !isCreatingNew && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTogglePin(activeNote)}
                    className={`p-1.5 rounded-lg border transition ${
                      activeNote.isPinned
                        ? 'border-amber-400 bg-amber-50 text-amber-600'
                        : 'border-gray-200 text-gray-400 hover:text-gray-600'
                    }`}
                    title={activeNote.isPinned ? 'Unpin' : 'Pin to top'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleFavorite(activeNote)}
                    className={`p-1.5 rounded-lg border transition ${
                      activeNote.isFavorite
                        ? 'border-amber-400 bg-amber-50 text-amber-600'
                        : 'border-gray-200 text-gray-400 hover:text-gray-600'
                    }`}
                    title={activeNote.isFavorite ? 'Unfavorite' : 'Add to favorites'}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveNote}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Note'}</span>
              </button>
            </div>
          </div>

          {/* AI Enhancement Action Chips */}
          {activeNote && !isCreatingNew && (
            <div className="mb-4 p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  AI Study Assistant Actions
                </span>
                {aiActionInProgress && (
                  <span className="text-[10px] text-purple-700 animate-pulse font-medium">
                    Processing AI action...
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => handleAIAction('improve')}
                  disabled={!!aiActionInProgress}
                  className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold transition"
                >
                  Improve Terminology
                </button>
                <button
                  onClick={() => handleAIAction('summarize')}
                  disabled={!!aiActionInProgress}
                  className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold transition"
                >
                  Summarize
                </button>
                <button
                  onClick={() => handleAIAction('explain')}
                  disabled={!!aiActionInProgress}
                  className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold transition"
                >
                  Explain Simply
                </button>
                <button
                  onClick={() => handleAIAction('flashcards')}
                  disabled={!!aiActionInProgress}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                >
                  <Layers className="w-3 h-3" /> Make Flashcards
                </button>
                <button
                  onClick={() => handleAIAction('mcqs')}
                  disabled={!!aiActionInProgress}
                  className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" /> Generate MCQs
                </button>
              </div>

              {aiResultNotice && (
                <div className="mt-2 p-2 bg-white rounded-lg border border-purple-200 text-xs text-purple-950 font-medium">
                  {aiResultNotice}
                </div>
              )}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3 flex-1 flex flex-col">
            <input
              type="text"
              value={editorTitle}
              onChange={(e) => setEditorTitle(e.target.value)}
              placeholder="Note Title (e.g. Action Potential Phases in Ventricular Myocytes)"
              className="w-full text-base sm:text-lg font-bold text-gray-900 border-0 border-b border-gray-200 pb-2 focus:ring-0 focus:outline-none focus:border-purple-500"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={editorSubject}
                onChange={(e) => setEditorSubject(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={editorTopic}
                onChange={(e) => setEditorTopic(e.target.value)}
                placeholder="Topic (optional)"
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
              />
              <input
                type="text"
                value={editorTags}
                onChange={(e) => setEditorTags(e.target.value)}
                placeholder="Tags: exam, high-yield, pharma"
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none"
              />
            </div>

            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              placeholder="Write your clinical notes here... Markdown formatting supported."
              className="flex-1 w-full p-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none min-h-[300px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
