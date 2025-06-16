import { useState, useCallback } from "react";
import { dockerService } from "../api/DockerService";
import { DockerImageInfo, DockerDownloadProgress } from "../types";

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

      // 这里应该实现实际的下载和打包逻辑
      // 由于浏览器环境限制，暂时生成一个下载链接
      const blob = dockerService.generateDockerLoadTar(manifest, [], imageInfo);
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