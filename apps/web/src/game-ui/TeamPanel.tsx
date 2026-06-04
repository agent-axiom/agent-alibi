import type { GameState } from "@agent-alibi/shared";
import { getTeamScores } from "@agent-alibi/game";

type TeamPanelProps = {
  state: GameState;
};

const TEAM_LABELS = {
  blue: "Blue Crew",
  red: "Red Crew"
} as const;

export function TeamPanel({ state }: TeamPanelProps) {
  const scores = getTeamScores(state);
  return (
    <section className="panel team-panel" aria-label="Teams">
      <div className="panel-heading">
        <h2>Crews</h2>
      </div>
      <div className="crew-grid">
        {scores.map((score) => (
          <div className={`crew ${score.teamId}`} key={score.teamId}>
            <span>{TEAM_LABELS[score.teamId]}</span>
            <strong>{score.total}</strong>
            <small>Loot {score.loot} · Escape {score.escape} · Penalty {score.penalties}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
