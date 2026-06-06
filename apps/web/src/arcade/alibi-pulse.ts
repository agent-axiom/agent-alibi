import type { RivalPressureLevel } from "./guidance";

export const ALIBI_PULSE_COOLDOWN_MS = 6_000;

export type AlibiPulseStatusInput = {
  rivalPressureLevel: RivalPressureLevel;
  cooldownMs: number;
};

export function canUseAlibiPulse(rivalPressureLevel: RivalPressureLevel, cooldownMs: number): boolean {
  return cooldownMs <= 0 && (rivalPressureLevel === "danger" || rivalPressureLevel === "closing");
}

export function buildAlibiPulseStatus(input: AlibiPulseStatusInput): string {
  if (input.cooldownMs > 0) {
    return `Alibi cooling ${Math.ceil(input.cooldownMs / 1000)}s`;
  }
  return canUseAlibiPulse(input.rivalPressureLevel, input.cooldownMs) ? "Alibi pulse ready" : "Alibi ready";
}
