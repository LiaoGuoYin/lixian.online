import { DockerImageInfo, DockerManifest, DockerSearchCandidate } from "@/features/docker/types";
import { get } from "@/shared/lib/http";
import { TarBuilder } from "@/features/docker/utils/tarBuilder";

class DockerService {
  private readonly dockerHubBaseUrl = "https://hub.docker.com";

  extractImageInfo(imageUrl: string): DockerImageInfo {
    if (!imageUrl) {
      return { registry: "", namespace: "", repository: "", tag: "" };
    }

    // 支持多种格式：
    // docker.io/library/nginx:latest
    // nginx:latest
    // registry.example.com/namespace/repo:tag
    // hub.docker.com/r/library/nginx
    
    let cleanUrl = imageUrl.trim();
    
    // 处理 hub.docker.com 链接
    if (cleanUrl.includes('hub.docker.com')) {
      const match = cleanUrl.match(/hub\.docker\.com\/r\/([^\/]+)\/([^\/\?]+)/);
      if (match) {
        const [, namespace, repository] = match;
        return {
          registry: "docker.io",
          namespace: namespace,
          repository,
          tag: "latest"
        };
      }
    }
    
    // 处理直接的镜像名格式
    const parts = cleanUrl.split('/');
    let registry = "docker.io";
    let namespace = "";
    let repository = "";
    let tag = "latest";
    
    if (parts.length === 1) {
      // nginx:latest
      const [repo, tagPart] = parts[0].split(':');
      namespace = "library"; // 默认使用 library namespace
      repository = repo;
      tag = tagPart || "latest";
    } else if (parts.length === 2) {
      // library/nginx:latest
      const [ns, repoWithTag] = parts;
      const [repo, tagPart] = repoWithTag.split(':');
      namespace = ns;
      repository = repo;
      tag = tagPart || "latest";
    } else if (parts.length === 3) {
      // docker.io/library/nginx:latest
      const [reg, ns, repoWithTag] = parts;
      const [repo, tagPart] = repoWithTag.split(':');
      registry = reg;
      namespace = ns;
      repository = repo;
      tag = tagPart || "latest";
    }
    
    return { registry, namespace, repository, tag };
  }

  async getTagList(imageInfo: DockerImageInfo): Promise<string[]> {
    try {
      // 使用代理 API 避免 CORS 问题
      const namespace = imageInfo.namespace || 'library';
      const url = `/api/docker/tags?namespace=${namespace}&repository=${imageInfo.repository}`;
      
      const response = await get(url, {});
      const tags = (response.data.results ?? []).map((tag: { name: string }) => tag.name);
      
      return tags;
    } catch (error) {
      console.warn('获取标签列表失败:', error);
      throw error;
    }
  }

  async searchImages(keyword: string, pageSize = 5): Promise<DockerSearchCandidate[]> {
    try {
      const query = encodeURIComponent(keyword.trim());
      if (!query) return [];

      const url = `/api/docker/search?q=${query}&page_size=${pageSize}`;
      const response = await get(url, {});
      const results = response.data?.results ?? [];

      return results.map((item: {
        repo_name: string;
        short_description?: string;
        star_count?: number;
        pull_count?: number;
      }) => {
        const repoNameParts = item.repo_name?.split('/') ?? [];
        const hasNamespace = repoNameParts.length > 1;
        const namespace = hasNamespace ? repoNameParts[0] : 'library';
        const repository = hasNamespace ? repoNameParts[1] : (repoNameParts[0] || '');
        return {
          namespace,
          repository,
          shortDescription: item.short_description || '',
          starCount: item.star_count || 0,
          pullCount: item.pull_count || 0,
        };
      }).filter((item: DockerSearchCandidate) => item.repository);
    } catch (error) {
      console.warn('搜索镜像失败:', error);
      return [];
    }
  }

  getDockerHubRepoUrl(namespace: string, repository: string): string {
    return `${this.dockerHubBaseUrl}/r/${namespace || "library"}/${repository}`;
  }

  getDockerHubSearchUrl(keyword: string): string {
    return `${this.dockerHubBaseUrl}/search?q=${encodeURIComponent(keyword.trim())}`;
  }

  async getManifest(imageInfo: DockerImageInfo): Promise<DockerManifest> {
    const namespace = imageInfo.namespace || 'library';
    
    console.log('getManifest 请求:', { imageInfo, namespace });
    
    try {
      // 首先通过代理获取认证令牌
      const authUrl = `/api/docker/auth?namespace=${namespace}&repository=${imageInfo.repository}`;
      console.log('认证 URL:', authUrl);
      
      const authResponse = await get(authUrl, {});
      const token = authResponse.data.token;
      
      console.log('认证响应:', { hasToken: !!token, tokenLength: token?.length });
      
      // 使用代理获取清单
      const manifestUrl = `/api/docker/manifest?namespace=${namespace}&repository=${imageInfo.repository}&tag=${imageInfo.tag}&token=${token}`;
      const manifestResponse = await get(manifestUrl, {});
      
      const manifest = manifestResponse.data;
      
      // 调试日志
      console.log('Docker Manifest Response:', manifest);
      
      // 验证清单结构
      if (!manifest) {
        throw new Error('清单数据为空');
      }
      
      // 确保基本结构存在
      const normalizedManifest: DockerManifest = {
        schemaVersion: manifest.schemaVersion || 2,
        mediaType: manifest.mediaType || 'application/vnd.docker.distribution.manifest.v2+json',
        config: manifest.config || {
          mediaType: 'application/vnd.docker.container.image.v1+json',
          size: 0,
          digest: ''
        },
        layers: manifest.layers || []
      };
      
      console.log('Normalized Manifest:', normalizedManifest);
      
      return normalizedManifest;
    } catch (error) {
      console.error('获取清单详细错误:', error);
      throw new Error(`获取镜像清单失败: ${error}`);
    }
  }

  async downloadLayer(
    imageInfo: DockerImageInfo,
    digest: string,
    token: string,
    onProgress?: (downloaded: number) => void,
  ): Promise<Blob> {
    const namespace = imageInfo.namespace || 'library';

    // 使用代理 API 避免 CORS 问题
    const layerUrl = `/api/docker/layer?namespace=${namespace}&repository=${imageInfo.repository}&digest=${digest}&token=${encodeURIComponent(token)}`;

    const response = await fetch(layerUrl);

    if (!response.ok) {
      throw new Error(`下载层失败: ${response.statusText}`);
    }

    if (!onProgress || !response.body) {
      return response.blob();
    }

    // Stream read to report byte-level progress
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let downloaded = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      downloaded += value.length;
      onProgress(downloaded);
    }

    return new Blob(chunks);
  }

  async generateDockerLoadTar(manifest: DockerManifest, layers: Blob[], imageInfo: DockerImageInfo): Promise<Blob> {
    // 容错处理
    const safeLayers = layers || [];
    const safeManifest = manifest || {};
    const manifestLayers = safeManifest.layers || [];
    
    console.log('生成 Docker Load TAR 文件:', {
      manifest: safeManifest,
      layerCount: safeLayers.length,
      manifestLayerCount: manifestLayers.length,
      imageInfo
    });

    const tarBuilder = new TarBuilder();
    
    // 构建 Docker Load 格式的 TAR 文件
    await this.buildDockerLoadTar(tarBuilder, safeManifest, safeLayers, imageInfo);
    
    const tarData = tarBuilder.build();
    console.log('TAR 文件大小:', tarData.length, 'bytes');

    return new Blob([tarData.buffer as ArrayBuffer], { type: 'application/x-tar' });
  }

  private async buildDockerLoadTar(
    tarBuilder: TarBuilder,
    manifest: DockerManifest,
    layers: Blob[],
    imageInfo: DockerImageInfo
  ): Promise<void> {
    const namespace = imageInfo.namespace || 'library';
    const fullImageName = namespace ? `${namespace}/${imageInfo.repository}` : imageInfo.repository;
    const imageTag = `${fullImageName}:${imageInfo.tag}`;
    const imageId = this.generateImageId(imageTag);
    const manifestLayers = manifest.layers ?? [];

    // Step 1: decompress each layer and compute its uncompressed SHA256.
    // docker load verifies diff_ids against the SHA256 of the *decompressed* layer tar,
    // and layer.tar inside the archive must also be the uncompressed content.
    type ProcessedLayer = { data: Uint8Array; diffId: string; layerId: string };
    const processed: ProcessedLayer[] = [];

    for (let i = 0; i < layers.length && i < manifestLayers.length; i++) {
      const layerInfo = manifestLayers[i];
      const layerId = this.generateLayerId(layerInfo.digest);
      console.log(`解压层 ${i + 1}/${layers.length}: ${layerId} (${layerInfo.mediaType})`);
      const { data, sha256 } = await this.decompressAndHash(layers[i], layerInfo.mediaType);
      processed.push({ data, diffId: sha256, layerId });
    }

    // Step 2: manifest.json
    tarBuilder.addFile('manifest.json', JSON.stringify([{
      Config: `${imageId}.json`,
      RepoTags: [imageTag],
      Layers: processed.map(l => `${l.layerId}/layer.tar`),
    }]));

    // Step 3: config JSON — diff_ids must be uncompressed SHA256 values
    const configJson = {
      architecture: "amd64",
      config: {
        Hostname: "", Domainname: "", User: "",
        AttachStdin: false, AttachStdout: false, AttachStderr: false,
        Tty: false, OpenStdin: false, StdinOnce: false,
        Env: ["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"],
        Cmd: null, Image: "", Volumes: null, WorkingDir: "",
        Entrypoint: null, OnBuild: null, Labels: null,
      },
      container_config: {
        Hostname: "", Domainname: "", User: "",
        AttachStdin: false, AttachStdout: false, AttachStderr: false,
        Tty: false, OpenStdin: false, StdinOnce: false,
        Env: ["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"],
        Cmd: ["/bin/sh", "-c", "#(nop) ADD file: in /"],
        Image: "", Volumes: null, WorkingDir: "",
        Entrypoint: null, OnBuild: null, Labels: {},
      },
      created: new Date().toISOString(),
      docker_version: "20.10.0",
      history: manifestLayers.map(() => ({
        created: new Date().toISOString(),
        created_by: "/bin/sh -c #(nop) ADD file: in /",
      })),
      os: "linux",
      rootfs: {
        type: "layers",
        diff_ids: processed.map(l => l.diffId),
      },
    };
    tarBuilder.addFile(`${imageId}.json`, JSON.stringify(configJson));

    // Step 4: layer files with decompressed data
    for (let i = 0; i < processed.length; i++) {
      const { data, layerId } = processed[i];
      tarBuilder.addDirectory(`${layerId}/`);
      tarBuilder.addFile(`${layerId}/VERSION`, '1.0');
      tarBuilder.addFile(`${layerId}/json`, JSON.stringify({
        id: layerId,
        parent: i > 0 ? processed[i - 1].layerId : undefined,
        created: new Date().toISOString(),
        container_config: { Cmd: ["/bin/sh", "-c", "#(nop) ADD file: in /"] },
      }));
      tarBuilder.addFile(`${layerId}/layer.tar`, data);
      console.log(`层 ${layerId} 添加完成，解压大小: ${data.length} bytes`);
    }
  }

  // Decompress a layer blob (gzip / uncompressed) and return the raw bytes + SHA256.
  // Detection is based on magic bytes so it works even when mediaType is absent or incorrect.
  private async decompressAndHash(blob: Blob, mediaType?: string): Promise<{ data: Uint8Array; sha256: string }> {
    const raw = new Uint8Array(await blob.arrayBuffer());

    // Magic bytes:
    //   gzip  → 0x1F 0x8B
    //   zstd  → 0x28 0xB5 0x2F 0xFD
    const isGzip = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;
    const isZstd = raw.length >= 4 && raw[0] === 0x28 && raw[1] === 0xb5 && raw[2] === 0x2f && raw[3] === 0xfd;

    let result: Uint8Array;

    if (isGzip) {
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();

      writer.write(raw);
      writer.close();

      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
    } else if (isZstd) {
      // zstd 浏览器原生不支持，需要 JS 库，暂时直接报错提示
      throw new Error(
        `该镜像层使用 zstd 压缩 (${mediaType ?? 'unknown'})，当前版本暂不支持。请尝试下载其他架构或标签。`
      );
    } else {
      // 未压缩（如原始 GGUF 模型文件、许可证文本等），直接使用原始数据
      console.log(`层未压缩或格式未知 (mediaType: ${mediaType ?? 'unknown'})，按原始数据处理`);
      result = raw;
    }

    const hashBuf = await crypto.subtle.digest('SHA-256', result);
    const sha256 = 'sha256:' + Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return { data: result, sha256 };
  }

  private generateImageId(imageTag: string): string {
    // 生成一个简化的镜像 ID (在实际应用中应该使用更复杂的哈希算法)
    let hash = 0;
    for (let i = 0; i < imageTag.length; i++) {
      const char = imageTag.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16).padStart(12, '0');
  }

  private generateLayerId(digest: string): string {
    // 从 digest 中提取或生成层 ID
    return digest.replace('sha256:', '').substring(0, 12);
  }

  getDownloadFilename(imageInfo: DockerImageInfo): string {
    const namespace = imageInfo.namespace ? `${imageInfo.namespace}-` : '';
    return `${namespace}${imageInfo.repository}-${imageInfo.tag}.tar`;
  }
}

export const dockerService = new DockerService();
