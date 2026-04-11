import { expect, test } from "@playwright/test";
import {
  chromeExtensionId,
  dockerImage,
  mockChromeApis,
  mockDockerApis,
  mockMsStoreApi,
  mockVsCodeApi,
  msstoreDownloadUrl,
  msstoreProductId,
  msstoreProductUrl,
  vscodeExtensionUrl,
} from "./fixtures";

test("VSCode flow generates a direct VSIX link", async ({ page }) => {
  await mockVsCodeApi(page);

  await page.goto("/");

  await page.getByTestId("vscode-input").fill(vscodeExtensionUrl);
  await page.getByTestId("vscode-submit").click();

  await page.getByRole("button", { name: "选择版本" }).click();
  await page.getByRole("button", { name: "1.2.3" }).click();

  await expect(page.getByTestId("vscode-download-link")).toHaveAttribute(
    "href",
    "https://marketplace.visualstudio.com/_apis/public/gallery/publishers/anthropic/vsextensions/claude-code/1.2.3/vspackage",
  );
});

test("Chrome flow prepares CRX and ZIP downloads", async ({ page }) => {
  await mockChromeApis(page);

  await page.goto("/");
  await page.getByTestId("tab-chrome").click();

  await page.getByTestId("chrome-input").fill(chromeExtensionId);
  await page.getByTestId("chrome-submit").click();

  await expect(page.getByText("uBlock Origin")).toBeVisible();
  await expect(
    page.getByText("A fast and trusted content blocker."),
  ).toBeVisible();

  await page.getByTestId("chrome-download-both").click();

  await expect(page.getByTestId("chrome-download-crx-link")).toHaveAttribute(
    "download",
    `${chromeExtensionId}.crx`,
  );
  await expect(page.getByTestId("chrome-download-zip-link")).toHaveAttribute(
    "download",
    `${chromeExtensionId}.zip`,
  );
  await expect(page.getByTestId("chrome-download-crx-link")).toHaveAttribute(
    "href",
    /blob:/,
  );
  await expect(page.getByTestId("chrome-download-zip-link")).toHaveAttribute(
    "href",
    /blob:/,
  );
});

test("Docker flow prepares a docker load tarball", async ({ page }) => {
  await mockDockerApis(page);

  await page.goto("/");
  await page.getByTestId("tab-docker").click();

  await page.getByTestId("docker-input").fill(dockerImage);
  await page.getByTestId("docker-submit").click();

  await expect(page.getByText("标签: latest")).toBeVisible();

  await page.getByTestId("docker-download").click();

  await expect(page.getByTestId("docker-download-link")).toHaveAttribute(
    "download",
    "nginx-latest.tar",
  );
  await expect(page.getByTestId("docker-download-link")).toHaveAttribute(
    "href",
    /blob:/,
  );
});

test("Docker flow tolerates invalid manifest layers", async ({ page }) => {
  await mockDockerApis(page, { includeInvalidLayer: true });

  await page.goto("/");
  await page.getByTestId("tab-docker").click();

  await page.getByTestId("docker-input").fill(dockerImage);
  await page.getByTestId("docker-submit").click();

  await expect(page.getByText("标签: latest")).toBeVisible();
  await expect(page.getByText("镜像层（1 层）")).toBeVisible();

  await page.getByTestId("docker-download").click();

  await expect(page.getByTestId("docker-download-link")).toHaveAttribute(
    "download",
    "nginx-latest.tar",
  );
});

test("MSStore flow renders a download link from a store URL", async ({
  page,
}) => {
  await mockMsStoreApi(page);
  const resolveRequest = page.waitForRequest((request) =>
    request.url().includes("/api/msstore/resolve"),
  );

  await page.goto("/");
  await page.getByTestId("tab-msstore").click();

  await page.getByTestId("msstore-input").fill(msstoreProductUrl);
  await page.getByTestId("msstore-submit").click();

  const request = await resolveRequest;
  const params = new URL(request.url()).searchParams;
  expect(params.get("type")).toBe("url");
  expect(params.get("query")).toBe(msstoreProductUrl);

  await expect(page.getByTestId("msstore-download-link")).toHaveAttribute(
    "href",
    msstoreDownloadUrl,
  );
});

test("MSStore flow auto-detects a raw ProductId", async ({ page }) => {
  await mockMsStoreApi(page);
  const resolveRequest = page.waitForRequest((request) =>
    request.url().includes("/api/msstore/resolve"),
  );

  await page.goto("/");
  await page.getByTestId("tab-msstore").click();

  await page.getByTestId("msstore-input").fill(msstoreProductId);
  await page.getByTestId("msstore-submit").click();

  const request = await resolveRequest;
  const params = new URL(request.url()).searchParams;
  expect(params.get("type")).toBe("ProductId");
  expect(params.get("query")).toBe(msstoreProductId);

  await expect(page.getByTestId("msstore-download-link")).toBeVisible();
});

test("MSStore flow rejects unrecognized input without calling the API", async ({
  page,
}) => {
  await mockMsStoreApi(page);
  let resolveCalls = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/msstore/resolve")) {
      resolveCalls += 1;
    }
  });

  await page.goto("/");
  await page.getByTestId("tab-msstore").click();

  await page.getByTestId("msstore-input").fill("not a valid input");
  await page.getByTestId("msstore-submit").click();

  await expect(page.getByText("解析失败").first()).toBeVisible();
  await expect(page.getByTestId("msstore-download-link")).toHaveCount(0);
  expect(resolveCalls).toBe(0);
});

test("VSCode history survives a page reload", async ({ page }) => {
  await mockVsCodeApi(page);

  await page.goto("/");

  await page.getByTestId("vscode-input").fill(vscodeExtensionUrl);
  await page.getByTestId("vscode-submit").click();
  await expect(page.getByRole("button", { name: "选择版本" })).toBeVisible();

  await page.reload();
  await page.getByTestId("vscode-input").focus();

  await expect(
    page.getByRole("button", { name: vscodeExtensionUrl }),
  ).toBeVisible();
});
