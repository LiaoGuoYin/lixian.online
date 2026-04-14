export interface EdgeExtensionInfo {
  id: string;
  storeProductId?: string;
  name?: string;
  version?: string;
  description?: string;
  shortDescription?: string;
  developer?: string;
  category?: string;
  rating?: number;
  ratingCount?: number;
  activeInstallCount?: number;
  iconUrl?: string;
  isFeatured?: boolean;
}

export interface EdgeDownloadInfo {
  extensionId: string;
  downloadUrl: string;
  filename: string;
}

export interface EdgeDownloadProgress {
  status: "idle" | "downloading" | "converting" | "completed" | "error";
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  error?: string;
}

export interface EdgeSearchResult {
  id: string;
  storeProductId?: string;
  name: string;
  developer?: string;
  description?: string;
  iconUrl?: string;
}
