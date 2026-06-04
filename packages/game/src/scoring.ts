import type { GameState, MatchSummary, PlayerState, TeamId, TeamScore } from "@agent-alibi/shared";

const TEAM_NAMES: Record<TeamId, string> = {
  blue: "Blue Crew",
  red: "Red Crew"
};

export function getTeamScores(state: GameState): TeamScore[] {
  return (["blue", "red"] as const).map((teamId) => {
    const teamPlayers = state.players.filter((player) => player.teamId === teamId);
    const loot = state.artifacts
      .filter((artifact) => {
        const holder = artifact.takenBy ? state.players.find((player) => player.id === artifact.takenBy) : undefined;
        return holder?.teamId === teamId && holder.status !== "caught";
      })
      .reduce((total, artifact) => total + artifact.value, 0);
    const escape = teamPlayers.filter((player) => player.status === "escaped").length * 2;
    const caughtPenalty = teamPlayers.filter((player) => player.status === "caught").length * -1;
    const leftInsidePenalty =
      state.phase === "finished" ? teamPlayers.filter((player) => player.status === "active").length * -2 : 0;
    const penalties = caughtPenalty + leftInsidePenalty;

    return {
      teamId,
      loot,
      escape,
      penalties,
      total: loot + escape + penalties
    };
  });
}

export function buildMatchSummary(state: GameState): MatchSummary {
  const teamScores = getTeamScores(state);
  const [blue, red] = teamScores;
  const winnerTeamId =
    blue && red ? (blue.total === red.total ? "tie" : blue.total > red.total ? blue.teamId : red.teamId) : "tie";
  const mvp = findMvp(state);
  const biggestBetrayal = [...state.revealLog].reverse().find((event) => event.tone === "betrayal")?.text;
  const mostSuspicious = [...state.players].sort((left, right) => right.suspicion - left.suspicion)[0];
  const title = chooseTitle(state, winnerTeamId);
  const caseFile = buildCaseFile({
    state,
    winnerTeamId,
    mvp,
    mostSuspicious,
    biggestBetrayal,
    title,
    teamScores
  });

  return {
    winnerTeamId,
    teamScores,
    mvpPlayerId: mvp?.id,
    biggestBetrayal,
    mostSuspiciousPlayerId: mostSuspicious?.id,
    title,
    caseFile
  };
}

function findMvp(state: GameState): PlayerState | undefined {
  return [...state.players].sort((left, right) => playerContribution(state, right) - playerContribution(state, left))[0];
}

function playerContribution(state: GameState, player: PlayerState): number {
  const loot = state.artifacts
    .filter((artifact) => artifact.takenBy === player.id)
    .reduce((total, artifact) => total + artifact.value, 0);
  const escape = player.status === "escaped" ? 2 : 0;
  const caught = player.status === "caught" ? -1 : 0;
  return loot + escape + caught - player.suspicion * 0.1;
}

function chooseTitle(state: GameState, winnerTeamId: MatchSummary["winnerTeamId"]): string {
  const betrayalCount = state.revealLog.filter((event) => event.tone === "betrayal").length;
  if (winnerTeamId === "tie") return "Moonlit Standoff";
  if (betrayalCount > 0) return "Profitable Chaos";
  if (state.alarm >= 5) return "Elegant Disaster";
  return "Perfect Alibi";
}

function buildCaseFile(input: {
  state: GameState;
  winnerTeamId: MatchSummary["winnerTeamId"];
  mvp?: PlayerState;
  mostSuspicious?: PlayerState;
  biggestBetrayal?: string;
  title: string;
  teamScores: TeamScore[];
}): string {
  const winnerName = input.winnerTeamId === "tie" ? "Tie" : TEAM_NAMES[input.winnerTeamId];
  const scoreLine = input.teamScores
    .map((score) => `${TEAM_NAMES[score.teamId]} ${score.total}`)
    .join(" | ");

  return [
    "AGENT ALIBI CASE FILE",
    "",
    `Winner: ${winnerName}`,
    `MVP: ${input.mvp?.name ?? "No one"}`,
    `Most Suspicious: ${input.mostSuspicious?.name ?? "No one"}`,
    `Biggest Betrayal: ${input.biggestBetrayal ?? "No betrayal recorded"}`,
    `Final Title: ${input.title}`,
    `Score: ${scoreLine}`,
    "",
    finalQuote(input.state, input.mvp)
  ].join("\n");
}

function finalQuote(state: GameState, mvp?: PlayerState): string {
  const bestArtifact = state.artifacts.find((artifact) => artifact.takenBy === mvp?.id);
  if (mvp && bestArtifact) {
    return `"${mvp.name} walked away with the ${bestArtifact.name} while the vault sang accusations."`;
  }
  return "\"The vault closed, the alibis held, and nobody agreed on what happened.\"";
}
