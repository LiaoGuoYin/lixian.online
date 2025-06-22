import { useState, useCallback } from "react";
import { dockerService } from "../api/DockerService";
import { DockerImageInfo, DockerDownloadProgress } from "../types";
import { get } from "@/shared/lib/http";

export function useDockerDownloader() {
  const [imageUrl, setImageUrl] = useState("");
  const [tagList, setTagList] = useState<string[]>([]);
  const [imageInfo, setImageInfo] = useState<DockerImageInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DockerDownloadProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");

  const onImageUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setImageUrl(newUrl);
    const extracted = dockerService.extractImageInfo(newUrl);
    setImageInfo(extracted);
    setTagList([]);
    setDownloadUrl("");
  }, []);

  const onTagChange = useCallback(
    (value: string) => {
      if (imageInfo) {
        setImageInfo({ ...imageInfo, tag: value });
      }
    },
    [imageInfo]
  );

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && (
        clipboardText.includes('docker.io') || 
        clipboardText.includes('hub.docker.com') ||
        clipboardText.match(/^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?\/[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?/) ||
        clipboardText.match(/^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?:[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$/)
      )) {
        setImageUrl(clipboardText);
        const extractedInfo = dockerService.extractImageInfo(clipboardText);
        
        try {
          const tags = await dockerService.getTagList(extractedInfo);
          setTagList(tags);
          
          // 如果提取到的tag在列表中，使用它；否则使用第一个
          const selectedTag = tags.includes(extractedInfo.tag) ? extractedInfo.tag : tags[0];
          if (selectedTag) {
            setImageInfo({
              ...extractedInfo,
              tag: selectedTag,
            });
          } else {
            setImageInfo(extractedInfo);
          }
        } catch (error) {
          console.warn('获取标签列表失败:', error);
          setImageInfo(extractedInfo);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.warn('无法读取剪切板内容:', error);
      return false;
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        if (!imageUrl) {
          throw new Error("请输入 Docker 镜像名称或 URL");
        }

        if (imageInfo && !tagList.length) {
          const tags = await dockerService.getTagList(imageInfo);
          setTagList(tags);
          
          // 如果当前没有选择tag，自动选择第一个
          if (!imageInfo.tag && tags.length > 0) {
            setImageInfo({ ...imageInfo, tag: tags[0] });
          }
        }
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [imageUrl, imageInfo, tagList]
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
      const url = URL.createObjectURL(blob);
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
    onImageUrlChange,
    onTagChange,
    handleSubmit,
    handleDownload,
    handlePasteFromClipboard,
  };
}