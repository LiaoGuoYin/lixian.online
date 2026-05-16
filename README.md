# Lixian.Online

A one-stop tool to grab installer packages for VSCode extensions, Chrome/Edge add-ons, Docker images, and Microsoft Store apps — download once, install anywhere, even offline.

**Live demo:** [lixian.online](https://lixian.online)

**Docs:** [English](./README.md) | [中文文档](./README.zh.md)

![lixian.online](.github/assets/homepage.png)

## What you can download

| Feature | Paste this | Get this |
| --- | --- | --- |
| VSCode Extensions | Marketplace URL | `.vsix` direct link |
| Chrome Extensions | Name, extension ID, or Web Store URL | `.crx` and/or `.zip` |
| Microsoft Edge Add-ons | Name, CRX ID, ProductId, or Edge Add-ons URL | `.crx` and/or `.zip` |
| Docker Images | `nginx:latest`, `library/nginx`, or Docker Hub URL | `docker load` compatible `.tar` |
| Microsoft Store | Store URL, ProductId, PackageFamilyName, or CategoryId | `.msix` download link |

## Run it yourself

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm start        # production server (default port 12723)
```

Other scripts: `pnpm lint`, `pnpm test:e2e`, `pnpm test:e2e:headed`, `pnpm test:e2e:ui`.

## Run with Docker

Prefer containers? The repo ships a multi-stage `Dockerfile` and a `docker-compose.yaml`:

```bash
docker compose up -d        # build the image and start in the background
docker compose logs -f      # follow logs
docker compose down         # stop and remove the container
```

Then open <http://localhost:12723>. Change the host port by editing the `ports` mapping in `docker-compose.yaml` (e.g. `"8080:12723"`).

## Self-hosting tips

> **Pick a server with a clean route to the upstreams.** This project proxies requests to Docker Hub, the Chrome Web Store, Edge Add-ons, the VSCode Marketplace, and Microsoft Store endpoints. The network path from your server to these services needs to be fast and stable for downloads to work. From mainland China the route is often slow or unstable, so a VPS elsewhere (Singapore, Japan, US, Europe, etc.) is strongly recommended — otherwise the page will load but downloads may hang or time out.

## Documentation

- [docs/spec.md](./docs/spec.md) — full behavior spec
- [docs/api.http](./docs/api.http) — REST Client examples for local testing
- [CLAUDE.md](./CLAUDE.md) — guidance for coding agents

## Acknowledgements

- Microsoft Store package resolution relies on the public service provided by [store.rg-adguard.net](https://store.rg-adguard.net/).

## License

MIT
