import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getDb, queryOne, queryAll, execute, runInTransaction } from '../db.ts';
import { requireAuth, createRateLimiter, sanitizeCsvField } from '../middleware.ts';

export const responseRouter = Router();

// Rate limiter for public survey submission (100 per minute per IP)
const submissionLimiter = createRateLimiter(100, 60 * 1000, 'Too many submissions. Please wait a moment before trying again.');

// POST /api/responses/submit/:publicId - Public submission
responseRouter.post('/submit/:publicId', submissionLimiter, async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    const { answers } = req.body; // map of questionId -> value | array of values

    if (!answers || typeof answers !== 'object') {
      res.status(400).json({ error: 'Invalid submission data: answers payload is required.' });
      return;
    }

    const db = await getDb();
    const survey = queryOne<{
      id: number;
      title: string;
      status: string;
      require_auth: number;
      allow_multiple: number;
    }>(db, 'SELECT id, title, status, require_auth, allow_multiple FROM surveys WHERE public_id = ?', [publicId]);

    if (!survey) {
      res.status(404).json({ error: 'Survey not found.' });
      return;
    }

    if (survey.status !== 'published') {
      res.status(403).json({ error: 'This survey is not currently accepting responses.' });
      return;
    }

    if (survey.require_auth && !req.user) {
      res.status(401).json({ error: 'Authentication is required to participate in this survey.' });
      return;
    }

    // IP Hash for duplicate spam prevention
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.ip || req.socket.remoteAddress || 'unknown';
    const respondentHash = crypto.createHash('sha256').update(rawIp + publicId).digest('hex').substring(0, 32);

    // Prevent accidental rapid double-clicks (within 2 seconds)
    const recentSubmission = queryOne<{ id: number; submitted_at: string }>(
      db,
      `SELECT id, submitted_at FROM responses 
       WHERE survey_id = ? AND respondent_hash = ? 
       ORDER BY id DESC LIMIT 1`,
      [survey.id, respondentHash]
    );

    if (recentSubmission) {
      const timeDiff = Date.now() - new Date(recentSubmission.submitted_at).getTime();
      if (timeDiff < 2000) { // 2 seconds double click throttle
        res.status(429).json({ error: 'Your response was just recorded! Please wait a moment.' });
        return;
      }
    }

    // Load survey questions and options to validate answers server-side
    const questions = queryAll<{
      id: number;
      question_text: string;
      question_type: string;
      is_required: number;
    }>(db, 'SELECT id, question_text, question_type, is_required FROM questions WHERE survey_id = ?', [survey.id]);

    const validatedAnswers: { question_id: number; value: string }[] = [];
    const errors: Record<string, string> = {};

    for (const q of questions) {
      const submittedValue = answers[q.id];

      // Check required
      const isEmpty =
        submittedValue === undefined ||
        submittedValue === null ||
        submittedValue === '' ||
        (Array.isArray(submittedValue) && submittedValue.length === 0);

      if (q.is_required && isEmpty) {
        errors[q.id] = `This question is required: "${q.question_text}"`;
        continue;
      }

      if (isEmpty) {
        continue; // Optional question skipped
      }

      // Validate based on question type
      if (q.question_type === 'rating') {
        const ratingNum = parseInt(submittedValue, 10);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
          errors[q.id] = 'Rating must be an integer between 1 and 5.';
          continue;
        }
        validatedAnswers.push({ question_id: q.id, value: String(ratingNum) });
      } else if (q.question_type === 'yes_no') {
        const val = String(submittedValue).trim();
        if (val !== 'Yes' && val !== 'No') {
          errors[q.id] = 'Value must be either Yes or No.';
          continue;
        }
        validatedAnswers.push({ question_id: q.id, value: val });
      } else if (q.question_type === 'single_choice' || q.question_type === 'dropdown') {
        const val = String(submittedValue).trim();
        // Verify value exists in options
        const validOpt = queryOne<{ id: number }>(
          db,
          'SELECT id FROM options WHERE question_id = ? AND option_text = ?',
          [q.id, val]
        );
        if (!validOpt) {
          errors[q.id] = `Selected option is not valid for this question.`;
          continue;
        }
        validatedAnswers.push({ question_id: q.id, value: val });
      } else if (q.question_type === 'multiple_choice') {
        const values: string[] = Array.isArray(submittedValue) ? submittedValue : [submittedValue];
        const validOpts = queryAll<{ option_text: string }>(
          db,
          'SELECT option_text FROM options WHERE question_id = ?',
          [q.id]
        ).map((o) => o.option_text);

        for (const item of values) {
          const strItem = String(item).trim();
          if (validOpts.includes(strItem)) {
            validatedAnswers.push({ question_id: q.id, value: strItem });
          }
        }
      } else if (q.question_type === 'text') {
        const val = String(submittedValue).trim();
        if (val.length > 3000) {
          errors[q.id] = 'Text response exceeds maximum character limit of 3,000 characters.';
          continue;
        }
        validatedAnswers.push({ question_id: q.id, value: val });
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Please correct validation issues before submitting.', validationErrors: errors });
      return;
    }

    // Save in transaction
    const now = new Date().toISOString();
    const userId = req.user?.id || null;

    const responseId = runInTransaction(db, () => {
      const respInsert = execute(
        db,
        `INSERT INTO responses (survey_id, respondent_hash, user_id, submitted_at)
         VALUES (?, ?, ?, ?)`,
        [survey.id, respondentHash, userId, now]
      );
      const newRespId = respInsert.lastInsertRowId;

      for (const ans of validatedAnswers) {
        execute(
          db,
          `INSERT INTO answers (response_id, question_id, answer_value) VALUES (?, ?, ?)`,
          [newRespId, ans.question_id, ans.value]
        );
      }

      return newRespId;
    });

    res.status(201).json({
      message: 'Thank you! Your feedback has been recorded successfully.',
      responseId,
      submittedAt: now,
    });
  } catch (err) {
    console.error('Submit response error:', err);
    res.status(500).json({ error: 'Failed to record response. Please try again.' });
  }
});

// GET /api/responses/survey/:id/analytics - Aggregated results & analytics
responseRouter.get('/survey/:id/analytics', requireAuth, async (req: Request, res: Response) => {
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
      status: string;
      public_id: string;
      created_at: string;
    }>(db, 'SELECT id, user_id, title, description, status, public_id, created_at FROM surveys WHERE id = ?', [surveyId]);

    if (!survey) {
      res.status(404).json({ error: 'Survey not found.' });
      return;
    }

    // Check ownership or admin
    if (survey.user_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied: You do not have permission to view results for this survey.' });
      return;
    }

    // Total responses
    const totalRespRow = queryOne<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM responses WHERE survey_id = ?',
      [surveyId]
    );
    const totalResponses = totalRespRow?.count || 0;

    // Timeline breakdown (last 30 days)
    const timeline = queryAll<{ date: string; count: number }>(
      db,
      `SELECT substr(submitted_at, 1, 10) as date, COUNT(*) as count
       FROM responses
       WHERE survey_id = ?
       GROUP BY substr(submitted_at, 1, 10)
       ORDER BY date ASC`,
      [surveyId]
    );

    // Questions and answer analytics
    const questions = queryAll<{
      id: number;
      question_text: string;
      question_type: string;
      is_required: number;
      display_order: number;
    }>(db, 'SELECT * FROM questions WHERE survey_id = ? ORDER BY display_order ASC, id ASC', [surveyId]);

    const questionAnalytics = questions.map((q) => {
      // All answers for this question
      const answers = queryAll<{ answer_value: string; submitted_at: string }>(
        db,
        `SELECT a.answer_value, r.submitted_at
         FROM answers a
         JOIN responses r ON a.response_id = r.id
         WHERE a.question_id = ?
         ORDER BY r.submitted_at DESC`,
        [q.id]
      );

      const answeredCount = answers.length;

      if (['single_choice', 'multiple_choice', 'dropdown'].includes(q.question_type)) {
        const options = queryAll<{ id: number; option_text: string; display_order: number }>(
          db,
          'SELECT id, option_text, display_order FROM options WHERE question_id = ? ORDER BY display_order ASC',
          [q.id]
        );

        const counts: Record<string, number> = {};
        options.forEach((opt) => {
          counts[opt.option_text] = 0;
        });

        answers.forEach((ans) => {
          if (counts[ans.answer_value] !== undefined) {
            counts[ans.answer_value]++;
          } else {
            counts[ans.answer_value] = (counts[ans.answer_value] || 0) + 1;
          }
        });

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          answered_count: answeredCount,
          options: options.map((opt) => ({
            text: opt.option_text,
            count: counts[opt.option_text] || 0,
            percentage: answeredCount > 0 ? Math.round(((counts[opt.option_text] || 0) / answeredCount) * 100) : 0,
          })),
        };
      }

      if (q.question_type === 'yes_no') {
        let yesCount = 0;
        let noCount = 0;
        answers.forEach((ans) => {
          if (ans.answer_value === 'Yes') yesCount++;
          if (ans.answer_value === 'No') noCount++;
        });

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          answered_count: answeredCount,
          yes_count: yesCount,
          no_count: noCount,
          yes_percentage: answeredCount > 0 ? Math.round((yesCount / answeredCount) * 100) : 0,
          no_percentage: answeredCount > 0 ? Math.round((noCount / answeredCount) * 100) : 0,
        };
      }

      if (q.question_type === 'rating') {
        const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0;

        answers.forEach((ans) => {
          const num = parseInt(ans.answer_value, 10);
          if (num >= 1 && num <= 5) {
            ratingCounts[num]++;
            sum += num;
          }
        });

        const average = answeredCount > 0 ? (sum / answeredCount).toFixed(2) : '0.00';

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          answered_count: answeredCount,
          average_rating: average,
          distribution: [1, 2, 3, 4, 5].map((stars) => ({
            stars,
            count: ratingCounts[stars] || 0,
            percentage: answeredCount > 0 ? Math.round(((ratingCounts[stars] || 0) / answeredCount) * 100) : 0,
          })),
        };
      }

      // Text question: return recent responses
      return {
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        answered_count: answeredCount,
        responses: answers.map((a) => ({
          text: a.answer_value,
          submitted_at: a.submitted_at,
        })),
      };
    });

    res.json({
      survey,
      totalResponses,
      timeline,
      questions: questionAnalytics,
    });
  } catch (err) {
    console.error('Fetch survey analytics error:', err);
    res.status(500).json({ error: 'Failed to generate survey analytics.' });
  }
});

// GET /api/responses/survey/:id/export-csv - Safe CSV Export with Formula Injection Mitigation
responseRouter.get('/survey/:id/export-csv', requireAuth, async (req: Request, res: Response) => {
  try {
    const surveyId = parseInt(req.params.id, 10);
    if (isNaN(surveyId)) {
      res.status(400).json({ error: 'Invalid survey ID.' });
      return;
    }

    const db = await getDb();
    const survey = queryOne<{ id: number; user_id: number; title: string }>(
      db,
      'SELECT id, user_id, title FROM surveys WHERE id = ?',
      [surveyId]
    );

    if (!survey) {
      res.status(404).json({ error: 'Survey not found.' });
      return;
    }

    if (survey.user_id !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    const questions = queryAll<{ id: number; question_text: string }>(
      db,
      'SELECT id, question_text FROM questions WHERE survey_id = ? ORDER BY display_order ASC, id ASC',
      [surveyId]
    );

    const responses = queryAll<{ id: number; submitted_at: string }>(
      db,
      'SELECT id, submitted_at FROM responses WHERE survey_id = ? ORDER BY submitted_at ASC',
      [surveyId]
    );

    // Build header row
    const headers = ['Response ID', 'Submission Timestamp', ...questions.map((q) => q.question_text)];
    const csvRows: string[] = [];
    csvRows.push(headers.map(sanitizeCsvField).join(','));

    // Populate data rows
    for (const r of responses) {
      const answers = queryAll<{ question_id: number; answer_value: string }>(
        db,
        'SELECT question_id, answer_value FROM answers WHERE response_id = ?',
        [r.id]
      );

      // Group answers by question_id (for multiple choice questions, comma separate)
      const answerMap: Record<number, string[]> = {};
      answers.forEach((ans) => {
        if (!answerMap[ans.question_id]) {
          answerMap[ans.question_id] = [];
        }
        answerMap[ans.question_id].push(ans.answer_value);
      });

      const rowValues = [
        r.id,
        r.submitted_at,
        ...questions.map((q) => {
          const vals = answerMap[q.id] || [];
          return vals.join('; ');
        }),
      ];

      csvRows.push(rowValues.map(sanitizeCsvField).join(','));
    }

    const csvContent = csvRows.join('\r\n');
    const safeTitle = survey.title.replace(/[^a-zA-Z0-9_\-]+/g, '_').slice(0, 30);
    const filename = `${safeTitle}_results_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Failed to generate CSV export.' });
  }
});
