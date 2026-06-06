import { describe, expect, it } from "vitest";
import { buildObjectiveDirectionLabel } from "./navigation";

describe("buildObjectiveDirectionLabel", () => {
  it("adds a cardinal direction to target distance labels", () => {
    expect(buildObjectiveDirectionLabel({ kind: "target", dx: 90, dy: 8, distanceMeters: 12 })).toBe("Target E 12m");
  });

  it("uses diagonal directions when the objective is not on a straight axis", () => {
    expect(buildObjectiveDirectionLabel({ kind: "exit", dx: -80, dy: 60, distanceMeters: 14 })).toBe("Exit SW 14m");
  });

  it("labels extraction direction with the cashout value when it is known", () => {
    expect(buildObjectiveDirectionLabel({ kind: "exit", cashoutValue: 5, dx: -80, dy: 60, distanceMeters: 14 })).toBe("Cashout +5 SW 14m");
  });

  it("keeps the label stable at point-blank range", () => {
    expect(buildObjectiveDirectionLabel({ kind: "target", dx: 0, dy: 0, distanceMeters: 0 })).toBe("Target here 0m");
  });

  it("adds direction to rival distance labels", () => {
    expect(buildObjectiveDirectionLabel({ kind: "rival", dx: -120, dy: -20, distanceMeters: 16 })).toBe("Nearest rival W 16m");
  });

  it("labels carrier direction as a recoverable threat", () => {
    expect(buildObjectiveDirectionLabel({ kind: "carrier", dx: 120, dy: -120, distanceMeters: 21 })).toBe("Carrier NE 21m");
  });
});
