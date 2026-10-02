import OpenAI from 'openai';
import prisma from '../../utils/prisma';
import { LearningAIService } from '../learningAIService';

export interface NoteListFilters {
  subject?: string;
  topic?: string;
  noteType?: string;
  materialId?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  search?: string;
  tag?: string;
  sortBy?: 'recently_updated' | 'recently_created' | 'alphabetical' | 'most_used';
}

export interface NoteCreateInput {
  title: string;
  content: string;
  subject?: string;
  topic?: string;
  tags?: string;
  noteType?: 'PERSONAL' | 'MATERIAL_BASED' | 'AI_GENERATED' | 'VIVA' | 'CLINICAL';
  sourceType?: 'PERSONAL' | 'MATERIAL_BASED' | 'AI_GENERATED' | 'VIVA' | 'CLINICAL';
  materialId?: string;
  summary?: string;
  contentFormat?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
}

export interface NoteUpdateInput {
  title?: string;
  content?: string;
  subject?: string;
  topic?: string;
  tags?: string;
  noteType?: string;
  summary?: string;
  contentFormat?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  status?: string;
  createVersionSnapshot?: boolean;
  expectedVersion?: number;
}

export class SmartNotesService {
  private static getOpenAI(): OpenAI | null {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.startsWith('sk-') && !apiKey.includes('placeholder')) {
      return new OpenAI({ apiKey });
    }
    return null;
  }

  private static calculateStats(content: string): { wordCount: number; readingTime: number } {
    const words = (content || '').trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));
    return { wordCount, readingTime };
  }

  /**
   * 1. Get lightweight notes list with rich filters, sorting, and tag support
   */
  public static async listNotes(userId: string, filters: NoteListFilters = {}) {
    const where: any = { userId };

    // Archive handling: default to active (unarchived) notes
    if (filters.isArchived !== undefined) {
      where.isArchived = Boolean(filters.isArchived);
    } else {
      where.isArchived = false;
    }

    if (filters.subject && filters.subject !== 'ALL') {
      where.subject = filters.subject;
    }
    if (filters.topic) {
      where.topic = filters.topic;
    }
    if (filters.noteType && filters.noteType !== 'ALL') {
      where.noteType = filters.noteType;
    }
    if (filters.materialId) {
      where.materialId = filters.materialId;
    }
    if (filters.isPinned !== undefined) {
      where.isPinned = Boolean(filters.isPinned);
    }
    if (filters.isFavorite !== undefined) {
      where.isFavorite = Boolean(filters.isFavorite);
    }
    if (filters.tag) {
      where.tags = { contains: filters.tag };
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
        { summary: { contains: q } },
        { tags: { contains: q } },
        { topic: { contains: q } },
        { subject: { contains: q } }
      ];
    }

    // Determine sorting
    let orderBy: any[] = [{ isPinned: 'desc' }];
    switch (filters.sortBy) {
      case 'recently_created':
        orderBy.push({ createdAt: 'desc' });
        break;
      case 'alphabetical':
        orderBy.push({ title: 'asc' });
        break;
      case 'recently_updated':
      default:
        orderBy.push({ updatedAt: 'desc' });
        break;
    }

    const notes = await prisma.studyNote.findMany({
      where,
      orderBy,
      select: {
        id: true,
        userId: true,
        materialId: true,
        title: true,
        subject: true,
        topic: true,
        tags: true,
        sourceType: true,
        noteType: true,
        summary: true,
        contentFormat: true,
        isPinned: true,
        isFavorite: true,
        isArchived: true,
        wordCount: true,
        readingTime: true,
        version: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastOpenedAt: true,
        material: {
          select: {
            id: true,
            title: true,
            subject: true,
            fileType: true,
            originalFileName: true
          }
        },
        _count: {
          select: {
            versions: true,
            flashcardDecks: true,
            questionBanks: true
          }
        }
      }
    });

    return notes;
  }

  /**
   * 2. Get full note details with source material, related notes, versions, and learning links
   */
  public static async getNote(userId: string, noteId: string) {
    const note = await prisma.studyNote.findFirst({
      where: { id: noteId, userId },
      include: {
        material: {
          select: {
            id: true,
            title: true,
            subject: true,
            topic: true,
            fileType: true,
            originalFileName: true,
            fileSize: true,
            extractedText: true
          }
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 15
        },
        flashcardDecks: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            _count: { select: { flashcards: true } }
          }
        },
        questionBanks: {
          select: {
            id: true,
            title: true,
            createdAt: true,
            _count: { select: { questions: true } }
          }
        }
      }
    });

    if (!note) {
      throw new Error('Study note not found or access denied.');
    }

    // Update lastOpenedAt
    await prisma.studyNote.update({
      where: { id: noteId },
      data: { lastOpenedAt: new Date() }
    });

    // Find related notes in the student's knowledge base
    const relatedNotes = await prisma.studyNote.findMany({
      where: {
        userId,
        id: { not: noteId },
        isArchived: false,
        OR: [
          { subject: note.subject },
          note.topic ? { topic: note.topic } : { subject: note.subject }
        ]
      },
      select: {
        id: true,
        title: true,
        subject: true,
        topic: true,
        noteType: true,
        updatedAt: true
      },
      take: 4,
      orderBy: { updatedAt: 'desc' }
    });

    return {
      ...note,
      relatedNotes
    };
  }

  /**
   * 3. Create Note with version 1 snapshot & auto word/time stats
   */
  public static async createNote(userId: string, input: NoteCreateInput) {
    const { wordCount, readingTime } = this.calculateStats(input.content);

    const noteType = input.noteType || (input.materialId ? 'MATERIAL_BASED' : 'PERSONAL');
    const sourceType = input.sourceType || noteType;

    const note = await prisma.studyNote.create({
      data: {
        userId,
        materialId: input.materialId || null,
        title: input.title.trim(),
        content: input.content,
        subject: input.subject || 'General Medicine',
        topic: input.topic || null,
        tags: input.tags || null,
        noteType,
        sourceType,
        summary: input.summary || null,
        contentFormat: input.contentFormat || 'markdown',
        isPinned: Boolean(input.isPinned),
        isFavorite: Boolean(input.isFavorite),
        isArchived: false,
        wordCount,
        readingTime,
        version: 1,
        status: 'PUBLISHED',
        lastOpenedAt: new Date()
      },
      include: {
        material: {
          select: { id: true, title: true, subject: true, fileType: true }
        }
      }
    });

    // Create initial Version 1 snapshot
    await prisma.noteVersion.create({
      data: {
        noteId: note.id,
        versionNumber: 1,
        title: note.title,
        content: note.content,
        summary: note.summary,
        wordCount
      }
    });

    return note;
  }

  /**
   * 4. Update Note (with debounced autosave, version control, conflict detection)
   */
  public static async updateNote(userId: string, noteId: string, input: NoteUpdateInput) {
    const existing = await prisma.studyNote.findFirst({
      where: { id: noteId, userId }
    });

    if (!existing) {
      throw new Error('Study note not found or access denied.');
    }

    // Version conflict detection
    if (input.expectedVersion && input.expectedVersion !== existing.version) {
      console.warn(`[Note Conflict] Client version ${input.expectedVersion} vs DB version ${existing.version}`);
    }

    const newContent = input.content !== undefined ? input.content : existing.content;
    const newTitle = input.title !== undefined ? input.title.trim() : existing.title;
    const { wordCount, readingTime } = this.calculateStats(newContent);

    // Determine if content changed significantly to warrant a version snapshot
    const contentDiff = Math.abs(newContent.length - existing.content.length);
    const shouldSnapshot = input.createVersionSnapshot || contentDiff > 80;

    let nextVersion = existing.version;
    if (shouldSnapshot) {
      nextVersion = existing.version + 1;
      await prisma.noteVersion.create({
        data: {
          noteId: existing.id,
          versionNumber: nextVersion,
          title: newTitle,
          content: newContent,
          summary: input.summary || existing.summary,
          wordCount
        }
      });
    }

    const updated = await prisma.studyNote.update({
      where: { id: noteId },
      data: {
        title: newTitle,
        content: newContent,
        subject: input.subject !== undefined ? input.subject : existing.subject,
        topic: input.topic !== undefined ? input.topic : existing.topic,
        tags: input.tags !== undefined ? input.tags : existing.tags,
        noteType: input.noteType !== undefined ? input.noteType : existing.noteType,
        summary: input.summary !== undefined ? input.summary : existing.summary,
        contentFormat: input.contentFormat !== undefined ? input.contentFormat : existing.contentFormat,
        isPinned: input.isPinned !== undefined ? Boolean(input.isPinned) : existing.isPinned,
        isFavorite: input.isFavorite !== undefined ? Boolean(input.isFavorite) : existing.isFavorite,
        isArchived: input.isArchived !== undefined ? Boolean(input.isArchived) : existing.isArchived,
        status: input.status !== undefined ? input.status : existing.status,
        wordCount,
        readingTime,
        version: nextVersion,
        updatedAt: new Date()
      },
      include: {
        material: {
          select: { id: true, title: true, subject: true, fileType: true }
        }
      }
    });

    return updated;
  }

  /**
   * 5. Restore previous version
   */
  public static async restoreVersion(userId: string, noteId: string, versionNumber: number) {
    const note = await prisma.studyNote.findFirst({
      where: { id: noteId, userId }
    });
    if (!note) throw new Error('Note not found');

    const versionRecord = await prisma.noteVersion.findFirst({
      where: { noteId, versionNumber }
    });
    if (!versionRecord) throw new Error(`Version ${versionNumber} not found.`);

    const newVersion = note.version + 1;
    const { wordCount, readingTime } = this.calculateStats(versionRecord.content);

    // Save a new version capturing the restoration
    await prisma.noteVersion.create({
      data: {
        noteId,
        versionNumber: newVersion,
        title: versionRecord.title,
        content: versionRecord.content,
        summary: versionRecord.summary,
        wordCount
      }
    });

    const updated = await prisma.studyNote.update({
      where: { id: noteId },
      data: {
        title: versionRecord.title,
        content: versionRecord.content,
        summary: versionRecord.summary,
        wordCount,
        readingTime,
        version: newVersion,
        updatedAt: new Date()
      }
    });

    return updated;
  }

  /**
   * 6. Duplicate Detection: Check if note with similar title/topic exists
   */
  public static async checkDuplicate(userId: string, title: string, topic?: string) {
    const cleanTitle = title.trim().toLowerCase();
    const existing = await prisma.studyNote.findFirst({
      where: {
        userId,
        isArchived: false,
        OR: [
          { title: { equals: title.trim() } },
          topic ? { topic: { equals: topic.trim() } } : { title: { contains: cleanTitle } }
        ]
      },
      select: { id: true, title: true, subject: true, topic: true, updatedAt: true }
    });

    return {
      exists: !!existing,
      existingNote: existing
    };
  }

  /**
   * 7. Source-Grounded AI Assistant & Transformation Engine
   */
  public static async executeAIAction(params: {
    userId: string;
    noteId: string;
    action: string;
    selectedText?: string;
    customPrompt?: string;
    useBroaderKnowledge?: boolean;
  }) {
    const { userId, noteId, action, selectedText, customPrompt, useBroaderKnowledge = false } = params;

    const note = await prisma.studyNote.findFirst({
      where: { id: noteId, userId },
      include: {
        material: {
          select: { id: true, title: true, subject: true, originalFileName: true, extractedText: true }
        }
      }
    });

    if (!note) throw new Error('Note not found');

    const workingContent = selectedText && selectedText.trim() ? selectedText.trim() : note.content;
    const isSelection = Boolean(selectedText && selectedText.trim());

    // Check if source material is available for grounding
    const hasSourceMaterial = Boolean(note.material && note.material.extractedText);
    const sourceMaterialTitle = note.material?.title || 'Uploaded Lecture Material';
    const sourceExcerpt = hasSourceMaterial ? note.material!.extractedText!.slice(0, 3500) : '';

    const openai = this.getOpenAI();

    // ─────────────────────────────────────────────────────────────
    // A. Flashcards Generation
    // ─────────────────────────────────────────────────────────────
    if (action === 'create_flashcards' || action === 'flashcards') {
      const cards = await LearningAIService.generateFlashcards({
        materialText: `${note.title}\n\n${workingContent}`,
        count: 6,
        difficulty: 'medium'
      });

      const deck = await prisma.flashcardDeck.create({
        data: {
          userId,
          sourceNoteId: note.id,
          materialId: note.materialId,
          title: `Flashcards: ${note.title.slice(0, 50)}`,
          subject: note.subject,
          topic: note.topic,
          description: `Auto-generated from Smart Note: ${note.title}`,
          flashcards: {
            create: cards.map(c => ({
              question: c.question,
              answer: c.answer,
              explanation: c.explanation,
              sourceReference: `Note: ${note.title}`,
              difficulty: c.difficulty
            }))
          }
        },
        include: {
          flashcards: true
        }
      });

      return {
        action,
        deck,
        message: `Created Flashcard Deck with ${deck.flashcards.length} cards linked to this note!`
      };
    }

    // ─────────────────────────────────────────────────────────────
    // B. MCQs Generation
    // ─────────────────────────────────────────────────────────────
    if (action === 'create_mcqs' || action === 'mcqs') {
      const mcqs = await LearningAIService.generateMCQs({
        materialText: `${note.title}\n\n${workingContent}`,
        subject: note.subject,
        topic: note.topic || 'General',
        count: 5,
        difficulty: 'medium'
      });

      const qb = await prisma.questionBank.create({
        data: {
          userId,
          sourceNoteId: note.id,
          materialId: note.materialId,
          title: `MCQs: ${note.title.slice(0, 50)}`,
          subject: note.subject,
          topic: note.topic,
          description: `High-yield questions generated from Smart Note: ${note.title}`,
          questions: {
            create: mcqs.map(q => ({
              question: q.question,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              correctOption: q.correctOption,
              explanation: q.explanation,
              difficulty: q.difficulty,
              sourceReference: `Note: ${note.title}`
            }))
          }
        },
        include: {
          questions: true
        }
      });

      return {
        action,
        questionBank: qb,
        message: `Created Question Bank with ${qb.questions.length} MCQs linked to this note!`
      };
    }

    // ─────────────────────────────────────────────────────────────
    // C. Specialized Text & Knowledge Transformations
    // ─────────────────────────────────────────────────────────────
    let systemInstruction = `You are a distinguished medical professor and AI knowledge assistant at Techboloy Med.
You assist medical students with clear, authoritative, physiologically and clinically grounded knowledge.
Support both English and Bengali / Banglish input seamlessly.`;

    if (hasSourceMaterial && !useBroaderKnowledge) {
      systemInstruction += `\nCRITICAL SOURCE-GROUNDING RULE:
This note is linked to the primary study material: "${sourceMaterialTitle}".
Prioritize the extracted lecture material provided below. If a user asks for information not in the lecture, state:
"This information is not explicitly detailed in the source material (${sourceMaterialTitle}). Using verified core medical curriculum principles:" before explaining.`;
    }

    let userPrompt = '';

    switch (action) {
      case 'improve':
      case 'improve_terminology':
        userPrompt = `Refine and elevate this medical note content. Upgrade casual terminology into precise medical terms (e.g. "heart pumping" -> "systolic ventricular contraction"). Maintain original meaning, format with crisp bullet points, and do NOT fabricate facts.\n\nContent:\n${workingContent}`;
        break;

      case 'summarize':
        userPrompt = `Generate a structured, high-yield summary of this medical note.
Structure output strictly into:
### 📌 Executive Summary (3-5 core points)
### ⚡ High-Yield Exam Facts
### 📖 Key Terminology & Definitions
### 💡 Clinical Relevance
\nContent:\n${workingContent}`;
        break;

      case 'explain_simply':
      case 'simplify':
        userPrompt = `Explain the medical mechanisms in this text in intuitive, crystal-clear language suitable for a first-year medical student. Use helpful physiological analogies where appropriate.\n\nContent:\n${workingContent}`;
        break;

      case 'expand_this':
        userPrompt = `Elaborate on the physiological mechanisms, pathways, and clinical significance mentioned in this content. Add depth without filler.\n\nContent:\n${workingContent}`;
        break;

      case 'make_high_yield':
        userPrompt = `Transform this medical note into high-yield exam bullets (bulleted facts, bold key concepts, classic exam buzzwords, and diagnostic criteria).\n\nContent:\n${workingContent}`;
        break;

      case 'turn_into_exam_notes':
        userPrompt = `Organize this material into rapid-review exam notes with bullet points, high-yield callouts, and key differential points.\n\nContent:\n${workingContent}`;
        break;

      case 'create_viva_questions':
        userPrompt = `From this medical note, generate 4-5 classic viva voce oral examination questions ranging from basic definition to bedside clinical management.\n\nContent:\n${workingContent}`;
        break;

      case 'create_clinical_questions':
        userPrompt = `Generate 2-3 realistic clinical vignette scenarios based on this note, testing diagnostic workup and acute management.\n\nContent:\n${workingContent}`;
        break;

      case 'explain_with_example':
        userPrompt = `Explain the core concept in this note using a realistic clinical bedside patient case example.\n\nContent:\n${workingContent}`;
        break;

      case 'compare_concepts':
        userPrompt = `Identify the 2 primary related or contrasting medical concepts in this note (e.g. Systole vs Diastole, Preload vs Afterload) and create a clear Markdown comparison table.\n\nContent:\n${workingContent}`;
        break;

      case 'create_mnemonic':
        userPrompt = `Create a memorable, medically accurate mnemonic to help recall the key steps, causes, or features in this note.\n\nContent:\n${workingContent}`;
        break;

      case 'translate':
        userPrompt = `Translate this medical study note between English and Bengali (বাংলা). Keep international medical terms intact in parentheses (e.g. হৃৎপিণ্ড (Heart)).\n\nContent:\n${workingContent}`;
        break;

      case 'organize_with_ai':
        userPrompt = `Reorganize this messy or raw medical note into a clean, beautiful Markdown medical study guide.
Use headings (#, ##, ###), bullet points, and callouts:
- :::keypoint [Key Concept] :::
- :::clinical [Clinical Pearl] :::
- :::formula [Equation] :::
Do NOT delete the student's original factual content, but organize it into logical sections (Overview, Mechanisms, Clinical Relevance).\n\nRaw Content:\n${workingContent}`;
        break;

      case 'extract_key_points':
        userPrompt = `Extract all critical Key Points, Definitions, and Formulas from this note as a bulleted checklist.\n\nContent:\n${workingContent}`;
        break;

      case 'find_missing_concepts':
        userPrompt = `Review this medical note on ${note.topic || note.subject}. Identify what crucial physiological mechanisms, complications, or diagnostic steps the student missed or should add to make this note comprehensive.\n\nContent:\n${workingContent}`;
        break;

      case 'generate_revision_checklist':
        userPrompt = `Generate an active-recall checklist (Markdown checkboxes - [ ]) testing whether the student truly understands all concepts in this note.\n\nContent:\n${workingContent}`;
        break;

      case 'ask_ai':
      default:
        userPrompt = `${customPrompt || 'Explain this note and how it connects to clinical practice.'}\n\nNote Content:\n${workingContent}`;
        break;
    }

    if (hasSourceMaterial) {
      userPrompt += `\n\n--- GROUNDING SOURCE MATERIAL (${sourceMaterialTitle}) ---\n${sourceExcerpt}`;
    }

    let aiResultText = '';

    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2
        });
        aiResultText = completion.choices[0]?.message?.content || '';
      } catch (err) {
        console.warn('OpenAI error during note AI action, falling back to tutor engine:', err);
      }
    }

    // High-yield Fallback using LearningAIService
    if (!aiResultText) {
      const fallback = await LearningAIService.chatWithTutor({
        userMessage: `${userPrompt}\n\nNote on ${note.subject} - ${note.topic || ''}`,
        mode: 'EXPLAIN',
        history: [],
        subject: note.subject,
        topic: note.topic || undefined
      });
      aiResultText = fallback.reply;
    }

    return {
      action,
      isSelection,
      resultText: aiResultText,
      improvedContent: aiResultText,
      summary: aiResultText,
      sourceGrounded: hasSourceMaterial,
      sourceMaterialTitle: hasSourceMaterial ? sourceMaterialTitle : null
    };
  }

  /**
   * 8. Ask My Notes: Semantic/Keyword AI Search across the student's personal notes
   */
  public static async askMyNotes(userId: string, question: string) {
    const cleanQ = question.trim().toLowerCase();
    const notes = await prisma.studyNote.findMany({
      where: {
        userId,
        isArchived: false
      },
      select: {
        id: true,
        title: true,
        subject: true,
        topic: true,
        content: true,
        summary: true,
        tags: true,
        updatedAt: true
      },
      take: 20,
      orderBy: { updatedAt: 'desc' }
    });

    if (notes.length === 0) {
      return {
        answer: 'You have not created any notes yet. Create a note from your lecture or with AI to ask questions across your personal knowledge base.',
        matchedNotes: []
      };
    }

    // Find notes containing relevant keywords
    const tokens = cleanQ.split(/\s+/).filter(t => t.length > 3);
    const scored = notes.map(n => {
      let score = 0;
      const text = `${n.title} ${n.topic || ''} ${n.subject} ${n.content} ${n.tags || ''}`.toLowerCase();
      for (const t of tokens) {
        if (text.includes(t)) score += 1;
      }
      return { note: n, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topMatches = scored.slice(0, 3).map(s => s.note);

    const context = topMatches.map((n, idx) => `[Note ${idx + 1}: "${n.title}" (${n.subject} - ${n.topic || ''})]:\n${n.content.slice(0, 800)}`).join('\n\n');

    const openai = this.getOpenAI();
    let answer = '';

    if (openai) {
      try {
        const res = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant answering questions using the student\'s personal medical study notes. Reference their specific notes where possible.'
            },
            {
              role: 'user',
              content: `Question: "${question}"\n\nStudent\'s Relevant Notes:\n${context}`
            }
          ],
          temperature: 0.2
        });
        answer = res.choices[0]?.message?.content || '';
      } catch (err) {
        console.warn('OpenAI askMyNotes error:', err);
      }
    }

    if (!answer) {
      answer = `Based on your notes ("${topMatches[0].title}"), here is the core reference: ${topMatches[0].content.slice(0, 300)}...`;
    }

    return {
      answer,
      matchedNotes: topMatches.map(n => ({
        id: n.id,
        title: n.title,
        subject: n.subject,
        topic: n.topic
      }))
    };
  }
  public static async deleteNote(userId: string, noteId: string): Promise<boolean> {
    const existing = await prisma.studyNote.findFirst({
      where: { id: noteId, userId }
    });
    if (!existing) {
      throw new Error("Note not found or unauthorized.");
    }
    await prisma.noteVersion.deleteMany({ where: { noteId } });
    await prisma.studyNote.delete({ where: { id: noteId } });
    return true;
  }
}

export const smartNotesService = SmartNotesService;
export default SmartNotesService;
