import { describe, expect, it } from "vitest";
import { updateRivalScan } from "./rival-scan";

describe("updateRivalScan", () => {
  it("charges without raising alarm before the danger threshold", () => {
    const result = updateRivalScan({ chargeMs: 0, cooldownMs: 0 }, "danger", 500);

    expect(result.state.chargeMs).toBe(500);
    expect(result.alarmDelta).toBe(0);
    expect(result.spotlight).toBeNull();
  });

  it("burns the alibi when danger contact lasts too long", () => {
    const result = updateRivalScan({ chargeMs: 700, cooldownMs: 0 }, "danger", 300);

    expect(result.state.chargeMs).toBe(0);
    expect(result.state.cooldownMs).toBeGreaterThan(0);
    expect(result.alarmDelta).toBeGreaterThan(0);
    expect(result.spotlight).toBe("Alibi scan +1 alarm");
    expect(result.radioLine).toBe("Rival scan burned your alibi. Break contact.");
  });

  it("decays charge after the player breaks contact", () => {
    const result = updateRivalScan({ chargeMs: 600, cooldownMs: 0 }, "clear", 300);

    expect(result.state.chargeMs).toBeLessThan(600);
    expect(result.alarmDelta).toBe(0);
  });
});
