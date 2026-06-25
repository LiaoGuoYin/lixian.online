import { parseEdgeQuery } from "@/features/edge/utils/edgeInput";
import { site } from "@/shared/lib/site";
import { type AgentToolId } from "@/shared/lib/agent-prompts";

export interface AgentParseRequest {
  tool: AgentToolId;
  query: string;
}

export interface AgentParseResult {
  tool: AgentToolId;
  input: string;
  normalized: Record<string, unknown>;
  humanUrl: string;
  apiEndpoint: string;
  mcpEndpoint: string;
  mcpTool: string;
  nextActions: string[];
}

interface AgentParseOptions {
  urlBase?: string;
}

const PRODUCT_ID_PATTERN = /^[A-Za-z0-9]{12}$/;
const PACKAGE_FAMILY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*_[A-Za-z0-9]+$/;
const CATEGORY_ID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function parseDownloadRequest({
  tool,
  query,
}: AgentParseRequest, options: AgentParseOptions = {}): AgentParseResult {
  const input = query.trim();
  if (!input) {
    throw new Error("query is required");
  }

  const normalized = parseByTool(tool, input);
  const urlBase = options.urlBase ?? site.url;
  const humanUrl = new URL(`/${tool}`, urlBase);
  humanUrl.searchParams.set("q", input);

  return {
    tool,
    input,
    normalized,
    humanUrl: humanUrl.toString(),
    apiEndpoint: new URL("/api/agent/parse", urlBase).toString(),
    mcpEndpoint: new URL("/api/mcp", urlBase).toString(),
    mcpTool: "parse_download_request",
    nextActions: getNextActions(tool),
  };
}

function parseByTool(tool: AgentToolId, input: string): Record<string, unknown> {
  switch (tool) {
    case "vscode":
      return parseVSCode(input);
    case "chrome":
      return parseChrome(input);
    case "msedge":
      return parseEdge(input);
    case "docker":
      return parseDocker(input);
    case "msstore":
      return parseMSStore(input);
    default:
      throw new Error(`unsupported tool: ${tool satisfies never}`);
  }
}

function parseVSCode(input: string) {
  let urlObj: URL;
  try {
    urlObj = new URL(input);
  } catch {
    throw new Error("VSCode input must be a Marketplace URL");
  }

  const itemName = urlObj.searchParams.get("itemName");
  if (!itemName) {
    throw new Error("VSCode Marketplace URL must include itemName");
  }

  const dotIndex = itemName.lastIndexOf(".");
  if (dotIndex === -1) {
    throw new Error("itemName must use publisher.extension format");
  }

  const publisher = itemName.slice(0, dotIndex);
  const extension = itemName.slice(dotIndex + 1);

  return {
    type: "vscode-marketplace",
    publisher,
    extension,
    itemName,
  };
}

function parseChrome(input: string) {
  const match = input.toLowerCase().match(/([a-z]{32})/);
  if (!match) {
    throw new Error("Chrome input must contain a 32 character extension id");
  }

  return {
    type: "chrome-extension",
    id: match[1],
    downloadUrl: `/api/chrome/download?id=${match[1]}`,
  };
}

function parseEdge(input: string) {
  const parsed = parseEdgeQuery(input);
  if (!parsed) {
    throw new Error("Edge input must contain a CRX id, ProductId, or Add-ons URL");
  }

  return {
    type: "edge-addon",
    inputType: parsed.type,
    value: parsed.value,
    downloadUrl:
      parsed.type === "crxId" ? `/api/edge/download?id=${parsed.value}` : null,
  };
}

function parseDocker(input: string) {
  const cleanInput = input.trim();
  if (!cleanInput) {
    throw new Error("Docker input is required");
  }

  const hubMatch = cleanInput.match(/hub\.docker\.com\/r\/([^/]+)\/([^/?]+)/);
  if (hubMatch) {
    return {
      type: "docker-image",
      registry: "docker.io",
      namespace: hubMatch[1],
      repository: hubMatch[2],
      tag: "latest",
      ref: `${hubMatch[1]}/${hubMatch[2]}:latest`,
    };
  }

  const parts = cleanInput.split("/");
  let registry = "docker.io";
  let namespace = "library";
  let repository = "";
  let tag = "latest";

  if (parts.length === 1) {
    const parsed = splitRepoTag(parts[0]);
    repository = parsed.repository;
    tag = parsed.tag;
  } else if (parts.length === 2) {
    namespace = parts[0];
    const parsed = splitRepoTag(parts[1]);
    repository = parsed.repository;
    tag = parsed.tag;
  } else if (parts.length >= 3) {
    registry = parts[0];
    namespace = parts[1];
    const parsed = splitRepoTag(parts.slice(2).join("/"));
    repository = parsed.repository;
    tag = parsed.tag;
  }

  if (!repository) {
    throw new Error("Docker input must include a repository");
  }

  return {
    type: "docker-image",
    registry,
    namespace,
    repository,
    tag,
    ref: `${namespace}/${repository}:${tag}`,
  };
}

function splitRepoTag(value: string) {
  const colonIndex = value.lastIndexOf(":");
  if (colonIndex > -1) {
    return {
      repository: value.slice(0, colonIndex),
      tag: value.slice(colonIndex + 1) || "latest",
    };
  }

  return {
    repository: value,
    tag: "latest",
  };
}

function parseMSStore(input: string) {
  const value = input.trim();
  let requestType: string | null = null;

  if (/^https?:\/\//i.test(value)) requestType = "url";
  if (!requestType && /(^|\/)(apps\.microsoft\.com|microsoft\.com\/[^\s]*store)/i.test(value)) {
    requestType = "url";
  }
  if (!requestType && CATEGORY_ID_PATTERN.test(value)) requestType = "CategoryId";
  if (!requestType && PACKAGE_FAMILY_NAME_PATTERN.test(value)) {
    requestType = "PackageFamilyName";
  }
  if (!requestType && PRODUCT_ID_PATTERN.test(value)) requestType = "ProductId";

  if (!requestType) {
    throw new Error("MSStore input must be a Store URL, ProductId, PackageFamilyName, or CategoryId");
  }

  return {
    type: "microsoft-store",
    requestType,
    market: "US",
    language: "en-us",
  };
}

function getNextActions(tool: AgentToolId): string[] {
  switch (tool) {
    case "vscode":
      return ["Open the human URL to choose a version", "Download the generated VSIX package"];
    case "chrome":
      return ["Fetch detail through /api/chrome/detail", "Download CRX, then convert to ZIP in browser if needed"];
    case "msedge":
      return ["Fetch detail through /api/edge/detail", "Download CRX, then convert to ZIP in browser if needed"];
    case "docker":
      return ["Resolve tags and platforms", "Download layers and package a docker load TAR in browser"];
    case "msstore":
      return ["Resolve catalog data through /api/msstore/resolve", "Pick an allowed package link"];
  }
}
