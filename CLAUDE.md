# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev
pnpm dev:e2e
pnpm build
pnpm start
pnpm lint
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
```

Notes:

- `pnpm dev` runs `next dev` with `NODE_OPTIONS='--inspect'`.
- `pnpm dev:e2e` starts a dev server on `127.0.0.1:3100`.
- `pnpm start` defaults to port `12723`, but Playwright overrides it with CLI flags.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS v4, Radix UI, Axios, Playwright, and Vercel Analytics.

State is managed in feature hooks plus local component state. There is no active global store in the current implementation.

## App Shell And Routing

- `/` redirects to `/${defaultTab}` where `defaultTab` is `vscode`.
- `src/features/registry.ts` is the source of truth for tab ids, labels, and icons.
- Current tabs are `vscode`, `chrome`, `msedge`, `docker`, and `msstore`.
- `src/app/[tab]/page.tsx` validates the tab against `tabIds` and renders `src/app/[tab]/tab-page.tsx`.
- `tab-page.tsx` dynamically imports all five feature components with `ssr: false`.
- All tab panels stay mounted and are only hidden, so in-memory state survives tab switches.
- The active tab lives in the path (`/{tab}`).
- On first load, only the active tab receives the initial `?q=` value.
- Successful parses sync the current input into `?q=`.
- Switching tabs replaces the URL with `/{tab}` and removes the current query string.

## Feature Structure

Feature modules live under `src/features/{vscode,chrome,edge,docker,msstore}/` and generally use:

- `api/` for service helpers that call local Next.js API routes
- `hooks/` for state and async orchestration
- `components/` for UI
- `types.ts` for feature types

Additional feature-specific files:

- `src/features/edge/utils/edgeInput.ts` parses CRX ids, ProductIds, and Edge Add-ons URLs
- `src/features/docker/utils/tarBuilder.ts` builds browser-side TAR archives for `docker load`
- `src/features/msstore/download.ts` rewrites allowed HTTP package links through the local proxy route

## Shared Behavior

- Shared UI primitives live in `src/shared/ui/`.
- Shared metadata and outbound headers live in `src/shared/lib/site.ts`.
- Shared request helpers live in `src/shared/lib/http.ts`.
- Chrome and Edge share the CRX-to-ZIP conversion utility in `src/shared/lib/crx.ts`.
- Recent input history is stored in `localStorage` under:
  - `history:vscode`
  - `history:chrome`
  - `history:msedge`
  - `history:docker`
  - `history:msstore`
- `useHistory` keeps at most 10 trimmed items and de-duplicates exact matches.
- History dropdown filtering is case-insensitive substring matching.
- Toast feedback is handled by `src/hooks/useToast.ts` with a single visible toast at a time and a 5s removal delay.

## Feature Flows

### VSCode

- Input is limited to Marketplace item URLs.
- Parsing reads `itemName` from the query string.
- `publisher.extension` is split on the last `.` so dotted publishers still work.
- Versions are queried through `POST /api/vscode/query`.
- The final `.vsix` URL is built directly against Marketplace; the actual package download is not proxied.

### Chrome

- Input accepts a search term, extension id, or Web Store URL.
- Search is debounced by 400ms and uses `GET /api/chrome/search`.
- Search is skipped for inputs shorter than 2 chars, 32-char ids, or values containing `.` or `/`.
- Details are loaded through `GET /api/chrome/detail`.
- Details may fail open; download can still continue with only the extension id.
- Downloads go through `GET /api/chrome/download`.
- CRX-to-ZIP conversion happens in the browser and supports CRX2/CRX3 parsing plus ZIP magic fallback.
- Blob URLs are revoked on re-download and unmount.
- Active downloads can be cancelled with `AbortController`.

### Microsoft Edge

- Input accepts a search term, CRX id, ProductId, or Edge Add-ons URL.
- `src/features/edge/utils/edgeInput.ts` recognizes:
  - 32-char lowercase CRX ids
  - 12-char alphanumeric ProductIds
  - URLs containing either value
- Search is debounced by 400ms and uses `GET /api/edge/search`.
- Search is skipped for parseable direct inputs, short values, or values containing `.` or `/`.
- Search and detail requests use fixed upstream locale defaults: `gl=US`, `hl=en-US`.
- Details are loaded through `GET /api/edge/detail?query=...`.
- Downloads go through `GET /api/edge/download?id=...`.
- ZIP output is produced in the browser from the downloaded CRX, using the same shared converter as Chrome.
- Blob URLs are revoked on re-download and unmount.
- Active downloads can be cancelled with `AbortController`.

### Docker

- Input accepts shorthand image refs and Docker Hub URLs.
- `extractImageInfo()` normalizes missing namespace to `library` and missing tag to `latest`.
- Tags are loaded through `GET /api/docker/tags`.
- If a repository is missing or returns no tags, candidate repositories are fetched through `GET /api/docker/search`.
- After tag resolution, the client prefetches the manifest through `GET /api/docker/auth` + `GET /api/docker/manifest`.
- `GET /api/docker/manifest` resolves manifest lists / OCI indexes to `linux/amd64`.
- Before each layer download, the client refreshes the auth token to avoid expiry during large downloads.
- Layers are downloaded through `GET /api/docker/layer`.
- In the browser, layer blobs are decompressed by magic bytes, hashed to generate `diff_ids`, and packed into a `docker load` compatible TAR.
- zstd-compressed layers currently throw an explicit unsupported error.

### MSStore

- Input accepts Microsoft Store URLs, `ProductId`, `PackageFamilyName`, and `CategoryId`.
- The client auto-detects the request type before calling the API.
- The client defaults to `market=US` and `language=en-us` because the global catalog has the best coverage.
- Resolution goes through `GET /api/msstore/resolve`.
- The resolve route combines display catalog metadata with file links from `store.rg-adguard.net`.
- HTTP package links from approved Microsoft hosts are re-proxied through `GET /api/msstore/download`; HTTPS links are used directly.
- File names are parsed and sorted so the UI can present a searchable package picker.

## API Proxy Pattern

Local API routes under `src/app/api/` handle all upstream communication that needs CORS workarounds, auth headers, or binary streaming:

- VSCode Marketplace query
- Chrome search/detail/download
- Edge search/detail/download
- Docker Hub search/tags/auth/manifest/layer
- Microsoft Store resolve/download

The browser never calls Docker Hub, Chrome/Edge download endpoints, or the Microsoft Store resolver service directly.

## Testing

- Playwright tests live in `tests/e2e/`.
- `playwright.config.ts` starts a production-style server with `pnpm build && pnpm start --hostname 127.0.0.1 --port 3100`.
- Tests mock same-origin `/api/*` routes rather than hitting third-party networks.
- Coverage includes:
  - VSCode direct-link generation and history persistence
  - Chrome CRX/ZIP download preparation
  - Edge store-URL resolution and search suggestions
  - Docker TAR creation and invalid-layer tolerance
  - MSStore raw ProductId detection and HTTP proxy fallback
