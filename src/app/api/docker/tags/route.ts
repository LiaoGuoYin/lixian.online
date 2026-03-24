import { NextRequest, NextResponse } from 'next/server';
import { site } from '@/shared/lib/site';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get('namespace') || 'library';
    const repository = searchParams.get('repository');

    if (!repository) {
      return NextResponse.json(
        { error: '仓库名称是必需的' },
        { status: 400 }
      );
    }

    // 构建 Docker Hub API URL
    const dockerHubUrl = `https://registry.hub.docker.com/v2/repositories/${namespace}/${repository}/tags?page_size=100`;

    // 代理请求到 Docker Hub
    const response = await fetch(dockerHubUrl, {
      method: 'GET',
      headers: {
        'User-Agent': site.userAgent,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Docker Hub API 响应错误: ${response.status}` },
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
        'Cache-Control': 'public, max-age=300', // 缓存5分钟
      },
    });

  } catch (error) {
    console.error('Docker 标签代理错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
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