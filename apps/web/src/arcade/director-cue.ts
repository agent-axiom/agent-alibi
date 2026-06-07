import type { ArcadeHudPhase, ArcadeRivalIntercept } from "./arcade-types";

export type DirectorCueTone = "focus" | "danger" | "success";

export type DirectorCue = {
  tone: DirectorCueTone;
  label: "Director cue";
  title: string;
  detail: string;
  reward: string;
  action: string;
};

export type DirectorCueInput = {
  phase: ArcadeHudPhase;
  lootValue: number;
  rivalLootValue: number;
  cashoutValue: number | null;
  canEscape: boolean;
  targetArtifactName: string | null;
  targetArtifactValue: number | null;
  rivalCarrier: ArcadeRivalIntercept | null;
};

export function buildDirectorCue(input: DirectorCueInput): DirectorCue {
  if (input.rivalCarrier) {
    return buildCarrierCue(input.rivalCarrier);
  }

  if (input.canEscape && input.lootValue > 0 && input.cashoutValue) {
    return {
      tone: "success",
      label: "Director cue",
      title: `Bank +${input.cashoutValue} at the lift`,
      detail: `You are carrying +${input.lootValue} while Red has ${input.rivalLootValue}.`,
      reward: buildCashoutReward(input.cashoutValue, input.rivalLootValue),
      action: "Follow the cyan ring or press G for greed."
    };
  }

  if (input.rivalLootValue > input.lootValue) {
    const targetName = input.targetArtifactName ?? "the marked relic";
    const targetValue = input.targetArtifactValue ?? 0;
    return {
      tone: "danger",
      label: "Director cue",
      title: `Comeback: steal ${targetName}`,
      detail: "Red is ahead by " + (input.rivalLootValue - input.lootValue) + ". The next relic is your swing play.",
      reward: targetValue > 0 ? `Steal +${targetValue}, then cashout to answer Red.` : "Steal, then cashout to answer Red.",
      action: "Stay on the gold beam."
    };
  }

  const targetName = input.targetArtifactName ?? "marked relic";
  const targetValue = input.targetArtifactValue ? ` +${input.targetArtifactValue}` : "";
  return {
    tone: input.phase === "lockdown" ? "danger" : "focus",
    label: "Director cue",
    title: `First hit: ${targetName}`,
    detail: `Follow the gold beam and steal${targetValue} before Red wakes up.`,
    reward: "First score unlocks the cashout route.",
    action: "Move, touch the relic, press E / Space."
  };
}

function buildCarrierCue(carrier: ArcadeRivalIntercept): DirectorCue {
  const critical = carrier.urgency === "critical";
  return {
    tone: "danger",
    label: "Director cue",
    title: critical ? "Cut off " + carrier.agentName + " now" : "Catch " + carrier.agentName + " before the lift",
    detail: critical
      ? `${carrier.relicName} is ${carrier.distanceMeters}m away and about to bank +${carrier.value} for Red.`
      : `${carrier.relicName} is ${carrier.distanceMeters}m away. Red banks +${carrier.value} in ${carrier.cashoutSeconds}s.`,
    reward: "Recover it to flip the score swing.",
    action: carrier.distanceMeters <= 14 ? "Dash into the red route, then press E / Space." : "Follow the red route before the lift."
  };
}

function buildCashoutReward(cashoutValue: number, rivalLootValue: number): string {
  const swing = cashoutValue - rivalLootValue;
  if (swing > 0) return "Banking now beats Red by " + swing + ".";
  if (swing === 0) return "Cashout ties Red.";
  return `Cashout trails Red by ${Math.abs(swing)}, so greed is the risk play.`;
}
