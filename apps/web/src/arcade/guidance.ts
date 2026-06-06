export type ArcadeLoopStep = "steal" | "escape" | "survive";
export type RivalPressureLevel = "standby" | "clear" | "closing" | "danger";
export type ActiveActionTone = "neutral" | "success" | "danger";
export type ObjectiveCompassKind = "artifact" | "escape" | "carrier" | "scan";
export type ObjectiveCompassTone = "focus" | "success" | "danger";

export type ArcadeGuidanceInput = {
  lootValue: number;
  aiLootValue: number;
  artifactsStolen: number;
  totalArtifacts: number;
  targetArtifactName: string | null;
  nearArtifactName: string | null;
  nearExit: boolean;
  canEscape: boolean;
  cashoutValue?: number | null;
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

export type ActiveActionHintInput = {
  alibiPulseReady: boolean;
  nearRivalCarrierName?: string | null;
  nearRivalCarrierRelicName?: string | null;
  nearRivalCarrierValue?: number | null;
  nearArtifactName: string | null;
  nearArtifactValue?: number | null;
  nearExit: boolean;
  canEscape: boolean;
  cashoutValue?: number | null;
};

export type ActiveActionHint = {
  key: string;
  label: string;
  tone: ActiveActionTone;
};

export type ObjectiveCompassInput = {
  kind: ObjectiveCompassKind;
  targetLabel: string | null;
  directionLabel: string | null;
  distanceMeters: number | null;
  cashoutValue?: number | null;
  timeLeftMs: number;
};

export type ObjectiveCompass = {
  tone: ObjectiveCompassTone;
  verb: string;
  target: string;
  route: string;
  detail: string;
};

export function buildObjectiveCompass(input: ObjectiveCompassInput): ObjectiveCompass {
  if (input.kind === "carrier") {
    return {
      tone: "danger",
      verb: "CHASE",
      target: input.targetLabel ?? "Rival carrier",
      route: compactRouteLabel(input.directionLabel),
      detail: "Recover before Red cashout"
    };
  }

  if (input.kind === "scan") {
    return {
      tone: "danger",
      verb: "JAM",
      target: input.targetLabel ?? "Rival scan",
      route: compactRouteLabel(input.directionLabel),
      detail: "Press E / Space"
    };
  }

  if (input.kind === "escape") {
    const cashoutValue = input.cashoutValue ?? 0;
    const hasCashout = cashoutValue > 0;
    return {
      tone: input.timeLeftMs <= 30_000 ? "danger" : "success",
      verb: hasCashout ? "CASHOUT" : "ESCAPE",
      target: hasCashout ? `+${cashoutValue} at Atrium Lift` : "Atrium Lift",
      route: compactRouteLabel(input.directionLabel),
      detail: input.distanceMeters !== null && input.distanceMeters <= 6 ? "Press E / Space" : "Follow cyan ring"
    };
  }

  return {
    tone: "focus",
    verb: "STEAL",
    target: input.targetLabel ?? "Marked relic",
    route: compactRouteLabel(input.directionLabel),
    detail: input.distanceMeters !== null && input.distanceMeters <= 6 ? "Press E / Space" : "Follow gold beam"
  };
}

export function buildArcadeGuidance(input: ArcadeGuidanceInput): ArcadeGuidance {
  const raceStatus = buildRaceStatus(input.lootValue, input.aiLootValue);

  if (input.timeLeftMs <= 30_000 && input.lootValue <= 0) {
    return {
      objective: "Lockdown is closing",
      prompt: input.nearExit ? "Press E / Space to escape" : "Reach the escape lift",
      loopStep: "survive",
      raceStatus,
      greedStatus: null
    };
  }

  if (input.canEscape) {
    return {
      objective: `Escape with ${input.lootValue} loot`,
      prompt: input.nearExit ? buildCashoutPrompt(input.cashoutValue ?? null) : "Return to the Atrium lift",
      loopStep: "escape",
      raceStatus,
      greedStatus: input.targetArtifactName && input.timeLeftMs > 45_000 ? `Optional relic: ${input.targetArtifactName}` : null
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

export function buildActiveActionHint(input: ActiveActionHintInput): ActiveActionHint {
  if (input.nearRivalCarrierName) {
    return {
      key: "E / Space",
      label: buildRecoverActionLabel(input.nearRivalCarrierRelicName ?? null, input.nearRivalCarrierValue ?? null),
      tone: "danger"
    };
  }

  if (input.alibiPulseReady) {
    return {
      key: "E / Space",
      label: "Jam scan",
      tone: "danger"
    };
  }

  if (input.nearExit && input.canEscape) {
    return {
      key: "E / Space",
      label: buildCashoutActionLabel(input.cashoutValue ?? null),
      tone: "success"
    };
  }

  if (input.nearArtifactName) {
    return {
      key: "E / Space",
      label: buildStealActionLabel(input.nearArtifactName, input.nearArtifactValue ?? null),
      tone: "success"
    };
  }

  return {
    key: "Move",
    label: "Follow marker",
    tone: "neutral"
  };
}

function buildStealActionLabel(artifactName: string, artifactValue: number | null): string {
  return artifactValue && artifactValue > 0 ? `Steal ${artifactName} +${artifactValue}` : `Steal ${artifactName}`;
}

function buildRecoverActionLabel(relicName: string | null, relicValue: number | null): string {
  if (!relicName) return "Intercept carrier";
  return relicValue && relicValue > 0 ? `Recover ${relicName} +${relicValue}` : `Recover ${relicName}`;
}

function buildCashoutActionLabel(cashoutValue: number | null): string {
  return cashoutValue && cashoutValue > 0 ? `Cashout +${cashoutValue}` : "Escape";
}

function buildCashoutPrompt(cashoutValue: number | null): string {
  return cashoutValue && cashoutValue > 0 ? `Press E / Space to cashout +${cashoutValue}` : "Press E / Space to escape";
}

function compactRouteLabel(label: string | null): string {
  if (!label) return "Marker live";
  return label
    .replace(/^Rival on you:\s+\S+\s+/i, "")
    .replace(/^Rival close:\s+\S+\s+/i, "")
    .replace(/^Target\s+/i, "")
    .replace(/^Exit\s+/i, "")
    .replace(/^Carrier\s+/i, "")
    .replace(/^Nearest rival\s+/i, "")
    .replace(/^Cashout\s+\+\d+\s+/i, "");
}
