import { NextRequest, NextResponse } from 'next/server';
import { site } from '@/shared/lib/site';
import { parseChromeStoreHtml } from '../store-html';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const extensionId = searchParams.get('id');

    if (!extensionId || !/^[a-z]{32}$/.test(extensionId)) {
      return NextResponse.json(
        { error: '无效的扩展 ID' },
        { status: 400 },
      );
    }

    const detailUrl = `https://chromewebstore.google.com/detail/${extensionId}`;
    const response = await fetch(detailUrl, {
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

    const parsed = parseChromeStoreHtml(html);

    return NextResponse.json({
      id: extensionId,
      ...parsed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `获取扩展信息失败: ${error}` },
      { status: 500 },
    );
  }
}
