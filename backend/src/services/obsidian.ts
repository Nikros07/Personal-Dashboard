import fetch from 'node-fetch';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

const OBSIDIAN_API_URL = process.env.OBSIDIAN_API_URL || 'http://127.0.0.1:27124';
const OBSIDIAN_API_KEY = process.env.OBSIDIAN_API_KEY || '';

interface ObsidianNote {
  path: string;
  content: string;
  frontmatter?: Record<string, any>;
  tags?: string[];
}

interface VaultFile {
  path: string;
  size: number;
  mtime: number;
  type: 'file' | 'folder';
}

export const obsidianService = {
  async init() {
    if (!OBSIDIAN_API_KEY) {
      console.warn('⚠️  Obsidian API key not configured. Obsidian sync disabled.');
      return;
    }
    console.log('📚 Obsidian service initialized');
    
    // Test connection
    try {
      await this.testConnection();
      console.log('✅ Obsidian API connection successful');
    } catch (err) {
      console.error('❌ Obsidian API connection failed:', err);
    }
  },

  async testConnection() {
    const res = await fetch(`${OBSIDIAN_API_URL}/vault/`, {
      headers: { 'Authorization': `Bearer ${OBSIDIAN_API_KEY}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async listFiles(path = ''): Promise<VaultFile[]> {
    const res = await fetch(`${OBSIDIAN_API_URL}/vault/${path}`, {
      headers: { 'Authorization': `Bearer ${OBSIDIAN_API_KEY}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async readNote(path: string): Promise<ObsidianNote> {
    const res = await fetch(`${OBSIDIAN_API_URL}/vault/${path}`, {
      headers: { 'Authorization': `Bearer ${OBSIDIAN_API_KEY}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const content = await res.text();
    const { frontmatter, tags, cleanContent } = this.parseFrontmatter(content);
    
    return {
      path,
      content: cleanContent,
      frontmatter,
      tags
    };
  },

  async writeNote(path: string, content: string): Promise<void> {
    const res = await fetch(`${OBSIDIAN_API_URL}/vault/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${OBSIDIAN_API_KEY}`,
        'Content-Type': 'text/markdown; charset=utf-8'
      },
      body: content
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },

  async deleteNote(path: string): Promise<void> {
    const res = await fetch(`${OBSIDIAN_API_URL}/vault/${path}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${OBSIDIAN_API_KEY}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },

  async searchNotes(query: string): Promise<any[]> {
    const res = await fetch(`${OBSIDIAN_API_URL}/search/${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${OBSIDIAN_API_KEY}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  parseFrontmatter(content: string): { frontmatter: Record<string, any> | null; tags: string[]; cleanContent: string } {
    const fmRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(fmRegex);
    
    if (!match) {
      return { frontmatter: null, tags: [], cleanContent: content };
    }

    try {
      const frontmatter = this.parseYAML(match[1]);
      const tags = frontmatter.tags ? (Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags]) : [];
      return { frontmatter, tags, cleanContent: match[2] };
    } catch {
      return { frontmatter: null, tags: [], cleanContent: content };
    }
  },

  parseYAML(yaml: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = yaml.split('\n');
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value.replace(/'/g, '"'));
        } catch {
          value = value.slice(1, -1).split(',').map(v => v.trim());
        }
      }
      
      // Parse numbers
      if (!isNaN(Number(value)) && value !== '') {
        value = Number(value);
      }
      
      // Parse booleans
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      
      result[key] = value;
    }
    
    return result;
  },

  async syncVaultToDb() {
    console.log('🔄 Syncing Obsidian vault to database...');
    const files = await this.listFiles('');
    const markdownFiles = this.getMarkdownFiles(files);
    
    let synced = 0;
    for (const file of markdownFiles) {
      try {
        const note = await this.readNote(file.path);
        await this.upsertNote(note);
        synced++;
      } catch (err) {
        console.error(`Failed to sync ${file.path}:`, err);
      }
    }
    
    console.log(`✅ Synced ${synced} notes`);
    return synced;
  },

  getMarkdownFiles(files: VaultFile[]): VaultFile[] {
    const result: VaultFile[] = [];
    
    for (const file of files) {
      if (file.type === 'file' && file.path.endsWith('.md')) {
        result.push(file);
      } else if (file.type === 'folder') {
        const subFiles = await this.listFiles(file.path);
        result.push(...this.getMarkdownFiles(subFiles));
      }
    }
    
    return result;
  },

  async upsertNote(note: ObsidianNote) {
    const now = Date.now();
    const id = this.generateNoteId(note.path);
    
    const stmt = db.prepare(`
      INSERT INTO notes (id, path, title, content, tags, frontmatter, created_at, updated_at, vault_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        tags = excluded.tags,
        frontmatter = excluded.frontmatter,
        updated_at = excluded.updated_at
    `);
    
    const title = note.frontmatter?.title || note.path.split('/').pop()?.replace('.md', '') || 'Untitled';
    
    stmt.run(
      id,
      note.path,
      title,
      note.content,
      JSON.stringify(note.tags || []),
      JSON.stringify(note.frontmatter || {}),
      now,
      now,
      note.path
    );

    // Update search index
    await this.updateSearchIndex({
      id,
      type: 'note',
      title,
      content: note.content,
      tags: JSON.stringify(note.tags || []),
      path: note.path,
      project_id: note.frontmatter?.project || null,
      created_at: now
    });
  },

  async updateSearchIndex(doc: any) {
    const stmt = db.prepare(`
      INSERT INTO search_index (id, type, title, content, tags, path, project_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        tags = excluded.tags,
        path = excluded.path,
        project_id = excluded.project_id
    `);
    
    stmt.run(doc.id, doc.type, doc.title, doc.content, doc.tags, doc.path, doc.project_id, doc.created_at);
  },

  generateNoteId(path: string): string {
    // Deterministic ID based on path
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
      hash = ((hash << 5) - hash) + path.charCodeAt(i);
      hash |= 0;
    }
    return `note_${Math.abs(hash).toString(16)}`;
  }
};