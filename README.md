# Personal Dashboard

Lokales persönliches Dashboard mit Obsidian-Memory, KI-Agenten (Hermes), Aufgaben-Management, Datei-Automatisierung und System-Monitoring.

## Features

- **Obsidian Vault Integration** - Lokales REST API für bidirektionale Notizen-Sync
- **Hermes KI-Agenten** - Chat, Memory-Review, PDF-Summarisierung, Task-Generierung
- **Task Manager** - Kanban/Listen, Wiederholungen, Prioritäten, Erinnerungen
- **File Watcher & Automation** - PDF-Summarisierung, Datei-Sortierung, RSS/Email-Processing
- **Global Search** - Volltextsuche über Vault, Dateien, Chat-Logs (ripgrep/Lunr.js)
- **Project Dashboards** - Git-Status, Notizen, Tasks pro Projekt
- **System Monitoring** - CPU/GPU/RAM/Temp Widgets (systeminformation/psutil)
- **Quick Actions** - Launcher, Skripte, Textbausteine
- **Analytics** - Produktivitäts-Trends, Vault-Wachstum, System-Stats
- **Theming** - Dark/Light, Glassmorphism, TailwindCSS + shadcn/ui

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui |
| Backend | Node.js + Fastify (TypeScript) |
| Database | SQLite (better-sqlite3) + FTS5 für Volltextsuche |
| KI-Agenten | Hermes CLI + Local LLMs (Ollama/GPT4All) |
| Obsidian Sync | obsidian-local-rest-api Plugin |
| File Watching | chokidar |
| System Info | systeminformation |
| Scheduling | node-cron |

## Projektstruktur

```
Personal-Dashboard/
├── frontend/          # React + Vite + Tailwind
├── backend/           # Fastify + TypeScript API
├── scripts/           # Automation Scripts (File Watcher, PDF Summarizer, etc.)
├── skills/            # Hermes Skills (Memory Review, Task Generator, etc.)
├── docs/              # Dokumentation, Architektur-Diagramme
└── docker/            # Docker Compose für einfache Deployment
```

## Quick Start

### 1. Obsidian Local REST API Plugin installieren
1. In Obsidian: Settings → Community Plugins → "Local REST API" installieren
2. API Key generieren, Port notieren (Default: 27124)
3. In `.env` eintragen

### 2. Backend starten
```bash
cd backend
cp .env.example .env
# .env anpassen (OBSIDIAN_API_URL, OBSIDIAN_API_KEY, etc.)
npm install
npm run dev
```

### 3. Frontend starten
```bash
cd frontend
npm install
npm run dev
```

### 4. Hermes Agenten nutzen
```bash
# Hermes installieren (falls nicht vorhanden)
pip install hermes-agent

# Skills laden
hermes skill install ./skills/memory-review
hermes skill install ./skills/pdf-summarizer
hermes skill install ./skills/task-generator

# Chat starten
hermes chat
```

### 5. File Watcher starten (optional)
```bash
cd scripts
npm install
npm run watch
```

## Environment Variables

Siehe `backend/.env.example` und `scripts/.env.example`.

## Architektur

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  Frontend   │────▶│  Backend    │────▶│  Obsidian Vault │
│  (React)    │◀────│  (Fastify)  │◀────│  (REST API)     │
└─────────────┘     └──────┬──────┘     └─────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐ ┌──────────┐ ┌───────────┐
         │ Hermes  │ │ SQLite   │ │ System    │
         │ Agents  │ │ (FTS5)   │ │ Monitor   │
         └─────────┘ └──────────┘ └───────────┘
```

## Skills (Hermes Agenten)

| Skill | Beschreibung |
|-------|--------------|
| `memory-review` | Analysiert Chat-Logs & aktualisiert `USER/Profile.md` |
| `pdf-summarizer` | Fasst PDFs zusammen, legt Notizen im Vault an |
| `task-generator` | Extrahiert Tasks aus Vault-Notizen (`#todo`, `#Achtung`) |
| `daily-briefing` | Erstellt morgendliches Briefing (Tasks, Kalender, Wetter) |
| `file-organizer` | Sortiert Downloads/Dateien in Vault-Ordner |

## Lizenz

MIT