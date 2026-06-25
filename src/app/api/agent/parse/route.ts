import { NextRequest, NextResponse } from "next/server";

import {
  parseDownloadRequest,
  type AgentParseRequest,
} from "@/shared/lib/agent-parse";
import { type AgentToolId } from "@/shared/lib/agent-prompts";

const TOOL_IDS = new Set<AgentToolId>([
  "vscode",
  "chrome",
  "msedge",
  "docker",
  "msstore",
]);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  return respond({
    tool: searchParams.get("tool"),
    query: searchParams.get("q") ?? searchParams.get("query"),
  }, getRequestUrlBase(request));
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  return respond(body, getRequestUrlBase(request));
}

function respond(input: unknown, urlBase: string) {
  try {
    const request = normalizeRequest(input);
    return NextResponse.json({
      ok: true,
      result: parseDownloadRequest(request, { urlBase }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "parse failed",
      },
      { status: 400 },
    );
  }
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

function normalizeRequest(input: unknown): AgentParseRequest {
  if (!input || typeof input !== "object") {
    throw new Error("tool and query are required");
  }

  const data = input as { tool?: unknown; query?: unknown };
  if (typeof data.tool !== "string" || !TOOL_IDS.has(data.tool as AgentToolId)) {
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
