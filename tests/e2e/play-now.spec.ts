import { expect, test } from "@playwright/test";

test("solo match starts and reaches final case file", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /play now vs ai/i }).click();

  await expect(page.getByLabel(/neon moon heist scene/i)).toBeVisible();
  await expect(page.getByText(/round 1\/6/i)).toBeVisible();
  await expect(page.locator("button.action-card")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /execute/i })).toBeVisible();

  for (let round = 0; round < 6; round += 1) {
    const finalCase = page.getByText(/agent alibi case file/i);
    if (await finalCase.isVisible().catch(() => false)) break;

    const cards = page.locator("button.action-card");
    if ((await cards.count()) > 0) {
      await cards.first().click();
    }
    await page.getByRole("button", { name: /execute/i }).click();
  }

  await expect(page.getByText(/agent alibi case file/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /rematch/i })).toBeVisible();
});
