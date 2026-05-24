import { useState, useCallback, useRef, useEffect } from "react";
import { dockerService } from "../api/DockerService";
import { DockerImageInfo, DockerManifest, DockerPlatform, DockerDownloadProgress, DockerSearchCandidate } from "../types";
import { get } from "@/shared/lib/http";

function formatPlatform(p: DockerPlatform): string {
  return p.variant ? `${p.os}/${p.architecture}/${p.variant}` : `${p.os}/${p.architecture}`;
}

function formatImageRef(info: DockerImageInfo | null): string {
  if (!info?.repository) return "当前输入";
  return `${info.namespace || "library"}/${info.repository}`;
}

function getImageNotFoundMessage(
  info: DockerImageInfo | null,
  hasCandidates: boolean,
): string {
  const nextAction = hasCandidates
    ? "请从下方候选镜像中选择。"
    : "请前往 Docker Hub 搜索并输入完整 namespace/repository。";
  return `未找到 ${formatImageRef(info)}。Docker 输入需要完整镜像名，例如 apache/kafka；${nextAction}`;
}

export function useDockerDownloader(initialValue?: string) {
  const [imageUrl, setImageUrl] = useState(initialValue ?? "");
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
  const [availablePlatforms, setAvailablePlatforms] = useState<DockerPlatform[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const selectedPlatformRef = useRef<string>("");

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

  const fetchManifest = useCallback(async (info: DockerImageInfo, platform?: string) => {
    if (!info.repository || !info.tag) return;
    setManifestLoading(true);
    setManifest(null);
    manifestRef.current = null;
    try {
      const effectivePlatform = platform || selectedPlatformRef.current || undefined;
      const m = await dockerService.getManifest(info, effectivePlatform);
      setManifest(m);
      manifestRef.current = m;
    } catch (error) {
      console.warn('获取清单失败:', error);
    } finally {
      setManifestLoading(false);
    }
  }, []);

  const setImageInput = useCallback((newUrl: string) => {
    setImageUrl(newUrl);
    setImageInfo(null);
    setTagList([]);
    setDownloadUrl("");
    setImageNotFound(false);
    setSearchCandidates([]);
    setManifest(null);
    manifestRef.current = null;
    setAvailablePlatforms([]);
    setSelectedPlatform("");
    selectedPlatformRef.current = "";
  }, []);

  const onImageUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setImageInput(e.target.value);
    },
    [setImageInput],
  );

  const selectSearchCandidate = useCallback(
    (candidate: DockerSearchCandidate) => {
      setImageInput(`${candidate.namespace}/${candidate.repository}`);
    },
    [setImageInput],
  );

  const onTagChange = useCallback(
    (value: string) => {
      const updated = imageInfoRef.current ? { ...imageInfoRef.current, tag: value } : null;
      setImageInfo(updated);
      setAvailablePlatforms([]);
      setSelectedPlatform("");
      selectedPlatformRef.current = "";
      setManifest(null);
      manifestRef.current = null;
      if (updated) {
        // Fetch platforms for the new tag
        dockerService.getAvailablePlatforms({ ...updated }).then(platforms => {
          setAvailablePlatforms(platforms);
          if (platforms.length > 0) {
            // Default to linux/amd64 if available, otherwise first platform
            const defaultPlatform = platforms.find(p => p.architecture === 'amd64' && p.os === 'linux')
              || platforms[0];
            const platformStr = formatPlatform(defaultPlatform);
            setSelectedPlatform(platformStr);
            selectedPlatformRef.current = platformStr;
            fetchManifest(updated, platformStr);
          } else {
            // Single-arch image, fetch manifest directly
            fetchManifest(updated);
          }
        });
      }
    },
    [fetchManifest]
  );

  const onPlatformChange = useCallback(
    (value: string) => {
      setSelectedPlatform(value);
      selectedPlatformRef.current = value;
      setDownloadUrl("");
      const info = imageInfoRef.current;
      if (info) fetchManifest(info, value);
    },
    [fetchManifest]
  );

  const handleImageNotFound = useCallback(async (searchKeyword: string) => {
    setImageNotFound(true);
    const candidates = await dockerService.searchImages(searchKeyword, 5);
    setSearchCandidates(candidates);
    return candidates;
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
            const candidates = await handleImageNotFound(searchKeyword);
            throw new Error(
              getImageNotFoundMessage(extracted, candidates.length > 0),
            );
          }

          setTagList(tags);

          // 如果当前没有选择tag，自动选择第一个
          const finalInfo = extracted.tag ? extracted : { ...extracted, tag: tags[0] };
          setImageInfo(finalInfo);

          // 获取可用平台列表
          const platforms = await dockerService.getAvailablePlatforms(finalInfo);
          setAvailablePlatforms(platforms);

          if (platforms.length > 0) {
            const defaultPlatform = platforms.find(p => p.architecture === 'amd64' && p.os === 'linux')
              || platforms[0];
            const platformStr = formatPlatform(defaultPlatform);
            setSelectedPlatform(platformStr);
            selectedPlatformRef.current = platformStr;
            fetchManifest(finalInfo, platformStr);
          } else {
            // 单架构镜像，直接获取 manifest
            fetchManifest(finalInfo);
          }
        }
      } catch (error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError?.response?.status === 404) {
          const searchKeyword = extracted?.repository || imageUrl;
          const candidates = await handleImageNotFound(searchKeyword);
          throw new Error(
            getImageNotFoundMessage(extracted, candidates.length > 0),
          );
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
      const currentPlatform = selectedPlatformRef.current || undefined;
      const manifest = manifestRef.current ?? await dockerService.getManifest(info, currentPlatform);

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
      const archParts = currentPlatform?.split('/');
      const architecture = archParts?.[1]; // e.g. "arm64" from "linux/arm64"
      const blob = await dockerService.generateDockerLoadTar(manifest, downloadedLayers, info, architecture);

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
    availablePlatforms,
    selectedPlatform,
    onImageUrlChange,
    selectSearchCandidate,
    onTagChange,
    onPlatformChange,
    handleSubmit,
    handleDownload,
  };
}
