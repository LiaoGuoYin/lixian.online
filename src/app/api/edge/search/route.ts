import { NextRequest, NextResponse } from "next/server";
import { site } from "@/shared/lib/site";

const EDGE_MARKET = "US";
const EDGE_LANGUAGE = "en-US";

interface EdgeSearchResponseItem {
  crxId?: string;
  storeProductId?: string;
  name?: string;
  developerName?: string;
  shortDescription?: string;
  logoUrl?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json(
        { error: "缺少搜索关键词" },
        { status: 400 },
      );
    }

    const edgeUrl = new URL(
      "https://microsoftedge.microsoft.com/addons/v4/getfilteredorderedsearch",
    );
    edgeUrl.searchParams.set("hl", EDGE_LANGUAGE);
    edgeUrl.searchParams.set("gl", EDGE_MARKET);
    edgeUrl.searchParams.set("Query", query);
    edgeUrl.searchParams.set("pgNo", "1");
    edgeUrl.searchParams.set("filteredCategories", "Edge-Extensions");
    edgeUrl.searchParams.set("filteredAddon", "1");
    edgeUrl.searchParams.set("filterFeaturedAddons", "false");
    edgeUrl.searchParams.set("filteredRating", "0");
    edgeUrl.searchParams.set("sortBy", "Relevance");

    const response = await fetch(edgeUrl, {
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
    const extensionList: EdgeSearchResponseItem[] = Array.isArray(data?.extensionList)
      ? data.extensionList
      : [];

    return NextResponse.json({
      results: extensionList
        .filter(
          (item): item is EdgeSearchResponseItem & { crxId: string; name: string } =>
            typeof item.crxId === "string" && typeof item.name === "string",
        )
        .slice(0, 10)
        .map((item) => ({
          id: item.crxId,
          storeProductId: item.storeProductId,
          name: item.name,
          developer: item.developerName,
          description: item.shortDescription,
          iconUrl: item.logoUrl,
        })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: `搜索 Edge 扩展失败: ${error}` },
      { status: 500 },
    );
  }
}
