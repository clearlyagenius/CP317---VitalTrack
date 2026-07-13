import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "vitaltrack.db");
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

// Create users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    firstName    TEXT NOT NULL,
    lastName     TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    dateOfBirth  TEXT NOT NULL,
    sessionToken TEXT,
    createdAt    TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Add sessionToken column if upgrading from old schema
try {
  db.exec(`ALTER TABLE users ADD COLUMN sessionToken TEXT`);
} catch {
  // Column already exists — ignore
}

// Create reports table
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id        TEXT PRIMARY KEY,
    userId    TEXT NOT NULL,
    fileName  TEXT NOT NULL,
    fileSize  INTEGER NOT NULL,
    filePath  TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

// REP-3: track analysis state + AI summary on each report
try {
  db.exec(`ALTER TABLE reports ADD COLUMN analysisStatus TEXT NOT NULL DEFAULT 'pending'`);
} catch {
  // Column already exists
}
try {
  db.exec(`ALTER TABLE reports ADD COLUMN analysisSummary TEXT`);
} catch {
  // Column already exists
}

// REP-3: structured markers extracted from each report.
// One row per marker (e.g. Glucose, LDL). UI-2 reads this table to build
// trend graphs and AI-1 reads the flagged rows to generate recommendations.
db.exec(`
  CREATE TABLE IF NOT EXISTS report_markers (
    id         TEXT PRIMARY KEY,
    reportId   TEXT NOT NULL,
    userId     TEXT NOT NULL,
    name       TEXT NOT NULL,
    value      REAL NOT NULL,
    unit       TEXT NOT NULL,
    refLow     REAL,
    refHigh    REAL,
    flag       TEXT NOT NULL DEFAULT 'normal',
    explanation TEXT,
    testedAt   TEXT,
    createdAt  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (reportId) REFERENCES reports(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

try {
  db.exec(`ALTER TABLE report_markers ADD COLUMN explanation TEXT`);
} catch {
  // Column already exists
}

// Create reminders table (shared by REM-1 medication + REM-2 health activity)
db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id        TEXT PRIMARY KEY,
    userId    TEXT NOT NULL,
    name      TEXT NOT NULL,
    day       TEXT NOT NULL,
    time      TEXT NOT NULL,
    category  TEXT NOT NULL,
    frequency TEXT NOT NULL,
    notifyVia TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

// AI Chat — conversation history per user
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id        TEXT PRIMARY KEY,
    userId    TEXT NOT NULL,
    role      TEXT NOT NULL,        -- 'user' | 'assistant'
    content   TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
  )
`);

try {
  db.exec(`ALTER TABLE reminders ADD COLUMN day TEXT DEFAULT 'Every Day'`);
} catch {
  // Column already exists
}

export default db;
