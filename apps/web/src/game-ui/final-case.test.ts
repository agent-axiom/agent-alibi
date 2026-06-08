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

  it("turns a won carrier intercept into a denial encore prompt", () => {
    expect(
      buildRematchHook(
        summary({
          carrierIntercepts: 1,
          interceptedRelicNames: ["Moon Pearl"],
          lootChain: 1,
          runRating: "S-Rank"
        })
      )
    ).toBe("Next run: bait another Red carrier run, then deny the lift again.");
  });

  it("turns a non-perfect blue win into an S-Rank chase prompt", () => {
    expect(buildRematchHook(summary({ runRating: "A-Rank", styleBonus: 2 }))).toBe("Next run: chase S-Rank with a faster, lower-alarm cashout.");
  });

  it("turns an afterburner cashout into a boost encore rematch prompt", () => {
    expect(
      buildRematchHook(
        summary({
          afterburnerExitBonus: 1,
          lootChain: 2,
          runRating: "S-Rank",
          greedRoute: "successful"
        })
      )
    ).toBe("Next run: hit afterburner again and cashout before the boost dies.");
  });

  it("turns a breakout cashout into a lock-break encore prompt", () => {
    expect(
      buildRematchHook(
        summary({
          lockBreakCashoutBonus: 2,
          runRating: "S-Rank",
          afterburnerExitBonus: 1
        })
      )
    ).toBe("Next run: break Rook's lock, then cashout before the scan returns.");
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
    expect(text).toContain("PLAY");
    expect(text).toContain("https://agent-axiom.github.io/agent-alibi/");
  });

  it("leads copied comeback results with the comeback cashout", () => {
    const text = buildCaseShareText(
      summary({
        comebackRoutesArmed: 1,
        highlightLines: ["Case title: Comeback Cashout", "Comeback cashout beat Red from behind", "Stole Argent Crown"]
      })
    );

    expect(text).toContain("CASE HIGHLIGHTS");
    expect(text).toContain("01. Comeback cashout beat Red from behind");
    expect(text).toContain("02. Case title: Comeback Cashout");
  });

  it("leads copied carrier-intercept results with the denied Red loot", () => {
    const text = buildCaseShareText(
      summary({
        carrierIntercepts: 1,
        interceptedRelicNames: ["Moon Pearl"],
        highlightLines: ["Case title: Carrier Denied", "Recovered Moon Pearl from rivals"]
      })
    );

    expect(text).toContain("CASE HIGHLIGHTS");
    expect(text).toContain("01. Red denied: Moon Pearl");
    expect(text).toContain("02. Case title: Carrier Denied");
    expect(text).toContain("03. Recovered Moon Pearl from rivals");
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

  it("leads share stamps with comeback cashout when Red was beaten from behind", () => {
    expect(
      buildCaseStamp(
        summary({
          comebackRoutesArmed: 1,
          afterburnerExitBonus: 1,
          highlightLines: ["Case title: Comeback Cashout", "Stole Argent Crown"]
        })
      ).quote
    ).toBe("Comeback cashout beat Red from behind");
  });

  it("leads share stamps with breakout cashout when the lock-break bonus lands", () => {
    expect(
      buildCaseStamp(
        summary({
          lockBreakCashoutBonus: 2,
          afterburnerExitBonus: 1,
          highlightLines: ["Stole Moon Pearl"]
        })
      ).quote
    ).toBe("Breakout cashout +2 · Stole Moon Pearl");
  });

  it("leads carrier-intercept share stamps with the denied Red loot", () => {
    expect(
      buildCaseStamp(
        summary({
          title: "Carrier Denied",
          carrierIntercepts: 1,
          interceptedRelicNames: ["Moon Pearl"],
          highlightLines: ["Case title: Carrier Denied", "Recovered Moon Pearl from rivals"]
        })
      ).quote
    ).toBe("Red denied: Moon Pearl");
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

  it("keeps the afterburner cashout marker in a new local best record", () => {
    const status = buildLocalBestCaseStatus(
      summary({
        runRating: "S-Rank",
        lootChain: 2,
        afterburnerExitBonus: 1,
        stolenRelicNames: ["Moon Pearl", "Argent Crown"],
        teamScores: [
          { teamId: "blue", loot: 6, escape: 2, penalties: 0, total: 12 },
          { teamId: "red", loot: 0, escape: 0, penalties: 0, total: 0 }
        ]
      }),
      null,
      321
    );

    expect(status.current).toMatchObject({ afterburnerExitBonus: 1 });
    expect(status.detail).toBe("Score 12 · S-Rank · chain x2 · boost +1");
  });

  it("keeps breakout cashout in a new local best record", () => {
    const status = buildLocalBestCaseStatus(
      summary({
        runRating: "S-Rank",
        lootChain: 1,
        lockBreakCashoutBonus: 2,
        teamScores: [
          { teamId: "blue", loot: 3, escape: 2, penalties: 0, total: 10 },
          { teamId: "red", loot: 0, escape: 0, penalties: 0, total: 0 }
        ]
      }),
      null,
      654
    );

    expect(status.current).toMatchObject({ lockBreakCashoutBonus: 2 });
    expect(status.detail).toBe("Score 10 · S-Rank · chain x1 · breakout +2");
  });

  it("keeps carrier denial in a new local best record", () => {
    const status = buildLocalBestCaseStatus(
      summary({
        runRating: "S-Rank",
        lootChain: 1,
        carrierIntercepts: 1,
        interceptedRelicNames: ["Moon Pearl"],
        teamScores: [
          { teamId: "blue", loot: 3, escape: 2, penalties: 0, total: 8 },
          { teamId: "red", loot: 0, escape: 0, penalties: 0, total: 0 }
        ]
      }),
      null,
      654
    );

    expect(status.current).toMatchObject({ carrierIntercepts: 1 });
    expect(status.detail).toBe("Score 8 · S-Rank · chain x1 · denial x1");
  });

  it("breaks equal best-case ties with carrier denials", () => {
    const previous = buildLocalBestCaseRecord(
      summary({
        runRating: "S-Rank",
        lootChain: 1,
        stolenRelicNames: ["Moon Pearl"],
        teamScores: [
          { teamId: "blue", loot: 3, escape: 2, penalties: 0, total: 8 },
          { teamId: "red", loot: 0, escape: 0, penalties: 0, total: 0 }
        ]
      }),
      100
    );

    const status = buildLocalBestCaseStatus(
      summary({
        runRating: "S-Rank",
        lootChain: 1,
        carrierIntercepts: 1,
        stolenRelicNames: ["Moon Pearl"],
        teamScores: [
          { teamId: "blue", loot: 3, escape: 2, penalties: 0, total: 8 },
          { teamId: "red", loot: 0, escape: 0, penalties: 0, total: 0 }
        ]
      }),
      previous,
      200
    );

    expect(status.isNewBest).toBe(true);
    expect(status.best).toMatchObject({ carrierIntercepts: 1 });
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

  it("turns an afterburner cashout into a boost encore goal", () => {
    const contracts = buildNextRunContracts(
      summary({
        runRating: "S-Rank",
        lootChain: 2,
        greedRoute: "successful",
        scanBurns: 0,
        afterburnerExitBonus: 1,
        stolenRelicNames: ["Moon Pearl", "Argent Crown"]
      })
    );

    expect(contracts[0]).toEqual({
      label: "Boost",
      title: "Afterburner encore",
      detail: "Steal, trigger afterburner, and cashout before the boost dies."
    });
  });

  it("turns a carrier-denied win into denial encore goals", () => {
    const contracts = buildNextRunContracts(
      summary({
        carrierIntercepts: 1,
        interceptedRelicNames: ["Moon Pearl"],
        runRating: "S-Rank",
        lootChain: 1
      })
    );

    expect(contracts[0]).toEqual({
      label: "Denial",
      title: "Deny the lift again",
      detail: "Bait Red into carrying loot, then intercept before Atrium Lift."
    });
    expect(contracts).toContainEqual({
      label: "Cashout",
      title: "Bank recovered loot",
      detail: "Turn the stolen carrier relic into your own clean exit."
    });
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
