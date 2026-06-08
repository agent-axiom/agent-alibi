import type { MatchSummary, TeamScore } from "@agent-alibi/shared";

export type ArcadeMissionOutcome = "escaped" | "sealed" | "caught";

export type ArcadeMissionResult = {
  outcome: ArcadeMissionOutcome;
  playerName: string;
  lootValue: number;
  artifactsStolen: number;
  stolenRelicNames?: string[];
  rivalRelicNames?: string[];
  pendingRivalRelicNames?: string[];
  aiLootValue: number;
  alarm: number;
  elapsedMs: number;
  alibiPulsesUsed?: number;
  scanBurns?: number;
  carrierIntercepts?: number;
  ambushNearMisses?: number;
  interceptedRelicNames?: string[];
  interceptedLootValue?: number;
  afterburnerExit?: boolean;
  lockBreakCashoutBonus?: number;
  comebackRoutesArmed?: number;
};

export type ArcadeRunRating = {
  runRating: string;
  styleBonus: number;
};

export function buildArcadeMatchSummary(result: ArcadeMissionResult): MatchSummary {
  const escaped = result.outcome === "escaped";
  const bluePenalty = escaped ? 0 : -3;
  const { runRating, styleBonus } = rateArcadeRun(result);
  const lootChain = Math.max(1, result.artifactsStolen);
  const greedRoute = lootChain > 1 ? "successful" : "skipped";
  const stolenRelicNames = result.stolenRelicNames ?? [];
  const rivalRelicNames = result.rivalRelicNames ?? [];
  const pendingRivalRelicNames = result.pendingRivalRelicNames ?? [];
  const alibiPulsesUsed = result.alibiPulsesUsed ?? 0;
  const scanBurns = result.scanBurns ?? 0;
  const carrierIntercepts = result.carrierIntercepts ?? 0;
  const ambushNearMisses = Math.max(0, result.ambushNearMisses ?? 0);
  const interceptedRelicNames = result.interceptedRelicNames ?? [];
  const afterburnerExitBonus = escaped && result.afterburnerExit ? 1 : 0;
  const lockBreakCashoutBonus = escaped ? Math.max(0, result.lockBreakCashoutBonus ?? 0) : 0;
  const comebackRoutesArmed = Math.max(0, result.comebackRoutesArmed ?? 0);
  const blueScore: TeamScore = {
    teamId: "blue",
    loot: result.lootValue,
    escape: escaped ? 2 : 0,
    penalties: bluePenalty,
    total: result.lootValue + (escaped ? 2 : 0) + bluePenalty + styleBonus + afterburnerExitBonus + lockBreakCashoutBonus
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
  const highlightLines = buildHighlightLines(
    result,
    title,
    styleBonus,
    afterburnerExitBonus,
    lockBreakCashoutBonus,
    stolenRelicNames,
    interceptedRelicNames,
    pendingRivalRelicNames
  );

  return {
    winnerTeamId,
    teamScores: [blueScore, redScore],
    mvpPlayerId: "p-human",
    biggestBetrayal: result.aiLootValue > result.lootValue ? "AI rivals stripped the vault while the crew improvised." : undefined,
    mostSuspiciousPlayerId: result.alarm >= 4 ? "p-human" : undefined,
    title,
    runRating,
    styleBonus,
    afterburnerExitBonus,
    lockBreakCashoutBonus,
    comebackRoutesArmed,
    lootChain,
    greedRoute,
    stolenRelicNames,
    rivalRelicNames,
    pendingRivalRelicNames,
    alibiPulsesUsed,
    scanBurns,
    carrierIntercepts,
    ambushNearMisses,
    interceptedRelicNames,
    highlightLines,
    caseFile: buildCaseFile(result, title, blueScore, redScore, runRating, styleBonus, afterburnerExitBonus, lockBreakCashoutBonus)
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
  if ((result.carrierIntercepts ?? 0) > 0) return "Carrier Denied";
  if ((result.lockBreakCashoutBonus ?? 0) > 0) return "Breakout Cashout";
  if (isComebackCashout(result, winnerTeamId)) return "Comeback Cashout";
  if ((result.pendingRivalRelicNames?.length ?? 0) > 0) return "Lift Denied";
  if (result.outcome === "escaped" && result.lootValue <= 0) return "Empty-Handed Exit";
  if (result.outcome === "escaped" && winnerTeamId === "blue" && result.alarm <= 2) return "Silent Moon Run";
  if (result.outcome === "escaped" && winnerTeamId === "blue") return "Hot Exit";
  if (result.outcome === "sealed") return "Vault sealed";
  if (result.outcome === "caught") return "Alarm Burn";
  return "Neon Disaster";
}

function buildHighlightLines(
  result: ArcadeMissionResult,
  title: string,
  styleBonus: number,
  afterburnerExitBonus: number,
  lockBreakCashoutBonus: number,
  stolenRelicNames: string[],
  interceptedRelicNames: string[],
  pendingRivalRelicNames: string[]
): string[] {
  const lines: string[] = [];
  if (isSpecialCaseTitle(title)) {
    lines.push(`Case title: ${title}`);
  }
  if (stolenRelicNames.length > 0) {
    lines.push(`Stole ${stolenRelicNames.join(" + ")}`);
  } else if (result.artifactsStolen > 0) {
    lines.push(`Stole ${result.artifactsStolen} relic${result.artifactsStolen === 1 ? "" : "s"}`);
  }
  if (title === "Comeback Cashout") {
    lines.push("Comeback cashout beat Red from behind");
  }
  if (interceptedRelicNames.length > 0) {
    lines.push(`Recovered ${interceptedRelicNames.join(" + ")} from rivals`);
  }
  if (pendingRivalRelicNames.length > 0) {
    lines.push(`Blocked rival cashout on ${pendingRivalRelicNames.join(" + ")}`);
  }
  if (lockBreakCashoutBonus > 0) {
    lines.push(`Breakout cashout +${lockBreakCashoutBonus}`);
  }
  if ((result.ambushNearMisses ?? 0) > 0) {
    lines.push(`Dashed through rival ambush x${result.ambushNearMisses}`);
  }
  if (result.outcome === "escaped") {
    if (result.lootValue > 0) {
      lines.push(`Cashed out +${cashoutBankedValue(result)} at lift`);
      lines.push(`Escaped with ${result.lootValue} loot`);
    } else {
      lines.push("Escaped before the seal");
      lines.push("No relics banked");
    }
  } else if (result.outcome === "sealed") {
    lines.push("Vault sealed before extraction");
  } else {
    lines.push("Caught in the alarm wash");
  }
  if (styleBonus > 0) {
    lines.push(`Clean exit bonus +${styleBonus}`);
  }
  if (afterburnerExitBonus > 0) {
    lines.push(`Afterburner exit +${afterburnerExitBonus}`);
  }
  return lines.slice(0, 5);
}

function isSpecialCaseTitle(title: string): boolean {
  return title === "Carrier Denied" || title === "Lift Denied" || title === "Comeback Cashout";
}

function isComebackCashout(result: ArcadeMissionResult, winnerTeamId: MatchSummary["winnerTeamId"]): boolean {
  return result.outcome === "escaped" && winnerTeamId === "blue" && (result.comebackRoutesArmed ?? 0) > 0 && result.aiLootValue > 0;
}

function formatRelicCount(count: number): string {
  return count + " relic" + (count === 1 ? "" : "s");
}

function cashoutBankedValue(result: Pick<ArcadeMissionResult, "outcome" | "lootValue" | "lockBreakCashoutBonus">): number {
  return result.outcome === "escaped" ? result.lootValue + 2 + Math.max(0, result.lockBreakCashoutBonus ?? 0) : 0;
}

function buildCaseFile(
  result: ArcadeMissionResult,
  title: string,
  blueScore: TeamScore,
  redScore: TeamScore,
  runRating: string,
  styleBonus: number,
  afterburnerExitBonus: number,
  lockBreakCashoutBonus: number
): string {
  const elapsedSeconds = Math.round(result.elapsedMs / 1000);
  const denialSwingLine =
    (result.interceptedLootValue ?? 0) > 0
      ? "Denial Swing: +" + result.interceptedLootValue + " recovered / +" + result.interceptedLootValue + " denied"
      : null;
  const outcomeLine =
    result.outcome === "escaped"
      ? result.lootValue > 0
        ? result.playerName + " escaped with " + formatRelicCount(result.artifactsStolen) + " before lockdown."
        : `${result.playerName} escaped empty-handed before lockdown.`
      : result.outcome === "sealed"
        ? "Vault sealed before the crew could reach the exit."
        : `${result.playerName} was caught in the alarm wash.`;
  const bankedLine =
    result.outcome === "escaped" && result.lootValue === 0
      ? "Escape Bonus: +2"
      : `Cashout Banked: +${cashoutBankedValue(result)}`;

  return [
    "AGENT ALIBI CASE FILE",
    "",
    `Title: ${title}`,
    `Winner: ${blueScore.total === redScore.total ? "Tie" : blueScore.total > redScore.total ? "Blue Crew" : "Red Crew"}`,
    `Blue Crew: ${blueScore.total} (${blueScore.loot} loot, ${blueScore.escape} escape, ${blueScore.penalties} penalty)`,
    bankedLine,
    `Red Crew: ${redScore.total} (${redScore.loot} rival loot)`,
    `Run Rating: ${runRating}`,
    styleBonus > 0 ? `Clean exit bonus: +${styleBonus}` : "Clean exit bonus: +0",
    afterburnerExitBonus > 0 ? `Afterburner Exit Bonus: +${afterburnerExitBonus}` : "Afterburner Exit Bonus: +0",
    lockBreakCashoutBonus > 0 ? `Breakout Cashout Bonus: +${lockBreakCashoutBonus}` : "Breakout Cashout Bonus: +0",
    `Loot Chain: x${Math.max(1, result.artifactsStolen)}`,
    `Greed Route: ${result.artifactsStolen > 1 ? "successful" : "skipped"}`,
    `Relics Stolen: ${result.stolenRelicNames?.length ? result.stolenRelicNames.join(", ") : "none"}`,
    `Rival Relics: ${result.rivalRelicNames?.length ? result.rivalRelicNames.join(", ") : "none"}`,
    `Pending Carrier Loot: ${result.pendingRivalRelicNames?.length ? result.pendingRivalRelicNames.join(", ") : "none"}`,
    `Comeback Routes: ${result.comebackRoutesArmed ?? 0}`,
    ...(title === "Comeback Cashout" ? ["Comeback Swing: beat Red from behind"] : []),
    `Alibi Pulses: ${result.alibiPulsesUsed ?? 0}`,
    `Scan Burns: ${result.scanBurns ?? 0}`,
    `Carrier Intercepts: ${result.carrierIntercepts ?? 0}`,
    `Ambush Dodges: ${result.ambushNearMisses ?? 0}`,
    `Recovered From Rivals: ${result.interceptedRelicNames?.length ? result.interceptedRelicNames.join(", ") : "none"}`,
    ...(denialSwingLine ? [denialSwingLine] : []),
    `Alarm: ${result.alarm}/5`,
    `Time inside: ${elapsedSeconds}s`,
    "",
    outcomeLine
  ].join("\n");
}
