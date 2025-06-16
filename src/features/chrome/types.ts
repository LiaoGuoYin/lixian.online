export interface ChromeExtensionInfo {
  id: string;
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  rating?: number;
  userCount?: string;
  iconUrl?: string;
}

export interface ChromeDownloadInfo {
  extensionId: string;
  downloadUrl: string;
  filename: string;
  fileSize?: number;
}

export interface ChromeDownloadProgress {
  status: 'idle' | 'downloading' | 'converting' | 'completed' | 'error';
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  error?: string;
}

export interface ChromeWebStoreResponse {
  manifest: {
    name: string;
    version: string;
    description: string;
    author?: string;
  };
  iconUrl: string;
  rating: number;
  userCount: string;
}