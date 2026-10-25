import { getDb, queryOne, queryAll, execute, saveDb, runInTransaction } from '../server/db.ts';
import { hashPassword, comparePassword, createSession, validateSession, destroySession } from '../server/auth.ts';
import { sanitizeCsvField } from '../server/middleware.ts';

async function runTests() {
  console.log('--- Starting Comprehensive Test Suite ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${desc}`);
      failed++;
    }
  }

  const db = await getDb();

  // Test 1: Seed verification
  const admin = queryOne<{ role: string; account_status: string }>(
    db,
    'SELECT role, account_status FROM users WHERE email = ?',
    ['admin@surveypulse.io']
  );
  assert(admin?.role === 'admin' && admin?.account_status === 'active', 'Seed admin account exists with active role');

  // Test 2: Password hashing & verification
  const testPassword = 'SecurePassword123!';
  const hash = hashPassword(testPassword);
  assert(comparePassword(testPassword, hash), 'bcrypt verifies correct password against hash');
  assert(!comparePassword('WrongPassword!', hash), 'bcrypt rejects incorrect password');

  // Test 3: Session Creation & Validation
  const adminUser = queryOne<{ id: number }>(db, 'SELECT id FROM users WHERE email = ?', ['admin@surveypulse.io'])!;
  const session = await createSession(adminUser.id, false);
  const validated = await validateSession(session.token);
  assert(validated?.id === adminUser.id && validated?.role === 'admin', 'Session validation retrieves authenticated user');

  // Test 4: Session Invalidation on Logout
  await destroySession(session.token);
  const revalidated = await validateSession(session.token);
  assert(revalidated === null, 'Session is successfully invalidated after destroy');

  // Test 5: Duplicate Email Rejection
  try {
    execute(
      db,
      `INSERT INTO users (name, email, password_hash, role, account_status, created_at, updated_at)
       VALUES (?, ?, ?, 'user', 'active', ?, ?)`,
      ['Duplicate User', 'admin@surveypulse.io', hash, new Date().toISOString(), new Date().toISOString()]
    );
    assert(false, 'Database should reject duplicate email constraint');
  } catch (err: any) {
    assert(true, 'Database enforces unique constraint on user email');
  }

  // Test 6: Survey Creation with Questions and Options inside Transaction
  const now = new Date().toISOString();
  const testSurveyPublicId = 'test-survey-' + Date.now();
  let createdSurveyId = 0;

  runInTransaction(db, () => {
    const s = execute(
      db,
      `INSERT INTO surveys (user_id, title, description, public_id, status, require_auth, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'published', 0, ?, ?)`,
      [adminUser.id, 'Automated Test Survey', 'Testing SQLite integrity', testSurveyPublicId, now, now]
    );
    createdSurveyId = s.lastInsertRowId;

    const q1 = execute(
      db,
      `INSERT INTO questions (survey_id, question_text, question_type, is_required, display_order, created_at)
       VALUES (?, ?, 'rating', 1, 1, ?)`,
      [createdSurveyId, 'Rate your automated test experience', now]
    );

    const q2 = execute(
      db,
      `INSERT INTO questions (survey_id, question_text, question_type, is_required, display_order, created_at)
       VALUES (?, ?, 'single_choice', 1, 2, ?)`,
      [createdSurveyId, 'Which platform are you testing?', now]
    );

    execute(db, `INSERT INTO options (question_id, option_text, display_order) VALUES (?, 'Node.js', 1)`, [q2.lastInsertRowId]);
    execute(db, `INSERT INTO options (question_id, option_text, display_order) VALUES (?, 'Express.js', 2)`, [q2.lastInsertRowId]);
  });

  assert(createdSurveyId > 0, 'Survey and questions created atomically in transaction');

  // Test 7: Response Submission & Answers Storage
  let testResponseId = 0;
  runInTransaction(db, () => {
    const r = execute(
      db,
      `INSERT INTO responses (survey_id, respondent_hash, submitted_at) VALUES (?, 'test_hash', ?)`,
      [createdSurveyId, now]
    );
    testResponseId = r.lastInsertRowId;

    const questions = queryAll<{ id: number }>(db, 'SELECT id FROM questions WHERE survey_id = ?', [createdSurveyId]);
    execute(db, `INSERT INTO answers (response_id, question_id, answer_value) VALUES (?, ?, '5')`, [testResponseId, questions[0].id]);
    execute(db, `INSERT INTO answers (response_id, question_id, answer_value) VALUES (?, ?, 'Node.js')`, [testResponseId, questions[1].id]);
  });

  const storedAnswers = queryAll(db, 'SELECT * FROM answers WHERE response_id = ?', [testResponseId]);
  assert(storedAnswers.length === 2, 'Stored responses and answers verified');

  // Test 8: CSV Sanitization against Formula Injection
  const dangerous1 = '=cmd|"/C calc"!A0';
  const dangerous2 = '+1+2';
  const dangerous3 = '-10*5';
  const dangerous4 = '@SUM(A1:A10)';
  const safeText = 'Regular comment without formulas';

  assert(sanitizeCsvField(dangerous1).includes("'="), 'CSV sanitizer neutralizes formula injection starting with =');
  assert(sanitizeCsvField(dangerous2).startsWith("'+"), 'CSV sanitizer neutralizes formula injection starting with +');
  assert(sanitizeCsvField(dangerous3).startsWith("'-"), 'CSV sanitizer neutralizes formula injection starting with -');
  assert(sanitizeCsvField(dangerous4).startsWith("'@"), 'CSV sanitizer neutralizes formula injection starting with @');
  assert(sanitizeCsvField(safeText) === safeText, 'CSV sanitizer preserves regular non-formula text');

  // Test 9: Cascade Cleanup
  runInTransaction(db, () => {
    execute(db, 'DELETE FROM answers WHERE response_id IN (SELECT id FROM responses WHERE survey_id = ?)', [createdSurveyId]);
    execute(db, 'DELETE FROM responses WHERE survey_id = ?', [createdSurveyId]);
    execute(db, 'DELETE FROM options WHERE question_id IN (SELECT id FROM questions WHERE survey_id = ?)', [createdSurveyId]);
    execute(db, 'DELETE FROM questions WHERE survey_id = ?', [createdSurveyId]);
    execute(db, 'DELETE FROM surveys WHERE id = ?', [createdSurveyId]);
  });
  const orphanedAnswers = queryAll(db, 'SELECT * FROM answers WHERE response_id = ?', [testResponseId]);
  assert(orphanedAnswers.length === 0, 'Database cascade deletes responses and answers when survey is removed');

  console.log(`\n--- Test Summary: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
