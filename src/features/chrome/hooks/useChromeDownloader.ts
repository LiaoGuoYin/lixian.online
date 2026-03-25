import { useState, useCallback, useRef, useEffect } from "react";
import { chromeService } from "../api/ChromeService";
import { ChromeExtensionInfo, ChromeDownloadProgress, ChromeSearchResult } from "../types";

export function useChromeDownloader() {
  const [extensionUrl, setExtensionUrl] = useState("");
  const [extensionInfo, setExtensionInfo] = useState<ChromeExtensionInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ChromeDownloadProgress | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<{crx?: string; zip?: string}>({});
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ChromeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Keep a ref to extensionInfo so download callback is stable
  const extensionInfoRef = useRef(extensionInfo);
  extensionInfoRef.current = extensionInfo;

  // Track active blob URLs so they can be revoked on re-download or unmount
  const blobUrlsRef = useRef<string[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const onUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setExtensionUrl(e.target.value);
    setExtensionInfo(null);
    setDownloadUrls({});
    setDownloadProgress(null);
  }, []);

  // 搜索 Chrome 扩展
  const handleSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    // 如果输入的已经是扩展 ID，不搜索
    if (/^[a-z]{32}$/.test(trimmed)) {
      setSearchResults([]);
      return;
    }

    // 如果输入的是 URL（包含 . 或 / ），不搜索
    if (/[./]/.test(trimmed)) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await chromeService.searchExtensions(trimmed);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // debounce search
  const onSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUrlChange(e);
    const val = e.target.value;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => handleSearch(val), 400);
  }, [onUrlChange, handleSearch]);

  const selectSearchResult = useCallback((result: ChromeSearchResult) => {
    setExtensionUrl(result.id);
    setExtensionInfo({
      id: result.id,
      name: result.name,
    });
    setSearchResults([]);
    setDownloadUrls({});
    setDownloadProgress(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setSearchResults([]);

      try {
        if (!extensionUrl) {
          throw new Error("请输入 Chrome 扩展名称或 ID");
        }

        const extensionId = chromeService.extractExtensionId(extensionUrl);
        if (!chromeService.isValidExtensionId(extensionId)) {
          throw new Error("无效的扩展 ID");
        }

        // 获取扩展详情，合并已有信息（如搜索结果中的名称）
        const detail = await chromeService.getExtensionInfo(extensionId);
        setExtensionInfo(prev => ({
          ...prev,
          ...detail,
          name: detail.name || prev?.name,
        }));

      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [extensionUrl]
  );

  const cancelDownload = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setDownloadProgress(null);
  }, []);

  const handleDownload = useCallback(async (format: 'crx' | 'zip' | 'both' = 'both') => {
    const info = extensionInfoRef.current;
    if (!info?.id) {
      throw new Error("请先解析扩展信息");
    }

    // Abort any previous download
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setDownloadProgress({
      status: 'downloading',
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0
    });

    try {
      const downloadInfo = chromeService.getDownloadInfo(info.id);

      const response = await fetch(downloadInfo.downloadUrl, {
        signal: controller.signal,
      });
      if (!response.ok) {
        let errorMessage = `下载失败: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch { /* ignore */ }
        throw new Error(errorMessage);
      }

      // Stream reading for real progress
      const contentLength = Number(response.headers.get('Content-Length') || 0);

      let crxBlob: Blob;
      if (response.body && contentLength > 0) {
        const reader = response.body.getReader();
        const chunks: BlobPart[] = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          setDownloadProgress(prev => prev ? {
            ...prev,
            progress: Math.round((received / contentLength) * 90),
            bytesDownloaded: received,
            totalBytes: contentLength,
          } : null);
        }
        crxBlob = new Blob(chunks, { type: 'application/x-chrome-extension' });
      } else {
        // Fallback: no content-length, show indeterminate
        crxBlob = await response.blob();
        setDownloadProgress(prev => prev ? { ...prev, progress: 90 } : null);
      }

      // Revoke previous blob URLs before creating new ones
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];

      const crxUrl = URL.createObjectURL(crxBlob);
      blobUrlsRef.current.push(crxUrl);

      const urls: {crx?: string; zip?: string} = {};

      if (format === 'crx' || format === 'both') {
        urls.crx = crxUrl;
      }

      if (format === 'zip' || format === 'both') {
        setDownloadProgress(prev => prev ? { ...prev, status: 'converting', progress: 95 } : null);
        try {
          const zipBlob = await chromeService.convertCrxToZip(crxBlob);
          const zipUrl = URL.createObjectURL(zipBlob);
          blobUrlsRef.current.push(zipUrl);
          urls.zip = zipUrl;
        } catch (error) {
          console.warn('CRX 转 ZIP 失败:', error);
          if (!urls.crx) urls.crx = crxUrl;
          if (format === 'zip') urls.crx = crxUrl;
        }
      }

      setDownloadUrls(urls);
      setDownloadProgress(prev => prev ? { ...prev, status: 'completed', progress: 100 } : null);

    } catch (error) {
      if (controller.signal.aborted) return;
      setDownloadProgress(prev => prev ? {
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : '下载失败'
      } : null);
      throw error;
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, []);

  return {
    extensionUrl,
    extensionInfo,
    downloadProgress,
    downloadUrls,
    loading,
    searchResults,
    searching,
    onUrlChange: onSearchInputChange,
    selectSearchResult,
    handleSubmit,
    handleDownload,
    cancelDownload,
  };
}
