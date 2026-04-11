# Lixian.Online

Helps developers get offline resources for VSCode extensions, Chrome extensions, Docker images, and Microsoft Store apps in restricted network environments.

**Live demo:** [lixian.online](https://lixian.online)

**Docs:** [English](./README.md) | [中文文档](./README.zh.md)

![lixian.online](.github/assets/homepage.png)

## Features

| Feature | Input | Output |
|---------|-------|--------|
| VSCode Extensions | Marketplace page URL | Direct `.vsix` download link |
| Chrome Extensions | Extension name / 32-char ID | `.crx` + `.zip` files |
| Docker Images | Image name (e.g. `nginx:latest`) | `docker load` compatible `.tar` file |
| Microsoft Store | URL / ProductId / PackageFamilyName / CategoryId | Offline-installable package files |

All downloads happen in the browser. The server only proxies API requests to bypass CORS.

## Tech Stack

Next.js 16 + React 19 + TypeScript, Tailwind CSS v4 + Radix UI, Axios

## Getting Started

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Production
pnpm start

# Lint
pnpm lint

# E2E
pnpm test:e2e
```

## Project Structure

```
src/
├── app/
│   ├── api/                    # API proxy routes (Docker / VSCode / Chrome / MSStore)
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── features/                   # Feature-based modules
│   ├── docker/                 # Docker image download
│   ├── vscode/                 # VSCode extension download
│   ├── chrome/                 # Chrome extension download
│   └── msstore/                # Microsoft Store app download
│       ├── api/                # Service class
│       ├── hooks/              # React Hook (state + orchestration)
│       ├── components/         # UI components
│       └── types.ts            # Type definitions
├── hooks/                      # Shared hooks (useHistory, useToast)
└── shared/                     # Shared utilities and UI components
```

## Documentation

Design specs and API docs are in [`docs/`](./docs/):

- [**spec.md**](./docs/spec.md) — The canonical implementation spec

## E2E Testing

The project uses Playwright for browser-level E2E with a mock-upstream strategy:

- Both local and CI use `pnpm build` to start a production server, ensuring consistent type checking
- Mock same-origin `/api/*` routes inside tests
- Cover real UI behavior, state transitions, Blob download links, and localStorage
- Avoid flaky dependence on third-party networks

Common commands:

```bash
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
```

## Acknowledgements

- Microsoft Store package resolution relies on the public service provided by [store.rg-adguard.net](https://store.rg-adguard.net/). Huge thanks to them — the MSStore download feature would not exist without it.

## License

MIT
