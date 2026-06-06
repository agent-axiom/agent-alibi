import { describe, expect, it } from "vitest";
import { selectMissionStinger } from "./stingers";

describe("selectMissionStinger", () => {
  it("plays a steal stinger when blue loot increases", () => {
    expect(
      selectMissionStinger(
        { lootValue: 0, phase: "stealth", spotlight: null, summaryTitle: null },
        { lootValue: 3, phase: "stealth", spotlight: "Moon Pearl secured", summaryTitle: null }
      )
    ).toBe("steal");
  });

  it("prioritizes intercept stingers over ordinary loot gain", () => {
    expect(
      selectMissionStinger(
        { lootValue: 0, phase: "stealth", spotlight: null, summaryTitle: null },
        { lootValue: 3, phase: "stealth", spotlight: "Intercepted Rook", summaryTitle: null }
      )
    ).toBe("intercept");
  });

  it("plays a lockdown stinger when the vault enters lockdown", () => {
    expect(
      selectMissionStinger(
        { lootValue: 3, phase: "alarm", spotlight: null, summaryTitle: null },
        { lootValue: 3, phase: "lockdown", spotlight: null, summaryTitle: null }
      )
    ).toBe("lockdown");
  });

  it("plays a case-file stinger when a final title appears", () => {
    expect(
      selectMissionStinger(
        { lootValue: 6, phase: "escaped", spotlight: null, summaryTitle: null },
        { lootValue: 6, phase: "escaped", spotlight: null, summaryTitle: "Silent Moon Run" }
      )
    ).toBe("case-file");
  });
});
