const CRX_ID_PATTERN = /^[a-z]{32}$/;
const STORE_PRODUCT_ID_PATTERN = /^[A-Za-z0-9]{12}$/;

export type EdgeInput =
  | {
      type: "crxId";
      value: string;
    }
  | {
      type: "storeProductId";
      value: string;
    };

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(`https://${raw}`);
    } catch {
      return null;
    }
  }
}

export function isEdgeCrxId(value: string): boolean {
  return CRX_ID_PATTERN.test(value);
}

export function parseEdgeQuery(query: string): EdgeInput | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const lowerValue = trimmed.toLowerCase();
  if (CRX_ID_PATTERN.test(lowerValue)) {
    return { type: "crxId", value: lowerValue };
  }

  if (STORE_PRODUCT_ID_PATTERN.test(trimmed)) {
    return { type: "storeProductId", value: trimmed.toUpperCase() };
  }

  const parsedUrl = parseUrl(trimmed);
  if (!parsedUrl) {
    return null;
  }

  const urlMatch = parsedUrl.href.toLowerCase().match(/([a-z]{32})/);
  if (urlMatch?.[1]) {
    return { type: "crxId", value: urlMatch[1] };
  }

  const productId =
    parsedUrl.searchParams.get("productId") ??
    parsedUrl.searchParams.get("productid") ??
    parsedUrl.searchParams.get("itemId") ??
    parsedUrl.searchParams.get("itemid");

  if (productId && STORE_PRODUCT_ID_PATTERN.test(productId)) {
    return { type: "storeProductId", value: productId.toUpperCase() };
  }

  return null;
}
