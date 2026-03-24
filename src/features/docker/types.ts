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

export interface DockerSearchCandidate {
  namespace: string;
  repository: string;
  shortDescription: string;
  starCount: number;
  pullCount: number;
}

export interface DockerDownloadProgress {
  layerIndex: number;
  totalLayers: number;
  currentLayerSize: number;
  downloadedSize: number;
  totalSize: number;
  status: 'downloading' | 'completed' | 'error';
}
