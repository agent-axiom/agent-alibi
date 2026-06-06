export type MovementVector = {
  x: number;
  y: number;
};

export type MovementImpulse = MovementVector & {
  remainingMs: number;
};

export const TAP_IMPULSE_MS = 140;

export function nextMovementImpulse(
  current: MovementImpulse | undefined,
  tapped: MovementVector,
  deltaMs: number,
  durationMs = TAP_IMPULSE_MS
): MovementImpulse | undefined {
  const tap = normalizeMovement(tapped);
  if (tap.x !== 0 || tap.y !== 0) {
    return { ...tap, remainingMs: durationMs };
  }

  if (!current) return undefined;

  const remainingMs = current.remainingMs - deltaMs;
  if (remainingMs <= 0) return undefined;
  return { ...current, remainingMs };
}

export function selectMovementVector(input: { held: MovementVector; impulse?: MovementImpulse }): MovementVector {
  const held = normalizeMovement(input.held);
  if (held.x !== 0 || held.y !== 0) {
    return held;
  }

  if (input.impulse && input.impulse.remainingMs > 0) {
    return { x: input.impulse.x, y: input.impulse.y };
  }

  return { x: 0, y: 0 };
}

function normalizeMovement(vector: MovementVector): MovementVector {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0) return { x: 0, y: 0 };
  return {
    x: roundUnit(vector.x / length),
    y: roundUnit(vector.y / length)
  };
}

function roundUnit(value: number): number {
  return Math.abs(value) < 0.0001 ? 0 : Number(value.toFixed(6));
}
