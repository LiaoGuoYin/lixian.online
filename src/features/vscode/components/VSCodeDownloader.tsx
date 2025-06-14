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
import { Download, Link as LinkIcon } from "lucide-react";
import { useVSCodeDownloader } from "../hooks/useVSCodeDownloader";

export default function VSCodeDownloader() {
  const { toast } = useToast();
  const {
    url,
    versionList,
    extensionInfo,
    downloadUrl,
    loading,
    onUrlChange,
    onVersionChange,
    handleSubmit,
  } = useVSCodeDownloader();

  const onSubmit = async (e: React.FormEvent) => {
    try {
      await handleSubmit(e);
      toast({
        title: "解析成功",
        description: "成功解析插件离线链接，并选中最新版本",
      });
    } catch (error) {
      toast({
        title: "解析失败",
        description:
          error instanceof Error ? error.message : "请检查 URL 是否正确",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            插件 URL
          </label>
          <Input
            placeholder="请输入 VSCode 插件 URL"
            value={url}
            onChange={onUrlChange}
            className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
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
              <LinkIcon className="h-4 w-4" />
              解析下载链接
            </span>
          )}
        </Button>
      </div>

      {versionList.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            选择版本
          </label>
          <Select
            value={extensionInfo?.version || ""}
            onValueChange={onVersionChange}
          >
            <SelectTrigger className="w-full border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <SelectValue placeholder="选择版本" />
            </SelectTrigger>
            <SelectContent>
              {versionList.map((version) => (
                <SelectItem
                  key={version}
                  value={version}
                  className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {extensionInfo?.version && (
        <Card className="border border-blue-100 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 transition-all duration-200 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Download className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                下载链接
              </span>
            </div>
            <a
              href={downloadUrl}
              className="block text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline break-all transition-colors duration-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              版本: {extensionInfo.version}
            </a>
          </CardContent>
        </Card>
      )}
    </form>
  );
}
