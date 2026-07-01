import { InputWithHistory } from "@/shared/ui/input-with-history";
import { Button } from "@/shared/ui/button";
import { useToast } from "@/hooks/useToast";
import { useHistory } from "@/hooks/useHistory";
import {
  DownloadResultCard,
  type DownloadResultRow,
} from "@/shared/ui/download-result-card";
import { FeatureWorkspace } from "@/shared/ui/feature-workspace";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import { ProgressCard } from "@/shared/ui/progress-card";
import { ResultThumbnail } from "@/shared/ui/result-thumbnail";
import { EdgeIcon } from "@/shared/ui/icons";
import { buildAgentPayload, buildAgentPrompt } from "@/shared/lib/agent-prompts";
import { formatCompactNumber } from "@/shared/lib/format";
import {
  BadgeInfo,
  Download,
  ExternalLink,
  FileArchive,
  Fingerprint,
  Loader2,
  Package,
  Star,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEdgeDownloader } from "@/features/edge/hooks/useEdgeDownloader";

interface Props {
  defaultValue?: string;
  onQueryChange?: (q: string) => void;
  agentPanelVisible?: boolean;
}

export default function EdgeDownloader({
  defaultValue,
  onQueryChange,
  agentPanelVisible,
}: Props) {
  const { toast } = useToast();
  const history = useHistory("history:msedge");
  const {
    extensionQuery,
    extensionInfo,
    downloadProgress,
    downloadUrls,
    loading,
    searchResults,
    searching,
    onQueryChange: onInputChange,
    selectSearchResult,
    handleSubmit,
    handleDownload,
    cancelDownload,
  } = useEdgeDownloader(defaultValue);
  const agentPrompt = buildAgentPrompt({
    tool: "msedge",
    label: "Edge 扩展",
    query: extensionQuery,
  });
  const agentInputReady = Boolean(extensionQuery.trim());

  const onSubmit = async (e: React.FormEvent) => {
    try {
      await handleSubmit(e);
      history.add(extensionQuery);
      onQueryChange?.(extensionQuery);
      toast({
        title: "解析成功",
        description: "已解析 Edge 扩展信息",
      });
    } catch (error) {
      toast({
        title: "解析失败",
        description:
          error instanceof Error
            ? error.message
            : "扩展 ID、ProductId 或商店链接无效",
        variant: "destructive",
      });
    }
  };

  const onDownload = async (format: "crx" | "zip" | "both" = "both") => {
    try {
      await handleDownload(format);
      toast({
        title: "准备下载",
        description: "文件已就绪",
      });
    } catch (error) {
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "下载出错",
        variant: "destructive",
      });
    }
  };

  const description =
    extensionInfo?.shortDescription || extensionInfo?.description || "";

  return (
    <FeatureWorkspace
      humanGuide={{
        sourceLabel: "Edge Add-ons",
        sourceUrl:
          "https://microsoftedge.microsoft.com/addons/Microsoft-Edge-Extensions-Home",
        inputLabel: "Extension ID / ProductId / URL",
        detail: "解析 Add-ons 链接、CRX ID 或 ProductId，输出 CRX 与 ZIP。",
      }}
      agentPrompt={agentPrompt}
      agentPayload={buildAgentPayload("msedge", extensionQuery)}
      agentInputReady={agentInputReady}
      agentInputHint="扩展名称、CRX ID、ProductId 或 Add-ons URL"
      agentPanelVisible={agentPanelVisible}
    >
      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Extension ID / ProductId / URL</span>
            <a
              href="https://microsoftedge.microsoft.com/addons/Microsoft-Edge-Extensions-Home"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Edge Add-ons
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <InputWithHistory
            data-testid="edge-input"
            placeholder="扩展名称、ID、ProductId 或商店链接"
            value={extensionQuery}
            onChange={onInputChange}
            history={history.items}
            onSelectHistory={(value) =>
              onInputChange({
                target: { value },
              } as React.ChangeEvent<HTMLInputElement>)
            }
          />

          {searching && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              搜索中...
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-0.5 rounded-apple-sm border border-border/70 bg-popover p-1 shadow-apple-button">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => selectSearchResult(result)}
                  className="flex w-full items-start gap-3 rounded-apple-sm px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                >
                  <ResultThumbnail
                    src={result.iconUrl}
                    alt={`${result.name} 图标`}
                    fallback={EdgeIcon}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium sm:truncate">
                      {result.name}
                    </p>
                    {result.developer && (
                      <p className="text-xs text-muted-foreground">
                        {result.developer}
                      </p>
                    )}
                    {result.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {result.description}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
                      {result.id.slice(0, 12)}…
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-1 flex flex-wrap gap-2">
            {[
              {
                label: "uBlock Origin Lite",
                value: "cimighlppcgcoapaliogpjjdehbnofhn",
              },
              {
                label: "沉浸式翻译",
                value: "amkbmndfnliijdhojkpoglbnaaahippg",
              },
            ].map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() =>
                  onInputChange({
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
          data-testid="edge-submit"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingSpinner />
              解析中...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              解析扩展信息
            </span>
          )}
        </Button>

        {extensionInfo && (
          <div className="space-y-4">
            <DownloadResultCard
              title={extensionInfo.name || "Edge 扩展"}
              eyebrow="CRX"
              description={description}
              imageUrl={extensionInfo.iconUrl}
              imageAlt={`${extensionInfo.name || extensionInfo.id} 图标`}
              metadata={[
                {
                  icon: Fingerprint,
                  label: "ID",
                  value: extensionInfo.id,
                },
                ...(extensionInfo.developer
                  ? [
                      {
                        icon: UserRound,
                        label: "开发者",
                        value: extensionInfo.developer,
                      },
                    ]
                  : []),
                ...(extensionInfo.version
                  ? [
                      {
                        icon: BadgeInfo,
                        label: "版本",
                        value: extensionInfo.version,
                      },
                    ]
                  : []),
                ...(extensionInfo.category
                  ? [
                      {
                        icon: Package,
                        label: "分类",
                        value: extensionInfo.category,
                      },
                    ]
                  : []),
                ...(typeof extensionInfo.rating === "number"
                  ? [
                      {
                        icon: Star,
                        label: "评分",
                        value: `${extensionInfo.rating.toFixed(1)}${
                          typeof extensionInfo.ratingCount === "number"
                            ? ` (${formatCompactNumber(extensionInfo.ratingCount)})`
                            : ""
                        }`,
                      },
                    ]
                  : []),
                ...(typeof extensionInfo.activeInstallCount === "number"
                  ? [
                      {
                        icon: UsersRound,
                        label: "用户",
                        value: formatCompactNumber(
                          extensionInfo.activeInstallCount,
                        ),
                      },
                    ]
                  : []),
              ]}
            />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <Button
              type="button"
              onClick={() => onDownload("crx")}
              disabled={loading}
              variant="outline"
              className="gap-1.5"
              data-testid="edge-download-crx"
            >
              <Download className="h-4 w-4" />
              CRX
            </Button>
            <Button
              type="button"
              onClick={() => onDownload("zip")}
              disabled={loading}
              variant="outline"
              className="gap-1.5"
              data-testid="edge-download-zip"
            >
              <FileArchive className="h-4 w-4" />
              ZIP
            </Button>
            <Button
              type="button"
              onClick={() => onDownload("both")}
              disabled={loading}
              className="gap-1.5"
              data-testid="edge-download-both"
            >
              <Download className="h-4 w-4" />
              全部下载
            </Button>
          </div>
        </div>
      )}

      {downloadProgress && (
        <ProgressCard
          title={
            <>
              {downloadProgress.status === "downloading" && "下载中..."}
              {downloadProgress.status === "converting" && "转换中..."}
              {downloadProgress.status === "completed" && "下载完成"}
              {downloadProgress.status === "error" && "下载出错"}
            </>
          }
          value={
            downloadProgress.totalBytes > 0
              ? `${(downloadProgress.bytesDownloaded / 1024 / 1024).toFixed(1)} / ${(downloadProgress.totalBytes / 1024 / 1024).toFixed(1)} MB`
              : `${Math.round(downloadProgress.progress)}%`
          }
          progress={downloadProgress.progress}
          error={downloadProgress.error}
          onCancel={
            downloadProgress.status === "downloading" ||
            downloadProgress.status === "converting"
              ? cancelDownload
              : undefined
          }
        />
      )}

      {(downloadUrls.crx || downloadUrls.zip) && (
        <DownloadResultCard
          rows={[
            ...(downloadUrls.crx
              ? [
                  {
                    icon: Package,
                    title: `${extensionInfo?.id}.crx`,
                    description: "Edge 原生扩展格式",
                    href: downloadUrls.crx,
                    download: `${extensionInfo?.id}.crx`,
                    testId: "edge-download-crx-link",
                  } satisfies DownloadResultRow,
                ]
              : []),
            ...(downloadUrls.zip
              ? [
                  {
                    icon: FileArchive,
                    title: `${extensionInfo?.id}.zip`,
                    description: "解压后可查看源码",
                    href: downloadUrls.zip,
                    download: `${extensionInfo?.id}.zip`,
                    testId: "edge-download-zip-link",
                  } satisfies DownloadResultRow,
                ]
              : []),
          ]}
        />
      )}
      </form>
    </FeatureWorkspace>
  );
}
