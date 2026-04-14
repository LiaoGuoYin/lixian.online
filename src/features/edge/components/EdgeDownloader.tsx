import { InputWithHistory } from "@/shared/ui/input-with-history";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/hooks/useToast";
import { useHistory } from "@/hooks/useHistory";
import { Card, CardContent } from "@/shared/ui/card";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import {
  Download,
  ExternalLink,
  FileArchive,
  Loader2,
  Package,
  Search,
  Star,
  X,
} from "lucide-react";
import { useEdgeDownloader } from "@/features/edge/hooks/useEdgeDownloader";

interface Props {
  defaultValue?: string;
  onQueryChange?: (q: string) => void;
}

export default function EdgeDownloader({ defaultValue, onQueryChange }: Props) {
  const { toast } = useToast();
  const history = useHistory("history:edge");
  const {
    extensionQuery,
    extensionInfo,
    downloadProgress,
    downloadUrls,
    loading,
    searchResults,
    searching,
    onQueryChange: onInputChange,
    selectSearchResult,
    handleSubmit,
    handleDownload,
    cancelDownload,
  } = useEdgeDownloader(defaultValue);

  const onSubmit = async (e: React.FormEvent) => {
    try {
      await handleSubmit(e);
      history.add(extensionQuery);
      onQueryChange?.(extensionQuery);
      toast({
        title: "解析成功",
        description: "已解析 Edge 扩展信息",
      });
    } catch (error) {
      toast({
        title: "解析失败",
        description:
          error instanceof Error
            ? error.message
            : "扩展 ID、ProductId 或商店链接无效",
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

  const description =
    extensionInfo?.shortDescription || extensionInfo?.description || "";

  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          输入名称搜索，或直接粘贴 ID、ProductId、商店链接，或前往{" "}
          <a
            href="https://microsoftedge.microsoft.com/addons/Microsoft-Edge-Extensions-Home"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            Edge Add-ons
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>

        <InputWithHistory
          data-testid="edge-input"
          placeholder="扩展名称、ID、ProductId 或商店链接"
          value={extensionQuery}
          onChange={onInputChange}
          history={history.items}
          onSelectHistory={(value) =>
            onInputChange({
              target: { value },
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
                onClick={() => selectSearchResult(result)}
                className="flex w-full items-start gap-2.5 rounded-apple-sm px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
              >
                <Search className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium sm:truncate">
                    {result.name}
                  </p>
                  {result.developer && (
                    <p className="text-xs text-muted-foreground">
                      {result.developer}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-1 flex flex-wrap gap-2">
          {[
            {
              label: "uBlock Origin Lite",
              value: "cimighlppcgcoapaliogpjjdehbnofhn",
            },
            {
              label: "沉浸式翻译",
              value: "amkbmndfnliijdhojkpoglbnaaahippg",
            },
          ].map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() =>
                onInputChange({
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
        data-testid="edge-submit"
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
          <Card className="border border-border/70 bg-secondary/40 shadow-apple">
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-2 text-sm">
                {extensionInfo.name && (
                  <p className="break-words font-medium text-foreground">
                    {extensionInfo.name}
                  </p>
                )}
                {extensionInfo.developer && (
                  <p className="text-muted-foreground">
                    开发者: {extensionInfo.developer}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  {extensionInfo.version && <span>版本: {extensionInfo.version}</span>}
                  {extensionInfo.category && <span>分类: {extensionInfo.category}</span>}
                  {typeof extensionInfo.rating === "number" && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {extensionInfo.rating.toFixed(1)}
                      {typeof extensionInfo.ratingCount === "number" &&
                        ` (${extensionInfo.ratingCount})`}
                    </span>
                  )}
                </div>
                {description && (
                  <p className="break-words text-muted-foreground">
                    描述：{description}
                  </p>
                )}
                <p className="text-muted-foreground">ID: {extensionInfo.id}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <Button
              type="button"
              onClick={() => onDownload("crx")}
              disabled={loading}
              variant="outline"
              className="gap-1.5"
              data-testid="edge-download-crx"
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
              data-testid="edge-download-zip"
            >
              <FileArchive className="h-4 w-4" />
              ZIP
            </Button>
            <Button
              type="button"
              onClick={() => onDownload("both")}
              disabled={loading}
              className="gap-1.5"
              data-testid="edge-download-both"
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
                <span className="font-medium text-foreground">
                  {downloadProgress.status === "downloading" && "下载中..."}
                  {downloadProgress.status === "converting" && "转换中..."}
                  {downloadProgress.status === "completed" && "下载完成"}
                  {downloadProgress.status === "error" && "下载出错"}
                </span>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {downloadProgress.totalBytes > 0
                      ? `${(downloadProgress.bytesDownloaded / 1024 / 1024).toFixed(1)} / ${(downloadProgress.totalBytes / 1024 / 1024).toFixed(1)} MB`
                      : `${Math.round(downloadProgress.progress)}%`}
                  </span>
                  {(downloadProgress.status === "downloading" ||
                    downloadProgress.status === "converting") && (
                    <button
                      type="button"
                      onClick={cancelDownload}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      title="取消下载"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
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
        <Card className="border border-primary/30 bg-primary/5 shadow-apple">
          <CardContent className="space-y-3 p-4 sm:p-5">
            {downloadUrls.crx && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-apple-sm bg-primary/10">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="break-all text-sm font-medium text-foreground sm:truncate">
                      {extensionInfo?.id}.crx
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Edge 原生扩展格式
                    </p>
                  </div>
                </div>
                <a
                  href={downloadUrls.crx}
                  download={`${extensionInfo?.id}.crx`}
                  className="w-full flex-shrink-0 sm:w-auto"
                  data-testid="edge-download-crx-link"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 sm:w-auto"
                  >
                    <Download className="h-3.5 w-3.5" />
                    下载
                  </Button>
                </a>
              </div>
            )}

            {downloadUrls.crx && downloadUrls.zip && (
              <div className="border-t border-border/40" />
            )}

            {downloadUrls.zip && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-apple-sm bg-primary/10">
                    <FileArchive className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="break-all text-sm font-medium text-foreground sm:truncate">
                      {extensionInfo?.id}.zip
                    </p>
                    <p className="text-xs text-muted-foreground">
                      解压后可查看源码
                    </p>
                  </div>
                </div>
                <a
                  href={downloadUrls.zip}
                  download={`${extensionInfo?.id}.zip`}
                  className="w-full flex-shrink-0 sm:w-auto"
                  data-testid="edge-download-zip-link"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 sm:w-auto"
                  >
                    <Download className="h-3.5 w-3.5" />
                    下载
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </form>
  );
}
