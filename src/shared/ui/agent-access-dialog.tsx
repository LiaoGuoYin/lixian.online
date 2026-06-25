"use client";

import { useState } from "react";
import {
  Bot,
  Check,
  Copy,
  Server,
  TerminalSquare,
  X,
} from "lucide-react";

import { useToast } from "@/hooks/useToast";
import {
  buildRuntimeUrl,
  useRuntimeUrlBase,
} from "@/shared/lib/runtime-url";
import { Button } from "@/shared/ui/button";

export function AgentAccessDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const urlBase = useRuntimeUrlBase();

  const apiUrl = buildRuntimeUrl("/api/agent/parse", urlBase);
  const mcpUrl = buildRuntimeUrl("/api/mcp", urlBase);
  const codexCommand = `codex mcp add lixian-online --url ${mcpUrl}`;
  const apiExamplePayload = {
    tool: "chrome",
    query: "cjpalhdlnbpafiamejdnhcphjbkeiagm",
  };
  const apiCurl = [
    `curl -X POST ${apiUrl}`,
    "-H 'Content-Type: application/json'",
    `-d '${JSON.stringify(apiExamplePayload)}'`,
  ].join(" ");

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
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 bg-card"
        onClick={() => setOpen(true)}
      >
        <Bot className="h-3.5 w-3.5 text-primary" />
        Agent 接入
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/25 px-4 py-6 backdrop-blur-sm sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-access-title"
            className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-auto rounded-apple-sm border border-border bg-card shadow-apple-lg"
          >
            <header className="flex items-start justify-between gap-4 border-b border-border/70 p-5">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  <Bot className="h-4 w-4" />
                  Agent Native
                </div>
                <h2
                  id="agent-access-title"
                  className="text-xl font-semibold leading-tight text-foreground"
                >
                  Agent 接入
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  只需要选一种接入方式：长期给 Agent 用选 MCP；脚本或工作流
                  调用选 HTTP API。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-apple-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="space-y-4 p-5">
              <AccessBlock
                icon={Server}
                title="1. Codex MCP"
                description="把 lixian.online 注册成 Codex 可调用的远程工具。"
                guidance="适合：你希望 Codex 之后直接调用解析能力，而不是每次复制网页里的提示词。复制命令到终端执行一次即可。"
                value={codexCommand}
                onCopy={() => copy(codexCommand, "MCP 配置已复制")}
              />

              <AccessBlock
                icon={TerminalSquare}
                title="2. HTTP API"
                description="给脚本、自动化工作流或不支持 MCP 的 Agent 使用。"
                guidance="适合：你只想发一个 POST 请求拿到规范化解析结果。下面是可直接运行的 Chrome 示例；实际使用时把 tool/query 换成目标解析器和用户输入。"
                value={apiCurl}
                onCopy={() => copy(apiCurl, "API 请求已复制")}
              />

              <AccessBlock
                icon={Check}
                title="3. MCP Tool"
                description="Agent 连上 MCP 后真正调用的工具名。"
                guidance="适合：你在 Agent 提示词、工具调用日志或调试请求里需要明确工具名。参数和 HTTP API 一样，也是 { tool, query }。"
                value="parse_download_request"
                onCopy={() =>
                  copy("parse_download_request", "MCP 工具名已复制")
                }
              />

              <ParameterGuide />
            </div>
          </section>
        </div>
      )}
    </>
  );
}

interface AccessBlockProps {
  icon: typeof Bot;
  title: string;
  description: string;
  guidance: string;
  value: string;
  onCopy: () => void;
}

function AccessBlock({
  icon: Icon,
  title,
  description,
  guidance,
  value,
  onCopy,
}: AccessBlockProps) {
  return (
    <div className="rounded-apple-sm border border-border/70 bg-background/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {guidance}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 shrink-0 px-2"
          onClick={onCopy}
        >
          <Copy className="h-3.5 w-3.5" />
          复制
        </Button>
      </div>
      <pre className="overflow-auto whitespace-pre-wrap break-words rounded-apple-sm border border-border/60 bg-secondary/45 p-3 font-mono text-xs leading-relaxed text-foreground">
        {value}
      </pre>
    </div>
  );
}

function ParameterGuide() {
  return (
    <div className="rounded-apple-sm border border-border/70 bg-background/70 p-4">
      <div className="mb-3 text-sm font-medium text-foreground">参数速查</div>
      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="rounded-apple-sm border border-border/60 bg-secondary/35 p-3">
          <div className="mb-1 font-mono text-foreground">tool</div>
          <p className="leading-relaxed">
            选择解析器：vscode、chrome、msedge、docker、msstore。
          </p>
        </div>
        <div className="rounded-apple-sm border border-border/60 bg-secondary/35 p-3">
          <div className="mb-1 font-mono text-foreground">query</div>
          <p className="leading-relaxed">
            用户输入的链接、扩展 ID、镜像名、ProductId 或包名。
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        返回结果会包含 normalized 结构、可打开的人类页面 humanUrl，以及下一步下载动作 nextActions。
      </p>
    </div>
  );
}
