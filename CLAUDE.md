# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server (NODE_OPTIONS='--inspect' next dev)
npm run build    # Production build
npm run lint     # ESLint
```

No test suite configured.

## Stack

Next.js 15 + React 19 + TypeScript, Tailwind CSS + Radix UI, Zustand for state, Axios for HTTP.

## Architecture

**Feature-based structure** under `src/features/{docker,vscode,chrome}/`:
- `api/` — service class that talks to Next.js API routes
- `hooks/` — React hook managing state and orchestrating the service
- `components/` — UI component consuming the hook
- `types.ts` — feature-specific types

**API proxy pattern** (`src/app/api/`): all external calls (Docker Registry, Chrome update service, VSCode marketplace) go through Next.js route handlers to work around CORS and handle auth. The browser never calls external services directly.

**Docker download flow:**
1. User inputs image name → `DockerService.extractImageInfo()` parses it
2. Fetch tags via `/api/docker/tags`
3. On download: auth token (`/api/docker/auth`) → manifest (`/api/docker/manifest`) → layers (`/api/docker/layer` per layer)
4. `TarBuilder` (`src/features/docker/utils/tarBuilder.ts`) assembles layers into a `docker load`-compatible TAR and serves it as a blob URL download

**VSCode flow:** Parse marketplace URL → call VSCode marketplace API directly from the browser → build a direct download URL pointing to `/_apis/public/gallery/publishers/.../vspackage`

**Chrome flow:** Extract extension ID from Chrome Web Store URL → proxy request through `/api/chrome/download` → parse CRX3/CRX2 binary format to extract the ZIP payload

**Shared UI** lives in `src/shared/ui/` (Radix UI primitives wrapped with Tailwind CVA variants).
