export interface ExtensionInfo {
  publisher: string;
  extension: string;
  version: string | null;
}

export interface VersionInfo {
  lastUpdated: string;
  shortDescription: string;
  versionList: string[];
}
