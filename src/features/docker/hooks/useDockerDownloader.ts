import { useState, useCallback, useRef, useEffect } from "react";
import { dockerService } from "../api/DockerService";
import { DockerImageInfo, DockerManifest, DockerDownloadProgress, DockerSearchCandidate } from "../types";
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
  const [manifest, setManifest] = useState<DockerManifest | null>(null);
  const [manifestLoading, setManifestLoading] = useState(false);
  const manifestRef = useRef<DockerManifest | null>(null);

  // Keep a ref to imageInfo so download callbacks are stable
  const imageInfoRef = useRef(imageInfo);
  imageInfoRef.current = imageInfo;

  // Track current blob URL so we can revoke it on re-download or unmount
  const blobUrlRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const fetchManifest = useCallback(async (info: DockerImageInfo) => {
    if (!info.repository || !info.tag) return;
    setManifestLoading(true);
    setManifest(null);
    manifestRef.current = null;
    try {
      const m = await dockerService.getManifest(info);
      setManifest(m);
      manifestRef.current = m;
    } catch (error) {
      console.warn('获取清单失败:', error);
    } finally {
      setManifestLoading(false);
    }
  }, []);

  const onImageUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setImageUrl(newUrl);
    setImageInfo(null);
    setTagList([]);
    setDownloadUrl("");
    setImageNotFound(false);
    setSearchCandidates([]);
    setManifest(null);
    manifestRef.current = null;
  }, []);

  const onTagChange = useCallback(
    (value: string) => {
      const updated = imageInfoRef.current ? { ...imageInfoRef.current, tag: value } : null;
      setImageInfo(updated);
      if (updated) fetchManifest(updated);
    },
    [fetchManifest]
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
          const finalInfo = extracted.tag ? extracted : { ...extracted, tag: tags[0] };
          setImageInfo(finalInfo);

          // 预取 manifest 以展示各层大小
          fetchManifest(finalInfo);
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
    [fetchManifest, handleImageNotFound, imageUrl, tagList]
  );

  const handleDownload = useCallback(async () => {
    const info = imageInfoRef.current;
    if (!info || !info.tag) {
      throw new Error("请选择要下载的镜像标签");
    }

    setLoading(true);
    setDownloadProgress({
      layerIndex: 0,
      totalLayers: 0,
      currentLayerSize: 0,
      currentLayerDownloaded: 0,
      downloadedSize: 0,
      totalSize: 0,
      status: 'downloading'
    });

    try {
      // 复用已预取的 manifest，否则重新获取
      const manifest = manifestRef.current ?? await dockerService.getManifest(info);

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

      const namespace = info.namespace || 'library';

      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        if (!layer?.digest) continue;

        setDownloadProgress(prev => prev ? {
          ...prev,
          layerIndex: i + 1,
          currentLayerSize: layer.size || 0,
          currentLayerDownloaded: 0,
          downloadedSize
        } : null);

        try {
          // 每层下载前重新获取 token，避免大层下载耗时导致 token 过期（默认 300s）
          const authUrl = `/api/docker/auth?namespace=${namespace}&repository=${info.repository}`;
          const authResponse = await get(authUrl, {});
          const token = authResponse.data.token;

          console.log(`开始下载层 ${i + 1}/${layers.length}: ${layer.digest}`);
          const layerBlob = await dockerService.downloadLayer(info, layer.digest, token, (bytes) => {
            setDownloadProgress(prev => prev ? {
              ...prev,
              currentLayerDownloaded: bytes,
            } : null);
          });
          console.log(`层 ${i + 1} 下载完成，大小: ${layerBlob.size} bytes`);

          downloadedLayers.push(layerBlob);
          downloadedSize += layerBlob.size;

          setDownloadProgress(prev => prev ? {
            ...prev,
            downloadedSize,
            currentLayerDownloaded: 0,
          } : null);
        } catch (error) {
          console.error(`下载层 ${layer.digest} 失败:`, error);
          throw new Error(`下载层失败: ${error}`);
        }
      }

      setDownloadProgress(prev => prev ? {
        ...prev,
        status: 'packing'
      } : null);

      console.log('开始生成 TAR 文件，下载的层数:', downloadedLayers.length);

      // 生成 Docker Load TAR 文件
      const blob = await dockerService.generateDockerLoadTar(manifest, downloadedLayers, info);

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
  }, []);

  return {
    imageUrl,
    tagList,
    imageInfo,
    downloadProgress,
    downloadUrl,
    loading,
    manifest,
    manifestLoading,
    imageNotFound,
    searchCandidates,
    onImageUrlChange,
    onTagChange,
    handleSubmit,
    handleDownload,
  };
}
