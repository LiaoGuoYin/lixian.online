import { NextRequest, NextResponse } from 'next/server';

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

    // 构建 Docker 认证 URL
    const authUrl = `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${namespace}/${repository}:pull`;

    // 代理请求到 Docker 认证服务
    const response = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OffDown/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Docker 认证服务响应错误: ${response.status}` },
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
        'Cache-Control': 'public, max-age=1800', // 缓存30分钟
      },
    });

  } catch (error) {
    console.error('Docker 认证代理错误:', error);
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