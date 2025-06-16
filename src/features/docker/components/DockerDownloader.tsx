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
import { Download, Container } from "lucide-react";
import { useDockerDownloader } from "../hooks/useDockerDownloader";

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

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Docker 镜像名称或 URL
          </label>
          <Input
            placeholder="请输入 Docker 镜像名称，如：nginx:latest 或 hub.docker.com/r/library/nginx"
            value={imageUrl}
            onChange={onImageUrlChange}
            onDoubleClick={handleInputDoubleClick}
            className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            支持格式：nginx:latest, library/nginx:latest, hub.docker.com/r/library/nginx
          </div>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              解析中...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Container className="h-4 w-4" />
              解析镜像信息
            </span>
          )}
        </Button>
      </div>

      {tagList.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            选择标签
          </label>
          <Select
            value={imageInfo?.tag || ""}
            onValueChange={onTagChange}
          >
            <SelectTrigger className="w-full border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <SelectValue placeholder="选择标签" />
            </SelectTrigger>
            <SelectContent>
              {tagList.map((tag) => (
                <SelectItem
                  key={tag}
                  value={tag}
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {imageInfo?.tag && (
        <div className="space-y-4">
          <Card className="border border-green-100 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
            <CardContent className="p-4">
              <div className="text-sm space-y-1">
                <div><span className="font-medium">镜像仓库:</span> {imageInfo.registry}</div>
                <div><span className="font-medium">命名空间:</span> {imageInfo.namespace || 'library'}</div>
                <div><span className="font-medium">仓库名称:</span> {imageInfo.repository}</div>
                <div><span className="font-medium">标签:</span> {imageInfo.tag}</div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="button"
            onClick={onDownload}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 transition-colors duration-200"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
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
        <Card className="border border-blue-100 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>下载进度</span>
                <span>{downloadProgress.layerIndex}/{downloadProgress.totalLayers} 层</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${downloadProgress.totalLayers > 0 ? 
                      (downloadProgress.layerIndex / downloadProgress.totalLayers) * 100 : 0}%`
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                状态: {downloadProgress.status === 'downloading' ? '下载中' : 
                       downloadProgress.status === 'completed' ? '完成' : '错误'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {downloadUrl && (
        <Card className="border border-green-100 bg-green-50 dark:bg-green-900/20 dark:border-green-800 transition-all duration-200 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Download className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                下载链接
              </span>
            </div>
            <a
              href={downloadUrl}
              download={imageInfo ? `${imageInfo.repository}-${imageInfo.tag}.tar` : 'docker-image.tar'}
              className="block text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:underline break-all transition-colors duration-200"
            >
              {imageInfo?.repository}-{imageInfo?.tag}.tar
            </a>
          </CardContent>
        </Card>
      )}
    </form>
  );
}