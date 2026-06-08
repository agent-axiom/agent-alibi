import { describe, expect, it } from "vitest";
import { selectMissionStinger } from "./stingers";

describe("selectMissionStinger", () => {
  it("plays a steal stinger when blue loot increases", () => {
    expect(
      selectMissionStinger(
        { lootValue: 0, aiLootValue: 0, phase: "stealth", spotlight: null, summaryTitle: null },
        { lootValue: 3, aiLootValue: 0, phase: "stealth", spotlight: "Moon Pearl secured", summaryTitle: null }
      )
    ).toBe("steal");
  });

  it("prioritizes intercept stingers over ordinary loot gain", () => {
    expect(
      selectMissionStinger(
        { lootValue: 0, aiLootValue: 0, phase: "stealth", spotlight: null, summaryTitle: null },
        { lootValue: 3, aiLootValue: 0, phase: "stealth", spotlight: "Intercepted Rook", summaryTitle: null }
      )
    ).toBe("intercept");
  });

  it("plays a lockdown stinger when the vault enters lockdown", () => {
    expect(
      selectMissionStinger(
        { lootValue: 3, aiLootValue: 0, phase: "alarm", spotlight: null, summaryTitle: null },
        { lootValue: 3, aiLootValue: 0, phase: "lockdown", spotlight: null, summaryTitle: null }
      )
    ).toBe("lockdown");
  });

  it("plays a case-file stinger when a final title appears", () => {
    expect(
      selectMissionStinger(
        { lootValue: 6, aiLootValue: 0, phase: "escaped", spotlight: null, summaryTitle: null },
        { lootValue: 6, aiLootValue: 0, phase: "escaped", spotlight: null, summaryTitle: "Silent Moon Run" }
      )
    ).toBe("case-file");
  });

  it("plays a rival cashout stinger when red loot increases", () => {
    expect(
      selectMissionStinger(
        { lootValue: 0, aiLootValue: 0, phase: "stealth", spotlight: null, summaryTitle: null, rivalStatus: "Rivals active" },
        { lootValue: 0, aiLootValue: 3, phase: "stealth", spotlight: "Red cashout +3", summaryTitle: null, rivalStatus: "Rivals active" }
      )
    ).toBe("rival-cashout");
  });

  it("plays a rival wake stinger when the first score wakes the rivals", () => {
    expect(
      selectMissionStinger(
        { lootValue: 0, aiLootValue: 0, phase: "stealth", spotlight: null, summaryTitle: null, rivalStatus: "Rivals wake after first score or 9s" },
        { lootValue: 3, aiLootValue: 0, phase: "stealth", spotlight: "Moon Pearl secured", summaryTitle: null, rivalStatus: "Rivals waking in 4s" }
      )
    ).toBe("rival-wake");
  });

  it("plays a route-lock stinger when a route pulse appears", () => {
    expect(
      selectMissionStinger(
        { lootValue: 3, aiLootValue: 0, phase: "stealth", spotlight: null, summaryTitle: null, routePulseTitle: null },
        { lootValue: 3, aiLootValue: 0, phase: "stealth", spotlight: null, summaryTitle: null, routePulseTitle: "Greed route locked" }
      )
    ).toBe("route-lock");
  });

  it("plays a comeback stinger when a comeback route pulse appears", () => {
    expect(
      selectMissionStinger(
        { lootValue: 3, aiLootValue: 3, phase: "stealth", spotlight: null, summaryTitle: null, routePulseTitle: null },
        { lootValue: 3, aiLootValue: 3, phase: "stealth", spotlight: null, summaryTitle: null, routePulseTitle: "Comeback live" }
      )
    ).toBe("comeback");
  });
});
