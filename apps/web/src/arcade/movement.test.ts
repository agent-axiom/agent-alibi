import { describe, expect, it } from "vitest";
import { nextMovementImpulse, selectMovementVector } from "./movement";

describe("arcade movement helpers", () => {
  it("continues a short tap long enough to create visible movement", () => {
    const impulse = nextMovementImpulse(undefined, { x: 1, y: 0 }, 16);

    expect(impulse).toEqual({ x: 1, y: 0, remainingMs: 140 });
    expect(selectMovementVector({ held: { x: 0, y: 0 }, impulse })).toEqual({ x: 1, y: 0 });
  });

  it("uses held input over an old tap impulse", () => {
    const vector = selectMovementVector({
      held: { x: 0, y: -2 },
      impulse: { x: 1, y: 0, remainingMs: 80 }
    });

    expect(vector.x).toBe(0);
    expect(vector.y).toBe(-1);
  });
});
