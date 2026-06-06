import { expect, test, type Page } from "@playwright/test";

async function startSoloArcade(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /play now vs ai/i }).click();

  await expect(page.getByLabel(/playable moon vault arcade scene/i)).toBeVisible();
}

test("solo match starts and reaches final case file", async ({ page }) => {
  await startSoloArcade(page);

  const currentObjective = page.getByLabel(/current objective/i);
  const objectiveBanner = page.getByLabel(/objective banner/i);
  const missionBeat = page.getByLabel(/mission beat/i);
  await expect(page.getByText(/moon vault run/i)).toBeVisible();
  await expect(page.getByText(/timer/i)).toBeVisible();
  await expect(page.getByText(/steal the moon pearl/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/steal moon pearl/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/first score wins tempo/i)).toBeVisible();
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
  expect(initialTarget?.routeGuide?.kind).toBe("artifact");
  expect(initialTarget?.routeGuide?.chevronCount).toBeGreaterThan(1);
  expect(initialTarget?.nearestRival?.distanceMeters).toBeGreaterThan(0);
  expect(initialTarget?.arenaLabels?.roomCount).toBeGreaterThanOrEqual(8);
  expect(initialTarget?.arenaLabels?.zoneBeacons).toEqual(expect.arrayContaining(["HIGH VALUE", "EXTRACT", "RIVAL ENTRY"]));
  await page.waitForTimeout(1_600);
  const graceState = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(graceState?.aiLootValue).toBe(0);

  const beforeMove = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().player);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(320);
  await page.keyboard.up("ArrowRight");
  const afterMove = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().player);
  expect(afterMove?.x).toBeGreaterThan((beforeMove?.x ?? 0) + 15);

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByText(/press e \/ space to steal/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/e \/ space/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/steal moon pearl \+3/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(currentObjective.getByText(/escape with/i)).toBeVisible();
  await expect(page.getByText(/moon pearl secured/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/escape with 3 loot/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/cashout 5 or risk greed route/i)).toBeVisible();
  const scorePopup = page.getByLabel(/score popup/i);
  await expect(scorePopup.getByText(/\+3 moon pearl/i)).toBeVisible();
  const stealImpact = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().lastImpact);
  expect(stealImpact?.kind).toBe("steal");
  expect(stealImpact?.count).toBeGreaterThan(0);
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
  const extractionCue = page.getByLabel(/extraction cue/i);
  await expect(extractionCue.getByText(/extraction armed/i)).toBeVisible();
  await expect(extractionCue.getByText(/atrium lift/i)).toBeVisible();
  await expect(extractionCue.getByText(/cashout 5/i)).toBeVisible();
  await expect(extractionCue.getByText(/follow the cyan ring/i)).toBeVisible();
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
  const escapeGuide = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().routeGuide);
  expect(escapeGuide?.kind).toBe("escape");
  expect(escapeGuide?.chevronCount).toBeGreaterThan(0);
  const escapeZoneBadge = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().escapeZoneBadge);
  expect(escapeZoneBadge).toEqual({ visible: true, label: "Cashout +5" });
  await page.keyboard.press("KeyG");
  await expect(page.getByLabel(/optional relic/i).getByText(/greed route/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/greed route armed/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/steal argent crown before escape/i)).toBeVisible();
  await expect(routeChoice.getByText(/greed route armed/i)).toBeVisible();
  await expect(currentObjective.getByText(/greed route: steal argent crown \+3/i)).toBeVisible();
  const greedTarget = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().target);
  expect(greedTarget?.kind).toBe("artifact");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByText(/press e \/ space to steal/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(page.locator(".arcade-spotlight").getByText(/loot chain x2/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/escape with 6 loot/i)).toBeVisible();
  await expect(lootChainWindow.getByText(/loot chain x2/i)).toBeVisible();
  const afterGreedSteal = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterGreedSteal?.lootValue).toBeGreaterThan(afterSteal ?? 0);
  expect(afterGreedSteal?.target?.kind).toBe("escape");
  expect(afterGreedSteal?.escapeZoneBadge).toEqual({ visible: true, label: "Cashout +8" });

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByText(/press e \/ space to cashout \+8/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/cashout \+8/i)).toBeVisible();
  await expect(extractionCue.getByText(/extract now/i)).toBeVisible();
  await expect(extractionCue.getByText(/press e \/ space/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(scorePopup.getByText(/\+2 escape bonus/i)).toBeVisible();

  await expect(page.getByText(/agent alibi case file/i)).toBeVisible();
  const finalScores = page.getByLabel(/final scores/i);
  await expect(finalScores).toBeVisible();
  await expect(finalScores.getByText(/score margin/i)).toBeVisible();
  await expect(finalScores.getByText(/blue by \d+/i)).toBeVisible();
  await expect(finalScores.getByText(/s-rank/i)).toBeVisible();
  await expect(finalScores.getByText(/clean exit bonus/i)).toBeVisible();
  await expect(finalScores.getByText(/loot chain/i)).toBeVisible();
  await expect(finalScores.getByText(/x2/i)).toBeVisible();
  await expect(finalScores.getByText(/relics stolen/i)).toBeVisible();
  await expect(finalScores.getByText(/moon pearl/i)).toBeVisible();
  await expect(finalScores.getByText(/argent crown/i)).toBeVisible();
  const caseHighlights = page.getByLabel(/case highlights/i);
  await expect(caseHighlights.getByText(/stole moon pearl \+ argent crown/i)).toBeVisible();
  await expect(caseHighlights.getByText(/escaped with 6 loot/i)).toBeVisible();
  await expect(caseHighlights.getByText(/clean exit bonus \+3/i)).toBeVisible();
  await expect(page.getByLabel(/rematch hook/i).getByText(/run it back and make the case file louder/i)).toBeVisible();
  await expect(page.getByText(/relics stolen: moon pearl, argent crown/i)).toBeVisible();
  await page.getByRole("button", { name: /copy result/i }).click();
  await expect(page.getByText(/copied/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /rematch/i })).toBeVisible();
});

test("start objective banner clears before it blocks the arena", async ({ page }) => {
  await startSoloArcade(page);

  const objectiveBanner = page.getByLabel(/objective banner/i);
  await expect(objectiveBanner.getByText(/steal moon pearl/i)).toBeVisible();
  await page.waitForTimeout(1_900);
  const bannerOpacity = await page.evaluate(() => {
    const banner = document.querySelector('[aria-label="Objective banner"]');
    return banner ? Number(getComputedStyle(banner).opacity) : 0;
  });
  expect(bannerOpacity).toBeLessThanOrEqual(0.05);
});

test("close rivals burn the player's alibi if contact is not broken", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalPressure(8));
  await expect(page.getByText(/rival on you: .+ (?:n|ne|e|se|s|sw|w|nw|here) 8m/i)).toBeVisible();
  await expect(page.getByText(/dash or break line/i)).toBeVisible();
  await expect(page.getByLabel(/rival scan meter/i).getByText(/scan charg/i)).toBeVisible();
  const scanHalo = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().threatHalo);
  expect(scanHalo?.kind).toBe("scan");
  expect(scanHalo?.visible).toBe(true);

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

test("on-screen arcade controls move, dash, interact, and switch route", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");

  const controls = page.getByLabel(/arcade touch controls/i);
  await expect(controls).toBeVisible();
  await expect(controls.getByRole("button", { name: /move right/i })).toBeVisible();
  await expect(controls.getByRole("button", { name: /interact/i })).toBeVisible();
  await expect(controls.getByRole("button", { name: /dash/i })).toBeVisible();
  await expect(controls.getByRole("button", { name: /switch route/i })).toBeVisible();

  const beforeMove = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().player);
  const moveRight = controls.getByRole("button", { name: /move right/i });
  await moveRight.hover();
  await page.mouse.down();
  await page.waitForTimeout(360);
  await page.mouse.up();
  const afterMove = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().player);
  expect(afterMove?.x).toBeGreaterThan((beforeMove?.x ?? 0) + 15);

  const beforeDash = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().player);
  await controls.getByRole("button", { name: /dash/i }).click();
  await moveRight.hover();
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  const afterDash = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterDash?.player?.x).toBeGreaterThan((beforeDash?.x ?? 0) + 15);
  expect(afterDash?.dashCooldownMs).toBeGreaterThan(0);
  expect(afterDash?.motionTrail?.active).toBe(true);
  expect(afterDash?.motionTrail?.burstCount).toBeGreaterThan(0);
  expect(afterDash?.lastCameraKick?.kind).toBe("dash");

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByText(/press e \/ space to steal/i)).toBeVisible();
  await controls.getByRole("button", { name: /interact/i }).click();
  await expect(page.getByText(/moon pearl secured/i)).toBeVisible();
  await expect(page.getByLabel(/route choice/i).getByText(/press g/i)).toBeVisible();
  await controls.getByRole("button", { name: /switch route/i }).click();
  await expect(page.getByLabel(/optional relic/i).getByText(/greed route/i)).toBeVisible();
  const afterRoute = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().routeMode);
  expect(afterRoute).toBe("greed");
});

test("on-screen action buttons expose live context and cooldown state", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");

  const controls = page.getByLabel(/arcade touch controls/i);
  await expect(controls.getByRole("button", { name: /dash ready/i })).toBeVisible();
  await expect(controls.getByRole("button", { name: /^interact$/i })).toBeVisible();
  await expect(controls.getByRole("button", { name: /^switch route$/i })).toBeVisible();

  const moveRight = controls.getByRole("button", { name: /move right/i });
  await controls.getByRole("button", { name: /dash ready/i }).click();
  await moveRight.hover();
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect(controls.getByRole("button", { name: /dash cooling/i })).toBeVisible();

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(controls.getByRole("button", { name: /interact: steal moon pearl \+3/i })).toBeVisible();
  await controls.getByRole("button", { name: /interact: steal moon pearl \+3/i }).click();
  await expect(controls.getByRole("button", { name: /switch route: greed route available/i })).toBeVisible();
  await controls.getByRole("button", { name: /switch route: greed route available/i }).click();
  await expect(controls.getByRole("button", { name: /switch route: greed route armed/i })).toBeVisible();
});

test("mobile arcade controls stay clear of the objective panel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startSoloArcade(page);

  const layout = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector);
      const box = element?.getBoundingClientRect();
      return box
        ? {
            x: Math.round(box.x),
            y: Math.round(box.y),
            right: Math.round(box.right),
            bottom: Math.round(box.bottom),
            width: Math.round(box.width),
            height: Math.round(box.height)
          }
        : null;
    };
    const controls = rect('[aria-label="Arcade touch controls"]');
    const objective = rect('[aria-label="Current objective"]');
    const overlaps = Boolean(
      controls &&
        objective &&
        controls.x < objective.right &&
        controls.right > objective.x &&
        controls.y < objective.bottom &&
        controls.bottom > objective.y
    );
    return {
      controls,
      objective,
      overlaps,
      buttonCount: document.querySelectorAll('[aria-label="Arcade touch controls"] button').length
    };
  });

  expect(layout.buttonCount).toBe(7);
  expect(layout.controls).not.toBeNull();
  expect(layout.objective).not.toBeNull();
  expect(layout.overlaps).toBe(false);
});

test("desktop arcade HUD leaves the playfield center open", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startSoloArcade(page);

  const layout = await page.evaluate(() => {
    const objective = document.querySelector('[aria-label="Current objective"]')?.getBoundingClientRect();
    return objective
      ? {
          objective: {
            y: Math.round(objective.y),
            height: Math.round(objective.height)
          },
          viewportHeight: window.innerHeight
        }
      : null;
  });

  expect(layout).not.toBeNull();
  expect(layout!.objective.height).toBeLessThanOrEqual(310);
  expect(layout!.objective.y).toBeGreaterThanOrEqual(Math.round(layout!.viewportHeight * 0.58));
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
  const rivalComms = page.getByLabel(/rival comms/i);
  await expect(rivalComms.getByText(/rook/i)).toBeVisible();
  await expect(rivalComms.getByText(/moon pearl is mine/i)).toBeVisible();
  await expect(rivalComms.getByText(/catch the carrier/i)).toBeVisible();
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
  const carrierHalo = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().threatHalo);
  expect(carrierHalo?.kind).toBe("carrier");
  expect(carrierHalo?.visible).toBe(true);
  const carrierCashoutRoute = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().carrierCashoutRoute);
  expect(carrierCashoutRoute?.visible).toBe(true);
  expect(carrierCashoutRoute?.targetLabel).toBe("Atrium Lift");
  expect(carrierCashoutRoute?.chevronCount).toBeGreaterThan(0);
  const carrierBadges = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().carrierBadges);
  expect(carrierBadges).toContainEqual({ agentName: "Rook", label: "+3", visible: true });
  const rivalIntercept = page.getByLabel(/rival intercept/i);
  await expect(rivalIntercept.getByText(/rook carrying/i)).toBeVisible();
  await expect(rivalIntercept.getByText(/moon pearl \+3/i)).toBeVisible();
  await expect(rivalIntercept.getByText(/\d+m away/i)).toBeVisible();
  await expect(rivalIntercept.getByText(/cashout in \d+s/i)).toBeVisible();
  const carrierRun = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().rivalIntercept);
  expect(carrierRun?.cashoutSeconds).toBeGreaterThan(0);
  const miniRadar = page.getByLabel(/mini radar/i);
  await expect(miniRadar.getByText(/carrier: rook carrying moon pearl/i)).toBeVisible();
  await expect(page.getByLabel(/radar carrier: rook carrying moon pearl/i)).toBeVisible();
  const afterSteal = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().aiLootValue);
  expect(afterSteal).toBe(0);
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalPressure(6));
  await expect(page.getByText(/press e \/ space to intercept/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/recover moon pearl \+3/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(page.getByText("Intercepted Rook", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/score popup/i).getByText(/recovered \+3/i)).toBeVisible();
  await expect(rivalComms.getByText(/that was almost elegant/i)).toBeVisible();
  const afterIntercept = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterIntercept?.lootValue).toBeGreaterThan(0);
  expect(afterIntercept?.aiLootValue).toBe(0);
  expect(afterIntercept?.lastImpact?.kind).toBe("intercept");

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

test("rival carriers only score after cashout", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalSteal?.());

  const afterSteal = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterSteal?.aiLootValue).toBe(0);
  expect(afterSteal?.rivalIntercept?.relicName).toBe("Moon Pearl");

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalCashout?.());

  const afterCashout = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterCashout?.aiLootValue).toBe(3);
  expect(afterCashout?.rivalIntercept).toBeNull();
  expect(afterCashout?.lastImpact?.kind).toBe("cashout");
  await expect(page.getByLabel(/rival loot alert/i).getByText(/red cashed out \+3/i)).toBeVisible();
  await expect(page.getByLabel(/score popup/i).getByText(/red \+3 cashout/i)).toBeVisible();
  await expect(page.getByLabel(/score popup/i).getByText(/rook reached atrium lift/i)).toBeVisible();
  await expect(page.getByLabel(/heist race/i).getByText(/red 3/i)).toBeVisible();
  const missionBeat = page.getByLabel(/mission beat/i);
  await expect(missionBeat.getByText(/score pressure/i)).toBeVisible();
  await expect(missionBeat.getByText(/red leads by 3/i)).toBeVisible();
  await expect(missionBeat.getByText(/argent crown \+3 plus lift bonus can beat red/i)).toBeVisible();

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByLabel(/active action/i).getByText(/steal/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(missionBeat.getByText(/cashout beats red by 2/i)).toBeVisible();
});

test("rival carrier near cashout triggers an imminent warning", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalSteal?.());
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalNearCashout?.());

  const carrierRun = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().rivalIntercept);
  expect(carrierRun?.urgency).toBe("critical");
  expect(carrierRun?.cashoutSeconds).toBeLessThanOrEqual(4);
  const rivalIntercept = page.getByLabel(/rival intercept/i);
  await expect(rivalIntercept.getByText(/cashout imminent/i)).toBeVisible();
});

test("unfinished carrier runs become pending loot in the final case file", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalSteal?.());
  await page.evaluate(() => window.__AGENT_ALIBI_FINISH_ARCADE__?.());

  const finalScores = page.getByLabel(/final scores/i);
  await expect(finalScores.locator(".final-rival-relics")).toHaveCount(0);
  const pendingCard = finalScores.locator(".final-pending-rival-relics");
  await expect(pendingCard.getByText(/pending carrier loot/i)).toBeVisible();
  await expect(pendingCard.getByText(/moon pearl/i)).toBeVisible();
  await expect(page.getByText(/rival relics: none/i)).toBeVisible();
  await expect(page.getByText(/pending carrier loot: moon pearl/i)).toBeVisible();
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
  expect(afterPulse?.lastImpact?.kind).toBe("alibi");

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
