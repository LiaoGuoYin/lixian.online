import { ExtensionInfo } from "@/features/vscode/types";
import { post } from "@/shared/lib/http";

// VSCode marketplace requires this specific Accept header
const VSCODE_API_HEADERS = {
  Accept: "application/json;api-version=3.0-preview.1",
};

class VSCodeService {
  extractExtensionInfo(url: string): ExtensionInfo {
    if (!url) return { publisher: "", extension: "", version: null };

    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      // Not a valid URL yet (user still typing) — return empty
      return { publisher: "", extension: "", version: null };
    }

    const itemName = urlObj.searchParams.get("itemName");
    if (!itemName) {
      throw new Error(
        "无效的插件 URL，示例：https://marketplace.visualstudio.com/items?itemName=ms-python.python"
      );
    }

    // Use lastIndexOf so publishers/extensions containing dots are handled correctly
    const dotIndex = itemName.lastIndexOf(".");
    if (dotIndex === -1) {
      throw new Error("无效的插件 ID 格式，应为 publisher.extension");
    }

    return {
      publisher: itemName.substring(0, dotIndex),
      extension: itemName.substring(dotIndex + 1),
      version: null,
    };
  }

  async getVersionList(extensionInfo: ExtensionInfo): Promise<string[]> {
    const url = `https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery`;
    const payload = {
      filters: [
        {
          criteria: [
            {
              filterType: 7,
              value: `${extensionInfo.publisher}.${extensionInfo.extension}`,
            },
          ],
          pageNumber: 1,
          pageSize: 100,
          sortBy: 0,
          sortOrder: 0,
        },
      ],
      flags: 402,
    };

    const response = await post(url, payload, VSCODE_API_HEADERS);

    const extensions = response.data?.results?.[0]?.extensions;
    if (!extensions?.length) {
      throw new Error("未找到该插件，请检查 URL 是否正确");
    }

    const versionList: { version: string }[] = extensions[0].versions ?? [];
    return versionList.map((v) => v.version).filter(Boolean);
  }

  async getDownloadUrl(extensionInfo: ExtensionInfo): Promise<string> {
    if (!extensionInfo.version) {
      throw new Error("Version is not set");
    }
    return `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${extensionInfo.publisher}/vsextensions/${extensionInfo.extension}/${extensionInfo.version}/vspackage`;
  }
}

export const vscodeService = new VSCodeService();
