import type { ArcadeMissionBeat, ArcadeRivalIntercept } from "./arcade-types";

export type MissionBeatInput = {
  targetArtifactName: string | null;
  lootValue: number;
  canEscape: boolean;
  cashoutValue: number | null;
  routeChoiceRelic: string | null;
  routeMode: "escape" | "greed";
  rivalCarrier: ArcadeRivalIntercept | null;
  alibiPulseReady: boolean;
  nearestRivalName: string | null;
};

export function buildMissionBeat(input: MissionBeatInput): ArcadeMissionBeat {
  if (input.rivalCarrier) {
    return {
      tone: "danger",
      kicker: "Carrier run",
      title: `${input.rivalCarrier.agentName} has ${input.rivalCarrier.relicName}`,
      detail: `${input.rivalCarrier.distanceMeters}m away. Red cashout in ${input.rivalCarrier.cashoutSeconds}s for +${input.rivalCarrier.value}.`,
      action: input.rivalCarrier.distanceMeters <= 14 ? "Press E / Space to recover it" : "Chase the gold-red carrier blip"
    };
  }

  if (input.alibiPulseReady) {
    return {
      tone: "danger",
      kicker: "Scan threat",
      title: `${input.nearestRivalName ?? "Rival"} is burning your alibi`,
      detail: "A scan spike raises alarm. Pulse now, then break line.",
      action: "Press E / Space to jam scan"
    };
  }

  if (input.canEscape && input.lootValue > 0) {
    const cashoutValue = input.cashoutValue ?? input.lootValue;
    return {
      tone: "success",
      kicker: input.routeMode === "greed" ? "Greed route" : "Loot secured",
      title: input.routeMode === "greed" && input.routeChoiceRelic ? `Chain target: ${input.routeChoiceRelic}` : `Cashout worth ${cashoutValue}`,
      detail: input.routeChoiceRelic
        ? `${input.routeChoiceRelic} can extend the chain, but the lift is paying now.`
        : "Escape before lockdown seals the vault.",
      action: input.routeMode === "greed" ? "Steal the greed relic, then exit" : "Reach Atrium Lift or press G for greed route"
    };
  }

  return {
    tone: "focus",
    kicker: "First objective",
    title: `Steal ${input.targetArtifactName ?? "the marked relic"}`,
    detail: "The gold marker points to the score. Rivals arrive fast.",
    action: "Move with WASD / arrows"
  };
}
