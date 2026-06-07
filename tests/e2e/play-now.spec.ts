import { expect, test, type Page } from "@playwright/test";

async function startSoloArcade(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /play now vs ai/i }).click();

  await expect(page.getByLabel(/playable moon vault arcade scene/i)).toBeVisible();
}

test("home screen surfaces the saved best case target", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "agent-alibi:best-case:v1",
      JSON.stringify({
        version: 1,
        at: 123,
        score: 12,
        title: "Profitable Disaster",
        runRating: "S-Rank",
        lootChain: 2,
        relicCount: 2,
        afterburnerExitBonus: 1
      })
    );
  });
  await page.reload();

  const savedBest = page.getByLabel(/saved best case/i);
  await expect(savedBest.getByText(/best case/i)).toBeVisible();
  await expect(savedBest.getByText(/profitable disaster/i)).toBeVisible();
  await expect(savedBest.getByText(/score 12 · s-rank · chain x2 · boost \+1/i)).toBeVisible();
  await expect(savedBest.getByText(/beat your case/i)).toBeVisible();
});

test("sound preference survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /sound off/i }).click();
  await expect(page.getByRole("button", { name: /sound on/i })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("agent-alibi:sound-enabled:v1")))
    .toBe("true");

  await page.reload();
  await expect(page.getByRole("button", { name: /sound on/i })).toBeVisible();
});

test("solo match starts and reaches final case file", async ({ page }) => {
  await startSoloArcade(page);

  const currentObjective = page.getByLabel(/current objective/i);
  const objectiveBanner = page.getByLabel(/objective banner/i);
  const missionBeat = page.getByLabel(/mission beat/i);
  const miniRadar = page.getByLabel(/mini radar/i);
  await expect(page.locator(".arcade-shell")).toHaveClass(/compact-opening/);
  const openingContract = page.getByLabel(/opening contract/i);
  await expect(openingContract.getByText(/moon vault contract/i)).toBeVisible();
  await expect(openingContract.getByText(/steal moon pearl \+3/i)).toBeVisible();
  await expect(openingContract.getByText(/cashout at atrium lift/i)).toBeVisible();
  await expect(openingContract.getByText(/red crew breaches after first score/i)).toBeVisible();
  const openingLayout = await page.evaluate(() => {
    const contract = document.querySelector(`[aria-label="Opening contract"]`)?.getBoundingClientRect();
    const objective = document.querySelector(`[aria-label="Current objective"]`)?.getBoundingClientRect();
    const objectiveElement = document.querySelector(`[aria-label="Current objective"]`);
    return {
      contract: contract ? { width: Math.round(contract.width), height: Math.round(contract.height) } : null,
      objective: objective ? { width: Math.round(objective.width), height: Math.round(objective.height) } : null,
      objectiveCut: objectiveElement ? objectiveElement.scrollHeight > objectiveElement.clientHeight + 2 : true
    };
  });
  expect(openingLayout.contract?.width).toBeLessThanOrEqual(270);
  expect(openingLayout.contract?.height).toBeLessThanOrEqual(205);
  expect(openingLayout.objective?.height).toBeLessThanOrEqual(218);
  expect(openingLayout.objectiveCut).toBe(false);
  await expect(page.getByText(/moon vault run/i)).toBeVisible();
  await expect(page.getByText(/timer/i)).toBeVisible();
  await expect(page.getByText(/steal the moon pearl/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/steal moon pearl/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/first score wins tempo/i)).toBeVisible();
  await expect(missionBeat.getByText(/first objective/i)).toBeVisible();
  await expect(missionBeat.getByText(/steal moon pearl/i)).toBeVisible();
  await expect(missionBeat.getByText(/move with wasd \/ arrows/i)).toBeVisible();
  await expect(currentObjective.getByText(/steal the moon pearl \+3/i)).toBeVisible();
  await expect(page.getByLabel(/mission loop/i)).toBeHidden();
  await expect(page.getByText(/target (?:n|ne|e|se|s|sw|w|nw|here) \d+m/i)).toBeHidden();
  await expect(page.getByText(/rivals wake after first score or \d+s/i)).toBeHidden();
  await expect(page.getByLabel(/live agents/i)).toBeHidden();
  await expect(page.getByLabel(/mission radio/i)).toBeHidden();
  await expect(miniRadar).toBeHidden();
  await expect(page.getByText(/nearest rival (?:n|ne|e|se|s|sw|w|nw|here) \d+m/i)).toBeHidden();
  await expect(page.getByText(/s-rank pace/i)).toBeHidden();
  await expect(page.getByLabel(/clean bonus window/i)).toBeHidden();
  await expect(page.getByText(/dash ready/i)).toBeHidden();
  await expect(page.getByLabel(/active action/i).getByText(/move/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/follow marker/i)).toBeVisible();
  const objectiveCompass = page.getByLabel(/objective compass/i);
  await expect(objectiveCompass.getByText(/steal/i)).toBeVisible();
  await expect(objectiveCompass.getByText(/moon pearl \+3/i)).toBeVisible();
  await expect(objectiveCompass.getByText(/(?:n|ne|e|se|s|sw|w|nw) \d+m/i)).toBeVisible();
  await expect(objectiveCompass.getByText(/follow gold beam/i)).toBeVisible();
  const heistRace = page.getByLabel(/heist race/i);
  await expect(heistRace).toBeHidden();

  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");
  const initialTarget = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(initialTarget?.target?.kind).toBe("artifact");
  expect(initialTarget?.targetMarker?.label).toBe("Moon Pearl +3");
  expect(initialTarget?.hasTargetBeam).toBe(true);
  expect(initialTarget?.routeGuide?.kind).toBe("artifact");
  expect(initialTarget?.routeGuide?.chevronCount).toBeGreaterThan(1);
  expect(initialTarget?.routeGuide?.laneLabel).toBe("STEAL ROUTE");
  expect(initialTarget?.routeGuide?.pulseCount).toBeGreaterThan(0);
  expect(initialTarget?.routeGuide?.signalVisible).toBe(true);
  expect(initialTarget?.cameraLookahead?.targetKind).toBe("artifact");
  expect(initialTarget?.cameraLookahead?.magnitude).toBeGreaterThan(15);
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
  const stealPrompt = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().interactionPrompt);
  expect(stealPrompt).toEqual(
    expect.objectContaining({
      visible: true,
      key: "E / Space",
      label: "Steal Moon Pearl +3"
    })
  );
  await page.keyboard.press("KeyE");
  await expect(objectiveBanner.getByText(/escape with 3 loot/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/cashout 5 or risk greed route/i)).toBeVisible();
  const stealCallouts = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().arenaCallouts);
  expect(stealCallouts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "steal",
        label: "+3 Moon Pearl"
      })
    ])
  );
  await expect(objectiveCompass.getByText(/cashout/i)).toBeVisible();
  await expect(objectiveCompass.getByText(/\+5 at atrium lift/i)).toBeVisible();
  await expect(objectiveCompass.getByText(/follow cyan ring/i)).toBeVisible();
  const scorePopup = page.getByLabel(/score popup/i);
  await expect(scorePopup.getByText(/\+3 moon pearl/i)).toBeVisible();
  const cashoutSurge = page.getByLabel(/cashout surge/i);
  await expect(cashoutSurge.getByText(/run to lift/i)).toBeVisible();
  await expect(cashoutSurge.getByText(/bank \+5/i)).toBeVisible();
  await expect(cashoutSurge.getByText(/\d+s before scans/i)).toBeVisible();
  await expect(cashoutSurge.getByText(/cashout or greed/i)).toBeVisible();
  const cashoutSurgeState = await page.evaluate(() => {
    const surge = document.querySelector(`[aria-label="Cashout surge"]`);
    const objective = document.querySelector(`[aria-label="Current objective"]`);
    return {
      pointerEvents: surge ? getComputedStyle(surge).pointerEvents : null,
      objectiveCut: objective ? objective.scrollHeight > objective.clientHeight + 2 : true,
      present: Boolean(surge)
    };
  });
  expect(cashoutSurgeState).toEqual({ pointerEvents: "none", objectiveCut: false, present: true });
  await expect(page.locator(".arcade-shell")).not.toHaveClass(/compact-opening/);
  await expect(openingContract).toBeHidden();
  await expect(page.getByLabel(/live agents/i)).toBeVisible();
  await expect(page.getByLabel(/mission radio/i)).toBeVisible();
  await expect(miniRadar).toBeVisible();
  await expect(page.getByText(/dash ready/i)).toBeVisible();
  await expect(currentObjective.getByText(/escape with/i)).toBeVisible();
  await expect(page.getByLabel(/rival crew status/i).getByText(/rivals waking in \d+s/i)).toBeVisible();
  await expect(page.getByLabel(/mission radio/i).getByText(/rival agents entered the vault/i)).toBeVisible();
  const wakeThreat = page.getByLabel(/threat vector/i);
  await expect(wakeThreat.getByText(/rivals waking/i)).toBeVisible();
  await expect(wakeThreat.getByText(/\d+s head start before scans/i)).toBeVisible();
  await expect(wakeThreat.getByText(/choose cashout or greed now/i)).toBeVisible();
  await expect(page.getByText(/moon pearl secured/i)).toBeVisible();
  const stealImpact = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().lastImpact);
  expect(stealImpact?.kind).toBe("steal");
  expect(stealImpact?.count).toBeGreaterThan(0);
  await expect(missionBeat.getByText(/loot secured/i)).toBeVisible();
  await expect(missionBeat.getByText(/cashout worth 5/i)).toBeVisible();
  await expect(missionBeat.getByText(/reach atrium lift or press g/i)).toBeVisible();
  await expect(page.locator(".arcade-shell")).not.toHaveClass(/breach-alert/);
  await expect(page.getByText(/3 cashout \+5/i)).toBeVisible();
  await expect(page.getByLabel(/route distance/i)).toContainText(/cashout \+5/i);
  const lootChainWindow = page.getByLabel(/loot chain window/i);
  await expect(lootChainWindow.getByText(/loot chain x1/i)).toBeVisible();
  await expect(lootChainWindow.getByText(/next relic keeps streak/i)).toBeVisible();
  await expect(lootChainWindow.getByText(/\d+s left/i)).toBeVisible();
  await expect(page.getByText(/optional relic/i)).toBeVisible();
  await expect(heistRace.getByText(/blue carrying \+3/i)).toBeVisible();
  await expect(heistRace.getByText(/red 0/i)).toBeVisible();
  await expect(heistRace.getByText(/bank \+5 at lift/i)).toBeVisible();
  const carriedLoot = page.getByLabel(/carried loot/i);
  await expect(carriedLoot.getByText(/carrying \+3/i)).toBeVisible();
  await expect(carriedLoot.getByText(/bank \+5 at lift/i)).toBeVisible();
  const escapePayout = page.getByLabel(/escape payout/i);
  await expect(escapePayout.getByText(/escape bonus \+2/i)).toBeVisible();
  await expect(escapePayout.getByText(/cashout 5/i)).toBeVisible();
  const extractionCue = page.getByLabel(/extraction cue/i);
  await expect(extractionCue.getByText(/extraction armed/i)).toBeVisible();
  await expect(extractionCue.getByText(/atrium lift/i)).toBeVisible();
  await expect(extractionCue.getByText(/cashout 5/i)).toBeVisible();
  await expect(extractionCue.getByText(/follow the cyan ring/i)).toBeVisible();
  const routeChoice = page.getByLabel(/route choice/i);
  await expect(routeChoice.getByText(/bank \+5 now/i)).toBeVisible();
  await expect(routeChoice.getByText(/risk \+3: argent crown/i)).toBeVisible();
  await expect(routeChoice.getByText(/press g for cashout \+8 · \d+m detour/i)).toBeVisible();
  const greedRouteHint = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().greedRouteHint);
  expect(greedRouteHint).toEqual(
    expect.objectContaining({
      visible: true,
      label: "Risk +3",
      cue: "PRESS G",
      target: "Argent Crown"
    })
  );
  await expect(miniRadar.getByText(/cashout \+5: atrium lift/i)).toBeVisible();
  await expect(page.getByLabel(/radar exit: atrium lift/i)).toBeVisible();
  const afterSteal = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().lootValue);
  expect(afterSteal).toBeGreaterThan(0);
  const escapeTarget = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().target);
  expect(escapeTarget?.kind).toBe("escape");
  expect(escapeTarget?.label).toMatch(/atrium lift/i);
  const escapeMarker = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().targetMarker);
  expect(escapeMarker?.label).toBe("Cashout +5");
  const escapeGuide = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().routeGuide);
  expect(escapeGuide?.kind).toBe("escape");
  expect(escapeGuide?.chevronCount).toBeGreaterThan(0);
  expect(escapeGuide?.laneLabel).toBe("BANK +5");
  expect(escapeGuide?.signalVisible).toBe(true);
  const escapeLookahead = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().cameraLookahead);
  expect(escapeLookahead?.targetKind).toBe("escape");
  expect(escapeLookahead?.magnitude).toBeGreaterThan(15);
  const escapeZoneBadge = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().escapeZoneBadge);
  expect(escapeZoneBadge).toEqual({ visible: true, label: "Cashout +5" });
  await page.keyboard.press("KeyG");
  await expect(objectiveBanner.getByText(/greed route armed/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/steal argent crown before escape/i)).toBeVisible();
  await expect(page.locator(".arcade-shell")).toHaveClass(/route-pulse-active/);
  const routePulse = page.getByLabel(/route pulse/i);
  await expect(routePulse.getByText(/greed route locked/i)).toBeVisible();
  await expect(routePulse.getByText(/cashout \+8 if you survive/i)).toBeVisible();
  await expect(routePulse.getByText(/argent crown marker live/i)).toBeVisible();
  const routePulseState = await page.evaluate(() => {
    const pulse = document.querySelector(`[aria-label="Route pulse"]`);
    const objective = document.querySelector(`[aria-label="Current objective"]`);
    return {
      pointerEvents: pulse ? getComputedStyle(pulse).pointerEvents : null,
      objectiveCut: objective ? objective.scrollHeight > objective.clientHeight + 2 : true,
      present: Boolean(pulse)
    };
  });
  expect(routePulseState).toEqual({ pointerEvents: "none", objectiveCut: false, present: true });
  await expect(page.getByLabel(/optional relic/i).getByText(/greed route/i)).toBeVisible();
  await expect(routeChoice.getByText(/greed armed/i)).toBeVisible();
  await expect(routeChoice.getByText(/projected cashout \+8 · \d+m to relic/i)).toBeVisible();
  const armedGreedRouteHint = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().greedRouteHint);
  expect(armedGreedRouteHint).toBeNull();
  await expect(currentObjective.getByText(/greed route: steal argent crown \+3/i)).toBeVisible();
  const greedTarget = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().target);
  expect(greedTarget?.kind).toBe("artifact");
  const greedMarker = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().targetMarker);
  expect(greedMarker?.label).toBe("Argent Crown +3");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByText(/press e \/ space to steal/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(page.locator(".arcade-spotlight").getByText(/loot chain x2/i)).toBeVisible();
  await expect(objectiveBanner.getByText(/escape with 6 loot/i)).toBeVisible();
  await expect(lootChainWindow.getByText(/loot chain x2/i)).toBeVisible();
  const afterGreedSteal = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterGreedSteal?.lootValue).toBeGreaterThan(afterSteal ?? 0);
  expect(afterGreedSteal?.target?.kind).toBe("escape");
  expect(afterGreedSteal?.targetMarker?.label).toBe("Cashout +8");
  expect(afterGreedSteal?.escapeZoneBadge).toEqual({ visible: true, label: "Cashout +8" });
  await expect(heistRace.getByText(/blue carrying \+6/i)).toBeVisible();
  await expect(heistRace.getByText(/bank \+8 at lift/i)).toBeVisible();
  await expect(carriedLoot.getByText(/carrying \+6/i)).toBeVisible();
  await expect(carriedLoot.getByText(/bank \+8 at lift/i)).toBeVisible();

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.locator(".arcade-objective > span").getByText(/press e \/ space to cashout \+8/i)).toBeVisible();
  await expect(page.getByLabel(/active action/i).getByText(/cashout \+8/i)).toBeVisible();
  await expect(extractionCue.getByText(/extract now/i)).toBeVisible();
  await expect(extractionCue.getByText(/press e \/ space to cashout \+8/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(scorePopup.getByText(/\+2 escape bonus/i)).toBeVisible();
  await expect(scorePopup.getByText(/afterburner \+1/i)).toBeVisible();

  await expect(page.locator(".case-file pre").getByText(/agent alibi case file/i)).toBeVisible();
  await expect(page.locator(".final-shell")).toHaveClass(/afterburner-finish/);
  const shareStamp = page.getByLabel(/share case stamp/i);
  await expect(shareStamp.getByText(/agent alibi case file/i)).toBeVisible();
  await expect(shareStamp.getByText(/blue crew wins/i)).toBeVisible();
  await expect(shareStamp.getByText(/s-rank/i)).toBeVisible();
  await expect(shareStamp.getByText(/loot chain x2/i)).toBeVisible();
  await expect(shareStamp.getByText(/stole moon pearl \+ argent crown/i)).toBeVisible();
  const finalScores = page.getByLabel(/final scores/i);
  await expect(finalScores).toBeVisible();
  await expect(finalScores.getByText(/score margin/i)).toBeVisible();
  await expect(finalScores.getByText(/blue by \d+/i)).toBeVisible();
  await expect(finalScores.getByText(/s-rank/i)).toBeVisible();
  await expect(finalScores.getByText(/clean exit bonus/i)).toBeVisible();
  await expect(finalScores.getByText(/afterburner exit/i)).toBeVisible();
  await expect(finalScores.getByText(/\+1/i)).toBeVisible();
  await expect(finalScores.getByText(/loot chain/i)).toBeVisible();
  await expect(finalScores.getByText(/x2/i)).toBeVisible();
  await expect(finalScores.getByText(/relics stolen/i)).toBeVisible();
  await expect(finalScores.getByText(/moon pearl/i)).toBeVisible();
  await expect(finalScores.getByText(/argent crown/i)).toBeVisible();
  const localBestCase = page.getByLabel(/local best case/i);
  await expect(localBestCase.getByText(/new best case/i)).toBeVisible();
  await expect(localBestCase.getByText(/score \d+ · s-rank · chain x2/i)).toBeVisible();
  await expect(localBestCase.getByText(/first record saved/i)).toBeVisible();
  const storedBestCase = await page.evaluate(() => localStorage.getItem("agent-alibi:best-case:v1"));
  expect(storedBestCase).toContain('"score"');
  expect(storedBestCase).toContain('"lootChain":2');
  const caseHighlights = page.getByLabel(/case highlights/i);
  await expect(caseHighlights.getByText(/stole moon pearl \+ argent crown/i)).toBeVisible();
  await expect(caseHighlights.getByText(/cashed out \+8 at lift/i)).toBeVisible();
  await expect(caseHighlights.getByText(/escaped with 6 loot/i)).toBeVisible();
  await expect(caseHighlights.getByText(/afterburner exit \+1/i)).toBeVisible();
  await expect(caseHighlights.getByText(/clean exit bonus \+3/i)).toBeVisible();
  await expect(page.getByText(/cashout banked: \+8/i)).toBeVisible();
  await expect(page.getByText(/afterburner exit bonus: \+1/i)).toBeVisible();
  await expect(page.getByLabel(/rematch hook/i).getByText(/hit afterburner again and cashout before the boost dies/i)).toBeVisible();
  await expect(page.getByText(/relics stolen: moon pearl, argent crown/i)).toBeVisible();
  const nextRunContracts = page.getByLabel(/next run contracts/i);
  await expect(nextRunContracts.getByText(/speedrun/i)).toBeVisible();
  await expect(nextRunContracts.getByText(/beat your case/i)).toBeVisible();
  await expect(nextRunContracts.getByText(/clean play/i)).toBeVisible();
  await expect(nextRunContracts.getByText(/no scan burns/i)).toBeVisible();
  await expect(nextRunContracts.getByText("Boost", { exact: true })).toBeVisible();
  await expect(nextRunContracts.getByText(/afterburner encore/i)).toBeVisible();
  await expect(nextRunContracts.getByText(/cashout before the boost dies/i)).toBeVisible();
  const finalSoundOn = page.getByRole("button", { name: /sound on/i });
  await expect(finalSoundOn).toBeVisible();
  await finalSoundOn.click();
  await expect(page.getByRole("button", { name: /sound off/i })).toBeVisible();
  await page.getByRole("button", { name: /copy result/i }).click();
  await expect(page.getByText(/copied/i)).toBeVisible();
  const runItBack = page.getByRole("button", { name: /run it back/i });
  await expect(runItBack).toBeVisible();
  await expect(runItBack).toContainText(/afterburner encore/i);
  await runItBack.click();
  await expect(page.getByLabel(/opening contract/i).getByText(/moon vault contract/i)).toBeVisible();
  await expect(page.getByLabel(/final scores/i)).toBeHidden();
});

test("in-world action ring switches from approach to ready prompts", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");

  const openingRing = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().actionRing);
  expect(openingRing).toEqual(
    expect.objectContaining({
      visible: true,
      kind: "artifact",
      state: "approach",
      label: "STEAL",
      cue: "APPROACH"
    })
  );

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  const readyStealRing = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().actionRing);
  expect(readyStealRing).toEqual(
    expect.objectContaining({
      visible: true,
      kind: "artifact",
      state: "ready",
      label: "STEAL",
      cue: "E / SPACE"
    })
  );

  await page.keyboard.press("KeyE");
  const cashoutApproachRing = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().actionRing);
  expect(cashoutApproachRing).toEqual(
    expect.objectContaining({
      visible: true,
      kind: "escape",
      state: "approach",
      label: "CASHOUT",
      cue: "APPROACH"
    })
  );

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  const cashoutReadyRing = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().actionRing);
  expect(cashoutReadyRing).toEqual(
    expect.objectContaining({
      visible: true,
      kind: "escape",
      state: "ready",
      label: "CASHOUT",
      cue: "E / SPACE"
    })
  );
});

test("stealing a relic gives the player a short cashout speed surge", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");

  const beforeSurgeCamera = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().camera);
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await page.keyboard.press("KeyE");

  const surge = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().lootSpeedSurge);
  expect(surge).toEqual(
    expect.objectContaining({
      active: true,
      label: "AFTERBURNER",
      multiplier: expect.any(Number)
    })
  );
  expect(surge?.multiplier).toBeGreaterThan(1.3);
  await expect(page.locator(".arcade-shell")).toHaveClass(/afterburner-active/);
  const cashoutSurge = page.getByLabel(/cashout surge/i);
  await expect(cashoutSurge.getByText(/afterburner x2\.05/i)).toBeVisible();
  await expect(cashoutSurge.getByText(/\d+s boost/i)).toBeVisible();
  await expect(cashoutSurge.getByText(/afterburner exit \+1/i)).toBeVisible();
  await page.waitForTimeout(160);
  const surgeCamera = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().camera);
  expect(surgeCamera?.zoom).toBeGreaterThan((beforeSurgeCamera?.zoom ?? 0) + 0.02);

  const beforeSurgeMove = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().player);
  const beforeSurgeX = beforeSurgeMove?.x ?? 0;
  await page.keyboard.down("ArrowRight");
  try {
    await page.waitForFunction((startX) => ((window.__AGENT_ALIBI_ARCADE_STATE__?.().player?.x ?? startX) - startX) > 80, beforeSurgeX, {
      timeout: 2_500
    });
  } finally {
    await page.keyboard.up("ArrowRight");
  }
  const afterSurgeMove = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().player);

  expect((afterSurgeMove?.x ?? 0) - beforeSurgeX).toBeGreaterThan(80);
});

test("opening movement coach disappears after the player moves", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");

  const openingCoach = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().movementCoach);
  expect(openingCoach).toEqual(
    expect.objectContaining({
      visible: true,
      label: "MOVE"
    })
  );

  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(360);
  await page.keyboard.up("ArrowRight");

  const afterMoveCoach = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().movementCoach);
  expect(afterMoveCoach).toBeNull();
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

test("opening seconds focus the player on the contract before expanding the full HUD", async ({ page }) => {
  await startSoloArcade(page);

  await expect(page.locator(".arcade-shell")).toHaveClass(/compact-opening/);
  const openingContract = page.getByLabel(/opening contract/i);
  await expect(openingContract.getByText(/moon vault contract/i)).toBeVisible();
  await expect(openingContract.getByText(/steal moon pearl \+3/i)).toBeVisible();
  await expect(openingContract.getByText(/cashout at atrium lift/i)).toBeVisible();
  await expect(openingContract.getByText(/red crew breaches after first score/i)).toBeVisible();
  await expect(page.getByLabel(/live agents/i)).toBeHidden();
  await expect(page.getByLabel(/mission radio/i)).toBeHidden();
  await expect(page.getByLabel(/mini radar/i)).toBeHidden();
  await expect(page.getByLabel(/current objective/i).getByText(/steal the moon pearl \+3/i)).toBeVisible();

  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget === "function");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await page.keyboard.press("KeyE");

  await expect(page.locator(".arcade-shell")).not.toHaveClass(/compact-opening/);
  await expect(openingContract).toBeHidden();
  await expect(page.getByLabel(/live agents/i)).toBeVisible();
  await expect(page.getByLabel(/mission radio/i)).toBeVisible();
  await expect(page.getByLabel(/mini radar/i)).toBeVisible();
  await expect(page.getByLabel(/current objective/i).getByText(/escape with/i)).toBeVisible();
});

test("contract chain keeps the current heist step explicit", async ({ page }) => {
  await startSoloArcade(page);
  await expect(page.locator(".arcade-shell")).not.toHaveClass(/compact-opening/, { timeout: 20_000 });

  const contractChain = page.getByLabel(/contract chain/i);
  await expect(contractChain.getByText(/steal relic/i)).toBeVisible();
  await expect(contractChain.getByText(/break heat/i)).toBeVisible();
  await expect(contractChain.getByText(/cashout/i)).toBeVisible();
  await expect(contractChain.locator('[aria-current="step"]')).toContainText(/steal relic/i);

  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget === "function");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await page.keyboard.press("Space");

  await expect(page.getByLabel(/score popup/i).getByText(/moon pearl/i)).toBeVisible();
  await expect(contractChain.getByLabel(/steal relic complete/i)).toBeVisible();
  await expect(contractChain.locator('[aria-current="step"]')).toContainText(/cashout/i);
});

test("momentum meter turns clean runs and loot chains into one readable payoff", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForTimeout(13_200);

  const momentumMeter = page.getByLabel(/momentum meter/i);
  await expect(momentumMeter.getByText(/clean bonus/i)).toBeVisible();
  await expect(momentumMeter.getByText(/s-rank \+3/i)).toBeVisible();
  await expect(momentumMeter.getByText(/\d+s for clean exit/i)).toBeVisible();

  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget === "function");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await page.keyboard.press("Space");

  await expect(momentumMeter.getByText(/loot chain x1/i)).toBeVisible();
  await expect(momentumMeter.getByText(/next relic keeps streak/i)).toBeVisible();
  await expect(momentumMeter.getByText(/\d+s to chain or cashout/i)).toBeVisible();
});

test("rival agents stay visually staged until the breach starts", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");

  const staged = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(staged?.rivalsReleased).toBe(false);
  expect(staged?.rivals?.length).toBeGreaterThanOrEqual(3);
  expect(staged?.rivals?.map((rival) => rival.visualLabel)).toEqual(["STANDBY", "STANDBY", "STANDBY"]);
  expect(staged?.rivals?.every((rival) => rival.alpha < 0.7)).toBe(true);
  expect(staged?.rivalIntentRoutes).toEqual({ visible: false, routeCount: 0, targetLabels: [] });

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await page.keyboard.press("KeyE");
  await expect(page.getByLabel(/mission radio/i).getByText(/rival agents entered the vault/i)).toBeVisible();

  const breached = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(breached?.rivalsReleased).toBe(true);
  expect(breached?.rivals?.map((rival) => rival.visualLabel)).toEqual(["ROOK", "GREMLIN", "ANCHOR"]);
  expect(breached?.rivals?.every((rival) => rival.alpha > 0.95)).toBe(true);
  expect(breached?.rivalIntentRoutes?.visible).toBe(true);
  expect(breached?.rivalIntentRoutes?.routeCount).toBeGreaterThanOrEqual(3);
  expect(breached?.rivalIntentRoutes?.targetLabels).toEqual(expect.arrayContaining([expect.stringMatching(/rook -> /i)]));
});

test("first score triggers a visible rival breach cut-in", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget === "function");

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await page.keyboard.press("KeyE");

  const rivalComms = page.getByLabel(/rival comms/i);
  await expect(rivalComms.getByText(/red crew/i)).toBeVisible();
  await expect(rivalComms.getByText(/breach live/i)).toBeVisible();
  await expect(rivalComms.getByText(/\d+s before scans/i)).toBeVisible();
  const cutInLayout = await page.evaluate(() => {
    const bark = document.querySelector(`[aria-label="Rival comms"]`)?.getBoundingClientRect();
    const radio = document.querySelector(`[aria-label="Mission radio"]`)?.getBoundingClientRect();
    const objective = document.querySelector(`[aria-label="Current objective"]`)?.getBoundingClientRect();
    const overlaps = (left: DOMRect | undefined, right: DOMRect | undefined) =>
      Boolean(left && right && !(left.right < right.left || left.left > right.right || left.bottom < right.top || left.top > right.bottom));
    return {
      overlapsRadio: overlaps(bark, radio),
      overlapsObjective: overlaps(bark, objective)
    };
  });
  expect(cutInLayout).toEqual({ overlapsRadio: false, overlapsObjective: false });
});

test("rival breach throws a red alert pulse without blocking the HUD", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget === "function");

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await page.keyboard.press("KeyE");

  await expect(page.locator(".arcade-shell")).toHaveClass(/breach-alert/);
  const pulse = page.getByLabel(/breach alert pulse/i);
  await expect(pulse).toBeVisible();
  const pulseState = await page.evaluate(() => {
    const pulseElement = document.querySelector(`[aria-label="Breach alert pulse"]`);
    const objective = document.querySelector(`[aria-label="Current objective"]`);
    return {
      pointerEvents: pulseElement ? getComputedStyle(pulseElement).pointerEvents : null,
      objectiveCut: objective ? objective.scrollHeight > objective.clientHeight + 2 : true,
      present: Boolean(pulseElement)
    };
  });
  expect(pulseState.pointerEvents).toBe("none");
  expect(pulseState.objectiveCut).toBe(false);
  expect(pulseState.present).toBe(true);

  await expect(page.locator(".arcade-shell")).not.toHaveClass(/breach-alert/, { timeout: 12_000 });
});

test("arcade sound can be toggled during a run", async ({ page }) => {
  await startSoloArcade(page);

  const soundOn = page.getByRole("button", { name: /sound on/i });
  await expect(soundOn).toBeVisible();
  await soundOn.click();
  const soundOff = page.getByRole("button", { name: /sound off/i });
  await expect(soundOff).toBeVisible();
  await soundOff.click();
  await expect(page.getByRole("button", { name: /sound on/i })).toBeVisible();
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

test("security sweeps telegraph danger and punish standing in the beam", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");

  const staged = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(staged?.securitySweep).toEqual({
    active: false,
    inBeam: false,
    inWarning: false,
    telegraphVisible: false,
    hitCount: 0,
    dodgeCount: 0,
    label: "Laser sweep"
  });

  const alarmBeforeSweep = staged?.alarmRaw ?? 0;
  await page.evaluate(() =>
    (
      window.__AGENT_ALIBI_ARCADE_DEBUG__ as
        | {
            forceSecuritySweep?: () => void;
          }
        | undefined
    )?.forceSecuritySweep?.()
  );

  const armedSweep = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().securitySweep);
  expect(armedSweep).toEqual(
    expect.objectContaining({
      active: true,
      inBeam: true,
      inWarning: true,
      telegraphVisible: true,
      hitCount: 0,
      label: "Laser sweep"
    })
  );
  const threatVector = page.getByLabel(/threat vector/i);
  await expect(threatVector.getByText(/laser sweep/i)).toBeVisible();
  await expect(threatVector.getByText(/dash clear/i)).toBeVisible();
  const sweepLayout = await page.evaluate(() => {
    const objective = document.querySelector(`[aria-label="Current objective"]`);
    const steps = document.querySelector(".arcade-steps");
    return {
      objectiveCut: objective ? objective.scrollHeight > objective.clientHeight + 2 : true,
      stepsDisplay: steps ? getComputedStyle(steps).display : null
    };
  });
  expect(sweepLayout).toEqual({ objectiveCut: false, stepsDisplay: "none" });

  await page.waitForTimeout(850);
  await expect(page.getByText(/laser sweep \+1 alarm/i)).toBeVisible();
  const punishedSweep = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(punishedSweep?.securitySweep?.hitCount).toBeGreaterThan(0);
  expect(punishedSweep?.alarmRaw).toBeGreaterThan(alarmBeforeSweep + 0.35);
});

test("cleanly dodging a security sweep gives immediate reward feedback", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_STATE__ === "function");

  await page.evaluate(() =>
    (
      window.__AGENT_ALIBI_ARCADE_DEBUG__ as
        | {
            forceSecuritySweepWarning?: () => void;
          }
        | undefined
    )?.forceSecuritySweepWarning?.()
  );
  const warningSweep = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().securitySweep);
  expect(warningSweep).toEqual(
    expect.objectContaining({
      active: true,
      inBeam: false,
      inWarning: true,
      dodgeCount: 0,
      hitCount: 0
    })
  );

  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(360);
  await page.keyboard.up("ArrowLeft");

  await expect(page.getByLabel("Score popup").getByText(/clean dodge/i)).toBeVisible();
  const dodgedSweep = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(dodgedSweep?.securitySweep).toEqual(
    expect.objectContaining({
      active: true,
      inWarning: false,
      dodgeCount: 1,
      hitCount: 0
    })
  );
  expect(dodgedSweep?.lastImpact?.kind).toBe("dodge");
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
  expect(afterDash?.dashShockwave?.active).toBe(true);
  expect(afterDash?.dashShockwave?.burstCount).toBeGreaterThan(0);
  expect(afterDash?.dashShockwave?.radius).toBeGreaterThan(20);
  expect(afterDash?.lastCameraKick?.kind).toBe("dash");

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await expect(page.getByText(/press e \/ space to steal/i)).toBeVisible();
  await controls.getByRole("button", { name: /interact/i }).click();
  await expect(page.locator(".arcade-spotlight").getByText(/moon pearl secured/i)).toBeVisible();
  await expect(page.getByLabel(/route choice/i).getByText(/press g/i)).toBeVisible();
  await controls.getByRole("button", { name: /switch route/i }).click();
  await expect(page.getByLabel(/current objective/i).getByText(/greed route: steal argent crown \+3/i)).toBeVisible();
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
  await expect(controls.getByRole("button", { name: /switch route: cashout \+5 or greed route available/i })).toBeVisible();
  await controls.getByRole("button", { name: /switch route: cashout \+5 or greed route available/i }).click();
  await expect(controls.getByRole("button", { name: /switch route: greed route armed \/ cashout \+5/i })).toBeVisible();
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
  await expect(page.locator(".arcade-shell")).toHaveClass(/rival-pressure-active/);
  await expect(rivalLootAlert.getByText(/pending \+\d/i)).toBeVisible();
  await expect(rivalLootAlert.getByText(/stole/i)).toBeVisible();
  const rivalComms = page.getByLabel(/rival comms/i);
  await expect(rivalComms.getByText(/rook/i)).toBeVisible();
  await expect(rivalComms.getByText(/moon pearl secured/i)).toBeVisible();
  await expect(rivalComms.getByText(/mapped the exit/i)).toBeVisible();
  const rivalBubble = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().rivals.find((rival) => rival.name === "Rook")?.barkBubble);
  expect(rivalBubble).toEqual(
    expect.objectContaining({
      visible: true,
      text: expect.stringMatching(/mapped the exit/i)
    })
  );
  const missionBeat = page.getByLabel(/mission beat/i);
  await expect(missionBeat.getByText(/carrier run/i)).toBeVisible();
  await expect(missionBeat.getByText(/rook has moon pearl/i)).toBeVisible();
  await expect(missionBeat.getByText(/chase the gold-red carrier blip/i)).toBeVisible();
  const contractChain = page.getByLabel(/contract chain/i);
  await expect(contractChain.getByText(/intercept rook \+3/i)).toBeVisible();
  const threatVector = page.getByLabel(/threat vector/i);
  await expect(threatVector.getByText(/carrier (?:n|ne|e|se|s|sw|w|nw|here) \d+m/i)).toBeVisible();
  await expect(threatVector.getByText(/rook with moon pearl \+3/i)).toBeVisible();
  await expect(threatVector.getByText(/close gap and press e/i)).toBeVisible();
  await expect(page.getByLabel(/route distance/i).getByText(/carrier (?:n|ne|e|se|s|sw|w|nw|here) \d+m/i)).toBeVisible();
  const carrierObjective = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().target);
  expect(carrierObjective?.kind).toBe("carrier");
  expect(carrierObjective?.label).toMatch(/rook carrier/i);
  const carrierMarker = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().targetMarker);
  expect(carrierMarker?.label).toBe("Rook +3");
  const carrierHalo = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().threatHalo);
  expect(carrierHalo?.kind).toBe("carrier");
  expect(carrierHalo?.visible).toBe(true);
  const carrierCashoutRoute = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().carrierCashoutRoute);
  expect(carrierCashoutRoute?.visible).toBe(true);
  expect(carrierCashoutRoute?.targetLabel).toBe("Atrium Lift");
  expect(carrierCashoutRoute?.chevronCount).toBeGreaterThan(0);
  const carrierRouteGuide = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().routeGuide);
  expect(carrierRouteGuide?.laneLabel).toBe("INTERCEPT ROUTE");
  expect(carrierRouteGuide?.pulseCount).toBeGreaterThan(0);
  expect(carrierRouteGuide?.signalVisible).toBe(true);
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
  const beforeRecoveryCamera = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().camera);
  await page.keyboard.press("KeyE");
  await expect(page.getByText("Intercepted Rook", { exact: true })).toBeVisible();
  await expect(page.getByLabel(/score popup/i).getByText(/recovered \+3 - red denied/i)).toBeVisible();
  await expect(page.getByLabel(/cashout surge/i).getByText(/afterburner x2\.05/i)).toBeVisible();
  const recoverySurge = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().lootSpeedSurge);
  expect(recoverySurge).toEqual(
    expect.objectContaining({
      active: true,
      label: "AFTERBURNER",
      source: "Moon Pearl"
    })
  );
  await page.waitForTimeout(160);
  const recoveryCamera = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().camera);
  expect(recoveryCamera?.zoom).toBeGreaterThan((beforeRecoveryCamera?.zoom ?? 0) + 0.02);
  const interceptCallouts = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().arenaCallouts);
  expect(interceptCallouts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "intercept",
        label: "Recovered +3 - Red denied"
      })
    ])
  );
  await expect(rivalComms.getByText(/good read/i)).toBeVisible();
  await expect(rivalComms.getByText(/one narrow angle/i)).toBeVisible();
  const afterIntercept = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
  expect(afterIntercept?.lootValue).toBeGreaterThan(0);
  expect(afterIntercept?.aiLootValue).toBe(0);
  expect(afterIntercept?.lastImpact?.kind).toBe("intercept");

  await page.evaluate(() => window.__AGENT_ALIBI_FINISH_ARCADE__?.());
  await expect(page.getByLabel(/share case stamp/i).getByText(/red denied: moon pearl/i)).toBeVisible();
  const finalScores = page.getByLabel(/final scores/i);
  const carrierCard = finalScores.locator(".final-intercepts");
  await expect(carrierCard.getByText(/carrier intercepts/i)).toBeVisible();
  await expect(carrierCard.getByText(/x1/i)).toBeVisible();
  await expect(carrierCard.getByText(/red denied: moon pearl/i)).toBeVisible();
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
  const rivalComms = page.getByLabel(/rival comms/i);
  await expect(rivalComms.getByText(/moon pearl \+3 banked/i)).toBeVisible();
  await expect(rivalComms.getByText(/planning beats panic/i)).toBeVisible();
  const cashoutCallouts = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.().arenaCallouts);
  expect(cashoutCallouts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "cashout",
        label: "Red cashout +3"
      })
    ])
  );
  await expect(page.getByLabel(/heist race/i).getByText(/red 3/i)).toBeVisible();
  const missionBeat = page.getByLabel(/mission beat/i);
  await expect(missionBeat.getByText(/score pressure/i)).toBeVisible();
  await expect(missionBeat.getByText(/red leads by 3/i)).toBeVisible();
  await expect(missionBeat.getByText(/argent crown \+3 plus lift bonus can beat red/i)).toBeVisible();
  const objectiveCompass = page.getByLabel(/objective compass/i);
  await expect(objectiveCompass.getByText(/jam/i)).toBeVisible();
  await expect(objectiveCompass.getByText(/rook scan/i)).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect(objectiveCompass.getByText(/comeback/i)).toBeVisible();
  await expect(objectiveCompass.getByText(/argent crown \+3/i)).toBeVisible();
  await expect(objectiveCompass.getByText(/steal \+ cashout beats red/i)).toBeVisible();

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
  await expect(page.locator(".arcade-shell")).toHaveClass(/countdown-pulse-active/);
  const countdownPulse = page.getByLabel(/final countdown pulse/i);
  await expect(countdownPulse.getByText(/final 30s/i)).toBeVisible();
  await expect(countdownPulse.getByText(/escape now/i)).toBeVisible();
  await expect(countdownPulse).not.toContainText(/cashout now/i);
  const countdownState = await page.evaluate(() => {
    const pulse = document.querySelector(`[aria-label="Final countdown pulse"]`);
    const objective = document.querySelector(`[aria-label="Current objective"]`);
    const pulseRect = pulse?.getBoundingClientRect();
    const objectiveRect = objective?.getBoundingClientRect();
    const overlapsObjective = Boolean(
      pulseRect &&
        objectiveRect &&
        pulseRect.left < objectiveRect.right &&
        pulseRect.right > objectiveRect.left &&
        pulseRect.top < objectiveRect.bottom &&
        pulseRect.bottom > objectiveRect.top
    );
    return {
      pointerEvents: pulse ? getComputedStyle(pulse).pointerEvents : null,
      overlapsObjective,
      present: Boolean(pulse)
    };
  });
  expect(countdownState).toEqual({ pointerEvents: "none", overlapsObjective: false, present: true });
  const missionBeat = page.getByLabel(/mission beat/i);
  await expect(missionBeat.getByText(/final countdown/i)).toBeVisible();
  await expect(missionBeat.getByText(/lockdown is closing/i)).toBeVisible();
  await expect(missionBeat.getByText(/escape now/i)).toBeVisible();
  await expect(missionBeat).not.toContainText(/first objective|steal moon pearl/i);
  await expect(page.locator('[aria-label="Current objective"] > strong')).toContainText(/lockdown is closing/i);
  const threatVector = page.getByLabel(/threat vector/i);
  await expect(threatVector.getByText(/vault sealing/i)).toBeVisible();
  await expect(threatVector.getByText(/escape before the doors close/i)).toBeVisible();
  await expect(threatVector).not.toContainText(/rivals waking|choose cashout or greed|cashout before/i);
  const rivalCrewStatus = page.getByLabel(/rival crew status/i);
  await expect(rivalCrewStatus).toContainText(/vault sealing/i);
  await expect(rivalCrewStatus).not.toContainText(/rivals waking/i);
  await expect(page.getByLabel(/rival comms/i)).toBeHidden();
  await expect(page.locator(".arcade-shell")).not.toHaveClass(/breach-alert/);
});

test("lockdown with carried loot uses cashout copy", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget === "function");

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget());
  await page.keyboard.press("KeyE");
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceLockdown?.());

  const countdownPulse = page.getByLabel(/final countdown pulse/i);
  await expect(countdownPulse.getByText(/cashout now/i)).toBeVisible();
  await expect(countdownPulse).not.toContainText(/escape now/i);
  await expect(page.getByLabel(/mission beat/i).getByText(/cashout now/i)).toBeVisible();
  await expect(page.getByLabel(/threat vector/i).getByText(/cashout before the doors close/i)).toBeVisible();
});

test("no-loot lockdown escape final case avoids cashout wording", async ({ page }) => {
  await startSoloArcade(page);
  await page.waitForFunction(() => typeof window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceLockdown === "function");

  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.forceLockdown?.());
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget?.());
  await page.keyboard.press("KeyE");

  await expect(page.getByRole("heading", { name: /empty-handed exit/i })).toBeVisible();
  await expect(page.getByLabel(/share case stamp/i).getByText(/empty-handed exit/i)).toBeVisible();
  const finalScores = page.getByLabel(/final scores/i);
  await expect(finalScores).toBeVisible();
  const caseHighlights = page.getByLabel(/case highlights/i);
  await expect(caseHighlights.getByText(/escaped before the seal/i)).toBeVisible();
  await expect(caseHighlights.getByText(/no relics banked/i)).toBeVisible();
  await expect(page.getByText(/escape bonus: \+2/i)).toBeVisible();
  await expect(page.getByText(/escaped empty-handed before lockdown/i)).toBeVisible();
  await expect(page.locator(".case-file")).not.toContainText(/cashed out \+2|cashout banked/i);
  const scorePopup = page.getByLabel(/score popup/i);
  await expect(scorePopup.getByText(/no relics banked/i)).toBeVisible();
  await expect(scorePopup).not.toContainText(/cashout/i);
  await expect(page.getByLabel(/rematch hook/i).getByText(/steal one relic/i)).toBeVisible();
  await expect(page.getByLabel(/rematch hook/i)).not.toContainText(/cashout/i);
  await expect(page.getByLabel(/share case stamp/i)).not.toContainText(/cashed out/i);
  await expect(page.locator(".case-file")).not.toContainText(/silent moon run/i);
  const finalSkin = await page.evaluate(() => {
    const parseRgb = (value: string) => {
      const [r = 255, g = 255, b = 255] = value.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number) ?? [];
      return { r, g, b, luminance: 0.2126 * r + 0.7152 * g + 0.0722 * b };
    };
    const styleFor = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        background: parseRgb(style.backgroundColor),
        color: parseRgb(style.color),
        backgroundImage: style.backgroundImage,
        borderColor: style.borderColor,
        boxShadow: style.boxShadow
      };
    };

    return {
      shell: styleFor(".final-shell"),
      score: styleFor(".final-score"),
      pre: styleFor(".case-file pre"),
      action: styleFor(".final-actions button")
    };
  });
  expect(finalSkin.shell?.background.luminance).toBeLessThan(46);
  expect(finalSkin.shell?.backgroundImage).toMatch(/radial-gradient|linear-gradient/i);
  expect(finalSkin.score?.background.luminance).toBeLessThan(72);
  expect(finalSkin.pre?.background.luminance).toBeLessThan(58);
  expect(finalSkin.action?.boxShadow).not.toBe("none");
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
  await expect(page.locator(".arcade-shell")).toHaveClass(/scan-lock-active/);
  const scanLockPulse = page.getByLabel(/scan lock pulse/i);
  await expect(scanLockPulse.getByText(/scan lock/i)).toBeVisible();
  await expect(scanLockPulse.getByText(/press e \/ space/i)).toBeVisible();
  const scanLockPulseState = await page.evaluate(() => {
    const pulse = document.querySelector(`[aria-label="Scan lock pulse"]`);
    const objective = document.querySelector(`[aria-label="Current objective"]`);
    const pulseRect = pulse?.getBoundingClientRect();
    const objectiveRect = objective?.getBoundingClientRect();
    const overlapsObjective = Boolean(
      pulseRect &&
        objectiveRect &&
        pulseRect.left < objectiveRect.right &&
        pulseRect.right > objectiveRect.left &&
        pulseRect.top < objectiveRect.bottom &&
        pulseRect.bottom > objectiveRect.top
    );
    return {
      pointerEvents: pulse ? getComputedStyle(pulse).pointerEvents : null,
      overlapsObjective,
      present: Boolean(pulse)
    };
  });
  expect(scanLockPulseState).toEqual({ pointerEvents: "none", overlapsObjective: false, present: true });
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
