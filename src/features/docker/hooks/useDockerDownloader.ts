import { useState, useCallback, useRef, useEffect } from "react";
import { dockerService } from "../api/DockerService";
import { DockerImageInfo, DockerDownloadProgress, DockerSearchCandidate } from "../types";
import { get } from "@/shared/lib/http";

const IMAGE_NOT_FOUND_MESSAGE = "未找到对应镜像，请检查名称或从候选镜像中选择";

export function useDockerDownloader() {
  const [imageUrl, setImageUrl] = useState("");
  const [tagList, setTagList] = useState<string[]>([]);
  const [imageInfo, setImageInfo] = useState<DockerImageInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DockerDownloadProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [searchCandidates, setSearchCandidates] = useState<DockerSearchCandidate[]>([]);
  const [imageNotFound, setImageNotFound] = useState(false);

  // Track current blob URL so we can revoke it on re-download or unmount
  const blobUrlRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const onImageUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setImageUrl(newUrl);
    setImageInfo(null);
    setTagList([]);
    setDownloadUrl("");
    setImageNotFound(false);
    setSearchCandidates([]);
  }, []);

  const onTagChange = useCallback(
    (value: string) => {
      if (imageInfo) {
        setImageInfo({ ...imageInfo, tag: value });
      }
    },
    [imageInfo]
  );

  const handleImageNotFound = useCallback(async (searchKeyword: string) => {
    setImageNotFound(true);
    const candidates = await dockerService.searchImages(searchKeyword, 5);
    setSearchCandidates(candidates);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setImageNotFound(false);
      setSearchCandidates([]);

      let extracted: DockerImageInfo | null = null;
      try {
        if (!imageUrl) {
          throw new Error("请输入 Docker 镜像名称或 URL");
        }

        extracted = dockerService.extractImageInfo(imageUrl);
        setImageInfo(extracted);

        if (extracted && !tagList.length) {
          const tags = await dockerService.getTagList(extracted);

          if (!tags.length) {
            const searchKeyword = extracted.repository || imageUrl;
            await handleImageNotFound(searchKeyword);
            throw new Error(IMAGE_NOT_FOUND_MESSAGE);
          }

          setTagList(tags);
          
          // 如果当前没有选择tag，自动选择第一个
          if (!extracted.tag && tags.length > 0) {
            setImageInfo({ ...extracted, tag: tags[0] });
          }
        }
      } catch (error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError?.response?.status === 404) {
          const searchKeyword = extracted?.repository || imageUrl;
          await handleImageNotFound(searchKeyword);
          throw new Error(IMAGE_NOT_FOUND_MESSAGE);
        }
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [handleImageNotFound, imageUrl, tagList]
  );

  const handleDownload = useCallback(async () => {
    if (!imageInfo || !imageInfo.tag) {
      throw new Error("请选择要下载的镜像标签");
    }

    setLoading(true);
    setDownloadProgress({
      layerIndex: 0,
      totalLayers: 0,
      currentLayerSize: 0,
      downloadedSize: 0,
      totalSize: 0,
      status: 'downloading'
    });

    try {
      // 获取镜像清单
      const manifest = await dockerService.getManifest(imageInfo);
      
      // 容错处理：检查 manifest 结构
      const layers = manifest?.layers || [];
      const totalLayers = layers.length;
      const totalSize = layers.reduce((sum, layer) => sum + (layer?.size || 0), 0);
      
      setDownloadProgress(prev => prev ? {
        ...prev,
        totalLayers,
        totalSize
      } : null);

      // 实际下载层数据
      const downloadedLayers: Blob[] = [];
      let downloadedSize = 0;
      
      // 获取认证令牌用于下载层
      const namespace = imageInfo.namespace || 'library';
      const authUrl = `/api/docker/auth?namespace=${namespace}&repository=${imageInfo.repository}`;
      const authResponse = await get(authUrl, {});
      const token = authResponse.data.token;

      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (!layer?.digest) continue;
        
        setDownloadProgress(prev => prev ? {
          ...prev,
          layerIndex: i + 1, // 转换为基于1的索引
          currentLayerSize: layer.size || 0,
          downloadedSize
        } : null);

        try {
          console.log(`开始下载层 ${i + 1}/${layers.length}: ${layer.digest}`);
          const layerBlob = await dockerService.downloadLayer(imageInfo, layer.digest, token);
          console.log(`层 ${i + 1} 下载完成，大小: ${layerBlob.size} bytes`);
          
          downloadedLayers.push(layerBlob);
          downloadedSize += layerBlob.size;
          
          setDownloadProgress(prev => prev ? {
            ...prev,
            layerIndex: i + 1, // 确保显示当前完成的层数
            downloadedSize
          } : null);
        } catch (error) {
          console.error(`下载层 ${layer.digest} 失败:`, error);
          // 不要静默忽略错误，抛出错误让用户知道
          throw new Error(`下载层失败: ${error}`);
        }
      }

      console.log('开始生成 TAR 文件，下载的层数:', downloadedLayers.length);
      console.log('层大小信息:', downloadedLayers.map((layer, i) => ({ index: i, size: layer.size })));
      
      // 生成 Docker Load TAR 文件
      const blob = await dockerService.generateDockerLoadTar(manifest, downloadedLayers, imageInfo);

      // Revoke previous blob URL before creating a new one
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setDownloadUrl(url);

      setDownloadProgress(prev => prev ? {
        ...prev,
        status: 'completed'
      } : null);

    } catch (error) {
      setDownloadProgress(prev => prev ? {
        ...prev,
        status: 'error'
      } : null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [imageInfo]);

  return {
    imageUrl,
    tagList,
    imageInfo,
    downloadProgress,
    downloadUrl,
    loading,
    imageNotFound,
    searchCandidates,
    onImageUrlChange,
    onTagChange,
    handleSubmit,
    handleDownload,
  };
}
