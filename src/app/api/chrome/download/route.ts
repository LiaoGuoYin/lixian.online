import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const extensionId = searchParams.get('id');

    if (!extensionId) {
      return NextResponse.json(
        { error: '扩展 ID 是必需的' },
        { status: 400 }
      );
    }

    // 验证扩展 ID 格式（32位字母）
    if (!/^[a-z]{32}$/.test(extensionId)) {
      return NextResponse.json(
        { error: '无效的扩展 ID 格式' },
        { status: 400 }
      );
    }

    // 构建 Chrome 更新服务 URL
    const params = new URLSearchParams({
      response: "redirect",
      os: "win",
      arch: "x64",
      os_arch: "x86_64",
      nacl_arch: "x86-64",
      prod: "chromecrx",
      prodchannel: "beta",
      prodversion: "91.0.4472.101",
      lang: "zh-CN",
      acceptformat: "crx2,crx3",
      x: `id=${extensionId}&installsource=ondemand&uc`
    });

    const chromeUrl = `https://clients2.google.com/service/update2/crx?${params.toString()}`;

    // 代理请求到 Chrome 服务器
    const response = await fetch(chromeUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36'
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Chrome 服务器响应错误: ${response.status}` },
        { status: response.status }
      );
    }

    // 获取文件内容
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 返回文件流，设置正确的 headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-chrome-extension',
        'Content-Disposition': `attachment; filename="${extensionId}.crx"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // 缓存1小时
      },
    });

  } catch (error) {
    console.error('Chrome 扩展下载代理错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 处理 OPTIONS 请求（CORS 预检）
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