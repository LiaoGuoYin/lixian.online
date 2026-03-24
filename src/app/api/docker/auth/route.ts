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

    // 构建 Docker 认证 URL
    // Docker Hub 认证始终需要完整路径包括 namespace
    const repoPath = `${namespace}/${repository}`;
    const authUrl = `https://auth.docker.io/token?service=registry.docker.io&scope=repository:${repoPath}:pull`;
    
    console.log('Docker 认证请求:', { namespace, repository, repoPath, authUrl });

    // 代理请求到 Docker 认证服务
    console.log('发送认证请求到:', authUrl);
    const response = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'User-Agent': site.userAgent,
        'Accept': 'application/json',
      },
    });
    
    console.log('认证响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Docker 认证失败:', response.status, errorText);
      return NextResponse.json(
        { error: `Docker 认证服务响应错误: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('认证成功:', { hasToken: !!data.token, tokenLength: data.token?.length });

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