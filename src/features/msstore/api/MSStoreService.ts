import {
  MSStoreRequestType,
  MSStoreResolveParams,
  MSStoreResolveResult,
} from "../types";
import { get } from "@/shared/lib/http";

const PLACEHOLDER =
  "Microsoft Store 链接、ProductId、PackageFamilyName 或 CategoryId";

export interface MSStoreExample {
  label: string;
  value: string;
}

const EXAMPLES: MSStoreExample[] = [
  {
    label: "Windows Terminal",
    value: "https://apps.microsoft.com/detail/9n0dx20hk701",
  },
  {
    label: "Codex",
    value: "https://apps.microsoft.com/detail/9plm9xgg6vks",
  },
];

const PRODUCT_ID_PATTERN = /^[A-Za-z0-9]{12}$/;
const PACKAGE_FAMILY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*_[A-Za-z0-9]+$/;
const CATEGORY_ID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

class MSStoreService {
  // Default to US / en-us because the global Microsoft Store catalog has the
  // widest coverage on this market. CN market frequently returns empty results
  // for apps that are only published internationally.
  private readonly market = "US";

  private readonly language = "en-us";

  getPlaceholder(): string {
    return PLACEHOLDER;
  }

  getExamples(): MSStoreExample[] {
    return EXAMPLES;
  }

  detectRequestType(query: string): MSStoreRequestType | null {
    const value = query.trim();
    if (!value) return null;

    // URL: explicit scheme or well-known Microsoft Store host
    if (/^https?:\/\//i.test(value)) return "url";
    if (
      /(^|\/)(apps\.microsoft\.com|microsoft\.com\/[^\s]*store)/i.test(value)
    ) {
      return "url";
    }

    if (CATEGORY_ID_PATTERN.test(value)) return "CategoryId";
    if (PACKAGE_FAMILY_NAME_PATTERN.test(value)) return "PackageFamilyName";
    if (PRODUCT_ID_PATTERN.test(value)) return "ProductId";

    return null;
  }

  async resolve(params: MSStoreResolveParams): Promise<MSStoreResolveResult> {
    const query = params.query.trim();
    if (!query) {
      throw new Error("请输入要解析的内容");
    }

    const type = this.detectRequestType(query);
    if (!type) {
      throw new Error(
        "无法识别输入类型，请输入 Microsoft Store 链接、ProductId（12 位）、PackageFamilyName 或 CategoryId（UUID）",
      );
    }

    const response = await get("/api/msstore/resolve", {
      type,
      query,
      market: this.market,
      language: this.language,
    });

    return response.data as MSStoreResolveResult;
  }
}

export const msStoreService = new MSStoreService();
