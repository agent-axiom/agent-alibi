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

export type GetawayChasePressure = "clear" | "warning" | "critical";

export type GetawayChasePressureInput = {
  hasRelic: boolean;
  rivalsReleased: boolean;
  nearestRivalDistance: number;
  previousContactMs: number;
  deltaMs: number;
  captureRadius?: number;
  captureHoldMs?: number;
};

export type GetawayChasePressureUpdate = {
  contactMs: number;
  caught: boolean;
  pressure: GetawayChasePressure;
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

export function updateGetawayChasePressure(input: GetawayChasePressureInput): GetawayChasePressureUpdate {
  const captureRadius = input.captureRadius ?? 58;
  const captureHoldMs = input.captureHoldMs ?? 650;
  if (!input.hasRelic || !input.rivalsReleased) {
    return { contactMs: 0, caught: false, pressure: "clear" };
  }

  const inCaptureRange = input.nearestRivalDistance <= captureRadius;
  const contactMs = inCaptureRange
    ? Math.max(0, input.previousContactMs) + input.deltaMs
    : Math.max(0, input.previousContactMs - input.deltaMs * 1.7);
  const caught = contactMs >= captureHoldMs;

  if (caught || contactMs >= captureHoldMs * 0.66) {
    return { contactMs: Math.round(contactMs), caught, pressure: "critical" };
  }
  if (contactMs > 0) {
    return { contactMs: Math.round(contactMs), caught: false, pressure: "warning" };
  }
  return { contactMs: 0, caught: false, pressure: "clear" };
}
