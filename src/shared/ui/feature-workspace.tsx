"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  CircleAlert,
  Bot,
  Clipboard,
  Copy,
  ExternalLink,
  HelpCircle,
  MousePointerClick,
  TerminalSquare,
  UserRound,
  X,
  type LucideProps,
} from "lucide-react";

import { useToast } from "@/hooks/useToast";
import {
  buildRuntimeUrl,
  useRuntimeUrlBase,
} from "@/shared/lib/runtime-url";
import { cn } from "@/shared/lib/util";
import { AgentAccessDialog } from "@/shared/ui/agent-access-dialog";
import { Button } from "@/shared/ui/button";

interface FeatureWorkspaceProps {
  humanLabel?: string;
  humanGuide: HumanGuideConfig;
  agentLabel?: string;
  agentPanelVisible?: boolean;
  agentPrompt: string;
  agentPayload: string;
  agentInputReady: boolean;
  agentInputHint: string;
  children: ReactNode;
  className?: string;
}

export function FeatureWorkspace({
  humanLabel = "Human",
  humanGuide,
  agentLabel = "Agent",
  agentPanelVisible = true,
  agentPrompt,
  agentPayload,
  agentInputReady,
  agentInputHint,
  children,
  className,
}: FeatureWorkspaceProps) {
  return (
    <section
      className={cn(
        "grid gap-5",
        agentPanelVisible
          ? "lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
          : "lg:grid-cols-1",
        className,
      )}
    >
      <HumanPanel humanLabel={humanLabel} guide={humanGuide}>
        {children}
      </HumanPanel>

      {agentPanelVisible && (
        <AgentPanel
          agentLabel={agentLabel}
          agentPrompt={agentPrompt}
          agentPayload={agentPayload}
          agentInputReady={agentInputReady}
          agentInputHint={agentInputHint}
        />
      )}
    </section>
  );
}

interface HumanGuideConfig {
  sourceLabel: string;
  sourceUrl: string;
  inputLabel: string;
  detail: string;
}

interface HumanPanelProps {
  humanLabel: string;
  guide: HumanGuideConfig;
  children: ReactNode;
}

function HumanPanel({ humanLabel, guide, children }: HumanPanelProps) {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="min-w-0 rounded-apple-sm border border-border/70 bg-card/90 p-4 shadow-apple sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <UserRound className="h-4 w-4 text-primary" />
          {humanLabel}
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="inline-flex items-center gap-1 rounded-apple-sm bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <HelpCircle className="h-3 w-3" />
          使用说明
        </button>
      </div>

      <div className="space-y-4">{children}</div>

      {guideOpen && (
        <HumanGuideDialog guide={guide} onClose={() => setGuideOpen(false)} />
      )}
    </div>
  );
}

interface HumanGuideDialogProps {
  guide: HumanGuideConfig;
  onClose: () => void;
}

function HumanGuideDialog({ guide, onClose }: HumanGuideDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/25 px-4 py-6 backdrop-blur-sm sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="human-guide-title"
        className="w-full max-w-lg rounded-apple-sm border border-border bg-card shadow-apple-lg"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border/70 p-5">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-primary">
              <MousePointerClick className="h-4 w-4" />
              Human
            </div>
            <h2
              id="human-guide-title"
              className="text-lg font-semibold leading-tight text-foreground"
            >
              使用说明
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              先从官方来源拿到目标链接，再回到这里解析离线包。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-apple-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="rounded-apple-sm border border-border/60 bg-secondary/35 p-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              当前入口
            </div>
            <p className="text-sm leading-relaxed text-foreground">
              {guide.detail}
            </p>
          </div>

          <a
            href={guide.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-apple-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-apple-button transition-colors hover:bg-primary/90"
          >
            打开 {guide.sourceLabel}
            <ExternalLink className="h-4 w-4" />
          </a>

          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <StepNumber>1</StepNumber>
              <span>跳转到 {guide.sourceLabel}。</span>
            </li>
            <li className="flex gap-3">
              <StepNumber>2</StepNumber>
              <span>搜索或打开你要解析的插件、扩展、镜像或应用页面。</span>
            </li>
            <li className="flex gap-3">
              <StepNumber>3</StepNumber>
              <span>复制页面链接，或复制页面里的 ID / 名称标识。</span>
            </li>
            <li className="flex gap-3">
              <StepNumber>4</StepNumber>
              <span>回到这里，粘贴到 {guide.inputLabel} 输入框并开始解析。</span>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}

function StepNumber({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {children}
    </span>
  );
}

interface AgentPanelProps {
  agentLabel: string;
  agentPrompt: string;
  agentPayload: string;
  agentInputReady: boolean;
  agentInputHint: string;
}

function AgentPanel({
  agentLabel,
  agentPrompt,
  agentPayload,
  agentInputReady,
  agentInputHint,
}: AgentPanelProps) {
  const { toast } = useToast();
  const urlBase = useRuntimeUrlBase();
  const apiUrl = buildRuntimeUrl("/api/agent/parse", urlBase);
  const resolvedAgentPrompt = withRuntimeAgentUrls(agentPrompt, apiUrl);
  const canCopy =
    agentInputReady &&
    Boolean(resolvedAgentPrompt.trim()) &&
    Boolean(agentPayload.trim());

  const copy = async (text: string, title: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title,
        description: "已复制到剪贴板",
      });
    } catch {
      toast({
        title: "复制失败",
        description: "浏览器未授权剪贴板访问",
        variant: "destructive",
      });
    }
  };

  return (
    <aside className="rounded-apple-sm border border-border/70 bg-card/90 p-4 shadow-apple sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <Bot className="h-4 w-4 text-primary" />
          {agentLabel}
        </div>
        <AgentAccessDialog
          triggerLabel="接入说明"
          triggerIcon={HelpCircle}
          triggerVariant="ghost"
          triggerSize="sm"
          triggerClassName="h-auto gap-1 rounded-apple-sm bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 hover:text-primary [&_svg]:size-3"
          triggerIconClassName="h-3 w-3"
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clipboard className="h-3.5 w-3.5" />
              Prompt
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              disabled={!canCopy}
              data-testid="agent-prompt-copy"
              onClick={() => copy(resolvedAgentPrompt, "Prompt 已复制")}
            >
              <Copy className="h-3.5 w-3.5" />
              {canCopy ? "复制" : "需要输入"}
            </Button>
          </div>
          {canCopy ? (
            <pre
              data-testid="agent-prompt-content"
              className="whitespace-pre-wrap break-words rounded-apple-sm border border-border/60 bg-secondary/50 p-3 text-xs leading-relaxed text-foreground"
            >
              {resolvedAgentPrompt}
            </pre>
          ) : (
            <div
              data-testid="agent-empty-state"
              className="rounded-apple-sm border border-dashed border-border/70 bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground"
            >
              <div className="flex items-start gap-2">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">需要输入查询内容</p>
                  <p>
                    先在左侧输入{agentInputHint}，或点击示例，再复制
                    Prompt/API。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-2 text-xs">
          <EndpointRow
            icon={TerminalSquare}
            label="API"
            value={`POST ${apiUrl}`}
            disabled={!canCopy}
            copyTestId="agent-api-copy"
            onCopy={() =>
              copy(
                `curl -X POST ${apiUrl} -H 'Content-Type: application/json' -d '${agentPayload.replaceAll("'", "'\\''")}'`,
                "API 请求已复制",
              )
            }
          />
        </div>
      </div>
    </aside>
  );
}

function withRuntimeAgentUrls(prompt: string, apiUrl: string) {
  return prompt.replace("POST /api/agent/parse", `POST ${apiUrl}`);
}

interface EndpointRowProps {
  icon: ComponentType<LucideProps>;
  label: string;
  value: string;
  disabled?: boolean;
  copyTestId?: string;
  onCopy: () => void;
}

function EndpointRow({
  icon: Icon,
  label,
  value,
  disabled = false,
  copyTestId,
  onCopy,
}: EndpointRowProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-apple-sm border border-border/60 bg-background/70 px-3 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-[11px] text-foreground">
          {value}
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onCopy}
        data-testid={copyTestId}
        className={cn(
          "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-apple-sm px-2 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
        )}
        aria-label={disabled ? `需要输入才能复制 ${label}` : `复制 ${label}`}
      >
        <Copy className="h-3.5 w-3.5" />
        <span>{disabled ? "需要输入" : "复制"}</span>
      </button>
    </div>
  );
}
