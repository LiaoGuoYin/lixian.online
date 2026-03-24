import { NextRequest, NextResponse } from 'next/server';
import { site } from '@/shared/lib/site';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publisher = searchParams.get('publisher');
    const extension = searchParams.get('extension');
    const version = searchParams.get('version');

    if (!publisher || !extension || !version) {
      return NextResponse.json(
        { error: '缺少参数: publisher, extension, version' },
        { status: 400 },
      );
    }

    const vsixUrl = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extension}/${version}/vspackage`;

    const response = await fetch(vsixUrl, {
      headers: { 'User-Agent': site.userAgent },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `下载失败: ${response.status}` },
        { status: response.status },
      );
    }

    const blob = await response.arrayBuffer();
    const filename = `${publisher}.${extension}-${version}.vsix`;

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': blob.byteLength.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: `代理下载失败: ${error}` },
      { status: 500 },
    );
  }
}
