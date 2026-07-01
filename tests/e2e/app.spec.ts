import { expect, test } from "@playwright/test";
import {
  chromeExtensionId,
  dockerImage,
  edgeExtensionId,
  edgeExtensionUrl,
  mockChromeApis,
  mockDockerApis,
  mockEdgeApis,
  mockMsStoreApi,
  msstoreFileName,
  msstoreHttpDownloadUrl,
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

  await expect(
    page.getByText("Claude Code for VS Code", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Harness the power of Claude Code without leaving your IDE."),
  ).toBeVisible();

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

  await expect(page.getByText("uBlock Origin", { exact: true })).toBeVisible();
  await expect(
    page.getByText("A fast and trusted content blocker."),
  ).toBeVisible();
  await expect(page.getByAltText("uBlock Origin 图标")).toHaveAttribute(
    "src",
    /sample-chrome-icon/,
  );

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

test("Chrome flow offers enriched search suggestions before resolving details", async ({
  page,
}) => {
  await mockChromeApis(page);

  await page.goto("/");
  await page.getByTestId("tab-chrome").click();

  await page.getByTestId("chrome-input").fill("ublock");
  await expect(
    page.getByText("uBlock Origin", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("A fast and trusted content blocker."),
  ).toBeVisible();
  await expect(page.getByAltText("uBlock Origin 图标").first()).toHaveAttribute(
    "src",
    /sample-chrome-icon/,
  );

  await page
    .getByRole("button", { name: /uBlock Origin/ })
    .first()
    .click();
  await expect(page.getByTestId("chrome-input")).toHaveValue(chromeExtensionId);
});

test("Agent panel waits for a real query before copyable prompt/API", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("tab-chrome").click();

  const chromePanel = page.getByTestId("panel-chrome");
  const agentToggle = page.getByTestId("agent-panel-toggle");

  await expect(agentToggle).toHaveAttribute("aria-pressed", "false");
  await expect(agentToggle).toContainText("启用 Agent");
  await expect(chromePanel.getByTestId("agent-empty-state")).toHaveCount(0);
  await expect(chromePanel.getByRole("button", { name: "接入说明" })).toHaveCount(
    0,
  );
  await agentToggle.click();
  const emptyState = chromePanel.getByTestId("agent-empty-state");
  await expect(agentToggle).toHaveAttribute("aria-pressed", "true");
  await expect(agentToggle).toContainText("隐藏 Agent");
  await expect(emptyState).toBeVisible();
  await agentToggle.click();
  await expect(agentToggle).toHaveAttribute("aria-pressed", "false");
  await expect(emptyState).toHaveCount(0);
  await expect(chromePanel.getByRole("button", { name: "接入说明" })).toHaveCount(
    0,
  );
  await agentToggle.click();
  await expect(agentToggle).toHaveAttribute("aria-pressed", "true");

  await chromePanel.getByRole("button", { name: "使用说明" }).click();
  const guideDialog = page.getByRole("dialog", { name: "使用说明" });
  await expect(guideDialog).toBeVisible();
  await expect(
    guideDialog.getByRole("link", { name: /打开 Chrome Web Store/ }),
  ).toHaveAttribute(
    "href",
    "https://chromewebstore.google.com/category/extensions",
  );
  await expect(guideDialog).toContainText("复制页面链接");
  await expect(guideDialog).toContainText("Extension ID / URL");
  await expect(guideDialog).toContainText(
    "搜索或粘贴扩展 ID，下载 CRX 并在浏览器内转换 ZIP。",
  );
  await guideDialog.getByRole("button", { name: "关闭" }).click();
  await expect(guideDialog).toHaveCount(0);

  await expect(
    chromePanel.getByRole("button", { name: "接入说明" }),
  ).toBeVisible();
  await expect(chromePanel.getByText("Agent 接入指南")).toHaveCount(0);
  await chromePanel.getByRole("button", { name: "接入说明" }).click();
  const agentDialog = page.getByRole("dialog", { name: "Agent 接入" });
  await expect(agentDialog).toBeVisible();
  await expect(agentDialog).toContainText("Codex MCP");
  await expect(agentDialog).toContainText("HTTP API");
  await agentDialog.getByRole("button", { name: "关闭" }).click();
  await expect(agentDialog).toHaveCount(0);

  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText("需要输入查询内容");
  await expect(emptyState).toContainText("扩展名称、ID 或 Web Store URL");
  await expect(chromePanel.getByTestId("agent-prompt-copy")).toBeDisabled();
  await expect(chromePanel.getByTestId("agent-prompt-copy")).toContainText(
    "需要输入",
  );
  await expect(chromePanel.getByTestId("agent-api-copy")).toBeDisabled();
  await expect(chromePanel.getByTestId("agent-api-copy")).toContainText(
    "需要输入",
  );
  await expect(chromePanel.getByTestId("agent-prompt-content")).toHaveCount(
    0,
  );
  await expect(page.getByText("<input>")).toHaveCount(0);

  await page.evaluate(() => {
    const targetWindow = window as Window & { __copiedText?: string };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          targetWindow.__copiedText = text;
        },
      },
    });
  });

  await page.getByTestId("chrome-input").fill(chromeExtensionId);

  const prompt = chromePanel.getByTestId("agent-prompt-content");
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText("Chrome 扩展");
  await expect(prompt).toContainText(chromeExtensionId);
  await expect(prompt).toContainText(
    "POST http://127.0.0.1:3100/api/agent/parse",
  );
  await expect(prompt).toHaveCSS("max-height", "none");
  await expect(prompt).toHaveCSS("overflow-y", "visible");
  await expect(chromePanel.getByTestId("agent-prompt-copy")).toBeEnabled();
  await expect(chromePanel.getByTestId("agent-prompt-copy")).toContainText(
    "复制",
  );
  await expect(chromePanel.getByTestId("agent-api-copy")).toBeEnabled();
  await expect(chromePanel.getByTestId("agent-api-copy")).toContainText(
    "复制",
  );

  await chromePanel.getByTestId("agent-api-copy").click();
  const copiedText = await page.evaluate(
    () =>
      (window as Window & { __copiedText?: string }).__copiedText ?? "",
  );
  expect(copiedText).toContain(
    "curl -X POST http://127.0.0.1:3100/api/agent/parse",
  );
  expect(copiedText).toContain(`"query": "${chromeExtensionId}"`);
  expect(copiedText).not.toContain("<input>");
});

test("Edge flow resolves a store URL and prepares CRX and ZIP downloads", async ({
  page,
}) => {
  await mockEdgeApis(page);
  const detailRequest = page.waitForRequest((request) =>
    request.url().includes("/api/edge/detail"),
  );

  await page.goto("/");
  await page.getByTestId("tab-msedge").click();

  await page.getByTestId("edge-input").fill(edgeExtensionUrl);
  await page.getByTestId("edge-submit").click();

  const request = await detailRequest;
  expect(new URL(request.url()).searchParams.get("query")).toBe(edgeExtensionUrl);

  await expect(
    page.getByText("uBlock Origin Lite", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Raymond Hill")).toBeVisible();
  await expect(page.getByText("Productivity")).toBeVisible();
  await expect(page.getByText("482.9K")).toBeVisible();

  await page.getByTestId("edge-download-both").click();

  await expect(page.getByTestId("edge-download-crx-link")).toHaveAttribute(
    "download",
    `${edgeExtensionId}.crx`,
  );
  await expect(page.getByTestId("edge-download-zip-link")).toHaveAttribute(
    "download",
    `${edgeExtensionId}.zip`,
  );
  await expect(page.getByTestId("edge-download-crx-link")).toHaveAttribute(
    "href",
    /blob:/,
  );
  await expect(page.getByTestId("edge-download-zip-link")).toHaveAttribute(
    "href",
    /blob:/,
  );
});

test("Edge flow offers search suggestions before resolving details", async ({
  page,
}) => {
  await mockEdgeApis(page);

  await page.goto("/");
  await page.getByTestId("tab-msedge").click();

  await page.getByTestId("edge-input").fill("ublock");
  await expect(
    page.getByText("uBlock Origin Lite", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /uBlock Origin Lite/ })
    .first()
    .click();
  await expect(page.getByTestId("edge-input")).toHaveValue(edgeExtensionId);

  await page.getByTestId("edge-submit").click();
  await expect(page.getByText("A permission-light content blocker for Edge.")).toBeVisible();
});

test("Docker flow prepares a docker load tarball", async ({ page }) => {
  await mockDockerApis(page);

  await page.goto("/");
  await page.getByTestId("tab-docker").click();

  await page.getByTestId("docker-input").fill(dockerImage);
  await page.getByTestId("docker-submit").click();

  await expect(page.getByText("选择版本")).toBeVisible();

  await page.getByTestId("docker-download").click();

  await expect(page.getByTestId("docker-download-link")).toHaveAttribute(
    "download",
    "library-nginx-latest.tar",
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

  await expect(page.getByText("选择版本")).toBeVisible();
  await expect(page.getByText("镜像层（1 层）")).toBeVisible();

  await page.getByTestId("docker-download").click();

  await expect(page.getByTestId("docker-download-link")).toHaveAttribute(
    "download",
    "library-nginx-latest.tar",
  );
});

test("Docker flow supports ARM architecture selection", async ({ page }) => {
  await mockDockerApis(page);

  await page.goto("/");
  await page.getByTestId("tab-docker").click();

  await page.getByTestId("docker-input").fill(dockerImage);
  await page.getByTestId("docker-submit").click();

  await expect(page.getByText("选择版本")).toBeVisible();
  await expect(page.getByText("架构")).toBeVisible();

  // Switch to arm64
  await page.getByRole("button", { name: "linux/amd64" }).click();
  await page.getByRole("button", { name: "linux/arm64" }).click();

  await page.getByTestId("docker-download").click();

  await expect(page.getByTestId("docker-download-link")).toHaveAttribute(
    "download",
    "library-nginx-latest-arm64.tar",
  );
  await expect(page.getByTestId("docker-download-link")).toHaveAttribute(
    "href",
    /blob:/,
  );
});

test("Docker flow explains keyword-like image parse failures and lets users pick a candidate", async ({
  page,
}) => {
  await mockDockerApis(page, {
    missingImages: ["library/kafka"],
    searchResults: [
      {
        repo_name: "apache/kafka",
        short_description: "Apache Kafka is an open-source event streaming platform.",
        star_count: 1234,
        pull_count: 123456,
        is_official: true,
      },
    ],
  });

  await page.goto("/");
  await page.getByTestId("tab-docker").click();

  await page.getByTestId("docker-input").fill("kafka");
  await page.getByTestId("docker-submit").click();

  await expect(page.getByText("未找到对应镜像：library/kafka")).toBeVisible();
  await expect(
    page.getByText(/Docker 镜像不能按关键词直接解析/),
  ).toBeVisible();
  await expect(page.getByTestId("docker-candidate-apache-kafka")).toBeVisible();
  await expect(page.getByText("Official")).toBeVisible();
  await expect(page.getByText("1.2K")).toBeVisible();
  await expect(page.getByText("123.5K")).toBeVisible();

  await page.getByTestId("docker-candidate-apache-kafka").click();
  await expect(page.getByTestId("docker-input")).toHaveValue("apache/kafka");

  await page.getByTestId("docker-submit").click();
  await expect(page.getByText("选择版本")).toBeVisible();
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
  expect(params.get("market")).toBe("US");
  expect(params.get("language")).toBe("en-us");

  await expect(page.getByTestId("msstore-download-link")).toHaveAttribute(
    "href",
    msstoreDownloadUrl,
  );
  await expect(page.getByAltText("Windows Terminal 图标")).toHaveAttribute(
    "src",
    /sample-terminal-icon/,
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

test("MSStore flow proxies HTTP download links through same-origin API", async ({
  page,
}) => {
  await mockMsStoreApi(page, { downloadUrl: msstoreHttpDownloadUrl });

  await page.goto("/");
  await page.getByTestId("tab-msstore").click();

  await page.getByTestId("msstore-input").fill(msstoreProductUrl);
  await page.getByTestId("msstore-submit").click();

  const href = await page
    .getByTestId("msstore-download-link")
    .getAttribute("href");

  expect(href).toBe(
    `/api/msstore/download?${new URLSearchParams({
      url: msstoreHttpDownloadUrl,
      filename: msstoreFileName,
    }).toString()}`,
  );
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
