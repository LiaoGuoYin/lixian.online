import { NextRequest, NextResponse } from 'next/server';
import { site } from '@/shared/lib/site';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const rawPageSize = Number(searchParams.get('page_size') || 5);
    const pageSize = Number.isFinite(rawPageSize) ? Math.min(100, Math.max(1, Math.floor(rawPageSize))) : 5;

    if (!query) {
      return NextResponse.json(
        { error: '搜索关键词是必需的' },
        { status: 400 }
      );
    }

    const dockerHubUrl = `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(query)}&page_size=${pageSize}`;
    const response = await fetch(dockerHubUrl, {
      method: 'GET',
      headers: {
        'User-Agent': site.userAgent,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Docker Hub 搜索 API 响应错误: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Docker 搜索代理错误:', error);
    const cause = (error as { cause?: { code?: string } })?.cause;
    const isTimeout = cause?.code === 'UND_ERR_CONNECT_TIMEOUT';
    const message = isTimeout
      ? '连接 Docker Hub 超时，请检查网络环境或稍后重试'
      : '无法连接 Docker Hub，请检查网络环境';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
