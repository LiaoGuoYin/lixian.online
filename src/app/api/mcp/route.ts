import { NextRequest, NextResponse } from "next/server";

import {
  parseDownloadRequest,
  type AgentParseRequest,
} from "@/shared/lib/agent-parse";
import { type AgentToolId } from "@/shared/lib/agent-prompts";

const PROTOCOL_VERSION = "2025-06-18";
const TOOL_NAME = "parse_download_request";
const TOOL_IDS = ["vscode", "chrome", "msedge", "docker", "msstore"] as const;

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc?: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

export async function GET(request: NextRequest) {
  const urlBase = getRequestUrlBase(request);

  return NextResponse.json({
    name: "lixian-online-mcp",
    protocolVersion: PROTOCOL_VERSION,
    endpoint: new URL("/api/mcp", urlBase).toString(),
    tools: [TOOL_NAME],
  });
}

export async function POST(request: NextRequest) {
  const urlBase = getRequestUrlBase(request);
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      makeError(null, -32700, "Parse error"),
      { status: 400 },
    );
  }

  if (Array.isArray(payload)) {
    const responses = payload
      .map((item) => handleJsonRpc(item, urlBase))
      .filter((response): response is JsonRpcResponse => Boolean(response));

    if (responses.length === 0) {
      return new Response(null, { status: 202 });
    }

    return NextResponse.json(responses);
  }

  const response = handleJsonRpc(payload, urlBase);
  if (!response) {
    return new Response(null, { status: 202 });
  }

  return NextResponse.json(response);
}

function handleJsonRpc(
  payload: unknown,
  urlBase: string,
): JsonRpcResponse | null {
  if (!payload || typeof payload !== "object") {
    return makeError(null, -32600, "Invalid Request");
  }

  const request = payload as JsonRpcRequest;
  const id = request.id ?? null;

  if (request.jsonrpc !== "2.0" || typeof request.method !== "string") {
    return makeError(id, -32600, "Invalid Request");
  }

  if (request.id === undefined) {
    return null;
  }

  try {
    switch (request.method) {
      case "initialize":
        return makeResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "lixian-online",
            version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.5.4",
          },
        });
      case "ping":
        return makeResult(id, {});
      case "tools/list":
        return makeResult(id, {
          tools: [
            {
              name: TOOL_NAME,
              description:
                "Parse a lixian.online offline package request for VSCode, Chrome, Edge, Docker, or Microsoft Store.",
              inputSchema: {
                type: "object",
                properties: {
                  tool: {
                    type: "string",
                    enum: TOOL_IDS,
                    description: "Downloader surface to parse.",
                  },
                  query: {
                    type: "string",
                    description: "URL, id, package name, image ref, or Store identifier.",
                  },
                },
                required: ["tool", "query"],
                additionalProperties: false,
              },
            },
          ],
        });
      case "tools/call":
        return handleToolCall(id, request.params, urlBase);
      default:
        return makeError(id, -32601, "Method not found");
    }
  } catch (error) {
    return makeError(
      id,
      -32000,
      error instanceof Error ? error.message : "Tool execution failed",
    );
  }
}

function handleToolCall(
  id: JsonRpcId,
  params: unknown,
  urlBase: string,
): JsonRpcResponse {
  if (!params || typeof params !== "object") {
    return makeError(id, -32602, "Invalid params");
  }

  const data = params as {
    name?: unknown;
    arguments?: unknown;
  };

  if (data.name !== TOOL_NAME) {
    return makeError(id, -32602, "Unknown tool");
  }

  const request = normalizeToolArguments(data.arguments);
  const result = parseDownloadRequest(request, { urlBase });

  return makeResult(id, {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  });
}

function normalizeToolArguments(input: unknown): AgentParseRequest {
  if (!input || typeof input !== "object") {
    throw new Error("tool arguments are required");
  }

  const data = input as { tool?: unknown; query?: unknown };
  if (
    typeof data.tool !== "string" ||
    !TOOL_IDS.includes(data.tool as AgentToolId)
  ) {
    throw new Error("tool must be one of vscode, chrome, msedge, docker, msstore");
  }

  if (typeof data.query !== "string") {
    throw new Error("query must be a string");
  }

  return {
    tool: data.tool as AgentToolId,
    query: data.query,
  };
}

function getRequestUrlBase(request: NextRequest): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    const protocol =
      forwardedProto?.split(",")[0]?.trim() ??
      request.nextUrl.protocol.replace(":", "");
    return `${protocol}://${host.split(",")[0]?.trim()}`;
  }

  return request.nextUrl.origin;
}

function makeResult(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function makeError(
  id: JsonRpcId,
  code: number,
  message: string,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}
