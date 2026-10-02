import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  ArrowLeft,
  FileText,
  History,
  RotateCcw,
  Download,
  Bot,
  Lightbulb,
  Key,
  AlertTriangle,
  CheckSquare,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  Table,
  Send,
  X,
  ExternalLink,
  Archive,
  Zap,
  RefreshCw
} from 'lucide-react';
import learningService from '../../services/learningService';
import type { StudyNote, MedicalSubject, StudyMaterial, NoteType } from '../../types';

// Supported Note Types Metadata
const NOTE_TYPES_META: Record<string, { label: string; badgeClass: string; icon: string }> = {
  PERSONAL: { label: 'Personal', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '📝' },
  MATERIAL_BASED: { label: 'Material Based', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200', icon: '📄' },
  AI_GENERATED: { label: 'AI Generated', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', icon: '✨' },
  VIVA: { label: 'Viva Note', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', icon: '🎙️' },
  CLINICAL: { label: 'Clinical Concept', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', icon: '🩺' }
};

// Common Quick Tags
const QUICK_TAGS = ['#high-yield', '#exam', '#viva', '#clinical', '#formula', '#revision', '#important', '#weak-topic'];

export default function NotesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialNoteId = searchParams.get('noteId');

  // Notes Library State
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [subjects, setSubjects] = useState<MedicalSubject[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<'recently_updated' | 'recently_created' | 'alphabetical'>('recently_updated');

  // Active Editor State
  const [activeNote, setActiveNote] = useState<StudyNote | null>(null);
  const [isMobileEditorOpen, setIsMobileEditorOpen] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorSubject, setEditorSubject] = useState('Physiology');
  const [editorTopic, setEditorTopic] = useState('');
  const [editorTags, setEditorTags] = useState('');
  const [editorNoteType, setEditorNoteType] = useState<NoteType>('PERSONAL');
  const [editorMaterialId, setEditorMaterialId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');

  // Autosave State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimerRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Selection AI Toolbar State
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; left: number } | null>(null);

  // AI Assistant Drawer / Action State
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiActionInProgress, setAiActionInProgress] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<{ type: 'success' | 'info' | 'error'; message: string; details?: string } | null>(null);
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isAiChatThinking, setIsAiChatThinking] = useState(false);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isAskMyNotesModalOpen, setIsAskMyNotesModalOpen] = useState(false);
  const [isOrganizePreviewOpen, setIsOrganizePreviewOpen] = useState(false);
  const [organizedContentPreview, setOrganizedContentPreview] = useState('');
  const [isMcqModalOpen, setIsMcqModalOpen] = useState(false);
  const [mcqCount, setMcqCount] = useState<number>(5);
  const [mcqDifficulty, setMcqDifficulty] = useState<string>('medium');

  // Ask My Notes State
  const [askMyNotesQuery, setAskMyNotesQuery] = useState('');
  const [askMyNotesResult, setAskMyNotesResult] = useState<{ answer: string; matchedNotes: any[] } | null>(null);
  const [isSearchingNotes, setIsSearchingNotes] = useState(false);

  // Create Note Form State
  const [createMode, setCreateMode] = useState<'blank' | 'material' | 'ai_topic' | 'clinical'>('blank');
  const [newNoteSubject, setNewNoteSubject] = useState('Physiology');
  const [newNoteTopic, setNewNoteTopic] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteMaterialId, setNewNoteMaterialId] = useState<string>('');
  const [newNoteAiStyle, setNewNoteAiStyle] = useState<'HIGH_YIELD' | 'DETAILED' | 'VIVA_FOCUSED' | 'QUICK'>('HIGH_YIELD');
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<StudyNote | null>(null);

  // 1. Initial Data Fetch
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [subjsRes, matsRes] = await Promise.all([
        learningService.getSubjects(),
        learningService.getMaterials().catch(() => [])
      ]);
      setSubjects(subjsRes);
      setMaterials(matsRes);
      await loadNotesList();
    } catch (err) {
      console.error('Failed to load initial notes data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotesList = async (targetNoteIdToSelect?: string) => {
    try {
      const notesList = await learningService.getNotes({
        subject: selectedSubject === 'ALL' ? undefined : selectedSubject,
        noteType: selectedTypeFilter === 'ALL' ? undefined : selectedTypeFilter,
        isArchived: showArchived,
        sortBy
      });
      setNotes(notesList);

      // Select active note
      const toSelectId = targetNoteIdToSelect || initialNoteId;
      if (toSelectId) {
        const found = notesList.find(n => n.id === toSelectId);
        if (found) {
          await openNoteDetail(found.id);
          return;
        }
      }

      if (notesList.length > 0 && !activeNote) {
        await openNoteDetail(notesList[0].id);
      }
    } catch (err) {
      console.error('Failed to load notes list:', err);
    }
  };

  useEffect(() => {
    loadNotesList();
  }, [selectedSubject, selectedTypeFilter, showArchived, sortBy]);

  // 2. Open Note Detail
  const openNoteDetail = async (noteId: string) => {
    try {
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      const fullNote = await learningService.getNote(noteId);
      setActiveNote(fullNote);
      setEditorTitle(fullNote.title);
      setEditorContent(fullNote.content);
      setEditorSubject(fullNote.subject);
      setEditorTopic(fullNote.topic || '');
      setEditorTags(fullNote.tags || '');
      setEditorNoteType(fullNote.noteType || 'PERSONAL');
      setEditorMaterialId(fullNote.materialId || null);
      setAiNotice(null);
      setAiChatMessages([]);
      setSelectedText('');
      setSelectionPosition(null);
      setIsMobileEditorOpen(true);
    } catch (err) {
      console.error('Failed to fetch full note:', err);
    }
  };

  // 3. Debounced Autosave Engine
  useEffect(() => {
    if (!activeNote) return;

    // Check if content actually differs from current saved note
    const isDirty =
      editorTitle !== activeNote.title ||
      editorContent !== activeNote.content ||
      editorSubject !== activeNote.subject ||
      editorTopic !== (activeNote.topic || '') ||
      editorTags !== (activeNote.tags || '') ||
      editorNoteType !== activeNote.noteType;

    if (!isDirty) {
      return;
    }

    setSaveStatus('unsaved');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      triggerSave(false);
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [editorTitle, editorContent, editorSubject, editorTopic, editorTags, editorNoteType]);

  const triggerSave = async (manual = false, createVersionSnapshot = false) => {
    if (!activeNote || !editorTitle.trim()) return;

    try {
      setSaveStatus('saving');
      const updated = await learningService.updateNote(activeNote.id, {
        title: editorTitle.trim(),
        content: editorContent,
        subject: editorSubject,
        topic: editorTopic.trim() || undefined,
        tags: editorTags.trim() || undefined,
        noteType: editorNoteType,
        createVersionSnapshot,
        expectedVersion: activeNote.version
      });

      setActiveNote(prev => prev ? { ...prev, ...updated, versions: updated.versions || prev.versions } : updated);
      setNotes(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n));
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setLastSavedAt(new Date());

      if (manual && createVersionSnapshot) {
        setAiNotice({ type: 'success', message: `Saved version ${updated.version} successfully!` });
      }
    } catch (err) {
      console.error('Auto-save error:', err);
      setSaveStatus('error');
    }
  };

  // 4. Text Selection Detection for Selection-Based AI Menu
  const handleEditorSelect = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end && end - start > 3) {
      const selected = textarea.value.substring(start, end).trim();
      setSelectedText(selected);
      const rect = textarea.getBoundingClientRect();
      setSelectionPosition({
        top: Math.max(70, rect.top - 46),
        left: Math.min(window.innerWidth - 260, Math.max(20, rect.left + 20))
      });
    } else {
      setSelectedText('');
      setSelectionPosition(null);
    }
  };

  // 5. Rich Markdown Formatting Helpers
  const insertFormatting = (prefix: string, suffix = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.substring(start, end) || placeholder;

    const replacement = `${prefix}${selected}${suffix}`;
    const newContent = current.substring(0, start) + replacement + current.substring(end);

    setEditorContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 50);
  };

  const insertMedicalCallout = (type: 'clinical' | 'keypoint' | 'definition' | 'formula' | 'highyield' | 'warning') => {
    let calloutText = '';
    switch (type) {
      case 'clinical':
        calloutText = '\n> 💡 **Clinical Pearl:** Enter bedside clinical observation, hallmark sign, or high-risk pitfall here.\n\n';
        break;
      case 'keypoint':
        calloutText = '\n> 🔑 **Key Concept:** Essential physiological mechanism or diagnostic cornerstone.\n\n';
        break;
      case 'definition':
        calloutText = '\n> 📖 **Definition:** Formal medical definition and standard physiological parameters.\n\n';
        break;
      case 'formula':
        calloutText = '\n> 📐 **Formula & Calculation:**\n> `Value = Metric A × Metric B`\n> *Units & Clinical reference range:*\n\n';
        break;
      case 'highyield':
        calloutText = '\n> ⭐ **High-Yield Exam Fact:** Classic board buzzword, pathognomonic finding, or first-line treatment.\n\n';
        break;
      case 'warning':
        calloutText = '\n> ⚠️ **Important Caution:** Contraindication, critical drug interaction, or red-flag symptom.\n\n';
        break;
    }
    insertFormatting(calloutText);
  };

  const insertTable = () => {
    const tableTemplate = `\n| Concept / Parameter | Physiological Feature | Clinical Relevance |\n| :--- | :--- | :--- |\n| Feature A | Normal Mechanism | Baseline State |\n| Feature B | Pathological State | Diagnostic Marker |\n\n`;
    insertFormatting(tableTemplate);
  };


  // 6. AI Actions Execution (Full Note or Selected Text)
  const handleAIAction = async (action: string, customPrompt?: string) => {
    if (!activeNote) return;

    try {
      setAiActionInProgress(action);
      setAiNotice(null);

      const targetText = selectedText || undefined;
      const res = await learningService.performNoteAIAction(activeNote.id, action, {
        selectedText: targetText,
        customPrompt
      });

      if (action === 'create_flashcards' || action === 'flashcards') {
        setAiNotice({
          type: 'success',
          message: res.message || 'Created flashcards from this note!',
          details: 'Flashcards are linked to your knowledge base.'
        });
        await loadNotesList(activeNote.id);
      } else if (action === 'create_mcqs' || action === 'mcqs') {
        setAiNotice({
          type: 'success',
          message: res.message || 'Generated MCQs from this note!',
          details: 'Practice questions are ready in MCQ bank.'
        });
        await loadNotesList(activeNote.id);
      } else if (action === 'organize_with_ai') {
        setOrganizedContentPreview(res.resultText || res.improvedContent);
        setIsOrganizePreviewOpen(true);
      } else if (res.resultText) {
        if (selectedText) {
          // If action was on selected text, offer to insert or view
          setAiNotice({
            type: 'info',
            message: `AI Output for: "${selectedText.slice(0, 30)}..."`,
            details: res.resultText
          });
        } else if (action === 'improve' || action === 'improve_terminology') {
          setEditorContent(res.resultText);
          setAiNotice({ type: 'success', message: 'Medical terminology and structure enhanced!' });
        } else {
          setAiNotice({
            type: 'info',
            message: `AI ${action.replace(/_/g, ' ').toUpperCase()}:`,
            details: res.resultText
          });
        }
      }
    } catch (err: any) {
      console.error('AI action failed:', err);
      setAiNotice({ type: 'error', message: err.response?.data?.error || 'AI action encountered an issue.' });
    } finally {
      setAiActionInProgress(null);
    }
  };

  // 7. Interactive Note Chat
  const handleSendAiChat = async () => {
    if (!aiChatInput.trim() || !activeNote) return;

    const userMsg = aiChatInput.trim();
    setAiChatInput('');
    setAiChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAiChatThinking(true);

    try {
      const res = await learningService.performNoteAIAction(activeNote.id, 'ask_ai', {
        customPrompt: userMsg,
        selectedText: selectedText || undefined
      });
      setAiChatMessages(prev => [...prev, { role: 'assistant', text: res.resultText || 'I reviewed your note.' }]);
    } catch (err: any) {
      setAiChatMessages(prev => [...prev, { role: 'assistant', text: 'Error contacting clinical AI tutor.' }]);
    } finally {
      setIsAiChatThinking(false);
    }
  };

  // 8. Global "Ask My Notes" Search
  const handleAskMyNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askMyNotesQuery.trim()) return;

    try {
      setIsSearchingNotes(true);
      const res = await learningService.askMyNotes(askMyNotesQuery.trim());
      setAskMyNotesResult(res);
    } catch (err) {
      console.error('Error in ask my notes:', err);
    } finally {
      setIsSearchingNotes(false);
    }
  };

  // 9. Create Note Workflow (Blank / From Material / AI Generated)
  const handleOpenCreateModal = (mode: 'blank' | 'material' | 'ai_topic' | 'clinical' = 'blank') => {
    setCreateMode(mode);
    setNewNoteSubject(selectedSubject !== 'ALL' ? selectedSubject : (subjects[0]?.name || 'Physiology'));
    setNewNoteTopic('');
    setNewNoteTitle('');
    setNewNoteMaterialId(materials[0]?.id || '');
    setDuplicateWarning(null);
    setIsCreateModalOpen(true);
  };

  const handleExecuteCreateNote = async () => {
    if (!newNoteTitle.trim() && createMode === 'blank') return;

    try {
      setIsGeneratingNote(true);

      // Check duplicate title/topic
      const dup = await learningService.checkDuplicateNote(newNoteTitle || newNoteTopic, newNoteTopic);
      if (dup.exists && dup.existingNote && !duplicateWarning) {
        setDuplicateWarning(dup.existingNote);
        setIsGeneratingNote(false);
        return;
      }

      let title = newNoteTitle.trim();
      let content = '';
      let noteType: NoteType = 'PERSONAL';
      let materialId: string | undefined = undefined;

      if (createMode === 'blank') {
        noteType = 'PERSONAL';
        content = `# ${title}\n\n## 1. Overview\nStart writing your personal medical notes here...\n\n> 💡 **Clinical Pearl:** Add high-yield facts.\n`;
      } else if (createMode === 'material') {
        noteType = 'MATERIAL_BASED';
        materialId = newNoteMaterialId;
        const mat = materials.find(m => m.id === newNoteMaterialId);
        title = title || `${mat?.title || 'Lecture'} — Core Study Notes`;
        content = `# ${title}\n\n*Grounded in lecture material: ${mat?.title || 'Uploaded Document'}*\n\n## 1. Primary Objectives\n- Core mechanisms discussed in lecture\n- Diagnostic markers & thresholds\n\n## 2. High-Yield Mechanisms\n\n> 🔑 **Key Concept:** Essential points extracted from ${mat?.title}.\n`;
      } else if (createMode === 'ai_topic') {
        noteType = 'AI_GENERATED';
        title = title || `${newNoteTopic} — High-Yield Review`;
        content = `# ${title}\n\n## 1. Conceptual Framework & Physiology\nDetailed overview of ${newNoteTopic} in ${newNoteSubject}.\n\n## 2. Hemodynamics & Mechanisms\n\n> 💡 **Clinical Pearl:** Key points to remember for exams.\n\n## 3. High-Yield Exam Facts\n- Core diagnostic criteria\n- Classic clinical presentation\n`;
      } else if (createMode === 'clinical') {
        noteType = 'CLINICAL';
        title = title || `Clinical Approach: ${newNoteTopic || 'Acute Presentation'}`;
        content = `# ${title}\n\n## 1. Clinical Presentation & Red Flags\n- Initial triage & stabilization\n- High-risk symptoms\n\n## 2. Diagnostic Workup\n- First-line investigations (ECG, Labs, Imaging)\n- Differential diagnosis hierarchy\n\n> ⚠️ **Important Caution:** Immediate life threats to exclude first.\n`;
      }

      const created = await learningService.createNote({
        title,
        content,
        subject: newNoteSubject,
        topic: newNoteTopic || undefined,
        noteType,
        materialId,
        tags: createMode === 'ai_topic' ? ("#high-yield, #" + newNoteAiStyle.toLowerCase() + ", #ai-generated") : (createMode === 'clinical' ? '#clinical, #exam' : '#lecture-note')
      });

      setIsCreateModalOpen(false);
      await loadNotesList(created.id);
    } catch (err: any) {
      console.error('Error creating note:', err);
      alert('Failed to create note: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsGeneratingNote(false);
    }
  };

  // 10. Restore Version
  const handleRestoreVersion = async (versionNumber: number) => {
    if (!activeNote) return;
    try {
      const restored = await learningService.restoreNoteVersion(activeNote.id, versionNumber);
      setActiveNote(restored);
      setEditorTitle(restored.title);
      setEditorContent(restored.content);
      setIsVersionModalOpen(false);
      setAiNotice({ type: 'success', message: `Restored Version ${versionNumber} successfully!` });
      await loadNotesList(restored.id);
    } catch (err) {
      console.error('Restore error:', err);
    }
  };

  // 11. Delete Note
  const handleDeleteNote = async () => {
    if (!activeNote) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${activeNote.title}"?`)) return;

    try {
      await learningService.deleteNote(activeNote.id);
      setActiveNote(null);
      setIsMobileEditorOpen(false);
      await loadNotesList();
    } catch (err) {
      console.error('Delete note failed:', err);
    }
  };

  // 12. Export Note
  const handleExport = (format: 'md' | 'txt') => {
    if (!activeNote) return;
    const blob = new Blob([editorContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeNote.title.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtered Notes List
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        (n.topic && n.topic.toLowerCase().includes(q)) ||
        n.subject.toLowerCase().includes(q) ||
        (n.tags && n.tags.toLowerCase().includes(q))
      );
    });
  }, [notes, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 min-h-[calc(100vh-4rem)]">
      {/* Top Workspace Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link to="/learning" className="hover:text-purple-600 transition">Learning Hub</Link>
            <span>/</span>
            <span className="text-purple-700 font-bold flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              Smart Medical Notes
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight flex items-center gap-2.5">
            Medical Knowledge Workspace
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 hidden sm:inline-flex">
              Grounded AI
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Connected knowledge layer: Lecture notes, AI synthesis, Flashcards, MCQs, and Viva.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Ask My Notes AI Button */}
          <button
            onClick={() => setIsAskMyNotesModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-2xs"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Ask My Notes</span>
          </button>

          {/* Create Note Dropdown / Button */}
          <div className="relative group">
            <button
              onClick={() => handleOpenCreateModal('blank')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Note</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[720px]">
        {/* Left Column (4 cols): Notes Library Browser */}
        <aside
          className={`lg:col-span-4 bg-white rounded-3xl border border-slate-200/90 p-4 flex flex-col shadow-xs ${
            isMobileEditorOpen ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search title, concept, tag..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none transition"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs: All, Personal, Material, AI, Viva, Clinical */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 text-[11px] no-scrollbar">
            {['ALL', 'PERSONAL', 'MATERIAL_BASED', 'AI_GENERATED', 'VIVA', 'CLINICAL'].map(typeKey => (
              <button
                key={typeKey}
                onClick={() => setSelectedTypeFilter(typeKey)}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition ${
                  selectedTypeFilter === typeKey
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {typeKey === 'ALL' ? 'All Types' : NOTE_TYPES_META[typeKey]?.label || typeKey}
              </button>
            ))}
          </div>

          {/* Subject & Sort Selector Bar */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="recently_updated">Recently Updated</option>
              <option value="recently_created">Recently Created</option>
              <option value="alphabetical">Alphabetical (A-Z)</option>
            </select>
          </div>

          {/* Notes List Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[580px]">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                <span>Loading medical knowledge base...</span>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-bold text-slate-700">No notes found</p>
                <p className="text-[11px] text-slate-500 mt-1">Start by creating a note from lecture material or AI.</p>
                <button
                  onClick={() => handleOpenCreateModal('blank')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold shadow-2xs hover:bg-purple-700 transition"
                >
                  + Create First Note
                </button>
              </div>
            ) : (
              filteredNotes.map(n => {
                const isActive = activeNote?.id === n.id;
                const typeMeta = NOTE_TYPES_META[n.noteType || 'PERSONAL'] || NOTE_TYPES_META.PERSONAL;

                return (
                  <div
                    key={n.id}
                    onClick={() => openNoteDetail(n.id)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer text-left relative group ${
                      isActive
                        ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-400/20 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeMeta.badgeClass}`}>
                          {typeMeta.label}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                          {n.subject}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {n.isPinned && <Pin className="w-3.5 h-3.5 text-purple-600 fill-purple-600" />}
                        {n.isFavorite && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                      </div>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-navy-900 line-clamp-1 group-hover:text-purple-700 transition">
                      {n.title}
                    </h4>

                    {n.summary && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                        {n.summary.replace(/###/g, '').replace(/\*\*/g, '')}
                      </p>
                    )}

                    {/* Source material indicator */}
                    {n.material && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] text-teal-700 font-medium bg-teal-50/80 px-2 py-0.5 rounded-md border border-teal-100">
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{n.material.title}</span>
                      </div>
                    )}

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{n.wordCount || 0} words • {n.readingTime || 1}m read</span>
                      <span>v{n.version || 1} • {new Date(n.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Archive Toggle Button */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-[11px] font-bold text-slate-500 hover:text-purple-600 flex items-center gap-1 transition"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{showArchived ? 'Hide Archived' : 'Show Archived Notes'}</span>
            </button>
            <span className="text-[10px] text-slate-400">{filteredNotes.length} notes</span>
          </div>
        </aside>

        {/* Right Column (8 cols): Modern Medical Note Editor Workspace */}
        <main
          className={`lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 flex flex-col shadow-xs overflow-hidden ${
            isMobileEditorOpen ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {activeNote ? (
            <div className="flex-1 flex flex-col h-full">
              {/* Note Header & Save Status Bar */}
              <div className="p-3.5 sm:p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setIsMobileEditorOpen(false)}
                      className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                      title="Back to notes list"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    {/* Note Type Pill */}
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border whitespace-nowrap ${
                      NOTE_TYPES_META[editorNoteType]?.badgeClass || 'bg-slate-100 text-slate-700'
                    }`}>
                      {NOTE_TYPES_META[editorNoteType]?.icon} {NOTE_TYPES_META[editorNoteType]?.label}
                    </span>

                    {/* Autosave Indicator */}
                    <div className="flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs">
                      {saveStatus === 'saved' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-emerald-700">Saved</span>
                          {lastSavedAt && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          )}
                        </>
                      )}
                      {saveStatus === 'saving' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          <span className="text-amber-700">Saving...</span>
                        </>
                      )}
                      {saveStatus === 'unsaved' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span className="text-slate-500">Unsaved changes</span>
                        </>
                      )}
                      {saveStatus === 'error' && (
                        <>
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="text-rose-600">Save failed</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Header Actions: Version, Pin, Star, Export, Delete */}
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {/* Version History Button */}
                    <button
                      onClick={() => setIsVersionModalOpen(true)}
                      className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-700 text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                      title="Version History"
                    >
                      <History className="w-3.5 h-3.5 text-purple-600" />
                      <span>v{activeNote.version || 1}</span>
                    </button>

                    {/* Pin Toggle */}
                    <button
                      onClick={() => {
                        const newPinned = !activeNote.isPinned;
                        learningService.updateNote(activeNote.id, { isPinned: newPinned });
                        setActiveNote({ ...activeNote, isPinned: newPinned });
                        setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, isPinned: newPinned } : n));
                      }}
                      className={`p-2 rounded-xl border transition ${
                        activeNote.isPinned
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                      }`}
                      title={activeNote.isPinned ? 'Unpin' : 'Pin Note'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>

                    {/* Favorite Toggle */}
                    <button
                      onClick={() => {
                        const newFav = !activeNote.isFavorite;
                        learningService.updateNote(activeNote.id, { isFavorite: newFav });
                        setActiveNote({ ...activeNote, isFavorite: newFav });
                        setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, isFavorite: newFav } : n));
                      }}
                      className={`p-2 rounded-xl border transition ${
                        activeNote.isFavorite
                          ? 'bg-amber-50 border-amber-300 text-amber-500'
                          : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                      }`}
                      title={activeNote.isFavorite ? 'Remove Favorite' : 'Favorite'}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>

                    {/* Manual Save Snapshot Button */}
                    <button
                      onClick={() => triggerSave(true, true)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                      title="Create a new version snapshot"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Save Version</span>
                    </button>

                    {/* Delete Note */}
                    <button
                      onClick={handleDeleteNote}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Note Title Input */}
                <input
                  type="text"
                  value={editorTitle}
                  onChange={e => setEditorTitle(e.target.value)}
                  placeholder="Enter medical note title (e.g. Cardiac Cycle & Pressure-Volume Loops)..."
                  className="w-full text-lg sm:text-2xl font-black text-navy-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder:text-slate-300"
                />

                {/* Source Material Grounding Link Banner */}
                {activeNote.material && (
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-teal-50/80 border border-teal-200 text-teal-900 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span className="font-bold text-[11px] uppercase tracking-wider text-teal-700">Source Lecture:</span>
                      <span className="truncate font-semibold">{activeNote.material.title}</span>
                      <span className="text-[10px] text-teal-600 bg-teal-100/70 px-1.5 py-0.5 rounded">
                        {activeNote.material.subject}
                      </span>
                    </div>
                    <Link
                      to={`/learning/materials/${activeNote.material.id}`}
                      className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-2xs whitespace-nowrap ml-2"
                    >
                      <span>View Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                {/* Subject, Topic & Quick Tags Bar */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <select
                    value={editorSubject}
                    onChange={e => setEditorSubject(e.target.value)}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none text-xs"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={editorTopic}
                    onChange={e => setEditorTopic(e.target.value)}
                    placeholder="Topic (e.g. Cardiovascular)"
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none w-36 sm:w-44"
                  />

                  <input
                    type="text"
                    value={editorTags}
                    onChange={e => setEditorTags(e.target.value)}
                    placeholder="Tags (#high-yield, #viva)..."
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none flex-1 min-w-[140px]"
                  />
                  {editorMaterialId && (
                    <span className="text-[11px] px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-semibold shrink-0">
                      📄 Material Linked
                    </span>
                  )}
                </div>
                {/* Quick tags pills */}
                <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 pt-0.5">
                  <span className="text-[10px] text-slate-400">Quick tags:</span>
                  {QUICK_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const parts = editorTags.split(',').map(t => t.trim()).filter(Boolean);
                        if (!parts.includes(tag)) {
                          setEditorTags([...parts, tag].join(', '));
                        }
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-600 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rich Formatting Toolbar */}
              <div className="px-3.5 py-2 border-b border-slate-200 bg-white flex items-center justify-between gap-1 overflow-x-auto text-xs no-scrollbar">
                {/* Formatting Tools */}
                <div className="flex items-center gap-1 flex-nowrap">
                  <button
                    onClick={() => insertFormatting('# ', '', 'Heading 1')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-bold"
                    title="Heading 1"
                  >
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertFormatting('## ', '', 'Heading 2')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-bold"
                    title="Heading 2"
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertFormatting('### ', '', 'Heading 3')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-bold"
                    title="Heading 3"
                  >
                    <Heading3 className="w-4 h-4" />
                  </button>
                  <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                  <button
                    onClick={() => insertFormatting('**', '**', 'bold text')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-bold"
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertFormatting('*', '*', 'italic text')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-bold"
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertFormatting('<u>', '</u>', 'underlined')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 font-bold"
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                  <button
                    onClick={() => insertFormatting('- ', '', 'Bullet point')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertFormatting('1. ', '', 'Numbered item')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => insertFormatting('- [ ] ', '', 'Task')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
                    title="Checklist"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                  <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                  {/* Medical Callout Dropdown / Quick Buttons */}
                  <button
                    onClick={() => insertMedicalCallout('clinical')}
                    className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[11px] flex items-center gap-1 border border-teal-200 transition"
                    title="Insert Clinical Pearl"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-teal-600" />
                    <span>Pearl</span>
                  </button>

                  <button
                    onClick={() => insertMedicalCallout('keypoint')}
                    className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 border border-indigo-200 transition"
                    title="Insert Key Concept"
                  >
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Concept</span>
                  </button>

                  <button
                    onClick={() => insertMedicalCallout('formula')}
                    className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] flex items-center gap-1 border border-purple-200 transition"
                    title="Insert Formula"
                  >
                    <span>📐 Formula</span>
                  </button>

                  <button
                    onClick={insertTable}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
                    title="Insert Comparison Table"
                  >
                    <Table className="w-4 h-4" />
                  </button>
                </div>

                {/* View Mode Toggle: Edit / Preview / Split */}
                <div className="flex items-center gap-2">
                  <div className="hidden sm:inline-flex items-center rounded-xl bg-slate-100 p-0.5 text-[11px] font-bold border border-slate-200">
                    <button
                      onClick={() => setViewMode('edit')}
                      className={`px-2.5 py-1 rounded-lg transition ${viewMode === 'edit' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600'}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`px-2.5 py-1 rounded-lg transition ${viewMode === 'preview' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600'}`}
                    >
                      Preview
                    </button>
                  </div>

                  {/* AI Assistant Drawer Toggle */}
                  <button
                    onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
                      isAiDrawerOpen
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Assistant</span>
                  </button>
                </div>
              </div>

              {/* Selection-Based AI Floating Bar */}
              {selectedText && (
                <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white px-3.5 py-2 text-xs flex items-center justify-between gap-2 shadow-lg animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-purple-300 flex-shrink-0 animate-spin" />
                    <span className="font-bold text-purple-200 text-[11px] whitespace-nowrap">Selected:</span>
                    <span className="truncate italic max-w-[200px]">"{selectedText}"</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => handleAIAction('explain_simply')}
                      disabled={!!aiActionInProgress}
                      className="px-2 py-0.5 rounded-lg bg-purple-700/60 hover:bg-purple-700 text-purple-100 text-[11px] font-bold whitespace-nowrap border border-purple-500/30 transition"
                    >
                      Explain
                    </button>
                    <button
                      onClick={() => handleAIAction('expand_this')}
                      disabled={!!aiActionInProgress}
                      className="px-2 py-0.5 rounded-lg bg-purple-700/60 hover:bg-purple-700 text-purple-100 text-[11px] font-bold whitespace-nowrap border border-purple-500/30 transition"
                    >
                      Expand
                    </button>
                    <button
                      onClick={() => handleAIAction('create_flashcards')}
                      disabled={!!aiActionInProgress}
                      className="px-2 py-0.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold whitespace-nowrap transition"
                    >
                      Make Card
                    </button>
                    <button
                      onClick={() => handleAIAction('create_mnemonic')}
                      disabled={!!aiActionInProgress}
                      className="px-2 py-0.5 rounded-lg bg-amber-500/80 hover:bg-amber-500 text-white text-[11px] font-bold whitespace-nowrap transition"
                    >
                      Mnemonic
                    </button>
                    <button
                      onClick={() => setSelectedText('')}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* AI Notification Banner */}
              {aiNotice && (
                <div className={`p-3 mx-4 mt-3 rounded-2xl text-xs flex items-start justify-between gap-3 border shadow-2xs animate-in fade-in ${
                  aiNotice.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : aiNotice.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-purple-50 border-purple-200 text-purple-900'
                }`}>
                  <div className="space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{aiNotice.message}</span>
                    </div>
                    {aiNotice.details && (
                      <p className="text-[11px] font-medium leading-relaxed whitespace-pre-line text-slate-700">
                        {aiNotice.details}
                      </p>
                    )}
                  </div>
                  <button onClick={() => setAiNotice(null)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Editor / Preview Area */}
              <div className="flex-1 flex overflow-hidden relative">
                {/* Editor Textarea */}
                <div className={`flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto ${viewMode === 'preview' ? 'hidden' : 'flex'}`}>
                  <textarea
                    ref={textareaRef}
                    value={editorContent}
                    onChange={e => setEditorContent(e.target.value)}
                    onSelect={handleEditorSelect}
                    onMouseUp={handleEditorSelect}
                    onTouchEnd={handleEditorSelect}
                    placeholder="Type or format your medical study notes in Markdown or rich text...\n\nUse ## for sections, > 💡 for Clinical Pearls, and > 🔑 for Key Concepts."
                    className="flex-1 w-full h-full min-h-[400px] border-0 focus:outline-none focus:ring-0 text-slate-800 text-sm sm:text-base leading-relaxed resize-none font-mono bg-transparent"
                  />
                  {selectedText && selectionPosition && (
                    <div
                      style={{ top: selectionPosition.top + "px", left: selectionPosition.left + "px" }}
                      className="fixed z-50 bg-slate-900/95 backdrop-blur-md text-white px-2.5 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 border border-slate-700 text-xs animate-in fade-in"
                    >
                      <span className="text-purple-300 font-semibold text-[11px] truncate max-w-[100px]">
                        \"{selectedText.slice(0, 18)}...\"
                      </span>
                      <div className="h-3.5 w-[1px] bg-slate-700" />
                      <button onClick={() => handleAIAction("explain_simply")} className="hover:text-purple-300 font-medium px-1">Explain</button>
                      <button onClick={() => handleAIAction("make_high_yield")} className="hover:text-purple-300 font-medium px-1">High-Yield</button>
                      <button onClick={() => handleAIAction("simplify")} className="hover:text-purple-300 font-medium px-1">Simplify</button>
                      <button onClick={() => handleAIAction("create_mnemonic")} className="hover:text-purple-300 font-medium px-1">Mnemonic</button>
                      <button onClick={() => { setSelectedText(""); setSelectionPosition(null); }} className="text-slate-400 hover:text-white ml-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Rendered Preview Mode */}
                <div className={`flex-1 p-5 sm:p-7 overflow-y-auto bg-slate-50/50 ${viewMode === 'edit' ? 'hidden' : 'block'}`}>
                  <div className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed">
                    {/* Basic Markdown Block Renderer */}
                    {editorContent.split('\n\n').map((block, idx) => {
                      if (block.startsWith('# ')) {
                        return <h1 key={idx} className="text-2xl font-black text-navy-900 mb-3">{block.replace('# ', '')}</h1>;
                      }
                      if (block.startsWith('## ')) {
                        return <h2 key={idx} className="text-lg font-bold text-navy-900 mt-4 mb-2 pb-1 border-b border-slate-200">{block.replace('## ', '')}</h2>;
                      }
                      if (block.startsWith('### ')) {
                        return <h3 key={idx} className="text-sm font-bold text-slate-800 mt-3 mb-1">{block.replace('### ', '')}</h3>;
                      }
                      if (block.includes('Clinical Pearl:') || block.includes('💡')) {
                        return (
                          <div key={idx} className="my-3 p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 font-medium text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs">
                            <Lightbulb className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                            <div>{block.replace(/^>\s*/, '')}</div>
                          </div>
                        );
                      }
                      if (block.includes('Key Concept:') || block.includes('🔑')) {
                        return (
                          <div key={idx} className="my-3 p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 font-medium text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs">
                            <Key className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <div>{block.replace(/^>\s*/, '')}</div>
                          </div>
                        );
                      }
                      if (block.includes('Important:') || block.includes('⚠️')) {
                        return (
                          <div key={idx} className="my-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 font-medium text-xs sm:text-sm flex items-start gap-2.5 shadow-2xs">
                            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                            <div>{block.replace(/^>\s*/, '')}</div>
                          </div>
                        );
                      }
                      if (block.startsWith('> ')) {
                        return <blockquote key={idx} className="border-l-4 border-purple-500 pl-3 italic text-slate-600 my-2">{block.replace('> ', '')}</blockquote>;
                      }
                      if (block.startsWith('- [ ]') || block.startsWith('- [x]')) {
                        return (
                          <div key={idx} className="space-y-1 my-2">
                            {block.split('\n').map((item, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs sm:text-sm text-slate-700">
                                <input type="checkbox" checked={item.includes('- [x]')} readOnly className="rounded text-purple-600" />
                                <span>{item.replace(/^- \[.\]\s*/, '')}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return <p key={idx} className="text-slate-700 my-2">{block}</p>;
                    })}
                  </div>
                </div>

                {/* AI Assistant Drawer (Desktop side / Mobile Slide-over) */}
                {isAiDrawerOpen && (
                  <div className="w-80 sm:w-96 border-l border-slate-200 bg-slate-50 flex flex-col h-full shadow-lg z-10 animate-in slide-in-from-right-2">
                    <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">AI Medical Assistant</h4>
                      </div>
                      <button onClick={() => setIsAiDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* AI Actions Tabs & Buttons */}
                    <div className="p-3 overflow-y-auto flex-1 space-y-4">
                      {/* One-Click Transformations */}
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 block">
                          Transform Note Content
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            onClick={() => handleAIAction('make_high_yield')}
                            disabled={!!aiActionInProgress}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 font-bold flex items-center gap-1.5 transition text-left"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[11px]">Make High-Yield</span>
                          </button>

                          <button
                            onClick={() => handleAIAction('organize_with_ai')}
                            disabled={!!aiActionInProgress}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 font-bold flex items-center gap-1.5 transition text-left"
                          >
                            <Layers className="w-3.5 h-3.5 text-purple-600" />
                            <span className="text-[11px]">Organize with AI</span>
                          </button>

                          <button
                            onClick={() => handleAIAction('improve_terminology')}
                            disabled={!!aiActionInProgress}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 font-bold flex items-center gap-1.5 transition text-left"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            <span className="text-[11px]">Improve Terms</span>
                          </button>

                          <button
                            onClick={() => handleAIAction('summarize')}
                            disabled={!!aiActionInProgress}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 font-bold flex items-center gap-1.5 transition text-left"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-[11px]">Summarize</span>
                          </button>

                          <button
                            onClick={() => handleAIAction('create_viva_questions')}
                            disabled={!!aiActionInProgress}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 font-bold flex items-center gap-1.5 transition text-left"
                          >
                            <span>🎙️ Viva Questions</span>
                          </button>

                          <button
                            onClick={() => handleAIAction('create_clinical_questions')}
                            disabled={!!aiActionInProgress}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 font-bold flex items-center gap-1.5 transition text-left"
                          >
                            <span>🩺 Vignettes</span>
                          </button>

                          <button
                            onClick={() => handleAIAction('compare_concepts')}
                            disabled={!!aiActionInProgress}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 font-bold flex items-center gap-1.5 transition text-left"
                          >
                            <Table className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-[11px]">Compare Table</span>
                          </button>

                          <button
                            onClick={() => handleAIAction('create_mnemonic')}
                            disabled={!!aiActionInProgress}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 font-bold flex items-center gap-1.5 transition text-left"
                          >
                            <span>🧠 Mnemonic</span>
                          </button>

                          <button
                            onClick={() => handleAIAction('translate')}
                            disabled={!!aiActionInProgress}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 font-bold flex items-center gap-1.5 transition text-left"
                          >
                            <span>🌐 বাংলা / English</span>
                          </button>

                          <button
                            onClick={() => handleAIAction('find_missing_concepts')}
                            disabled={!!aiActionInProgress}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-slate-700 font-bold flex items-center gap-1.5 transition text-left"
                          >
                            <span>🔍 Missing Points</span>
                          </button>
                        </div>
                      </div>

                      {/* Interactive Note Chat Stream */}
                      <div className="border-t border-slate-200 pt-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 block">
                          Ask AI About This Note
                        </span>

                        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1 text-xs">
                          {aiChatMessages.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">
                              Ask clinical questions, request pathophysiological explanations, or check exam significance.
                            </p>
                          ) : (
                            aiChatMessages.map((msg, idx) => (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl text-xs ${
                                  msg.role === 'user'
                                    ? 'bg-purple-600 text-white ml-4'
                                    : 'bg-white border border-slate-200 text-slate-800 mr-4 shadow-2xs'
                                }`}
                              >
                                {msg.text}
                              </div>
                            ))
                          )}
                          {isAiChatThinking && (
                            <div className="p-2 text-[11px] text-purple-600 flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Clinical AI is reviewing your note...</span>
                            </div>
                          )}
                        </div>

                        {/* Chat Input */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={aiChatInput}
                            onChange={e => setAiChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendAiChat()}
                            placeholder="Ask about this note..."
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          />
                          <button
                            onClick={handleSendAiChat}
                            disabled={!aiChatInput.trim() || isAiChatThinking}
                            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50 transition shadow-2xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Ecosystem Cross-Links Bottom Action Bar */}
              <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
                    Study Actions:
                  </span>

                  {/* Make Flashcards */}
                  <button
                    onClick={() => handleAIAction('create_flashcards')}
                    disabled={!!aiActionInProgress}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Make Flashcards</span>
                  </button>

                  {/* Generate MCQs */}
                  <button
                    onClick={() => setIsMcqModalOpen(true)}
                    disabled={!!aiActionInProgress}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Generate MCQs</span>
                  </button>

                  {/* Practice Viva */}
                  <button
                    onClick={() => {
                      const subj = encodeURIComponent(activeNote.subject);
                      const top = encodeURIComponent(activeNote.topic || activeNote.title);
                      navigate(`/viva/adaptive?subject=${subj}&topic=${top}`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <span>🎙️ Practice Viva</span>
                  </button>

                  {/* Study with AI Tutor */}
                  <button
                    onClick={() => {
                      const subj = encodeURIComponent(activeNote.subject);
                      const top = encodeURIComponent(activeNote.topic || activeNote.title);
                      navigate(`/ai-tutor?subject=${subj}&topic=${top}&noteId=${activeNote.id}`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                    <span>AI Tutor</span>
                  </button>
                </div>

                {/* Export Action */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExport('md')}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 transition"
                    title="Export as Markdown (.md)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-[11px]">.md</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40">
              <div className="w-16 h-16 rounded-3xl bg-purple-100/80 text-purple-700 flex items-center justify-center mb-4 shadow-sm">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-navy-900 mb-1">Your Personal Medical Knowledge Hub</h3>
              <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
                Transform lecture materials, handwritten notes, and high-yield clinical concepts into active recall flashcards, MCQs, and viva simulations.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenCreateModal('blank')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  + Create Blank Note
                </button>
                <button
                  onClick={() => handleOpenCreateModal('material')}
                  className="px-4 py-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-700 rounded-xl text-xs font-bold transition shadow-2xs"
                >
                  📄 From Study Material
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: Create New Note (Multi-Mode)
         ───────────────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-black text-navy-900">Create New Medical Note</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tabs: Blank, Material, AI Topic, Clinical */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setCreateMode('blank')}
                className={`py-1.5 rounded-xl transition ${createMode === 'blank' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600'}`}
              >
                Blank Note
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('material')}
                className={`py-1.5 rounded-xl transition ${createMode === 'material' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600'}`}
              >
                From Material
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('ai_topic')}
                className={`py-1.5 rounded-xl transition ${createMode === 'ai_topic' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600'}`}
              >
                AI Topic
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('clinical')}
                className={`py-1.5 rounded-xl transition ${createMode === 'clinical' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600'}`}
              >
                Clinical Concept
              </button>
            </div>

            {/* Mode-Specific Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Subject</label>
                <select
                  value={newNoteSubject}
                  onChange={e => setNewNoteSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                >
                  {subjects.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {createMode === 'material' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select Uploaded Study Material</label>
                  <select
                    value={newNoteMaterialId}
                    onChange={e => setNewNoteMaterialId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                  >
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>
                        📄 {m.title} ({m.subject})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(createMode === 'ai_topic' || createMode === 'clinical') && (
                <div className="space-y-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Medical Topic / Concept</label>
                    <input
                      type="text"
                      value={newNoteTopic}
                      onChange={e => setNewNoteTopic(e.target.value)}
                      placeholder={createMode === 'clinical' ? 'e.g. Approach to Acute Chest Pain' : 'e.g. Cardiac Cycle & Pressure-Volume Loops'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                    />
                  </div>
                  {createMode === 'ai_topic' && (
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Note Focus & Style</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'HIGH_YIELD', label: '⭐ High-Yield' },
                          { id: 'DETAILED', label: '📖 Comprehensive' },
                          { id: 'VIVA_FOCUSED', label: '🎙️ Viva Focused' },
                          { id: 'QUICK', label: '⚡ Quick Revision' }
                        ].map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setNewNoteAiStyle(st.id as any)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                              newNoteAiStyle === st.id ? "bg-purple-50 border-purple-500 text-purple-800" : "bg-white border-slate-200 text-slate-600"
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Note Title</label>
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={e => setNewNoteTitle(e.target.value)}
                  placeholder="Enter note title (or leave blank for auto-title)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                />
              </div>

              {/* Duplicate Warning */}
              {duplicateWarning && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Existing note detected on this topic:</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    You already have a note titled <strong>"{duplicateWarning.title}"</strong> ({duplicateWarning.subject}).
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        openNoteDetail(duplicateWarning.id);
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px]"
                    >
                      Open Existing Note
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteCreateNote}
                      className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 font-bold text-[11px]"
                    >
                      Create Duplicate Anyway
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCreateNote}
                disabled={isGeneratingNote}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isGeneratingNote && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{createMode === 'ai_topic' ? 'Generate Note' : 'Create Note'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: Version History
         ───────────────────────────────────────────────────────────── */}
      {isVersionModalOpen && activeNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-base sm:text-lg font-black text-navy-900">Version History</h3>
                  <p className="text-[11px] text-slate-500">Every snapshot is preserved without overwriting history.</p>
                </div>
              </div>
              <button onClick={() => setIsVersionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Version List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {activeNote.versions && activeNote.versions.length > 0 ? (
                activeNote.versions.map((ver, idx) => (
                  <div key={ver.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-navy-900 text-sm">Version {ver.versionNumber}</span>
                        {idx === 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {new Date(ver.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} • {ver.wordCount} words
                      </p>
                      <p className="text-[11px] text-slate-700 italic mt-1 line-clamp-1">"{ver.content.slice(0, 60)}..."</p>
                    </div>

                    <button
                      onClick={() => handleRestoreVersion(ver.versionNumber)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-purple-700 font-bold text-xs flex items-center gap-1 transition shadow-2xs whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 p-4 text-center">Initial version snapshot active.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: Organize with AI Preview & Diff
         ───────────────────────────────────────────────────────────── */}
      {isOrganizePreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-base sm:text-lg font-black text-navy-900">AI Note Organization Preview</h3>
                  <p className="text-[11px] text-slate-500">Structured into logical medical headings, mechanisms &amp; pearls.</p>
                </div>
              </div>
              <button onClick={() => setIsOrganizePreviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed">
              {organizedContentPreview}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsOrganizePreviewOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setEditorContent(organizedContentPreview);
                  setIsOrganizePreviewOpen(false);
                  await triggerSave(true, true);
                  setAiNotice({ type: 'success', message: 'Organized note applied and versioned!' });
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-sm"
              >
                Apply to Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: Global "Ask My Notes" AI Assistant
         ───────────────────────────────────────────────────────────── */}
      {isAskMyNotesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-base sm:text-lg font-black text-navy-900">Ask My Notes Library</h3>
                  <p className="text-[11px] text-slate-500">Query questions across all your personal study materials and notes.</p>
                </div>
              </div>
              <button onClick={() => setIsAskMyNotesModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleAskMyNotes} className="flex items-center gap-2">
              <input
                type="text"
                value={askMyNotesQuery}
                onChange={e => setAskMyNotesQuery(e.target.value)}
                placeholder="e.g. What did I write about preload and Frank-Starling law?"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSearchingNotes || !askMyNotesQuery.trim()}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                {isSearchingNotes ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Ask</span>
              </button>
            </form>

            {/* Answer Display */}
            {askMyNotesResult && (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pt-2">
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-purple-950 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-2xs">
                  {askMyNotesResult.answer}
                </div>

                {askMyNotesResult.matchedNotes && askMyNotesResult.matchedNotes.length > 0 && (
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                      Referenced Personal Notes:
                    </span>
                    <div className="space-y-1.5">
                      {askMyNotesResult.matchedNotes.map((m: any) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setIsAskMyNotesModalOpen(false);
                            openNoteDetail(m.id);
                          }}
                          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-purple-50/50 hover:border-purple-300 cursor-pointer text-xs flex items-center justify-between transition"
                        >
                          <span className="font-bold text-slate-800">{m.title}</span>
                          <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-bold">
                            {m.subject}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 5: MCQ Generation Configuration
         ───────────────────────────────────────────────────────────── */}
      {isMcqModalOpen && activeNote && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                <h3 className="text-base sm:text-lg font-black text-navy-900">Generate MCQs from Note</h3>
              </div>
              <button onClick={() => setIsMcqModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Grounded in "{activeNote.title}". Questions will be stored in your Question Bank.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Number of Questions</label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setMcqCount(cnt)}
                      className={`py-2 rounded-xl border font-bold text-xs transition ${
                        mcqCount === cnt
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cnt} MCQs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Difficulty Level</label>
                <select
                  value={mcqDifficulty}
                  onChange={e => setMcqDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none"
                >
                  <option value="easy">Basic Recall &amp; Definitions</option>
                  <option value="medium">Intermediate Mechanisms</option>
                  <option value="hard">Advanced Diagnostic Synthesis</option>
                  <option value="exam">Board Exam Focused</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsMcqModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsMcqModalOpen(false);
                  await handleAIAction('create_mcqs');
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Generate MCQs Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
