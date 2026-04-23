# Marketing Data Connector

A full-stack web application that wraps a Python marketing data extraction pipeline. It provides a dashboard UI for configuring API credentials, triggering data extractions, and viewing execution logs.

## Architecture

- **Frontend**: React + TypeScript with Vite, Tailwind CSS, wouter routing
- **Backend**: Express.js + TypeScript 
- **Database**: PostgreSQL with Drizzle ORM
- **Python Pipeline**: Lives in `python/` directory, spawned as a child process from Node.js

## Key Features

1. **Dashboard** (`/`): Trigger extraction runs by selecting connectors (Google Ads, GA4, Facebook, Instagram, YouTube, etc.), setting lookback days, and toggling dry-run mode. View execution history with live status updates.
2. **Setup Wizard** (`/setup`): Step-by-step wizard for non-technical users to connect their marketing platforms. 8 steps with labeled form fields, inline help text, expandable instructions with external links, progress tracking, and skip buttons for optional connectors.
3. **Configuration** (`/configuration`): Advanced JSON editor for managing connector credentials. Toggle connectors on/off.
4. **Live Logs**: View real-time extraction logs. The frontend polls running jobs every 3 seconds.

## Data Model

- `connector_configs`: Stores API credentials per connector (connectorName, config JSON, isActive)
- `runs`: Stores execution history (status, logs, summary, timestamps)

## File Structure

- `shared/schema.ts` - Drizzle table definitions + Zod schemas
- `shared/routes.ts` - API contract definitions
- `server/db.ts` - Database connection
- `server/storage.ts` - Database storage layer (CRUD operations)
- `server/routes.ts` - Express route handlers + seed function
- `server/index.ts` - Server entry point
- `client/src/pages/Dashboard.tsx` - Main dashboard page
- `client/src/pages/Configuration.tsx` - Advanced connector config page (JSON editor)
- `client/src/pages/SetupWizard.tsx` - Guided setup wizard with friendly form fields
- `client/src/hooks/use-runs.ts` - React Query hooks for runs
- `client/src/hooks/use-configs.ts` - React Query hooks for configs
- `client/src/components/` - Sidebar, AppLayout, StatusBadge, RunLogsModal
- `python/` - Python extraction pipeline (main.py, connectors/, loader/, schemas/, config/)
- `python/main.py` - Pipeline orchestrator (--connectors, --days-back, --dry-run, --append flags)
- `python/smoke_test.py` - Per-connector connection/auth validation
- `python/connectors/` - One file per marketing platform connector
- `python/loader/bigquery.py` - BigQuery data loader with auto-schema creation
- `python/schemas/tables.py` - BigQuery table schemas for all 20+ tables

## API Endpoints

- `GET /api/configs` - List all connector configs
- `PUT /api/configs/:connectorName` - Upsert a connector config
- `GET /api/runs` - List all runs (newest first)
- `GET /api/runs/:id` - Get a specific run
- `POST /api/runs/trigger` - Trigger a new extraction run

## Workflows

1. **Start application** (Development) - `npm run dev` - Vite dev server + Express on port 5000
2. **Run Pipeline** (Production pipeline) - Runs all connectors via `python/main.py` directly from console

## Deployment

- Target: `autoscale`
- Build: `npm run build` (compiles TS + bundles frontend to `dist/`)
- Run: `npm run start` (`NODE_ENV=production node dist/index.cjs`)

## Service Account JSON Handling

When `GOOGLE_APPLICATION_CREDENTIALS` config value starts with `{` (raw JSON content), the server writes it to `/tmp/sa-{runId}.json` before spawning Python, then cleans up the temp file after the process exits. This allows users to paste service account JSON directly into the config without needing to upload a file.

## Theme

Dark mode professional theme using CSS custom properties. Custom colors: success (green), warning (amber). Font: Plus Jakarta Sans (body), Outfit (headings), JetBrains Mono (code).
