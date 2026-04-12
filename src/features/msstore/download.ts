import { MSStoreDownloadFile } from "./types";

export function normalizeMSStoreDownloadUrl(url: string): string {
  return url.replace(/^http:\/\//i, "https://");
}

export function getMSStoreDownloadHref(file: MSStoreDownloadFile): string {
  return normalizeMSStoreDownloadUrl(file.url);
}
