import { describe, expect, it } from "vitest";
import { runScriptedMatch } from "./simulation";

describe("runScriptedMatch", () => {
  it("finishes a scripted six-round match with valid score", () => {
    const result = runScriptedMatch("single-seed");

    expect(result.state.phase).toBe("finished");
    expect(result.summary.teamScores.every((score) => Number.isFinite(score.total))).toBe(true);
    expect(result.state.players.every((player) => result.state.rooms.some((room) => room.id === player.locationId))).toBe(
      true
    );
  });

  it("runs 100 scripted bot matches without impossible state", () => {
    for (let index = 0; index < 100; index += 1) {
      const result = runScriptedMatch(`seed-${index}`);

      expect(result.state.phase).toBe("finished");
      expect(result.state.round).toBe(6);
      expect(result.state.artifacts.every((artifact) => !artifact.takenBy || result.state.players.some((player) => player.id === artifact.takenBy))).toBe(true);
      expect(result.summary.teamScores).toHaveLength(2);
    }
  });
});
