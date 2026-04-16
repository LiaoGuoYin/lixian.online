# Lixian.Online 实现规格

> 本文档描述当前代码库中的实际实现行为，用于和 `README.md`、`README.zh.md`、`CLAUDE.md` 保持一致。

## 1. 产品定义

Lixian.Online 是一个面向受限网络环境的 Web 工具，帮助用户获取以下五类公开资源的离线安装包或可下载链接：

| 能力 | 输入 | 输出 |
| --- | --- | --- |
| VSCode 插件 | Marketplace 插件页 URL | `.vsix` 直接下载链接 |
| Chrome 扩展 | 扩展名称、扩展 ID、商店 URL | `.crx` 和/或 `.zip` Blob 下载链接 |
| Microsoft Edge 扩展 | 扩展名称、CRX ID、ProductId、商店 URL | `.crx` 和/或 `.zip` Blob 下载链接 |
| Docker 镜像 | 镜像名、镜像引用、Docker Hub URL | `docker load` 可导入的 `.tar` Blob 下载链接 |
| Microsoft Store | 商店 URL、`ProductId`、`PackageFamilyName`、`CategoryId` | 安装包下载链接 |

系统由两部分组成：

- 浏览器端应用：负责输入解析、状态管理、二进制处理、Blob URL 管理和下载按钮展示。
- Next.js API 路由：负责访问上游服务、处理 CORS / 鉴权、以及在需要时代理文件流。

## 2. 路由与页面骨架

### 2.1 路由

- `/` 会重定向到 `/${defaultTab}`。
- `defaultTab` 当前为 `vscode`。
- 合法 tab 由 `src/features/registry.ts` 定义，当前为：
  - `vscode`
  - `chrome`
  - `msedge`
  - `docker`
  - `msstore`
- 非法 tab 返回 404。

### 2.2 Query 同步

- 页面首次渲染时，会从 URL 的 `?q=` 读取默认输入值，并只传给当前激活的 tab。
- 每个功能在成功解析后，都会通过 `onQueryChange` 把当前输入同步回 `?q=`。
- 切换 tab 时，客户端会把地址替换为 `/{tab}`；当前实现不会保留原有查询字符串。

### 2.3 页面结构

页面主结构由 `src/app/[tab]/tab-page.tsx` 提供，包含：

- 标题 `Lixian Online`
- 一行站点描述，取自 `src/shared/lib/site.ts`
- 五个标签页按钮
- 当前功能的表单区域
- 底部版本号和 GitHub 外链

版本信息来自以下环境变量，均提供兜底值：

- `NEXT_PUBLIC_APP_VERSION`，默认 `0.1.0`
- `NEXT_PUBLIC_BUILD_TIME`，默认 `unknown`
- `NEXT_PUBLIC_COMMIT_HASH`，默认 `unknown`

## 3. 共享行为

### 3.1 动态加载与状态保留

- 各功能组件通过 `next/dynamic(..., { ssr: false })` 动态加载。
- 所有 tab 面板都会被渲染，只是非激活项通过 `hidden` 隐藏。
- 因此，在同一页面会话内切换标签时，各 tab 的内存状态会被保留。

### 3.2 Toast

- 全局 toast 由 `src/hooks/useToast.ts` 管理。
- 当前只允许同时显示 1 条 toast。
- toast 默认约 5 秒后移除。

### 3.3 输入历史

最近输入保存在 `localStorage` 中：

| 功能 | key |
| --- | --- |
| VSCode | `history:vscode` |
| Chrome | `history:chrome` |
| Edge | `history:msedge` |
| Docker | `history:docker` |
| MSStore | `history:msstore` |

规则如下：

- 最多保留 10 条。
- 写入前会做 `trim()`。
- 空字符串不会保存。
- 与已有完全相同的值会前移去重。
- 历史下拉的筛选逻辑为不区分大小写的包含匹配。

### 3.4 Blob URL 生命周期

- Chrome 下载结果通过 Blob URL 暴露。
- Edge 下载结果通过 Blob URL 暴露。
- Docker 打包结果通过 Blob URL 暴露。
- 重新下载前会撤销旧的 Blob URL。
- 组件卸载时也会撤销仍然存活的 Blob URL。

## 4. 功能规格

### 4.1 VSCode 插件

#### 4.1.1 输入与解析

- 输入框只面向 VSCode Marketplace 插件链接。
- 解析逻辑读取 URL 中的 `itemName`。
- `itemName` 需形如 `publisher.extension`。
- 分割时使用最后一个 `.`，以兼容带 `.` 的 publisher。

错误语义：

- 无法构造 URL 时，输入阶段静默返回空结构，不直接报错。
- 缺少 `itemName` 时，抛出“无效的插件 URL，示例：...”
- `itemName` 中没有 `.` 时，抛出“无效的插件 ID 格式，应为 publisher.extension”

#### 4.1.2 版本查询

提交后，客户端调用 `POST /api/vscode/query`，请求体固定为：

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

版本提取规则：

- 从 `results[0].extensions[0].versions[].version` 读取
- 过滤空值
- 用 `Set` 去重，保留首次出现顺序
- 最多保留前 20 个版本

如果未找到扩展，报错“未找到该插件，请检查 URL 是否正确”。

#### 4.1.3 下载

- 查询成功后，UI 显示版本选择器。
- 只有选定版本后，下载卡片才会出现。
- 最终链接模板为：

```text
https://marketplace.visualstudio.com/_apis/public/gallery/publishers/{publisher}/vsextensions/{extension}/{version}/vspackage
```

- `.vsix` 最终下载不经过本站代理。

### 4.2 Chrome 扩展

#### 4.2.1 输入与搜索

输入支持三类内容：

- 扩展名称
- 32 位扩展 ID
- Chrome Web Store URL

搜索逻辑：

- 输入变化后会做 400ms 防抖。
- 当满足以下任一条件时，不发起搜索：
  - `trim()` 后长度小于 2
  - 输入看起来已经是 32 位小写字母 ID
  - 输入中包含 `.` 或 `/`
- 其余情况调用 `GET /api/chrome/search?q=...`
- 搜索结果最多保留前 10 条。

#### 4.2.2 ID 提取与详情

提交时：

- 先用正则 `([a-z]{32})` 在整段输入中查找扩展 ID。
- 如果整段输入本身是 32 位字母，会按小写接受。
- 无法得到合法 ID 时，报错“无效的 Chrome 扩展 URL 或 ID”。

解析到 ID 后，客户端调用 `GET /api/chrome/detail?id={id}`：

- 成功时显示 `name`、`description`、`id`
- 失败时降级为仅保留 `id`，不阻止下载流程继续

#### 4.2.3 下载与取消

UI 提供 3 个下载动作：

- `CRX`
- `ZIP`
- `全部下载`

下载逻辑：

1. 调用 `GET /api/chrome/download?id={id}` 获取 CRX。
2. 若响应具备 `Content-Length` 且可读取流，则按字节更新进度。
3. 若无法获得长度，则退化为阶段性进度。
4. 选择 `ZIP` 或 `全部下载` 时，在浏览器中执行 CRX 转 ZIP。
5. 为准备好的结果创建 Blob URL。

取消逻辑：

- 下载中可点击取消按钮。
- 取消会中止当前 `fetch`，清空当前进度并结束加载状态。

#### 4.2.4 CRX 转 ZIP

客户端按以下顺序处理：

- 若文件前两个字节是 `PK`，视为 ZIP，直接返回 ZIP Blob。
- 若魔数为 `Cr24`：
  - `version === 3` 时按 CRX3 头解析 ZIP 偏移量
  - `version === 2` 时按 CRX2 头解析 ZIP 偏移量
- 若不是 CRX，则在前 1024 字节内查找 `PK` 作为 ZIP 起点
- 若仍找不到 ZIP 魔数，则把原文件当作 ZIP/原始文件回退
- 若转换过程中抛错，则最终回退为原始 CRX Blob

### 4.3 Microsoft Edge 扩展

#### 4.3.1 输入识别

输入支持四类内容：

- 扩展名称
- 32 位 CRX ID
- 12 位 ProductId
- Edge Add-ons URL

解析逻辑由 `src/features/edge/utils/edgeInput.ts` 提供：

- 32 位小写字母视为 `crxId`
- 12 位字母数字视为 `storeProductId`
- URL 中若出现 32 位 CRX ID，则优先按 `crxId` 处理
- 否则再从 `productId` / `itemId` 查询参数中提取 ProductId

#### 4.3.2 搜索与详情

搜索逻辑：

- 输入变化后会做 400ms 防抖。
- 当满足以下任一条件时，不发起搜索：
  - `trim()` 后长度小于 2
  - 输入已能被直接解析为 CRX ID / ProductId / URL
  - 输入中包含 `.` 或 `/`
- 其余情况调用 `GET /api/edge/search?q=...`
- 搜索结果最多保留前 10 条。

详情逻辑：

- 提交后调用 `GET /api/edge/detail?query=...`
- 服务端会根据输入类型选择：
  - `getproductdetailsbycrxid/{crxId}`
  - `getproductdetails/{storeProductId}`
- 搜索与详情请求固定使用 `gl=US`、`hl=en-US`

客户端展示字段包括：

- `id`
- `storeProductId`
- `name`
- `version`
- `developer`
- `category`
- `shortDescription` / `description`
- `averageRating`
- `ratingCount`
- `activeInstallCount`

#### 4.3.3 下载与取消

UI 提供 3 个下载动作：

- `CRX`
- `ZIP`
- `全部下载`

下载逻辑与 Chrome 基本一致：

1. 调用 `GET /api/edge/download?id={crxId}` 获取 CRX。
2. 按 `Content-Length` 流式更新进度；缺失长度时退化为阶段性进度。
3. 选择 `ZIP` 或 `全部下载` 时，在浏览器中执行 CRX 转 ZIP。
4. 结果通过 Blob URL 暴露。

取消逻辑：

- 下载中可点击取消按钮。
- 取消会中止当前 `fetch`，清空当前进度并结束加载状态。

### 4.4 Docker 镜像

#### 4.4.1 输入解析

支持以下格式：

- `nginx:latest`
- `library/nginx`
- `library/nginx:latest`
- `docker.io/library/nginx:latest`
- `hub.docker.com/r/library/nginx`

默认值：

- 默认 registry：`docker.io`
- 单段镜像名默认 namespace：`library`
- 未显式指定 tag 时默认：`latest`

#### 4.4.2 标签与候选镜像

提交后：

- 客户端先调用 `GET /api/docker/tags?namespace={namespace}&repository={repository}`
- 若返回空数组，或请求以 404 结束，则调用 `GET /api/docker/search?q=...&page_size=5`
- UI 会展示候选镜像链接和 Docker Hub 搜索入口

#### 4.4.3 Manifest

标签解析完成后：

- 客户端会预取 manifest，用于展示镜像层列表和总压缩大小
- 预取流程为：
  - `GET /api/docker/auth`
  - `GET /api/docker/manifest`

`/api/docker/manifest` 的行为：

- 支持 schema2 manifest 和 OCI manifest
- 若上游返回 manifest list / OCI index，会选择 `linux/amd64`
- 客户端会过滤掉无效 layer 描述，避免后续打包失败

#### 4.4.4 下载与打包

下载逻辑：

1. 若已有预取的 manifest，优先复用；否则重新获取。
2. 逐层下载前重新调用 `/api/docker/auth` 获取新 token，避免大层下载时 token 过期。
3. 调用 `/api/docker/layer` 下载 blob，并按字节更新当前层进度。
4. 所有 layer 下载完成后，在浏览器中生成 `docker load` 兼容 TAR。

浏览器端打包规则：

- 按魔数识别 gzip / zstd / 未压缩 layer
- gzip layer 会先解压再计算未压缩内容的 SHA256，生成 `diff_ids`
- `layer.tar` 写入的是解压后的 tar 内容
- 最终打包出 `manifest.json`、镜像 config JSON、每层目录及 `layer.tar`
- zstd layer 当前会抛出显式“不支持”错误

### 4.5 Microsoft Store

#### 4.5.1 输入识别

支持以下类型：

- Microsoft Store URL
- `ProductId`
- `PackageFamilyName`
- `CategoryId`

客户端识别规则：

- 显式 `http://` / `https://` 视为 URL
- `apps.microsoft.com` 或 `microsoft.com/...store` 形式也视为 URL
- 12 位字母数字视为 `ProductId`
- 带 `_publisherId` 结构的字符串视为 `PackageFamilyName`
- UUID 视为 `CategoryId`

无法识别时，客户端会直接报错，不调用 API。

#### 4.5.2 解析

客户端调用：

```text
GET /api/msstore/resolve?type={type}&query={query}&market=US&language=en-us
```

默认值：

- `market=US`
- `language=en-us`
- 服务端 `ring` 默认 `RP`

服务端解析逻辑：

- 先标准化并校验输入
- 尝试从 `store.rg-adguard.net` 获取文件列表
- 若输入可映射到 Display Catalog `bigId`，再调用 Microsoft Display Catalog 获取产品元数据
- 只要“产品元数据”或“文件列表”其中一项成功，就会返回结果

返回结果可能包含：

- `productId`
- `title`
- `publisherName`
- `description`
- `packageFamilyNames`
- `categoryId`
- `files`
- `filesSource`
- `filesError`
- `skus`

#### 4.5.3 文件展示与下载

文件列表处理规则：

- 会尝试把文件名拆解为组件名、版本、架构、类型
- UI 以可搜索选择器方式展示文件
- 默认选中排序后的第一项

下载逻辑：

- HTTPS 文件链接直接使用原始 URL
- HTTP 文件链接若域名命中 allowlist，则改写为 `/api/msstore/download?...`
- `/api/msstore/download` 仅允许代理 Microsoft 下载域名的 HTTP 链接

## 5. API 路由总览

| 路由 | 方法 | 作用 |
| --- | --- | --- |
| `/api/vscode/query` | `POST` | 代理 VSCode Marketplace 扩展查询 |
| `/api/chrome/search` | `GET` | 代理 Chrome 搜索 |
| `/api/chrome/detail` | `GET` | 代理 Chrome 详情页抓取 |
| `/api/chrome/download` | `GET` | 代理 Chrome CRX 下载 |
| `/api/edge/search` | `GET` | 代理 Edge Add-ons 搜索 |
| `/api/edge/detail` | `GET` | 代理 Edge Add-ons 详情 |
| `/api/edge/download` | `GET` | 代理 Edge CRX 下载 |
| `/api/docker/tags` | `GET` | 代理 Docker Hub tags |
| `/api/docker/search` | `GET` | 代理 Docker Hub 搜索 |
| `/api/docker/auth` | `GET` | 获取 Docker Registry Bearer token |
| `/api/docker/manifest` | `GET` | 代理 Docker manifest / manifest list |
| `/api/docker/layer` | `GET` | 代理 Docker layer blob |
| `/api/msstore/resolve` | `GET` | 解析 Microsoft Store 产品与文件列表 |
| `/api/msstore/download` | `GET` | 代理允许的 HTTP 安装包链接 |

## 6. 测试

- Playwright 测试位于 `tests/e2e/`
- `playwright.config.ts` 使用生产式启动命令：

```bash
pnpm build && pnpm start --hostname 127.0.0.1 --port 3100
```

当前 E2E 覆盖包括：

- VSCode 直链生成
- VSCode 历史记录刷新后可见
- Chrome CRX / ZIP 下载准备
- Edge 商店链接解析
- Edge 搜索建议选择
- Docker TAR 打包
- Docker 无效 layer 描述容错
- MSStore URL / ProductId 识别
- MSStore HTTP 下载代理回退
