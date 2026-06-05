import { expect, test } from "@playwright/test";

test("solo match starts and reaches final case file", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /play now vs ai/i }).click();

  await expect(page.getByLabel(/playable moon vault arcade scene/i)).toBeVisible();
  await expect(page.getByText(/moon vault run/i)).toBeVisible();
  await expect(page.getByText(/timer/i)).toBeVisible();
  await expect(page.getByText(/steal a relic/i)).toBeVisible();

  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_FINISH_ARCADE__ === "function");
  await page.evaluate(() => window.__AGENT_ALIBI_FINISH_ARCADE__?.());

  await expect(page.getByText(/agent alibi case file/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /rematch/i })).toBeVisible();
});
