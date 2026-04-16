# Lixian.Online

帮助开发者在受限网络环境下获取 VSCode 插件、Chrome 扩展、Microsoft Edge 扩展、Docker 镜像和 Microsoft Store 应用的离线安装资源。

**在线体验：** [lixian.online](https://lixian.online)

**说明文档：** [English](./README.md) | [中文文档](./README.zh.md)

![lixian.online](.github/assets/homepage.png)

## 功能

| 功能 | 支持输入 | 输出结果 | 说明 |
| --- | --- | --- | --- |
| VSCode 插件 | 带 `itemName=` 的 Marketplace 链接 | `.vsix` 直链 | 先通过 `/api/vscode/query` 查询版本，最终文件直接从 Marketplace 下载 |
| Chrome 扩展 | 扩展名称、32 位 ID、商店链接 | `.crx` 和/或 `.zip` | 搜索、详情、下载均走同源 API；`.zip` 在浏览器中由 CRX 转换得到 |
| Microsoft Edge 扩展 | 扩展名称、32 位 CRX ID、12 位 ProductId、商店链接 | `.crx` 和/或 `.zip` | 搜索、详情、下载走 `/api/edge/*`；`.zip` 在浏览器中由 CRX 转换得到 |
| Docker 镜像 | `nginx:latest`、`library/nginx`、`hub.docker.com/r/library/nginx` 等 | `docker load` 可导入的 `.tar` | 认证、manifest、layer 通过代理获取，解压和重新打包在浏览器端完成 |
| Microsoft Store | 商店链接、`ProductId`、`PackageFamilyName`、`CategoryId` | 安装包下载链接 | 通过 `/api/msstore/resolve` 解析；HTTP 下载地址会再走 `/api/msstore/download` 同源代理 |

## 关键行为

- `/` 会重定向到 `/vscode`，每个功能页都可以通过 `/{tab}` 直接访问。
- 当前 tab 为 `vscode`、`chrome`、`msedge`、`docker`、`msstore`。
- 首次加载时只有当前激活的 tab 会接收 `?q=` 初始值。
- 成功解析后，当前输入会同步到 `?q=`，方便分享和重新打开同一条查询。
- 切换标签时，地址会改写成 `/{tab}`，并清除当前查询字符串。
- 切换标签时各面板不会卸载，因此同一会话内每个标签页的内存状态会被保留。
- 最近输入会写入 `localStorage`：`history:vscode`、`history:chrome`、`history:msedge`、`history:docker`、`history:msstore`。
- 服务端只在需要处理 CORS、鉴权或 HTTP 下载链接时代理上游请求或文件流。

## 技术栈

Next.js 16、React 19、TypeScript、Tailwind CSS v4、Radix UI、Axios、Playwright、Vercel Analytics。

## 快速开始

```bash
pnpm install

# 开发（Next.js dev，默认带 Node inspector）
pnpm dev

# 提供给 Playwright 使用的开发服务
pnpm dev:e2e

# 生产构建
pnpm build

# 生产启动（默认监听 12723 端口，可通过参数覆盖）
pnpm start

# Lint
pnpm lint

# E2E
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
```

## 项目结构

```text
src/
├── app/
│   ├── [tab]/                  # Tab 壳层、路由校验、query 同步
│   ├── api/                    # Next.js 上游代理路由
│   ├── layout.tsx              # Metadata、toast、analytics
│   └── page.tsx                # / -> /vscode 重定向
├── features/
│   ├── registry.ts             # Tab 注册表和动态加载元数据
│   ├── vscode/
│   ├── chrome/
│   ├── edge/
│   ├── docker/
│   └── msstore/
├── hooks/                      # 通用 Hook（history、toast）
└── shared/                     # 共享 UI 组件和工具函数

tests/e2e/                      # Playwright 浏览器测试
docs/                           # 规格说明和接口示例
```

每个功能模块基本都遵循同一拆分方式：

- `api/`：封装调用本地 API 路由的服务
- `hooks/`：状态管理与异步流程编排
- `components/`：功能 UI
- `types.ts`：功能相关类型

当前还有几处功能专用辅助文件：

- `src/features/edge/utils/edgeInput.ts`：Edge 输入解析
- `src/features/docker/utils/tarBuilder.ts`：浏览器端 `docker load` TAR 打包
- `src/features/msstore/download.ts`：把允许代理的 HTTP 安装包链接改写为本地下载地址

## 文档

- [docs/spec.md](./docs/spec.md)：与当前实现对齐的行为和接口规格
- [docs/api.http](./docs/api.http)：本地手工调试用的 REST Client 示例
- [CLAUDE.md](./CLAUDE.md)：仓库内编码代理使用说明

## E2E 测试

Playwright 运行在接近生产的服务方式上：

- `playwright.config.ts` 使用 `pnpm build && pnpm start --hostname 127.0.0.1 --port 3100`
- 测试内部 mock 同源 `/api/*` 路由，不直接依赖第三方网络
- 覆盖 VSCode 直链生成与历史记录持久化、Chrome CRX/ZIP 下载、Edge 链接解析与搜索建议、Docker TAR 打包与无效 layer 容错，以及 MSStore 输入识别与 HTTP 下载代理回退

## 致谢

- Microsoft Store 安装包解析依赖 [store.rg-adguard.net](https://store.rg-adguard.net/) 提供的公开服务。

## License

MIT
