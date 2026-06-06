import { ARCADE_MISSION_DURATION_MS, type ArcadeHudState } from "./arcade-types";

export type ArcadeHudDensity = "opening" | "full";

const OPENING_GRACE_MS = 12_000;

export function selectArcadeHudDensity(hud: ArcadeHudState | null | undefined): ArcadeHudDensity {
  if (!hud) return "full";

  const elapsedMs = ARCADE_MISSION_DURATION_MS - hud.timeLeftMs;
  const noScoreYet = hud.lootValue <= 0 && hud.aiLootValue <= 0 && hud.artifactsStolen <= 0;
  const noImmediateThreat =
    hud.phase === "stealth" &&
    hud.rivalPressureLevel === "standby" &&
    !hud.rivalIntercept &&
    !hud.threatCue &&
    !hud.lastRivalSteal &&
    !hud.scorePopup;

  return elapsedMs <= OPENING_GRACE_MS && noScoreYet && noImmediateThreat ? "opening" : "full";
}
