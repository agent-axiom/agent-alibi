import { ARCADE_MISSION_DURATION_MS, type ArcadeHudState } from "./arcade-types";

export type ArcadeHudDensity = "opening" | "chase" | "full";

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

  if (elapsedMs <= OPENING_GRACE_MS && noScoreYet && noImmediateThreat) return "opening";

  const heavyThreat = hud.threatCue?.label === "Laser sweep" || hud.threatCue?.label === "Scan lock";
  const cashoutChase =
    hud.phase === "stealth" &&
    hud.lootValue > 0 &&
    hud.artifactsStolen > 0 &&
    hud.canEscape &&
    !hud.rivalIntercept &&
    !hud.lastRivalSteal &&
    !heavyThreat;

  return cashoutChase ? "chase" : "full";
}
