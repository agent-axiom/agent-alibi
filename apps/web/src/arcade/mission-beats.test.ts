import { describe, expect, it } from "vitest";
import { buildMissionBeat } from "./mission-beats";

describe("buildMissionBeat", () => {
  it("turns lockdown into an escape-first beat instead of a relic objective", () => {
    const input = {
      targetArtifactName: "Moon Pearl",
      targetArtifactValue: 3,
      lootValue: 0,
      rivalLootValue: 0,
      canEscape: false,
      cashoutValue: null,
      routeChoiceRelic: null,
      routeMode: "escape" as const,
      rivalCarrier: null,
      alibiPulseReady: false,
      nearestRivalName: null,
      phase: "lockdown" as const,
      timeLeftMs: 29_000
    };

    const beat = buildMissionBeat(input);

    expect(beat).toEqual({
      tone: "danger",
      kicker: "Final countdown",
      title: "Lockdown is closing",
      detail: "The Moon Vault seals soon. Stop chasing relics and reach the lift.",
      action: "Escape now"
    });
  });

  it("turns lockdown with carried loot into a cashout-first beat", () => {
    const beat = buildMissionBeat({
      targetArtifactName: "Argent Crown",
      targetArtifactValue: 3,
      lootValue: 3,
      rivalLootValue: 0,
      canEscape: true,
      cashoutValue: 5,
      routeChoiceRelic: null,
      routeMode: "escape",
      rivalCarrier: null,
      alibiPulseReady: false,
      nearestRivalName: null,
      phase: "lockdown",
      timeLeftMs: 24_000
    });

    expect(beat.action).toBe("Cashout now");
  });

  it("starts the heist with one concrete objective beat", () => {
    const beat = buildMissionBeat({
      targetArtifactName: "Moon Pearl",
      targetArtifactValue: 3,
      lootValue: 0,
      rivalLootValue: 0,
      canEscape: false,
      cashoutValue: null,
      routeChoiceRelic: null,
      routeMode: "escape",
      rivalCarrier: null,
      alibiPulseReady: false,
      nearestRivalName: null
    });

    expect(beat).toEqual({
      tone: "focus",
      kicker: "First objective",
      title: "Steal Moon Pearl",
      detail: "The gold marker points to the score. Rivals arrive fast.",
      action: "Move with WASD / arrows"
    });
  });

  it("prioritizes a rival carrier over cashout guidance", () => {
    const beat = buildMissionBeat({
      targetArtifactName: "Argent Crown",
      targetArtifactValue: 3,
      lootValue: 3,
      rivalLootValue: 0,
      canEscape: true,
      cashoutValue: 5,
      routeChoiceRelic: "Argent Crown +3",
      routeMode: "escape",
      rivalCarrier: {
        agentName: "Rook",
        relicName: "Moon Pearl",
        value: 3,
        swingValue: 6,
        distanceMeters: 42,
        directionLabel: "Carrier NE 42m",
        cashoutSeconds: 9,
        urgency: "chase"
      },
      alibiPulseReady: true,
      nearestRivalName: "Rook"
    });

    expect(beat).toEqual({
      tone: "danger",
      kicker: "Carrier run",
      title: "Rook has Moon Pearl",
      detail: "42m away. Red cashout in 9s for +3.",
      action: "Chase the gold-red carrier blip"
    });
  });

  it("turns critical carrier runs into an imminent cashout beat", () => {
    const beat = buildMissionBeat({
      targetArtifactName: "Argent Crown",
      targetArtifactValue: 3,
      lootValue: 3,
      rivalLootValue: 0,
      canEscape: true,
      cashoutValue: 5,
      routeChoiceRelic: "Argent Crown +3",
      routeMode: "escape",
      rivalCarrier: {
        agentName: "Rook",
        relicName: "Moon Pearl",
        value: 3,
        swingValue: 6,
        distanceMeters: 11,
        directionLabel: "Carrier E 11m",
        cashoutSeconds: 3,
        urgency: "critical"
      },
      alibiPulseReady: false,
      nearestRivalName: "Rook"
    });

    expect(beat).toEqual({
      tone: "danger",
      kicker: "Carrier run",
      title: "Rook has Moon Pearl",
      detail: "11m away. Red cashout imminent for +3.",
      action: "Press E / Space to recover it"
    });
  });

  it("turns secured loot into a clear cashout decision", () => {
    const beat = buildMissionBeat({
      targetArtifactName: "Argent Crown",
      targetArtifactValue: 3,
      lootValue: 3,
      rivalLootValue: 0,
      canEscape: true,
      cashoutValue: 5,
      routeChoiceRelic: "Argent Crown +3",
      routeMode: "escape",
      rivalCarrier: null,
      alibiPulseReady: false,
      nearestRivalName: null
    });

    expect(beat).toEqual({
      tone: "success",
      kicker: "Loot secured",
      title: "Cashout worth 5",
      detail: "Argent Crown +3 can extend the chain, but the lift is paying now.",
      action: "Reach Atrium Lift or press G for greed route"
    });
  });

  it("turns secured loot into a lead-aware cashout decision", () => {
    const beat = buildMissionBeat({
      targetArtifactName: "Argent Crown",
      targetArtifactValue: 3,
      lootValue: 3,
      rivalLootValue: 3,
      canEscape: true,
      cashoutValue: 5,
      routeChoiceRelic: "Argent Crown +3",
      routeMode: "escape",
      rivalCarrier: null,
      alibiPulseReady: false,
      nearestRivalName: null
    });

    expect(beat.title).toBe("Cashout beats Red by 2");
    expect(beat.detail).toBe("Argent Crown +3 can extend the chain, but the lift is paying now.");
  });

  it("turns a rival cashout lead into a comeback beat", () => {
    const beat = buildMissionBeat({
      targetArtifactName: "Argent Crown",
      targetArtifactValue: 3,
      lootValue: 0,
      rivalLootValue: 3,
      canEscape: false,
      cashoutValue: null,
      routeChoiceRelic: null,
      routeMode: "escape",
      rivalCarrier: null,
      alibiPulseReady: false,
      nearestRivalName: null
    });

    expect(beat).toEqual({
      tone: "danger",
      kicker: "Score pressure",
      title: "Red leads by 3",
      detail: "Argent Crown +3 plus lift bonus can beat Red. Steal it, then cash out.",
      action: "Follow the gold marker before the next red carrier run"
    });
  });

  it("keeps the comeback beat when a scan threat is also active", () => {
    const beat = buildMissionBeat({
      targetArtifactName: "Argent Crown",
      targetArtifactValue: 3,
      lootValue: 0,
      rivalLootValue: 3,
      canEscape: false,
      cashoutValue: null,
      routeChoiceRelic: null,
      routeMode: "escape",
      rivalCarrier: null,
      alibiPulseReady: true,
      nearestRivalName: "Rook"
    });

    expect(beat.kicker).toBe("Score pressure");
    expect(beat.title).toBe("Red leads by 3");
  });
});
