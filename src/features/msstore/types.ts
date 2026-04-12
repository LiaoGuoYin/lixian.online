export type MSStoreRequestType =
  | "url"
  | "ProductId"
  | "PackageFamilyName"
  | "CategoryId";

export interface MSStoreResolveParams {
  query: string;
}

export interface MSStoreParsedPackage {
  packageFullName: string;
  packageId: string;
  packageFamilyName: string;
  packageFormat: string;
  version: string;
  architectures: string[];
  maxDownloadSizeInBytes: number;
  maxInstallSizeInBytes: number;
  hash: string;
  contentId: string;
  packageUri: string;
  packageDownloadUris: string[] | null;
}

export interface MSStoreDownloadFile {
  name: string;
  url: string;
  expires: string;
  sha1: string;
  size: string;
}

export interface MSStoreParsedSku {
  skuId: string;
  skuType: string;
  actions: string[];
  availabilityId: string;
  fulfillmentData?: {
    productId?: string;
    wuBundleId?: string;
    wuCategoryId?: string;
    packageFamilyName?: string;
    skuId?: string;
  };
  packages: MSStoreParsedPackage[];
}

export interface MSStoreResolveResult {
  productId: string;
  title: string;
  publisherName: string;
  description: string;
  packageFamilyNames: string[];
  market: string;
  language: string;
  files?: MSStoreDownloadFile[];
  filesError?: string;
  skus: MSStoreParsedSku[];
}
