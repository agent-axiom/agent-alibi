import { describe, expect, it } from "vitest";
import { buildRivalIntelCards } from "./rival-intel";

describe("buildRivalIntelCards", () => {
  it("prioritizes a carrier run over hunters and raiders", () => {
    const cards = buildRivalIntelCards({
      rivalsActive: true,
      wakeHoldMs: 0,
      nearestRivalName: "Rook",
      rivalPressureLevel: "closing",
      hunterName: "Rook",
      hunterStatus: "hunting",
      agents: [
        {
          id: "rook",
          name: "Rook",
          distanceMeters: 18,
          targetLabel: "You"
        },
        {
          id: "vesper",
          name: "Vesper",
          distanceMeters: 44,
          targetLabel: "Moon Gallery",
          carriedRelic: { name: "Moon Pearl", value: 3 },
          cashoutSeconds: 4
        },
        {
          id: "moth",
          name: "Moth",
          distanceMeters: 63,
          targetLabel: "Silver Archive"
        }
      ]
    });

    expect(cards[0]).toMatchObject({
      agentName: "Vesper",
      role: "Carrier",
      tone: "danger",
      status: "Moon Pearl +3",
      detail: "Cashout in 4s · 44m",
      action: "Intercept now"
    });
    expect(cards[1]).toMatchObject({
      agentName: "Rook",
      role: "Hunter",
      status: "Marks you"
    });
  });

  it("caps the intel strip at three readable cards", () => {
    const cards = buildRivalIntelCards({
      rivalsActive: true,
      wakeHoldMs: 0,
      nearestRivalName: "Anchor",
      rivalPressureLevel: "closing",
      hunterName: null,
      hunterStatus: null,
      agents: [
        { id: "anchor", name: "Anchor", distanceMeters: 20, targetLabel: "East Hall" },
        { id: "moth", name: "Moth", distanceMeters: 58, targetLabel: "Silver Archive" },
        { id: "vesper", name: "Vesper", distanceMeters: 64, targetLabel: "Moon Gallery" },
        { id: "rook", name: "Rook", distanceMeters: 88, targetLabel: "You" }
      ]
    });

    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.agentName)).toEqual(["Anchor", "Moth", "Vesper"]);
    expect(cards[0]).toMatchObject({
      role: "Scanner",
      status: "Scan pressure",
      action: "Jam or break line"
    });
  });

  it("shows waking rivals as readable staging plans before scans start", () => {
    const cards = buildRivalIntelCards({
      rivalsActive: false,
      wakeHoldMs: 6200,
      nearestRivalName: null,
      rivalPressureLevel: "standby",
      hunterName: "Rook",
      hunterStatus: "waking",
      agents: [
        { id: "rook", name: "Rook", distanceMeters: 51, targetLabel: "You" },
        { id: "moth", name: "Moth", distanceMeters: 60, targetLabel: "Silver Archive" }
      ]
    });

    expect(cards[0]).toMatchObject({
      agentName: "Rook",
      role: "Hunter",
      tone: "warning",
      detail: "Waking in 7s · 51m",
      action: "Use the head start"
    });
    expect(cards[1]).toMatchObject({
      agentName: "Moth",
      role: "Raider",
      status: "Raiding Silver Archive"
    });
  });
});
