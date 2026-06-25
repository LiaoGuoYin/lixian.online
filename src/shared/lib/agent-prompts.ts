export type AgentToolId =
  | "vscode"
  | "chrome"
  | "msedge"
  | "docker"
  | "msstore";

interface BuildAgentPromptParams {
  tool: AgentToolId;
  label: string;
  query: string;
}

export function buildAgentPrompt({
  tool,
  label,
  query,
}: BuildAgentPromptParams): string {
  const input = query.trim();
  if (!input) return "";

  const payload = JSON.stringify({ tool, query: input });

  return [
    `请解析 ${label} 离线包请求：${input}`,
    `优先调用 MCP 工具 parse_download_request，参数 ${payload}。`,
    "没有 MCP 时，请请求 POST /api/agent/parse 并返回规范化结果和下一步下载动作。",
  ].join("\n");
}

export function buildAgentPayload(tool: AgentToolId, query: string): string {
  const input = query.trim();
  if (!input) return "";

  return JSON.stringify(
    {
      tool,
      query: input,
    },
    null,
    2,
  );
}
