import { useState, useCallback, useEffect } from "react";
import { vscodeService } from "../api/VSCodeService";
import { ExtensionInfo } from "../types";

export function useVSCodeDownloader(initialValue?: string) {
  const [url, setUrl] = useState(initialValue ?? "");
  const [versionList, setVersionList] = useState<string[]>([]);
  const [extensionInfo, setExtensionInfo] = useState<ExtensionInfo | null>(
    null
  );
  const [downloadUrl, setDownloadUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialValue) {
      try {
        setExtensionInfo({ ...vscodeService.extractExtensionInfo(initialValue), version: null });
      } catch {
        // invalid initial URL, ignore
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const onVersionChange = useCallback(
    (value: string) => {
      setExtensionInfo((prev) => (prev ? { ...prev, version: value } : null));
    },
    []
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

        const metadata = await vscodeService.getExtensionMetadata(extensionInfo);
        setVersionList(metadata.versionList);
        setExtensionInfo((prev) =>
          prev
            ? {
                ...prev,
                ...metadata,
                version:
                  prev.version && metadata.versionList.includes(prev.version)
                    ? prev.version
                    : null,
              }
            : prev,
        );
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
  };
}
