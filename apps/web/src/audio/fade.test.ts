import { describe, expect, it } from "vitest";
import { fadeProgress } from "./fade";

describe("fadeProgress", () => {
  it("clamps frames that arrive before the fade start", () => {
    expect(fadeProgress({ startedAt: 100, now: 80, durationMs: 700 })).toBe(0);
  });

  it("clamps frames that arrive after the fade duration", () => {
    expect(fadeProgress({ startedAt: 100, now: 900, durationMs: 700 })).toBe(1);
  });
});
