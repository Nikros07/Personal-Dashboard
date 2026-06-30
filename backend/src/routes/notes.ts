import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { obsidianService } from '../services/obsidian.js';

const NoteSchema = z.object({
  path: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  frontmatter: z.record(z.any()).optional()
});

export async function notesRoutes(app: FastifyInstance) {
  // Get all notes (with pagination)
  app.get('/', async (request, reply) => {
    const { limit = 50, offset = 0, tag, project } = request.query as any;
    
    let query = 'SELECT * FROM notes';
    const params: any[] = [];
    
    const conditions = [];
    if (tag) {
      conditions.push('tags LIKE ?');
      params.push(`%"${tag}"%`);
    }
    if (project) {
      conditions.push('frontmatter LIKE ?');
      params.push(`%"project":"${project}"%`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    
    const stmt = db.prepare(query);
    const notes = stmt.all(...params);
    
    // Parse JSON fields
    return notes.map(n => ({
      ...n,
      tags: JSON.parse(n.tags || '[]'),
      frontmatter: JSON.parse(n.frontmatter || '{}')
    }));
  });

  // Get single note
  app.get('/:path(*)', async (request, reply) => {
    const { path } = request.params as { path: string };
    
    const stmt = db.prepare('SELECT * FROM notes WHERE path = ?');
    const note = stmt.get(path);
    
    if (!note) {
      return reply.code(404).send({ error: 'Note not found' });
    }
    
    return {
      ...note,
      tags: JSON.parse(note.tags || '[]'),
      frontmatter: JSON.parse(note.frontmatter || '{}')
    };
  });

  // Create/Update note (sync to Obsidian)
  app.put('/:path(*)', async (request, reply) => {
    const { path } = request.params as { path: string };
    const data = NoteSchema.parse(request.body);
    
    const now = Date.now();
    const id = obsidianService.generateNoteId(path);
    const title = data.title || path.split('/').pop()?.replace('.md', '') || 'Untitled';
    
    // Build markdown content with frontmatter
    let content = '';
    if (data.frontmatter && Object.keys(data.frontmatter).length > 0) {
      content += '---\n';
      for (const [key, value] of Object.entries(data.frontmatter)) {
        if (Array.isArray(value)) {
          content += `${key}: [${value.map(v => `"${v}"`).join(', ')}]\n`;
        } else if (typeof value === 'string') {
          content += `${key}: "${value}"\n`;
        } else {
          content += `${key}: ${value}\n`;
        }
      }
      content += '---\n\n';
    }
    content += data.content || '';
    
    // Save to Obsidian
    try {
      await obsidianService.writeNote(path, content);
    } catch (err) {
      console.error('Failed to write to Obsidian:', err);
      return reply.code(500).send({ error: 'Failed to sync to Obsidian' });
    }
    
    // Update local DB
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
    
    stmt.run(
      id, path, title, data.content || '',
      JSON.stringify(data.tags || []),
      JSON.stringify(data.frontmatter || {}),
      now, now, path
    );
    
    // Update search index
    await obsidianService.updateSearchIndex({
      id, type: 'note', title, content: data.content || '',
      tags: JSON.stringify(data.tags || []), path,
      project_id: data.frontmatter?.project || null, created_at: now
    });
    
    return { success: true, id, path };
  });

  // Delete note
  app.delete('/:path(*)', async (request, reply) => {
    const { path } = request.params as { path: string };
    
    try {
      await obsidianService.deleteNote(path);
    } catch (err) {
      console.error('Failed to delete from Obsidian:', err);
    }
    
    // Remove from local DB
    db.prepare('DELETE FROM notes WHERE path = ?').run(path);
    db.prepare('DELETE FROM search_index WHERE id = ?').run(obsidianService.generateNoteId(path));
    
    return { success: true };
  });

  // Sync vault to DB
  app.post('/sync', async (request, reply) => {
    const count = await obsidianService.syncVaultToDb();
    return { success: true, synced: count };
  });

  // Get note content from Obsidian directly (live)
  app.get('/:path(*)/live', async (request, reply) => {
    const { path } = request.params as { path: string };
    
    try {
      const note = await obsidianService.readNote(path);
      return note;
    } catch (err) {
      return reply.code(404).send({ error: 'Note not found in vault' });
    }
  });
}