import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = join(DATA_DIR, 'dashboard.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // Notes table (synced from Obsidian)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      title TEXT,
      content TEXT,
      tags TEXT, -- JSON array
      frontmatter TEXT, -- JSON
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      vault_path TEXT
    );
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending', -- pending, in_progress, done, cancelled
      priority INTEGER DEFAULT 0, -- 0=low, 1=medium, 2=high, 3=urgent
      due_date INTEGER,
      repeat_rule TEXT, -- RRULE string
      project_id TEXT,
      note_id TEXT, -- Link to Obsidian note
      tags TEXT, -- JSON array
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (note_id) REFERENCES notes(id)
    );
  `);

  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      git_repo TEXT,
      git_branch TEXT DEFAULT 'main',
      vault_path TEXT,
      color TEXT,
      icon TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Chat logs (for memory review)
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_logs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL, -- user, assistant, system
      content TEXT NOT NULL,
      metadata TEXT, -- JSON (model, tokens, etc.)
      created_at INTEGER NOT NULL
    );
  `);

  // File watcher events
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_events (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      event_type TEXT NOT NULL, -- add, change, unlink
      processed BOOLEAN DEFAULT 0,
      result TEXT, -- JSON result of processing
      created_at INTEGER NOT NULL,
      processed_at INTEGER
    );
  `);

  // System metrics (for monitoring widgets)
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpu_usage REAL,
      memory_used BIGINT,
      memory_total BIGINT,
      disk_used BIGINT,
      disk_total BIGINT,
      gpu_usage REAL,
      gpu_temp REAL,
      cpu_temp REAL,
      created_at INTEGER NOT NULL
    );
  `);

  // Search index (FTS5 virtual table)
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      id UNINDEXED,
      type TEXT, -- note, task, chat, file
      title,
      content,
      tags,
      path,
      project_id UNINDEXED,
      created_at UNINDEXED
    );
  `);

  // Indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_path ON notes(path);
    CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes(tags);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_logs(session_id);
    CREATE INDEX IF NOT EXISTS idx_file_events_processed ON file_events(processed);
    CREATE INDEX IF NOT EXISTS idx_system_metrics_created ON system_metrics(created_at);
  `);

  console.log('Database initialized at', DB_PATH);
}

export function closeDatabase() {
  db.close();
}