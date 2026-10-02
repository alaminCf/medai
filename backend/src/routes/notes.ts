import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { SmartNotesService } from '../services/notes/smartNotesService';

const router = Router();
router.use(authenticate);

/**
 * 1. GET /api/notes
 * List student notes with rich search, subject/topic/type filters, archive, and sorting
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      subject,
      topic,
      noteType,
      materialId,
      isPinned,
      isFavorite,
      isArchived,
      search,
      tag,
      sortBy
    } = req.query;

    const notes = await SmartNotesService.listNotes(userId, {
      subject: subject ? String(subject) : undefined,
      topic: topic ? String(topic) : undefined,
      noteType: noteType ? String(noteType) : undefined,
      materialId: materialId ? String(materialId) : undefined,
      isPinned: isPinned !== undefined ? isPinned === 'true' : undefined,
      isFavorite: isFavorite !== undefined ? isFavorite === 'true' : undefined,
      isArchived: isArchived !== undefined ? isArchived === 'true' : undefined,
      search: search ? String(search) : undefined,
      tag: tag ? String(tag) : undefined,
      sortBy: sortBy as any
    });

    res.json({ notes });
  } catch (error: any) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch study notes.' });
  }
});

/**
 * 2. POST /api/notes
 * Create a new personal, material-based, AI-generated, or viva study note
 */
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      title,
      content,
      subject,
      topic,
      tags,
      materialId,
      noteType,
      sourceType,
      summary,
      contentFormat,
      isPinned,
      isFavorite
    } = req.body;

    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required.' });
      return;
    }

    const note = await SmartNotesService.createNote(userId, {
      title,
      content,
      subject,
      topic,
      tags,
      materialId,
      noteType,
      sourceType,
      summary,
      contentFormat,
      isPinned,
      isFavorite
    });

    res.status(201).json({ note });
  } catch (error: any) {
    console.error('Error creating note:', error);
    res.status(500).json({ error: error.message || 'Failed to create study note.' });
  }
});

/**
 * 3. POST /api/notes/check-duplicate
 * Detects if a note on this topic/title already exists in user's library
 */
router.post('/check-duplicate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { title, topic } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required.' });
      return;
    }

    const result = await SmartNotesService.checkDuplicate(userId, title, topic);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Duplicate check failed.' });
  }
});

/**
 * 4. POST /api/notes/ask-my-notes
 * AI assistant that queries across the student's personal notes library
 */
router.post('/ask-my-notes', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { question } = req.body;

    if (!question || !question.trim()) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    const result = await SmartNotesService.askMyNotes(userId, question);
    res.json(result);
  } catch (error: any) {
    console.error('Error in ask-my-notes:', error);
    res.status(500).json({ error: error.message || 'Failed to search personal notes.' });
  }
});

/**
 * 5. GET /api/notes/:id
 * Retrieve full note with source material, versions, flashcards, MCQs, and related notes
 */
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const note = await SmartNotesService.getNote(userId, id);
    res.json({ note });
  } catch (error: any) {
    res.status(404).json({ error: error.message || 'Note not found.' });
  }
});

/**
 * 6. PUT /api/notes/:id
 * Autosave / Update note with version snapshot control and conflict detection
 */
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const note = await SmartNotesService.updateNote(userId, id, req.body);
    res.json({ note });
  } catch (error: any) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: error.message || 'Failed to update study note.' });
  }
});

/**
 * 7. POST /api/notes/:id/versions/:version/restore
 * Restore previous snapshot without erasing version history
 */
router.post('/:id/versions/:version/restore', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id, version } = req.params;

    const note = await SmartNotesService.restoreVersion(userId, id, parseInt(version, 10));
    res.json({ note, message: `Version ${version} restored successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to restore note version.' });
  }
});

/**
 * 8. DELETE /api/notes/:id
 * Permanently delete note (after explicit student confirmation)
 */
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await SmartNotesService.getNote(userId, id);
    if (!existing) {
      res.status(404).json({ error: 'Note not found.' });
      return;
    }

    // Cascade delete versions via prisma
    const prismaModule = require('../utils/prisma').default;
    await prismaModule.studyNote.delete({ where: { id } });

    res.json({ success: true, message: 'Note deleted permanently.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete note.' });
  }
});

/**
 * 9. POST /api/notes/:id/ai-action
 * High-Yield AI transformations: selection-based or full-note, source-grounded
 */
router.post('/:id/ai-action', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { action, selectedText, customPrompt, useBroaderKnowledge } = req.body;

    if (!action) {
      res.status(400).json({ error: 'AI action name is required.' });
      return;
    }

    const result = await SmartNotesService.executeAIAction({
      userId,
      noteId: id,
      action,
      selectedText,
      customPrompt,
      useBroaderKnowledge
    });

    res.json(result);
  } catch (error: any) {
    console.error('Note AI action error:', error);
    res.status(500).json({ error: error.message || 'Failed to process AI note action.' });
  }
});

export default router;
