import { expect, test } from "@playwright/test";

test.describe("Dark mode", () => {
  test("defaults to light when system prefers light", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();

    await page.goto("/");

    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByTestId("theme-toggle")).toHaveAttribute(
      "data-theme",
      "system",
    );

    await context.close();
  });

  test("defaults to dark when system prefers dark", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();

    await page.goto("/");

    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByTestId("theme-toggle")).toHaveAttribute(
      "data-theme",
      "system",
    );

    await context.close();
  });

  test("cycles through light → dark → system on click", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto("/");

    const toggle = page.getByTestId("theme-toggle");
    const html = page.locator("html");

    await expect(toggle).toHaveAttribute("data-theme", "system");

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme", "light");
    await expect(html).not.toHaveClass(/dark/);
    expect(
      await page.evaluate(() => localStorage.getItem("theme")),
    ).toBe("light");

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme", "dark");
    await expect(html).toHaveClass(/dark/);
    expect(
      await page.evaluate(() => localStorage.getItem("theme")),
    ).toBe("dark");

    await toggle.click();
    await expect(toggle).toHaveAttribute("data-theme", "system");
    await expect(html).not.toHaveClass(/dark/);
    expect(
      await page.evaluate(() => localStorage.getItem("theme")),
    ).toBe("system");

    await context.close();
  });

  test("persists dark choice across reload without flashing light", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();

    await page.goto("/");
    await page.getByTestId("theme-toggle").click();
    await page.getByTestId("theme-toggle").click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();

    // FOUC check: dark class must be present from the very first paint
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByTestId("theme-toggle")).toHaveAttribute(
      "data-theme",
      "dark",
    );
    expect(
      await page.evaluate(() => localStorage.getItem("theme")),
    ).toBe("dark");

    await context.close();
  });
});
