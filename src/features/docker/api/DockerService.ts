import { DockerImageInfo, DockerManifest } from "@/features/docker/types";
import { get } from "@/shared/lib/http";

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
          namespace: namespace === 'library' ? '' : namespace,
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
      repository = repo;
      tag = tagPart || "latest";
    } else if (parts.length === 2) {
      // library/nginx:latest
      const [ns, repoWithTag] = parts;
      const [repo, tagPart] = repoWithTag.split(':');
      namespace = ns === 'library' ? '' : ns;
      repository = repo;
      tag = tagPart || "latest";
    } else if (parts.length === 3) {
      // docker.io/library/nginx:latest
      const [reg, ns, repoWithTag] = parts;
      const [repo, tagPart] = repoWithTag.split(':');
      registry = reg;
      namespace = ns === 'library' ? '' : ns;
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
    
    try {
      // 首先通过代理获取认证令牌
      const authUrl = `/api/docker/auth?namespace=${namespace}&repository=${imageInfo.repository}`;
      const authResponse = await get(authUrl, {});
      const token = authResponse.data.token;
      
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
    const layerUrl = `https://registry-1.docker.io/v2/${namespace}/${imageInfo.repository}/blobs/${digest}`;
    
    const response = await fetch(layerUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    if (!response.ok) {
      throw new Error(`下载层失败: ${response.statusText}`);
    }
    
    return response.blob();
  }

  generateDockerLoadTar(manifest: DockerManifest, layers: Blob[], imageInfo: DockerImageInfo): Blob {
    // 这里需要实现 docker load 格式的 tar 打包
    // 由于浏览器环境限制，这里返回一个占位符
    // 实际实现需要使用 tar-stream 库来创建符合 docker load 格式的 tar 文件
    
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
    
    // 临时返回空 Blob，实际实现需要使用 tar-stream
    const filename = this.getDownloadFilename(imageInfo);
    return new Blob([`Docker image tar placeholder for ${filename}`], { type: 'application/x-tar' });
  }

  getDownloadFilename(imageInfo: DockerImageInfo): string {
    const namespace = imageInfo.namespace ? `${imageInfo.namespace}-` : '';
    return `${namespace}${imageInfo.repository}-${imageInfo.tag}.tar`;
  }
}

export const dockerService = new DockerService();