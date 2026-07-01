import {
  ExtensionInfo,
  VSCodeExtensionMetadata,
} from "@/features/vscode/types";
import { post } from "@/shared/lib/http";

interface MarketplaceStatistic {
  statisticName?: string;
  value?: number;
}

interface MarketplaceVersionFile {
  assetType?: string;
  source?: string;
}

interface MarketplaceVersion {
  version?: string;
  lastUpdated?: string;
  files?: MarketplaceVersionFile[];
  assetUri?: string;
}

interface MarketplaceExtension {
  displayName?: string;
  shortDescription?: string;
  publisher?: {
    displayName?: string;
    publisherName?: string;
  };
  statistics?: MarketplaceStatistic[];
  versions?: MarketplaceVersion[];
}

const INCLUDE_VERSIONS = 0x1;
const INCLUDE_FILES = 0x2;
const INCLUDE_STATISTICS = 0x80;
const INCLUDE_ASSET_URI = 0x100;

function getStatistic(
  statistics: MarketplaceStatistic[] | undefined,
  name: string,
): number | undefined {
  const found = statistics?.find(
    (item) => item.statisticName?.toLowerCase() === name.toLowerCase(),
  );
  return typeof found?.value === "number" ? found.value : undefined;
}

function getIconUrl(version: MarketplaceVersion | undefined): string | undefined {
  const iconFile = version?.files?.find(
    (file) => file.assetType === "Microsoft.VisualStudio.Services.Icons.Default",
  );
  if (iconFile?.source) return iconFile.source;
  if (version?.assetUri) {
    return `${version.assetUri}/Microsoft.VisualStudio.Services.Icons.Default`;
  }
  return undefined;
}

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

  async getExtensionMetadata(
    extensionInfo: ExtensionInfo,
    maxVersions = 20,
  ): Promise<VSCodeExtensionMetadata> {
    const url = `/api/vscode/query`;
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
          pageSize: 1,
          sortBy: 0,
          sortOrder: 0,
        },
      ],
      flags:
        INCLUDE_VERSIONS |
        INCLUDE_FILES |
        INCLUDE_STATISTICS |
        INCLUDE_ASSET_URI,
    };

    const response = await post(url, payload);

    const extensions = response.data?.results?.[0]?.extensions;
    if (!extensions?.length) {
      throw new Error("未找到该插件，请检查 URL 是否正确");
    }

    const extension = extensions[0] as MarketplaceExtension;
    const versions = extension.versions ?? [];
    const unique = [
      ...new Set(versions.map((version) => version.version).filter(Boolean)),
    ] as string[];
    const latestVersion = versions[0];

    return {
      versionList: unique.slice(0, maxVersions),
      displayName: extension.displayName,
      shortDescription: extension.shortDescription,
      publisherDisplayName:
        extension.publisher?.displayName ?? extension.publisher?.publisherName,
      iconUrl: getIconUrl(latestVersion),
      lastUpdated: latestVersion?.lastUpdated,
      installCount: getStatistic(extension.statistics, "install"),
      rating: getStatistic(extension.statistics, "averagerating"),
      ratingCount: getStatistic(extension.statistics, "ratingcount"),
    };
  }

  async getVersionList(
    extensionInfo: ExtensionInfo,
    maxVersions = 20,
  ): Promise<string[]> {
    const metadata = await this.getExtensionMetadata(extensionInfo, maxVersions);
    return metadata.versionList;
  }

  async getDownloadUrl(extensionInfo: ExtensionInfo): Promise<string> {
    if (!extensionInfo.version) {
      throw new Error("Version is not set");
    }
    return `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${extensionInfo.publisher}/vsextensions/${extensionInfo.extension}/${extensionInfo.version}/vspackage`;
  }
}

export const vscodeService = new VSCodeService();
