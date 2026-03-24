export interface DockerImageInfo {
  registry: string;
  namespace: string;
  repository: string;
  tag: string;
}

export interface DockerManifest {
  schemaVersion: number;
  mediaType: string;
  config: {
    mediaType: string;
    size: number;
    digest: string;
  };
  layers: Array<{
    mediaType: string;
    size: number;
    digest: string;
  }>;
}

export interface DockerTagInfo {
  name: string;
  tags: string[];
}

export interface DockerSearchResult {
  repo_name: string;
  short_description: string;
  star_count: number;
  is_official: boolean;
}

export interface DockerDownloadProgress {
  layerIndex: number;
  totalLayers: number;
  currentLayerSize: number;
  downloadedSize: number;
  totalSize: number;
  status: 'downloading' | 'completed' | 'error';
}