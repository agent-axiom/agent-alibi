import { describe, expect, it } from "vitest";
import { selectMusicTrack } from "./music";

describe("selectMusicTrack", () => {
  it("uses the menu loop before a mission starts", () => {
    expect(selectMusicTrack({ screen: "home" })).toBe("menu");
  });

  it("returns to the menu loop on the final case file", () => {
    expect(selectMusicTrack({ screen: "final" })).toBe("menu");
  });

  it("uses stealth music early in a quiet arcade mission", () => {
    expect(selectMusicTrack({ screen: "match", isArcade: true, alarm: 1, timeLeftMs: 110_000 })).toBe("stealth");
  });

  it("switches to alarm music when the vault pressure rises", () => {
    expect(selectMusicTrack({ screen: "match", isArcade: true, alarm: 4, timeLeftMs: 88_000 })).toBe("alarm");
  });

  it("uses alarm music during an afterburner cashout surge", () => {
    expect(selectMusicTrack({ screen: "match", isArcade: true, alarm: 1, timeLeftMs: 88_000, boostActive: true })).toBe("alarm");
  });

  it("uses alarm music when rival pressure is active before the vault alarm rises", () => {
    expect(selectMusicTrack({ screen: "match", isArcade: true, alarm: 1, timeLeftMs: 88_000, rivalPressureActive: true })).toBe("alarm");
  });

  it("uses lockdown music for the final seconds or maximum alarm", () => {
    expect(selectMusicTrack({ screen: "match", isArcade: true, alarm: 2, timeLeftMs: 24_000 })).toBe("lockdown");
    expect(selectMusicTrack({ screen: "match", isArcade: true, alarm: 5, timeLeftMs: 80_000 })).toBe("lockdown");
  });
});
