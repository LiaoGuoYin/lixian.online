"use client";

import { type ComponentType, type ReactNode } from "react";
import {
  CircleAlert,
  Bot,
  Check,
  Clipboard,
  Copy,
  TerminalSquare,
  UserRound,
  type LucideProps,
} from "lucide-react";

import { useToast } from "@/hooks/useToast";
import {
  buildRuntimeUrl,
  useRuntimeUrlBase,
} from "@/shared/lib/runtime-url";
import { cn } from "@/shared/lib/util";
import { Button } from "@/shared/ui/button";

interface FeatureWorkspaceProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  humanLabel?: string;
  agentLabel?: string;
  agentPrompt: string;
  agentPayload: string;
  agentInputReady: boolean;
  agentInputHint: string;
  children: ReactNode;
  className?: string;
}

export function FeatureWorkspace({
  icon: Icon,
  title,
  description,
  humanLabel = "Human",
  agentLabel = "Agent",
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
        "grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start",
        className,
      )}
    >
      <div className="min-w-0 space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <UserRound className="h-4 w-4" />
              {humanLabel}
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-apple-sm border border-border/70 bg-card shadow-apple-button">
                <Icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h2 className="break-words text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                  {title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-4">{children}</div>
      </div>

      <AgentPanel
        agentLabel={agentLabel}
        agentPrompt={agentPrompt}
        agentPayload={agentPayload}
        agentInputReady={agentInputReady}
        agentInputHint={agentInputHint}
      />
    </section>
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
        {canCopy ? (
          <StatusPill icon={Check} tone="ready">
            Ready
          </StatusPill>
        ) : (
          <StatusPill icon={CircleAlert} tone="waiting">
            需要输入
          </StatusPill>
        )}
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
              复制
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
          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-apple-sm text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
        )}
        aria-label={`复制 ${label}`}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface StatusPillProps {
  icon: ComponentType<LucideProps>;
  tone?: "ready" | "waiting";
  children: ReactNode;
}

function StatusPill({
  icon: Icon,
  tone = "ready",
  children,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-apple-sm px-2 py-1 text-xs font-medium",
        tone === "ready"
          ? "bg-primary/10 text-primary"
          : "bg-secondary text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {children}
    </span>
  );
}
