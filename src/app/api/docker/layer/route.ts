import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const namespace = searchParams.get('namespace');
  const repository = searchParams.get('repository');
  const digest = searchParams.get('digest');
  const token = searchParams.get('token');

  if (!namespace || !repository || !digest || !token) {
    return NextResponse.json(
      { error: "Missing required parameters: namespace, repository, digest, token" },
      { status: 400 }
    );
  }

  try {
    // 构建 Docker Registry 层下载 URL
    // Docker Registry 始终需要完整路径包括 namespace
    const repoPath = `${namespace}/${repository}`;
    const layerUrl = `https://registry-1.docker.io/v2/${repoPath}/blobs/${digest}`;
    
    console.log('正在下载层:', layerUrl);

    const response = await fetch(layerUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json',
      },
    });

    if (!response.ok) {
      console.error('层下载失败:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Failed to download layer: ${response.statusText}` },
        { status: response.status }
      );
    }

    if (!response.body) {
      return NextResponse.json(
        { error: "Docker Registry returned empty response" },
        { status: 502 }
      );
    }

    // Stream the layer directly to the client — avoids buffering large layers in Node.js memory
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Length': response.headers.get('Content-Length') || '',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Docker 层下载代理错误:', error);
    return NextResponse.json(
      { error: "Internal server error during layer download" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}