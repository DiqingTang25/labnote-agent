# LabNote Agent

AI-driven experiment data governance platform for academic laboratories and research groups.

**Production URL**: https://labnote-vault-main.vercel.app
**Repository**: github.com/DiqingTang25/labnote-agent (private)

---

## 🚧 Current Status (2026-08-04)

### Phase 1 Completed — Data Model Expansion
Experiment type expanded from 33 to 50+ fields referencing 4 international standards:
- **ISA-TAB**: experimentType, instruments[], materials[], protocol, observations[], projectId
- **FAIR**: license, ontologyTerms[], derivedFrom[], protocol.url
- **Allotrope ADF**: instruments[], rawDataRefs[], processedDataRefs[], auditTrail[]
- **ISO 17025 / GLP / 21 CFR Part 11**: controls[], replicates, qcStatus, reviewer, approver, signatures[]

New UI sections in workbench CardEditor: experiment type selector, hypothesis field, multi-instrument cards (with serial number + calibration status), materials table (CAS/purity/lot/supplier), protocol/SOP editor, conclusion field, QC controls table.

**⚠️ SQL migration NOT executed** — `supabase/migrations/20260731_phase1_enriched_experiment.sql` needs running on Supabase Dashboard.

### ⚠️ Known Architectural Issue
The Phase 1 approach (50 fixed fields) contradicts the core design goal: **"structure follows content, no fixed template"**. More fixed fields = larger fixed template, not dynamic behavior.

### 🔄 Direction for Next Iteration
See Section 11 — Next Development. Key decisions pending:
- Domain selection (which experiment types to focus on first)
- Transition from fixed-column schema to flexible observations (key-value) + auto-emerging field_patterns
- Self-evolving experiment model: field schemas emerge from data statistics, not hand-written rules
- Local small model for type classification & field standardization (deferred until sufficient data)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [AI Model Matrix](#3-ai-model-matrix)
4. [Route-Level Implementation Audit](#4-route-level-implementation-audit)
5. [Data Flow](#5-data-flow)
6. [Security Model](#6-security-model)
7. [Known Limitations](#7-known-limitations)
8. [Project Structure](#8-project-structure)
9. [Local Development](#9-local-development)
10. [Deployment](#10-deployment)
11. [Next Development](#11-next-development)

---

## 1. Architecture Overview

### 1.1 Layered Architecture

The system follows a four-tier architecture. Each tier has a distinct responsibility boundary.

| Tier | Location | Runtime | Responsibility |
|------|----------|---------|----------------|
| Presentation | `src/routes/`, `src/components/` | Browser | Page rendering, user interaction, file drag-drop |
| Business Logic | `src/lib/` (excluding `api/`) | Browser | State management, pipeline orchestration, sanitization |
| Server Proxy | `src/lib/api/` | Nitro (Node.js) | API key isolation, AI gateway forwarding, RAG retrieval |
| Infrastructure | External services | Cloud | Supabase (DB/Storage/Auth), XJTLU AI Gateway, Vercel |

### 1.2 Request Flow

All AI calls follow a mandatory server-side proxy pattern: the browser never holds API keys.

```
Browser (File Upload)
  -> Client-side sanitization scan (31 regex rules)
  -> TanStack Server Function (Nitro handler)
  -> Server-side re-scan (warn-only)
  -> XJTLU AI Gateway (Bearer token from env)
  -> Response returned to browser
```

File uploads bypass the server proxy and go directly from browser to Supabase Storage, avoiding Vercel's 4.5 MB serverless body limit.

---

## 2. Technology Stack

### 2.1 Core

| Component | Selection | Rationale |
|-----------|-----------|-----------|
| Framework | TanStack Start (React 19 + SSR) | File-based routing, server functions, Vercel-native |
| Build | Vite 7 + Nitro 3 | ESM-native, fast HMR, Vercel preset |
| Language | TypeScript 5.8, strict mode | Full type safety across client/server boundary |
| Package manager | Bun | Faster installs, 24h supply-chain security policy via `bunfig.toml` |
| Styling | Tailwind CSS v4 + Radix UI primitives | Utility-first, tree-shaken, accessible component primitives |
| Forms/validation | React Hook Form + Zod | Client-side validation with type inference |

### 2.2 Data Layer

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Primary database | Supabase (PostgreSQL 15) | Experiments, profiles, relations, audits, feedback |
| Vector extension | pgvector 0.5+ | Cosine similarity search on 1024-dim embeddings |
| File storage | Supabase Storage (S3-compatible) | Raw experiment files, bucket `experiment-files` |
| Auth | Supabase Auth (email/password) | Session management, RLS policy enforcement |
| Real-time | Supabase Realtime | Not currently utilized |

### 2.3 External APIs

| Service | Endpoint | Authentication | Rate Limit |
|---------|----------|---------------|------------|
| XJTLU AI Gateway | `aiagent.xjtlu.edu.cn/api/aigw/v1` | Bearer token per model | Unknown |
| Materials Project | `api.materialsproject.org` | `MP_API_KEY` header | ~100 req/min |
| NIST Chemistry WebBook | `webbook.nist.gov/api/cgi.cgi` | None (public) | 1 req/s (self-throttled) |

---

## 3. AI Model Matrix

Four specialized models are used, each with an independent API key. All models are accessed through the XJTLU AI Gateway, backed by ByteDance VolcEngine.

| Model | Gateway ID | Function | Avg Latency | Status |
|-------|-----------|----------|:-----------:|:------:|
| DeepSeek V4 Pro | `d8j2d4r9dhtg6s3fevfg` | Text understanding, reasoning, structured extraction, RAG generation | 3.0s | Operational |
| Qwen3-VL-8B-Instruct | `d95koqj7u3anoctav5sg` | Visual recognition (SEM/TEM micrographs, instrument readouts, scale bars) | 2.2s | Operational |
| Qwen3-Embedding-8B | `d8egv6v9ohgtar18hvrg` | Text-to-vector embedding (1024-dim) for semantic search | 0.9s | Degraded |
| Qwen3-Reranker-8B | `d8efv05lt96sitl7kjcg` | Search result re-ranking for RAG precision | 0.3s | Operational |
| ASR (speech-to-text) | N/A | Voice note transcription | N/A | Unavailable |

### 3.1 Embedding Degradation

The embedding endpoint on the current gateway frequently returns empty arrays. The codebase handles this explicitly in `src/lib/api/ai.functions.ts` (`generateEmbedding`):

- On success: 1024-dim float vector written to `experiments.embedding` column
- On failure: returns `[]` silently; downstream code degrades:
  - RAG falls back to PostgreSQL `ILIKE` keyword search (`rag.functions.ts` line ~80)
  - Knowledge graph semantic edges are not generated (cosine similarity unavailable)
  - Chunk-level embeddings (`experiment_chunks` table) are not populated

### 3.2 Key Isolation

Each model uses a separate API key. Environment variables are configured per-model in Vercel Dashboard and never exposed to the client. `src/lib/config.server.ts` reads them at request time.

```
AI_API_KEY          -> DeepSeek V4 Pro
AI_VISION_KEY       -> Qwen3-VL
AI_EMBEDDING_KEY    -> Qwen3-Embedding
AI_RERANK_KEY       -> Qwen3-Reranker
```

A key for one model will receive HTTP 403 if used for another model. This was explicitly tested.

---

## 4. Route-Level Implementation Audit

Each route is assessed on: data source (real vs hardcoded), API calls (real vs simulated), and overall functional completeness. Percentages are derived from line-level code inspection, not runtime profiling.

### 4.1 `/workbench` — Experiment Workbench

**Functional: 90%**

The primary user-facing page. Three-column layout: data input panel (left), card editor (center), RAG panel (right).

| Feature | Implementation | Status |
|---------|---------------|--------|
| Experiment CRUD | Supabase `experiments` table, optimistic local state, fire-and-forget DB writes | Real |
| AI parsing pipeline | `multimodal-parser.ts` `runPipeline()`: reading -> analyzing -> extracting -> merging. Text files via DeepSeek V4 Pro, images via Qwen3-VL, CSV via local stats + DeepSeek. Batch size 5, per-file API delay 200ms. | Real |
| File storage upload | Client-side direct upload to Supabase Storage bucket `experiment-files`. Path format: `{userId}/{expId}/{timestamp}-{filename}`. RLS-enforced. | Real |
| RAG Q&A | Server-side pipeline: query rewrite -> embedding/keyword search -> reranker -> DeepSeek SSE streaming. Sources returned with document references and confidence scores. Feedback persisted to `rag_feedback`. | Real |
| Auto-fill | `autoFillExperiment()`: DeepSeek infers missing field values. Inferred fields flagged in UI. | Real |
| Re-parse | `reparseExperimentFiles()`: DeepSeek re-analyzes attached file content for missed/incorrect extractions. | Real |
| Confidence calibration | `confidence.ts`: API called with `logprobs: true, top_logprobs: 3`. Field values mapped to token spans, average logprob computed, converted to 0-100 score. Falls back to length-based heuristic when logprobs unavailable. | Real, with degradation |
| Experiment relations | CRUD on `experiment_relations` table. AI suggestion via `suggestRelations()` (DeepSeek call). | Real |
| Export | JSON and Markdown via client-side Blob download. PDF via `window.print()`. | Real |
| File re-parse from history | Button exists but only displays a toast message; does not re-process stored files. | Placeholder |
| Electron folder watch | `useElectron.ts` detects `window.labnote` API. In browser, `window.labnote` is never injected (no Electron main process in this repo), so the panel always shows the browser-fallback message. | No-op in browser |

### 4.2 `/checklist` — Reproduction Audit

**Functional: 88%**

Decomposes published paper Methods sections into structured, confidence-annotated parameter lists for experimental reproduction.

| Feature | Implementation | Status |
|---------|---------------|--------|
| Paper decomposition | 6-stage pipeline in `paper-decomposer.ts`: chemical formula extraction (regex) -> DeepSeek decomposition (800-char system prompt) -> domain knowledge augmentation (69 entries, real literature citations) -> Materials Project API -> NIST WebBook API -> audit generation. Result persisted to Supabase `reproduction_audits` via service-role client. | Real |
| Confidence scoring | `calculateReproducibilityScore()`: pure function. `score = avgConfidence - criticalPenalty(max 20) - gapPenalty(5 per gap, max 30)`. Clamped 0-100. | Real |
| Certainty classification | Four-tier: explicit (100%), implied (85%), inferred (55%), unknown (0%). Each parameter carries source tag, paper quote, and inference rationale. | Real |
| External knowledge | Materials Project REST API for material properties (band gap, crystal structure, formation energy). NIST Chemistry WebBook for thermodynamic data (enthalpy, entropy, heat capacity). Both non-blocking: failure of either does not prevent audit completion. | Real |
| Preset papers | Seven papers with pre-built audits in `paper-test-data.ts`. Preset audits are explicitly labeled as demonstration shortcuts in the UI. The underlying Methods text is from real published papers (DOIs documented in source). | Demo data, real papers |
| Sanitization | `sanitizer/` module with 31 regex detection rules. Client-side scan with user confirmation dialog before sending. Server-side warn-only re-scan in `chatCompletion`. | Real |
| Protocol generation | `generateReproductionProtocol()`: pure function producing structured Markdown with safety section, equipment list, step-by-step protocol. | Real |
| Progress display | Six-step progress bar. Steps 4 (MP) and 5 (NIST) are cosmetic: the server has no real-time progress callback; progress is driven by polling `fetchAudits` for a new row. | Cosmetic |
| User ID fallback | `userId` defaults to `"dev-user"` when auth session is absent (dev mode). | Known behavior |

### 4.3 `/graph` — Knowledge Graph

**Functional: 90%**

Force-directed visualization of experiment entities and their relationships.

| Feature | Implementation | Status |
|---------|---------------|--------|
| Layout engine | d3-force simulation with configurable charge, link distance, and gravity parameters | Real |
| Rendering | SVG via React + d3-zoom for pan/zoom. Node colors by type: experiment (indigo), sample (amber), device (emerald), operator (cyan), discipline (pink) | Real |
| Entity deduplication | `buildGraphData()` merges nodes sharing the same sample ID, device name, or operator. One entity = one node regardless of how many experiments reference it. | Real |
| Relation types | Shared entity edges (same sample/device/operator across experiments), temporal edges (chronological ordering), semantic edges (cosine similarity > 0.75 from embeddings) | Real, embedding-dependent |
| Interaction | Node drag (d3-drag with coordinate transform), hover highlighting (1-hop neighbor illumination), search with auto-focus, N-hop local graph mode (BFS traversal), SVG export | Real |
| Data source | `experiments` table for nodes, `experiment_relations` table for explicit edges, client-side `buildGraphData()` for computed edges. Relations fetched via Supabase, with fallback to local-only mode on failure. | Real |

### 4.4 `/assets` — Asset Package

**Functional: 95%**

Read-only inventory view of all experiment cards. Statistics (total cards, complete cards, parameter count, discipline distribution) computed from live Supabase data. JSON and Markdown export via client-side Blob.

No write operations. No hardcoded data.

### 4.5 `/settings` — User Settings

**Functional: 90%**

Profile (name, organization, discipline) fetched from Supabase `profiles` on mount, upserted on save. Discipline-specific field templates (4 disciplines x 4 suggested fields) are static configuration, not user-customizable.

### 4.6 `/login`, `/signup` — Authentication

**Functional: 100%**

Supabase Auth with email/password. Registration includes email confirmation flow (redirect to `/auth/callback`). Route protection via `RequireAuth` component: redirects to `/login` in production, bypasses in dev mode (`import.meta.env.DEV`).

### 4.7 `/compare` — Governance Comparison

**Functional: 70%**

Displays a before/after comparison for a single experiment selected from Supabase. Field completeness, parameter lists, and AI insights are computed from real data. Media preview relies on `/media/` local paths rather than Supabase Storage URLs, so user-uploaded files will produce broken previews. Audio metadata (sample rate, description) is hardcoded.

### 4.8 `/paper` — Paper Writing Assistant

**Functional: 50%**

Experiment selection and draft editing area operate on real Supabase data. The "AI Generate Methods" button uses `setTimeout(1100ms)` with a local template function (`generateMethods()`); no AI call is made. The "Export Word" button produces a Markdown file with a `.doc` extension; it is not a valid Word document.

### 4.9 `/` — Landing Page

**Functional: 35%**

The hero upload zone is functional (files are forwarded to `/workbench` for processing). The recent experiments list reads from Supabase. All dashboard statistics, the workflow animation, capability cards, and testimonial sections are static marketing content. Dashboard counters previously used hardcoded offsets (`+128`, `+96`); these have been removed as of the current commit. Dashboard now displays only `experiments.length` and computed completeness ratio.

### 4.10 Pages Removed to `demo` Branch

The following routes existed on the initial `master` push but were removed after audit revealed they contain no real functionality:

| Route | Reason | Preserved On |
|-------|--------|-------------|
| `/agent` | 100% hardcoded: MCP server list, tool registry, status panel, token counters, all static constants. No API calls, no persistence. | `demo` branch |
| `/handoff` | 88% hardcoded: only the experiment list (5 items) reads from Supabase. Owner name, statistics, experience summaries, and abnormal experiment records are all fabricated static data. | `demo` branch |

---

## 5. Data Flow

### 5.1 Experiment Ingestion Pipeline

```
User drops file(s)
  -> File type detection (extension + MIME)
  -> Content extraction (text: File.text(), image: FileReader base64)
  -> Per-file AI parsing (text -> DeepSeek V4 Pro, image -> Qwen3-VL, CSV -> local stats + DeepSeek)
     Batch size: 5 files, inter-file delay: 200ms
  -> Cross-file merge via DeepSeek (deduplication + consolidation)
  -> JSON extraction from AI response (markdown code block stripping, fragment repair)
  -> Experiment card creation (28-field schema, zod-validated)
  -> File upload to Supabase Storage (client-side direct)
  -> DB insert (optimistic local state + fire-and-forget Supabase insert)
  -> Optional: auto-fill missing fields (DeepSeek)
  -> Optional: confidence calibration (logprobs or heuristic)
```

### 5.2 RAG Query Pipeline

```
User submits question
  -> Query rewrite (DeepSeek: vague question -> precise search terms)
  -> Embedding generation (Qwen3-Embedding, 1024-dim)
     If embedding succeeds:
       -> pgvector match_experiment_chunks (cosine similarity, threshold 0.55)
       -> pgvector hybrid_search_experiments (full-text + vector hybrid)
     If embedding fails (empty array):
       -> PostgreSQL ILIKE keyword search on experiments table
       -> Similarity hardcoded to 0.5 (documented degradation)
  -> Reranker (Qwen3-Reranker re-scores retrieved chunks)
  -> LLM generation (DeepSeek, SSE streaming)
     Sources passed as first SSE event before token stream
  -> Response cached in LRU (100 entries, 30-min TTL, in-memory only)
```

### 5.3 Paper Decomposition Pipeline

```
User submits paper Methods text (or selects preset)
  -> Stage 1: Chemical formula extraction (regex over element patterns)
  -> Stage 2: DeepSeek decomposition (system prompt ~800 chars, output JSON schema)
  -> Stage 3: Domain knowledge augmentation (69-entry static KB, keyword match scoring)
  -> Stage 4: Materials Project API query (per extracted formula, non-blocking)
  -> Stage 5: NIST WebBook API query (per identified compound, 300ms throttle)
  -> Stage 6: Audit assembly + Supabase persistence
  -> Client polls fetchAudits every 2s until row appears
```

---

## 6. Security Model

### 6.1 API Key Protection

API keys are stored as Vercel environment variables, read at request time by `config.server.ts`, and injected into server function handlers. The browser never has access to any AI API key. Server functions use `createServerFn` from TanStack Start; their handler code executes exclusively in the Nitro server runtime.

### 6.2 Data Isolation

Row-Level Security (RLS) on Supabase enforces per-user data isolation at the database level. Policies are defined on the `experiments`, `profiles`, `reproduction_audits`, and `experiment_relations` tables. Each policy restricts `SELECT`/`INSERT`/`UPDATE`/`DELETE` to rows where `user_id = auth.uid()`. Application-level `user_id` filtering in `supabase.ts` provides a second layer.

The `SUPABASE_SERVICE_ROLE_KEY` is used server-side only for operations that must bypass RLS (file deletion from Storage, audit persistence via `paper-decomposer.ts`). It is never exposed to the client.

### 6.3 Data Sanitization

The `sanitizer/` module (`src/lib/sanitizer/`) provides a two-layer defense against accidental exfiltration of sensitive data through AI API calls:

**Layer 1 — Client-side (blocking):**
- `detector.ts`: 31 regex rules covering Chinese ID numbers, phone numbers, email addresses, personal names, institutional addresses, GPS coordinates, CAS numbers, patent numbers, API key patterns, and more.
- `transformer.ts`: Positional replacement engine supporting mask, redact, placeholder, blur, and generalize strategies. Operates in reverse order to preserve character offsets.
- User confirmation dialog for medium-risk matches. High-risk matches block sending until manual review.

**Layer 2 — Server-side (warn-only):**
- `chatCompletion` handler re-scans outgoing content. High-risk matches are logged with detail but do not block the request, under the assumption that the client-side scan already obtained user consent.

**Audit trail:**
- `audit-log.ts`: SHA-256 content hashing (Web Crypto API in browser, Node crypto on server). Entries persisted to localStorage (`labnote_api_audit_log`) and Supabase `api_send_logs` table. Raw content is never stored in audit logs.

### 6.4 Authentication

Supabase Auth with email/password. Sessions managed via `@supabase/ssr` cookie-based auth. `RequireAuth` component wraps all authenticated routes; redirects to `/login` in production, bypasses in dev mode (`import.meta.env.DEV`). Auth state changes are monitored via `onAuthStateChange` subscription.

---

## 7. Known Limitations

### 7.1 AI / API

- **Embedding service degraded**: The XJTLU gateway frequently returns empty embedding arrays. Semantic search and knowledge graph semantic edges are non-functional during these periods. Keyword fallback is operational but produces lower-quality results.
- **PDF/DOCX/XLSX pseudo-parsing**: Binary document formats are read with `File.text()`, producing garbled output sent to the AI. Only plain-text formats (TXT, MD, LOG, JSON, XML, CSV) and images are parsed correctly.
- **ASR unavailable**: The speech recognition model requires WebSocket connections. The XJTLU gateway does not support WebSocket forwarding.
- **Logprobs-dependent**: The confidence calibration engine depends on the gateway returning logprobs. When unavailable, calibration degrades to a length-based heuristic (`confidence.ts` lines 130-145).

### 7.2 Frontend

- **Landing page**: Dashboard counters are now computed from live data, but the workflow animation, capability cards, and marketing sections are static content.
- **Paper writing assistant**: "AI Generate" button is a `setTimeout` wrapper around a local template function. No LLM call is made for Methods generation. Export produces Markdown with a `.doc` extension.
- **Governance comparison**: Media preview paths are hardcoded to `/media/` rather than using Supabase Storage public URLs. User-uploaded files will display broken previews.
- **Route protection**: Bypassed in dev mode (`import.meta.env.DEV`). Production behavior is untested in staging.

### 7.3 Data

- **Embedding column**: The `embedding` column in the `experiments` table is populated only when `generateEmbedding` returns a valid vector. This is currently rare on the production gateway.
- **File attachment persistence**: `addFileToExperiment` and `removeFileFromExperiment` in `labStore.tsx` update local React state only. They do not write to the database independently. The workbench upload pipeline handles persistence as part of its flow.
- **RAG keyword fallback similarity**: When embeddings are unavailable, all keyword-matched results are assigned a fixed similarity of 0.5. This value is arbitrary and documented in `rag.functions.ts`.

### 7.4 Infrastructure

- **Electron desktop client**: The renderer-side integration code exists (`src/lib/electron/useElectron.ts`, `FolderWatcherPanel.tsx`) but no Electron main process, preload script, or `electron` dependency exists in `package.json`. `window.labnote` is never injected. The folder watch panel always displays the browser-fallback message.
- **Python environment**: The Day4 device gateway (`D:\labnote\day4-device-gateway\`) requires a Python runtime. The current Python installation on the development machine returns exit code 49 for subprocess calls, preventing the gateway from functioning.
- **No CI/CD tests**: No automated test suite runs on push. Playwright E2E tests exist in `test-harness/` but are not part of the Vercel build pipeline.

---

## 8. Project Structure

```
labnote-vault-main/
|
|-- src/
|   |-- routes/                    # File-based routing (TanStack Start)
|   |   |-- __root.tsx             # Root layout, nav bar, auth wrapper
|   |   |-- index.tsx              # /          Landing page
|   |   |-- workbench.tsx          # /workbench  Main experiment workspace
|   |   |-- checklist.tsx          # /checklist  Reproduction audit
|   |   |-- graph.tsx              # /graph      Knowledge graph
|   |   |-- paper.tsx              # /paper      Paper writing assistant
|   |   |-- compare.tsx            # /compare    Governance comparison
|   |   |-- assets.tsx             # /assets     Asset inventory
|   |   |-- settings.tsx           # /settings   User profile
|   |   |-- login.tsx              # /login      Email login
|   |   |-- signup.tsx             # /signup     Registration
|   |   |-- help.tsx               # /help       Static documentation
|   |   +-- auth/callback.tsx      # OAuth callback handler
|   |
|   |-- lib/
|   |   |-- api/                   # Server Functions (Nitro runtime only)
|   |   |   |-- ai.functions.ts        # chat, embedding, rerank, logprobs
|   |   |   |-- rag.functions.ts       # RAG search, streaming answer
|   |   |   |-- decompose.functions.ts # Paper decomposition orchestrator
|   |   |   |-- materials-project.functions.ts  # MP API proxy
|   |   |   +-- nist.functions.ts      # NIST API proxy
|   |   |
|   |   |-- deepseek.ts            # Client-side AI call wrapper (calls server fns)
|   |   |-- multimodal-parser.ts   # 4-stage file parsing pipeline
|   |   |-- confidence.ts          # Token-level logprobs calibration engine
|   |   |-- paper-decomposer.ts    # Paper decomposition with MP/NIST enhancement
|   |   |-- reproduction-audit.ts  # Audit scoring, gap analysis, protocol generation
|   |   |-- domain-knowledge.ts    # 69-entry static knowledge base (real citations)
|   |   |-- paper-test-data.ts     # 7 preset papers with demo audit data
|   |   |-- labStore.tsx           # Global experiment state (React Context)
|   |   |-- supabase.ts            # Browser Supabase client (CRUD, relations, feedback)
|   |   |-- supabase-server.server.ts  # Service-role client (bypasses RLS)
|   |   |-- storage.server.ts      # Server-side file upload/delete
|   |   |-- auth-context.tsx       # Auth state provider
|   |   |-- auth-client.ts         # Browser Supabase client factory
|   |   |-- auth-guard.tsx         # Route protection wrapper
|   |   |-- config.server.ts       # Env var reader (server-only)
|   |   |-- proxy-fetch.server.ts  # HTTP_PROXY-aware fetch wrapper
|   |   |-- experiment-utils.ts    # Row mappers, chunk splitter
|   |   |-- json-parser.ts         # AI response JSON extraction
|   |   |-- graph-types.ts         # Graph node/edge type definitions
|   |   |-- graph-data.ts          # Graph build logic (entity dedup, edge computation)
|   |   |-- sanitizer/             # Data sanitization module
|   |   |   |-- index.ts           # Public API
|   |   |   |-- detector.ts        # 31-rule regex scanner
|   |   |   |-- transformer.ts     # Positional replacement engine
|   |   |   |-- patterns.ts        # Regex rule definitions
|   |   |   |-- audit-log.ts       # SHA-256 hashed audit trail
|   |   |   +-- types.ts           # Shared types
|   |   |-- electron/              # Electron renderer integration (no main process)
|   |   |   |-- useElectron.ts     # React hook for window.labnote API
|   |   |   |-- FolderWatcherPanel.tsx  # Watch panel UI component
|   |   |   +-- globals.d.ts       # window.labnote type declarations
|   |   |
|   |   +-- [legacy files]         # See Section 8.1
|   |
|   |-- components/
|   |   |-- ui/                    # shadcn/ui primitives (50+ components)
|   |   |-- ForceGraph.tsx         # d3-force SVG rendering
|   |   |-- GraphSearch.tsx        # Node search with autocomplete
|   |   |-- ExperimentSummary.tsx  # Experiment card summary view
|   |   |-- FeedbackDialog.tsx     # Global feedback modal
|   |   +-- usage-dashboard.tsx    # API usage & cost dashboard
|   |
|   +-- hooks/
|       |-- useGraphData.ts        # Graph data fetching & caching
|       +-- useForceSimulation.ts  # d3-force lifecycle management
|
|-- supabase/
|   +-- migrations/                # SQL migration files
|       +-- 20260731_phase1_enriched_experiment.sql
|
|-- test-harness/                  # Playwright E2E tests (not in CI)
|-- public/                        # Static assets
|-- package.json
|-- vite.config.ts                 # Vite + TanStack Start + Nitro config
|-- tsconfig.json
|-- bunfig.toml                    # Bun supply-chain security policy
|-- components.json                # shadcn/ui configuration
|-- .env.local                     # Local environment variables (git-ignored)
+-- README.md
```

### 8.1 Legacy Files (Under Review)

The following files exist in the repository but their import/usage status is being audited. They may be candidates for removal:

- `src/lib/persistence.ts` — Legacy localStorage persistence layer. Supabase migration made this obsolete.
- `src/lib/lovable-error-reporting.ts` — Lovable.dev platform error reporting. Not relevant outside Lovable hosting.
- `src/lib/error-capture.ts` — Lovable.dev artifact.
- `src/lib/error-page.ts` — Lovable.dev artifact.
- `src/lib/rag-cache.ts` — In-memory LRU cache for RAG answers. Used by `rag.functions.ts`.
- `src/lib/upload-bridge.ts` — File transfer mechanism between homepage and workbench.
- `src/lib/background-task.ts` — Background task polling utility.
- `src/lib/api/example.functions.ts` — Template/example file, likely unused.
- `src/components/AIAgent.tsx` — Floating AI assistant component.
- `supabase-general-feedback.sql` — Orphaned SQL not referenced by migrations.

---

## 9. Local Development

### 9.1 Prerequisites

- Bun >= 1.1
- Git
- Supabase CLI (optional, for local DB)

### 9.2 Setup

```bash
bun install
cp .env.example .env.local
# Edit .env.local with actual keys
```

### 9.3 Environment Variables

All variables in `.env.local` (not committed):

```env
# Supabase
VITE_SUPABASE_URL=https://kwwjdrwcvgjbjxtewbnk.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_URL=https://kwwjdrwcvgjbjxtewbnk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# AI Gateway (each model has independent key)
AI_API_KEY=<deepseek-key>
AI_EMBEDDING_KEY=<embedding-key>
AI_VISION_KEY=<vision-key>
AI_RERANK_KEY=<reranker-key>

# Materials Project
MP_API_KEY=<mp-key>

# HTTP proxy (required for external API access from mainland China)
HTTP_PROXY=http://127.0.0.1:7897
HTTPS_PROXY=http://127.0.0.1:7897
```

### 9.4 Commands

```bash
bun run dev          # Start Vite dev server (default port 3000)
npx vite build       # Production build -> .output/
npx vite preview     # Preview production build locally
```

---

## 10. Deployment

### 10.1 Production

- **URL**: https://labnote-vault-main.vercel.app
- **Platform**: Vercel (Hobby plan)
- **Nitro preset**: `vercel` (configured in `vite.config.ts`)
- **Trigger**: Push to `master` branch -> automatic build + deploy

### 10.2 Environment Variables (Vercel Dashboard)

All variables from Section 9.3 are configured in Vercel Dashboard. `VITE_*` prefixed variables are available at build time and in the browser. Non-`VITE_*` variables are server-only.

### 10.3 Build

The Vercel build uses the Nitro Vercel preset. TanStack Start compiles server functions into Nitro handlers. Static assets are served from Vercel's edge CDN. Server functions execute as Vercel serverless functions (Node.js runtime).

### 10.4 Repository

- **GitHub**: `DiqingTang25/labnote-agent` (private)
- **Branches**:
  - `master` — Production code, real features only
  - `demo` — Full project snapshot including demo/mock pages (`/agent`, `/handoff`)

---

## 11. Next Development

### 11.1 Vision: Dynamic Structured Experiment Cards

**"结构跟着内容走，无固定模板"** — Structure follows content, no fixed template.

The current 50-field experiment schema is a stepping stone, not the destination. The end goal is a **self-evolving experiment model** where:

1. **Field schemas emerge from data, not code** — `field_patterns` table auto-computes which fields appear in which experiment types, at what frequency, with what value distributions. No human writes field definitions.

2. **Experiment types auto-cluster** — Embedding-based clustering discovers new types as data grows. From "合成" → "水热合成-氧化物" → "水热合成-氧化物-光催化"

3. **AI completion becomes data-driven** — Instead of LLM guessing missing fields, the system queries `field_patterns` for "this experiment type's required fields" and guides the LLM with statistical ranges from similar experiments.

4. **Multi-file alignment** — When uploading mixed-format files, the system identifies which files belong to the same experiment (shared sample ID, device, date, operator) using fingerprint extraction + embedding similarity + LLM adjudication.

5. **Incremental matching** — New uploads are matched against ALL existing experiments to determine if they belong to an existing experiment (append) or form a new one.

### 11.2 Proposed Next Architecture

```
experiments (id, name, experiment_type, date, operator, user_id)
observations (id, experiment_id, key, value, unit, group, source, confidence)
field_patterns (experiment_type, field_key, occurrence_count, rate, co_occurring, value_pattern)
```

Key properties:
- **No fixed field columns** — all experiment data as flexible observations
- **field_patterns auto-updates** — background job after every data change
- **Experiment type auto-discovery** — embedding clustering, no manual taxonomy
- **Local small model** (deferred): type classification, anomaly detection, field normalization

### 11.3 Unresolved

- **Domain not yet selected** — Need to decide which experiment domain to focus on first (candidate: materials science — inorganic functional materials synthesis & characterization)
- **Seed data volume** — How many real experiments are available to bootstrap field_patterns?
- **Phase 1 SQL migration** — Should it be run, or should the architecture pivot first?

### 11.4 Memory Files

Key design discussions and decisions are recorded in Claude memory:
- `dynamic-experiment-card.md` — Self-evolving model architecture discussion
- `phase1-caveats.md` — Known issues with Phase 1 approach
- `实验复现工作台.md` — Reproduction audit entry point
- `current-state.md` — Overall project status
