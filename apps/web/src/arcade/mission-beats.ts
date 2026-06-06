import type { ArcadeHudPhase, ArcadeMissionBeat, ArcadeRivalIntercept } from "./arcade-types";

export type MissionBeatInput = {
  targetArtifactName: string | null;
  targetArtifactValue: number | null;
  lootValue: number;
  rivalLootValue: number;
  canEscape: boolean;
  cashoutValue: number | null;
  routeChoiceRelic: string | null;
  routeMode: "escape" | "greed";
  rivalCarrier: ArcadeRivalIntercept | null;
  alibiPulseReady: boolean;
  nearestRivalName: string | null;
  phase?: ArcadeHudPhase;
  timeLeftMs?: number;
};

export function buildMissionBeat(input: MissionBeatInput): ArcadeMissionBeat {
  if (input.phase === "lockdown" || (input.timeLeftMs !== undefined && input.timeLeftMs <= 30_000)) {
    const lockdownAction = input.lootValue > 0 ? "Cashout now" : "Escape now";
    return {
      tone: "danger",
      kicker: "Final countdown",
      title: "Lockdown is closing",
      detail: "The Moon Vault seals soon. Stop chasing relics and reach the lift.",
      action: lockdownAction
    };
  }

  if (input.rivalCarrier) {
    return {
      tone: "danger",
      kicker: "Carrier run",
      title: `${input.rivalCarrier.agentName} has ${input.rivalCarrier.relicName}`,
      detail:
        input.rivalCarrier.urgency === "critical"
          ? `${input.rivalCarrier.distanceMeters}m away. Red cashout imminent for +${input.rivalCarrier.value}.`
          : `${input.rivalCarrier.distanceMeters}m away. Red cashout in ${input.rivalCarrier.cashoutSeconds}s for +${input.rivalCarrier.value}.`,
      action: input.rivalCarrier.distanceMeters <= 14 ? "Press E / Space to recover it" : "Chase the gold-red carrier blip"
    };
  }

  if (input.canEscape && input.lootValue > 0) {
    const cashoutValue = input.cashoutValue ?? input.lootValue;
    return {
      tone: "success",
      kicker: input.routeMode === "greed" ? "Greed route" : "Loot secured",
      title: input.routeMode === "greed" && input.routeChoiceRelic ? `Chain target: ${input.routeChoiceRelic}` : buildCashoutTitle(cashoutValue, input.rivalLootValue),
      detail: input.routeChoiceRelic
        ? `${input.routeChoiceRelic} can extend the chain, but the lift is paying now.`
        : "Escape before lockdown seals the vault.",
      action: input.routeMode === "greed" ? "Steal the greed relic, then exit" : "Reach Atrium Lift or press G for greed route"
    };
  }

  if (input.rivalLootValue > input.lootValue) {
    const lead = input.rivalLootValue - input.lootValue;
    const targetName = input.targetArtifactName ?? "The marked relic";
    return {
      tone: "danger",
      kicker: "Score pressure",
      title: `Red leads by ${lead}`,
      detail: buildComebackDetail(targetName, input.targetArtifactValue, lead),
      action: "Follow the gold marker before the next red carrier run"
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

  return {
    tone: "focus",
    kicker: "First objective",
    title: `Steal ${input.targetArtifactName ?? "the marked relic"}`,
    detail: "The gold marker points to the score. Rivals arrive fast.",
    action: "Move with WASD / arrows"
  };
}

function buildComebackDetail(targetName: string, targetArtifactValue: number | null, lead: number): string {
  if (targetArtifactValue && targetArtifactValue > 0) {
    const swingValue = targetArtifactValue + 2;
    const swingOutcome = swingValue > lead ? "can beat Red" : swingValue === lead ? "can tie Red" : "cuts the lead";
    return `${targetName} +${targetArtifactValue} plus lift bonus ${swingOutcome}. Steal it, then cash out.`;
  }

  return `${targetName} can swing the race. Steal it, then cash out.`;
}

function buildCashoutTitle(cashoutValue: number, rivalLootValue: number): string {
  if (rivalLootValue <= 0) return `Cashout worth ${cashoutValue}`;

  const lead = cashoutValue - rivalLootValue;
  if (lead > 0) return `Cashout beats Red by ${lead}`;
  if (lead === 0) return "Cashout ties Red";
  return `Cashout trails Red by ${Math.abs(lead)}`;
}
