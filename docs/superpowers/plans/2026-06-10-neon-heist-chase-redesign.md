# Neon Heist Chase Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Agent Alibi's first playable experience with a low-text, high-readability top-down neon heist chase that is understandable and exciting in the first 30 seconds.

**Architecture:** Keep the current React + Phaser architecture, but make the arcade scene authoritative for player understanding: visual routes, pickups, chase state, and extraction carry the experience. React becomes a thin overlay for timer, sound, rare popups, touch controls, and final case file. Add test-visible debug contracts so Playwright can prove the opening is low-text, nonblank, localized, mobile-safe, and mechanically playable.

**Tech Stack:** TypeScript, React, Phaser, Vitest, Playwright, pnpm workspace.

---

## File Structure

- Modify: `apps/web/src/arcade/ArcadeHeistScene.ts`
  - Owns world art, player/rival visuals, route lanes, first theft impact, chase debug state, alibi pulse visuals, extraction sequence.
- Modify: `apps/web/src/arcade/ArcadeHeistStage.tsx`
  - Owns touch controls, keyboard focus, and accessible control labels.
- Modify: `apps/web/src/arcade/arcade-types.ts`
  - Adds minimal presentation/debug fields only when needed by tests or UI.
- Modify: `apps/web/src/arcade/hud-density.ts`
  - Keeps opening HUD minimal and chase HUD compact.
- Modify: `apps/web/src/arcade/hud-density.test.ts`
  - Unit tests for minimal opening and chase density.
- Modify: `apps/web/src/game-ui/MatchScreen.tsx`
  - Removes dense gameplay overlays from first run; preserves rare critical overlays and final transition.
- Modify: `apps/web/src/styles/global.css`
  - Replaces dashboard-like arcade overlay with minimal full-screen game styling and mobile-safe controls.
- Modify: `apps/web/src/i18n.ts`
  - Adds compact EN/RU/ZH labels used by minimal UI and accessibility labels.
- Modify: `apps/web/src/i18n.test.ts`
  - Tests compact labels exist for all three languages.
- Modify: `tests/e2e/play-now.spec.ts`
  - Tests first-run readability, movement, first relic, chase, extraction, mobile layout, and nonblank canvas.

---

### Task 1: Lock The New First-Run Contract With Failing Tests

**Files:**
- Modify: `tests/e2e/play-now.spec.ts`
- Modify: `apps/web/src/arcade/hud-density.test.ts`

- [ ] **Step 1: Add a Playwright helper for canvas signal**

Add this helper near the top of `tests/e2e/play-now.spec.ts` after `visibleText`:

```ts
async function canvasSignal(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector(".arcade-stage canvas") as HTMLCanvasElement | null;
    if (!canvas) return { exists: false, width: 0, height: 0, coloredPixels: 0, brightPixels: 0 };
    const width = canvas.width;
    const height = canvas.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context || width === 0 || height === 0) return { exists: true, width, height, coloredPixels: 0, brightPixels: 0 };
    const sampleWidth = Math.min(width, 240);
    const sampleHeight = Math.min(height, 160);
    const image = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    let coloredPixels = 0;
    let brightPixels = 0;
    for (let index = 0; index < image.length; index += 4) {
      const red = image[index] ?? 0;
      const green = image[index + 1] ?? 0;
      const blue = image[index + 2] ?? 0;
      const alpha = image[index + 3] ?? 0;
      if (alpha > 20 && Math.max(red, green, blue) - Math.min(red, green, blue) > 24) coloredPixels += 1;
      if (alpha > 20 && red + green + blue > 140) brightPixels += 1;
    }
    return { exists: true, width, height, coloredPixels, brightPixels };
  });
}
```

- [ ] **Step 2: Replace opening density expectations with the new contract**

Inside `test("solo match starts and reaches final case file", ...)`, after `await startSoloArcade(page);`, assert the first screen is tiny-text and visually alive:

```ts
await expect(page.locator(".arcade-shell")).toHaveClass(/neon-chase-opening/);
const openingHudText = await visibleText(page, ".arcade-shell");
expect(openingHudText.length).toBeLessThanOrEqual(48);
expect(openingHudText).toMatch(/2:30/i);
expect(openingHudText).toMatch(/\+3/i);
expect(openingHudText).not.toMatch(/mission|contract|briefing|rivals|alarm|loot|route|follow|press|cashout|scan|director/i);

const signal = await canvasSignal(page);
expect(signal.exists).toBe(true);
expect(signal.width).toBeGreaterThan(600);
expect(signal.height).toBeGreaterThan(360);
expect(signal.coloredPixels).toBeGreaterThan(800);
expect(signal.brightPixels).toBeGreaterThan(400);
```

- [ ] **Step 3: Add debug-state presentation expectations**

In the same test after `initialTarget` is read, replace the `worldPresentation` block with:

```ts
expect(initialTarget?.worldPresentation).toEqual(
  expect.objectContaining({
    style: "neon-heist-chase",
    visibleRoomLabels: 0,
    ambientLightCount: expect.any(Number),
    floorDetailCount: expect.any(Number),
    routeSignalMode: "iconic",
    openingTextMode: "minimal",
    playerVisual: "hover-agent",
    cashoutForkVisible: false
  })
);
expect(initialTarget?.worldPresentation?.ambientLightCount).toBeGreaterThanOrEqual(18);
expect(initialTarget?.worldPresentation?.floorDetailCount).toBeGreaterThanOrEqual(40);
expect(initialTarget?.targetMarker?.label).toBe("+3");
expect(initialTarget?.routeSignal).toEqual(
  expect.objectContaining({
    visible: true,
    laneLabel: "",
    detail: "",
    labelVisible: false,
    detailVisible: false,
    plateHeight: expect.any(Number)
  })
);
expect(initialTarget?.routeSignal?.plateHeight).toBeLessThanOrEqual(12);
```

- [ ] **Step 4: Add hud-density unit expectations**

In `apps/web/src/arcade/hud-density.test.ts`, add:

```ts
it("uses the neon chase opening while the player has no loot and no rival pressure", () => {
  expect(selectArcadeHudDensity(baseHud())).toBe("opening");
});

it("leaves opening mode after the first steal so the cashout fork can appear", () => {
  expect(selectArcadeHudDensity({ ...baseHud(), lootValue: 3, artifactsStolen: 1, canEscape: true })).toBe("chase");
});
```

- [ ] **Step 5: Run RED**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm exec playwright test tests/e2e/play-now.spec.ts -g "solo match starts and reaches final case file"
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm --filter @agent-alibi/web test -- hud-density.test.ts
```

Expected: Playwright fails because `.neon-chase-opening`, `style: "neon-heist-chase"`, `openingTextMode`, `playerVisual`, `cashoutForkVisible`, `+3` target label, and iconic route signal are not implemented yet. Unit test should pass if current density already returns `opening`/`chase`; if it fails, the failure defines the desired density behavior.

---

### Task 2: Make React Overlay Minimal Instead Of Dashboard-Like

**Files:**
- Modify: `apps/web/src/game-ui/MatchScreen.tsx`
- Modify: `apps/web/src/styles/global.css`
- Modify: `tests/e2e/play-now.spec.ts`

- [ ] **Step 1: Add the class contract in `MatchScreen.tsx`**

Before the `return (` in the arcade branch, add:

```ts
const neonOpening = hudDensity === "opening" && (hud?.artifactsStolen ?? 0) === 0;
const arcadeShellClassName = [
  "arcade-shell",
  "neon-heist-chase",
  hud?.phase ?? "stealth",
  neonOpening ? "neon-chase-opening" : "",
  hudDensity === "chase" ? "neon-chase-active" : "",
  firstStealCashoutMoment ? "first-steal-cashout-moment" : "",
  cashoutPayoff ? "cashout-payoff-active" : "",
  hunterChase ? "hunter-chase-active" : "",
  alibiPayoff ? "alibi-payoff-active" : "",
  lockBreakPayoff ? "lock-break-payoff-active" : "",
  breachAlert ? "breach-alert" : "",
  visibleRoutePulse ? "route-pulse-active" : "",
  visibleRoutePulse?.mode === "alibi" ? "alibi-pulse-active" : "",
  visibleRoutePulse?.mode === "comeback" ? "comeback-pulse-active" : "",
  breakoutCashoutWindow ? "breakout-cashout-active" : "",
  rivalCashoutEmergency ? "rival-cashout-emergency-active" : "",
  scanLockActive ? "scan-lock-active" : "",
  threatCueActive ? "threat-cue-active" : "",
  denseThreatActive ? "dense-threat-active" : "",
  countdownPulseActive ? "countdown-pulse-active" : "",
  afterburnerActive ? "afterburner-active" : "",
  breachSprintActive ? "breach-sprint-active" : "",
  ghostStepActive ? "ghost-step-active" : "",
  rivalPressureActive ? "rival-pressure-active" : ""
]
  .filter(Boolean)
  .join(" ");
```

Then replace the long `className={...}` expression on `<main>` with:

```tsx
className={arcadeShellClassName}
```

- [ ] **Step 2: Hide text-heavy UI while `neonOpening` is true**

Change render guards so these elements are not rendered during the opening:

```tsx
{!neonOpening && visibleObjectiveBanner ? (... ) : null}
{!neonOpening && visibleScorePopup ? (... ) : null}
{!neonOpening && visibleRivalBark ? (... ) : null}
{!neonOpening ? <aside className="arcade-roster" ...>...</aside> : null}
{!neonOpening && rivalIntelCards.length > 0 ? (... ) : null}
{!neonOpening ? <aside className="arcade-feed" ...>...</aside> : null}
{!neonOpening && currentActiveAction ? (... ) : null}
{!neonOpening && displayedObjectiveCompass ? (... ) : null}
{!neonOpening && !focusedCommandMode && hud?.missionBeat ? (... ) : null}
{!neonOpening ? <div className="arcade-steps" ...>...</div> : null}
{!neonOpening ? <div className="arcade-mission-meta">...</div> : null}
```

Keep visible during opening:

```tsx
<header className="arcade-topbar" aria-label="Live mission status">
<section className="arcade-objective" aria-label="Current objective">
<div className="arcade-touch-controls" aria-label="Arcade touch controls">
```

- [ ] **Step 3: Simplify the opening objective copy**

Inside `.arcade-objective`, render this branch first:

```tsx
{neonOpening ? (
  <>
    <span>{formatClock(hud?.timeLeftMs ?? 0)}</span>
    <strong>{t(locale, "match.stealValue", { value: 3 })}</strong>
  </>
) : (
  existing objective content
)}
```

Add `match.stealValue` to EN/RU/ZH in Task 6.

- [ ] **Step 4: Add CSS for the new shell**

In `apps/web/src/styles/global.css`, near the arcade styles, add:

```css
.arcade-shell.neon-heist-chase {
  background: #03060d;
  color: #f8fdff;
}

.arcade-shell.neon-chase-opening .arcade-topbar {
  left: auto;
  right: clamp(12px, 2vw, 22px);
  top: clamp(10px, 2vw, 18px);
  width: auto;
  display: inline-flex;
  gap: 10px;
  background: rgba(3, 6, 13, 0.46);
  border: 1px solid rgba(126, 255, 223, 0.24);
  border-radius: 8px;
  padding: 8px 10px;
  backdrop-filter: blur(12px);
}

.arcade-shell.neon-chase-opening .arcade-topbar .arcade-loot-stat,
.arcade-shell.neon-chase-opening .arcade-topbar .arcade-alarm,
.arcade-shell.neon-chase-opening .arcade-topbar .arcade-condition,
.arcade-shell.neon-chase-opening .arcade-topbar .mission-title,
.arcade-shell.neon-chase-opening .arcade-topbar .arcade-stat span {
  display: none;
}

.arcade-shell.neon-chase-opening .arcade-objective {
  left: 50%;
  right: auto;
  bottom: clamp(18px, 4vh, 42px);
  transform: translateX(-50%);
  width: auto;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 9px 13px;
  border-radius: 8px;
  background: rgba(3, 6, 13, 0.58);
  border: 1px solid rgba(255, 213, 106, 0.34);
  box-shadow: 0 0 28px rgba(255, 213, 106, 0.12);
}

.arcade-shell.neon-chase-opening .arcade-objective span,
.arcade-shell.neon-chase-opening .arcade-objective strong {
  display: block;
  font-size: clamp(0.86rem, 1.8vw, 1rem);
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
}

.arcade-shell.neon-chase-opening .arcade-objective strong {
  color: #ffd56a;
}
```

- [ ] **Step 5: Run GREEN for opening overlay**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm exec playwright test tests/e2e/play-now.spec.ts -g "solo match starts and reaches final case file"
```

Expected: still fails on scene debug contract, but visible DOM text threshold should be close to passing. If it still fails on hidden UI text, remove the remaining opening-only render path instead of hiding it with CSS.

---

### Task 3: Repaint The Scene As Neon Chase Instead Of Schematic Rooms

**Files:**
- Modify: `apps/web/src/arcade/ArcadeHeistScene.ts`
- Modify: `tests/e2e/play-now.spec.ts`

- [ ] **Step 1: Add scene debug fields**

In `ArcadeHeistScene`, add or update debug counters:

```ts
private visibleRoomLabelCount = 0;
private ambientLightCount = 0;
private floorDetailCount = 0;
private neonLaneCount = 0;
```

Reset all four in `startMission` before `drawWorld(config.state)`.

- [ ] **Step 2: Add a neon floor helper**

Create a helper called by `drawWorld` before drawing rooms:

```ts
private drawNeonVaultFloor() {
  const floor = this.add.graphics().setDepth(0);
  floor.fillGradientStyle(0x03060d, 0x071522, 0x06101d, 0x02040a, 1, 1, 1, 1);
  floor.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  for (let x = 96; x < WORLD_WIDTH; x += 96) {
    floor.lineStyle(1, 0x4cf4f0, x % 192 === 0 ? 0.1 : 0.045);
    floor.lineBetween(x, 0, x - 220, WORLD_HEIGHT);
    this.floorDetailCount += 1;
  }

  for (let y = 90; y < WORLD_HEIGHT; y += 90) {
    floor.lineStyle(1, 0xffd56a, y % 180 === 0 ? 0.08 : 0.035);
    floor.lineBetween(0, y, WORLD_WIDTH, y + 120);
    this.floorDetailCount += 1;
  }

  for (let index = 0; index < 26; index += 1) {
    const x = 80 + ((index * 137) % (WORLD_WIDTH - 160));
    const y = 72 + ((index * 89) % (WORLD_HEIGHT - 144));
    const color = index % 3 === 0 ? 0xffd56a : index % 3 === 1 ? 0x4cf4f0 : 0xff4f7b;
    floor.fillStyle(color, 0.18);
    floor.fillCircle(x, y, index % 4 === 0 ? 4 : 2.5);
    this.ambientLightCount += 1;
  }
}
```

- [ ] **Step 3: Replace room-label-first drawing**

In `drawRoom`, keep architectural shapes but remove text labels entirely for opening readability:

```ts
this.visibleRoomLabelCount += 0;
```

Do not create `this.add.text(...room.name...)` for room names. Use geometry instead: door pads, glass rings, hazard stripes, and room-specific light colors.

- [ ] **Step 4: Draw corridors like roads**

Where edges are drawn in `drawWorld`, use wide translucent lanes:

```ts
lanes.lineStyle(34, 0x4cf4f0, 0.055);
lanes.lineBetween(from.x, from.y, to.x, to.y);
lanes.lineStyle(4, 0x7effdf, 0.18);
lanes.lineBetween(from.x, from.y, to.x, to.y);
this.neonLaneCount += 1;
```

- [ ] **Step 5: Update `worldPresentationDebug`**

Return the new contract:

```ts
private worldPresentationDebug() {
  return {
    style: "neon-heist-chase",
    visibleRoomLabels: this.visibleRoomLabelCount,
    ambientLightCount: this.ambientLightCount,
    floorDetailCount: this.floorDetailCount,
    neonLaneCount: this.neonLaneCount,
    routeSignalMode: this.artifactsStolen === 0 ? "iconic" : "forked",
    openingTextMode: this.artifactsStolen === 0 ? "minimal" : "chase",
    playerVisual: "hover-agent",
    cashoutForkVisible: this.lootValue > 0 && this.canGreedRoute()
  };
}
```

- [ ] **Step 6: Make first target marker value-first**

In `targetMarkerLabel`, use value-only copy for artifact targets:

```ts
if (target.kind === "artifact") {
  const artifact = this.artifacts.find((candidate) => candidate.id === target.id);
  return artifact ? `+${artifact.value}` : "+3";
}
```

- [ ] **Step 7: Make opening route signal iconic**

In `updateRouteSignal`, for the first artifact target set no text and a smaller plate:

```ts
const iconic = this.artifactsStolen === 0 && target.kind === "artifact";
this.routeSignalLabel.setText(iconic ? "" : lane.laneLabel);
this.routeSignalDetail.setText(iconic ? "" : this.sceneUpper(lane.detail));
this.routeSignalPlate.setSize(iconic ? 54 : width, iconic ? 10 : 46);
this.routeSignalPlate.setFillStyle(0x050811, iconic ? 0.12 : 0.82);
this.routeSignal.setAlpha(iconic ? 0.28 : target.kind === "carrier" ? 0.96 : 0.84);
```

- [ ] **Step 8: Run GREEN for scene contract**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm exec playwright test tests/e2e/play-now.spec.ts -g "solo match starts and reaches final case file"
```

Expected: opening DOM density, nonblank canvas, `worldPresentation`, target marker, and iconic route assertions pass.

---

### Task 4: Make First Theft Become A Chase Moment

**Files:**
- Modify: `tests/e2e/play-now.spec.ts`
- Modify: `apps/web/src/arcade/ArcadeHeistScene.ts`
- Modify: `apps/web/src/audio/stingers.test.ts`

- [ ] **Step 1: Add RED assertions after first steal**

In the solo Playwright test, after debug teleport/interact steals the first relic, assert:

```ts
const afterFirstSteal = await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_STATE__?.());
expect(afterFirstSteal?.lootValue).toBeGreaterThanOrEqual(3);
expect(afterFirstSteal?.rivalsReleased).toBe(true);
expect(afterFirstSteal?.worldPresentation?.cashoutForkVisible).toBe(true);
expect(afterFirstSteal?.worldPresentation?.routeSignalMode).toBe("forked");
expect(afterFirstSteal?.lastImpactBurst).toEqual(
  expect.objectContaining({
    active: true,
    kind: "steal",
    ringCount: expect.any(Number),
    sparkCount: expect.any(Number)
  })
);
expect(afterFirstSteal?.cameraKick?.kind).toBe("steal");
```

If `lastImpactBurst` or `cameraKick` has a different existing name, keep the existing debug field and assert equivalent behavior.

- [ ] **Step 2: Ensure first steal releases rivals quickly**

In `stealArtifact`, when the actor is the player and `this.artifactsStolen === 1`, call:

```ts
this.releaseRivals({ announce: true, holdMs: 1_200 });
this.triggerCameraKick("steal");
this.flashSpotlight("CHASE LIVE");
```

Use the existing release/camera helpers where present; do not duplicate animation systems.

- [ ] **Step 3: Make the music selector already covered**

In `apps/web/src/audio/stingers.test.ts`, add a first-steal-to-chase expectation if not present:

```ts
it("plays the rival wake stinger right after the first player score", () => {
  expect(
    selectMissionStinger(
      { lootValue: 0, aiLootValue: 0, phase: "stealth", spotlight: null, summaryTitle: null, rivalStatus: "Rivals standby" },
      { lootValue: 3, aiLootValue: 0, phase: "stealth", spotlight: "CHASE LIVE", summaryTitle: null, rivalStatus: "Rivals waking in 1s" }
    )
  ).toBe("rival-wake");
});
```

- [ ] **Step 4: Run targeted tests**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm --filter @agent-alibi/web test -- stingers.test.ts
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm exec playwright test tests/e2e/play-now.spec.ts -g "solo match starts and reaches final case file"
```

Expected: first-steal chase assertions pass, or failures identify the exact missing debug exposure.

---

### Task 5: Simplify Touch Controls And Mobile Layout

**Files:**
- Modify: `apps/web/src/arcade/ArcadeHeistStage.tsx`
- Modify: `apps/web/src/styles/global.css`
- Modify: `tests/e2e/play-now.spec.ts`

- [ ] **Step 1: Add mobile overlap test**

Add a Playwright test:

```ts
test("mobile opening keeps controls away from objective and canvas", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startSoloArcade(page);

  const layout = await page.evaluate(() => {
    const controls = document.querySelector(`[aria-label="Arcade touch controls"]`)?.getBoundingClientRect();
    const objective = document.querySelector(`[aria-label="Current objective"]`)?.getBoundingClientRect();
    const topbar = document.querySelector(`[aria-label="Live mission status"]`)?.getBoundingClientRect();
    const overlaps = (a?: DOMRect, b?: DOMRect) =>
      Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    return {
      controls: controls ? { width: controls.width, height: controls.height, bottom: window.innerHeight - controls.bottom } : null,
      objective: objective ? { width: objective.width, height: objective.height } : null,
      topbar: topbar ? { width: topbar.width, height: topbar.height } : null,
      controlsOverlapObjective: overlaps(controls, objective),
      topbarOverlapObjective: overlaps(topbar, objective)
    };
  });

  expect(layout.controls).not.toBeNull();
  expect(layout.objective).not.toBeNull();
  expect(layout.topbar).not.toBeNull();
  expect(layout.controlsOverlapObjective).toBe(false);
  expect(layout.topbarOverlapObjective).toBe(false);
  expect(layout.objective?.width).toBeLessThanOrEqual(220);
});
```

- [ ] **Step 2: Use icon-first control labels**

In `ArcadeHeistStage.tsx`, keep visual buttons icon-only and make labels accessible through `aria-label`/`title`. Ensure dash/interact/route buttons never show text inside the button.

- [ ] **Step 3: Mobile CSS**

Add or adjust CSS:

```css
@media (max-width: 720px) {
  .arcade-touch-controls {
    left: 0;
    right: 0;
    bottom: max(12px, env(safe-area-inset-bottom));
    display: flex;
    justify-content: space-between;
    align-items: end;
    padding: 0 14px;
    pointer-events: none;
  }

  .arcade-touch-controls button {
    pointer-events: auto;
  }

  .arcade-shell.neon-chase-opening .arcade-objective {
    bottom: max(118px, calc(env(safe-area-inset-bottom) + 104px));
  }
}
```

- [ ] **Step 4: Run mobile test**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm exec playwright test tests/e2e/play-now.spec.ts -g "mobile opening keeps controls"
```

Expected: PASS without overlap.

---

### Task 6: Keep Localization Compact

**Files:**
- Modify: `apps/web/src/i18n.ts`
- Modify: `apps/web/src/i18n.test.ts`
- Modify: `tests/e2e/play-now.spec.ts`

- [ ] **Step 1: Add unit test for compact labels**

In `apps/web/src/i18n.test.ts`, add:

```ts
it("keeps neon chase labels compact in English Russian and Chinese", () => {
  expect(t("en", "match.stealValue", { value: 3 })).toBe("Steal +3");
  expect(t("ru", "match.stealValue", { value: 3 })).toBe("Украсть +3");
  expect(t("zh", "match.stealValue", { value: 3 })).toBe("偷 +3");
  expect(t("en", "match.escapeShort")).toBe("Escape");
  expect(t("ru", "match.escapeShort")).toBe("Выход");
  expect(t("zh", "match.escapeShort")).toBe("撤离");
});
```

- [ ] **Step 2: Add labels to all locales**

In each locale dictionary in `apps/web/src/i18n.ts`, add:

```ts
"match.stealValue": "Steal +{value}",
"match.escapeShort": "Escape",
"match.alibiShort": "Alibi",
"match.dashShort": "Dash"
```

RU:

```ts
"match.stealValue": "Украсть +{value}",
"match.escapeShort": "Выход",
"match.alibiShort": "Алиби",
"match.dashShort": "Рывок"
```

ZH:

```ts
"match.stealValue": "偷 +{value}",
"match.escapeShort": "撤离",
"match.alibiShort": "掩护",
"match.dashShort": "冲刺"
```

- [ ] **Step 3: Update Playwright localization expectations**

In `language picker supports English Russian and Chinese and persists`, change opening expectations to:

```ts
await expect(page.getByLabel(/opening contract/i)).toBeHidden();
await expect(page.getByLabel(/objective banner/i)).toBeHidden();
await expect(page.locator(".arcade-shell")).toHaveClass(/neon-chase-opening/);
await expect(page.locator(".arcade-objective > strong", { hasText: /偷 \+3/i })).toBeVisible();
const localizedArcade = await page.waitForFunction(() => window.__AGENT_ALIBI_ARCADE_STATE__?.()).then((handle) => handle.jsonValue());
expect(localizedArcade?.targetMarker?.label).toBe("+3");
expect(localizedArcade?.worldPresentation?.style).toBe("neon-heist-chase");
expect(localizedArcade?.worldPresentation?.visibleRoomLabels).toBe(0);
```

- [ ] **Step 4: Run i18n tests**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm --filter @agent-alibi/web test -- i18n.test.ts
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm exec playwright test tests/e2e/play-now.spec.ts -g "language picker supports"
```

Expected: PASS.

---

### Task 7: Visual Browser Smoke And Full Verification

**Files:**
- No production files beyond prior tasks.
- Optional screenshots in `/tmp`, not committed.

- [ ] **Step 1: Run local unit/build checks**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm test
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm build
```

Expected: all tests pass; the existing Phaser chunk-size warning during build is acceptable.

- [ ] **Step 2: Run full Playwright suite**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm exec playwright test
```

Expected: all Playwright tests pass.

- [ ] **Step 3: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: no output, exit code 0.

- [ ] **Step 4: Browser visual smoke**

Open or reload `http://127.0.0.1:8787/` in the in-app browser, click Play Now vs AI, and capture/inspect:

- desktop opening screenshot,
- desktop post-first-steal/chase screenshot,
- mobile opening screenshot.

Expected visual result:

- first screen has almost no text,
- route and relic are obvious,
- canvas is high contrast and nonblank,
- controls do not overlap objective on mobile,
- after first steal, the game visibly becomes a chase.

- [ ] **Step 5: Commit implementation**

Run:

```bash
git add apps/web/src/arcade/ArcadeHeistScene.ts apps/web/src/arcade/ArcadeHeistStage.tsx apps/web/src/arcade/arcade-types.ts apps/web/src/arcade/hud-density.ts apps/web/src/arcade/hud-density.test.ts apps/web/src/game-ui/MatchScreen.tsx apps/web/src/styles/global.css apps/web/src/i18n.ts apps/web/src/i18n.test.ts tests/e2e/play-now.spec.ts docs/superpowers/plans/2026-06-10-neon-heist-chase-redesign.md
git commit -m "Redesign arcade heist as neon chase"
```

Expected: commit succeeds.

- [ ] **Step 6: Push, PR, checks, merge**

Run:

```bash
git push -u origin feat/neon-heist-chase-redesign
gh pr create --title "Redesign arcade heist as neon chase" --body "## Summary\n- rebuilds the first playable Agent Alibi run around a low-text neon chase opening\n- repaints the Phaser scene with stronger route, relic, rival, and extraction signals\n- adds tests for opening density, localization, mobile layout, and playable arcade flow\n\n## Tests\n- pnpm test\n- pnpm build\n- pnpm exec playwright test\n- git diff --check"
gh pr checks --watch
gh pr merge --merge --delete-branch
```

Expected: PR CI passes and merges. After merge, watch main CI and Pages deployment before reporting completion.
