import { Copy, Home, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { MatchSummary, TeamScore } from "@agent-alibi/shared";

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
  const escapeBonus = blueScore?.escape ?? 0;
  const rematchHook = buildRematchHook(summary);
  const scoreMargin = buildScoreMarginLabel(summary.teamScores);
  const caseStamp = buildCaseStamp(summary);

  async function copyResult() {
    await navigator.clipboard?.writeText(buildCaseShareText(summary)).catch(() => undefined);
    setCopied(true);
  }

  return (
    <main className="final-shell">
      {escapeBonus > 0 ? (
        <div className="arcade-score-popup bonus final-score-popup" aria-label="Score popup" aria-live="polite">
          <strong>+{escapeBonus} Escape bonus</strong>
          <span>Cashout {(blueScore?.loot ?? 0) + escapeBonus}</span>
        </div>
      ) : null}
      <section className="case-file">
        <p className="eyebrow">Final Case File</p>
        <h1>{summary.title}</h1>
        <section className="case-stamp" aria-label="Share case stamp">
          <span>{caseStamp.kicker}</span>
          <strong>{caseStamp.title}</strong>
          <small>{caseStamp.result}</small>
          <p>{caseStamp.quote}</p>
        </section>
        <section className="final-scoreboard" aria-label="Final scores">
          <div className="final-score">
            <span>Winner</span>
            <strong>{winner}</strong>
          </div>
          <div className="final-score final-margin">
            <span>Score Margin</span>
            <strong>{scoreMargin}</strong>
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
          {summary.pendingRivalRelicNames && summary.pendingRivalRelicNames.length > 0 ? (
            <div className="final-score final-pending-rival-relics">
              <span>Pending Carrier Loot</span>
              <strong>{summary.pendingRivalRelicNames.length}</strong>
              <small>{summary.pendingRivalRelicNames.join(" + ")}</small>
            </div>
          ) : null}
          {summary.alibiPulsesUsed && summary.alibiPulsesUsed > 0 ? (
            <div className="final-score final-alibi">
              <span>Alibi Pulses</span>
              <strong>x{summary.alibiPulsesUsed}</strong>
              <small>Scanner jams</small>
            </div>
          ) : null}
          {summary.carrierIntercepts && summary.carrierIntercepts > 0 ? (
            <div className="final-score final-intercepts">
              <span>Carrier Intercepts</span>
              <strong>x{summary.carrierIntercepts}</strong>
              <small>{summary.interceptedRelicNames?.length ? summary.interceptedRelicNames.join(" + ") : "Recovered loot"}</small>
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
        {summary.highlightLines && summary.highlightLines.length > 0 ? (
          <section className="case-highlights" aria-label="Case highlights">
            {summary.highlightLines.map((line, index) => (
              <div className="case-highlight" key={`${line}-${index}`}>
                <span>0{index + 1}</span>
                <strong>{line}</strong>
              </div>
            ))}
          </section>
        ) : null}
        <section className="rematch-hook" aria-label="Rematch hook">
          <strong>{rematchHook}</strong>
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

export function buildRematchHook(summary: MatchSummary): string {
  const blueScore = summary.teamScores.find((score) => score.teamId === "blue");
  const redScore = summary.teamScores.find((score) => score.teamId === "red");
  const redWon = summary.winnerTeamId === "red" || (redScore?.total ?? 0) > (blueScore?.total ?? 0);

  if (redWon || (summary.rivalRelicNames?.length ?? 0) > 0) {
    return "Next run: deny the carrier before Red reaches the Atrium Lift.";
  }

  if (summary.runRating && summary.runRating !== "S-Rank") {
    return "Next run: chase S-Rank with a faster, lower-alarm cashout.";
  }

  if ((summary.lootChain ?? 1) <= 1) {
    return "Next run: press G after the first relic to push the loot chain.";
  }

  return "Next run: run it back and make the case file louder.";
}

export function buildCaseShareText(summary: MatchSummary): string {
  const lines = [summary.caseFile];

  if (summary.highlightLines?.length) {
    lines.push(
      "",
      "CASE HIGHLIGHTS",
      ...summary.highlightLines.map((line, index) => `${String(index + 1).padStart(2, "0")}. ${line}`)
    );
  }

  lines.push("", "NEXT RUN", buildRematchHook(summary));
  return lines.join("\n");
}

export function buildCaseStamp(summary: MatchSummary) {
  const winner = summary.winnerTeamId === "tie" ? "Tie run" : summary.winnerTeamId === "blue" ? "Blue Crew wins" : "Red Crew wins";
  const resultParts = [winner];

  if (summary.runRating) {
    resultParts.push(summary.runRating);
  }

  if (summary.lootChain && summary.lootChain > 1) {
    resultParts.push(`Loot chain x${summary.lootChain}`);
  }

  return {
    kicker: "Agent Alibi Case File",
    title: summary.title,
    result: resultParts.join(" · "),
    quote: summary.highlightLines?.[0] ?? buildRematchHook(summary)
  };
}

export function buildScoreMarginLabel(teamScores: TeamScore[]): string {
  const blueTotal = teamScores.find((score) => score.teamId === "blue")?.total ?? 0;
  const redTotal = teamScores.find((score) => score.teamId === "red")?.total ?? 0;
  const margin = Math.abs(blueTotal - redTotal);

  if (margin === 0) return "Tie game";
  return blueTotal > redTotal ? `Blue by ${margin}` : `Red by ${margin}`;
}
