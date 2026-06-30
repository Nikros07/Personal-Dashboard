import chokidar from 'chokidar';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';
import { obsidianService } from './obsidian.js';

const execAsync = promisify(exec);

const WATCH_PATHS = [
  process.env.WATCH_DOWNLOADS_PATH || 'C:/Users/spide/Downloads',
  process.env.WATCH_VAULT_PATH || 'C:/Users/spide/Desktop/Nick'
].filter(Boolean);

interface FileEvent {
  id: string;
  path: string;
  event_type: 'add' | 'change' | 'unlink';
  processed: boolean;
  result?: string;
  created_at: number;
  processed_at?: number;
}

export const fileWatcherService = {
  watcher: null as chokidar.FSWatcher | null,

  async init() {
    if (WATCH_PATHS.length === 0) {
      console.warn('⚠️  No watch paths configured. File watcher disabled.');
      return;
    }

    console.log('👁️  Starting file watcher for:', WATCH_PATHS);
    
    this.watcher = chokidar.watch(WATCH_PATHS, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
      depth: 3
    });

    this.watcher
      .on('add', (path) => this.handleEvent(path, 'add'))
      .on('change', (path) => this.handleEvent(path, 'change'))
      .on('unlink', (path) => this.handleEvent(path, 'unlink'))
      .on('error', (err) => console.error('File watcher error:', err));

    console.log('✅ File watcher started');
  },

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log('🛑 File watcher stopped');
    }
  },

  async handleEvent(path: string, eventType: 'add' | 'change' | 'unlink') {
    const event: FileEvent = {
      id: uuidv4(),
      path,
      event_type: eventType,
      processed: false,
      created_at: Date.now()
    };

    // Save event to DB
    const stmt = db.prepare(`
      INSERT INTO file_events (id, path, event_type, processed, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(event.id, event.path, event.event_type, event.processed ? 1 : 0, event.created_at);

    // Process asynchronously
    this.processEvent(event).catch(console.error);
  },

  async processEvent(event: FileEvent) {
    if (event.event_type === 'unlink') {
      await this.markProcessed(event.id);
      return;
    }

    try {
      let result: any = null;

      // Only process PDFs for summarization
      if (event.path.toLowerCase().endsWith('.pdf')) {
        result = await this.processPdf(event.path);
      }
      // Process new markdown files in vault
      else if (event.path.toLowerCase().endsWith('.md') && event.path.includes('Desktop/Nick')) {
        result = await this.processMarkdown(event.path);
      }

      await this.markProcessed(event.id, result);
    } catch (err) {
      console.error(`Failed to process ${event.path}:`, err);
      await this.markProcessed(event.id, { error: String(err) });
    }
  },

  async processPdf(pdfPath: string): Promise<any> {
    console.log(`📄 Processing PDF: ${pdfPath}`);
    
    try {
      const dataBuffer = await readFile(pdfPath);
      const pdfData = await pdfParse(dataBuffer);
      
      if (!pdfData.text || pdfData.text.trim().length < 100) {
        return { skipped: true, reason: 'PDF too short or empty' };
      }

      // Call Hermes to summarize
      const prompt = `Fasse den folgenden PDF-Inhalt in maximal 300 Wörtern auf Deutsch zusammen. 
Erstelle eine strukturierte Zusammenfassung mit:
- Hauptthema
- Wichtigste Punkte (Bullet points)
- Falls vorhanden: Handlungsschritte/Aufgaben

Inhalt:
${pdfData.text.substring(0, 8000)}`;

      const { stdout } = await execAsync(`hermes chat --query "${prompt.replace(/"/g, '\\"')}" --no-newline`);
      
      const summary = stdout.trim();
      
      // Create note in Obsidian
      const fileName = pdfPath.split(/[\\/]/).pop()?.replace('.pdf', '') || 'Unknown';
      const notePath = `Zusammenfassungen/${fileName}.md`;
      const noteContent = `# Zusammenfassung: ${fileName}

**Quelle:** \`${pdfPath}\`
**Erstellt:** ${new Date().toISOString().split('T')[0]}

---

${summary}

---

*Automatisch generiert via File Watcher + Hermes*`;

      await obsidianService.writeNote(notePath, noteContent);
      
      console.log(`✅ PDF summarized and saved to Obsidian: ${notePath}`);
      
      return { summarized: true, notePath, summaryLength: summary.length };
    } catch (err) {
      console.error('PDF processing failed:', err);
      throw err;
    }
  },

  async processMarkdown(mdPath: string): Promise<any> {
    // Could extract tasks, tags, etc. from new markdown files
    return { processed: true, type: 'markdown' };
  },

  async markProcessed(eventId: string, result?: any) {
    const stmt = db.prepare(`
      UPDATE file_events 
      SET processed = 1, processed_at = ?, result = ?
      WHERE id = ?
    `);
    stmt.run(Date.now(), result ? JSON.stringify(result) : null, eventId);
  },

  async getRecentEvents(limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM file_events 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit);
  }
};