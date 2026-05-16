import { InputWithHistory } from "@/shared/ui/input-with-history";
import { Button } from "@/shared/ui/button";
import { SearchableSelect } from "@/shared/ui/searchable-select";
import { useToast } from "@/hooks/useToast";
import { useHistory } from "@/hooks/useHistory";
import { Card, CardContent } from "@/shared/ui/card";
import { DownloadResultCard } from "@/shared/ui/download-result-card";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import {
  Download,
  Archive,
  Search,
  ExternalLink,
  Layers,
  Cpu,
} from "lucide-react";
import { useDockerDownloader } from "../hooks/useDockerDownloader";
import { dockerService } from "../api/DockerService";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

interface Props {
  defaultValue?: string;
  onQueryChange?: (q: string) => void;
}

export default function DockerDownloader({
  defaultValue,
  onQueryChange,
}: Props) {
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
    availablePlatforms,
    selectedPlatform,
    onImageUrlChange,
    onTagChange,
    onPlatformChange,
    handleSubmit,
    handleDownload,
  } = useDockerDownloader(defaultValue);

  const onSubmit = async (e: React.FormEvent) => {
    try {
      await handleSubmit(e);
      history.add(imageUrl);
      onQueryChange?.(imageUrl);
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
      ? ((downloadProgress.downloadedSize +
          downloadProgress.currentLayerDownloaded) /
          downloadProgress.totalSize) *
        100
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
        <div className="mt-1 flex flex-wrap gap-2">
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
        data-testid="docker-submit"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner />
            解析中...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            解析镜像信息
          </span>
        )}
      </Button>

      {tagList.length > 0 && (
        <div className="rounded-apple-lg border border-border/60 bg-background/70 p-3 shadow-apple-button sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground/80">
                选择版本
              </p>
              <SearchableSelect
                value={imageInfo?.tag || ""}
                options={tagList}
                placeholder="选择版本"
                onValueChange={onTagChange}
              />
            </div>
            {availablePlatforms.length > 0 && (
              <div className="min-w-0 sm:w-48">
                <div className="mb-2 flex items-center gap-1">
                  <Cpu className="h-3 w-3 text-muted-foreground/80" />
                  <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground/80">
                    架构
                  </p>
                </div>
                <SearchableSelect
                  value={selectedPlatform}
                  options={availablePlatforms.map(p =>
                    p.variant ? `${p.os}/${p.architecture}/${p.variant}` : `${p.os}/${p.architecture}`
                  )}
                  placeholder="选择架构"
                  onValueChange={onPlatformChange}
                />
              </div>
            )}
          </div>
        </div>
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
                      <div className="flex items-start justify-between gap-3 sm:items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground break-all sm:truncate">
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
          {/* Layer sizes */}
          {manifestLoading && (
            <Card className="border border-border/70 bg-secondary/40 shadow-apple">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoadingSpinner />
                  获取层信息...
                </div>
              </CardContent>
            </Card>
          )}
          {manifest && manifest.layers.length > 0 && (
            <Card className="border border-border/70 bg-secondary/40 shadow-apple">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Layers className="h-4 w-4 text-primary" />
                  镜像层（{manifest.layers.length} 层）
                </div>
                <div className="space-y-1.5">
                  {manifest.layers.map((layer, i) => (
                    <div
                      key={layer.digest}
                      className="flex items-start justify-between gap-3 text-xs text-muted-foreground sm:items-center"
                    >
                      <span className="mr-3 min-w-0 break-all font-mono sm:truncate">
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
                      manifest.layers.reduce((s, l) => s + l.size, 0),
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
                一键打包
              </span>
            )}
          </Button>
        </div>
      )}

      {downloadProgress && downloadProgress.status !== "completed" && (
        <Card className="border border-border/70 bg-secondary/40 shadow-apple">
          <CardContent className="p-4 sm:p-5">
            <div className="space-y-3">
              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-foreground font-medium">
                  {downloadProgress.status === "downloading"
                    ? `下载中... 第 ${downloadProgress.layerIndex}/${downloadProgress.totalLayers} 层`
                    : downloadProgress.status === "packing"
                      ? "打包中..."
                      : "下载出错"}
                </span>
                {downloadProgress.status === "downloading" &&
                  downloadProgress.totalSize > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums sm:text-sm">
                      {formatBytes(
                        downloadProgress.downloadedSize +
                          downloadProgress.currentLayerDownloaded,
                      )}{" "}
                      / {formatBytes(downloadProgress.totalSize)}
                    </span>
                  )}
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              {downloadProgress.status === "downloading" &&
                downloadProgress.currentLayerSize > 0 && (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    当前层:{" "}
                    {formatBytes(downloadProgress.currentLayerDownloaded)} /{" "}
                    {formatBytes(downloadProgress.currentLayerSize)}
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      )}

      {downloadProgress?.status === "completed" &&
        downloadUrl &&
        (() => {
          const filename = imageInfo
            ? dockerService.getDownloadFilename(
                imageInfo,
                selectedPlatform?.split("/")?.[1],
              )
            : "docker-image.tar";
          return (
            <DownloadResultCard
              rows={[
                {
                  icon: Archive,
                  title: filename,
                  description: "docker load 导入",
                  href: downloadUrl,
                  download: filename,
                  testId: "docker-download-link",
                },
              ]}
            />
          );
        })()}
    </form>
  );
}
