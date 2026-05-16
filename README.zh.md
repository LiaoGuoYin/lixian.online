# Lixian.Online

一站式下载 VSCode 插件、Chrome / Edge 扩展、Docker 镜像和 Microsoft Store 应用的安装包 —— 下载一次，随时离线安装。

**在线体验：** [lixian.online](https://lixian.online)

**说明文档：** [English](./README.md) | [中文文档](./README.zh.md)

![lixian.online](.github/assets/homepage.png)

## 能下载什么

| 功能 | 粘贴这些 | 得到这些 |
| --- | --- | --- |
| VSCode 插件 | Marketplace 链接 | `.vsix` 直链 |
| Chrome 扩展 | 名称、扩展 ID 或商店链接 | `.crx` 和/或 `.zip` |
| Microsoft Edge 扩展 | 名称、CRX ID、ProductId 或商店链接 | `.crx` 和/或 `.zip` |
| Docker 镜像 | `nginx:latest`、`library/nginx` 或 Docker Hub 链接 | `docker load` 可导入的 `.tar` |
| Microsoft Store | 商店链接、ProductId、PackageFamilyName 或 CategoryId | `.msix` 下载链接 |

## 自己跑起来

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # 生产构建
pnpm start        # 生产启动（默认 12723 端口）
```

其他脚本：`pnpm lint`、`pnpm test:e2e`、`pnpm test:e2e:headed`、`pnpm test:e2e:ui`。

## 用 Docker 启动

更喜欢容器？仓库已经内置了多阶段 `Dockerfile` 和 `docker-compose.yaml`：

```bash
docker compose up -d        # 构建镜像并后台启动
docker compose logs -f      # 跟随日志
docker compose down         # 停止并移除容器
```

启动后访问 <http://localhost:12723> 即可。如需修改宿主机端口，编辑 `docker-compose.yaml` 中的 `ports`（例如 `"8080:12723"`）。

## 自建部署提示

> **请选择一台到上游服务网络通畅的服务器。** 本项目会代理请求到 Docker Hub、Chrome Web Store、Edge Add-ons、VSCode Marketplace、Microsoft Store 等上游，服务器到这些地址的网络路径需要足够稳定、低延迟，下载才能顺利完成。从中国大陆出境到上述服务通常延迟较高、链路不稳，因此强烈建议选择大陆以外的地区（例如新加坡、日本、美国、欧洲等 VPS），否则页面能打开，但下载可能卡住或超时。

## 文档

- [docs/spec.md](./docs/spec.md) —— 完整行为规格
- [docs/api.http](./docs/api.http) —— 本地调试用的 REST Client 示例
- [CLAUDE.md](./CLAUDE.md) —— 仓库内编码代理使用说明

## 致谢

- Microsoft Store 安装包解析依赖 [store.rg-adguard.net](https://store.rg-adguard.net/) 提供的公开服务。

## License

MIT
