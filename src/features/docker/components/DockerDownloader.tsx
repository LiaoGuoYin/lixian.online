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
} from "lucide-react";
import { useDockerDownloader } from "../hooks/useDockerDownloader";
import { dockerService } from "../api/DockerService";

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
        description: "成功解析 Docker 镜像信息",
      });
    } catch (error) {
      toast({
        title: "解析失败",
        description:
          error instanceof Error ? error.message : "请检查镜像名称是否正确",
        variant: "destructive",
      });
    }
  };

  const onDownload = async () => {
    try {
      await handleDownload();
      toast({
        title: "准备下载",
        description: "Docker 镜像打包完成，开始下载",
      });
    } catch (error) {
      toast({
        title: "下载失败",
        description:
          error instanceof Error ? error.message : "下载过程中发生错误",
        variant: "destructive",
      });
    }
  };

  const progressPercent =
    downloadProgress && downloadProgress.totalLayers > 0
      ? (downloadProgress.layerIndex / downloadProgress.totalLayers) * 100
      : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-3">
        <InputWithHistory
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
        <p className="text-xs text-muted-foreground">
          输入镜像名称，如 nginx:latest，可前往{" "}
          <a
            href="https://hub.docker.com/search"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            Docker Hub
            <ExternalLink className="h-3 w-3" />
          </a>{" "}
          搜索所需镜像（需魔法上网）
        </p>
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

      <Button type="submit" disabled={loading} className="w-full">
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
                前往 Docker Hub 搜索
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

          <Button
            type="button"
            onClick={onDownload}
            disabled={loading}
            className="w-full"
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
                    ? "下载中..."
                    : downloadProgress.status === "completed"
                      ? "下载完成"
                      : "下载出错"}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {downloadProgress.layerIndex}/{downloadProgress.totalLayers}{" "}
                  层
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
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
