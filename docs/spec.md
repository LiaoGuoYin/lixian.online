# Lixian.Online 实现规格

> 本文档是项目的唯一权威规格。开发者/LLM只依赖本文档，应能构建出功能等价的系统，而不需要查看原始源码。

## 1. 文档约定

- 本文档只保留可验证、可实现、可测试的要求；目录结构、框架偏好、样式细节、部署供应商不属于规范的一部分。
- 关键字 `MUST`、`MUST NOT`、`SHOULD`、`SHOULD NOT`、`MAY` 按 RFC 2119 / RFC 8174 解释。
- API 章节按 OpenAPI 常见结构组织：路径、方法、用途、参数、请求体、响应、错误、备注。
- 除“示例”外，所有行为描述均为规范性要求。

## 2. 产品定义

Lixian.Online 是一个单页 Web 应用，帮助用户在受限网络环境下获取三类公开开发资源的离线安装包：

| 能力 | 用户输入 | 用户输出 |
| --- | --- | --- |
| VSCode 插件下载 | Marketplace 插件页 URL | `.vsix` 直接下载链接 |
| Chrome 扩展下载 | 扩展名称、扩展 ID、商店 URL | `.crx`、`.zip` 下载链接 |
| Docker 镜像下载 | 镜像名或 Docker Hub URL | 可被 `docker load` 导入的 `.tar` 文件 |

系统 MUST 同时包含以下两部分：

- 浏览器端应用：负责交互、状态管理、二进制处理、Blob URL 生成。
- 服务端代理 API：负责访问上游站点、规避 CORS、携带合适的请求头、流式转发大文件。

## 3. 范围与非目标

### 3.1 范围内

- 仅处理公开、匿名可访问的资源。
- 仅提供下载能力，不处理安装、依赖解析、更新检查。
- Docker 镜像下载在浏览器端完成层解压、SHA-256 计算、`docker load` tar 打包。
- Chrome 扩展下载在浏览器端完成 CRX 到 ZIP 的转换。
- 页面为单页应用，默认首页即主界面。
- 页面内切换功能标签时，当前标签状态 SHOULD 保留，不因切换而重置。

### 3.2 明确不做

- 不支持登录、用户体系、私有仓库或任何凭证输入。
- 不支持服务端持久化、缓存文件落盘、断点续传。
- 不支持 Docker 平台手动选择；多架构镜像固定选择 `linux/amd64`。
- 不保证移动端适配。
- 不保证对上游页面结构变更具有鲁棒性，尤其是 Chrome Web Store HTML 抓取。

## 4. 运行时与外部依赖

### 4.1 浏览器能力

浏览器端实现 MUST 具备以下能力：

- `fetch`
- `ReadableStream`
- `Blob`
- `URL.createObjectURL`
- `crypto.subtle.digest`
- `DecompressionStream("gzip")`
- `localStorage`

本项目面向现代桌面浏览器。

### 4.2 服务端能力

服务端实现 MUST：

- 能发起 HTTP 请求到外部上游。
- 能返回 JSON、二进制响应和流式响应。
- 对 Docker 层下载 MUST 直接流式转发，不得先完整缓冲到服务端内存后再返回。

### 4.3 上游系统

实现依赖以下上游接口或页面：

- VSCode Marketplace
  - `POST https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery`
  - `GET https://marketplace.visualstudio.com/_apis/public/gallery/publishers/{publisher}/vsextensions/{extension}/{version}/vspackage`
- Chrome Web Store / Chrome Update Service
  - `GET https://chromewebstore.google.com/search/{query}`
  - `GET https://chromewebstore.google.com/detail/{extensionId}`
  - `GET https://clients2.google.com/service/update2/crx?...`
- Docker Hub / Docker Registry
  - `GET https://registry.hub.docker.com/v2/repositories/{namespace}/{repository}/tags?page_size=100`
  - `GET https://hub.docker.com/v2/search/repositories/?query={q}&page_size={page_size}`
  - `GET https://auth.docker.io/token?service=registry.docker.io&scope=repository:{namespace}/{repository}:pull`
  - `GET https://registry-1.docker.io/v2/{namespace}/{repository}/manifests/{ref}`
  - `GET https://registry-1.docker.io/v2/{namespace}/{repository}/blobs/{digest}`
- Microsoft Store
  - `GET https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds={productId}&market={market}&languages={language}` —— 产品元数据
  - `POST https://store.rg-adguard.net/api/GetFiles` —— 安装包直链解析，由第三方服务 [store.rg-adguard.net](https://store.rg-adguard.net/) 提供。MSStore 下载功能强依赖该服务，若其不可用，则只能返回产品元数据而无法给出下载链接。特此致谢。

## 5. 页面与共享行为

### 5.1 页面骨架

首页 `/` MUST 包含：

- 顶部标题 `Lixian.Online`
- 一段简短站点描述
- 三个标签页：`VSCode 插件`、`Chrome 拓展`、`Docker 镜像`
- 默认激活标签：`VSCode 插件`
- 页脚版本号，格式为 `v{version}`
- 指向 GitHub 仓库的外链

版本信息来源：

- `NEXT_PUBLIC_APP_VERSION`，缺省值 `0.1.0`
- `NEXT_PUBLIC_BUILD_TIME`，缺省值 `unknown`
- `NEXT_PUBLIC_COMMIT_HASH`，缺省值 `unknown`

### 5.2 全局反馈

- 每个主要操作成功或失败后 SHOULD 给出即时反馈，例如 toast。
- 二进制下载型操作 SHOULD 展示阶段性进度。

### 5.3 历史记录

系统 MUST 为 3 个输入框分别维护最近输入历史：

| 功能 | localStorage key |
| --- | --- |
| VSCode | `history:vscode` |
| Chrome | `history:chrome` |
| Docker | `history:docker` |

历史记录规则：

- 最多保留 10 条。
- 新值插入头部。
- 重复值去重后前移。
- 仅保存去除首尾空格后的非空字符串。
- 历史下拉 SHOULD 按当前输入做不区分大小写的包含匹配。

### 5.4 Blob URL 生命周期

- Chrome 和 Docker 下载完成后，客户端 MUST 使用 Blob URL 暴露下载结果。
- 重新下载前 MUST 撤销旧的 Blob URL。
- 组件卸载时 MUST 撤销所有仍存活的 Blob URL。

## 6. 功能规格

### 6.1 VSCode 插件下载

#### 6.1.1 输入与解析

- 输入 MUST 是 VSCode Marketplace 插件页 URL。
- URL 中 MUST 存在查询参数 `itemName`。
- `itemName` MUST 形如 `publisher.extension`。
- 解析时 MUST 使用最后一个 `.` 分割 publisher 与 extension，以兼容包含 `.` 的 publisher。
- 解析阶段不要求 version；version 初始值为 `null`。

非法输入的错误语义：

- URL 不合法或仍在输入中：可暂不报错，但不可形成有效插件信息。
- 缺少 `itemName`：报错“无效的插件 URL”。
- `itemName` 中没有 `.`：报错“无效的插件 ID 格式，应为 publisher.extension”。

#### 6.1.2 查询版本

用户提交后，客户端 MUST 调用 `POST /api/vscode/query`，请求体固定为：

```json
{
  "filters": [
    {
      "criteria": [
        {
          "filterType": 7,
          "value": "publisher.extension"
        }
      ],
      "pageNumber": 1,
      "pageSize": 1,
      "sortBy": 0,
      "sortOrder": 0
    }
  ],
  "flags": 1
}
```

版本列表提取规则：

- 从 `results[0].extensions[0].versions[].version` 读取。
- 去重。
- 保持上游顺序。
- 最多保留前 20 个版本。

若未找到扩展，客户端 MUST 报错“未找到该插件，请检查 URL 是否正确”。

#### 6.1.3 下载

- 版本列表返回后，页面 MUST 展示版本选择器。
- 用户选择版本后，客户端 MUST 直接构造 `.vsix` 下载 URL，而不是再经由本项目代理。
- URL 模板如下：

```text
https://marketplace.visualstudio.com/_apis/public/gallery/publishers/{publisher}/vsextensions/{extension}/{version}/vspackage
```

- 页面 MUST 将此 URL 暴露为可点击下载链接。

### 6.2 Chrome 扩展下载

#### 6.2.1 输入与搜索

Chrome 标签页输入框 MUST 接受以下任一形式：

- 扩展名称
- 32 位扩展 ID
- Chrome Web Store URL

搜索行为：

- 输入变化后 SHOULD 触发 400ms 防抖。
- 满足以下任一条件时 MUST 跳过搜索：
  - 去除空格后长度小于 2
  - 输入为 32 位小写字母 ID
  - 输入包含 `.` 或 `/`
- 其余情况 MUST 调用 `GET /api/chrome/search?q=...`。

#### 6.2.2 ID 提取

提交时客户端 MUST 从输入中提取扩展 ID，规则如下：

- 优先用正则 `([a-z]{32})` 在整段输入中查找。
- 若输入整体是 32 位字母，可按小写化后接受。
- 无法得到合法 ID 时 MUST 报错“无效的 Chrome 扩展 URL 或 ID”。

#### 6.2.3 详情查询

解析出 ID 后，客户端 MUST 调用 `GET /api/chrome/detail?id={id}` 获取名称和描述。

- 若成功，页面显示 `name`、`description`、`id`。
- 若失败，客户端 MAY 降级为只显示 `id`，不阻断后续下载。

#### 6.2.4 下载格式

页面 MUST 提供 3 个下载动作：

- 仅下载 CRX
- 仅下载 ZIP
- 同时准备 CRX 和 ZIP

下载流程：

1. 调用 `GET /api/chrome/download?id={id}` 获取 CRX 二进制。
2. 若响应带 `Content-Length` 且可读取流，客户端 SHOULD 边读边更新进度。
3. 若无 `Content-Length`，客户端 MAY 只展示阶段性进度。
4. 当用户选择 ZIP 或“全部下载”时，客户端 MUST 在浏览器端执行 CRX 到 ZIP 的转换。
5. 完成后 MUST 为每个可下载结果生成 Blob URL。

取消规则：

- 下载进行中，用户 SHOULD 可以取消。
- 取消 MUST 中止当前请求，并清空当前进度状态。

#### 6.2.5 CRX 转 ZIP 规范

客户端 MUST 按以下优先级转换：

1. 若文件长度小于 16 字节，直接返回原始 Blob。
2. 若文件前 2 字节为 `PK`，认定文件已经是 ZIP，直接返回 ZIP Blob。
3. 若文件前 4 字节为 `Cr24`：
   - 版本 3：`zipOffset = 12 + headerSize`
   - 版本 2：`zipOffset = 16 + publicKeyLength + signatureLength`
   - 其他版本：视为不支持
4. 若不是 `Cr24`，在前 1024 字节内查找 `PK`；找到则从该偏移截取 ZIP。
5. 若仍找不到 `PK`，可退化为“整个文件就是 ZIP”。
6. 截取后的数据 MUST 再验证其前 2 字节为 `PK`。

转换失败的回退规则：

- 客户端 MUST 保留原始 CRX 作为兜底下载结果。
- 即使用户只请求 ZIP，只要 ZIP 转换失败，系统仍可暴露 CRX 下载链接。

### 6.3 Docker 镜像下载

#### 6.3.1 输入与解析

客户端 MUST 支持以下输入形式：

- `nginx:latest`
- `library/nginx:latest`
- `docker.io/library/nginx:latest`
- `https://hub.docker.com/r/library/nginx`

解析规则：

- 默认 `registry = docker.io`
- 默认 `namespace = library`
- 默认 `tag = latest`
- Docker Hub 页面 URL 只解析 `hub.docker.com/r/{namespace}/{repository}`
- 直接镜像名按 `/` 分段：
  - 1 段：`repository[:tag]`
  - 2 段：`namespace/repository[:tag]`
  - 3 段：`registry/namespace/repository[:tag]`

超出以上格式的更复杂镜像引用不属于当前规范范围。

#### 6.3.2 解析与标签列表

用户提交后，客户端 MUST：

1. 解析镜像信息。
2. 调用 `GET /api/docker/tags?namespace={namespace}&repository={repository}`。
3. 从返回值的 `results[].name` 提取标签列表。

若标签列表为空，或接口返回 404，客户端 MUST：

- 标记“镜像不存在”
- 调用 `GET /api/docker/search?q={repository-or-raw-input}&page_size=5`
- 显示最多 5 个候选镜像
- 提供到 Docker Hub 搜索页和仓库页的外链

#### 6.3.3 下载流程

用户选择标签后，点击下载时客户端 MUST 顺序执行：

1. 调用 `GET /api/docker/auth` 获取匿名 pull token。
2. 调用 `GET /api/docker/manifest` 获取镜像清单。
3. 再次调用 `GET /api/docker/auth` 获取层下载 token。
4. 对 `manifest.layers[]` 按顺序逐层调用 `GET /api/docker/layer`。
5. 所有层下载完成后，在浏览器端生成 `docker load` 兼容 tar。
6. 为 tar 生成 Blob URL，并提供下载。

下载过程约束：

- 层下载 MUST 串行，而不是并行。
- 进度 MUST 至少体现“当前第几层 / 总层数”。
- 输出文件名 MUST 为 `{namespace}-{repository}-{tag}.tar`。

#### 6.3.4 Manifest 选择规则

若 `/api/docker/manifest` 得到的清单 `mediaType` 为：

- `application/vnd.docker.distribution.manifest.list.v2+json`
- `application/vnd.oci.image.index.v1+json`

则实现 MUST 在 `manifests[]` 中选择：

- `platform.os === "linux"`
- `platform.architecture === "amd64"`

若不存在该平台，接口 MUST 返回 404。

#### 6.3.5 docker load tar 生成规范

浏览器端生成的 tar MUST 至少包含：

- `manifest.json`
- `{imageId}.json`
- 对每一层生成目录 `{layerId}/`
- 每层目录下包含：
  - `VERSION`
  - `json`
  - `layer.tar`

其中：

- `layer.tar` MUST 是解压后的原始 tar 数据。解压策略基于 magic bytes 检测：
  - `0x1F 0x8B` → gzip，使用 `DecompressionStream("gzip")` 解压。
  - `0x28 0xB5 0x2F 0xFD` → zstd，浏览器原生不支持，MUST 报错提示用户尝试其他标签。
  - 其他 → 视为未压缩数据，直接使用。
- `rootfs.diff_ids` MUST 使用“解压后 tar 数据”的 SHA-256，格式 `sha256:{hex}`。
- `manifest.json` 的 `RepoTags` MUST 包含单个条目 `{namespace}/{repository}:{tag}`。
- 若 `namespace` 为空，仍按当前实现使用默认 `library`。

当前实现采用以下标识算法，复现时 SHOULD 保持一致：

- `imageId`：对完整镜像标签字符串 `{namespace}/{repository}:{tag}` 做简化 32 位整数哈希，取绝对值，转 16 进制并左侧补零到 12 位。
- `layerId`：取层 digest 去掉 `sha256:` 后的前 12 个字符。

#### 6.3.6 TAR 封装规则

若自行实现 tar 写入器，输出 MUST 满足：

- 每个条目有 512 字节头部。
- 普通文件使用 typeflag `0`，目录使用 typeflag `5`。
- 文件内容后 MUST 做 512 字节对齐填充。
- checksum 计算时，checksum 字段 MUST 视作 8 个空格。
- 归档末尾 MUST 追加两个全零的 512 字节块。

## 7. 内部 HTTP API 规格

### 7.1 通用约定

- Base URL 为同源 `/api`。
- JSON 错误体统一为 `{ "error": "..." }`。
- 除明确说明的二进制接口外，成功响应均为 JSON。
- 本项目内部 API 主要给同源前端调用，不要求统一提供跨域能力；仅当前实现中显式声明的路由需要返回 CORS / OPTIONS。

### 7.2 `POST /api/vscode/query`

- 用途：代理 VSCode Marketplace 扩展查询。
- 上游：`POST https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery`
- 上游请求头：
  - `Content-Type: application/json`
  - `Accept: application/json;api-version=3.0-preview.1`
  - `User-Agent: Mozilla/5.0 (compatible; lixian.online/1.0)`
- 请求体：原样透传客户端 JSON。
- 成功：返回上游 JSON。
- 失败：
  - 上游非 2xx：透传其状态码，并返回 `{ error: "Marketplace API error: {status}" }`
  - 本地异常：500

### 7.3 `GET /api/chrome/search`

- 用途：抓取 Chrome Web Store 搜索页，提取候选扩展。
- 参数：
  - `q`，必填
- 上游：`GET https://chromewebstore.google.com/search/{encodeURIComponent(q)}`
- 上游请求头：
  - `User-Agent: Mozilla/5.0 (compatible; lixian.online/1.0)`
  - `Accept-Language: zh-CN,zh;q=0.9,en;q=0.8`
- 解析规则：
  - 用正则 `detail\/([^/]+)\/([a-z]{32})` 提取 `(slug, id)`
  - 按 `id` 去重
  - 名称由 slug 转换得到：按 `-` 分词，每段首字母大写，再用空格连接
  - 最多返回 10 条
- 成功响应：

```json
{
  "results": [
    { "id": "cjpalhdlnbpafiamejdnhcphjbkeiagm", "name": "Ublock Origin" }
  ]
}
```

- 失败：
  - 缺少 `q`：400
  - 上游非 2xx：透传状态码
  - 本地异常：500

### 7.4 `GET /api/chrome/detail`

- 用途：抓取扩展详情页中的名称与描述。
- 参数：
  - `id`，必填，必须匹配 `^[a-z]{32}$`
- 上游：`GET https://chromewebstore.google.com/detail/{id}`
- 上游请求头：
  - `User-Agent: Mozilla/5.0 (compatible; lixian.online/1.0)`
  - `Accept-Language: zh-CN,zh;q=0.9,en;q=0.8`
- HTML 提取规则：
  - 名称：`/<title>(.+?)\s*[-–—]\s*Chrome[^<]*<\/title>/`
  - 描述：`/meta\s+name="description"\s+content="([^"]*)"/`
- 成功响应：

```json
{
  "id": "epcnnfbjfcgphgdmggkamkmgojdagdnn",
  "name": "uBlock",
  "description": "..."
}
```

- `name` 和 `description` MAY 缺失。
- 失败：
  - 非法 `id`：400
  - 上游非 2xx：透传状态码
  - 本地异常：500

### 7.5 `GET /api/chrome/download`

- 用途：下载 CRX 文件。
- 参数：
  - `id`，必填，必须匹配 `^[a-z]{32}$`
- 上游 URL MUST 由下列参数构造：

```text
response=redirect
os=win
arch=x64
os_arch=x86_64
nacl_arch=x86-64
prod=chromecrx
prodchannel=beta
prodversion=131.0.6778.86
lang=zh-CN
acceptformat=crx2,crx3
x=id={id}&installsource=ondemand&uc
```

- 上游请求头 MUST 使用桌面 Chrome UA：

```text
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36
```

- 成功响应：
  - `Content-Type: application/x-chrome-extension`
  - `Content-Disposition: attachment; filename="{id}.crx"`
  - `Cache-Control: public, max-age=3600`
  - Body 为完整 CRX 二进制
- 失败：
  - 缺少 `id` 或格式错误：400
  - 上游返回空文件：404
  - 上游非 2xx：透传状态码
  - 本地异常：500
- 当前实现还 MUST 提供 `OPTIONS` 响应和基本 CORS 头。

### 7.6 `GET /api/docker/tags`

- 用途：读取镜像标签列表。
- 参数：
  - `namespace`，可选，默认 `library`
  - `repository`，必填
- 上游：`GET https://registry.hub.docker.com/v2/repositories/{namespace}/{repository}/tags?page_size=100`
- 上游请求头：
  - `User-Agent: Mozilla/5.0 (compatible; lixian.online/1.0)`
  - `Accept: application/json`
- 成功：返回上游 JSON，并带 `Cache-Control: public, max-age=300`
- 失败：
  - 缺少 `repository`：400
  - 上游非 2xx：透传状态码
  - 本地异常：500
- 当前实现还 MUST 提供 `OPTIONS` 响应和基本 CORS 头。

### 7.7 `GET /api/docker/auth`

- 用途：获取匿名 pull token。
- 参数：
  - `namespace`，可选，默认 `library`
  - `repository`，必填
- 上游：

```text
https://auth.docker.io/token?service=registry.docker.io&scope=repository:{namespace}/{repository}:pull
```

- 上游请求头：
  - `User-Agent: Mozilla/5.0 (compatible; lixian.online/1.0)`
  - `Accept: application/json`
- 成功：返回上游 JSON，并带 `Cache-Control: public, max-age=1800`
- 客户端只使用 `token` 字段。
- 失败：
  - 缺少 `repository`：400
  - 上游非 2xx：透传状态码
  - 本地异常：500
- 当前实现还 MUST 提供 `OPTIONS` 响应和基本 CORS 头。

### 7.8 `GET /api/docker/manifest`

- 用途：获取单架构镜像清单；必要时从 manifest list 中选出 `linux/amd64`。
- 参数：
  - `namespace`，可选，默认 `library`
  - `repository`，必填
  - `tag`，可选，默认 `latest`
  - `token`，必填
- 第一次上游请求：

```text
GET https://registry-1.docker.io/v2/{namespace}/{repository}/manifests/{tag}
```

- 请求头：
  - `Authorization: Bearer {token}`
  - `Accept: application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json`
  - `User-Agent: Mozilla/5.0 (compatible; lixian.online/1.0)`
- 若返回 manifest list / OCI index，则 MUST 再次按选中的 digest 请求具体 manifest。
- 成功响应最少包含：

```json
{
  "schemaVersion": 2,
  "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
  "config": {
    "mediaType": "...",
    "size": 5312,
    "digest": "sha256:..."
  },
  "layers": [
    {
      "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
      "size": 27092550,
      "digest": "sha256:..."
    }
  ]
}
```

- 失败：
  - 缺少 `repository`：400
  - 缺少 `token`：401
  - manifest list 中没有 `linux/amd64`：404
  - 上游非 2xx：透传状态码
  - 本地异常：500
- 成功响应带 `Cache-Control: public, max-age=3600`
- 当前实现还 MUST 提供 `OPTIONS` 响应和基本 CORS 头。

### 7.9 `GET /api/docker/layer`

- 用途：下载单层 gzip 压缩 tar，并直接流式回传。
- 参数：
  - `namespace`，必填
  - `repository`，必填
  - `digest`，必填
  - `token`，必填
- 注意：该接口当前实现不提供 `namespace` 默认值；即使是官方镜像，也必须显式传 `library`。
- 上游：

```text
GET https://registry-1.docker.io/v2/{namespace}/{repository}/blobs/{digest}
```

- 请求头：
  - `Authorization: Bearer {token}`
  - `Accept: application/vnd.docker.distribution.manifest.v2+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json`
- 成功：
  - Body MUST 直接使用上游 `response.body`
  - `Content-Type` 和 `Content-Length` SHOULD 透传上游
- 失败：
  - 任一参数缺失：400
  - 上游无 body：502
  - 上游非 2xx：透传状态码
  - 本地异常：500
- 当前实现还 MUST 提供 `OPTIONS` 响应和基本 CORS 头。

### 7.10 `GET /api/docker/search`

- 用途：搜索 Docker Hub 镜像，用于镜像不存在时的候选提示。
- 参数：
  - `q`，必填
  - `page_size`，可选，默认 `5`
- `page_size` MUST 被裁剪到 `1..100`，并向下取整。
- 上游：

```text
GET https://hub.docker.com/v2/search/repositories/?query={q}&page_size={page_size}
```

- 上游请求头：
  - `User-Agent: Mozilla/5.0 (compatible; lixian.online/1.0)`
  - `Accept: application/json`
- 成功：返回上游 JSON，并带 `Cache-Control: public, max-age=300`
- 客户端使用字段：
  - `repo_name`
  - `short_description`
  - `star_count`
  - `pull_count`
- `repo_name` 若不含 `/`，客户端 MUST 将其解释为 `library/{repo_name}`。
- 失败：
  - 缺少 `q`：400
  - 上游非 2xx：透传状态码
  - 本地异常：500
- 当前实现还 MUST 提供 `OPTIONS` 响应和基本 CORS 头。

## 8. 状态模型

每个功能标签页均为独立状态机：

- `idle`
- `resolving`
- `ready`
- `downloading`
- `completed`
- `error`

实现不要求显式使用该枚举，但用户体验 MUST 与下列语义一致：

- 提交解析时进入“解析中”
- 可下载资源准备好后进入“可下载”
- 二进制传输时进入“下载中”
- 成功后进入“已完成”
- 失败后进入“错误”

Chrome 下载还额外包含中间态 `converting`；Docker 下载进度按层推进。

## 9. 一致性与验收

符合本规格的实现，至少 MUST 通过以下验收：

1. 输入一个合法 VSCode Marketplace URL，可以列出版本，并下载任意选中版本的 `.vsix`。
2. 输入一个合法 Chrome 扩展 ID，可以得到扩展信息，并下载 `.crx`；请求 ZIP 时可得到 `.zip` 或在转换失败时回退到 `.crx`。
3. 输入一个公开 Docker 镜像名，可以选择标签，下载 `.tar`，并被 `docker load` 成功导入。
4. Docker 多架构镜像会自动选择 `linux/amd64`。
5. Docker 层下载在服务端不做整包缓冲。
6. 最近输入历史在刷新后仍存在，并遵守“最多 10 条、去重、头插”规则。

## 10. 非规范性说明

以下内容故意不进入规格：

- 源码目录布局
- 具体框架版本
- 组件库与 CSS 方案
- 动画、圆角、阴影等视觉实现
- 构建脚本名称

只要满足本文定义的用户行为、API 契约、二进制处理规则和边界条件，即视为功能等价实现。

## 11. 致谢与后续计划

### 11.1 store.rg-adguard.net

Microsoft Store 安装包直链解析当前依赖第三方公开服务 [store.rg-adguard.net](https://store.rg-adguard.net/)。重实现 MSStore 下载能力时，可以直接调用该服务，也可以实现等效流程。特此感谢 store.rg-adguard.net 长期维护这一公共资源。

### 11.2 基本解析原理（非规范性）

以下描述是对 rg-adguard 背后的一般性流程的参考说明，用于理解和未来自研，不作为实现约束：

1. **输入归一化**：接受 URL / ProductId (`BigId`) / PackageFamilyName / CategoryId，借助 Microsoft displaycatalog (`displaycatalog.mp.microsoft.com`) 将输入归一到 Windows Update 使用的 `WuCategoryId`。
2. **元数据同步**：以该 `WuCategoryId` 向 Windows Update SOAP 端点 `https://fe3.delivery.mp.microsoft.com/ClientWebService/client.asmx`（或 `/secured` 变体）发起 `SyncUpdates` 请求，获得匹配的 Update 列表——包括 `UpdateID`、每个包的 `PackageFamilyName`、版本、架构、文件名、文件哈希与大小。
3. **签名直链**：对每个 `UpdateID` 调用 `GetExtendedUpdateInfo2` 或 `SecuredFragment`，得到带时效签名的 CDN 下载 URL（通常指向 `tlu.dl.delivery.mp.microsoft.com`/`*.dl.delivery.mp.microsoft.com`）。
4. **结果组装**：把每个文件（`.appx` / `.appxbundle` / `.msix` / `.msixbundle` / `.eappx*` / `.blockmap`）组装为带名称、签名直链、过期时间、SHA1、大小的清单。rg-adguard 将该清单渲染为 HTML 表格返回，本项目在服务端解析该 HTML 得到结构化结果。

请求过程 MUST 携带合法的 `ring`（`Retail` / `RP` / `WIS` / `WIF`，默认 `RP`）与 `market` / `language` 参数；SOAP 请求需要使用匿名或普通零售设备的 ticket/cookie，这是可以被自研实现的关键环节。

### 11.3 后续计划

项目计划在未来版本中，直接实现上述与 Windows Update 对话的流程作为 rg-adguard 的可选替代，以降低对单一第三方服务的强依赖，并获得更稳定的可用性与更完整的错误语义。届时会在本规格中新增 `§6.4 Microsoft Store 应用下载`，把输入处理、SOAP 调用、签名 URL 获取、HTML / 结构化结果映射等写成规范条款。在那之前，MSStore 能力保持“依赖外部服务 + HTML 解析”的当前形态。
