import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/hooks/useToast";
import { Card, CardContent } from "@/shared/ui/card";
import { Download, Globe, FileArchive } from "lucide-react";
import { useChromeDownloader } from "../hooks/useChromeDownloader";

export default function ChromeDownloader() {
  const { toast } = useToast();
  const {
    extensionUrl,
    extensionInfo,
    downloadProgress,
    downloadUrls,
    loading,
    onUrlChange,
    handleSubmit,
    handleDownload,
    handlePasteFromClipboard,
  } = useChromeDownloader();

  const onSubmit = async (e: React.FormEvent) => {
    try {
      await handleSubmit(e);
      toast({
        title: "解析成功",
        description: "成功解析 Chrome 扩展信息",
      });
    } catch (error) {
      toast({
        title: "解析失败",
        description:
          error instanceof Error ? error.message : "请检查扩展 URL 或 ID 是否正确",
        variant: "destructive",
      });
    }
  };

  const onDownload = async (format: 'crx' | 'zip' | 'both' = 'both') => {
    try {
      await handleDownload(format);
      
      toast({
        title: "准备下载",
        description: "Chrome 扩展文件准备完成",
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
        description: "已自动粘贴并解析扩展信息",
      });
    } else {
      toast({
        title: "粘贴失败",
        description: "剪切板中没有有效的 Chrome 扩展 URL 或 ID",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Chrome 扩展 URL 或 ID
          </label>
          <Input
            placeholder="请输入 Chrome 扩展 URL 或 32 位 ID"
            value={extensionUrl}
            onChange={onUrlChange}
            onDoubleClick={handleInputDoubleClick}
            className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400">
            支持格式：chrome.google.com/webstore/detail/... 或 32位扩展ID
            <br />
            <span className="text-blue-600">💡 提示：双击输入框可自动粘贴剪切板内容</span>
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              解析中...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Globe className="h-4 w-4" />
              解析扩展信息
            </span>
          )}
        </Button>
      </div>

      {extensionInfo && (
        <div className="space-y-4">
          <Card className="border border-green-100 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
            <CardContent className="p-4">
              <div className="text-sm space-y-1">
                <div><span className="font-medium">扩展 ID:</span> {extensionInfo.id}</div>
                <div><span className="font-medium">扩展名称:</span> {extensionInfo.name || 'Unknown'}</div>
                <div><span className="font-medium">版本:</span> {extensionInfo.version || 'Unknown'}</div>
                {extensionInfo.description && (
                  <div><span className="font-medium">描述:</span> {extensionInfo.description}</div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              type="button"
              onClick={() => onDownload('crx')}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 transition-colors duration-200"
            >
              <span className="flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                下载 CRX
              </span>
            </Button>
            
            <Button
              type="button"
              onClick={() => onDownload('zip')}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 transition-colors duration-200"
            >
              <span className="flex items-center justify-center gap-2">
                <FileArchive className="h-4 w-4" />
                下载 ZIP
              </span>
            </Button>
            
            <Button
              type="button"
              onClick={() => onDownload('both')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 transition-colors duration-200"
            >
              <span className="flex items-center justify-center gap-2">
                <Download className="h-4 w-4" />
                下载全部
              </span>
            </Button>
          </div>
        </div>
      )}

      {downloadProgress && (
        <Card className="border border-blue-100 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>下载状态</span>
                <span>
                  {downloadProgress.status === 'downloading' && '下载中'}
                  {downloadProgress.status === 'converting' && '转换中'}
                  {downloadProgress.status === 'completed' && '完成'}
                  {downloadProgress.status === 'error' && '错误'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress.progress}%` }}
                ></div>
              </div>
              {downloadProgress.error && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  {downloadProgress.error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {(downloadUrls.crx || downloadUrls.zip) && (
        <Card className="border border-green-100 bg-green-50 dark:bg-green-900/20 dark:border-green-800 transition-all duration-200 hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Download className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                下载链接
              </span>
            </div>
            <div className="space-y-2">
              {downloadUrls.crx && (
                <div>
                  <a
                    href={downloadUrls.crx}
                    download={`${extensionInfo?.id}.crx`}
                    className="block text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 hover:underline transition-colors duration-200"
                  >
                    📦 {extensionInfo?.id}.crx
                  </a>
                  <span className="text-xs text-gray-500">Chrome 原生扩展格式</span>
                </div>
              )}
              {downloadUrls.zip && (
                <div>
                  <a
                    href={downloadUrls.zip}
                    download={`${extensionInfo?.id}.zip`}
                    className="block text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 hover:underline transition-colors duration-200"
                  >
                    🗄 {extensionInfo?.id}.zip
                  </a>
                  <span className="text-xs text-gray-500">解压后可查看源码</span>
                </div>
              )}
              {downloadUrls.crx && !downloadUrls.zip && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  ⚠️ ZIP 转换可能失败，CRX 文件可直接安装
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  );
}