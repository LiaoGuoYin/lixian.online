# Changelog

## [0.5.3](https://github.com/LiaoGuoYin/lixian.online/compare/lixian-online-v0.5.2...lixian-online-v0.5.3) (2026-04-22)


### Features

* add tab-based routing with feature registry and URL query state ([b38217d](https://github.com/LiaoGuoYin/lixian.online/commit/b38217de762cf05fae60cf9eb8492ddd758b914c))
* Chrome 扩展下载支持实时进度与取消，新增详情代理接口 ([0cf6e4c](https://github.com/LiaoGuoYin/lixian.online/commit/0cf6e4c86f3a1f36f699ba37af6fd400f5ec43a3))
* **ci:** auto dump release for pr ([edea4eb](https://github.com/LiaoGuoYin/lixian.online/commit/edea4eb79bb445b72f4ecddff25fc7ab617a42da))
* **docker:** add multi-platform (architecture) selection for image downloads ([2c66a2e](https://github.com/LiaoGuoYin/lixian.online/commit/2c66a2eaa3eb07d77fef37d0e4dfb0b3fc19f5ff))
* **docker:** OCI 清单支持、逐层字节级下载进度、manifest 预取与非 gzip 层处理 ([d9c46d2](https://github.com/LiaoGuoYin/lixian.online/commit/d9c46d24804fe2088c7c443a832fdc433b86a494))
* **edge:** add Edge Add-ons extension download with search, detail, and CRX/ZIP support ([ad84a1e](https://github.com/LiaoGuoYin/lixian.online/commit/ad84a1e7c93c94acf015e1cdd25246ae3eb675de))
* **edge:** add Edge Add-ons extension download with search, detail, and CRX/ZIP support ([b253e64](https://github.com/LiaoGuoYin/lixian.online/commit/b253e64e04437b94dd3fe3e1c79652ee83c94316))
* move Docker image parse to explicit button click ([375d1a2](https://github.com/LiaoGuoYin/lixian.online/commit/375d1a29ab32ba7949748718a4872966ebc9bbd1))
* **msstore:** proxy HTTP download links through same-origin API ([56d5008](https://github.com/LiaoGuoYin/lixian.online/commit/56d5008bf21a1c098b2fc8bfd89e3d5cdcabf713))
* **msstore:** support Microsoft Store URL ([0ed0097](https://github.com/LiaoGuoYin/lixian.online/commit/0ed00972d5a8fe637b8c850d6cf362445871243c))
* **msstore:** support Microsoft Store URL ([3adbe42](https://github.com/LiaoGuoYin/lixian.online/commit/3adbe4240e4bfbcd84e4ffaf0c5bb064c96d3724))
* rebrand to 离线·Online (lixian.online), optimize UI and add example hints ([d3c7609](https://github.com/LiaoGuoYin/lixian.online/commit/d3c7609a43f2cd15670a53f9abd79551d0ad0917))
* show footer version with build metadata and add version bump scripts ([9918cef](https://github.com/LiaoGuoYin/lixian.online/commit/9918cef6b0960766a048a9655725742f74253678))
* **ui:** add brand SVG icons for VSCode, Chrome, Docker and Microsoft Store ([abb1deb](https://github.com/LiaoGuoYin/lixian.online/commit/abb1deb023d16fe103690eef495bd882c1cf06d4))
* 双击 URL 输入框自动粘贴并解析剪切板中 URL，并选中最新的版本 ([4bed83e](https://github.com/LiaoGuoYin/lixian.online/commit/4bed83e2e616f153fb2cdf02f9d0ae36b61fb097))
* 实现 Dockerhub 镜像和 Chrome Extension 拓展解析初版（WIP） ([c9c6845](https://github.com/LiaoGuoYin/lixian.online/commit/c9c6845ddf0097fef16277ba613bd210139cddf4))
* 接入 Vercel Analytics，各下载器添加官方商店外链引导 ([e5c3a5d](https://github.com/LiaoGuoYin/lixian.online/commit/e5c3a5dd143a775feddeaaa5c15889b0662723c0))
* 新增 Chrome 扩展关键词搜索，精简 VSCode 下载为直连，修复输入框密码管理器误触发 ([7295609](https://github.com/LiaoGuoYin/lixian.online/commit/729560922079e9df5cf97a8b9f4e158a5d01399c))
* 新增了双击 URL 输入框自动粘贴剪切板 URL 的功能 ([0aa2d50](https://github.com/LiaoGuoYin/lixian.online/commit/0aa2d50a6292bddb2e415fc55da3905904288b7b))
* 新增浏览器缓存，存储历史成功解析记录 ([a4c681f](https://github.com/LiaoGuoYin/lixian.online/commit/a4c681f46f6fafcd57b423a62d6302c59cdc5cb2))
* 统一字体，并封装尚有 API，确保用户能正常使用所有解析服务 ([e758862](https://github.com/LiaoGuoYin/lixian.online/commit/e7588628b69e64866e3e479a851a53c6fc073606))


### Bug Fixes

* **api:** return 502 with descriptive timeout and connection error messages ([0ead333](https://github.com/LiaoGuoYin/lixian.online/commit/0ead333286fd55aed25147e4003f10afeca116b0))
* deps ([dc2090e](https://github.com/LiaoGuoYin/lixian.online/commit/dc2090ef6fe1700df6246eb7ac8fdfa1cddb4dcc))
* diff_ids error in layer blob ([2a10659](https://github.com/LiaoGuoYin/lixian.online/commit/2a10659788020a1652c7d936555648bcb9d71353))
* **docker:** build TAR as Blob to support large images beyond Arraybuffer ([a233045](https://github.com/LiaoGuoYin/lixian.online/commit/a233045fada88702fa2343bbc82f9e9f2b31a50d))
* **docker:** build TAR as Blob to support large images beyond ArrayBuffer limit ([23b7e7d](https://github.com/LiaoGuoYin/lixian.online/commit/23b7e7d76f10042234151a82d5163769b8cde226))
* **docker:** filter out invalid layers from manifest before download ([25a9d63](https://github.com/LiaoGuoYin/lixian.online/commit/25a9d6398624da75d53f3241aee43ddcdc6b8d96))
* **e2e:** CI 环境使用 production build 启动测试服务器 ([88846e0](https://github.com/LiaoGuoYin/lixian.online/commit/88846e08afa9f1be661a552078356acbb152d7bf))
* handle docker image not found with search suggestions and hub links ([8bc12f7](https://github.com/LiaoGuoYin/lixian.online/commit/8bc12f73d876e2c3b08c951d31847cacd6db4f72))
* tar checksum、blob 泄露、SVG path、流式下载等多处 bug ([9f46a99](https://github.com/LiaoGuoYin/lixian.online/commit/9f46a99447e34ca777d3ccbe3c6f8f5bf971a5f5))
* **ui:** improve mobile responsive layout and small-screen readability ([dfa4739](https://github.com/LiaoGuoYin/lixian.online/commit/dfa4739086d84e21dc16547e9c03890f19fe65ea))
* **ui:** improve searchable select dropdown positioning and lazy loading ([640cbce](https://github.com/LiaoGuoYin/lixian.online/commit/640cbce07b40ada631c3e2330d8bb63923644c7e))
* 修复 CSR SSR 导致的 Hydration Mismatch ([c5f9917](https://github.com/LiaoGuoYin/lixian.online/commit/c5f9917895b8de7e20d209b5b19c79305293f02d))
* 修复 Docker 下载失败的 Bug（Tar 逻辑） ([bab8731](https://github.com/LiaoGuoYin/lixian.online/commit/bab87317294547b6c0507d8fbf322c6b5b89d955))
* 修复类型体操；CI 和本地都统一使用 production build ([f420518](https://github.com/LiaoGuoYin/lixian.online/commit/f42051800163c339bda2f80d985005ba307fd7b1))
* 移除双击粘贴功能，避免用户误触 ([00ba3b1](https://github.com/LiaoGuoYin/lixian.online/commit/00ba3b178bb0f40ebe055321392c24ffca3b37a2)), closes [#1](https://github.com/LiaoGuoYin/lixian.online/issues/1)


### Performance

* 懒加载下载器组件，稳定 hook 依赖，优化事件监听 ([b120b0e](https://github.com/LiaoGuoYin/lixian.online/commit/b120b0ed59e24e77fb9690cb88993ecab36c7b18))


### Refactor

* **edge:** rename tab id from "edge" to "msedge" ([f4a2b4a](https://github.com/LiaoGuoYin/lixian.online/commit/f4a2b4a07c995a045bc2834c20ce4ddbb3ef130c))
* **msstore:** auto-detect input type and drop type selector ([a6c1f3b](https://github.com/LiaoGuoYin/lixian.online/commit/a6c1f3b37a95c6fb63b5fce92a3d6edbd7766907))
* **ui:** remove redundant wrappers, unused CSS, and normalize opacity values ([d6d4435](https://github.com/LiaoGuoYin/lixian.online/commit/d6d44357a84cb11151e2e89078b1b88af7bf6dad))
* 布局和设计一致性优化 ([c1ee072](https://github.com/LiaoGuoYin/lixian.online/commit/c1ee0727e8e8035bc3cd0520b1cc141ebaf81d19))
* 统一整站描述，优化 UI 文案与布局 ([408e53d](https://github.com/LiaoGuoYin/lixian.online/commit/408e53dee1ddea5cc5f6259bea163fca3b5a9bbf))
* 重构 VSCode 模块的状态管理和服务层 ([8702239](https://github.com/LiaoGuoYin/lixian.online/commit/87022390b7ae5b211e4051e87073893fa3656f0a))
* 重构下拉选择标签，实现分页和搜索避免全量加载卡死页面 ([6886c7b](https://github.com/LiaoGuoYin/lixian.online/commit/6886c7b58a04e1ca2b10304bc1ab1aa9ce05acdb))
* 重构整个代码架构，重写状态管理、CSS ([6076a77](https://github.com/LiaoGuoYin/lixian.online/commit/6076a7703bbaa8997eb47c9d8813eb5bcc4f690f))


### Documentation

* **msstore:** credit rg-adguard and document resolution principle ([6b5b0b2](https://github.com/LiaoGuoYin/lixian.online/commit/6b5b0b29562d99af79e908a93be57a588dd92588))
* README 更新 pnpm 命令与 E2E 测试说明 ([adc37e9](https://github.com/LiaoGuoYin/lixian.online/commit/adc37e9665d2693d99376d6aea9480aa1d96af90))
* rewrite project documentation to reflect current implementation ([75578e3](https://github.com/LiaoGuoYin/lixian.online/commit/75578e3d070d02c70cdff18598aa10f4f8e204f0))
* rewrite README with friendlier copy and self-hosting tips, bump 0.5.2 ([e4c53f4](https://github.com/LiaoGuoYin/lixian.online/commit/e4c53f428657504f4713da8abaac0e01e49599c6))
* sync project docs with msedge feature and add PR template ([89b79f1](https://github.com/LiaoGuoYin/lixian.online/commit/89b79f100980aa6d982ed4e8284c176df7df3b33))
* sync to last docs update ([7901a87](https://github.com/LiaoGuoYin/lixian.online/commit/7901a87b14a045447afecaa04fec1a0df16bd3b3))
* update spec and README.md according to specification ([c8eb062](https://github.com/LiaoGuoYin/lixian.online/commit/c8eb0626b40281d1af1e2171db92ab25981bc233))
* 同步代码和文档的 gap ([eada90e](https://github.com/LiaoGuoYin/lixian.online/commit/eada90e8dea6405bb45cc9afc7927ad60809591e))
* 整理全站 spec 设计文档和相关接口 ([2f4c277](https://github.com/LiaoGuoYin/lixian.online/commit/2f4c2777e946e17a3cf11e78eb98040c3ae824b3))
* 文档与源码对齐，补充 OCI 清单、层解压策略、E2E 一致性等内容；添加预览截图 ([d4722da](https://github.com/LiaoGuoYin/lixian.online/commit/d4722da5628ce31f21c0d6dd7fd2e9ab35778dc1))
* 更新首页描述确保简单 ([db9cdb9](https://github.com/LiaoGuoYin/lixian.online/commit/db9cdb9248a43457c30a47be389c8303b460c481))
