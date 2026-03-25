import { InputWithHistory } from "@/shared/ui/input-with-history";
import { Button } from "@/shared/ui/button";
import { SearchableSelect } from "@/shared/ui/searchable-select";
import { useToast } from "@/hooks/useToast";
import { useHistory } from "@/hooks/useHistory";
import { Card, CardContent } from "@/shared/ui/card";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import {
  Download,
  Link as LinkIcon,
  Package,
  ExternalLink,
} from "lucide-react";
import { useVSCodeDownloader } from "../hooks/useVSCodeDownloader";

export default function VSCodeDownloader() {
  const { toast } = useToast();
  const history = useHistory("history:vscode");
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
      history.add(url);
      toast({
        title: "解析成功",
        description: "已选中最新版本",
      });
    } catch (error) {
      toast({
        title: "解析失败",
        description: error instanceof Error ? error.message : "URL 格式有误",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          仅支持插件页链接，或前往{" "}
          <a
            href="https://marketplace.visualstudio.com/vscode"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            VSCode Marketplace
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
        <InputWithHistory
          placeholder="marketplace.visualstudio.com/items?itemName=..."
          value={url}
          onChange={onUrlChange}
          history={history.items}
          onSelectHistory={(v) =>
            onUrlChange({
              target: { value: v },
            } as React.ChangeEvent<HTMLInputElement>)
          }
        />
        <div className="flex flex-wrap gap-2 mt-1">
          {[
            {
              label: "Claude Code",
              value:
                "https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code",
            },
            {
              label: "Remote SSH",
              value:
                "https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh",
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
        <SearchableSelect
          value={extensionInfo?.version || ""}
          options={versionList}
          placeholder="选择版本"
          onValueChange={onVersionChange}
        />
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
