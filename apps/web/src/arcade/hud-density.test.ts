import { describe, expect, it } from "vitest";
import { ARCADE_MISSION_DURATION_MS, type ArcadeHudState } from "./arcade-types";
import { selectArcadeHudDensity } from "./hud-density";

function hud(overrides: Partial<ArcadeHudState> = {}): ArcadeHudState {
  return {
    phase: "stealth",
    timeLeftMs: ARCADE_MISSION_DURATION_MS,
    alarm: 1,
    lootValue: 0,
    aiLootValue: 0,
    artifactsStolen: 0,
    totalArtifacts: 5,
    canEscape: false,
    dashReady: true,
    objective: "Steal the Moon Pearl",
    prompt: "Follow the gold marker",
    objectiveCompass: {
      tone: "focus",
      verb: "STEAL",
      target: "Moon Pearl +3",
      route: "NE 71m",
      detail: "Follow gold beam"
    },
    activeAction: {
      key: "Move",
      label: "Follow marker",
      tone: "neutral"
    },
    loopStep: "steal",
    raceStatus: "Loot race is tied",
    lastRivalSteal: null,
    rivalIntercept: null,
    vaultCondition: {
      tone: "stable",
      label: "Vault Stable",
      detail: "Low profile"
    },
    escapePayout: null,
    extractionCue: null,
    routeChoice: null,
    routePulse: null,
    radarBlips: [],
    greedStatus: null,
    targetDistanceLabel: "Target NE 71m",
    rivalStatus: "Rivals wake after first score or 10s",
    rivalDistanceLabel: "Nearest rival NE 44m",
    rivalPressureLevel: "standby",
    rivalScanStatus: {
      label: "Scan clear",
      tone: "idle",
      progress: 0
    },
    alibiPulseStatus: "Alibi ready",
    paceStatus: "S-Rank pace",
    cleanBonusWindow: null,
    lootChainWindow: null,
    lootSpeedSurge: null,
    comboCashoutWindow: null,
    missionBeat: {
      tone: "focus",
      kicker: "First objective",
      title: "Steal Moon Pearl",
      detail: "The gold marker points to the score. Rivals arrive fast.",
      action: "Move with WASD / arrows"
    },
    directorCue: {
      tone: "focus",
      label: "Director cue",
      title: "First hit: Moon Pearl",
      detail: "Follow the gold beam and steal +3 before Red wakes up.",
      reward: "First score unlocks the cashout route.",
      action: "Move, touch the relic, press E / Space."
    },
    threatCue: null,
    objectiveBanner: null,
    rivalBark: null,
    scorePopup: null,
    spotlight: null,
    feed: ["Moon Vault breach started."],
    ...overrides
  };
}

describe("selectArcadeHudDensity", () => {
  it("keeps the first no-score seconds in a compact opening contract", () => {
    expect(selectArcadeHudDensity(hud())).toBe("opening");
  });

  it("opens the full HUD once the first score creates a cashout decision", () => {
    expect(
      selectArcadeHudDensity(
        hud({
          lootValue: 3,
          canEscape: true,
          loopStep: "escape",
          objective: "Escape with 3 loot",
          rivalStatus: "Rivals waking in 4s",
          escapePayout: {
            escapeBonus: 2,
            cashout: 5
          }
        })
      )
    ).toBe("full");
  });

  it("opens the full HUD if the player wanders past the opening grace window", () => {
    expect(selectArcadeHudDensity(hud({ timeLeftMs: ARCADE_MISSION_DURATION_MS - 13_000 }))).toBe("full");
  });

  it("opens the full HUD as soon as rival pressure becomes a real threat", () => {
    expect(
      selectArcadeHudDensity(
        hud({
          rivalPressureLevel: "closing",
          rivalStatus: "Rivals active",
          rivalScanStatus: {
            label: "Scan charging",
            tone: "charging",
            progress: 44
          }
        })
      )
    ).toBe("full");
  });
});
