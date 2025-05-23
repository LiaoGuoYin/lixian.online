import { ExtensionInfo, VersionInfo } from "@/types/VSCode";
import { post } from "@/utils/http";

class VSCodeService {
  extractExtensionInfo(url: string): ExtensionInfo {
    const urlObj = new URL(url);
    const itemName = urlObj.searchParams.get("itemName");
    if (!itemName) {
      throw new Error(
        "无效的插件 URL, Example: https://marketplace.visualstudio.com/items?itemName=ms-python.python"
      );
    }
    const [pub, ext] = itemName.split(".");
    return { publisher: pub, extension: ext, version: null };
  }

  async getVersionList(extensionInfo: ExtensionInfo): Promise<VersionInfo> {
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

    const response = await post(url, payload);

    const {
      publisher: publisherDict,
      lastUpdated,
      shortDescription,
      versions: versionList,
    } = response.data.results[0].extensions[0];

    const versionNumbers = versionList.map((v: any) => v.version);
    return {
      lastUpdated,
      shortDescription,
      versionList: versionNumbers,
    };
  }

  async getDownloadUrl(extensionInfo: ExtensionInfo): Promise<string> {
    if (!extensionInfo.version) {
      throw new Error("Version is not set");
    }
    const url = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${extensionInfo.publisher}/vsextensions/${extensionInfo.extension}/${extensionInfo.version}/vspackage`;
    // const { response } = (await get(url, {})).data;
    // return response.data;
    return url;
  }
}

export const vscodeService = new VSCodeService();
