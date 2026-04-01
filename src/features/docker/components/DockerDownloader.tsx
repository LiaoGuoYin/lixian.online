import { InputWithHistory } from "@/shared/ui/input-with-history";
import { Button } from "@/shared/ui/button";
import { SearchableSelect } from "@/shared/ui/searchable-select";
import { useToast } from "@/hooks/useToast";
import { useHistory } from "@/hooks/useHistory";
import { Card, CardContent } from "@/shared/ui/card";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import {
  Download,
  Container,
  Info,
  Archive,
  Search,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useDockerDownloader } from "../hooks/useDockerDownloader";
import { dockerService } from "../api/DockerService";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function DockerDownloader() {
  const { toast } = useToast();
  const history = useHistory("history:docker");
  const {
    imageUrl,
    tagList,
    imageInfo,
    downloadProgress,
    downloadUrl,
    loading,
    manifest,
    manifestLoading,
    imageNotFound,
    searchCandidates,
    onImageUrlChange,
    onTagChange,
    handleSubmit,
    handleDownload,
  } = useDockerDownloader();

  const onSubmit = async (e: React.FormEvent) => {
    try {
      await handleSubmit(e);
      history.add(imageUrl);
      toast({
        title: "解析成功",
        description: "已解析镜像信息",
      });
    } catch (error) {
      toast({
        title: "解析失败",
        description: error instanceof Error ? error.message : "镜像名称有误",
        variant: "destructive",
      });
    }
  };

  const onDownload = async () => {
    try {
      await handleDownload();
      toast({
        title: "准备下载",
        description: "打包完成，开始下载",
      });
    } catch (error) {
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "下载出错",
        variant: "destructive",
      });
    }
  };

  const progressPercent =
    downloadProgress && downloadProgress.totalSize > 0
      ? ((downloadProgress.downloadedSize + downloadProgress.currentLayerDownloaded) / downloadProgress.totalSize) * 100
      : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          输入镜像名，或前往{" "}
          <a
            href="https://hub.docker.com/search"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            Docker Hub
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
        <InputWithHistory
          data-testid="docker-input"
          placeholder="nginx:latest 或 hub.docker.com/r/library/nginx"
          value={imageUrl}
          onChange={onImageUrlChange}
          history={history.items}
          onSelectHistory={(v) =>
            onImageUrlChange({
              target: { value: v },
            } as React.ChangeEvent<HTMLInputElement>)
          }
        />
        <div className="flex flex-wrap gap-2 mt-1">
          {[
            { label: "Nginx", value: "nginx:latest" },
            { label: "Redis", value: "redis:alpine" },
          ].map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() =>
                onImageUrlChange({
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

      <Button
        type="submit"
        disabled={loading}
        className="w-full"
        data-testid="docker-submit"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner />
            解析中...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Container className="h-4 w-4" />
            解析镜像信息
          </span>
        )}
      </Button>

      {tagList.length > 0 && (
        <SearchableSelect
          value={imageInfo?.tag || ""}
          options={tagList}
          placeholder="选择标签"
          onValueChange={onTagChange}
        />
      )}

      {imageNotFound && imageInfo && (
        <Card className="border border-destructive/30 bg-destructive/5">
          <CardContent className="p-5 space-y-3">
            <div className="text-sm text-destructive font-medium">
              未找到对应镜像：{imageInfo.namespace || "library"}/
              {imageInfo.repository}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <a
                href={dockerService.getDockerHubSearchUrl(
                  imageInfo.repository || imageUrl,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Search className="h-3.5 w-3.5" />
                前往 DockerHub 搜索
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a
                href={dockerService.getDockerHubRepoUrl(
                  imageInfo.namespace || "library",
                  imageInfo.repository,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                预览当前仓库页
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            {searchCandidates.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  候选镜像（Top {searchCandidates.length}）
                </p>
                <div className="space-y-2">
                  {searchCandidates.map((candidate) => (
                    <a
                      key={`${candidate.namespace}/${candidate.repository}`}
                      href={dockerService.getDockerHubRepoUrl(
                        candidate.namespace,
                        candidate.repository,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-md border border-border/60 p-3 hover:bg-secondary/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {candidate.namespace}/{candidate.repository}
                          </p>
                          {candidate.shortDescription && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {candidate.shortDescription}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tagList.length > 0 && imageInfo?.tag && (
        <div className="space-y-4">
          {/* Image Info */}
          <Card className="border border-border/60 bg-secondary/30">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-apple-sm bg-primary/10 flex items-center justify-center mt-0.5">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm space-y-1 min-w-0">
                  <p className="font-medium text-foreground">
                    {imageInfo.repository}
                  </p>
                  <p className="text-muted-foreground">
                    仓库: {imageInfo.registry}
                  </p>
                  <p className="text-muted-foreground">
                    命名空间: {imageInfo.namespace || "library"}
                  </p>
                  <p className="text-muted-foreground">标签: {imageInfo.tag}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Layer sizes */}
          {manifestLoading && (
            <Card className="border border-border/60 bg-secondary/30">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoadingSpinner />
                  获取层信息...
                </div>
              </CardContent>
            </Card>
          )}
          {manifest && manifest.layers.length > 0 && (
            <Card className="border border-border/60 bg-secondary/30">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Layers className="h-4 w-4 text-primary" />
                  镜像层（{manifest.layers.length} 层）
                </div>
                <div className="space-y-1.5">
                  {manifest.layers.map((layer, i) => (
                    <div
                      key={layer.digest}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span className="font-mono truncate mr-3">
                        {i + 1}. {layer.digest.slice(7, 19)}...
                      </span>
                      <span className="tabular-nums flex-shrink-0">
                        {formatBytes(layer.size)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-medium text-foreground border-t border-border/60 pt-2">
                  <span>总计（压缩）</span>
                  <span className="tabular-nums">
                    {formatBytes(
                      manifest.layers.reduce((s, l) => s + l.size, 0)
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            type="button"
            onClick={onDownload}
            disabled={loading}
            className="w-full"
            data-testid="docker-download"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                打包中...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                下载 Docker 镜像
              </span>
            )}
          </Button>
        </div>
      )}

      {downloadProgress && (
        <Card className="border border-border/60 bg-secondary/30">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">
                  {downloadProgress.status === "downloading"
                    ? `下载中... 第 ${downloadProgress.layerIndex}/${downloadProgress.totalLayers} 层`
                    : downloadProgress.status === "packing"
                      ? "打包中..."
                      : downloadProgress.status === "completed"
                        ? "下载完成"
                        : "下载出错"}
                </span>
                {downloadProgress.status === "downloading" && downloadProgress.totalSize > 0 && (
                  <span className="text-muted-foreground tabular-nums">
                    {formatBytes(downloadProgress.downloadedSize + downloadProgress.currentLayerDownloaded)} / {formatBytes(downloadProgress.totalSize)}
                  </span>
                )}
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              {downloadProgress.status === "downloading" && downloadProgress.currentLayerSize > 0 && (
                <div className="text-xs text-muted-foreground tabular-nums">
                  当前层: {formatBytes(downloadProgress.currentLayerDownloaded)} / {formatBytes(downloadProgress.currentLayerSize)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {downloadUrl && (
        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-9 h-9 rounded-apple-sm bg-primary/10 flex items-center justify-center">
                  <Archive className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {imageInfo?.repository}-{imageInfo?.tag}.tar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    docker load 导入
                  </p>
                </div>
              </div>
              <a
                href={downloadUrl}
                download={
                  imageInfo
                    ? `${imageInfo.repository}-${imageInfo.tag}.tar`
                    : "docker-image.tar"
                }
                className="flex-shrink-0 self-end sm:self-auto"
                data-testid="docker-download-link"
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
          </CardContent>
        </Card>
      )}
    </form>
  );
}
