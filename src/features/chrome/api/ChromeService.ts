import { ChromeExtensionInfo, ChromeDownloadInfo, ChromeSearchResult } from "@/features/chrome/types";
import { get } from "@/shared/lib/http";

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
    try {
      const buffer = await crxBlob.arrayBuffer();
      
      // 如果文件太小，直接返回原文件
      if (buffer.byteLength < 16) {
        console.warn('文件太小，可能已经是 ZIP 格式');
        return crxBlob;
      }
      
      const view = new DataView(buffer);
      
      // 检查是否已经是 ZIP 文件（PK 魔数）
      const zipMagic = new TextDecoder().decode(buffer.slice(0, 2));
      if (zipMagic === "PK") {
        console.log('文件已经是 ZIP 格式');
        return new Blob([buffer], { type: 'application/zip' });
      }
      
      // 检查 CRX 魔数
      const magic = new TextDecoder().decode(buffer.slice(0, 4));
      let zipOffset = 0;
      
      if (magic === "Cr24") {
        // 标准 CRX 格式
        const version = view.getUint32(4, true);
        
        if (version === 3) {
          // CRX3 格式
          if (buffer.byteLength < 12) {
            throw new Error("CRX3 文件头不完整");
          }
          const headerSize = view.getUint32(8, true);
          zipOffset = 12 + headerSize;
        } else if (version === 2) {
          // CRX2 格式
          if (buffer.byteLength < 16) {
            throw new Error("CRX2 文件头不完整");
          }
          const pubKeyLength = view.getUint32(8, true);
          const sigLength = view.getUint32(12, true);
          zipOffset = 16 + pubKeyLength + sigLength;
        } else {
          throw new Error(`不支持的 CRX 版本: ${version}`);
        }
      } else {
        // 尝试查找 ZIP 魔数 "PK"
        console.warn('没有找到 CRX 魔数，尝试查找 ZIP 数据');
        
        for (let i = 0; i < Math.min(buffer.byteLength - 2, 1024); i++) {
          const testMagic = new TextDecoder().decode(buffer.slice(i, i + 2));
          if (testMagic === "PK") {
            zipOffset = i;
            break;
          }
        }
        
        if (zipOffset === 0) {
          // 如果找不到 ZIP 魔数，假设整个文件就是 ZIP
          console.warn('未找到 ZIP 魔数，假设整个文件为 ZIP 格式');
          return new Blob([buffer], { type: 'application/zip' });
        }
      }
      
      // 验证 ZIP 偏移量
      if (zipOffset >= buffer.byteLength) {
        throw new Error('ZIP 数据偏移量超出文件范围');
      }
      
      // 提取 ZIP 数据并验证
      const zipData = buffer.slice(zipOffset);
      
      // 验证提取的数据是否为有效的 ZIP
      if (zipData.byteLength < 4) {
        throw new Error('提取的 ZIP 数据太小');
      }
      
      const zipHeader = new TextDecoder().decode(zipData.slice(0, 2));
      if (zipHeader !== "PK") {
        throw new Error('提取的数据不是有效的 ZIP 格式');
      }
      
      return new Blob([zipData], { type: 'application/zip' });
      
    } catch (error) {
      console.error('CRX 转 ZIP 失败:', error);
      // 返回原文件作为备选方案
      console.warn('转换失败，返回原始文件');
      return crxBlob;
    }
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