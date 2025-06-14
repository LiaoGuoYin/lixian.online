# Down2.online

## LLM 提示词

实现一个 Web 端的离线下载工具助手。目前的核心功能是：vscode 插件离线下载、Docker 镜像离线下载。请基于以下想法初始化项目，并实现具有可维护性的代码。

vscode 插件离线下载：

- 下载流程：

  1. 用户输入要下载的 vscode 网址，网页解析真实的下载地址，跳转新页面下载 vscode 插件
  2. 网页解析流程：

     - 比如用户输入插件地址：

       https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev
     - 通过接口获取到版本号 11.0：
     - 拼接得到下载链接：https://marketplace.visualstudio.com/_apis/public/gallery/publishers/saoudrizwan/vsextensions/claude-dev/11.0.0/vspackage
- 其他产品：

  - 脚本：https://github.com/gni/offvsix/blob/main/offvsix/main.py
  - Issues: https://github.com/microsoft/vsmarketplace/issues/238#issuecomment-1378486673

Docker 镜像离线下载：

- 相似产品：
  - Chrome 插件：https://chromewebstore.google.com/detail/docker-image-downloader/dfpojffmnkiglpjpjodlpmoejdcfobnd?pli=1

    - [下载器原理](https://www.v2ex.com/t/1110052)：

      * 根据 Docker Registry HTTP API 来模拟 docker pull 的行为
      * 将下载下来的 layers 根据 docker load 支持的格式组装起来，配合 [tar-stream](https://github.com/mafintosh/tar-stream/blob/master/pack.js) 直接流式打包
      * chrome extension v3 支持 service-worker ，service-worker 支持 Fetch Event 可以让用户在浏览器的下载器中直接下载上一步流式打包的 tar 文件
  - 脚本1: https://github.com/meetyourturik/dockerless-docker-downloader
  - 脚本2: https://github.com/NotGlop/docker-drag
  - 其他参考：

    - https://www.v2ex.com/t/1117273

TODO

* [ ] 官网跳转
* [ ] ICON 显示
* [ ] Step 分步骤下载
