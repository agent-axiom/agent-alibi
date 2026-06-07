import { Copy, Home, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import type { MatchSummary, TeamScore } from "@agent-alibi/shared";

type FinalCaseFileProps = {
  summary: MatchSummary;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onRematch: () => void;
  onHome: () => void;
};

export type NextRunContract = {
  label: string;
  title: string;
  detail: string;
};

export const LOCAL_BEST_CASE_STORAGE_KEY = "agent-alibi:best-case:v1";

export type LocalBestCaseRecord = {
  version: 1;
  at: number;
  score: number;
  title: string;
  runRating: string;
  lootChain: number;
  relicCount: number;
};

export type LocalBestCaseStatus = {
  current: LocalBestCaseRecord;
  previous: LocalBestCaseRecord | null;
  best: LocalBestCaseRecord;
  isNewBest: boolean;
  title: string;
  detail: string;
  delta: string;
};

export function FinalCaseFile({ summary, soundEnabled = false, onToggleSound, onRematch, onHome }: FinalCaseFileProps) {
  const [copied, setCopied] = useState(false);
  const [bestCase] = useState(() => buildLocalBestCaseStatus(summary, readLocalBestCaseRecord()));
  const blueScore = summary.teamScores.find((score) => score.teamId === "blue");
  const redScore = summary.teamScores.find((score) => score.teamId === "red");
  const winner = summary.winnerTeamId === "tie" ? "Tie" : summary.winnerTeamId === "blue" ? "Blue Crew" : "Red Crew";
  const escapeBonus = blueScore?.escape ?? 0;
  const finalPopupDetail =
    (blueScore?.loot ?? 0) > 0
      ? `Cashout ${(blueScore?.loot ?? 0) + escapeBonus}${summary.afterburnerExitBonus ? ` · Afterburner +${summary.afterburnerExitBonus}` : ""}`
      : "No relics banked";
  const rematchHook = buildRematchHook(summary);
  const nextRunContracts = buildNextRunContracts(summary);
  const scoreMargin = buildScoreMarginLabel(summary.teamScores);
  const caseStamp = buildCaseStamp(summary);

  useEffect(() => {
    if (bestCase.isNewBest) {
      writeLocalBestCaseRecord(bestCase.current);
    }
  }, [bestCase]);

  async function copyResult() {
    await navigator.clipboard?.writeText(buildCaseShareText(summary)).catch(() => undefined);
    setCopied(true);
  }

  return (
    <main className="final-shell">
      {escapeBonus > 0 ? (
        <div className="arcade-score-popup bonus final-score-popup" aria-label="Score popup" aria-live="polite">
          <strong>+{escapeBonus} Escape bonus</strong>
          <span>{finalPopupDetail}</span>
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
        <section className={`local-best-case ${bestCase.isNewBest ? "new" : "stored"}`} aria-label="Local best case">
          <span>{bestCase.title}</span>
          <strong>{bestCase.detail}</strong>
          <small>{bestCase.delta}</small>
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
          {summary.afterburnerExitBonus && summary.afterburnerExitBonus > 0 ? (
            <div className="final-score final-afterburner">
              <span>Afterburner Exit</span>
              <strong>+{summary.afterburnerExitBonus}</strong>
              <small>Boost cashout</small>
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
        <section className="next-run-contracts" aria-label="Next run contracts">
          {nextRunContracts.map((contract) => (
            <div className="next-run-contract" key={`${contract.label}-${contract.title}`}>
              <span>{contract.label}</span>
              <strong>{contract.title}</strong>
              <small>{contract.detail}</small>
            </div>
          ))}
        </section>
        <pre>{summary.caseFile}</pre>
        <div className="final-actions">
          <button className="final-run-it-back" onClick={onRematch}>
            <RotateCcw aria-hidden="true" size={20} />
            <span>Run It Back</span>
            <small>{nextRunContracts[0]?.title ?? "New contract"}</small>
          </button>
          <button onClick={copyResult}>
            <Copy aria-hidden="true" size={18} />
            {copied ? "Copied" : "Copy Result"}
          </button>
          {onToggleSound ? (
            <button onClick={onToggleSound} aria-label={soundEnabled ? "Sound On" : "Sound Off"} title={soundEnabled ? "Sound On" : "Sound Off"}>
              {soundEnabled ? <Volume2 aria-hidden="true" size={18} /> : <VolumeX aria-hidden="true" size={18} />}
              {soundEnabled ? "Sound On" : "Sound Off"}
            </button>
          ) : null}
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

  if ((blueScore?.escape ?? 0) > 0 && (blueScore?.loot ?? 0) <= 0) {
    return "Next run: steal one relic before you call the lift.";
  }

  if (summary.runRating && summary.runRating !== "S-Rank") {
    return "Next run: chase S-Rank with a faster, lower-alarm cashout.";
  }

  if ((summary.lootChain ?? 1) <= 1) {
    return "Next run: press G after the first relic to push the loot chain.";
  }

  return "Next run: run it back and make the case file louder.";
}

export function buildLocalBestCaseRecord(summary: MatchSummary, at = Date.now()): LocalBestCaseRecord {
  const blueScore = summary.teamScores.find((score) => score.teamId === "blue");
  return {
    version: 1,
    at,
    score: blueScore?.total ?? 0,
    title: summary.title,
    runRating: summary.runRating ?? "Unrated",
    lootChain: summary.lootChain ?? 1,
    relicCount: summary.stolenRelicNames?.length ?? 0
  };
}

export function buildLocalBestCaseStatus(summary: MatchSummary, previous: LocalBestCaseRecord | null, at = Date.now()): LocalBestCaseStatus {
  const current = buildLocalBestCaseRecord(summary, at);
  const isNewBest = !previous || compareLocalBestCaseRecords(current, previous) >= 0;
  const best = isNewBest ? current : previous;

  return {
    current,
    previous,
    best,
    isNewBest,
    title: isNewBest ? "New best case" : "Best case to beat",
    detail: isNewBest ? formatLocalBestCaseDetail(current) : `Best ${previous.score} · current ${current.score}`,
    delta: buildLocalBestDelta(current, previous, isNewBest)
  };
}

export function parseLocalBestCaseRecord(raw: string | null): LocalBestCaseRecord | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isLocalBestCaseRecord(value)) return null;
    return value;
  } catch {
    return null;
  }
}

function readLocalBestCaseRecord(): LocalBestCaseRecord | null {
  if (typeof window === "undefined") return null;
  try {
    return parseLocalBestCaseRecord(window.localStorage.getItem(LOCAL_BEST_CASE_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeLocalBestCaseRecord(record: LocalBestCaseRecord) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_BEST_CASE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore blocked storage; the final case file remains playable without persistence.
  }
}

function isLocalBestCaseRecord(value: unknown): value is LocalBestCaseRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    typeof record.at === "number" &&
    typeof record.score === "number" &&
    typeof record.title === "string" &&
    typeof record.runRating === "string" &&
    typeof record.lootChain === "number" &&
    typeof record.relicCount === "number"
  );
}

function compareLocalBestCaseRecords(left: LocalBestCaseRecord, right: LocalBestCaseRecord): number {
  const scoreDelta = left.score - right.score;
  if (scoreDelta !== 0) return scoreDelta;

  const ratingDelta = localBestRatingValue(left.runRating) - localBestRatingValue(right.runRating);
  if (ratingDelta !== 0) return ratingDelta;

  const chainDelta = left.lootChain - right.lootChain;
  if (chainDelta !== 0) return chainDelta;

  return left.relicCount - right.relicCount;
}

function localBestRatingValue(rating: string): number {
  if (rating === "S-Rank") return 4;
  if (rating === "A-Rank") return 3;
  if (rating === "B-Rank") return 2;
  if (rating === "C-Rank") return 1;
  return 0;
}

function formatLocalBestCaseDetail(record: LocalBestCaseRecord): string {
  return `Score ${record.score} · ${record.runRating} · chain x${record.lootChain}`;
}

function buildLocalBestDelta(current: LocalBestCaseRecord, previous: LocalBestCaseRecord | null, isNewBest: boolean): string {
  if (!previous) return "First record saved";
  if (isNewBest) return `+${Math.max(0, current.score - previous.score)} over previous`;
  return `${previous.score - current.score + 1} points to beat`;
}

export function buildNextRunContracts(summary: MatchSummary): NextRunContract[] {
  const blueScore = summary.teamScores.find((score) => score.teamId === "blue");
  const redScore = summary.teamScores.find((score) => score.teamId === "red");
  const redWon = summary.winnerTeamId === "red" || (redScore?.total ?? 0) > (blueScore?.total ?? 0);
  const emptyEscape = (blueScore?.escape ?? 0) > 0 && (blueScore?.loot ?? 0) <= 0;
  const redHasRelics = (summary.rivalRelicNames?.length ?? 0) > 0 || (summary.pendingRivalRelicNames?.length ?? 0) > 0;

  if (redWon || redHasRelics) {
    return [
      {
        label: "Carrier hunt",
        title: "Deny Red loot",
        detail: "Intercept the carrier before the Atrium Lift."
      },
      {
        label: "Tempo",
        title: "Score first",
        detail: "Steal Moon Pearl before rival routes wake."
      },
      {
        label: "Cashout",
        title: "Bank the swing",
        detail: "Escape with recovered loot before lockdown."
      }
    ];
  }

  if (emptyEscape) {
    return [
      {
        label: "Relic first",
        title: "Steal before lift",
        detail: "Grab Moon Pearl before calling the escape."
      },
      {
        label: "Value",
        title: "Bank one relic",
        detail: "Turn the escape bonus into a real cashout."
      },
      {
        label: "Route",
        title: "Follow gold",
        detail: "Use the target beam until the first score lands."
      }
    ];
  }

  if (summary.runRating === "S-Rank" && summary.greedRoute === "successful" && (summary.lootChain ?? 1) > 1) {
    return [
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
    ];
  }

  if (summary.runRating && summary.runRating !== "S-Rank") {
    return [
      {
        label: "Rank push",
        title: "Chase S-Rank",
        detail: "Cashout faster and keep the alarm low."
      },
      {
        label: "Clean exit",
        title: "Avoid scan burns",
        detail: "Use alibi pulse before the meter spikes."
      },
      {
        label: "Risk",
        title: "Try greed route",
        detail: "Press G after Moon Pearl for a louder case."
      }
    ];
  }

  return [
    {
      label: "Tempo",
      title: "Score first",
      detail: "Turn the opening route into immediate loot."
    },
    {
      label: "Cashout",
      title: "Run to lift",
      detail: "Bank the relic before Red finds an angle."
    },
    {
      label: "Style",
      title: "Make it louder",
      detail: "Chain one more relic or deny a carrier."
    }
  ];
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
  const baseQuote = summary.highlightLines?.[0] ?? buildRematchHook(summary);
  const quote =
    summary.afterburnerExitBonus && summary.afterburnerExitBonus > 0
      ? `Afterburner cashout +${summary.afterburnerExitBonus}${baseQuote ? ` · ${baseQuote}` : ""}`
      : baseQuote;

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
    quote
  };
}

export function buildScoreMarginLabel(teamScores: TeamScore[]): string {
  const blueTotal = teamScores.find((score) => score.teamId === "blue")?.total ?? 0;
  const redTotal = teamScores.find((score) => score.teamId === "red")?.total ?? 0;
  const margin = Math.abs(blueTotal - redTotal);

  if (margin === 0) return "Tie game";
  return blueTotal > redTotal ? `Blue by ${margin}` : `Red by ${margin}`;
}
