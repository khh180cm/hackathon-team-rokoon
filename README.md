# Hackathon Starter

Minimal Next.js fullstack app demonstrating Claude Agent SDK running in Moru sandboxes. Features a chat UI and workspace file explorer adapted from [maru.moru.io](https://maru.moru.io).

## Features

- **Chat Interface**: Send messages to Claude, view responses with tool use rendering
- **Workspace Panel**: File explorer with tree view, syntax-highlighted file viewer
- **Moru Integration**: Sandboxes with persistent volumes for file storage
- **Polling Updates**: 2-second polling for conversation status and file changes

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                        │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │     Chat Panel       │  │     Workspace Panel          │ │
│  │  - Message display   │  │  - File explorer (tree)      │ │
│  │  - Prompt form       │  │  - File viewer (Shiki)       │ │
│  │  - Status indicator  │  │  - Download support          │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Next.js API Routes                       │
│  POST /api/conversations      - Create/continue conversation │
│  GET  /api/conversations/[id] - Get status & messages        │
│  POST /api/conversations/[id]/status - Agent callback        │
│  GET  /api/conversations/[id]/files  - List files (tree)     │
│  GET  /api/conversations/[id]/files/[...path] - Read file    │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────┐         ┌──────────────────────────┐
│      PostgreSQL      │         │      Moru Sandbox        │
│  - Conversation      │         │  - Volume (persistent)   │
│  - Status tracking   │         │  - Agent process         │
│  - Session ID        │         │  - Claude Agent SDK      │
└──────────────────────┘         └──────────────────────────┘
```

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Moru API key
- Anthropic API key

### Environment Variables

Create `.env`:

```bash
DATABASE_URL="postgresql://user@localhost:5432/hackathon"
MORU_API_KEY="your-moru-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
BASE_URL="http://localhost:3000"  # For agent callbacks
```

### Install & Run

```bash
# Install dependencies
npm install

# Link local Moru SDK (if using unreleased Volume feature)
cd ~/moru/sdks/packages/js-sdk && pnpm build && npm link
cd ~/moru/hackathon-starter && npm link @moru-ai/core

# Setup database
npm run db:push

# Start dev server
npm run dev
```

Open http://localhost:3000

## Implementation Status

### Completed

| Component | Description | Status |
|-----------|-------------|--------|
| **UI - Chat** | Message display, prompt form, status indicator | Done |
| **UI - Workspace** | File explorer, file viewer, syntax highlighting | Done |
| **API - Conversations** | Create, get status, polling | Done |
| **API - Files** | List (tree), read content | Done |
| **Moru SDK** | Volume, Sandbox integration | Done |
| **TypeScript** | Full type safety | Done |

### Not Yet Tested (Requires Infrastructure)

| Component | Description | Blocker |
|-----------|-------------|---------|
| **Full Flow** | Volume → Sandbox → Agent → Files | Needs valid API keys |
| **Agent Execution** | Claude Agent SDK in sandbox | Needs `hackathon-ts-agent` template |
| **Message Parsing** | Claude Code JSONL format | Needs running agent |
| **Session Resume** | Continue existing conversation | Needs session ID from agent |

## Project Structure

```
hackathon-starter/
├── app/
│   ├── api/
│   │   └── conversations/
│   │       ├── route.ts              # POST: create/continue
│   │       └── [id]/
│   │           ├── route.ts          # GET: status & messages
│   │           ├── status/route.ts   # POST: agent callback
│   │           └── files/
│   │               ├── route.ts      # GET: list files
│   │               └── [...path]/route.ts  # GET: read file
│   ├── layout.tsx
│   ├── page.tsx                      # Main chat + workspace UI
│   └── globals.css
├── components/
│   ├── chat/
│   │   ├── cc-messages.tsx           # Message list
│   │   ├── cc-assistant-message.tsx  # Assistant message rendering
│   │   ├── cc-tool-use.tsx           # Tool use display
│   │   └── prompt-form.tsx           # Input form
│   ├── workspace/
│   │   ├── workspace-panel.tsx       # Main panel with header
│   │   ├── file-explorer.tsx         # Tree-based file browser
│   │   └── file-viewer.tsx           # Syntax-highlighted viewer
│   └── ui/
│       ├── button.tsx
│       ├── textarea.tsx
│       ├── resizable.tsx
│       ├── tooltip.tsx
│       ├── dropdown-menu.tsx
│       ├── file-icon.tsx
│       └── collapsible.tsx
├── lib/
│   ├── db.ts                         # Prisma client
│   ├── moru.ts                       # Moru SDK helpers
│   ├── types.ts                      # Claude Code session types
│   └── utils.ts                      # cn() helper
├── prisma/
│   └── schema.prisma                 # Conversation model
├── agent/                            # Agent code (runs in sandbox)
│   ├── src/agent.ts                  # Claude Agent SDK query
│   ├── package.json
│   └── tsconfig.json
└── package.json
```

## Key Dependencies

- `next` - React framework
- `@moru-ai/core` - Moru SDK (Sandbox, Volume)
- `@prisma/client` - Database ORM
- `react-resizable-panels` - Resizable layout
- `shiki` - Syntax highlighting
- `lucide-react` - Icons

## Agent Template

The agent runs inside a Moru sandbox. Template requirements:

1. Node.js environment with Claude Agent SDK
2. Volume mounted at `/workspace/data`
3. Environment variables: `ANTHROPIC_API_KEY`, `CALLBACK_URL`, `RESUME_SESSION_ID`
4. Entrypoint: `node /app/agent.js`

See `agent/` directory for the agent implementation.

## Deployment (Vercel + PostgreSQL)

### 1. Create PostgreSQL Database

Choose one of these options:

**Option A: Neon (Recommended - Free tier)**
1. Go to [neon.tech](https://neon.tech) and sign in
2. Click **New Project**
3. Name your project and select a region
4. Copy the connection string from the dashboard

**Option B: Supabase**
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project** and fill in details
3. Go to **Project Settings** → **Database** → **Connection string**
4. Use the **Transaction** URL for serverless:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from hackathon-starter directory
cd ~/moru/hackathon-starter
vercel
```

Follow the prompts to create a new project.

### 3. Configure Environment Variables

```bash
# Add environment variables for production
vercel env add DATABASE_URL production
# Paste your PostgreSQL connection string

vercel env add MORU_API_KEY production
# Paste your Moru API key

vercel env add BASE_URL production
# Enter your production URL (e.g., https://hackathon-starter-sigma.vercel.app)
```

| Variable | Value | Description |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `MORU_API_KEY` | `moru_...` | Moru API key |
| `BASE_URL` | `https://your-app.vercel.app` | Your production URL |

### 4. Push Database Schema

```bash
# Set DATABASE_URL locally for Prisma
export DATABASE_URL="your-connection-string"

# Push schema to database
npx prisma db push
```

### 5. Deploy to Production

```bash
vercel --prod
```

### 6. Verify Deployment

1. Open your Vercel production URL
2. Send a test message: "Create a file called hello.txt"
3. Check that:
   - Workspace panel shows the created file
   - No errors in Vercel logs

### Troubleshooting

**"Vulnerable version of Next.js detected"**
- Update Next.js: `npm install next@latest react@latest react-dom@latest`
- Redeploy: `vercel --prod`

**"Can't reach database server"**
- Check DATABASE_URL is correct
- For Supabase, use the pooler/transaction URL
- Verify database is active

**"MORU_API_KEY not set"**
- Add the environment variable: `vercel env add MORU_API_KEY production`
- Redeploy after adding

**Agent callback fails (ECONNREFUSED)**
- Ensure BASE_URL matches your actual production URL
- For local development, use a tunnel (ngrok) or deploy to Vercel

**Vercel Authentication page appears**
- Use the production alias URL (e.g., `hackathon-starter-sigma.vercel.app`)
- Not the deployment-specific URL with random hash

## Live Demo

Production URL: https://hackathon-starter-sigma.vercel.app

## Next Steps

1. Test full conversation flow
2. Verify file creation and workspace sync
3. Test session resume functionality
