import { ChromeExtensionInfo, ChromeDownloadInfo, ChromeSearchResult } from "@/features/chrome/types";
import { get } from "@/shared/lib/http";
import { convertCrxToZip } from "@/shared/lib/crx";

class ChromeService {
  // 从 Chrome Web Store URL 中提取扩展 ID
  extractExtensionId(url: string): string {
    if (!url) return "";

    // 支持多种格式：
    // https://chrome.google.com/webstore/detail/extension-name/abcdefghijklmnopqrstuvwxyz123456
    // https://chromewebstore.google.com/detail/extension-name/abcdefghijklmnopqrstuvwxyz123456
    // abcdefghijklmnopqrstuvwxyz123456 (直接ID)
    
    // 匹配 32 位扩展 ID
    const idMatch = url.match(/([a-z]{32})/);
    if (idMatch) {
      return idMatch[1];
    }

    // 如果输入就是32位ID
    if (/^[a-z]{32}$/.test(url.toLowerCase())) {
      return url.toLowerCase();
    }

    throw new Error("无效的 Chrome 扩展 URL 或 ID");
  }

  // 构建下载 URL（使用代理 API）
  buildDownloadUrl(extensionId: string): string {
    // 使用本地 API 代理避免 CORS 问题
    return `/api/chrome/download?id=${extensionId}`;
  }

  // 获取扩展信息（通过 Chrome Web Store 页面代理）
  async getExtensionInfo(extensionId: string): Promise<ChromeExtensionInfo> {
    try {
      const response = await get(`/api/chrome/detail?id=${extensionId}`, {});
      const data = response.data;
      return {
        id: extensionId,
        name: data.name || undefined,
        description: data.description || undefined,
      };
    } catch {
      return { id: extensionId };
    }
  }

  // 生成下载信息
  getDownloadInfo(extensionId: string): ChromeDownloadInfo {
    return {
      extensionId,
      downloadUrl: this.buildDownloadUrl(extensionId),
      filename: `${extensionId}.crx`
    };
  }

  // 验证扩展 ID 格式
  isValidExtensionId(id: string): boolean {
    return /^[a-z]{32}$/.test(id);
  }

  // 从 CRX 文件转换为 ZIP（浏览器环境实现）
  async convertCrxToZip(crxBlob: Blob): Promise<Blob> {
    return convertCrxToZip(crxBlob);
  }

  // 搜索 Chrome 扩展
  async searchExtensions(query: string): Promise<ChromeSearchResult[]> {
    try {
      const response = await get(`/api/chrome/search?q=${encodeURIComponent(query)}`, {});
      return response.data?.results ?? [];
    } catch (error) {
      console.warn('搜索 Chrome 扩展失败:', error);
      return [];
    }
  }

  // 获取文件名
  getFilename(extensionId: string, format: 'crx' | 'zip' = 'crx'): string {
    return `${extensionId}.${format}`;
  }
}

export const chromeService = new ChromeService();
