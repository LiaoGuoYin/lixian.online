# Lixian.Online

帮助开发者获取 VSCode 插件、Chrome 扩展、Docker 镜像和 Microsoft Store 应用的离线安装资源，并在受限网络环境下安装。

**在线体验：** [lixian.online](https://lixian.online)

**说明文档：** [English](./README.md) | [中文文档](./README.zh.md)

![lixian.online](.github/assets/homepage.png)

## 功能

| 功能 | 输入 | 输出 |
|------|------|------|
| VSCode 插件 | Marketplace 页面 URL | `.vsix` 离线安装包直链 |
| Chrome 扩展 | 扩展名称 / 32 位 ID | `.crx` + `.zip` 文件 |
| Docker 镜像 | 镜像名称（如 `nginx:latest`） | `docker load` 兼容的 `.tar` 文件 |
| Microsoft Store | URL / ProductId / PackageFamilyName / CategoryId | 可离线下载安装包文件                  |

所有文件下载均在浏览器端完成，服务端仅作 API 代理（绕 CORS）。

## 技术栈

Next.js 16 + React 19 + TypeScript, Tailwind CSS v4 + Radix UI, Axios

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发
pnpm dev

# 构建
pnpm build

# 生产启动
pnpm start

# Lint
pnpm lint

# E2E
pnpm test:e2e
```

## 项目结构

```
src/
├── app/
│   ├── api/                    # API 代理路由（Docker / VSCode / Chrome / MSStore）
│   ├── layout.tsx              # 根布局
│   └── page.tsx                # 首页
├── features/                   # 按功能拆分
│   ├── docker/                 # Docker 镜像下载
│   ├── vscode/                 # VSCode 插件下载
│   ├── chrome/                 # Chrome 扩展下载
│   └── msstore/                # Microsoft Store 应用下载
│       ├── api/                # Service 服务类
│       ├── hooks/              # React Hook（状态 + 流程编排）
│       ├── components/         # UI 组件
│       └── types.ts            # 类型定义
├── hooks/                      # 通用 Hook（useHistory, useToast）
└── shared/                     # 共享工具和 UI 组件
```

## 文档

详细的设计规格和接口文档见 [`docs/`](./docs/)：

- [**spec.md**](./docs/spec.md) — 项目的唯一权威规格

## E2E 测试

项目使用 Playwright 做浏览器端 E2E，策略是：

- 本地和 CI 均使用 `pnpm build` 启动 production 服务器，确保类型检查一致
- 在测试中 mock 同源 `/api/*` 接口
- 覆盖真实 UI、状态流转、Blob 下载链接和 localStorage 行为
- 避免直接依赖第三方网络，降低 flaky

常用命令：

```bash
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
```

## 致谢

- Microsoft Store 安装包解析依赖 [store.rg-adguard.net](https://store.rg-adguard.net/) 提供的公开服务，特此致谢。没有它，本项目的 MSStore 下载功能无法实现。

## License

MIT
