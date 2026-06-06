import { expect, test, type Page } from "@playwright/test";

async function startSoloArcade(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /play now vs ai/i }).click();

  await expect(page.getByLabel(/playable moon vault arcade scene/i)).toBeVisible();
}

test("solo match starts and reaches final case file", async ({ page }) => {
  await startSoloArcade(page);

  const currentObjective = page.getByLabel(/current objective/i);
  const missionBeat = page.getByLabel(/mission beat/i);
  await expect(page.getByText(/moon vault run/i)).toBeVisible();
  await expect(page.getByText(/timer/i)).toBeVisible();
  await expect(page.getByText(/steal the moon pearl/i)).toBeVisible();
  await expect(missionBeat.getByText(/first objective/i)).toBeVisible();
  await expect(missionBeat.getByText(/steal moon pearl/i)).toBeVisible();
  await expect(missionBeat.getByText(/move with wasd \/ arrows/i)).toBeVisible();
  await expect(currentObjective.getByText(/steal the moon pearl \+3/i)).toBeVisible();
  await expect(page.getByText(/1 steal/i)).toBeVisible();
  await expect(page.getByText(/target (?:n|ne|e|se|s|sw|w|nw|here) \d+m/i)).toBeVisible();
  await expect(page.getByText(/rivals enter in \d+s/i)).toBeVisible();
  await expect(page.getByText(/nearest rival (?:n|ne|e|se|s|sw|w|nw|here) \d+m/i)).toBeVisible();
  await expect(page.getByText(/s-rank pace/i)).toBeVisible();
  const bonusWindow = page.getByLabel(/clean bonus window/i);
  await expect(bonusWindow.getByText(/clean bonus/i)).toBeVisible();
  await expect(bonusWindow.getByText(/\d+s left/i)).toBeVisible();
  await expect(page.getByText(/dash ready/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/move/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/follow marker/i)).toBeVisible();
  const heistRace = page.getByLabel(/heist race/i);
  await expect(heistRace.getByText(/blue 0/i)).toBeVisible();
  await expect(heistRace.getByText(/red 0/i)).toBeVisible();
  await expect(heistRace.getByText(/loot race is tied/i)).toBeVisible();
  const miniRadar = page.getByLabel(/mini radar/i);
  await expect(miniRadar.getByText(/radar/i)).toBeVisible();
  await expect(miniRadar.getByText(/target: moon pearl/i)).toBeVisible();
  await expect(page.getByLabel(/radar player: agent you/i)).toBeVisible();
  await expect(page.getByLabel(/radar target: moon pearl/i)).toBeVisible();
  await expect(page.getByLabel(/radar rival: rook/i)).toBeVisible();
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
  await expect(page.getByLabel(/active action/i).getByText(/e \/ space/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/steal relic/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(page.getByText(/escape with/i)).toBeVisible();
  await expect(page.getByText(/moon pearl secured/i)).toBeVisible();
  await expect(missionBeat.getByText(/loot secured/i)).toBeVisible();
  await expect(missionBeat.getByText(/cashout worth 5/i)).toBeVisible();
  await expect(missionBeat.getByText(/reach atrium lift or press g/i)).toBeVisible();
  await expect(page.getByText(/2 escape/i)).toBeVisible();
  await expect(page.getByText(/exit (?:n|ne|e|se|s|sw|w|nw|here) \d+m/i)).toBeVisible();
  const lootChainWindow = page.getByLabel(/loot chain window/i);
  await expect(lootChainWindow.getByText(/loot chain x1/i)).toBeVisible();
  await expect(lootChainWindow.getByText(/next relic keeps streak/i)).toBeVisible();
  await expect(lootChainWindow.getByText(/\d+s left/i)).toBeVisible();
  await expect(page.getByText(/optional relic/i)).toBeVisible();
  await expect(heistRace.getByText(/blue 3/i)).toBeVisible();
  await expect(heistRace.getByText(/red 0/i)).toBeVisible();
  await expect(heistRace.getByText(/you lead by 3/i)).toBeVisible();
  const escapePayout = page.getByLabel(/escape payout/i);
  await expect(escapePayout.getByText(/escape bonus \+2/i)).toBeVisible();
  await expect(escapePayout.getByText(/cashout 5/i)).toBeVisible();
  const routeChoice = page.getByLabel(/route choice/i);
  await expect(routeChoice.getByText(/cashout now 5/i)).toBeVisible();
  await expect(routeChoice.getByText(/greed route/i)).toBeVisible();
  await expect(routeChoice.getByText(/argent crown \+3/i)).toBeVisible();
  await expect(routeChoice.getByText(/press g/i)).toBeVisible();
  await expect(miniRadar.getByText(/exit: atrium lift/i)).toBeVisible();
  await expect(page.getByLabel(/radar exit: atrium lift/i)).toBeVisible();
  const afterSteal = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().lootValue);
  expect(afterSteal).toBeGreaterThan(0);
  const escapeTarget = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().target);
  expect(escapeTarget?.kind).toBe("escape");
  expect(escapeTarget?.label).toMatch(/atrium lift/i);
  await page.keyboard.press("KeyG");
  await expect(page.getByLabel(/optional relic/i).getByText(/greed route/i)).toBeVisible();
  await expect(routeChoice.getByText(/greed route armed/i)).toBeVisible();
  await expect(currentObjective.getByText(/greed route: steal argent crown \+3/i)).toBeVisible();
  const greedTarget = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().target);
  expect(greedTarget?.kind).toBe("artifact");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByText(/press e \/ space to steal/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(page.locator(".arcade-spotlight").getByText(/loot chain x2/i)).toBeVisible();
  await expect(lootChainWindow.getByText(/loot chain x2/i)).toBeVisible();
  const afterGreedSteal = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterGreedSteal?.lootValue).toBeGreaterThan(afterSteal ?? 0);
  expect(afterGreedSteal?.target?.kind).toBe("escape");

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByText(/press e \/ space to escape/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/escape/i)).toBeVisible();
  await page.keyboard.press("KeyE");

  await expect(page.getByText(/agent alibi case file/i)).toBeVisible();
  const finalScores = page.getByLabel(/final scores/i);
  await expect(finalScores).toBeVisible();
  await expect(finalScores.getByText(/s-rank/i)).toBeVisible();
  await expect(finalScores.getByText(/clean exit bonus/i)).toBeVisible();
  await expect(finalScores.getByText(/loot chain/i)).toBeVisible();
  await expect(finalScores.getByText(/x2/i)).toBeVisible();
  await expect(finalScores.getByText(/relics stolen/i)).toBeVisible();
  await expect(finalScores.getByText(/moon pearl/i)).toBeVisible();
  await expect(finalScores.getByText(/argent crown/i)).toBeVisible();
  await expect(page.getByText(/relics stolen: moon pearl, argent crown/i)).toBeVisible();
  await page.getByRole("button", { name: /copy result/i }).click();
  await expect(page.getByText(/copied/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /rematch/i })).toBeVisible();
});

test("close rivals burn the player's alibi if contact is not broken", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalPressure(8));
  await expect(page.getByText(/rival on you: .+ (?:n|ne|e|se|s|sw|w|nw|here) 8m/i)).toBeVisible();
  await expect(page.getByText(/dash or break line/i)).toBeVisible();
  await expect(page.getByLabel(/rival scan meter/i).getByText(/scan charg/i)).toBeVisible();

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

test("rival steals trigger a clear red loot alert", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");
  await page.evaluate(() =>
    (
      window.__AGENT_ALIBI_ARCADE_DEBUG__ as
        | {
            forceRivalSteal?: () => void;
          }
        | undefined
    )?.forceRivalSteal?.()
  );

  const rivalLootAlert = page.getByLabel(/rival loot alert/i);
  await expect(rivalLootAlert.getByText(/red \+\d/i)).toBeVisible();
  await expect(rivalLootAlert.getByText(/stole/i)).toBeVisible();
  const missionBeat = page.getByLabel(/mission beat/i);
  await expect(missionBeat.getByText(/carrier run/i)).toBeVisible();
  await expect(missionBeat.getByText(/rook has moon pearl/i)).toBeVisible();
  await expect(missionBeat.getByText(/chase the gold-red carrier blip/i)).toBeVisible();
  const threatVector = page.getByLabel(/threat vector/i);
  await expect(threatVector.getByText(/carrier (?:n|ne|e|se|s|sw|w|nw|here) \d+m/i)).toBeVisible();
  await expect(threatVector.getByText(/rook with moon pearl \+3/i)).toBeVisible();
  await expect(threatVector.getByText(/close gap and press e/i)).toBeVisible();
  await expect(page.getByLabel(/route distance/i).getByText(/carrier (?:n|ne|e|se|s|sw|w|nw|here) \d+m/i)).toBeVisible();
  const carrierObjective = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().target);
  expect(carrierObjective?.kind).toBe("carrier");
  expect(carrierObjective?.label).toMatch(/rook carrier/i);
  const rivalIntercept = page.getByLabel(/rival intercept/i);
  await expect(rivalIntercept.getByText(/rook carrying/i)).toBeVisible();
  await expect(rivalIntercept.getByText(/moon pearl \+3/i)).toBeVisible();
  await expect(rivalIntercept.getByText(/\d+m away/i)).toBeVisible();
  const miniRadar = page.getByLabel(/mini radar/i);
  await expect(miniRadar.getByText(/carrier: rook carrying moon pearl/i)).toBeVisible();
  await expect(page.getByLabel(/radar carrier: rook carrying moon pearl/i)).toBeVisible();
  const afterSteal = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().aiLootValue);
  expect(afterSteal).toBeGreaterThan(0);
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalPressure(6));
  await expect(page.getByText(/press e \/ space to intercept/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/intercept carrier/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(page.getByText("Intercepted Rook", { exact: true })).toBeVisible();
  const afterIntercept = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterIntercept?.lootValue).toBeGreaterThan(0);
  expect(afterIntercept?.aiLootValue).toBe(0);

  await page.evaluate(() => window.__AGENT_ALIBI_FINISH_ARCADE__?.());
  const finalScores = page.getByLabel(/final scores/i);
  const carrierCard = finalScores.locator(".final-intercepts");
  await expect(carrierCard.getByText(/carrier intercepts/i)).toBeVisible();
  await expect(carrierCard.getByText(/x1/i)).toBeVisible();
  await expect(carrierCard.getByText(/moon pearl/i)).toBeVisible();
  const relicsCard = finalScores.locator(".final-relics");
  await expect(relicsCard.getByText(/relics stolen/i)).toBeVisible();
  await expect(relicsCard.getByText(/moon pearl/i)).toBeVisible();
  await expect(page.getByText(/carrier intercepts: 1/i)).toBeVisible();
  await expect(page.getByText(/recovered from rivals: moon pearl/i)).toBeVisible();
  await expect(page.getByText(/relics stolen: moon pearl/i)).toBeVisible();
});

test("lockdown phase triggers an unmistakable vault warning", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");
  await page.evaluate(() =>
    (
      window.__AGENT_ALIBI_ARCADE_DEBUG__ as
        | {
            forceLockdown?: () => void;
          }
        | undefined
    )?.forceLockdown?.()
  );

  const vaultCondition = page.getByLabel(/vault condition/i);
  await expect(vaultCondition.getByText(/vault lockdown/i)).toBeVisible();
  await expect(vaultCondition.getByText(/lockdown imminent/i)).toBeVisible();
  await expect(page.getByText(/lockdown is closing/i)).toBeVisible();
});

test("alibi pulse jams a close rival scan", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalPressure(8));
  await expect(page.getByText(/alibi pulse ready/i)).toBeVisible();
  await expect(page.getByText(/press e \/ space to jam rival scan/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/jam scan/i)).toBeVisible();
  const threatVector = page.getByLabel(/threat vector/i);
  await expect(threatVector.getByText(/scan lock/i)).toBeVisible();
  await expect(threatVector.getByText(/scanner is charging your alarm/i)).toBeVisible();
  await expect(threatVector.getByText(/press e \/ space to jam/i)).toBeVisible();
  await expect(page.getByLabel(/rival scan meter/i).getByText(/scan charg/i)).toBeVisible();

  const beforePulse = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  await page.keyboard.press("KeyE");
  await expect(page.getByText(/alibi pulse: scanner jammed/i)).toBeVisible();
  await expect(page.getByText(/jammed .+ scan/i)).toBeVisible();
  await expect(page.getByLabel(/rival scan meter/i).getByText(/scan jammed/i)).toBeVisible();
  const afterPulse = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterPulse?.alibiPulseCooldownMs).toBeGreaterThan(0);
  expect(afterPulse?.rivalScanChargeMs).toBe(0);

  for (let tick = 0; tick < 3; tick += 1) {
    await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalPressure(8));
    await page.waitForTimeout(220);
  }

  const afterCooldownContact = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterCooldownContact?.alarmRaw).toBeLessThan((beforePulse?.alarmRaw ?? 0) + 0.4);

  await page.evaluate(() => window.__AGENT_ALIBI_FINISH_ARCADE__?.());
  const finalScores = page.getByLabel(/final scores/i);
  await expect(finalScores.getByText(/alibi pulses/i)).toBeVisible();
  await expect(finalScores.getByText(/x1/i)).toBeVisible();
  await expect(page.getByText(/alibi pulses: 1/i)).toBeVisible();
});
