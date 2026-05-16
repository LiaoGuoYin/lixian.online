import { InputWithHistory } from "@/shared/ui/input-with-history";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/hooks/useToast";
import { useHistory } from "@/hooks/useHistory";
import { Card, CardContent } from "@/shared/ui/card";
import {
  DownloadResultCard,
  type DownloadResultRow,
} from "@/shared/ui/download-result-card";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import {
  Download,
  FileArchive,
  Package,
  Search,
  Loader2,
  ExternalLink,
  X,
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
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          输入名称搜索或直接粘贴 ID，或前往{" "}
          <a
            href="https://chromewebstore.google.com/category/extensions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            Chrome Store
            <ExternalLink className="h-3 w-3" />
          </a>{" "}
        </p>
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
          <div className="space-y-0.5 rounded-apple border border-border/70 bg-popover p-1 shadow-apple-button">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => {
                  selectSearchResult(result);
                }}
                className="flex w-full items-start gap-2.5 rounded-apple-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary sm:items-center"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
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
              className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground shadow-apple-button transition-colors hover:bg-secondary hover:text-foreground"
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
          {/* Extension Info */}
          <Card className="border border-border/70 bg-secondary/40 shadow-apple">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="text-sm space-y-1 min-w-0">
                  {extensionInfo.name && (
                    <p className="break-words font-medium text-foreground">
                      {extensionInfo.name}
                    </p>
                  )}
                  {extensionInfo.version &&
                    extensionInfo.version !== "Unknown" && (
                      <p className="text-muted-foreground">
                        版本: {extensionInfo.version}
                      </p>
                    )}
                  {extensionInfo.description && (
                    <p className="break-words text-muted-foreground">
                      描述：{extensionInfo.description}
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    ID: {extensionInfo.id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Buttons */}
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
        <Card className="border border-border/70 bg-secondary/40 shadow-apple">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-3">
              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-foreground font-medium">
                  {downloadProgress.status === "downloading" && "下载中..."}
                  {downloadProgress.status === "converting" && "转换中..."}
                  {downloadProgress.status === "completed" && "下载完成"}
                  {downloadProgress.status === "error" && "下载出错"}
                </span>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {downloadProgress.totalBytes > 0
                      ? `${(downloadProgress.bytesDownloaded / 1024 / 1024).toFixed(1)} / ${(downloadProgress.totalBytes / 1024 / 1024).toFixed(1)} MB`
                      : `${Math.round(downloadProgress.progress)}%`}
                  </span>
                  {(downloadProgress.status === "downloading" ||
                    downloadProgress.status === "converting") && (
                    <button
                      type="button"
                      onClick={cancelDownload}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="取消下载"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${downloadProgress.progress}%` }}
                />
              </div>
              {downloadProgress.error && (
                <p className="text-xs text-destructive">
                  {downloadProgress.error}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
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
  );
}
