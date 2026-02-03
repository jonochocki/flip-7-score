import { test, expect } from "@playwright/test";

test.describe("Session gate and lobby flow", () => {
  test("loads the landing page", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "7 Score" }),
    ).toBeVisible();

    await expect(
      page.getByText("Press Your Luck", { exact: false }),
    ).toBeVisible();
  });

  test("redirects to lobby from /ABC", async ({ page }) => {
    await page.goto("/ABC", { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/lobby/ABC", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: "Join Lobby" }),
    ).toBeVisible();
  });
});
