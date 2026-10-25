import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getDb, queryOne, queryAll, execute, runInTransaction } from '../db.ts';
import { requireAuth } from '../middleware.ts';
import { logAdminAction } from '../audit.ts';

export const surveyRouter = Router();

interface QuestionPayload {
  id?: number;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'text' | 'yes_no' | 'rating' | 'dropdown';
  is_required: boolean;
  display_order: number;
  options?: { id?: number; option_text: string; display_order: number }[];
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 30);
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'survey'}-${randomSuffix}`;
}

// GET /api/surveys/my - Fetch surveys created by logged-in user
surveyRouter.get('/my', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user!.id;

    const surveys = queryAll<{
      id: number;
      title: string;
      description: string | null;
      public_id: string;
      status: string;
      require_auth: number;
      created_at: string;
      updated_at: string;
      response_count: number;
      question_count: number;
    }>(
      db,
      `SELECT s.id, s.title, s.description, s.public_id, s.status, s.require_auth, s.created_at, s.updated_at,
              (SELECT COUNT(*) FROM responses r WHERE r.survey_id = s.id) AS response_count,
              (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) AS question_count
       FROM surveys s
       WHERE s.user_id = ?
       ORDER BY s.updated_at DESC`,
      [userId]
    );

    res.json({ surveys });
  } catch (err) {
    console.error('Fetch my surveys error:', err);
    res.status(500).json({ error: 'Failed to fetch user surveys.' });
  }
});

// GET /api/surveys/public/:publicId - Public view for respondents
surveyRouter.get('/public/:publicId', async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    const db = await getDb();

    const survey = queryOne<{
      id: number;
      user_id: number;
      title: string;
      description: string | null;
      intro_text: string | null;
      public_id: string;
      status: string;
      require_auth: number;
      created_at: string;
    }>(db, 'SELECT * FROM surveys WHERE public_id = ?', [publicId]);

    if (!survey) {
      res.status(404).json({ error: 'Survey not found. The link may be incorrect or removed.' });
      return;
    }

    // If survey is draft or archived, only allow creator or admin to preview
    if (survey.status !== 'published') {
      const isOwner = req.user && req.user.id === survey.user_id;
      const isAdmin = req.user && req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        res.status(403).json({
          error: 'This survey is not currently accepting responses (status: ' + survey.status + ').',
          surveyStatus: survey.status,
        });
        return;
      }
    }

    // Check if authenticated participation is required
    if (survey.require_auth && !req.user) {
      res.status(401).json({
        error: 'This survey requires respondents to be signed in.',
        requiresAuth: true,
      });
      return;
    }

    // Fetch questions
    const questions = queryAll<{
      id: number;
      survey_id: number;
      question_text: string;
      question_type: string;
      is_required: number;
      display_order: number;
    }>(db, 'SELECT * FROM questions WHERE survey_id = ? ORDER BY display_order ASC, id ASC', [survey.id]);

    // Fetch options for questions
    const questionsWithOptions = questions.map((q) => {
      const options = queryAll<{
        id: number;
        question_id: number;
        option_text: string;
        display_order: number;
      }>(db, 'SELECT id, option_text, display_order FROM options WHERE question_id = ? ORDER BY display_order ASC, id ASC', [q.id]);
      return {
        ...q,
        is_required: !!q.is_required,
        options,
      };
    });

    res.json({
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        intro_text: survey.intro_text,
        public_id: survey.public_id,
        status: survey.status,
        created_at: survey.created_at,
        questions: questionsWithOptions,
      },
    });
  } catch (err) {
    console.error('Fetch public survey error:', err);
    res.status(500).json({ error: 'Failed to load survey.' });
  }
});

// GET /api/surveys/:id - Detailed survey fetch for owner or admin
surveyRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const surveyId = parseInt(req.params.id, 10);
    if (isNaN(surveyId)) {
      res.status(400).json({ error: 'Invalid survey ID.' });
      return;
    }

    const db = await getDb();
    const survey = queryOne<{
      id: number;
      user_id: number;
      title: string;
      description: string | null;
      intro_text: string | null;
      public_id: string;
      status: string;
      require_auth: number;
      created_at: string;
      updated_at: string;
    }>(db, 'SELECT * FROM surveys WHERE id = ?', [surveyId]);

    if (!survey) {
      res.status(404).json({ error: 'Survey not found.' });
      return;
    }

    // IDOR Protection: Must be creator or admin
    if (survey.user_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: You do not have permission to view this survey.' });
      return;
    }

    const questions = queryAll<{
      id: number;
      survey_id: number;
      question_text: string;
      question_type: string;
      is_required: number;
      display_order: number;
    }>(db, 'SELECT * FROM questions WHERE survey_id = ? ORDER BY display_order ASC, id ASC', [survey.id]);

    const questionsWithOptions = questions.map((q) => {
      const options = queryAll<{
        id: number;
        question_id: number;
        option_text: string;
        display_order: number;
      }>(db, 'SELECT id, option_text, display_order FROM options WHERE question_id = ? ORDER BY display_order ASC, id ASC', [q.id]);
      return {
        ...q,
        is_required: !!q.is_required,
        options,
      };
    });

    res.json({
      survey: {
        ...survey,
        require_auth: !!survey.require_auth,
        questions: questionsWithOptions,
      },
    });
  } catch (err) {
    console.error('Fetch survey by ID error:', err);
    res.status(500).json({ error: 'Failed to retrieve survey.' });
  }
});

// POST /api/surveys - Create a new survey with questions and options
surveyRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, intro_text, status = 'draft', require_auth = false, questions = [] } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Survey title is required.' });
      return;
    }

    const cleanTitle = title.trim();
    const cleanDesc = description ? String(description).trim() : '';
    const cleanIntro = intro_text ? String(intro_text).trim() : '';
    const surveyStatus = ['draft', 'published', 'archived'].includes(status) ? status : 'draft';

    const db = await getDb();
    const publicId = generateSlug(cleanTitle);
    const now = new Date().toISOString();
    const userId = req.user!.id;

    const newSurveyId = runInTransaction(db, () => {
      const insertResult = execute(
        db,
        `INSERT INTO surveys (user_id, title, description, intro_text, public_id, status, require_auth, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, cleanTitle, cleanDesc, cleanIntro, publicId, surveyStatus, require_auth ? 1 : 0, now, now]
      );

      const surveyId = insertResult.lastInsertRowId;

      // Insert questions
      (questions as QuestionPayload[]).forEach((q, qIndex) => {
        if (!q.question_text || !q.question_text.trim()) return;

        const qInsert = execute(
          db,
          `INSERT INTO questions (survey_id, question_text, question_type, is_required, display_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [surveyId, q.question_text.trim(), q.question_type, q.is_required ? 1 : 0, qIndex + 1, now]
        );
        const questionId = qInsert.lastInsertRowId;

        // Insert options if choice or dropdown
        if (['single_choice', 'multiple_choice', 'dropdown'].includes(q.question_type) && Array.isArray(q.options)) {
          q.options.forEach((opt, optIndex) => {
            if (opt.option_text && opt.option_text.trim()) {
              execute(
                db,
                `INSERT INTO options (question_id, option_text, display_order) VALUES (?, ?, ?)`,
                [questionId, opt.option_text.trim(), optIndex + 1]
              );
            }
          });
        }
      });

      return surveyId;
    });

    res.status(201).json({
      message: 'Survey created successfully.',
      surveyId: newSurveyId,
      publicId,
    });
  } catch (err) {
    console.error('Create survey error:', err);
    res.status(500).json({ error: 'Failed to create survey.' });
  }
});

// PUT /api/surveys/:id - Full survey update
surveyRouter.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const surveyId = parseInt(req.params.id, 10);
    if (isNaN(surveyId)) {
      res.status(400).json({ error: 'Invalid survey ID.' });
      return;
    }

    const db = await getDb();
    const existing = queryOne<{ id: number; user_id: number; public_id: string }>(
      db,
      'SELECT id, user_id, public_id FROM surveys WHERE id = ?',
      [surveyId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Survey not found.' });
      return;
    }

    // IDOR verification
    if (existing.user_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: You do not have permission to modify this survey.' });
      return;
    }

    const { title, description, intro_text, status, require_auth, questions = [] } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Survey title is required.' });
      return;
    }

    const cleanTitle = title.trim();
    const cleanDesc = description ? String(description).trim() : '';
    const cleanIntro = intro_text ? String(intro_text).trim() : '';
    const validStatus = ['draft', 'published', 'archived'].includes(status) ? status : undefined;
    const now = new Date().toISOString();

    runInTransaction(db, () => {
      // Update survey header
      if (validStatus) {
        execute(
          db,
          `UPDATE surveys SET title = ?, description = ?, intro_text = ?, status = ?, require_auth = ?, updated_at = ? WHERE id = ?`,
          [cleanTitle, cleanDesc, cleanIntro, validStatus, require_auth ? 1 : 0, now, surveyId]
        );
      } else {
        execute(
          db,
          `UPDATE surveys SET title = ?, description = ?, intro_text = ?, require_auth = ?, updated_at = ? WHERE id = ?`,
          [cleanTitle, cleanDesc, cleanIntro, require_auth ? 1 : 0, now, surveyId]
        );
      }

      // Reconcile questions:
      // To preserve data integrity for existing answers, we update matching questions or remove obsolete ones
      const oldQuestions = queryAll<{ id: number }>(db, 'SELECT id FROM questions WHERE survey_id = ?', [surveyId]);
      const incomingQuestionIds = new Set((questions as QuestionPayload[]).map((q) => q.id).filter(Boolean));

      // Delete removed questions (and their options / answers cascade)
      for (const oldQ of oldQuestions) {
        if (!incomingQuestionIds.has(oldQ.id)) {
          execute(db, 'DELETE FROM questions WHERE id = ?', [oldQ.id]);
        }
      }

      // Insert or update questions
      (questions as QuestionPayload[]).forEach((q, qIndex) => {
        if (!q.question_text || !q.question_text.trim()) return;

        let questionId: number;
        if (q.id && incomingQuestionIds.has(q.id)) {
          execute(
            db,
            `UPDATE questions SET question_text = ?, question_type = ?, is_required = ?, display_order = ? WHERE id = ?`,
            [q.question_text.trim(), q.question_type, q.is_required ? 1 : 0, qIndex + 1, q.id]
          );
          questionId = q.id;
          // Clear old options and re-insert fresh options
          execute(db, 'DELETE FROM options WHERE question_id = ?', [questionId]);
        } else {
          const insertQ = execute(
            db,
            `INSERT INTO questions (survey_id, question_text, question_type, is_required, display_order, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [surveyId, q.question_text.trim(), q.question_type, q.is_required ? 1 : 0, qIndex + 1, now]
          );
          questionId = insertQ.lastInsertRowId;
        }

        // Insert options if choice or dropdown
        if (['single_choice', 'multiple_choice', 'dropdown'].includes(q.question_type) && Array.isArray(q.options)) {
          q.options.forEach((opt, optIndex) => {
            if (opt.option_text && opt.option_text.trim()) {
              execute(
                db,
                `INSERT INTO options (question_id, option_text, display_order) VALUES (?, ?, ?)`,
                [questionId, opt.option_text.trim(), optIndex + 1]
              );
            }
          });
        }
      });
    });

    res.json({ message: 'Survey updated successfully.', publicId: existing.public_id });
  } catch (err) {
    console.error('Update survey error:', err);
    res.status(500).json({ error: 'Failed to update survey.' });
  }
});

// PATCH /api/surveys/:id/status - Toggle status
surveyRouter.patch('/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const surveyId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['draft', 'published', 'archived'].includes(status)) {
      res.status(400).json({ error: 'Invalid status value. Choose draft, published, or archived.' });
      return;
    }

    const db = await getDb();
    const existing = queryOne<{ id: number; user_id: number; title: string }>(
      db,
      'SELECT id, user_id, title FROM surveys WHERE id = ?',
      [surveyId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Survey not found.' });
      return;
    }

    if (existing.user_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: You do not have permission to modify this survey.' });
      return;
    }

    const now = new Date().toISOString();
    execute(db, 'UPDATE surveys SET status = ?, updated_at = ? WHERE id = ?', [status, now, surveyId]);

    // If an admin modified someone else's survey, log audit trail
    if (req.user!.role === 'admin' && existing.user_id !== req.user!.id) {
      await logAdminAction(
        req.user!.id,
        req.user!.name,
        'SURVEY_STATUS_CHANGE',
        'SURVEY',
        String(surveyId),
        `Admin changed survey "${existing.title}" status to ${status}`
      );
    }

    res.json({ message: `Survey status updated to ${status}.`, status });
  } catch (err) {
    console.error('Toggle status error:', err);
    res.status(500).json({ error: 'Failed to update survey status.' });
  }
});

// DELETE /api/surveys/:id - Delete survey
surveyRouter.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const surveyId = parseInt(req.params.id, 10);
    const db = await getDb();
    const existing = queryOne<{ id: number; user_id: number; title: string }>(
      db,
      'SELECT id, user_id, title FROM surveys WHERE id = ?',
      [surveyId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Survey not found.' });
      return;
    }

    if (existing.user_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: You do not have permission to delete this survey.' });
      return;
    }

    runInTransaction(db, () => {
      // Explicitly delete answers, responses, options, questions, and the survey
      execute(db, 'DELETE FROM answers WHERE response_id IN (SELECT id FROM responses WHERE survey_id = ?)', [surveyId]);
      execute(db, 'DELETE FROM responses WHERE survey_id = ?', [surveyId]);
      execute(db, 'DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE survey_id = ?)', [surveyId]);
      execute(db, 'DELETE FROM questions WHERE survey_id = ?', [surveyId]);
      execute(db, 'DELETE FROM surveys WHERE id = ?', [surveyId]);
    });

    if (req.user!.role === 'admin') {
      await logAdminAction(
        req.user!.id,
        req.user!.name,
        'SURVEY_DELETE',
        'SURVEY',
        String(surveyId),
        `Deleted survey: "${existing.title}" (Original Owner: User #${existing.user_id})`
      );
    }

    res.json({ message: 'Survey and all associated responses deleted successfully.' });
  } catch (err) {
    console.error('Delete survey error:', err);
    res.status(500).json({ error: 'Failed to delete survey.' });
  }
});
