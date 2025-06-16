import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get('namespace') || 'library';
    const repository = searchParams.get('repository');
    const tag = searchParams.get('tag') || 'latest';
    const token = searchParams.get('token');

    if (!repository) {
      return NextResponse.json(
        { error: '仓库名称是必需的' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: '认证令牌是必需的' },
        { status: 401 }
      );
    }

    // 构建 Docker Registry 清单 URL
    const manifestUrl = `https://registry-1.docker.io/v2/${namespace}/${repository}/manifests/${tag}`;

    // 代理请求到 Docker Registry
    const response = await fetch(manifestUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
        'User-Agent': 'Mozilla/5.0 (compatible; OffDown/1.0)',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Docker Registry 响应错误: ${response.status}` },
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
        'Cache-Control': 'public, max-age=3600', // 缓存1小时
      },
    });

  } catch (error) {
    console.error('Docker 清单代理错误:', error);
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