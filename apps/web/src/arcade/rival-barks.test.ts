import { describe, expect, it } from "vitest";
import { buildRivalBarkLine } from "./rival-barks";

describe("buildRivalBarkLine", () => {
  it("gives Rook a strategist voice when stealing", () => {
    expect(buildRivalBarkLine("Rook", "steal", "Moon Pearl")).toBe("Moon Pearl secured. I already mapped the exit.");
  });

  it("gives Rook a different cashout line", () => {
    expect(buildRivalBarkLine("Rook", "cashout", "Moon Pearl")).toBe("Moon Pearl banked. Planning beats panic.");
  });

  it("uses a bruised but in-character intercept line", () => {
    expect(buildRivalBarkLine("Rook", "intercept", "Moon Pearl")).toBe("Good read. I left you one narrow angle.");
  });

  it("gives Rook a panic line when the player flips a comeback route", () => {
    expect(buildRivalBarkLine("Rook", "comeback", "Argent Crown")).toBe("Score just flipped. Cut them off before the lift.");
  });
});
