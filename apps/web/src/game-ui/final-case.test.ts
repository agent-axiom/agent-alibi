import { describe, expect, it } from "vitest";
import type { MatchSummary } from "@agent-alibi/shared";
import {
  buildCaseShareText,
  buildCaseStamp,
  buildLocalBestCaseRecord,
  buildLocalBestCaseStatus,
  buildNextRunContracts,
  buildRematchHook,
  buildScoreMarginLabel,
  parseLocalBestCaseRecord
} from "./FinalCaseFile";

function summary(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    winnerTeamId: "blue",
    teamScores: [
      { teamId: "blue", loot: 3, escape: 2, penalties: 0, total: 5 },
      { teamId: "red", loot: 0, escape: 0, penalties: 0, total: 0 }
    ],
    mvpPlayerId: "p-human",
    title: "Hot Exit",
    caseFile: "AGENT ALIBI CASE FILE",
    ...overrides
  };
}

describe("buildRematchHook", () => {
  it("turns a red win into a carrier denial rematch prompt", () => {
    expect(
      buildRematchHook(
        summary({
          winnerTeamId: "red",
          teamScores: [
            { teamId: "blue", loot: 0, escape: 0, penalties: -3, total: -3 },
            { teamId: "red", loot: 3, escape: 1, penalties: 0, total: 4 }
          ],
          rivalRelicNames: ["Moon Pearl"]
        })
      )
    ).toBe("Next run: deny the carrier before Red reaches the Atrium Lift.");
  });

  it("turns a non-perfect blue win into an S-Rank chase prompt", () => {
    expect(buildRematchHook(summary({ runRating: "A-Rank", styleBonus: 2 }))).toBe("Next run: chase S-Rank with a faster, lower-alarm cashout.");
  });

  it("turns an empty escape into a relic-first rematch prompt", () => {
    expect(
      buildRematchHook(
        summary({
          runRating: "C-Rank",
          styleBonus: 0,
          stolenRelicNames: [],
          teamScores: [
            { teamId: "blue", loot: 0, escape: 2, penalties: 0, total: 2 },
            { teamId: "red", loot: 0, escape: 0, penalties: 0, total: 0 }
          ]
        })
      )
    ).toBe("Next run: steal one relic before you call the lift.");
  });
});

describe("buildCaseShareText", () => {
  it("copies the case file with highlights and a next-run hook", () => {
    const text = buildCaseShareText(
      summary({
        highlightLines: ["Stole Moon Pearl + Argent Crown", "Escaped with 6 loot"],
        lootChain: 2,
        runRating: "S-Rank"
      })
    );

    expect(text).toContain("AGENT ALIBI CASE FILE");
    expect(text).toContain("CASE HIGHLIGHTS");
    expect(text).toContain("01. Stole Moon Pearl + Argent Crown");
    expect(text).toContain("02. Escaped with 6 loot");
    expect(text).toContain("NEXT RUN");
    expect(text).toContain("Next run: run it back and make the case file louder.");
  });
});

describe("buildCaseStamp", () => {
  it("turns the final summary into a compact share stamp", () => {
    expect(
      buildCaseStamp(
        summary({
          title: "Profitable Disaster",
          runRating: "S-Rank",
          highlightLines: ["GremlinBot promised loyalty, then escaped alone with Moon Pearl"],
          lootChain: 2
        })
      )
    ).toEqual({
      kicker: "Agent Alibi Case File",
      title: "Profitable Disaster",
      result: "Blue Crew wins · S-Rank · Loot chain x2",
      quote: "GremlinBot promised loyalty, then escaped alone with Moon Pearl"
    });
  });

  it("leads the share stamp with an afterburner cashout highlight", () => {
    expect(
      buildCaseStamp(
        summary({
          afterburnerExitBonus: 1,
          highlightLines: ["Stole Moon Pearl + Argent Crown"]
        })
      ).quote
    ).toBe("Afterburner cashout +1 · Stole Moon Pearl + Argent Crown");
  });
});

describe("buildLocalBestCaseStatus", () => {
  it("turns a first finished run into a new local best record", () => {
    const status = buildLocalBestCaseStatus(
      summary({
        runRating: "S-Rank",
        lootChain: 2,
        stolenRelicNames: ["Moon Pearl", "Argent Crown"],
        teamScores: [
          { teamId: "blue", loot: 6, escape: 2, penalties: 0, total: 11 },
          { teamId: "red", loot: 0, escape: 0, penalties: 0, total: 0 }
        ]
      }),
      null,
      123
    );

    expect(status).toEqual({
      current: {
        version: 1,
        at: 123,
        score: 11,
        title: "Hot Exit",
        runRating: "S-Rank",
        lootChain: 2,
        relicCount: 2
      },
      previous: null,
      best: {
        version: 1,
        at: 123,
        score: 11,
        title: "Hot Exit",
        runRating: "S-Rank",
        lootChain: 2,
        relicCount: 2
      },
      isNewBest: true,
      title: "New best case",
      detail: "Score 11 · S-Rank · chain x2",
      delta: "First record saved"
    });
  });

  it("keeps a stronger stored case as the target to beat", () => {
    const previous = buildLocalBestCaseRecord(
      summary({
        title: "Profitable Disaster",
        runRating: "S-Rank",
        lootChain: 2,
        stolenRelicNames: ["Moon Pearl", "Argent Crown"],
        teamScores: [
          { teamId: "blue", loot: 6, escape: 2, penalties: 0, total: 12 },
          { teamId: "red", loot: 0, escape: 0, penalties: 0, total: 0 }
        ]
      }),
      100
    );

    const status = buildLocalBestCaseStatus(summary({ runRating: "A-Rank", styleBonus: 2 }), previous, 200);

    expect(status.isNewBest).toBe(false);
    expect(status.best).toBe(previous);
    expect(status.title).toBe("Best case to beat");
    expect(status.detail).toBe("Best 12 · current 5");
    expect(status.delta).toBe("8 points to beat");
  });
});

describe("parseLocalBestCaseRecord", () => {
  it("drops malformed stored records", () => {
    expect(parseLocalBestCaseRecord("{bad json")).toBeNull();
    expect(parseLocalBestCaseRecord(JSON.stringify({ version: 1, score: "11" }))).toBeNull();
  });
});

describe("buildNextRunContracts", () => {
  it("turns an S-Rank greed route into three replay goals", () => {
    expect(
      buildNextRunContracts(
        summary({
          runRating: "S-Rank",
          lootChain: 2,
          greedRoute: "successful",
          scanBurns: 0,
          stolenRelicNames: ["Moon Pearl", "Argent Crown"]
        })
      )
    ).toEqual([
      {
        label: "Speedrun",
        title: "Beat your case",
        detail: "Cashout faster without losing the loot chain."
      },
      {
        label: "Clean play",
        title: "No scan burns",
        detail: "Jam or dodge every rival scan."
      },
      {
        label: "Encore",
        title: "Greed route encore",
        detail: "Press G after Moon Pearl and bank the chain again."
      }
    ]);
  });
});

describe("buildScoreMarginLabel", () => {
  it("shows the winning side and score margin", () => {
    expect(
      buildScoreMarginLabel([
        { teamId: "blue", loot: 6, escape: 2, penalties: 0, total: 8 },
        { teamId: "red", loot: 4, escape: 0, penalties: 0, total: 4 }
      ])
    ).toBe("Blue by 4");
  });

  it("shows tie game when totals match", () => {
    expect(
      buildScoreMarginLabel([
        { teamId: "blue", loot: 3, escape: 0, penalties: 0, total: 3 },
        { teamId: "red", loot: 3, escape: 0, penalties: 0, total: 3 }
      ])
    ).toBe("Tie game");
  });
});
