# Moon Getaway Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current text-heavy room arcade with a readable top-down sci-fi getaway loop that feels playable within ten seconds.

**Architecture:** Add a new Phaser scene under `apps/web/src/getaway` that keeps the existing local match and final case-file contracts. The scene owns movement, route guidance, relic pickup, chase pressure, extraction, debug hooks, and low-text HUD updates; `MatchScreen` swaps from `ArcadeHeistStage` to `MoonGetawayStage` for solo arcade play.

**Tech Stack:** React, Phaser, TypeScript, Vitest, Playwright, existing `ArcadeMissionConfig` and `ArcadeMissionResult` contracts.

---

## File Structure

- Create `apps/web/src/getaway/getaway-rules.ts` for pure objective/result helpers.
- Create `apps/web/src/getaway/getaway-rules.test.ts` for Vitest coverage.
- Create `apps/web/src/getaway/MoonGetawayScene.ts` for the Phaser gameplay scene.
- Create `apps/web/src/getaway/MoonGetawayStage.tsx` for React lifecycle, touch controls, and global debug hooks.
- Modify `apps/web/src/game-ui/MatchScreen.tsx` to lazy-load and render `MoonGetawayStage`.
- Modify `apps/web/src/styles/global.css` to hide old arcade chrome when `moon-getaway` is active and keep only compact overlays.
- Replace `tests/e2e/play-now.spec.ts` scene-specific coverage with Moon Getaway contracts.

## Task 1: Pure Getaway Rules

**Files:**
- Create: `apps/web/src/getaway/getaway-rules.ts`
- Test: `apps/web/src/getaway/getaway-rules.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { buildGetawayMissionResult, selectGetawayObjective } from "./getaway-rules";

describe("selectGetawayObjective", () => {
  it("starts by sending the player to steal the Moon Pearl", () => {
    expect(selectGetawayObjective({ hasRelic: false, escaped: false, caught: false })).toEqual({
      phase: "steal",
      label: "Steal +3"
    });
  });

  it("switches to extraction after the relic is carried", () => {
    expect(selectGetawayObjective({ hasRelic: true, escaped: false, caught: false })).toEqual({
      phase: "escape",
      label: "Escape +5"
    });
  });
});

describe("buildGetawayMissionResult", () => {
  it("maps a clean escape into the existing final case-file contract", () => {
    expect(
      buildGetawayMissionResult({
        outcome: "escaped",
        playerName: "amid",
        lootValue: 3,
        elapsedMs: 42_000,
        alarm: 2,
        alibiPulsesUsed: 1
      })
    ).toMatchObject({
      outcome: "escaped",
      playerName: "amid",
      lootValue: 3,
      artifactsStolen: 1,
      stolenRelicNames: ["Moon Pearl"],
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 42_000,
      alibiPulsesUsed: 1
    });
  });
});
```

- [ ] **Step 2: Verify red**

Run: `source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm --filter @agent-alibi/web test -- getaway-rules`

Expected: FAIL because `apps/web/src/getaway/getaway-rules.ts` does not exist.

- [ ] **Step 3: Implement helpers**

```ts
import type { ArcadeMissionOutcome, ArcadeMissionResult } from "../arcade/arcade-rules";

export type GetawayObjectivePhase = "steal" | "escape" | "finished";

export type GetawayObjectiveInput = {
  hasRelic: boolean;
  escaped: boolean;
  caught: boolean;
};

export type GetawayObjective = {
  phase: GetawayObjectivePhase;
  label: "Steal +3" | "Escape +5" | "Case closed";
};

export type GetawayMissionResultInput = {
  outcome: ArcadeMissionOutcome;
  playerName: string;
  lootValue: number;
  elapsedMs: number;
  alarm: number;
  alibiPulsesUsed: number;
};

export function selectGetawayObjective(input: GetawayObjectiveInput): GetawayObjective {
  if (input.escaped || input.caught) return { phase: "finished", label: "Case closed" };
  if (input.hasRelic) return { phase: "escape", label: "Escape +5" };
  return { phase: "steal", label: "Steal +3" };
}

export function buildGetawayMissionResult(input: GetawayMissionResultInput): ArcadeMissionResult {
  const escapedWithRelic = input.outcome === "escaped" && input.lootValue > 0;
  return {
    outcome: input.outcome,
    playerName: input.playerName,
    lootValue: input.lootValue,
    artifactsStolen: escapedWithRelic ? 1 : 0,
    stolenRelicNames: escapedWithRelic ? ["Moon Pearl"] : [],
    rivalRelicNames: [],
    pendingRivalRelicNames: [],
    aiLootValue: 0,
    alarm: input.alarm,
    elapsedMs: input.elapsedMs,
    alibiPulsesUsed: input.alibiPulsesUsed,
    scanBurns: 0,
    carrierIntercepts: 0,
    ambushNearMisses: 0
  };
}
```

- [ ] **Step 4: Verify green**

Run: `source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm --filter @agent-alibi/web test -- getaway-rules`

Expected: PASS.

## Task 2: Moon Getaway Scene

**Files:**
- Create: `apps/web/src/getaway/MoonGetawayScene.ts`
- Create: `apps/web/src/getaway/MoonGetawayStage.tsx`
- Modify: `apps/web/src/game-ui/MatchScreen.tsx`
- Modify: `apps/web/src/styles/global.css`
- Test: `tests/e2e/play-now.spec.ts`

- [ ] **Step 1: Replace scene-specific e2e coverage with failing Moon Getaway contracts**

Keep the home, sound, language, and final case-file checks. Add these contracts:

```ts
test("moon getaway opens as a low-text continuous top-down chase", async ({ page }) => {
  await startSoloArcade(page);
  await expect(page.getByLabel(/playable moon getaway arcade scene/i)).toBeVisible();
  await expect(page.getByLabel(/opening contract/i)).toBeHidden();
  await expect(page.locator(".arcade-shell")).toHaveClass(/moon-getaway/);
  const text = await visibleText(page, ".arcade-shell");
  expect(text.length).toBeLessThan(220);
  const state = await waitForGetawayState(page);
  expect(state.mode).toBe("moon-getaway");
  expect(state.mapStyle).toBe("continuous-roadway");
  expect(state.roomLabels).toBe(0);
  expect(state.objective).toBe("steal");
  const signal = await canvasSignal(page);
  expect(signal.coloredPixels).toBeGreaterThan(35_000);
  expect(signal.brightPixels).toBeGreaterThan(10_000);
});

test("moon getaway supports movement, relic pickup, chase, and extraction", async ({ page }) => {
  await startSoloArcade(page);
  const before = await waitForGetawayState(page);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(350);
  await page.keyboard.up("ArrowRight");
  const after = await waitForGetawayState(page);
  expect(after.player.x).toBeGreaterThan(before.player.x + 20);
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget?.());
  await page.keyboard.press("Space");
  const carrying = await waitForGetawayState(page, (state) => state.objective === "escape");
  expect(carrying.hasRelic).toBe(true);
  expect(carrying.rivalsReleased).toBe(true);
  await page.evaluate(() => window.__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToExit?.());
  await page.keyboard.press("Space");
  await expectFinalCaseFile(page);
});
```

- [ ] **Step 2: Verify red**

Run: `source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm exec playwright test tests/e2e/play-now.spec.ts --project=chromium --grep "moon getaway"`

Expected: FAIL because the new stage and debug state are not implemented.

- [ ] **Step 3: Implement the scene and wrapper**

Implement `MoonGetawayScene` with:

```ts
export class MoonGetawayScene extends Phaser.Scene {
  setMissionConfig(config: ArcadeMissionConfig): void;
  getDebugState(): GetawayDebugState;
  finishForDebug(outcome?: ArcadeMissionOutcome): void;
  teleportToRelicForDebug(): void;
  teleportToExtractionForDebug(): void;
  forceChaseForDebug(): void;
  setVirtualDirection(direction: "up" | "down" | "left" | "right", active: boolean): void;
  tapVirtualDash(): void;
  tapVirtualInteract(): void;
  tapVirtualRoute(): void;
}
```

The stage creates Phaser with `parent: containerRef.current`, registers the same global debug names as the old arcade wrapper, and maps `teleportToTarget` to `teleportToRelicForDebug`.

- [ ] **Step 4: Swap integration and chrome**

In `MatchScreen.tsx`, lazy-load `../getaway/MoonGetawayStage` and render it instead of `ArcadeHeistStage` in the arcade branch. Add `moon-getaway` to `arcadeShellClassName`; in CSS hide old multi-panel widgets under `.arcade-shell.moon-getaway` and keep objective, timer, language, sound, and touch controls visible.

- [ ] **Step 5: Verify green**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm --filter @agent-alibi/web test -- getaway-rules
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm exec playwright test tests/e2e/play-now.spec.ts --project=chromium --grep "moon getaway"
```

Expected: both commands PASS.

## Task 3: Full Verification And PR

**Files:**
- Modify: files changed in Tasks 1-2

- [ ] **Step 1: Run complete local checks**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm test
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm build
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 >/dev/null && pnpm exec playwright test
git diff --check
```

Expected: all pass with no whitespace errors.

- [ ] **Step 2: Visual browser check**

Run local dev server, open `http://127.0.0.1:8787/`, start Play Now vs AI, capture screenshots at desktop and mobile widths, and confirm:

- first screen is a continuous moon roadway, not room boxes;
- objective text is only a compact command;
- player movement visibly changes position;
- relic pickup starts the chase;
- extraction reaches the final case file.

- [ ] **Step 3: Commit, push, PR, wait for checks, merge**

Run:

```bash
git add docs/superpowers/plans/2026-06-10-moon-getaway-pivot.md apps/web/src/getaway apps/web/src/game-ui/MatchScreen.tsx apps/web/src/styles/global.css tests/e2e/play-now.spec.ts
git commit -m "feat: pivot arcade to moon getaway"
git push -u origin feat/moon-getaway-pivot
gh pr create --base main --head feat/moon-getaway-pivot --title "Pivot arcade to Moon Getaway" --body "..."
gh pr checks --watch
gh pr merge --squash --delete-branch
```

Expected: GitHub checks pass before merge.

## Self-Review

- Spec coverage: the plan maps the “GTA 1/2-like, less text, more readable, more dynamic” requirement into a new top-down scene, a compact UI shell, debug hooks, and browser tests.
- Red-flag text scan: no vague implementation steps remain.
- Type consistency: `MoonGetawayStage` keeps the existing `ArcadeMissionConfig`/`ArcadeMissionResult` integration, so `useLocalMatch` and final case-file code do not need structural changes.
