import { InputWithHistory } from "@/shared/ui/input-with-history";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/hooks/useToast";
import { useHistory } from "@/hooks/useHistory";
import {
  DownloadResultCard,
  type DownloadResultRow,
} from "@/shared/ui/download-result-card";
import { FeatureWorkspace } from "@/shared/ui/feature-workspace";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import { ProgressCard } from "@/shared/ui/progress-card";
import { buildAgentPayload, buildAgentPrompt } from "@/shared/lib/agent-prompts";
import { ChromeIcon } from "@/shared/ui/icons";
import {
  BadgeInfo,
  Download,
  FileArchive,
  Fingerprint,
  Package,
  Search,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useChromeDownloader } from "../hooks/useChromeDownloader";

interface Props {
  defaultValue?: string;
  onQueryChange?: (q: string) => void;
}

export default function ChromeDownloader({
  defaultValue,
  onQueryChange,
}: Props) {
  const { toast } = useToast();
  const history = useHistory("history:chrome");
  const {
    extensionUrl,
    extensionInfo,
    downloadProgress,
    downloadUrls,
    loading,
    searchResults,
    searching,
    onUrlChange,
    selectSearchResult,
    handleSubmit,
    handleDownload,
    cancelDownload,
  } = useChromeDownloader(defaultValue);
  const agentPrompt = buildAgentPrompt({
    tool: "chrome",
    label: "Chrome 扩展",
    query: extensionUrl,
  });
  const agentInputReady = Boolean(extensionUrl.trim());

  const onSubmit = async (e: React.FormEvent) => {
    try {
      await handleSubmit(e);
      history.add(extensionUrl);
      onQueryChange?.(extensionUrl);
      toast({
        title: "解析成功",
        description: "已解析扩展信息",
      });
    } catch (error) {
      toast({
        title: "解析失败",
        description:
          error instanceof Error ? error.message : "扩展 URL 或 ID 有误",
        variant: "destructive",
      });
    }
  };

  const onDownload = async (format: "crx" | "zip" | "both" = "both") => {
    try {
      await handleDownload(format);
      toast({
        title: "准备下载",
        description: "文件已就绪",
      });
    } catch (error) {
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "下载出错",
        variant: "destructive",
      });
    }
  };

  return (
    <FeatureWorkspace
      icon={ChromeIcon}
      title="Chrome 扩展离线包"
      description="搜索或粘贴扩展 ID，下载 CRX 并在浏览器内转换 ZIP。"
      agentPrompt={agentPrompt}
      agentPayload={buildAgentPayload("chrome", extensionUrl)}
      agentInputReady={agentInputReady}
      agentInputHint="扩展名称、ID 或 Web Store URL"
    >
      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Extension ID / URL</span>
            <a
              href="https://chromewebstore.google.com/category/extensions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Chrome Store
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <InputWithHistory
            data-testid="chrome-input"
            placeholder="扩展名称、ID 或商店链接"
            value={extensionUrl}
            onChange={onUrlChange}
            history={history.items}
            onSelectHistory={(v) =>
              onUrlChange({
                target: { value: v },
              } as React.ChangeEvent<HTMLInputElement>)
            }
          />
          {searching && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              搜索中...
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-0.5 rounded-apple-sm border border-border/70 bg-popover p-1 shadow-apple-button">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => {
                    selectSearchResult(result);
                  }}
                  className="flex w-full items-start gap-2.5 rounded-apple-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary sm:items-center"
                >
                  <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 break-words sm:truncate">
                    {result.name}
                  </span>
                  <span className="ml-auto hidden flex-shrink-0 text-xs text-muted-foreground sm:inline">
                    {result.id.slice(0, 8)}…
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-2">
            {[
              {
                label: "沉浸式翻译",
                value: "bpoadfkcbjbfhfodiogcnhhhpibjhbnh",
              },
              {
                label: "篡改猴",
                value: "dhdgffkkebhmkfjojejmpbldmpobfkfo",
              },
            ].map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() =>
                  onUrlChange({
                    target: { value: example.value },
                  } as React.ChangeEvent<HTMLInputElement>)
                }
                className="rounded-apple-sm bg-background px-2.5 py-1 text-xs text-muted-foreground shadow-apple-button transition-colors hover:bg-secondary hover:text-foreground"
              >
                试试 {example.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
          data-testid="chrome-submit"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner />
              解析中...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              解析扩展信息
            </span>
          )}
        </Button>

        {extensionInfo && (
          <div className="space-y-4">
            <DownloadResultCard
              title={extensionInfo.name || "Chrome 扩展"}
              eyebrow="CRX"
              description={extensionInfo.description}
              metadata={[
                {
                  icon: Fingerprint,
                  label: "ID",
                  value: extensionInfo.id,
                },
                ...(extensionInfo.version &&
                extensionInfo.version !== "Unknown"
                  ? [
                      {
                        icon: BadgeInfo,
                        label: "版本",
                        value: extensionInfo.version,
                      },
                    ]
                  : []),
              ]}
            />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <Button
              type="button"
              onClick={() => onDownload("crx")}
              disabled={loading}
              variant="outline"
              className="gap-1.5"
              data-testid="chrome-download-crx"
            >
              <Download className="h-4 w-4" />
              CRX
            </Button>
            <Button
              type="button"
              onClick={() => onDownload("zip")}
              disabled={loading}
              variant="outline"
              className="gap-1.5"
              data-testid="chrome-download-zip"
            >
              <FileArchive className="h-4 w-4" />
              ZIP
            </Button>
            <Button
              type="button"
              onClick={() => onDownload("both")}
              disabled={loading}
              className="gap-1.5"
              data-testid="chrome-download-both"
            >
              <Download className="h-4 w-4" />
              全部下载
            </Button>
          </div>
        </div>
      )}

      {downloadProgress && (
        <ProgressCard
          title={
            <>
              {downloadProgress.status === "downloading" && "下载中..."}
              {downloadProgress.status === "converting" && "转换中..."}
              {downloadProgress.status === "completed" && "下载完成"}
              {downloadProgress.status === "error" && "下载出错"}
            </>
          }
          value={
            downloadProgress.totalBytes > 0
              ? `${(downloadProgress.bytesDownloaded / 1024 / 1024).toFixed(1)} / ${(downloadProgress.totalBytes / 1024 / 1024).toFixed(1)} MB`
              : `${Math.round(downloadProgress.progress)}%`
          }
          progress={downloadProgress.progress}
          error={downloadProgress.error}
          onCancel={
            downloadProgress.status === "downloading" ||
            downloadProgress.status === "converting"
              ? cancelDownload
              : undefined
          }
        />
      )}

      {(downloadUrls.crx || downloadUrls.zip) && (
        <DownloadResultCard
          rows={[
            ...(downloadUrls.crx
              ? [
                  {
                    icon: Package,
                    title: `${extensionInfo?.id}.crx`,
                    description: "Chrome 原生扩展格式",
                    href: downloadUrls.crx,
                    download: `${extensionInfo?.id}.crx`,
                    testId: "chrome-download-crx-link",
                  } satisfies DownloadResultRow,
                ]
              : []),
            ...(downloadUrls.zip
              ? [
                  {
                    icon: FileArchive,
                    title: `${extensionInfo?.id}.zip`,
                    description: "解压后可查看源码",
                    href: downloadUrls.zip,
                    download: `${extensionInfo?.id}.zip`,
                    testId: "chrome-download-zip-link",
                  } satisfies DownloadResultRow,
                ]
              : []),
          ]}
        />
      )}
      </form>
    </FeatureWorkspace>
  );
}
