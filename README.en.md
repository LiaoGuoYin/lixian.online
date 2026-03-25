# Lixian.Online

Offline packages, online — helps developers grab offline installers for VSCode extensions, Chrome extensions, and Docker images, and install them in restricted network environments.

**Live demo:** [lixian.online](https://lixian.online) | [中文文档](./README.md)

## Features

| Feature | Input | Output |
|---------|-------|--------|
| VSCode Extensions | Marketplace page URL | Direct `.vsix` download link |
| Chrome Extensions | Extension name / 32-char ID | `.crx` + `.zip` files |
| Docker Images | Image name (e.g. `nginx:latest`) | `docker load` compatible `.tar` file |

All downloads happen entirely in the browser. The server only proxies API requests to bypass CORS.

## Tech Stack

Next.js 16 + React 19 + TypeScript, Tailwind CSS v4 + Radix UI, Axios

## Getting Started

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Production
npm run start

# Lint
npm run lint
```

## Project Structure

```
src/
├── app/
│   ├── api/                    # API proxy routes (Docker / VSCode / Chrome)
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── features/                   # Feature-based modules
│   ├── docker/                 # Docker image download
│   ├── vscode/                 # VSCode extension download
│   └── chrome/                 # Chrome extension download
│       ├── api/                # Service class
│       ├── hooks/              # React Hook (state + orchestration)
│       ├── components/         # UI components
│       └── types.ts            # Type definitions
├── hooks/                      # Shared hooks (useHistory, useToast)
└── shared/                     # Shared utilities and UI components
```

## Documentation

Design specs and API docs are in [`docs/`](./docs/):

- [**spec.md**](./docs/spec.md) — Design spec (architecture, data flow, binary formats, types)
- [**api.md**](./docs/api.md) — API reference (all routes + upstream API details)
- [**api.http**](./docs/api.http) — REST Client test file

## Versioning

The footer version is read from `package.json`. Hover to see build time and commit hash.

```bash
npm run version:patch   # 0.2.0 → 0.2.1
npm run version:minor   # 0.2.0 → 0.3.0
npm run version:major   # 0.2.0 → 1.0.0
```

## License

MIT
