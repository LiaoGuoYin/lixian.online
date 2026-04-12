import { NextRequest, NextResponse } from "next/server";
import { site } from "@/shared/lib/site";

const ALLOWED_HTTP_HOST_PATTERNS = [
  /^download\.microsoft\.com$/i,
  /(?:^|\.)dl\.delivery\.mp\.microsoft\.com$/i,
];

function isAllowedMicrosoftDownloadHost(hostname: string): boolean {
  return ALLOWED_HTTP_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\r\n"]/g, "")
    .replace(/[\\/]/g, "_")
    .trim();
}

function inferFilename(downloadUrl: URL): string {
  const lastSegment = downloadUrl.pathname.split("/").pop() ?? "download.bin";
  try {
    return sanitizeFilename(decodeURIComponent(lastSegment)) || "download.bin";
  } catch {
    return sanitizeFilename(lastSegment) || "download.bin";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  const requestedFilename = searchParams.get("filename");

  if (!rawUrl) {
    return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "无效下载链接" }, { status: 400 });
  }

  if (upstreamUrl.protocol !== "http:") {
    return NextResponse.json(
      { error: "仅代理 HTTP 下载链接" },
      { status: 400 },
    );
  }

  if (!isAllowedMicrosoftDownloadHost(upstreamUrl.hostname)) {
    return NextResponse.json(
      { error: "不允许代理该下载域名" },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        "User-Agent": site.userAgent,
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `上游下载失败: ${upstream.status}` },
        { status: upstream.status },
      );
    }

    if (!upstream.body) {
      return NextResponse.json(
        { error: "上游未返回文件流" },
        { status: 502 },
      );
    }

    const filename = sanitizeFilename(requestedFilename ?? "") || inferFilename(upstreamUrl);
    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("Content-Type") || "application/octet-stream",
    );
    headers.set(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");

    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    const lastModified = upstream.headers.get("Last-Modified");
    if (lastModified) {
      headers.set("Last-Modified", lastModified);
    }

    const etag = upstream.headers.get("ETag");
    if (etag) {
      headers.set("ETag", etag);
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("MSStore HTTP 下载代理错误:", error);
    const cause = (error as { cause?: { code?: string } })?.cause;
    const isTimeout = cause?.code === "UND_ERR_CONNECT_TIMEOUT";
    const message = isTimeout
      ? "连接 Microsoft Store 超时，请检查网络环境或稍后重试"
      : "无法连接 Microsoft Store，请检查网络环境";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
