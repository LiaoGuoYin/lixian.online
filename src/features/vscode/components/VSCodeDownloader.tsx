import { InputWithHistory } from "@/shared/ui/input-with-history";
import { Button } from "@/shared/ui/button";
import { SearchableSelect } from "@/shared/ui/searchable-select";
import { useToast } from "@/hooks/useToast";
import { useHistory } from "@/hooks/useHistory";
import { DownloadResultCard } from "@/shared/ui/download-result-card";
import { FeatureWorkspace } from "@/shared/ui/feature-workspace";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import { buildAgentPayload, buildAgentPrompt } from "@/shared/lib/agent-prompts";
import { VSCodeIcon } from "@/shared/ui/icons";
import { Box, Package, ExternalLink } from "lucide-react";
import { useVSCodeDownloader } from "../hooks/useVSCodeDownloader";

interface Props {
  defaultValue?: string;
  onQueryChange?: (q: string) => void;
}

export default function VSCodeDownloader({
  defaultValue,
  onQueryChange,
}: Props) {
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
  } = useVSCodeDownloader(defaultValue);
  const agentPrompt = buildAgentPrompt({
    tool: "vscode",
    label: "VSCode 插件",
    query: url,
  });
  const agentInputReady = Boolean(url.trim());

  const onSubmit = async (e: React.FormEvent) => {
    try {
      await handleSubmit(e);
      history.add(url);
      onQueryChange?.(url);
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
    <FeatureWorkspace
      icon={VSCodeIcon}
      title="VSCode 插件离线包"
      description="解析 Marketplace 插件页，生成指定版本的 VSIX 直链。"
      agentPrompt={agentPrompt}
      agentPayload={buildAgentPayload("vscode", url)}
      agentInputReady={agentInputReady}
      agentInputHint="Marketplace URL"
    >
      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Marketplace URL</span>
            <a
              href="https://marketplace.visualstudio.com/vscode"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Marketplace
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <InputWithHistory
            data-testid="vscode-input"
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
          <div className="mt-1 flex flex-wrap gap-2">
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
                className="rounded-apple-sm bg-background px-2.5 py-1 text-xs text-muted-foreground shadow-apple-button transition-colors hover:bg-secondary hover:text-foreground"
              >
                试试 {example.label}
              </button>
            ))}
          </div>
        </div>

        {versionList.length > 0 && (
          <div className="rounded-apple-sm border border-border/60 bg-background/70 p-3 shadow-apple-button sm:p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              选择版本
            </p>
            <SearchableSelect
              value={extensionInfo?.version || ""}
              options={versionList}
              placeholder="选择版本"
              onValueChange={onVersionChange}
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full"
          data-testid="vscode-submit"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner />
              解析中...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              解析插件信息
            </span>
          )}
        </Button>

        {extensionInfo?.version && downloadUrl && (
          <DownloadResultCard
            title={`${extensionInfo.publisher}.${extensionInfo.extension}`}
            eyebrow="VSIX"
            metadata={[
              {
                icon: Box,
                label: "版本",
                value: extensionInfo.version,
              },
            ]}
            rows={[
              {
                icon: Package,
                title: `版本 ${extensionInfo.version}`,
                description: ".vsix 离线安装包",
                href: downloadUrl,
                external: true,
                testId: "vscode-download-link",
              },
            ]}
          />
        )}
      </form>
    </FeatureWorkspace>
  );
}
