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
import { Download, Link as LinkIcon, Package, ChevronDown } from "lucide-react";
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
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-3">
        <Input
          placeholder="https://marketplace.visualstudio.com/items?itemName=..."
          value={url}
          onChange={onUrlChange}
        />
        <p className="text-xs text-muted-foreground">
          粘贴 VSCode 插件页面链接
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          {[
            {
              label: "Python",
              value:
                "https://marketplace.visualstudio.com/items?itemName=ms-python.python",
            },
            {
              label: "ESLint",
              value:
                "https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint",
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
            <LinkIcon className="h-4 w-4" />
            解析插件链接
          </span>
        )}
      </Button>

      {versionList.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            选择版本
          </label>
          <Select
            value={extensionInfo?.version || ""}
            onValueChange={onVersionChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择版本" />
            </SelectTrigger>
            <SelectContent>
              {versionList.map((version) => (
                <SelectItem key={version} value={version}>
                  {version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {extensionInfo?.version && downloadUrl && (
        <Card className="border border-primary/20 bg-primary/5">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-9 h-9 rounded-apple-sm bg-primary/10 flex items-center justify-center">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    版本 {extensionInfo.version}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    .vsix 离线安装包
                  </p>
                </div>
              </div>
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
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
