import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'survey.db');

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      // Enable foreign keys
      dbInstance.run('PRAGMA foreign_keys = ON;');
      console.log('Loaded existing SQLite database from', DB_PATH);
    } catch (err) {
      console.error('Error reading existing DB file, creating fresh DB:', err);
      dbInstance = new SQL.Database();
      dbInstance.run('PRAGMA foreign_keys = ON;');
      initializeSchema(dbInstance);
      saveDb(dbInstance);
    }
  } else {
    console.log('Creating new SQLite database at', DB_PATH);
    dbInstance = new SQL.Database();
    dbInstance.run('PRAGMA foreign_keys = ON;');
    initializeSchema(dbInstance);
    await seedInitialData(dbInstance);
    saveDb(dbInstance);
  }

  return dbInstance;
}

export function saveDb(db: Database = dbInstance!): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

function initializeSchema(db: Database): void {
  db.run(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      account_status TEXT NOT NULL DEFAULT 'active' CHECK(account_status IN ('active', 'disabled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- Sessions table for secure session-based authentication
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

    -- Password reset tokens
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Surveys table
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      intro_text TEXT,
      public_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
      require_auth INTEGER NOT NULL DEFAULT 0,
      allow_multiple INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);
    CREATE INDEX IF NOT EXISTS idx_surveys_public_id ON surveys(public_id);
    CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);

    -- Questions table
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL CHECK(question_type IN ('single_choice', 'multiple_choice', 'text', 'yes_no', 'rating', 'dropdown')),
      is_required INTEGER NOT NULL DEFAULT 0,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_questions_survey_id ON questions(survey_id);

    -- Options table for choice and dropdown questions
    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id);

    -- Responses table
    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER NOT NULL,
      respondent_hash TEXT,
      user_id INTEGER,
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON responses(survey_id);

    -- Answers table
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      response_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answer_value TEXT NOT NULL,
      FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_answers_response_id ON answers(response_id);
    CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

    -- Audit Logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id INTEGER,
      admin_name TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `);
}

async function seedInitialData(db: Database): Promise<void> {
  const now = new Date().toISOString();
  // Default administrator: admin@surveypulse.io / Admin123!
  const adminHash = bcrypt.hashSync('Admin123!', 10);
  const userHash = bcrypt.hashSync('User123!', 10);

  // Seed Admin
  db.run(
    `INSERT INTO users (name, email, password_hash, role, account_status, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', 'active', ?, ?)`,
    ['System Administrator', 'admin@surveypulse.io', adminHash, now, now]
  );

  // Seed Standard User
  db.run(
    `INSERT INTO users (name, email, password_hash, role, account_status, created_at, updated_at)
     VALUES (?, ?, ?, 'user', 'active', ?, ?)`,
    ['Alex Rivera (Researcher)', 'alex.rivera@example.com', userHash, now, now]
  );

  // Seed a second user
  db.run(
    `INSERT INTO users (name, email, password_hash, role, account_status, created_at, updated_at)
     VALUES (?, ?, ?, 'user', 'active', ?, ?)`,
    ['Elena Gomez (Product Mgr)', 'elena.gomez@example.com', userHash, now, now]
  );

  // Get user IDs
  const adminIdResult = queryOne<{ id: number }>(db, 'SELECT id FROM users WHERE email = ?', ['admin@surveypulse.io']);
  const alexIdResult = queryOne<{ id: number }>(db, 'SELECT id FROM users WHERE email = ?', ['alex.rivera@example.com']);
  const adminId = adminIdResult?.id || 1;
  const alexId = alexIdResult?.id || 2;

  // Add initial Audit Log
  db.run(
    `INSERT INTO audit_logs (admin_user_id, admin_name, action, target_type, target_id, details, created_at)
     VALUES (?, ?, 'SYSTEM_INIT', 'SYSTEM', '1', 'Initial database bootstrap with secure roles and audit logging', ?)`,
    [adminId, 'System Administrator', now]
  );

  // Seed a comprehensive published survey for Alex
  const surveyPublicId = 'feedback-2026-campus';
  db.run(
    `INSERT INTO surveys (user_id, title, description, intro_text, public_id, status, require_auth, allow_multiple, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'published', 0, 0, ?, ?)`,
    [
      alexId,
      'Campus Student Experience & Tech Feedback',
      'Help us evaluate library resources, study spaces, campus Wi-Fi, and digital learning tools.',
      'Thank you for taking 3 minutes to share your honest thoughts with university administration.',
      surveyPublicId,
      now,
      now,
    ]
  );

  const surveyRow = queryOne<{ id: number }>(db, 'SELECT id FROM surveys WHERE public_id = ?', [surveyPublicId]);
  if (!surveyRow) return;
  const surveyId = surveyRow.id;

  // Q1: Rating - Campus WiFi
  db.run(
    `INSERT INTO questions (survey_id, question_text, question_type, is_required, display_order, created_at)
     VALUES (?, ?, 'rating', 1, 1, ?)`,
    [surveyId, 'How would you rate campus Wi-Fi speed and reliability in the academic buildings?', now]
  );

  // Q2: Single choice - Academic level
  db.run(
    `INSERT INTO questions (survey_id, question_text, question_type, is_required, display_order, created_at)
     VALUES (?, ?, 'single_choice', 1, 2, ?)`,
    [surveyId, 'What is your current academic year / status?', now]
  );
  const q2 = queryOne<{ id: number }>(db, 'SELECT id FROM questions WHERE survey_id = ? AND display_order = 2', [surveyId])!;
  const q2Opts = ['First-Year Undergraduate', 'Sophomore / Junior', 'Senior Undergraduate', 'Graduate / Doctoral'];
  q2Opts.forEach((opt, idx) => {
    db.run(`INSERT INTO options (question_id, option_text, display_order) VALUES (?, ?, ?)`, [q2.id, opt, idx + 1]);
  });

  // Q3: Multiple choice - Facilities used
  db.run(
    `INSERT INTO questions (survey_id, question_text, question_type, is_required, display_order, created_at)
     VALUES (?, ?, 'multiple_choice', 0, 3, ?)`,
    [surveyId, 'Which campus study spaces do you utilize most frequently? (Select all that apply)', now]
  );
  const q3 = queryOne<{ id: number }>(db, 'SELECT id FROM questions WHERE survey_id = ? AND display_order = 3', [surveyId])!;
  const q3Opts = ['Main Central Library', 'Student Innovation Center', 'Department Labs', 'Outdoor Courtyards', 'Dorm Study Lounges'];
  q3Opts.forEach((opt, idx) => {
    db.run(`INSERT INTO options (question_id, option_text, display_order) VALUES (?, ?, ?)`, [q3.id, opt, idx + 1]);
  });

  // Q4: Yes / No - Recommend
  db.run(
    `INSERT INTO questions (survey_id, question_text, question_type, is_required, display_order, created_at)
     VALUES (?, ?, 'yes_no', 1, 4, ?)`,
    [surveyId, 'Would you recommend the campus digital learning portal to incoming students?', now]
  );

  // Q5: Dropdown - Preferred operating system
  db.run(
    `INSERT INTO questions (survey_id, question_text, question_type, is_required, display_order, created_at)
     VALUES (?, ?, 'dropdown', 0, 5, ?)`,
    [surveyId, 'What primary operating system do you use for coursework?', now]
  );
  const q5 = queryOne<{ id: number }>(db, 'SELECT id FROM questions WHERE survey_id = ? AND display_order = 5', [surveyId])!;
  const q5Opts = ['macOS', 'Windows 11', 'Linux / Ubuntu', 'ChromeOS / Tablet'];
  q5Opts.forEach((opt, idx) => {
    db.run(`INSERT INTO options (question_id, option_text, display_order) VALUES (?, ?, ?)`, [q5.id, opt, idx + 1]);
  });

  // Q6: Open-ended text
  db.run(
    `INSERT INTO questions (survey_id, question_text, question_type, is_required, display_order, created_at)
     VALUES (?, ?, 'text', 0, 6, ?)`,
    [surveyId, 'What single improvement would most enhance your daily academic workflow?', now]
  );

  // Seed sample responses so charts have immediate real database records
  const sampleResponses = [
    { rating: '5', year: 'Senior Undergraduate', facilities: ['Main Central Library', 'Student Innovation Center'], rec: 'Yes', os: 'macOS', feedback: 'Extend library hours during finals week and add more power outlets near the window desks.' },
    { rating: '4', year: 'Sophomore / Junior', facilities: ['Student Innovation Center', 'Department Labs'], rec: 'Yes', os: 'Windows 11', feedback: 'The booking system for group study rooms could have a mobile notification reminder.' },
    { rating: '3', year: 'First-Year Undergraduate', facilities: ['Dorm Study Lounges', 'Main Central Library'], rec: 'Yes', os: 'macOS', feedback: 'Better Wi-Fi coverage on the west terrace.' },
    { rating: '5', year: 'Graduate / Doctoral', facilities: ['Department Labs'], rec: 'Yes', os: 'Linux / Ubuntu', feedback: 'More GPU compute node access for graduate research projects.' },
    { rating: '4', year: 'Sophomore / Junior', facilities: ['Main Central Library'], rec: 'No', os: 'Windows 11', feedback: 'Easier access to course reserve e-textbooks.' },
    { rating: '2', year: 'First-Year Undergraduate', facilities: ['Outdoor Courtyards', 'Dorm Study Lounges'], rec: 'No', os: 'ChromeOS / Tablet', feedback: 'Campus app disconnects frequently.' },
    { rating: '5', year: 'Senior Undergraduate', facilities: ['Main Central Library', 'Department Labs'], rec: 'Yes', os: 'Windows 11', feedback: 'Quiet study floors are fantastic and very well kept.' }
  ];

  const q1 = queryOne<{ id: number }>(db, 'SELECT id FROM questions WHERE survey_id = ? AND display_order = 1', [surveyId])!;
  const q4 = queryOne<{ id: number }>(db, 'SELECT id FROM questions WHERE survey_id = ? AND display_order = 4', [surveyId])!;
  const q6 = queryOne<{ id: number }>(db, 'SELECT id FROM questions WHERE survey_id = ? AND display_order = 6', [surveyId])!;

  for (const resp of sampleResponses) {
    const respTime = new Date(Date.now() - Math.floor(Math.random() * 86400000 * 5)).toISOString();
    db.run(
      `INSERT INTO responses (survey_id, respondent_hash, submitted_at) VALUES (?, ?, ?)`,
      [surveyId, 'sample_hash_' + Math.random().toString(36).substring(2, 9), respTime]
    );
    const respRow = queryOne<{ id: number }>(db, 'SELECT last_insert_rowid() as id', [])!;
    const responseId = respRow.id;

    // A1
    db.run(`INSERT INTO answers (response_id, question_id, answer_value) VALUES (?, ?, ?)`, [responseId, q1.id, resp.rating]);
    // A2
    db.run(`INSERT INTO answers (response_id, question_id, answer_value) VALUES (?, ?, ?)`, [responseId, q2.id, resp.year]);
    // A3 (multi)
    for (const f of resp.facilities) {
      db.run(`INSERT INTO answers (response_id, question_id, answer_value) VALUES (?, ?, ?)`, [responseId, q3.id, f]);
    }
    // A4
    db.run(`INSERT INTO answers (response_id, question_id, answer_value) VALUES (?, ?, ?)`, [responseId, q4.id, resp.rec]);
    // A5
    db.run(`INSERT INTO answers (response_id, question_id, answer_value) VALUES (?, ?, ?)`, [responseId, q5.id, resp.os]);
    // A6
    if (resp.feedback) {
      db.run(`INSERT INTO answers (response_id, question_id, answer_value) VALUES (?, ?, ?)`, [responseId, q6.id, resp.feedback]);
    }
  }

  // Seed a draft survey for Alex
  db.run(
    `INSERT INTO surveys (user_id, title, description, intro_text, public_id, status, require_auth, allow_multiple, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'draft', 0, 0, ?, ?)`,
    [
      alexId,
      'Annual Alumni Career Trajectory Survey (Draft)',
      'Tracking graduate employment trends, post-degree satisfaction, and salary brackets.',
      'We appreciate your participation in helping shape future curriculum.',
      'alumni-careers-2026',
      now,
      now,
    ]
  );
}

// Parameterized query helper: returns array of objects
export function queryAll<T = Record<string, unknown>>(db: Database, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as (number | string | null | Uint8Array)[]);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

// Parameterized query helper: returns single object or null
export function queryOne<T = Record<string, unknown>>(db: Database, sql: string, params: unknown[] = []): T | null {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as (number | string | null | Uint8Array)[]);
    if (stmt.step()) {
      return stmt.getAsObject() as unknown as T;
    }
    return null;
  } finally {
    stmt.free();
  }
}

let inTransaction = false;

// Parameterized execute helper (INSERT, UPDATE, DELETE)
export function execute(db: Database, sql: string, params: unknown[] = []): { lastInsertRowId: number; changes: number } {
  db.run(sql, params as (number | string | null | Uint8Array)[]);
  const idRow = queryOne<{ id: number }>(db, 'SELECT last_insert_rowid() as id', []);
  const changesRow = queryOne<{ changes: number }>(db, 'SELECT changes() as changes', []);
  if (!inTransaction) {
    saveDb(db);
  }
  return {
    lastInsertRowId: idRow?.id || 0,
    changes: changesRow?.changes || 0,
  };
}

// Transaction execution helper
export function runInTransaction<R>(db: Database, callback: () => R): R {
  inTransaction = true;
  db.run('BEGIN TRANSACTION;');
  try {
    const result = callback();
    db.run('COMMIT;');
    inTransaction = false;
    saveDb(db);
    return result;
  } catch (error) {
    try {
      db.run('ROLLBACK;');
    } catch (rbErr) {
      // rollback may fail if transaction already aborted
    }
    inTransaction = false;
    throw error;
  }
}
