export type ArcadeLoopStep = "steal" | "escape" | "survive";
export type RivalPressureLevel = "standby" | "clear" | "closing" | "danger";

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
  greedStatus: string | null;
};

export type RivalPressureInput = {
  aiReleased: boolean;
  nearestRivalName: string | null;
  distanceMeters: number | null;
};

export type RivalPressure = {
  level: RivalPressureLevel;
  label: string | null;
  radioLine: string | null;
};

export function buildArcadeGuidance(input: ArcadeGuidanceInput): ArcadeGuidance {
  const raceStatus = buildRaceStatus(input.lootValue, input.aiLootValue);

  if (input.canEscape) {
    return {
      objective: `Escape with ${input.lootValue} loot`,
      prompt: input.nearExit ? "Press E / Space to escape" : "Return to the Atrium lift",
      loopStep: "escape",
      raceStatus,
      greedStatus: input.targetArtifactName && input.timeLeftMs > 45_000 ? `Optional relic: ${input.targetArtifactName}` : null
    };
  }

  if (input.timeLeftMs <= 30_000) {
    return {
      objective: "Lockdown is closing",
      prompt: input.nearExit ? "Press E / Space to escape" : "Reach the escape lift",
      loopStep: "survive",
      raceStatus,
      greedStatus: null
    };
  }

  const target = input.targetArtifactName ?? "nearest relic";
  return {
    objective: `Steal the ${target}`,
    prompt: input.nearArtifactName ? "Press E / Space to steal" : "Follow the gold marker",
    loopStep: "steal",
    raceStatus,
    greedStatus: null
  };
}

function buildRaceStatus(lootValue: number, aiLootValue: number): string {
  const delta = lootValue - aiLootValue;
  if (delta > 0) return `You lead by ${delta}`;
  if (delta < 0) return `AI crew is ahead by ${Math.abs(delta)}`;
  return "Loot race is tied";
}

export function buildRivalPressure(input: RivalPressureInput): RivalPressure {
  if (input.distanceMeters === null) {
    return {
      level: "standby",
      label: null,
      radioLine: null
    };
  }

  const rivalName = input.nearestRivalName ?? "Rival";
  if (!input.aiReleased) {
    return {
      level: "standby",
      label: `Nearest rival ${input.distanceMeters}m`,
      radioLine: null
    };
  }

  if (input.distanceMeters <= 12) {
    return {
      level: "danger",
      label: `Rival on you: ${rivalName} ${input.distanceMeters}m`,
      radioLine: `Rival on you: ${rivalName}. Dash or break line.`
    };
  }

  if (input.distanceMeters <= 24) {
    return {
      level: "closing",
      label: `Rival close: ${rivalName} ${input.distanceMeters}m`,
      radioLine: `Rival closing: ${rivalName} is ${input.distanceMeters}m out.`
    };
  }

  return {
    level: "clear",
    label: `Nearest rival ${input.distanceMeters}m`,
    radioLine: null
  };
}
