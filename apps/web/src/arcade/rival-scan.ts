import type { RivalPressureLevel } from "./guidance";

const RIVAL_SCAN_THRESHOLD_MS = 900;
const RIVAL_SCAN_COOLDOWN_MS = 1_300;
const RIVAL_SCAN_ALARM_DELTA = 0.82;
const RIVAL_SCAN_DECAY_RATE = 1.7;

export type RivalScanTone = "idle" | "charging" | "jammed";

export type RivalScanState = {
  chargeMs: number;
  cooldownMs: number;
};

export type RivalScanStatus = {
  label: string;
  tone: RivalScanTone;
  progress: number;
};

export type RivalScanUpdate = {
  state: RivalScanState;
  alarmDelta: number;
  spotlight: string | null;
  radioLine: string | null;
};

export function updateRivalScan(state: RivalScanState, pressureLevel: RivalPressureLevel, deltaMs: number): RivalScanUpdate {
  const cooldownMs = Math.max(0, state.cooldownMs - deltaMs);

  if (pressureLevel !== "danger") {
    return {
      state: {
        chargeMs: Math.max(0, state.chargeMs - deltaMs * RIVAL_SCAN_DECAY_RATE),
        cooldownMs
      },
      alarmDelta: 0,
      spotlight: null,
      radioLine: null
    };
  }

  if (cooldownMs > 0) {
    return {
      state: { chargeMs: 0, cooldownMs },
      alarmDelta: 0,
      spotlight: null,
      radioLine: null
    };
  }

  const chargeMs = state.chargeMs + deltaMs;
  if (chargeMs < RIVAL_SCAN_THRESHOLD_MS) {
    return {
      state: { chargeMs, cooldownMs: 0 },
      alarmDelta: 0,
      spotlight: null,
      radioLine: null
    };
  }

  return {
    state: { chargeMs: 0, cooldownMs: RIVAL_SCAN_COOLDOWN_MS },
    alarmDelta: RIVAL_SCAN_ALARM_DELTA,
    spotlight: "Alibi scan +1 alarm",
    radioLine: "Rival scan burned your alibi. Break contact."
  };
}

export function buildRivalScanStatus(state: RivalScanState, pressureLevel: RivalPressureLevel): RivalScanStatus {
  if (state.cooldownMs > 0) {
    return {
      label: "Scan jammed",
      tone: "jammed",
      progress: 0
    };
  }

  if (pressureLevel === "danger") {
    const progress = Math.min(99, Math.max(0, Math.round((state.chargeMs / RIVAL_SCAN_THRESHOLD_MS) * 100)));
    return {
      label: progress > 0 ? `Scan charge ${progress}%` : "Scan charging",
      tone: "charging",
      progress
    };
  }

  return {
    label: "Scan clear",
    tone: "idle",
    progress: 0
  };
}
