import type { MatchSummary, TeamScore } from "@agent-alibi/shared";

export type ArcadeMissionOutcome = "escaped" | "sealed" | "caught";

export type ArcadeMissionResult = {
  outcome: ArcadeMissionOutcome;
  playerName: string;
  lootValue: number;
  artifactsStolen: number;
  aiLootValue: number;
  alarm: number;
  elapsedMs: number;
};

export type ArcadeRunRating = {
  runRating: string;
  styleBonus: number;
};

export function buildArcadeMatchSummary(result: ArcadeMissionResult): MatchSummary {
  const escaped = result.outcome === "escaped";
  const bluePenalty = escaped ? 0 : -3;
  const { runRating, styleBonus } = rateArcadeRun(result);
  const blueScore: TeamScore = {
    teamId: "blue",
    loot: result.lootValue,
    escape: escaped ? 2 : 0,
    penalties: bluePenalty,
    total: result.lootValue + (escaped ? 2 : 0) + bluePenalty + styleBonus
  };
  const redScore: TeamScore = {
    teamId: "red",
    loot: result.aiLootValue,
    escape: result.aiLootValue > 0 ? 1 : 0,
    penalties: 0,
    total: result.aiLootValue + (result.aiLootValue > 0 ? 1 : 0)
  };
  const winnerTeamId = blueScore.total === redScore.total ? "tie" : blueScore.total > redScore.total ? "blue" : "red";
  const title = titleForResult(result, winnerTeamId);

  return {
    winnerTeamId,
    teamScores: [blueScore, redScore],
    mvpPlayerId: "p-human",
    biggestBetrayal: result.aiLootValue > result.lootValue ? "AI rivals stripped the vault while the crew improvised." : undefined,
    mostSuspiciousPlayerId: result.alarm >= 4 ? "p-human" : undefined,
    title,
    runRating,
    styleBonus,
    caseFile: buildCaseFile(result, title, blueScore, redScore, runRating, styleBonus)
  };
}

export function rateArcadeRun(result: Pick<ArcadeMissionResult, "outcome" | "alarm" | "elapsedMs">): ArcadeRunRating {
  const styleBonus = styleBonusForResult(result);
  return {
    runRating: runRatingForResult(result, styleBonus),
    styleBonus
  };
}

function styleBonusForResult(result: Pick<ArcadeMissionResult, "outcome" | "alarm" | "elapsedMs">): number {
  if (result.outcome !== "escaped") return 0;
  if (result.alarm <= 2 && result.elapsedMs <= 60_000) return 3;
  if (result.alarm <= 3 && result.elapsedMs <= 75_000) return 2;
  if (result.alarm <= 3 && result.elapsedMs <= 90_000) return 1;
  return 0;
}

function runRatingForResult(result: Pick<ArcadeMissionResult, "outcome">, styleBonus: number): string {
  if (result.outcome !== "escaped") return "C-Rank";
  if (styleBonus >= 3) return "S-Rank";
  if (styleBonus === 2) return "A-Rank";
  if (styleBonus === 1) return "B-Rank";
  return "C-Rank";
}

function titleForResult(result: ArcadeMissionResult, winnerTeamId: MatchSummary["winnerTeamId"]): string {
  if (result.outcome === "escaped" && winnerTeamId === "blue" && result.alarm <= 2) return "Silent Moon Run";
  if (result.outcome === "escaped" && winnerTeamId === "blue") return "Hot Exit";
  if (result.outcome === "sealed") return "Vault sealed";
  if (result.outcome === "caught") return "Alarm Burn";
  return "Neon Disaster";
}

function buildCaseFile(
  result: ArcadeMissionResult,
  title: string,
  blueScore: TeamScore,
  redScore: TeamScore,
  runRating: string,
  styleBonus: number
): string {
  const elapsedSeconds = Math.round(result.elapsedMs / 1000);
  const outcomeLine =
    result.outcome === "escaped"
      ? `${result.playerName} escaped with ${result.artifactsStolen} relics before lockdown.`
      : result.outcome === "sealed"
        ? "Vault sealed before the crew could reach the exit."
        : `${result.playerName} was caught in the alarm wash.`;

  return [
    "AGENT ALIBI CASE FILE",
    "",
    `Title: ${title}`,
    `Winner: ${blueScore.total === redScore.total ? "Tie" : blueScore.total > redScore.total ? "Blue Crew" : "Red Crew"}`,
    `Blue Crew: ${blueScore.total} (${blueScore.loot} loot, ${blueScore.escape} escape, ${blueScore.penalties} penalty)`,
    `Red Crew: ${redScore.total} (${redScore.loot} rival loot)`,
    `Run Rating: ${runRating}`,
    styleBonus > 0 ? `Clean exit bonus: +${styleBonus}` : "Clean exit bonus: +0",
    `Alarm: ${result.alarm}/5`,
    `Time inside: ${elapsedSeconds}s`,
    "",
    outcomeLine
  ].join("\n");
}
