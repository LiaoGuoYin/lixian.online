import { useCallback, useEffect, useRef, useState } from "react";
import { edgeService } from "@/features/edge/api/EdgeService";
import {
  EdgeDownloadProgress,
  EdgeExtensionInfo,
  EdgeSearchResult,
} from "@/features/edge/types";
import { parseEdgeQuery } from "@/features/edge/utils/edgeInput";

export function useEdgeDownloader(initialValue?: string) {
  const [extensionQuery, setExtensionQuery] = useState(initialValue ?? "");
  const [extensionInfo, setExtensionInfo] = useState<EdgeExtensionInfo | null>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<EdgeDownloadProgress | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<{ crx?: string; zip?: string }>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<EdgeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const extensionInfoRef = useRef(extensionInfo);
  extensionInfoRef.current = extensionInfo;

  const blobUrlsRef = useRef<string[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const updateQuery = useCallback((value: string) => {
    setExtensionQuery(value);
    setExtensionInfo(null);
    setDownloadUrls({});
    setDownloadProgress(null);
  }, []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateQuery(e.target.value);
    },
    [updateQuery],
  );

  const handleSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    if (parseEdgeQuery(trimmed)) {
      setSearchResults([]);
      return;
    }

    if (/[./]/.test(trimmed)) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await edgeService.searchExtensions(trimmed);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onInputChange(e);
      const value = e.target.value;
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => handleSearch(value), 400);
    },
    [handleSearch, onInputChange],
  );

  const selectSearchResult = useCallback((result: EdgeSearchResult) => {
    setExtensionQuery(result.id);
    setExtensionInfo({
      id: result.id,
      storeProductId: result.storeProductId,
      name: result.name,
      developer: result.developer,
      shortDescription: result.description,
      iconUrl: result.iconUrl,
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
        if (!extensionQuery.trim()) {
          throw new Error("请输入 Edge 扩展 ID、ProductId 或商店链接");
        }

        const detail = await edgeService.getExtensionInfo(extensionQuery);
        if (!detail.id) {
          throw new Error("未能解析出扩展 ID");
        }

        setExtensionInfo((prev) => ({
          ...prev,
          ...detail,
          name: detail.name || prev?.name,
          description: detail.description || prev?.description,
          shortDescription: detail.shortDescription || prev?.shortDescription,
          developer: detail.developer || prev?.developer,
        }));
      } finally {
        setLoading(false);
      }
    },
    [extensionQuery],
  );

  const cancelDownload = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setDownloadProgress(null);
  }, []);

  const handleDownload = useCallback(
    async (format: "crx" | "zip" | "both" = "both") => {
      const info = extensionInfoRef.current;
      if (!info?.id) {
        throw new Error("请先解析扩展信息");
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setDownloadProgress({
        status: "downloading",
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 0,
      });

      try {
        const downloadInfo = edgeService.getDownloadInfo(info.id);
        const response = await fetch(downloadInfo.downloadUrl, {
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMessage = `下载失败: ${response.statusText}`;
          try {
            const errorData = await response.json();
            if (errorData.error) errorMessage = errorData.error;
          } catch {
            // noop
          }
          throw new Error(errorMessage);
        }

        const contentLength = Number(response.headers.get("Content-Length") || 0);

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
            setDownloadProgress((prev) =>
              prev
                ? {
                    ...prev,
                    progress: Math.round((received / contentLength) * 90),
                    bytesDownloaded: received,
                    totalBytes: contentLength,
                  }
                : null,
            );
          }

          crxBlob = new Blob(chunks, {
            type: "application/x-chrome-extension",
          });
        } else {
          crxBlob = await response.blob();
          setDownloadProgress((prev) =>
            prev ? { ...prev, progress: 90 } : null,
          );
        }

        blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        blobUrlsRef.current = [];

        const crxUrl = URL.createObjectURL(crxBlob);
        blobUrlsRef.current.push(crxUrl);

        const urls: { crx?: string; zip?: string } = {};
        if (format === "crx" || format === "both") {
          urls.crx = crxUrl;
        }

        if (format === "zip" || format === "both") {
          setDownloadProgress((prev) =>
            prev ? { ...prev, status: "converting", progress: 95 } : null,
          );

          try {
            const zipBlob = await edgeService.convertCrxToZip(crxBlob);
            const zipUrl = URL.createObjectURL(zipBlob);
            blobUrlsRef.current.push(zipUrl);
            urls.zip = zipUrl;
          } catch (error) {
            console.warn("CRX 转 ZIP 失败:", error);
            if (!urls.crx) urls.crx = crxUrl;
            if (format === "zip") urls.crx = crxUrl;
          }
        }

        setDownloadUrls(urls);
        setDownloadProgress((prev) =>
          prev ? { ...prev, status: "completed", progress: 100 } : null,
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setDownloadProgress((prev) =>
          prev
            ? {
                ...prev,
                status: "error",
                error: error instanceof Error ? error.message : "下载失败",
              }
            : null,
        );
        throw error;
      } finally {
        abortControllerRef.current = null;
        setLoading(false);
      }
    },
    [],
  );

  return {
    extensionQuery,
    extensionInfo,
    downloadProgress,
    downloadUrls,
    loading,
    searchResults,
    searching,
    onQueryChange: onSearchInputChange,
    selectSearchResult,
    handleSubmit,
    handleDownload,
    cancelDownload,
  };
}
