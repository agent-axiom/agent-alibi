import { expect, test, type Page } from "@playwright/test";

async function startSoloArcade(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /play now vs ai/i }).click();

  await expect(page.getByLabel(/playable moon vault arcade scene/i)).toBeVisible();
}

test("solo match starts and reaches final case file", async ({ page }) => {
  await startSoloArcade(page);

  await expect(page.getByText(/moon vault run/i)).toBeVisible();
  await expect(page.getByText(/timer/i)).toBeVisible();
  await expect(page.getByText(/steal the moon pearl/i)).toBeVisible();
  await expect(page.getByText(/1 steal/i)).toBeVisible();
  await expect(page.getByText(/target \d+m/i)).toBeVisible();
  await expect(page.getByText(/rivals enter in \d+s/i)).toBeVisible();
  await expect(page.getByText(/nearest rival \d+m/i)).toBeVisible();
  await expect(page.getByText(/s-rank pace/i)).toBeVisible();
  await expect(page.getByText(/dash ready/i)).toBeVisible();
  await expect(page.getByText(/rival agents enter in 5 seconds/i)).toBeVisible();

  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");
  const initialTarget = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(initialTarget?.target?.kind).toBe("artifact");
  expect(initialTarget?.hasTargetBeam).toBe(true);
  expect(initialTarget?.nearestRival?.distanceMeters).toBeGreaterThan(0);
  await page.waitForTimeout(1_600);
  const graceState = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(graceState?.aiLootValue).toBe(0);

  const beforeMove = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().player);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(320);
  await page.keyboard.up("ArrowRight");
  const afterMove = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().player);
  expect(afterMove?.x).toBeGreaterThan((beforeMove?.x ?? 0) + 40);

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByText(/press e \/ space to steal/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(page.getByText(/escape with/i)).toBeVisible();
  await expect(page.getByText(/moon pearl secured/i)).toBeVisible();
  await expect(page.getByText(/2 escape/i)).toBeVisible();
  await expect(page.getByText(/exit \d+m/i)).toBeVisible();
  await expect(page.getByText(/optional relic/i)).toBeVisible();
  const afterSteal = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().lootValue);
  expect(afterSteal).toBeGreaterThan(0);
  const escapeTarget = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().target);
  expect(escapeTarget?.kind).toBe("escape");
  expect(escapeTarget?.label).toMatch(/atrium lift/i);
  await page.keyboard.press("KeyG");
  await expect(page.getByLabel(/optional relic/i).getByText(/greed route/i)).toBeVisible();
  const greedTarget = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().target);
  expect(greedTarget?.kind).toBe("artifact");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByText(/press e \/ space to steal/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(page.getByText(/loot chain x2/i)).toBeVisible();
  const afterGreedSteal = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterGreedSteal?.lootValue).toBeGreaterThan(afterSteal ?? 0);
  expect(afterGreedSteal?.target?.kind).toBe("escape");

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByText(/press e \/ space to escape/i)).toBeVisible();
  await page.keyboard.press("KeyE");

  await expect(page.getByText(/agent alibi case file/i)).toBeVisible();
  const finalScores = page.getByLabel(/final scores/i);
  await expect(finalScores).toBeVisible();
  await expect(finalScores.getByText(/s-rank/i)).toBeVisible();
  await expect(finalScores.getByText(/clean exit bonus/i)).toBeVisible();
  await expect(finalScores.getByText(/loot chain/i)).toBeVisible();
  await expect(finalScores.getByText(/x2/i)).toBeVisible();
  await page.getByRole("button", { name: /copy result/i }).click();
  await expect(page.getByText(/copied/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /rematch/i })).toBeVisible();
});

test("close rivals burn the player's alibi if contact is not broken", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalPressure(8));
  await expect(page.getByText(/rival on you: .+ 8m/i)).toBeVisible();
  await expect(page.getByText(/dash or break line/i)).toBeVisible();

  const alarmBeforeScan = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().alarmRaw);
  for (let tick = 0; tick < 5; tick += 1) {
    await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalPressure(8));
    await page.waitForTimeout(240);
  }

  await expect(page.getByText(/alibi scan \+1 alarm/i)).toBeVisible();
  await expect(page.getByText(/rival scan burned your alibi/i)).toBeVisible();
  const alarmAfterScan = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().alarmRaw);
  expect(alarmAfterScan).toBeGreaterThan((alarmBeforeScan ?? 0) + 0.4);
});
