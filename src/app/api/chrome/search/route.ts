import { NextRequest, NextResponse } from 'next/server';
import { site } from '@/shared/lib/site';
import { parseChromeStoreHtml } from '../store-html';

interface ChromeSearchResult {
  id: string;
  slug: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

async function enrichResult(result: ChromeSearchResult): Promise<ChromeSearchResult> {
  try {
    const detailUrl = `https://chromewebstore.google.com/detail/${result.slug}/${result.id}`;
    const response = await fetch(detailUrl, {
      headers: {
        'User-Agent': site.userAgent,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
    });

    if (!response.ok) return result;
    const html = await response.text();
    const detail = parseChromeStoreHtml(html);
    return {
      ...result,
      name: detail.name || result.name,
      description: detail.description,
      iconUrl: detail.iconUrl,
    };
  } catch {
    return result;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json(
        { error: '缺少搜索关键词' },
        { status: 400 },
      );
    }

    const searchUrl = `https://chromewebstore.google.com/search/${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': site.userAgent,
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Chrome Web Store 响应错误: ${response.status}` },
        { status: response.status },
      );
    }

    const html = await response.text();

    // Extract extension entries from the search result HTML.
    // Pattern: detail/{slug}/{32-char-id}
    const entryRegex = /detail\/([^/]+)\/([a-z]{32})/g;
    const seen = new Set<string>();
    const results: ChromeSearchResult[] = [];

    let match;
    while ((match = entryRegex.exec(html)) !== null) {
      const [, slug, id] = match;
      if (seen.has(id)) continue;
      seen.add(id);
      // Convert slug to readable name: "ublock-origin-lite" → "uBlock Origin Lite"
      const name = slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      results.push({ id, slug, name });
    }

    const topResults = results.slice(0, 10);
    const enrichedHead = await Promise.all(topResults.slice(0, 5).map(enrichResult));
    const enrichedResults = [...enrichedHead, ...topResults.slice(5)].map(
      ({ slug: _slug, ...result }) => result,
    );

    return NextResponse.json({ results: enrichedResults });
  } catch (error) {
    return NextResponse.json(
      { error: `搜索失败: ${error}` },
      { status: 500 },
    );
  }
}
