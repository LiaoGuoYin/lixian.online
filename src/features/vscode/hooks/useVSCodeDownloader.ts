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
    setExtensionInfo({
      ...vscodeService.extractExtensionInfo(newUrl),
      version: null,
    });
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && clipboardText.includes('marketplace.visualstudio.com')) {
        setUrl(clipboardText);
        setExtensionInfo({
          ...vscodeService.extractExtensionInfo(clipboardText),
          version: null,
        });
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

        if (extensionInfo) {
          const versions = await vscodeService.getVersionList(extensionInfo);
          setVersionList(versions);
        }
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
