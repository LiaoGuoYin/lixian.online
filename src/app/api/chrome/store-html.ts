function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function normalizeAssetUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function getAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, "i"),
  );
  return match?.[2] ? decodeHtml(match[2].trim()) : undefined;
}

function getMetaContent(html: string, names: string[]): string | undefined {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const metaRegex = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null = metaRegex.exec(html);

  while (match) {
    const tag = match[0];
    const metaName = (
      getAttribute(tag, "name") ?? getAttribute(tag, "property")
    )?.toLowerCase();
    if (metaName && normalizedNames.includes(metaName)) {
      const content = getAttribute(tag, "content");
      if (content) return content;
    }
    match = metaRegex.exec(html);
  }

  return undefined;
}

export function parseChromeStoreHtml(html: string) {
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]
    ? decodeHtml(titleMatch[1])
        .replace(/\s*[-–—]\s*Chrome[^<]*$/i, "")
        .trim()
    : undefined;

  const description = getMetaContent(html, ["description"])?.trim();
  const iconUrl = normalizeAssetUrl(
    getMetaContent(html, ["og:image", "twitter:image"]),
  );

  return {
    name: title || undefined,
    description: description || undefined,
    iconUrl,
  };
}
