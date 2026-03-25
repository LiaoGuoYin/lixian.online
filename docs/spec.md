# Lixian.Online 项目设计规格书

> 本文档是项目的完整实现规格。一个工程师仅凭此文档（不看源代码），应能从零实现出功能等价的系统。

---

## 1. 项目概述

**名称：** Lixian.Online（lixian.online）

**定位：** 在线离线包下载工具，帮助用户在受限网络环境下获取开发资源的离线安装包。

**核心功能：**

| 功能 | 输入 | 输出 |
|------|------|------|
| VSCode 插件下载 | Marketplace 页面 URL | `.vsix` 离线安装包直链 |
| Chrome 扩展下载 | 扩展名称 / 32 位 ID | `.crx` 和 `.zip` 文件（浏览器端生成 Blob URL） |
| Docker 镜像下载 | 镜像名称（如 `nginx:latest`） | `docker load` 兼容的 `.tar` 文件（浏览器端生成 Blob URL） |

---

## 2. 技术选型

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|----------|
| 框架 | Next.js (App Router) | 16.x | SSR + API Routes 统一部署，API 代理绕过 CORS |
| UI 库 | React | 19.x | 生态成熟 |
| 类型系统 | TypeScript | 5.x | 类型安全 |
| 样式 | Tailwind CSS | v4 | 原子化 CSS，零运行时 |
| UI 原语 | Radix UI | — | 无样式、可访问的底层组件 |
| 组件变体 | class-variance-authority (CVA) | 0.7.x | 声明式组件变体管理 |
| 类名工具 | clsx + tailwind-merge | — | 合并/去重 Tailwind 类名 |
| 图标 | lucide-react | 0.577.x | 体积小、树摇友好 |
| HTTP 客户端 | Axios | 1.x | 浏览器端 HTTP 请求封装 |
| 状态管理 | React Hooks (useState/useCallback/useRef) | — | 轻量，无需全局 store |
| 分析 | @vercel/analytics | 2.x | 零配置部署分析 |
| 字体 | Inter (Google Fonts) | — | 可变字体，拉丁子集 |

**运行时要求：** Node.js 22+

---

## 3. 目录结构

```
lixian.online/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── layout.tsx                    # 根布局（字体、元数据、Toaster、Analytics）
│   │   ├── page.tsx                      # 首页（Tab 切换三个下载器）
│   │   ├── globals.css                   # Tailwind v4 主题、全局样式
│   │   └── api/                          # API 代理路由
│   │       ├── docker/
│   │       │   ├── auth/route.ts         # Docker Registry 认证令牌
│   │       │   ├── tags/route.ts         # 镜像标签列表
│   │       │   ├── manifest/route.ts     # 镜像清单（含多架构自动选择）
│   │       │   ├── layer/route.ts        # 层数据流式下载
│   │       │   └── search/route.ts       # Docker Hub 搜索
│   │       ├── vscode/
│   │       │   └── query/route.ts        # VSCode Marketplace 查询
│   │       └── chrome/
│   │           ├── download/route.ts     # CRX 文件下载
│   │           └── search/route.ts       # Chrome Web Store 搜索
│   ├── features/                         # 按功能拆分的模块
│   │   ├── docker/
│   │   │   ├── api/DockerService.ts      # 服务类：解析、下载、TAR 生成
│   │   │   ├── hooks/useDockerDownloader.ts
│   │   │   ├── components/DockerDownloader.tsx
│   │   │   ├── types.ts
│   │   │   └── utils/tarBuilder.ts       # 浏览器端 TAR 构建器
│   │   ├── vscode/
│   │   │   ├── api/VSCodeService.ts
│   │   │   ├── hooks/useVSCodeDownloader.ts
│   │   │   ├── components/VSCodeDownloader.tsx
│   │   │   └── types.ts
│   │   └── chrome/
│   │       ├── api/ChromeService.ts      # 含 CRX→ZIP 二进制转换
│   │       ├── hooks/useChromeDownloader.ts
│   │       ├── components/ChromeDownloader.tsx
│   │       └── types.ts
│   ├── hooks/
│   │   ├── useHistory.ts                 # localStorage 历史记录
│   │   └── useToast.ts                   # Toast 通知（基于 Radix）
│   └── shared/
│       ├── lib/
│       │   ├── http.ts                   # Axios 封装（get/post/put/del）
│       │   ├── site.ts                   # 站点元数据常量
│       │   └── util.ts                   # cn() 类名合并函数
│       └── ui/                           # Radix + CVA 封装的 UI 组件
│           ├── button.tsx
│           ├── card.tsx
│           ├── input.tsx
│           ├── input-with-history.tsx     # 带历史下拉的输入框（Portal）
│           ├── loading-spinner.tsx
│           ├── searchable-select.tsx      # 可搜索下拉选择（Portal）
│           ├── select.tsx
│           ├── tabs.tsx
│           ├── toast.tsx
│           └── toaster.tsx
├── next.config.js                        # 构建时注入版本/时间/commit
├── tsconfig.json                         # paths: @/* → ./src/*
├── postcss.config.mjs                    # @tailwindcss/postcss
├── components.json                       # shadcn/ui 配置
└── package.json
```

---

## 4. 系统架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      浏览器                              │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ VSCode      │  │ Chrome       │  │ Docker        │  │
│  │ Downloader  │  │ Downloader   │  │ Downloader    │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │          │
│  ┌──────┴──────┐  ┌──────┴───────┐  ┌───────┴───────┐  │
│  │ useVSCode   │  │ useChrome    │  │ useDocker     │  │
│  │ Downloader  │  │ Downloader   │  │ Downloader    │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │          │
│  ┌──────┴──────┐  ┌──────┴───────┐  ┌───────┴───────┐  │
│  │ VSCode      │  │ Chrome       │  │ Docker        │  │
│  │ Service     │  │ Service      │  │ Service       │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │          │
│  ┌──────┴────────────────┴───────────────────┴───────┐  │
│  │              Axios HTTP / fetch()                  │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTP
┌─────────────────────────┼───────────────────────────────┐
│                   Next.js Server                        │
│                         │                               │
│  ┌──────────────────────┴────────────────────────────┐  │
│  │              API Route Handlers                    │  │
│  │  /api/docker/*   /api/vscode/*   /api/chrome/*    │  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │ fetch()                       │
└─────────────────────────┼───────────────────────────────┘
                          │
         ┌────────────────┼─────────────────┐
         ▼                ▼                 ▼
  Docker Registry   VSCode Marketplace   Chrome Update
  auth.docker.io    marketplace.         clients2.google
  registry-1.       visualstudio.com     .com
  docker.io                              chromewebstore.
  hub.docker.com                         google.com
```

### 4.2 API 代理模式

**核心约束：浏览器永远不直接调用外部服务。**

所有外部 API 调用通过 Next.js API Route Handler 代理，原因：

1. **CORS 绕过** — Docker Registry / Chrome Update Service 不允许浏览器跨域请求
2. **认证隔离** — Token 不暴露在前端代码中
3. **请求伪装** — 服务端可设置自定义 User-Agent

**例外：** VSCode 插件的最终下载链接（`vspackage` URL）直接在浏览器打开，因为 Marketplace 允许跨域下载。

所有 API 路由均返回 CORS 头和 OPTIONS 预检响应：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 4.3 Feature 模块结构

每个功能模块遵循统一的四层结构：

```
feature/
├── types.ts           # 1. 类型定义层：接口和类型
├── api/Service.ts     # 2. 服务层：与 API 通信、数据转换、二进制处理
├── hooks/useXxx.ts    # 3. 状态层：React Hook 管理状态和流程编排
└── components/Xxx.tsx # 4. 视图层：纯 UI 组件，消费 Hook 返回值
```

**调用关系：** `Component → Hook → Service → API Route → 外部服务`

---

## 5. 数据流

### 5.1 Docker 镜像下载流

这是最复杂的流程，涉及多步 API 调用和浏览器端二进制文件生成。

```
用户输入 "nginx:latest"
        │
        ▼
extractImageInfo(imageUrl)
  解析多种格式：
  - "nginx:latest" → { registry:"docker.io", namespace:"library", repository:"nginx", tag:"latest" }
  - "library/nginx:latest"
  - "docker.io/library/nginx:latest"
  - "hub.docker.com/r/library/nginx" (URL 格式)
  解析规则：
    1 段 → namespace 默认 "library"
    2 段 → 第一段为 namespace
    3 段 → 第一段为 registry
    tag 默认 "latest"
        │
        ▼
GET /api/docker/tags?namespace=library&repository=nginx
  → 上游: https://registry.hub.docker.com/v2/repositories/library/nginx/tags?page_size=100
  → 返回: { results: [{ name: "latest" }, { name: "alpine" }, ...] }
  → 提取 tag 名称数组
        │
        ├── 若 404 → 搜索候选镜像
        │   GET /api/docker/search?q=nginx&page_size=5
        │   → 上游: https://hub.docker.com/v2/search/repositories/?query=nginx&page_size=5
        │   → 展示候选列表供用户选择
        │
        ▼
用户选择 tag → 用户点击"下载"
        │
        ▼
GET /api/docker/auth?namespace=library&repository=nginx
  → 上游: https://auth.docker.io/token?service=registry.docker.io&scope=repository:library/nginx:pull
  → 返回: { token: "eyJ..." }
        │
        ▼
GET /api/docker/manifest?namespace=library&repository=nginx&tag=latest&token=eyJ...
  → 上游: https://registry-1.docker.io/v2/library/nginx/manifests/latest
  → 请求头: Authorization: Bearer {token}
            Accept: application/vnd.docker.distribution.manifest.v2+json
  → 若返回 manifest list（多架构）:
      自动选择 platform.architecture=amd64 && platform.os=linux
      用其 digest 重新请求具体 manifest
  → 返回: { schemaVersion, config: { digest }, layers: [{ digest, size }] }
        │
        ▼
FOR EACH layer IN manifest.layers:
  GET /api/docker/layer?namespace=library&repository=nginx&digest={digest}&token={token}
    → 上游: https://registry-1.docker.io/v2/library/nginx/blobs/{digest}
    → 流式传输，不在服务端缓冲
    → 返回: gzip 压缩的 layer tar Blob
        │
        ▼
浏览器端处理（DockerService.generateDockerLoadTar）:
  1. 对每个 layer Blob 执行 decompressAndHash():
     - 使用 DecompressionStream('gzip') 解压
     - 使用 crypto.subtle.digest('SHA-256') 计算解压后数据的哈希
     - 得到 { data: Uint8Array, sha256: "sha256:abc..." }
  2. 使用 TarBuilder 构建 docker load 兼容的 TAR（见 6.1 节）
  3. URL.createObjectURL(tarBlob) 生成下载链接
        │
        ▼
<a href={blobUrl} download="nginx-latest.tar">下载</a>
```

### 5.2 VSCode 插件下载流

```
用户粘贴 "https://marketplace.visualstudio.com/items?itemName=ms-python.python"
        │
        ▼
extractExtensionInfo(url)
  解析 URL 的 itemName 参数
  用 lastIndexOf('.') 分割（处理 publisher 含点号的情况）
  → { publisher: "ms-python", extension: "python", version: null }
        │
        ▼
用户点击"解析" → handleSubmit()
        │
        ▼
POST /api/vscode/query
  → 上游: https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery
  → 请求头: Accept: application/json;api-version=3.0-preview.1
  → 请求体:
    {
      "filters": [{
        "criteria": [{ "filterType": 7, "value": "ms-python.python" }],
        "pageNumber": 1, "pageSize": 1, "sortBy": 0, "sortOrder": 0
      }],
      "flags": 1  // 0x1 = 仅返回版本列表
    }
  → 提取: results[0].extensions[0].versions → 去重取前 20 个
        │
        ▼
用户选择版本 → useEffect 自动触发 getDownloadUrl()
        │
        ▼
生成直链（不经过代理，Marketplace 允许跨域下载）:
  https://marketplace.visualstudio.com/_apis/public/gallery/publishers/
    {publisher}/vsextensions/{extension}/{version}/vspackage
        │
        ▼
<a href={downloadUrl} target="_blank">下载</a>
```

### 5.3 Chrome 扩展下载流

```
用户输入扩展名称 / 32 位 ID / Web Store URL
        │
        ├── 实时解析 ID（onChange）:
        │   extractExtensionId(input)
        │     - URL: 正则 /([a-z]{32})/ 提取
        │     - 直接 ID: /^[a-z]{32}$/ 校验
        │
        ├── 防抖搜索（400ms）:
        │   GET /api/chrome/search?q={keyword}
        │     → 上游: https://chromewebstore.google.com/search/{keyword}
        │     → 从 HTML 中正则提取: /detail\/([^/]+)\/([a-z]{32})/g
        │     → slug 转可读名: "ublock-origin" → "Ublock Origin"（首字母大写、连字符转空格）
        │     → 去重，最多 10 条
        │   跳过搜索的条件：输入 < 2 字符 / 已是 32 位 ID / 包含 . 或 /
        │
        ▼
用户点击"解析" → handleSubmit()
  校验 ID 格式: /^[a-z]{32}$/
  → 设置 extensionInfo (name/version 为占位符)
        │
        ▼
用户点击下载 → handleDownload(format: 'crx' | 'zip' | 'both')
        │
        ▼
GET /api/chrome/download?id={extensionId}
  → 上游: https://clients2.google.com/service/update2/crx?...
  → 服务端使用 Chrome User-Agent 伪装
  → 返回: CRX 二进制文件
        │
        ├── format = 'crx':
        │   URL.createObjectURL(crxBlob)
        │
        ├── format = 'zip':
        │   convertCrxToZip(crxBlob) → 见 6.2 节
        │   URL.createObjectURL(zipBlob)
        │
        └── format = 'both':
            同时生成 CRX 和 ZIP 的 Blob URL
            ZIP 转换失败时降级为仅提供 CRX
        │
        ▼
<a href={blobUrl} download="{id}.crx">下载 CRX</a>
<a href={blobUrl} download="{id}.zip">下载 ZIP</a>
```

---

## 6. 关键实现细节

### 6.1 Docker TAR 构建（`docker load` 兼容格式）

浏览器端使用 `TarBuilder` 类（见 6.3 节）生成 `docker load` 可直接导入的 TAR 文件。

#### TAR 内部结构

```
manifest.json                      # 顶层清单
{imageId}.json                     # 镜像配置
{layerId1}/                        # 第一层目录
  VERSION                          # 固定内容 "1.0"
  json                             # 层元数据 JSON
  layer.tar                        # 解压后的层数据（非 gzip）
{layerId2}/                        # 第二层目录
  VERSION
  json
  layer.tar
...
[512 字节全零]                      # TAR 终止标记 1
[512 字节全零]                      # TAR 终止标记 2
```

#### manifest.json

```json
[{
  "Config": "{imageId}.json",
  "RepoTags": ["library/nginx:latest"],
  "Layers": ["{layerId1}/layer.tar", "{layerId2}/layer.tar"]
}]
```

#### {imageId}.json（镜像配置）

```json
{
  "architecture": "amd64",
  "os": "linux",
  "docker_version": "20.10.0",
  "created": "2025-01-01T00:00:00.000Z",
  "config": {
    "Hostname": "", "Domainname": "", "User": "",
    "AttachStdin": false, "AttachStdout": false, "AttachStderr": false,
    "Tty": false, "OpenStdin": false, "StdinOnce": false,
    "Env": ["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"],
    "Cmd": null, "Image": "", "Volumes": null, "WorkingDir": "",
    "Entrypoint": null, "OnBuild": null, "Labels": null
  },
  "container_config": {
    "Hostname": "", "Domainname": "", "User": "",
    "AttachStdin": false, "AttachStdout": false, "AttachStderr": false,
    "Tty": false, "OpenStdin": false, "StdinOnce": false,
    "Env": ["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"],
    "Cmd": ["/bin/sh", "-c", "#(nop) ADD file: in /"],
    "Image": "", "Volumes": null, "WorkingDir": "",
    "Entrypoint": null, "OnBuild": null, "Labels": {}
  },
  "history": [
    { "created": "...", "created_by": "/bin/sh -c #(nop) ADD file: in /" }
  ],
  "rootfs": {
    "type": "layers",
    "diff_ids": ["sha256:abc...", "sha256:def..."]
  }
}
```

**关键约束：** `diff_ids` 必须是**解压后** layer.tar 内容的 SHA-256 哈希（不是 gzip 压缩态的哈希）。`docker load` 会校验此值。

#### {layerId}/json（层元数据）

```json
{
  "id": "{layerId}",
  "parent": "{parentLayerId}",
  "created": "...",
  "container_config": { "Cmd": ["/bin/sh", "-c", "#(nop) ADD file: in /"] }
}
```

第一层无 `parent` 字段，后续层的 `parent` 指向前一层的 ID。

#### ID 生成算法

- **imageId**：对 `"{namespace}/{repository}:{tag}"` 字符串做简单哈希（DJB2 变体），取绝对值后转 16 进制，左补零至 12 位

  ```
  hash = 0
  for each char: hash = ((hash << 5) - hash) + charCode; hash &= hash
  return abs(hash).toString(16).padStart(12, '0')
  ```

- **layerId**：取 digest 的 `sha256:` 前缀后的前 12 个字符

#### 解压与哈希流程

```typescript
async decompressAndHash(blob: Blob): Promise<{ data: Uint8Array; sha256: string }> {
  // 1. 使用 Web API DecompressionStream('gzip') 解压
  // 2. 收集所有 chunk 合并为 Uint8Array
  // 3. crypto.subtle.digest('SHA-256', data) 计算哈希
  // 4. 转为 "sha256:" + hex 字符串
  return { data, sha256 };
}
```

### 6.2 CRX 二进制解析（CRX → ZIP 转换）

Chrome 扩展文件 (CRX) 本质是 ZIP 前加了一个头部。转换过程就是跳过头部提取 ZIP 载荷。

#### CRX3 格式（Chrome 64+）

```
偏移  大小    内容
0     4B     魔数: "Cr24" (0x43723234)
4     4B     版本号: 3 (uint32 little-endian)
8     4B     头部长度 N (uint32 little-endian)
12    NB     protobuf 编码的签名头
12+N  ...    ZIP 数据开始（以 "PK" 开头）
```

#### CRX2 格式（旧版）

```
偏移  大小    内容
0     4B     魔数: "Cr24"
4     4B     版本号: 2 (uint32 little-endian)
8     4B     公钥长度 P (uint32 little-endian)
12    4B     签名长度 S (uint32 little-endian)
16    PB     公钥数据
16+P  SB     签名数据
16+P+S ...   ZIP 数据开始
```

#### 解析优先级

1. 检查前 2 字节是否为 `"PK"` → 已是 ZIP，直接返回
2. 检查前 4 字节是否为 `"Cr24"` → 按版本号（3 或 2）计算偏移
3. 兜底：在前 1024 字节中扫描 `"PK"` 魔数
4. 均未找到 → 假定整个文件为 ZIP 格式
5. 任何解析错误 → 返回原始文件

#### ZIP 校验

提取后验证前 2 字节为 `"PK"` (`0x504B`)，否则抛出错误。

### 6.3 TAR 文件格式（TarBuilder 规范）

浏览器端 TAR 构建器，不依赖任何第三方库。

#### TAR 头部（512 字节）

```
偏移    大小    内容                    格式
0       100B   文件名                  null 结尾的 ASCII
100     8B     文件模式                8 进制，7 位左补零 + null ("0000644\0")
108     8B     用户 ID                 同上 ("0000000\0")
116     8B     组 ID                   同上
124     12B    文件大小                8 进制，11 位左补零 + null
136     12B    修改时间                Unix 时间戳的 8 进制，11 位左补零 + null
148     8B     校验和                  见下方算法
156     1B     类型标志                '0' = 普通文件, '5' = 目录
157     355B   其余字段                全零
```

#### 校验和算法

1. 将 header[148..155]（8 字节）填充为 ASCII 空格 `0x20`
2. 设置好所有其他字段（包括 typeflag）
3. 对 512 字节逐字节求和：`checksum = Σ header[i], i ∈ [0, 511]`
4. 将结果写入 header[148]：6 位 8 进制左补零 + null + 空格 (`"001234\0 "`)

#### 文件对齐

每个文件的数据段必须 512 字节对齐，不足部分补零。

#### 目录条目

- 文件名以 `/` 结尾
- 类型标志为 `'5'`
- 大小为 0
- 模式为 `0000755`

#### TAR 终止

文件末尾追加两个全零的 512 字节块。

#### API

```typescript
class TarBuilder {
  addFile(name: string, content: string | Uint8Array): void
  addDirectory(name: string): void
  build(): Uint8Array
}
```

---

## 7. 类型定义

### Docker

```typescript
interface DockerImageInfo {
  registry: string;      // "docker.io"
  namespace: string;     // "library" | "myuser"
  repository: string;    // "nginx"
  tag: string;           // "latest"
}

interface DockerManifest {
  schemaVersion: number;
  mediaType: string;
  config: {
    mediaType: string;
    size: number;
    digest: string;      // "sha256:..."
  };
  layers: Array<{
    mediaType: string;   // "application/vnd.docker.image.rootfs.diff.tar.gzip"
    size: number;
    digest: string;
  }>;
}

interface DockerTagInfo {
  name: string;
  tags: string[];
}

interface DockerSearchCandidate {
  namespace: string;
  repository: string;
  shortDescription: string;
  starCount: number;
  pullCount: number;
}

interface DockerDownloadProgress {
  layerIndex: number;
  totalLayers: number;
  currentLayerSize: number;
  downloadedSize: number;
  totalSize: number;
  status: 'downloading' | 'completed' | 'error';
}
```

### VSCode

```typescript
interface ExtensionInfo {
  publisher: string;     // "ms-python"
  extension: string;     // "python"
  version: string | null;
}

interface VersionInfo {
  lastUpdated: string;
  shortDescription: string;
  versionList: string[];
}
```

### Chrome

```typescript
interface ChromeExtensionInfo {
  id: string;            // 32 位小写字母
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  rating?: number;
  userCount?: string;
  iconUrl?: string;
}

interface ChromeDownloadInfo {
  extensionId: string;
  downloadUrl: string;
  filename: string;
  fileSize?: number;
}

interface ChromeDownloadProgress {
  status: 'idle' | 'downloading' | 'converting' | 'completed' | 'error';
  progress: number;      // 0-100
  bytesDownloaded: number;
  totalBytes: number;
  error?: string;
}

interface ChromeSearchResult {
  id: string;
  name: string;
}
```

---

## 8. 状态管理

不使用全局 Store，每个功能模块通过自定义 Hook 管理局部状态。

### 各 Hook 状态与回调

#### useDockerDownloader

| 状态 | 类型 | 用途 |
|------|------|------|
| `imageUrl` | `string` | 用户输入 |
| `tagList` | `string[]` | 可用标签 |
| `imageInfo` | `DockerImageInfo \| null` | 解析后的镜像信息 |
| `downloadProgress` | `DockerDownloadProgress \| null` | 下载进度 |
| `downloadUrl` | `string` | Blob URL |
| `loading` | `boolean` | 加载状态 |
| `imageNotFound` | `boolean` | 镜像未找到 |
| `searchCandidates` | `DockerSearchCandidate[]` | 候选镜像 |

| 回调 | 作用 |
|------|------|
| `onImageUrlChange(e)` | 更新输入，重置所有状态 |
| `onTagChange(value)` | 函数式 setState 更新 tag |
| `handleSubmit(e)` | 解析输入、获取标签 |
| `handleDownload()` | 通过 ref 读取 imageInfo，执行完整下载流 |

#### useVSCodeDownloader

| 状态 | 类型 |
|------|------|
| `url` | `string` |
| `versionList` | `string[]` |
| `extensionInfo` | `ExtensionInfo \| null` |
| `downloadUrl` | `string` |
| `loading` | `boolean` |

自动行为：当 `extensionInfo.version` 变化时，`useEffect` 自动调用 `getDownloadUrl()` 更新下载链接。

#### useChromeDownloader

| 状态 | 类型 |
|------|------|
| `extensionUrl` | `string` |
| `extensionInfo` | `ChromeExtensionInfo \| null` |
| `downloadProgress` | `ChromeDownloadProgress \| null` |
| `downloadUrls` | `{ crx?: string; zip?: string }` |
| `loading` | `boolean` |
| `searchResults` | `ChromeSearchResult[]` |
| `searching` | `boolean` |

搜索防抖：`onSearchInputChange` 内使用 `setTimeout` 400ms 防抖，ref 跟踪 timer，组件卸载时清除。

### 通用 Hook

#### useHistory(storageKey: string)

- 状态惰性初始化：`useState(() => localStorage.getItem(key))`
- `add(value)` 函数式更新，去重，保留最新，上限 10 条
- 三个独立 storageKey：`history:docker`、`history:vscode`、`history:chrome`

#### useToast

- 基于 Radix Toast 的全局通知系统
- 模块级 `listeners` 数组 + `memoryState` 实现跨组件状态同步
- `toast({ title, description, variant })` → 创建通知
- 自动 5 秒后移除

### Blob URL 管理

所有功能模块通过 `useRef` 跟踪 Blob URL，遵循：

1. 创建新 Blob URL 前，先 `URL.revokeObjectURL()` 旧的
2. 组件卸载时的 cleanup effect 中释放所有 Blob URL

### useCallback 稳定性策略

- 使用函数式 `setState(prev => ...)` 消除对象依赖
- 使用 `useRef` 同步最新状态，使 download 回调的依赖数组为 `[]`

---

## 9. 缓存策略

| 接口 | Cache-Control | TTL | 理由 |
|------|---------------|-----|------|
| `/api/docker/tags` | `public, max-age=300` | 5 分钟 | 标签变动频繁 |
| `/api/docker/auth` | `public, max-age=1800` | 30 分钟 | Token 有效期通常 > 30 分钟 |
| `/api/docker/manifest` | `public, max-age=3600` | 1 小时 | 清单相对稳定 |
| `/api/docker/search` | `public, max-age=300` | 5 分钟 | 搜索结果时效性 |
| `/api/chrome/download` | `public, max-age=3600` | 1 小时 | 扩展版本不频繁更新 |
| `/api/vscode/query` | 无缓存 | — | 每次查询可能不同 |
| `/api/chrome/search` | 无缓存 | — | 搜索结果实时性 |
| `/api/docker/layer` | 无缓存 | — | 大文件流式传输 |

---

## 10. 安全设计

### 输入校验

| 输入 | 校验规则 |
|------|----------|
| Chrome 扩展 ID | `/^[a-z]{32}$/` 严格匹配 |
| VSCode URL | `new URL()` 解析 + `itemName` 参数存在性 + `lastIndexOf('.')` 分割 |
| Docker 镜像名 | 按 `/` 分段解析，1-3 段各有默认值 |
| Docker search page_size | `Math.min(100, Math.max(1, Math.floor(n)))` 限制范围 |

### 请求伪装

- 通用 User-Agent：`"Mozilla/5.0 (compatible; lixian.online/1.0)"`
- Chrome 下载专用 User-Agent：完整 Chrome 91 浏览器 UA 字符串
- Chrome 搜索附加：`Accept-Language: zh-CN,zh;q=0.9,en;q=0.8`

### 其他

- 输入框添加 `data-1p-ignore` 属性防止密码管理器误触发
- Docker 层下载使用流式传输（`response.body` 直传），避免服务端内存溢出

---

## 11. 构建与部署

### 环境变量注入（构建时）

`next.config.js` 在构建期注入：

```javascript
env: {
  NEXT_PUBLIC_APP_VERSION: require('./package.json').version,
  NEXT_PUBLIC_BUILD_TIME: process.env.NODE_ENV === 'production'
    ? new Date().toISOString()
    : 'development',
  NEXT_PUBLIC_COMMIT_HASH: execFileSync('git', ['rev-parse', '--short', 'HEAD']).trim(),
}
```

页面底部 footer 展示版本号，hover 显示构建时间和 commit hash。

### 命令

```bash
npm run dev        # Next.js 开发服务器（带 --inspect 调试）
npm run build      # 生产构建
npm run start      # 生产启动
npm run lint       # ESLint 检查
```

### 代码拆分

首页三个下载器组件使用 `next/dynamic` 动态导入：

```typescript
const VSCodeDownloader = dynamic(
  () => import("@/features/vscode/components/VSCodeDownloader"),
  { ssr: false, loading: DynamicFallback }
);
```

`ssr: false` 确保组件仅在客户端渲染，避免 hydration mismatch（组件内使用 `localStorage`、`createPortal` 等浏览器 API）。

### 根布局

- HTML `lang="zh"`
- Inter 字体（Google Fonts，拉丁子集，CSS 变量 `--font-inter`）
- Viewport：`width=device-width, initial-scale=1`，主题色 `#007AFF`
- 全局 `<Toaster />` 组件
- `<Analytics />` (Vercel)

---

## 12. UI 设计规范

### 主题

Apple 风格设计语言，使用 CSS 变量定义 HSL 色值，支持明/暗模式。

### 圆角

| Token | 值 |
|-------|-----|
| `apple` | 12px |
| `apple-sm` | 8px |
| `apple-lg` | 16px |
| `apple-xl` | 20px |

### 阴影

| Token | 值 |
|-------|-----|
| `shadow-apple` | `0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)` |
| `shadow-apple-lg` | `0 10px 40px rgba(0,0,0,.08), 0 2px 12px rgba(0,0,0,.04)` |
| `shadow-apple-button` | `0 1px 2px rgba(0,0,0,.06), 0 0 1px rgba(0,0,0,.08)` |

### 动画

| 名称 | 效果 |
|------|------|
| `fadeIn` | 透明度 0→1 + 上移 4px，0.5s |
| `slideUp` | 透明度 0→1 + 上移 20px，0.6s |
| `bounceSubtle` | 微弹跳 1→1.02→0.98→1，0.2s |

### 页面布局

单页应用，居中卡片布局：

- 最大宽度 `max-w-3xl` (48rem)
- 卡片内使用 Radix Tabs 切换三个功能
- 三栏等宽 Tab 按钮（VSCode 插件 | Chrome 拓展 | Docker 镜像）
- 未激活的 Tab 内容使用 CSS `hidden` 隐藏（保留组件状态）

### Portal 组件

`InputWithHistory` 和 `SearchableSelect` 的下拉菜单通过 `createPortal` 渲染到 `document.body`，使用 `mounted` 状态延迟渲染以避免 SSR hydration mismatch。

下拉位置通过 `getBoundingClientRect()` 计算，监听 `scroll`（capture + passive）和 `resize` 事件实时更新。点击外部区域关闭下拉。

---

## 13. 站点配置常量

```typescript
const site = {
  name: "Lixian.Online",
  domain: "lixian.online",
  url: "https://lixian.online",
  description: "在线搞定离线包",
  keywords: ["开发工具", "下载", "VSCode", "插件", "开发者工具"],
  author: "lixian.online",
  userAgent: "Mozilla/5.0 (compatible; lixian.online/1.0)",
  github: "https://github.com/liaoguoyin/offdown",
};
```

---

## 14. HTTP 客户端封装

```typescript
// 默认请求头
const headers = { "Content-Type": "application/json", "Accept": "application/json" };

export const get = (url, params) => axios.get(url, { headers, params });
export const post = (url, payload?, extraHeaders?) =>
  axios.post(url, payload, { headers: { ...headers, ...extraHeaders } });
export const put = (url, data) => axios.put(url, data, { headers });
export const del = (url) => axios.delete(url, { headers });
```

注意：Docker 层下载使用原生 `fetch()` 而非 Axios，因为需要直接操作 `Blob`。
