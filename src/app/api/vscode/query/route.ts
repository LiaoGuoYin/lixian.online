import { NextRequest, NextResponse } from 'next/server';
import { site } from '@/shared/lib/site';

const MARKETPLACE_URL = 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(MARKETPLACE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;api-version=3.0-preview.1',
        'User-Agent': site.userAgent,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Marketplace API error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: `代理请求失败: ${error}` },
      { status: 500 },
    );
  }
}
