import { useState, useCallback, useRef, useEffect } from "react";
import { chromeService } from "../api/ChromeService";
import { ChromeExtensionInfo, ChromeDownloadProgress } from "../types";

export function useChromeDownloader() {
  const [extensionUrl, setExtensionUrl] = useState("");
  const [extensionInfo, setExtensionInfo] = useState<ChromeExtensionInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<ChromeDownloadProgress | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<{crx?: string; zip?: string}>({});
  const [loading, setLoading] = useState(false);

  // Track active blob URLs so they can be revoked on re-download or unmount
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const onUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setExtensionUrl(newUrl);
    
    // 实时解析扩展ID
    try {
      const id = chromeService.extractExtensionId(newUrl);
      if (id && chromeService.isValidExtensionId(id)) {
        setExtensionInfo({
          id,
          name: "Chrome Extension",
          version: "Unknown"
        });
      } else {
        setExtensionInfo(null);
      }
    } catch {
      setExtensionInfo(null);
    }
    
    // 清除之前的下载链接
    setDownloadUrls({});
    setDownloadProgress(null);
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && (
        clipboardText.includes('chrome.google.com/webstore') ||
        clipboardText.includes('chromewebstore.google.com') ||
        /^[a-z]{32}$/.test(clipboardText.toLowerCase())
      )) {
        setExtensionUrl(clipboardText);
        
        try {
          const id = chromeService.extractExtensionId(clipboardText);
          if (chromeService.isValidExtensionId(id)) {
            // 获取扩展信息
            const info = await chromeService.getExtensionInfo(id);
            setExtensionInfo(info);
          }
        } catch (error) {
          console.warn('解析扩展ID失败:', error);
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
        if (!extensionUrl) {
          throw new Error("请输入 Chrome 扩展 URL 或 ID");
        }

        const extensionId = chromeService.extractExtensionId(extensionUrl);
        if (!chromeService.isValidExtensionId(extensionId)) {
          throw new Error("无效的扩展 ID");
        }

        // 获取扩展信息
        const info = await chromeService.getExtensionInfo(extensionId);
        setExtensionInfo(info);

      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [extensionUrl]
  );

  const handleDownload = useCallback(async (format: 'crx' | 'zip' | 'both' = 'both') => {
    if (!extensionInfo?.id) {
      throw new Error("请先解析扩展信息");
    }

    setLoading(true);
    setDownloadProgress({
      status: 'downloading',
      progress: 0,
      bytesDownloaded: 0,
      totalBytes: 0
    });

    try {
      const downloadInfo = chromeService.getDownloadInfo(extensionInfo.id);
      
      // 下载 CRX 文件
      setDownloadProgress(prev => prev ? { ...prev, status: 'downloading' } : null);
      
      const response = await fetch(downloadInfo.downloadUrl);
      if (!response.ok) {
        // 尝试解析错误信息
        let errorMessage = `下载失败: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // 如果不是 JSON 响应，使用默认错误信息
        }
        throw new Error(errorMessage);
      }

      const crxBlob = await response.blob();

      // Revoke previous blob URLs before creating new ones
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];

      const crxUrl = URL.createObjectURL(crxBlob);
      blobUrlsRef.current.push(crxUrl);

      const urls: {crx?: string; zip?: string} = {};
      
      if (format === 'crx' || format === 'both') {
        urls.crx = crxUrl;
      }

      // 如果需要 ZIP 格式，转换 CRX 为 ZIP
      if (format === 'zip' || format === 'both') {
        setDownloadProgress(prev => prev ? { ...prev, status: 'converting' } : null);
        
        try {
          const zipBlob = await chromeService.convertCrxToZip(crxBlob);
          const zipUrl = URL.createObjectURL(zipBlob);
          blobUrlsRef.current.push(zipUrl);
          urls.zip = zipUrl;
          
          // 检查转换是否实际成功（文件大小变化等）
          if (zipBlob.size === crxBlob.size) {
            console.log('文件大小相同，可能无需转换或已经是 ZIP 格式');
          }
          
        } catch (error) {
          console.warn('CRX 转 ZIP 失败:', error);
          
          // 降级策略：提供原始 CRX 文件
          if (!urls.crx) {
            urls.crx = crxUrl;
          }
          
          // 如果用户只要求 ZIP 格式，提供 CRX 作为备选
          if (format === 'zip') {
            urls.crx = crxUrl;
            console.log('ZIP 转换失败，提供 CRX 格式作为备选');
          }
        }
      }

      setDownloadUrls(urls);
      setDownloadProgress(prev => prev ? {
        ...prev,
        status: 'completed',
        progress: 100
      } : null);

    } catch (error) {
      setDownloadProgress(prev => prev ? {
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : '下载失败'
      } : null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [extensionInfo]);

  return {
    extensionUrl,
    extensionInfo,
    downloadProgress,
    downloadUrls,
    loading,
    onUrlChange,
    handleSubmit,
    handleDownload,
    handlePasteFromClipboard,
  };
}