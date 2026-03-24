import { NextRequest, NextResponse } from 'next/server';
import { site } from '@/shared/lib/site';

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
    // Docker Registry 始终需要完整路径包括 namespace
    const repoPath = `${namespace}/${repository}`;
    const manifestUrl = `https://registry-1.docker.io/v2/${repoPath}/manifests/${tag}`;
    
    console.log('Docker 清单请求:', { namespace, repository, tag, repoPath, manifestUrl });

    // 代理请求到 Docker Registry
    const response = await fetch(manifestUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
        'User-Agent': site.userAgent,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Docker Registry 清单获取失败:', response.status, errorText);
      return NextResponse.json(
        { error: `Docker Registry 响应错误: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('清单获取成功:', { 
      mediaType: data.mediaType, 
      hasConfig: !!data.config, 
      layerCount: data.layers?.length,
      manifestCount: data.manifests?.length
    });

    // 如果是 manifest list，选择 amd64/linux 版本
    if (data.mediaType === 'application/vnd.docker.distribution.manifest.list.v2+json' ||
        data.mediaType === 'application/vnd.oci.image.index.v1+json') {
      console.log('检测到 manifest list，查找 amd64/linux 版本');
      
      const amd64Manifest = data.manifests?.find((manifest: any) => 
        manifest.platform?.architecture === 'amd64' && 
        manifest.platform?.os === 'linux'
      );
      
      if (!amd64Manifest) {
        return NextResponse.json(
          { error: '未找到 amd64/linux 平台的镜像' },
          { status: 404 }
        );
      }
      
      console.log('找到 amd64 manifest，重新获取具体 manifest');
      
      // 使用 digest 重新获取具体的 manifest
      const specificManifestUrl = `https://registry-1.docker.io/v2/${repoPath}/manifests/${amd64Manifest.digest}`;
      const specificResponse = await fetch(specificManifestUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.docker.distribution.manifest.v2+json',
          'User-Agent': site.userAgent,
        },
      });
      
      if (!specificResponse.ok) {
        const errorText = await specificResponse.text();
        console.error('获取具体 manifest 失败:', specificResponse.status, errorText);
        return NextResponse.json(
          { error: `获取具体 manifest 失败: ${specificResponse.status} - ${errorText}` },
          { status: specificResponse.status }
        );
      }
      
      const specificData = await specificResponse.json();
      console.log('具体 manifest 获取成功:', { hasConfig: !!specificData.config, layerCount: specificData.layers?.length });
      
      return NextResponse.json(specificData, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

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