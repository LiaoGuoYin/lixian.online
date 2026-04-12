import type { Page, Route } from "@playwright/test";
import { gzipSync } from "node:zlib";

export const vscodeExtensionUrl =
  "https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code";
export const chromeExtensionId = "cjpalhdlnbpafiamejdnhcphjbkeiagm";
export const dockerImage = "nginx:latest";
export const msstoreProductUrl =
  "https://apps.microsoft.com/detail/9n0dx20hk701?hl=zh-CN&gl=CN";
export const msstoreProductId = "9N0DX20HK701";
export const msstoreFileName =
  "Microsoft.WindowsTerminal_1.22.11781.0_x64__8wekyb3d8bbwe.msixbundle";
export const msstoreDownloadUrl =
  "https://tlu.dl.delivery.mp.microsoft.com/filestreamingservice/files/sample-msix";
export const msstoreHttpDownloadUrl =
  "http://tlu.dl.delivery.mp.microsoft.com/filestreamingservice/files/sample-msix";

const emptyZipBuffer = Buffer.from(
  "504b0506000000000000000000000000000000000000",
  "hex",
);

const dockerLayerGzip = gzipSync(Buffer.alloc(1024));

type MockDockerOptions = {
  includeInvalidLayer?: boolean;
};

function fulfillJson(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}

export async function mockVsCodeApi(page: Page) {
  await page.route("**/api/vscode/query", async (route) => {
    await fulfillJson(route, {
      results: [
        {
          extensions: [
            {
              versions: [
                { version: "1.2.3" },
                { version: "1.2.2" },
                { version: "1.2.3" },
              ],
            },
          ],
        },
      ],
    });
  });
}

export async function mockChromeApis(page: Page) {
  await page.route("**/api/chrome/detail**", async (route) => {
    await fulfillJson(route, {
      id: chromeExtensionId,
      name: "uBlock Origin",
      description: "A fast and trusted content blocker.",
    });
  });

  await page.route("**/api/chrome/download**", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "application/x-chrome-extension",
        "Content-Length": String(emptyZipBuffer.length),
      },
      body: emptyZipBuffer,
    });
  });
}

export async function mockDockerApis(page: Page, options: MockDockerOptions = {}) {
  await page.route("**/api/docker/tags**", async (route) => {
    await fulfillJson(route, {
      results: [{ name: "latest" }, { name: "alpine" }],
    });
  });

  await page.route("**/api/docker/auth**", async (route) => {
    await fulfillJson(route, {
      token: "docker-token",
    });
  });

  await page.route("**/api/docker/manifest**", async (route) => {
    const layers = [
      {
        mediaType: "application/vnd.docker.image.rootfs.diff.tar.gzip",
        size: dockerLayerGzip.length,
        digest: `sha256:${"a".repeat(64)}`,
      },
    ];

    if (options.includeInvalidLayer) {
      layers.unshift(undefined as never);
    }

    await fulfillJson(route, {
      schemaVersion: 2,
      mediaType: "application/vnd.docker.distribution.manifest.v2+json",
      config: {
        mediaType: "application/vnd.docker.container.image.v1+json",
        size: 7023,
        digest: `sha256:${"b".repeat(64)}`,
      },
      layers,
    });
  });

  await page.route("**/api/docker/layer**", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(dockerLayerGzip.length),
      },
      body: dockerLayerGzip,
    });
  });
}

export async function mockMsStoreApi(
  page: Page,
  options: { downloadUrl?: string } = {},
) {
  await page.route("**/api/msstore/resolve**", async (route) => {
    await fulfillJson(route, {
      productId: msstoreProductId,
      title: "Windows Terminal",
      publisherName: "Microsoft Corporation",
      description: "The new Windows Terminal.",
      packageFamilyNames: ["Microsoft.WindowsTerminal_8wekyb3d8bbwe"],
      market: "CN",
      language: "zh-cn",
      files: [
        {
          name: msstoreFileName,
          url: options.downloadUrl ?? msstoreDownloadUrl,
          expires: "2026-04-12 00:00:00 UTC",
          sha1: "abc123def456",
          size: "12.3 MB",
        },
      ],
      skus: [],
    });
  });
}
