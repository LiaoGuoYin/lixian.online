# Lixian.Online

在线搞定离线包 —— 帮助开发者获取 VSCode 插件、Chrome 扩展和 Docker 镜像的离线安装包，并在受限网络环境下安装。

**在线体验：** [lixian.online](https://lixian.online) | [English](./README.en.md)

## 功能

| 功能 | 输入 | 输出 |
|------|------|------|
| VSCode 插件 | Marketplace 页面 URL | `.vsix` 离线安装包直链 |
| Chrome 扩展 | 扩展名称 / 32 位 ID | `.crx` + `.zip` 文件 |
| Docker 镜像 | 镜像名称（如 `nginx:latest`） | `docker load` 兼容的 `.tar` 文件 |

所有文件下载均在浏览器端完成，服务端仅作 API 代理（绕 CORS）。

## 技术栈

Next.js 16 + React 19 + TypeScript, Tailwind CSS v4 + Radix UI, Axios

## 快速开始

```bash
# 安装依赖
npm install

# 开发
npm run dev

# 构建
npm run build

# 生产启动
npm run start

# Lint
npm run lint
```

## 项目结构

```
src/
├── app/
│   ├── api/                    # API 代理路由（Docker / VSCode / Chrome）
│   ├── layout.tsx              # 根布局
│   └── page.tsx                # 首页
├── features/                   # 按功能拆分
│   ├── docker/                 # Docker 镜像下载
│   ├── vscode/                 # VSCode 插件下载
│   └── chrome/                 # Chrome 扩展下载
│       ├── api/                # Service 服务类
│       ├── hooks/              # React Hook（状态 + 流程编排）
│       ├── components/         # UI 组件
│       └── types.ts            # 类型定义
├── hooks/                      # 通用 Hook（useHistory, useToast）
└── shared/                     # 共享工具和 UI 组件
```

## 文档

详细的设计规格和接口文档见 [`docs/`](./docs/)：

- [**spec.md**](./docs/spec.md) — 设计规格书（架构、数据流、二进制格式、类型定义）
- [**api.md**](./docs/api.md) — 接口文档（所有 API 路由 + 上游 API 参考）
- [**api.http**](./docs/api.http) — REST Client 测试文件

## 版本发布

页脚版本号读取自 `package.json`，hover 显示构建时间和 commit hash。

```bash
npm run version:patch   # 0.2.0 → 0.2.1
npm run version:minor   # 0.2.0 → 0.3.0
npm run version:major   # 0.2.0 → 1.0.0
```

## License

MIT
