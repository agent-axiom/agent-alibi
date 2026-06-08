import { describe, expect, it } from "vitest";
import { buildDirectorCue } from "./director-cue";

describe("buildDirectorCue", () => {
  it("prioritizes a critical rival carrier as a player intervention moment", () => {
    const cue = buildDirectorCue({
      phase: "alarm",
      lootValue: 3,
      rivalLootValue: 0,
      cashoutValue: 5,
      canEscape: true,
      targetArtifactName: "Argent Crown",
      targetArtifactValue: 3,
      rivalCarrier: {
        agentName: "Rook",
        relicName: "Moon Pearl",
        value: 3,
        swingValue: 6,
        distanceMeters: 11,
        directionLabel: "Carrier E 11m",
        cashoutSeconds: 3,
        urgency: "critical"
      }
    });

    expect(cue).toEqual({
      tone: "danger",
      label: "Director cue",
      title: "Cut off Rook now",
      detail: "Moon Pearl is 11m away and about to bank +3 for Red.",
      reward: "Recover it to flip the score swing.",
      action: "Dash into the red route, then press E / Space."
    });
  });

  it("turns carried loot into a visible bank-the-score decision", () => {
    const cue = buildDirectorCue({
      phase: "alarm",
      lootValue: 3,
      rivalLootValue: 3,
      cashoutValue: 5,
      canEscape: true,
      targetArtifactName: "Argent Crown",
      targetArtifactValue: 3,
      rivalCarrier: null
    });

    expect(cue).toMatchObject({
      tone: "success",
      title: "Bank +5 at the lift",
      detail: "You are carrying +3 while Red has 3.",
      reward: "Banking now beats Red by 2."
    });
  });

  it("explains comeback pressure without duplicating mission beat title", () => {
    const cue = buildDirectorCue({
      phase: "alarm",
      lootValue: 0,
      rivalLootValue: 3,
      cashoutValue: null,
      canEscape: false,
      targetArtifactName: "Argent Crown",
      targetArtifactValue: 3,
      rivalCarrier: null
    });

    expect(cue).toMatchObject({
      tone: "danger",
      title: "Comeback: steal Argent Crown",
      detail: "Red is ahead by 3. The next relic is your swing play.",
      reward: "Steal +3, then cashout to answer Red."
    });
  });

  it("starts the run with one simple first-hit cue", () => {
    const cue = buildDirectorCue({
      phase: "stealth",
      lootValue: 0,
      rivalLootValue: 0,
      cashoutValue: null,
      canEscape: false,
      targetArtifactName: "Moon Pearl",
      targetArtifactValue: 3,
      rivalCarrier: null
    });

    expect(cue).toMatchObject({
      tone: "focus",
      title: "First hit: Moon Pearl",
      detail: "Follow the gold beam and steal +3 before Red wakes up.",
      reward: "First score unlocks the cashout route."
    });
  });
});
