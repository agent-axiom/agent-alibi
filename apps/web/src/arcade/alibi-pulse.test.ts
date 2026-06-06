import { describe, expect, it } from "vitest";
import { buildAlibiPulseStatus, canUseAlibiPulse } from "./alibi-pulse";

describe("alibi pulse", () => {
  it("is available only when rivals are close and the pulse is not cooling down", () => {
    expect(canUseAlibiPulse("danger", 0)).toBe(true);
    expect(canUseAlibiPulse("closing", 0)).toBe(true);
    expect(canUseAlibiPulse("clear", 0)).toBe(false);
    expect(canUseAlibiPulse("danger", 1200)).toBe(false);
  });

  it("shows an actionable status when the player can jam a close rival", () => {
    expect(buildAlibiPulseStatus({ rivalPressureLevel: "danger", cooldownMs: 0 })).toBe("Alibi pulse ready");
  });

  it("shows cooldown seconds after a pulse", () => {
    expect(buildAlibiPulseStatus({ rivalPressureLevel: "danger", cooldownMs: 5200 })).toBe("Alibi cooling 6s");
  });
});
