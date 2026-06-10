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
