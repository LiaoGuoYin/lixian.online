import { NextRequest, NextResponse } from "next/server";
import { parseEdgeQuery } from "@/features/edge/utils/edgeInput";
import { site } from "@/shared/lib/site";

const EDGE_MARKET = "US";
const EDGE_LANGUAGE = "en-US";

function getDetailUrl(parsed: NonNullable<ReturnType<typeof parseEdgeQuery>>): string {
  const url =
    parsed.type === "crxId"
      ? new URL(
          `https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/${parsed.value}`,
        )
      : new URL(
          `https://microsoftedge.microsoft.com/addons/getproductdetails/${parsed.value}`,
        );

  url.searchParams.set("hl", EDGE_LANGUAGE);
  url.searchParams.set("gl", EDGE_MARKET);
  return url.toString();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json({ error: "缺少 query 参数" }, { status: 400 });
    }

    const parsed = parseEdgeQuery(query);
    if (!parsed) {
      return NextResponse.json(
        { error: "无效的 Edge 扩展 ID、ProductId 或商店链接" },
        { status: 400 },
      );
    }

    const response = await fetch(getDetailUrl(parsed), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": site.userAgent,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Edge Add-ons 响应错误: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "未找到扩展信息" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: `获取 Edge 扩展信息失败: ${error}` },
      { status: 500 },
    );
  }
}
