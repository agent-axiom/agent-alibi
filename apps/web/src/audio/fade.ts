export type FadeProgressInput = {
  startedAt: number;
  now: number;
  durationMs: number;
};

export function fadeProgress(input: FadeProgressInput): number {
  if (input.durationMs <= 0) return 1;
  return Math.max(0, Math.min(1, (input.now - input.startedAt) / input.durationMs));
}
