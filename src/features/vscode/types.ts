export interface ExtensionInfo {
  publisher: string;
  extension: string;
  version: string | null;
  displayName?: string;
  shortDescription?: string;
  publisherDisplayName?: string;
  iconUrl?: string;
  lastUpdated?: string;
  installCount?: number;
  rating?: number;
  ratingCount?: number;
}

export interface VSCodeExtensionMetadata {
  versionList: string[];
  displayName?: string;
  shortDescription?: string;
  publisherDisplayName?: string;
  iconUrl?: string;
  lastUpdated?: string;
  installCount?: number;
  rating?: number;
  ratingCount?: number;
}
