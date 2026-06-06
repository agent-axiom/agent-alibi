export type ArcadeLoopStep = "steal" | "escape" | "survive";

export type ArcadeGuidanceInput = {
  lootValue: number;
  aiLootValue: number;
  artifactsStolen: number;
  totalArtifacts: number;
  targetArtifactName: string | null;
  nearArtifactName: string | null;
  nearExit: boolean;
  canEscape: boolean;
  timeLeftMs: number;
};

export type ArcadeGuidance = {
  objective: string;
  prompt: string;
  loopStep: ArcadeLoopStep;
  raceStatus: string;
};

export function buildArcadeGuidance(input: ArcadeGuidanceInput): ArcadeGuidance {
  const raceStatus = buildRaceStatus(input.lootValue, input.aiLootValue);

  if (input.canEscape) {
    return {
      objective: `Escape with ${input.lootValue} loot`,
      prompt: input.nearExit ? "Press E / Space to escape" : "Return to the Atrium lift",
      loopStep: "escape",
      raceStatus
    };
  }

  if (input.timeLeftMs <= 30_000) {
    return {
      objective: "Lockdown is closing",
      prompt: input.nearExit ? "Press E / Space to escape" : "Reach the escape lift",
      loopStep: "survive",
      raceStatus
    };
  }

  const target = input.targetArtifactName ?? "nearest relic";
  return {
    objective: `Steal the ${target}`,
    prompt: input.nearArtifactName ? "Press E / Space to steal" : "Follow the gold marker",
    loopStep: "steal",
    raceStatus
  };
}

function buildRaceStatus(lootValue: number, aiLootValue: number): string {
  const delta = lootValue - aiLootValue;
  if (delta > 0) return `You lead by ${delta}`;
  if (delta < 0) return `AI crew is ahead by ${Math.abs(delta)}`;
  return "Loot race is tied";
}
