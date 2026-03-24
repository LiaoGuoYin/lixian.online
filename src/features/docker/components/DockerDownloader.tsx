import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent } from "@/shared/ui/card";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import { Download, Container, Info, Archive, ExternalLink, Search, Star } from "lucide-react";
import { useDockerDownloader } from "../hooks/useDockerDownloader";
import { dockerService } from "../api/DockerService";

export default function DockerDownloader() {
  const { toast } = useToast();
  const {
    imageUrl,
    tagList,
    imageInfo,
    downloadProgress,
    downloadUrl,
    loading,
    onImageUrlChange,
    onTagChange,
    handleSubmit,
    handleDownload,
    handlePasteFromClipboard,
    searchResults,
  } = useDockerDownloader();

  const onSubmit = async (e: React.FormEvent) => {
    try {
      await handleSubmit(e);
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

  const handleInputDoubleClick = async () => {
    const success = await handlePasteFromClipboard();
    if (success) {
      toast({
        title: "解析成功",
        description: "已自动粘贴并解析镜像信息，选中可用标签",
      });
    } else {
      toast({
        title: "粘贴失败",
        description: "剪切板中没有有效的 Docker 镜像名称或 URL",
        variant: "destructive",
      });
    }
  };

  const progressPercent = downloadProgress && downloadProgress.totalLayers > 0
    ? (downloadProgress.layerIndex / downloadProgress.totalLayers) * 100
    : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Docker 镜像名称或 URL
        </label>
        <Input
          placeholder="nginx:latest 或 hub.docker.com/r/library/nginx"
          value={imageUrl}
          onChange={onImageUrlChange}
          onDoubleClick={handleInputDoubleClick}
        />
        <p className="text-xs text-muted-foreground">
          支持 nginx:latest、library/nginx:latest、Docker Hub URL · <span className="text-primary">双击输入框可自动粘贴</span>
        </p>
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

      {searchResults.length > 0 && (
        <Card className="border border-border/60 bg-secondary/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">你是否在找：</p>
            </div>
            <div className="space-y-2">
              {searchResults.map((result) => {
                const parts = result.repo_name.split('/');
                const namespace = parts.length > 1 ? parts[0] : 'library';
                const repo = parts.length > 1 ? parts[1] : parts[0];
                const hubUrl = namespace === 'library'
                  ? `https://hub.docker.com/_/${repo}`
                  : `https://hub.docker.com/r/${namespace}/${repo}`;
                return (
                  <div key={result.repo_name} className="flex items-center justify-between gap-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{result.repo_name}</p>
                        {result.is_official && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">官方</span>
                        )}
                        {result.star_count > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                            <Star className="h-3 w-3" />
                            {result.star_count}
                          </span>
                        )}
                      </div>
                      {result.short_description && (
                        <p className="text-xs text-muted-foreground truncate">{result.short_description}</p>
                      )}
                    </div>
                    <a href={hubUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs">
                        <ExternalLink className="h-3 w-3" />
                        Docker Hub
                      </Button>
                    </a>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {tagList.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            选择标签
          </label>
          <Select
            value={imageInfo?.tag || ""}
            onValueChange={onTagChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择标签" />
            </SelectTrigger>
            <SelectContent>
              {tagList.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {imageInfo?.tag && (
        <div className="space-y-4">
          {/* Image Info */}
          <Card className="border border-border/60 bg-secondary/30">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-apple-sm bg-primary/10 flex items-center justify-center mt-0.5">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm space-y-1 min-w-0">
                  <p className="font-medium text-foreground">{imageInfo.repository}</p>
                  <p className="text-muted-foreground">仓库: {imageInfo.registry}</p>
                  <p className="text-muted-foreground">命名空间: {imageInfo.namespace || 'library'}</p>
                  <p className="text-muted-foreground">标签: {imageInfo.tag}</p>
                  <a
                    href={dockerService.getDockerHubUrl(imageInfo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    在 Docker Hub 查看
                  </a>
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
          <CardContent className="p-5">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">
                  {downloadProgress.status === 'downloading' ? '下载中...' :
                   downloadProgress.status === 'completed' ? '下载完成' : '下载出错'}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {downloadProgress.layerIndex}/{downloadProgress.totalLayers} 层
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
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-9 h-9 rounded-apple-sm bg-primary/10 flex items-center justify-center">
                  <Archive className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {imageInfo?.repository}-{imageInfo?.tag}.tar
                  </p>
                  <p className="text-xs text-muted-foreground">docker load 导入</p>
                </div>
              </div>
              <a
                href={downloadUrl}
                download={imageInfo ? `${imageInfo.repository}-${imageInfo.tag}.tar` : 'docker-image.tar'}
                className="flex-shrink-0"
              >
                <Button type="button" size="sm" variant="outline" className="gap-1.5">
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
