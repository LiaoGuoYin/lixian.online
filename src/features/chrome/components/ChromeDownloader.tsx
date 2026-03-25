import { InputWithHistory } from "@/shared/ui/input-with-history";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/hooks/useToast";
import { useHistory } from "@/hooks/useHistory";
import { Card, CardContent } from "@/shared/ui/card";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import {
  Download,
  Globe,
  FileArchive,
  Package,
  Info,
  Search,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useChromeDownloader } from "../hooks/useChromeDownloader";

export default function ChromeDownloader() {
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
  } = useChromeDownloader();

  const onSubmit = async (e: React.FormEvent) => {
    try {
      await handleSubmit(e);
      history.add(extensionUrl);
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
          <div className="rounded-apple border border-border bg-popover p-1 space-y-0.5">
            {searchResults.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => {
                  selectSearchResult(result);
                }}
                className="flex w-full items-center gap-2.5 rounded-apple-sm px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{result.name}</span>
                <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                  {result.id.slice(0, 8)}…
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-1">
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
              className="text-xs px-2.5 py-1 rounded-full bg-secondary/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              试试 {example.label}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner />
            解析中...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Globe className="h-4 w-4" />
            解析扩展信息
          </span>
        )}
      </Button>

      {extensionInfo && (
        <div className="space-y-4">
          {/* Extension Info */}
          <Card className="border border-border/60 bg-secondary/30">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-apple-sm bg-primary/10 flex items-center justify-center mt-0.5">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm space-y-1 min-w-0">
                  <p className="font-medium text-foreground">
                    {extensionInfo.name || "未知扩展"}
                  </p>
                  <p className="text-muted-foreground">
                    ID: {extensionInfo.id}
                  </p>
                  {extensionInfo.version && (
                    <p className="text-muted-foreground">
                      版本: {extensionInfo.version}
                    </p>
                  )}
                  {extensionInfo.description && (
                    <p className="text-muted-foreground line-clamp-2">
                      {extensionInfo.description}
                    </p>
                  )}
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
            >
              <FileArchive className="h-4 w-4" />
              ZIP
            </Button>
            <Button
              type="button"
              onClick={() => onDownload("both")}
              disabled={loading}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              全部下载
            </Button>
          </div>
        </div>
      )}

      {downloadProgress && (
        <Card className="border border-border/60 bg-secondary/30">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">
                  {downloadProgress.status === "downloading" && "下载中..."}
                  {downloadProgress.status === "converting" && "转换中..."}
                  {downloadProgress.status === "completed" && "下载完成"}
                  {downloadProgress.status === "error" && "下载出错"}
                </span>
                <span className="text-muted-foreground">
                  {Math.round(downloadProgress.progress)}%
                </span>
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
        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="p-4 sm:p-5 space-y-3">
            {downloadUrls.crx && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-9 h-9 rounded-apple-sm bg-primary/10 flex items-center justify-center">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {extensionInfo?.id}.crx
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Chrome 原生扩展格式
                    </p>
                  </div>
                </div>
                <a
                  href={downloadUrls.crx}
                  download={`${extensionInfo?.id}.crx`}
                  className="flex-shrink-0 self-end sm:self-auto"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-9 h-9 rounded-apple-sm bg-primary/10 flex items-center justify-center">
                    <FileArchive className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
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
                  className="flex-shrink-0 self-end sm:self-auto"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
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
