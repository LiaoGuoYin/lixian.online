import { useState, useCallback, useEffect } from "react";
import { vscodeService } from "../api/VSCodeService";
import { ExtensionInfo } from "../types";

export function useVSCodeDownloader() {
  const [url, setUrl] = useState("");
  const [versionList, setVersionList] = useState<string[]>([]);
  const [extensionInfo, setExtensionInfo] = useState<ExtensionInfo | null>(
    null
  );
  const [downloadUrl, setDownloadUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const onUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    // extractExtensionInfo may throw for complete but invalid URLs; swallow here,
    // validation happens on submit
    try {
      setExtensionInfo({ ...vscodeService.extractExtensionInfo(newUrl), version: null });
    } catch {
      setExtensionInfo(null);
    }
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && clipboardText.includes('marketplace.visualstudio.com')) {
        setUrl(clipboardText);
        const extractedInfo = vscodeService.extractExtensionInfo(clipboardText);
        
        // 获取版本列表并自动选择最新版本
        try {
          const versions = await vscodeService.getVersionList(extractedInfo);
          setVersionList(versions);
          
          // 选择最新版本（第一个版本通常是最新的）
          const latestVersion = versions[0];
          if (latestVersion) {
            setExtensionInfo({
              ...extractedInfo,
              version: latestVersion,
            });
          } else {
            setExtensionInfo({
              ...extractedInfo,
              version: null,
            });
          }
        } catch (error) {
          console.warn('获取版本列表失败:', error);
          setExtensionInfo({
            ...extractedInfo,
            version: null,
          });
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.warn('无法读取剪切板内容:', error);
      return false;
    }
  }, []);

  const onVersionChange = useCallback(
    (value: string) => {
      if (extensionInfo) {
        setExtensionInfo({ ...extensionInfo, version: value });
      }
    },
    [extensionInfo]
  );

  useEffect(() => {
    if (extensionInfo?.version) {
      vscodeService.getDownloadUrl(extensionInfo).then(setDownloadUrl);
    }
  }, [extensionInfo]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        if (!url) {
          throw new Error("请输入插件 URL");
        }

        if (!extensionInfo?.publisher || !extensionInfo?.extension) {
          throw new Error("请输入有效的 VSCode 插件 URL");
        }

        const versions = await vscodeService.getVersionList(extensionInfo);
        setVersionList(versions);
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [url, extensionInfo]
  );

  return {
    url,
    versionList,
    extensionInfo,
    downloadUrl,
    loading,
    onUrlChange,
    onVersionChange,
    handleSubmit,
    handlePasteFromClipboard,
  };
}
