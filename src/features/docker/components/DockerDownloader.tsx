import { InputWithHistory } from "@/shared/ui/input-with-history";
import { Button } from "@/shared/ui/button";
import { SearchableSelect } from "@/shared/ui/searchable-select";
import { useToast } from "@/hooks/useToast";
import { useHistory } from "@/hooks/useHistory";
import { DownloadResultCard } from "@/shared/ui/download-result-card";
import { FeatureWorkspace } from "@/shared/ui/feature-workspace";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import { ProgressCard } from "@/shared/ui/progress-card";
import { buildAgentPayload, buildAgentPrompt } from "@/shared/lib/agent-prompts";
import { formatCompactNumber } from "@/shared/lib/format";
import { DockerIcon } from "@/shared/ui/icons";
import {
  Download,
  Archive,
  Search,
  ExternalLink,
  Cpu,
  HardDrive,
  Package,
  BadgeCheck,
  Bot,
  Star,
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
  agentPanelVisible?: boolean;
}

export default function DockerDownloader({
  defaultValue,
  onQueryChange,
  agentPanelVisible,
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
    selectSearchCandidate,
    onTagChange,
    onPlatformChange,
    handleSubmit,
    handleDownload,
  } = useDockerDownloader(defaultValue);
  const agentPrompt = buildAgentPrompt({
    tool: "docker",
    label: "Docker 镜像",
    query: imageUrl,
  });
  const agentInputReady = Boolean(imageUrl.trim());

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
    <FeatureWorkspace
      humanGuide={{
        sourceLabel: "Docker Hub",
        sourceUrl: "https://hub.docker.com/search",
        inputLabel: "Image ref / Docker Hub URL",
        detail:
          "解析镜像标签和平台，将层数据打成 docker load 可导入的 TAR。",
      }}
      agentPrompt={agentPrompt}
      agentPayload={buildAgentPayload("docker", imageUrl)}
      agentInputReady={agentInputReady}
      agentInputHint="镜像名、tag 或 Docker Hub URL"
      agentPanelVisible={agentPanelVisible}
    >
      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Image ref / Docker Hub URL</span>
            <a
              href="https://hub.docker.com/search"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Docker Hub
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <InputWithHistory
            data-testid="docker-input"
            placeholder="镜像名或 Docker Hub 仓库链接"
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
              { label: "Kafka", value: "apache/kafka" },
            ].map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() =>
                  onImageUrlChange({
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
        <div className="rounded-apple-sm border border-border/60 bg-background/70 p-3 shadow-apple-button sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
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
                  <p className="text-xs font-medium text-muted-foreground">
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
        <DownloadResultCard
          title={`未找到对应镜像：${imageInfo.namespace || "library"}/${
            imageInfo.repository
          }`}
          eyebrow="Docker"
          description={
            <p>
              Docker 镜像不能按关键词直接解析。当前输入已按{" "}
              <span className="font-mono">
                {imageInfo.namespace || "library"}/{imageInfo.repository}
              </span>{" "}
              查找；如果你要找社区镜像，请从候选项选择，或输入类似{" "}
              <span className="font-mono">apache/kafka</span> 的完整名称。
            </p>
          }
          className="border-destructive/30 bg-destructive/5"
          footer={
            <div className="space-y-3">
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
                      <div
                        key={`${candidate.namespace}/${candidate.repository}`}
                        className="rounded-apple-sm border border-border/60 bg-background/70 p-3 transition-colors hover:bg-secondary/60"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-apple-sm border border-border/60 bg-card">
                              <DockerIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="break-all text-sm font-medium text-foreground sm:truncate">
                                {candidate.namespace}/{candidate.repository}
                              </p>
                              {candidate.shortDescription && (
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                  {candidate.shortDescription}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                {candidate.isOfficial && (
                                  <span className="inline-flex items-center gap-1 text-primary">
                                    <BadgeCheck className="h-3 w-3" />
                                    Official
                                  </span>
                                )}
                                {candidate.isAutomated && (
                                  <span className="inline-flex items-center gap-1">
                                    <Bot className="h-3 w-3" />
                                    Automated
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  {formatCompactNumber(candidate.starCount)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Download className="h-3 w-3" />
                                  {formatCompactNumber(candidate.pullCount)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => selectSearchCandidate(candidate)}
                              data-testid={`docker-candidate-${candidate.namespace}-${candidate.repository}`}
                            >
                              选择
                            </Button>
                            <a
                              href={dockerService.getDockerHubRepoUrl(
                                candidate.namespace,
                                candidate.repository,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-apple-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                              aria-label={`打开 ${candidate.namespace}/${candidate.repository} 的 Docker Hub 页面`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          }
        />
      )}

      {tagList.length > 0 && imageInfo?.tag && (
        <div className="space-y-4">
          {/* Layer sizes */}
          {manifestLoading && (
            <div className="rounded-apple-sm border border-border/70 bg-card/95 p-4 shadow-apple sm:p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoadingSpinner />
                获取层信息...
              </div>
            </div>
          )}
          {manifest && manifest.layers.length > 0 && (
            <DownloadResultCard
              title={`镜像层（${manifest.layers.length} 层）`}
              eyebrow="Manifest"
              metadata={[
                {
                  icon: Package,
                  label: "镜像",
                  value: `${imageInfo.namespace || "library"}/${
                    imageInfo.repository
                  }:${imageInfo.tag}`,
                },
                {
                  icon: Cpu,
                  label: "平台",
                  value: selectedPlatform || "single-arch",
                },
                {
                  icon: HardDrive,
                  label: "总计（压缩）",
                  value: formatBytes(
                    manifest.layers.reduce((s, l) => s + l.size, 0),
                  ),
                },
              ]}
              footer={
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
              }
            />
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
        <ProgressCard
          title={
            downloadProgress.status === "downloading"
              ? `下载中... 第 ${downloadProgress.layerIndex}/${downloadProgress.totalLayers} 层`
              : downloadProgress.status === "packing"
                ? "打包中..."
                : "下载出错"
          }
          value={
            downloadProgress.status === "downloading" &&
            downloadProgress.totalSize > 0
              ? `${formatBytes(
                  downloadProgress.downloadedSize +
                    downloadProgress.currentLayerDownloaded,
                )} / ${formatBytes(downloadProgress.totalSize)}`
              : undefined
          }
          progress={progressPercent}
          detail={
            downloadProgress.status === "downloading" &&
            downloadProgress.currentLayerSize > 0
              ? `当前层: ${formatBytes(
                  downloadProgress.currentLayerDownloaded,
                )} / ${formatBytes(downloadProgress.currentLayerSize)}`
              : undefined
          }
        />
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
    </FeatureWorkspace>
  );
}
