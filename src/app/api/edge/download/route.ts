import { NextRequest, NextResponse } from "next/server";

const EDGE_DOWNLOAD_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const extensionId = searchParams.get("id");

    if (!extensionId) {
      return NextResponse.json(
        { error: "扩展 ID 是必需的" },
        { status: 400 },
      );
    }

    if (!/^[a-z]{32}$/.test(extensionId)) {
      return NextResponse.json(
        { error: "无效的扩展 ID 格式" },
        { status: 400 },
      );
    }

    const edgeUrl = new URL("https://edge.microsoft.com/extensionwebstorebase/v1/crx");
    edgeUrl.searchParams.set("response", "redirect");
    edgeUrl.searchParams.set("x", `id=${extensionId}&installsource=ondemand&uc`);

    const response = await fetch(edgeUrl, {
      method: "GET",
      headers: {
        "User-Agent": EDGE_DOWNLOAD_USER_AGENT,
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Edge 下载服务响应错误: ${response.status}` },
        { status: response.status },
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "未获取到扩展文件，该扩展可能已下架或不可用" },
        { status: 404 },
      );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ||
          "application/x-chrome-extension",
        "Content-Disposition": `attachment; filename="${extensionId}.crx"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Edge 扩展下载代理错误:", error);
    const cause = (error as { cause?: { code?: string } })?.cause;
    const isTimeout = cause?.code === "UND_ERR_CONNECT_TIMEOUT";
    const message = isTimeout
      ? "连接 Edge Add-ons 超时，请检查网络环境或稍后重试"
      : "无法连接 Edge Add-ons，请检查网络环境";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
