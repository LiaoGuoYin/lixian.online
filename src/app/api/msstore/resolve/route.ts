import { NextRequest, NextResponse } from "next/server";
import { site } from "@/shared/lib/site";

type RequestType = "url" | "ProductId" | "PackageFamilyName" | "CategoryId";
type StoreRing = "WIF" | "WIS" | "RP" | "Retail";

interface RgFileRow {
  name: string;
  url: string;
  expires: string;
  sha1: string;
  size: string;
}

interface StoreImage {
  ImagePurpose?: string;
  Uri?: string;
  Width?: number;
  Height?: number;
}

function isDisplayCatalogBigId(value: string): boolean {
  return /^[A-Za-z0-9]{12}$/.test(value);
}

function isStoreIdentifier(value: string): boolean {
  return /^[A-Za-z0-9]{12,16}$/.test(value);
}

function extractStoreIdentifierFromUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (isStoreIdentifier(trimmed)) {
    return trimmed.toUpperCase();
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const fromQuery =
    parsed.searchParams.get("productId") ??
    parsed.searchParams.get("productid") ??
    parsed.searchParams.get("itemId") ??
    parsed.searchParams.get("itemid");
  if (fromQuery && isStoreIdentifier(fromQuery)) {
    return fromQuery.toUpperCase();
  }

  const path = parsed.pathname;
  const patterns = [
    /\/detail\/([A-Za-z0-9]{12,16})(?:[/?#]|$)/i,
    /\/store\/productid\/([A-Za-z0-9]{12,16})(?:[/?#]|$)/i,
    /\/productid\/([A-Za-z0-9]{12,16})(?:[/?#]|$)/i,
  ];
  for (const pattern of patterns) {
    const matched = path.match(pattern);
    if (matched?.[1]) {
      return matched[1].toUpperCase();
    }
  }

  return null;
}

function normalizeStoreIdentifier(type: RequestType, query: string): string {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("query 不能为空");
  }

  switch (type) {
    case "url": {
      const storeIdentifier = extractStoreIdentifierFromUrl(trimmed);
      if (!storeIdentifier) {
        throw new Error("无法从 URL 提取应用标识");
      }
      return trimmed;
    }
    case "ProductId": {
      if (!isDisplayCatalogBigId(trimmed)) {
        throw new Error("无效 ProductId（需 12 位，例如 9N0DX20HK701）");
      }
      return trimmed.toUpperCase();
    }
    case "PackageFamilyName": {
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]*_[A-Za-z0-9]+$/.test(trimmed)) {
        throw new Error("无效 PackageFamilyName");
      }
      return trimmed;
    }
    case "CategoryId": {
      if (
        !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          trimmed,
        )
      ) {
        throw new Error("无效 CategoryId");
      }
      return trimmed.toLowerCase();
    }
    default:
      throw new Error("不支持的请求类型");
  }
}

function extractDisplayCatalogBigId(type: RequestType, query: string): string | null {
  if (type === "ProductId") {
    return query;
  }
  if (type === "url") {
    const storeIdentifier = extractStoreIdentifierFromUrl(query);
    return storeIdentifier && isDisplayCatalogBigId(storeIdentifier)
      ? storeIdentifier
      : null;
  }
  return null;
}

function mapRequestTypeForRg(type: RequestType): string {
  if (type === "CategoryId") {
    return "CategoryID";
  }
  return type;
}

function safeParseJson(raw: unknown): Record<string, unknown> | undefined {
  if (raw && typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function stripHtml(value: string): string {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeImageUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function pickStoreIcon(images: StoreImage[]): string | undefined {
  const candidates = images
    .filter((image) => typeof image.Uri === "string" && image.Uri)
    .map((image) => ({
      ...image,
      purpose: String(image.ImagePurpose ?? "").toLowerCase(),
      width: Number(image.Width ?? 0),
      height: Number(image.Height ?? 0),
    }));

  const logos = candidates.filter((image) => image.purpose === "logo");
  const tiles = candidates.filter((image) => image.purpose === "tile");
  const sorted = [...(logos.length ? logos : tiles)].sort((a, b) => {
    const aScore =
      Math.abs((a.width || 100) - 100) +
      Math.abs((a.height || 100) - 100);
    const bScore =
      Math.abs((b.width || 100) - 100) +
      Math.abs((b.height || 100) - 100);
    return aScore - bScore;
  });

  return normalizeImageUrl(sorted[0]?.Uri);
}

function normalizeRgLanguage(language: string): string {
  const [base, region] = language.split("-");
  if (!base || !region) return language;
  return `${base.toLowerCase()}-${region.toUpperCase()}`;
}

function parseRgHtml(html: string): {
  categoryId?: string;
  files: RgFileRow[];
} {
  const categoryMatch = html.match(/CategoryID:\s*<\/b>\s*<i>([^<]+)<\/i>/i);
  const categoryId = categoryMatch?.[1]?.trim();

  const files: RgFileRow[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let matched: RegExpExecArray | null = rowRegex.exec(html);
  while (matched) {
    const rowHtml = matched[1] ?? "";
    const linkMatch = rowHtml.match(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
    if (!linkMatch?.[1] || !linkMatch[2]) {
      matched = rowRegex.exec(html);
      continue;
    }

    const cellValues = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi))
      .map((cell) => stripHtml(cell[1] ?? ""))
      .filter(Boolean);

    const expires = cellValues.length >= 4 ? cellValues[1] ?? "" : "";
    const hash =
      cellValues.length >= 4
        ? cellValues[cellValues.length - 2] ?? ""
        : cellValues.length >= 2
          ? cellValues[cellValues.length - 1] ?? ""
          : "";
    const size = cellValues.length >= 4 ? cellValues[cellValues.length - 1] ?? "" : "";

    files.push({
      url: decodeHtml(linkMatch[1]),
      name: decodeHtml(linkMatch[2]),
      expires,
      sha1: hash,
      size,
    });
    matched = rowRegex.exec(html);
  }

  return { categoryId, files };
}

async function fetchRgFiles(params: {
  type: RequestType;
  query: string;
  ring: StoreRing;
  language: string;
}): Promise<{ categoryId?: string; files: RgFileRow[] }> {
  const response = await fetch("https://store.rg-adguard.net/api/GetFiles", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": site.userAgent,
      Origin: "https://store.rg-adguard.net",
      Referer: "https://store.rg-adguard.net/",
    },
    body: new URLSearchParams({
      type: mapRequestTypeForRg(params.type),
      url: params.query,
      ring: params.ring,
      lang: normalizeRgLanguage(params.language),
    }).toString(),
    cache: "no-store",
  });

  const html = await response.text();
  if (!response.ok) {
    throw new Error(`下载接口响应错误: ${response.status}`);
  }

  const parsed = parseRgHtml(html);
  if (parsed.files.length === 0) {
    throw new Error("下载接口未返回可用文件");
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") ?? "url") as RequestType;
    const query = searchParams.get("query") ?? "";
    // Default to US / en-us: the global catalog has the widest coverage and
    // avoids empty results for apps that are not published in the CN market.
    const market = (searchParams.get("market") ?? "US").toUpperCase();
    const language = (searchParams.get("language") ?? "en-us").toLowerCase();
    const ring = (searchParams.get("ring") ?? "RP") as StoreRing;

    if (!/^[A-Z]{2}$/.test(market)) {
      return NextResponse.json({ error: "无效市场代码" }, { status: 400 });
    }
    if (!/^[a-z]{2,3}(?:-[a-z]{2})?$/.test(language)) {
      return NextResponse.json({ error: "无效语言代码" }, { status: 400 });
    }
    if (!["WIF", "WIS", "RP", "Retail"].includes(ring)) {
      return NextResponse.json({ error: "无效 ring 参数" }, { status: 400 });
    }

    const storeIdentifier = normalizeStoreIdentifier(type, query);

    let files: RgFileRow[] | undefined;
    let filesError: string | undefined;
    let categoryId: string | undefined;

    try {
      const rgResult = await fetchRgFiles({
        type,
        query: storeIdentifier,
        ring,
        language,
      });
      files = rgResult.files;
      categoryId = rgResult.categoryId;
    } catch (error) {
      filesError = error instanceof Error ? error.message : String(error);
    }

    let product: Record<string, unknown> | undefined;
    const bigId = extractDisplayCatalogBigId(type, storeIdentifier);
    if (bigId) {
      const upstreamUrl =
        `https://displaycatalog.mp.microsoft.com/v7.0/products` +
        `?bigIds=${encodeURIComponent(bigId)}` +
        `&market=${encodeURIComponent(market)}` +
        `&languages=${encodeURIComponent(language)}`;

      const upstream = await fetch(upstreamUrl, {
        headers: {
          "User-Agent": site.userAgent,
          "Accept-Language": `${language},en-us;q=0.8`,
        },
        cache: "no-store",
      });

      if (upstream.ok) {
        const data = (await upstream.json()) as {
          Products?: Array<Record<string, unknown>>;
        };
        product = data.Products?.[0];
      }
    }

    if (!product && !files?.length) {
      return NextResponse.json(
        { error: filesError || "未找到对应产品，请检查 ProductId 或链接" },
        { status: 404 },
      );
    }

    const localizedList = ((product?.LocalizedProperties ?? []) as Array<
      Record<string, unknown>
    >) ?? [];
    const productProperties = ((product?.Properties ?? {}) as Record<
      string,
      unknown
    >) ?? {};
    const localized =
      localizedList.find((item) => {
        const lang = String(item.Language ?? "").toLowerCase();
        return lang === language;
      }) ?? localizedList[0] ?? {};

    const displaySkuAvailabilities = ((product?.DisplaySkuAvailabilities ??
      []) as Array<Record<string, unknown>>) ?? [];
    const images = Array.isArray(localized.Images)
      ? (localized.Images as StoreImage[])
      : [];

    const skus = displaySkuAvailabilities.map((entry) => {
      const sku = (entry.Sku ?? {}) as Record<string, unknown>;
      const properties = (sku.Properties ?? {}) as Record<string, unknown>;
      const availability = ((entry.Availabilities ?? []) as Array<Record<
        string,
        unknown
      >>)[0];

      const packages = ((properties.Packages ?? []) as Array<
        Record<string, unknown>
      >).map((pkg) => ({
        packageFullName: String(pkg.PackageFullName ?? ""),
        packageId: String(pkg.PackageId ?? ""),
        packageFamilyName: String(pkg.PackageFamilyName ?? ""),
        packageFormat: String(pkg.PackageFormat ?? ""),
        version: String(pkg.Version ?? ""),
        architectures: Array.isArray(pkg.Architectures)
          ? pkg.Architectures.map((a) => String(a))
          : [],
        maxDownloadSizeInBytes: Number(pkg.MaxDownloadSizeInBytes ?? 0),
        maxInstallSizeInBytes: Number(pkg.MaxInstallSizeInBytes ?? 0),
        hash: String(pkg.Hash ?? ""),
        contentId: String(pkg.ContentId ?? ""),
        packageUri: String(pkg.PackageUri ?? ""),
        packageDownloadUris: Array.isArray(pkg.PackageDownloadUris)
          ? pkg.PackageDownloadUris.map((u) => String(u))
          : null,
      }));

      const fulfillment = safeParseJson(properties.FulfillmentData);

      return {
        skuId: String(sku.SkuId ?? ""),
        skuType: String(sku.SkuType ?? ""),
        actions: Array.isArray(availability?.Actions)
          ? availability.Actions.map((a) => String(a))
          : [],
        availabilityId: String(availability?.AvailabilityId ?? ""),
        fulfillmentData: fulfillment
          ? {
              productId:
                typeof fulfillment.ProductId === "string"
                  ? fulfillment.ProductId
                  : undefined,
              wuBundleId:
                typeof fulfillment.WuBundleId === "string"
                  ? fulfillment.WuBundleId
                  : undefined,
              wuCategoryId:
                typeof fulfillment.WuCategoryId === "string"
                  ? fulfillment.WuCategoryId
                  : undefined,
              packageFamilyName:
                typeof fulfillment.PackageFamilyName === "string"
                  ? fulfillment.PackageFamilyName
                  : undefined,
              skuId:
                typeof fulfillment.SkuId === "string"
                  ? fulfillment.SkuId
                  : undefined,
            }
          : undefined,
        packages,
      };
    });

    return NextResponse.json({
      productId: String(product?.ProductId ?? extractStoreIdentifierFromUrl(storeIdentifier) ?? storeIdentifier),
      title: String(localized.ProductTitle ?? ""),
      publisherName: String(localized.PublisherName ?? ""),
      description: String(localized.ProductDescription ?? ""),
      iconUrl: pickStoreIcon(images),
      packageFamilyNames: Array.isArray(productProperties.PackageFamilyNames)
        ? (productProperties.PackageFamilyNames as Array<unknown>).map((p) =>
            String(p),
          )
        : [],
      market,
      language,
      categoryId,
      files,
      filesSource: files ? "rg-adguard" : undefined,
      filesError,
      skus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `解析失败: ${message}` }, { status: 500 });
  }
}
