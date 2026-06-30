import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { initDatabase, closeDatabase } from './db/index.js';
import { notesRoutes } from './routes/notes.js';
import { tasksRoutes } from './routes/tasks.js';
import { projectsRoutes } from './routes/projects.js';
import { searchRoutes } from './routes/search.js';
import { systemRoutes } from './routes/system.js';
import { chatRoutes } from './routes/chat.js';
import { obsidianService } from './services/obsidian.js';
import { fileWatcherService } from './services/file-watcher.js';
import { systemMonitorService } from './services/system-monitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
});

// CORS
await app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
});

// Static files (for production frontend build)
app.register(fastifyStatic, {
  root: join(__dirname, '../../frontend/dist'),
  prefix: '/'
});

// Health check
app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));

// API Routes
app.register(notesRoutes, { prefix: '/api/notes' });
app.register(tasksRoutes, { prefix: '/api/tasks' });
app.register(projectsRoutes, { prefix: '/api/projects' });
app.register(searchRoutes, { prefix: '/api/search' });
app.register(systemRoutes, { prefix: '/api/system' });
app.register(chatRoutes, { prefix: '/api/chat' });

// SPA fallback (serve index.html for non-API routes)
app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api/')) {
    return reply.code(404).send({ error: 'Not found' });
  }
  return reply.sendFile('index.html');
});

// Startup
async function start() {
  try {
    // Initialize database
    initDatabase();

    // Initialize services
    await obsidianService.init();
    await fileWatcherService.init();
    await systemMonitorService.init();

    // Start server
    const port = parseInt(process.env.PORT || '3001');
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await fileWatcherService.stop();
  await systemMonitorService.stop();
  closeDatabase();
  await app.close();
 
  ();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  await fileWatcherService.stop();
  await systemMonitorService.stop();
  closeDatabase();
  await app.close();
  process.exit(0);
});

start();