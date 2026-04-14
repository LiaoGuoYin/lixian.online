import { get } from "@/shared/lib/http";
import { convertCrxToZip } from "@/shared/lib/crx";
import {
  EdgeDownloadInfo,
  EdgeExtensionInfo,
  EdgeSearchResult,
} from "@/features/edge/types";
import { parseEdgeQuery } from "@/features/edge/utils/edgeInput";

function normalizeAssetUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

class EdgeService {
  resolveQuery(query: string) {
    const parsed = parseEdgeQuery(query);
    if (!parsed) {
      throw new Error("无效的 Edge 扩展 ID、ProductId 或商店链接");
    }
    return parsed;
  }

  buildDownloadUrl(extensionId: string): string {
    return `/api/edge/download?id=${extensionId}`;
  }

  async getExtensionInfo(query: string): Promise<EdgeExtensionInfo> {
    const parsed = this.resolveQuery(query);
    const response = await get("/api/edge/detail", { query });
    const data = response.data ?? {};

    return {
      id:
        typeof data.crxId === "string"
          ? data.crxId
          : parsed.type === "crxId"
            ? parsed.value
            : "",
      storeProductId:
        typeof data.storeProductId === "string" ? data.storeProductId : undefined,
      name: typeof data.name === "string" ? data.name : undefined,
      version: typeof data.version === "string" ? data.version : undefined,
      description:
        typeof data.description === "string" ? data.description.trim() : undefined,
      shortDescription:
        typeof data.shortDescription === "string"
          ? data.shortDescription.trim()
          : undefined,
      developer: typeof data.developer === "string" ? data.developer : undefined,
      category: typeof data.category === "string" ? data.category : undefined,
      rating:
        typeof data.averageRating === "number" ? data.averageRating : undefined,
      ratingCount: typeof data.ratingCount === "number" ? data.ratingCount : undefined,
      activeInstallCount:
        typeof data.activeInstallCount === "number"
          ? data.activeInstallCount
          : undefined,
      iconUrl: normalizeAssetUrl(data.logoUrl),
      isFeatured:
        typeof data.isBadgedAsFeatured === "boolean"
          ? data.isBadgedAsFeatured
          : undefined,
    };
  }

  getDownloadInfo(extensionId: string): EdgeDownloadInfo {
    return {
      extensionId,
      downloadUrl: this.buildDownloadUrl(extensionId),
      filename: `${extensionId}.crx`,
    };
  }

  async searchExtensions(query: string): Promise<EdgeSearchResult[]> {
    const response = await get("/api/edge/search", { q: query });
    return response.data?.results ?? [];
  }

  async convertCrxToZip(crxBlob: Blob): Promise<Blob> {
    return convertCrxToZip(crxBlob);
  }

  getFilename(extensionId: string, format: "crx" | "zip" = "crx"): string {
    return `${extensionId}.${format}`;
  }
}

export const edgeService = new EdgeService();
