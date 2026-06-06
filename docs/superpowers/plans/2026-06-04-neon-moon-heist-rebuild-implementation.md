# Neon Moon Heist Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current text-heavy match screen with a cinematic sci-fi solo heist slice using Phaser rendering, compact React HUD, three contextual action cards, animated execution, radio feed, and final case file.

**Architecture:** React owns game state, action selection, and HUD. Phaser owns the full-screen animated Moon Vault scene. A small adapter converts existing `GameState`, `LegalAction`, and `RevealEvent` data into action cards and animation beats.

**Tech Stack:** TypeScript, React, Vite, Phaser 3, existing `@agent-alibi/game`, existing `@agent-alibi/ai`, Vitest, Playwright.

---

### Task 1: Add Phaser Dependency

**Files:**
- Modify: `apps/web/package.json`
- Modify: lockfile through package manager

- [ ] **Step 1: Install Phaser**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm --filter @agent-alibi/web add phaser
```

Expected: `apps/web/package.json` includes `"phaser"` in dependencies and `pnpm-lock.yaml` updates.

- [ ] **Step 2: Verify web package typecheck still starts**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm --filter @agent-alibi/web typecheck
```

Expected: command exits 0 or reports only missing implementation files not yet created.

- [ ] **Step 3: Commit dependency**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add phaser for cinematic heist scene"
```

---

### Task 2: Build Contextual Action Cards

**Files:**
- Create: `apps/web/src/game-ui/action-cards.ts`
- Create: `apps/web/src/game-ui/action-cards.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/game-ui/action-cards.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialGameState, generateLegalActions } from "@agent-alibi/game";
import { buildActionCards } from "./action-cards";

describe("buildActionCards", () => {
  it("returns at most three cards from legal actions", () => {
    const state = createInitialGameState({
      matchId: "cards",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook", "gremlin", "anchor"],
      seed: "cards"
    });
    const cards = buildActionCards(state, generateLegalActions(state, "p-human"));
    expect(cards.length).toBeLessThanOrEqual(3);
    expect(cards.map((card) => card.role)).toEqual(["objective", "social", "risk"]);
  });

  it("prioritizes stealing when the player is in a room with loot", () => {
    const state = createInitialGameState({
      matchId: "cards-steal",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook"],
      seed: "cards"
    });
    state.players[0]!.locationId = "vault-door";
    const cards = buildActionCards(state, generateLegalActions(state, "p-human"));
    expect(cards[0]).toMatchObject({ kind: "steal", role: "objective" });
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm --filter @agent-alibi/web test
```

Expected: FAIL because `./action-cards` does not exist.

- [ ] **Step 3: Implement action card grouping**

Create `apps/web/src/game-ui/action-cards.ts`:

```ts
import type { ActionKind, ActionRisk, GameState, LegalAction } from "@agent-alibi/shared";

export type ActionCardRole = "objective" | "social" | "risk";

export type ActionCard = {
  id: string;
  actionId: string;
  role: ActionCardRole;
  kind: ActionKind;
  risk: ActionRisk;
  title: string;
  detail: string;
};

const ROLE_ORDER: ActionCardRole[] = ["objective", "social", "risk"];

export function buildActionCards(state: GameState, legalActions: LegalAction[]): ActionCard[] {
  const cards = ROLE_ORDER.map((role) => bestCardForRole(state, legalActions, role)).filter((card): card is ActionCard => Boolean(card));
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.actionId)) return false;
    seen.add(card.actionId);
    return true;
  });
}

function bestCardForRole(state: GameState, actions: LegalAction[], role: ActionCardRole): ActionCard | undefined {
  const ranked = actions
    .map((action) => ({ action, score: scoreActionForRole(state, action, role) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.action.label.localeCompare(right.action.label));
  const chosen = ranked[0]?.action;
  return chosen ? toCard(chosen, role) : undefined;
}

function scoreActionForRole(state: GameState, action: LegalAction, role: ActionCardRole): number {
  if (role === "objective") {
    if (action.kind === "steal") return 100;
    if (action.kind === "escape" && (state.round >= state.maxRounds - 1 || state.alarm >= 4)) return 90;
    if (action.kind === "move") return 60;
    if (action.kind === "scout") return 35;
  }
  if (role === "social") {
    if (action.kind === "cover") return 95;
    if (action.kind === "distract") return 85;
    if (action.kind === "guard") return 40;
  }
  if (role === "risk") {
    if (action.kind === "sabotage") return 95;
    if (action.kind === "steal" && action.risk === "high") return 80;
    if (action.kind === "guard") return 35;
  }
  return 0;
}

function toCard(action: LegalAction, role: ActionCardRole): ActionCard {
  return {
    id: `${role}:${action.id}`,
    actionId: action.id,
    role,
    kind: action.kind,
    risk: action.risk,
    title: titleFor(action, role),
    detail: action.label
  };
}

function titleFor(action: LegalAction, role: ActionCardRole): string {
  if (action.kind === "steal") return "Take the prize";
  if (action.kind === "move") return "Slip through";
  if (action.kind === "cover") return "Forge alibi";
  if (action.kind === "distract") return "Sell a lie";
  if (action.kind === "sabotage") return "Cut the route";
  if (action.kind === "escape") return "Run for the hatch";
  if (action.kind === "guard") return role === "risk" ? "Hold the line" : "Stand watch";
  return "Scan the vault";
}
```

- [ ] **Step 4: Run tests to verify GREEN**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm --filter @agent-alibi/web test
```

Expected: PASS.

- [ ] **Step 5: Commit action card model**

```bash
git add apps/web/src/game-ui/action-cards.ts apps/web/src/game-ui/action-cards.test.ts
git commit -m "feat: add contextual action cards"
```

---

### Task 3: Add Phaser Heist Stage

**Files:**
- Create: `apps/web/src/heist/HeistStage.tsx`
- Create: `apps/web/src/heist/NeonMoonScene.ts`
- Create: `apps/web/src/heist/scene-types.ts`

- [ ] **Step 1: Implement scene types**

Create `apps/web/src/heist/scene-types.ts`:

```ts
import type { GameState, RevealEvent } from "@agent-alibi/shared";

export type HeistSceneSnapshot = {
  state: GameState;
  latestEvents: RevealEvent[];
  selectedPlayerId?: string;
};
```

- [ ] **Step 2: Implement Phaser scene**

Create `apps/web/src/heist/NeonMoonScene.ts` with a `Phaser.Scene` that draws a full-screen lunar vault: background grid, room halos, corridors, artifacts, laser sweep, alarm glow, and agent tokens. Expose an `updateSnapshot(snapshot: HeistSceneSnapshot)` method that clears and redraws dynamic layers.

- [ ] **Step 3: Implement React wrapper**

Create `apps/web/src/heist/HeistStage.tsx` that mounts Phaser once, forwards snapshots to the scene, and destroys Phaser on unmount.

- [ ] **Step 4: Run web typecheck**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm --filter @agent-alibi/web typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit Phaser stage**

```bash
git add apps/web/src/heist/HeistStage.tsx apps/web/src/heist/NeonMoonScene.ts apps/web/src/heist/scene-types.ts
git commit -m "feat: add neon moon phaser stage"
```

---

### Task 4: Replace Solo Match UI With Cinematic HUD

**Files:**
- Modify: `apps/web/src/local/useLocalMatch.ts`
- Replace: `apps/web/src/game-ui/MatchScreen.tsx`
- Modify: `apps/web/src/styles/global.css`

- [ ] **Step 1: Extend local match controller**

Add `lastEvents`, `selectedPlayerId`, `selectPlayer`, and use `buildActionCards` so the HUD receives at most three cards.

- [ ] **Step 2: Replace match screen**

Use `HeistStage` as the full-screen scene. Render a compact HUD with crew portraits, alarm meter, radio feed, reveal caption, three action cards, and one Execute button. Do not render `MoonVaultMap`, `ActionPanel`, `TeamPanel`, or `RevealLog` in solo match.

- [ ] **Step 3: Restyle match screen**

Replace dashboard-like match CSS with a full-screen sci-fi composition. Keep cards at 8px radius or less. Make action cards large, touch-friendly, and stable in size.

- [ ] **Step 4: Run web build**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm --filter @agent-alibi/web build
```

Expected: PASS.

- [ ] **Step 5: Commit cinematic solo UI**

```bash
git add apps/web/src/local/useLocalMatch.ts apps/web/src/game-ui/MatchScreen.tsx apps/web/src/styles/global.css
git commit -m "feat: replace solo match with cinematic heist hud"
```

---

### Task 5: Update Smoke Test and Verify Locally

**Files:**
- Modify: `tests/e2e/play-now.spec.ts`

- [ ] **Step 1: Update Playwright expectations**

Assert that solo starts, three action cards are visible, Execute advances rounds, and final case file appears.

- [ ] **Step 2: Run full checks**

Run:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm test
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm typecheck
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm build
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm exec playwright test
```

Expected: all commands exit 0.

- [ ] **Step 3: Browser visual verification**

Start production-like server:

```bash
source /Users/if/.nvm/nvm.sh && nvm use 24.14.1 && pnpm start
```

Open `http://127.0.0.1:8787`, click Play Now vs AI, execute at least one round, and save a screenshot.

- [ ] **Step 4: Commit e2e update**

```bash
git add tests/e2e/play-now.spec.ts
git commit -m "test: update smoke for cinematic heist flow"
```

