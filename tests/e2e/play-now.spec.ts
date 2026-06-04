import { expect, test } from "@playwright/test";

test("solo match starts and reaches final case file", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /play now vs ai/i }).click();

  await expect(page.getByText(/round 1\/6/i)).toBeVisible();

  for (let round = 0; round < 6; round += 1) {
    const finalCase = page.getByText(/agent alibi case file/i);
    if (await finalCase.isVisible().catch(() => false)) break;

    const preferred = page.getByRole("button", { name: /steal|move|scout|escape|guard|cover/i }).first();
    await preferred.click();
  }

  await expect(page.getByText(/agent alibi case file/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /rematch/i })).toBeVisible();
});
