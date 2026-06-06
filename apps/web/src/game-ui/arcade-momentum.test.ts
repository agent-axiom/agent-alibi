import { describe, expect, it } from "vitest";
import { buildArcadeMomentumMeter } from "./arcade-momentum";

describe("buildArcadeMomentumMeter", () => {
  it("turns the clean bonus window into a visible momentum meter", () => {
    const meter = buildArcadeMomentumMeter({
      cleanBonusWindow: {
        label: "Clean bonus",
        detail: "S-Rank +3",
        secondsLeft: 45
      },
      lootChainWindow: null
    });

    expect(meter).toEqual({
      tone: "clean",
      label: "Clean bonus",
      detail: "S-Rank +3",
      action: "45s for clean exit",
      value: 75
    });
  });

  it("prioritizes loot chain urgency over the clean bonus window", () => {
    const meter = buildArcadeMomentumMeter({
      cleanBonusWindow: {
        label: "Clean bonus",
        detail: "S-Rank +3",
        secondsLeft: 55
      },
      lootChainWindow: {
        label: "Loot chain x2",
        detail: "Next relic keeps streak",
        secondsLeft: 7
      }
    });

    expect(meter).toEqual({
      tone: "chain",
      label: "Loot chain x2",
      detail: "Next relic keeps streak",
      action: "7s to chain or cashout",
      value: 70
    });
  });
});
