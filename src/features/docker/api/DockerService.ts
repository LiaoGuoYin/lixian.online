import { DockerImageInfo, DockerManifest } from "@/features/docker/types";
import { get } from "@/shared/lib/http";
import { TarBuilder } from "@/features/docker/utils/tarBuilder";

class DockerService {
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
      const tags = response.data.results.map((tag: any) => tag.name);
      
      return tags;
    } catch (error) {
      console.warn('获取标签列表失败:', error);
      return [imageInfo.tag || 'latest'];
    }
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

  async downloadLayer(imageInfo: DockerImageInfo, digest: string, token: string): Promise<Blob> {
    const namespace = imageInfo.namespace || 'library';
    
    // 使用代理 API 避免 CORS 问题
    const layerUrl = `/api/docker/layer?namespace=${namespace}&repository=${imageInfo.repository}&digest=${digest}&token=${encodeURIComponent(token)}`;
    
    const response = await fetch(layerUrl);
    
    if (!response.ok) {
      throw new Error(`下载层失败: ${response.statusText}`);
    }
    
    return response.blob();
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
      console.log(`解压层 ${i + 1}/${layers.length}: ${layerId}`);
      const { data, sha256 } = await this.decompressAndHash(layers[i]);
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

  // Decompress a gzip blob and return decompressed bytes + its SHA256
  private async decompressAndHash(blob: Blob): Promise<{ data: Uint8Array; sha256: string }> {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(new Uint8Array(await blob.arrayBuffer()));
    writer.close();

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
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