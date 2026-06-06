import { Copy, Home, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { MatchSummary } from "@agent-alibi/shared";

type FinalCaseFileProps = {
  summary: MatchSummary;
  onRematch: () => void;
  onHome: () => void;
};

export function FinalCaseFile({ summary, onRematch, onHome }: FinalCaseFileProps) {
  const [copied, setCopied] = useState(false);
  const blueScore = summary.teamScores.find((score) => score.teamId === "blue");
  const redScore = summary.teamScores.find((score) => score.teamId === "red");
  const winner = summary.winnerTeamId === "tie" ? "Tie" : summary.winnerTeamId === "blue" ? "Blue Crew" : "Red Crew";

  async function copyResult() {
    await navigator.clipboard?.writeText(summary.caseFile).catch(() => undefined);
    setCopied(true);
  }

  return (
    <main className="final-shell">
      <section className="case-file">
        <p className="eyebrow">Final Case File</p>
        <h1>{summary.title}</h1>
        <section className="final-scoreboard" aria-label="Final scores">
          <div className="final-score">
            <span>Winner</span>
            <strong>{winner}</strong>
          </div>
          {summary.runRating ? (
            <div className="final-score final-rating">
              <span>Run Rating</span>
              <strong>{summary.runRating}</strong>
              <small>{summary.styleBonus ? `Clean exit bonus +${summary.styleBonus}` : "No clean bonus"}</small>
            </div>
          ) : null}
          {summary.lootChain && summary.lootChain > 1 ? (
            <div className="final-score final-chain">
              <span>Loot Chain</span>
              <strong>x{summary.lootChain}</strong>
              <small>{summary.greedRoute === "successful" ? "Greed route successful" : "Main route only"}</small>
            </div>
          ) : null}
          {summary.stolenRelicNames && summary.stolenRelicNames.length > 0 ? (
            <div className="final-score final-relics">
              <span>Relics Stolen</span>
              <strong>{summary.stolenRelicNames.length}</strong>
              <small>{summary.stolenRelicNames.join(" + ")}</small>
            </div>
          ) : null}
          {summary.rivalRelicNames && summary.rivalRelicNames.length > 0 ? (
            <div className="final-score final-rival-relics">
              <span>Rival Relics</span>
              <strong>{summary.rivalRelicNames.length}</strong>
              <small>{summary.rivalRelicNames.join(" + ")}</small>
            </div>
          ) : null}
          {summary.alibiPulsesUsed && summary.alibiPulsesUsed > 0 ? (
            <div className="final-score final-alibi">
              <span>Alibi Pulses</span>
              <strong>x{summary.alibiPulsesUsed}</strong>
              <small>Scanner jams</small>
            </div>
          ) : null}
          {summary.scanBurns && summary.scanBurns > 0 ? (
            <div className="final-score final-burn">
              <span>Scan Burns</span>
              <strong>x{summary.scanBurns}</strong>
              <small>Alarm spikes</small>
            </div>
          ) : null}
          <div className="final-score">
            <span>Blue Crew</span>
            <strong>{blueScore?.total ?? 0}</strong>
            <small>{blueScore?.loot ?? 0} loot · {blueScore?.escape ?? 0} escape</small>
          </div>
          <div className="final-score">
            <span>Red Crew</span>
            <strong>{redScore?.total ?? 0}</strong>
            <small>{redScore?.loot ?? 0} rival loot</small>
          </div>
        </section>
        <pre>{summary.caseFile}</pre>
        <div className="final-actions">
          <button onClick={copyResult}>
            <Copy aria-hidden="true" size={18} />
            {copied ? "Copied" : "Copy Result"}
          </button>
          <button onClick={onRematch}>
            <RotateCcw aria-hidden="true" size={18} />
            Rematch
          </button>
          <button onClick={onHome}>
            <Home aria-hidden="true" size={18} />
            Home
          </button>
        </div>
      </section>
    </main>
  );
}
