import { Copy, Home, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import type { MatchSummary, TeamScore } from "@agent-alibi/shared";
import type { Locale } from "../i18n";
import { localizeText, t } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";

type FinalCaseFileProps = {
  summary: MatchSummary;
  soundEnabled?: boolean;
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
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
export const PUBLIC_PLAY_URL = "https://agent-axiom.github.io/agent-alibi/";

export type LocalBestCaseRecord = {
  version: 1;
  at: number;
  score: number;
  title: string;
  runRating: string;
  lootChain: number;
  relicCount: number;
  afterburnerExitBonus?: number;
  lockBreakCashoutBonus?: number;
  carrierIntercepts?: number;
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

export function FinalCaseFile({ summary, soundEnabled = false, locale = "en", onLocaleChange, onToggleSound, onRematch, onHome }: FinalCaseFileProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "blocked">("idle");
  const [bestCaseSeed] = useState(() => ({ previous: readLocalBestCaseRecord(), at: Date.now() }));
  const bestCase = buildLocalBestCaseStatus(summary, bestCaseSeed.previous, bestCaseSeed.at, locale);
  const blueScore = summary.teamScores.find((score) => score.teamId === "blue");
  const redScore = summary.teamScores.find((score) => score.teamId === "red");
  const winner = teamResultLabel(locale, summary.winnerTeamId);
  const escapeBonus = blueScore?.escape ?? 0;
  const finalPopupDetail =
    (blueScore?.loot ?? 0) > 0
      ? t(locale, "final.cashoutDetail", {
          cashout: (blueScore?.loot ?? 0) + escapeBonus,
          boost: summary.afterburnerExitBonus ? t(locale, "final.afterburnerDetail", { boost: summary.afterburnerExitBonus }) : ""
        })
      : t(locale, "final.noRelics");
  const rematchHook = buildRematchHook(summary, locale);
  const nextRunContracts = buildNextRunContracts(summary, locale);
  const scoreMargin = buildScoreMarginLabel(summary.teamScores, locale);
  const caseStamp = buildCaseStamp(summary, locale);
  const interceptedRelicLine = summary.interceptedRelicNames?.length
    ? t(locale, "final.redDenied", { relics: relicList(summary.interceptedRelicNames, locale) })
    : t(locale, "final.redDeniedRecovered");
  const afterburnerFinish = Boolean(summary.afterburnerExitBonus && summary.afterburnerExitBonus > 0);
  const shareText = buildCaseShareText(summary, locale);

  useEffect(() => {
    if (bestCase.isNewBest) {
      writeLocalBestCaseRecord(bestCase.current);
    }
  }, [bestCase]);

  async function copyResult() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shareText);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("blocked");
    }
  }

  return (
    <main className={`final-shell ${afterburnerFinish ? "afterburner-finish" : ""}`}>
      {escapeBonus > 0 ? (
        <div className="arcade-score-popup bonus final-score-popup" aria-label={t(locale, "final.scorePopup")} aria-live="polite">
          <strong>{t(locale, "final.escapeBonus", { escape: escapeBonus })}</strong>
          <span>{finalPopupDetail}</span>
        </div>
      ) : null}
      <section className="case-file">
        <p className="eyebrow">{t(locale, "final.eyebrow")}</p>
        <h1>{summary.title}</h1>
        <section className="case-stamp" aria-label={t(locale, "final.shareCaseStamp")}>
          <span>{caseStamp.kicker}</span>
          <strong>{caseStamp.title}</strong>
          <small>{caseStamp.result}</small>
          <p>{caseStamp.quote}</p>
        </section>
        <section className={`local-best-case ${bestCase.isNewBest ? "new" : "stored"}`} aria-label={t(locale, "final.localBestCase")}>
          <span>{bestCase.title}</span>
          <strong>{bestCase.detail}</strong>
          <small>{bestCase.delta}</small>
        </section>
        <section className="final-scoreboard" aria-label={t(locale, "final.finalScores")}>
          <div className="final-score">
            <span>{t(locale, "final.winner")}</span>
            <strong>{winner}</strong>
          </div>
          <div className="final-score final-margin">
            <span>{t(locale, "final.scoreMargin")}</span>
            <strong>{scoreMargin}</strong>
          </div>
          {summary.runRating ? (
            <div className="final-score final-rating">
              <span>{t(locale, "final.runRating")}</span>
              <strong>{summary.runRating}</strong>
              <small>{summary.styleBonus ? t(locale, "final.cleanExitBonus", { bonus: summary.styleBonus }) : t(locale, "final.noCleanBonus")}</small>
            </div>
          ) : null}
          {summary.afterburnerExitBonus && summary.afterburnerExitBonus > 0 ? (
            <div className="final-score final-afterburner">
              <span>{t(locale, "final.afterburnerExit")}</span>
              <strong>+{summary.afterburnerExitBonus}</strong>
              <small>{t(locale, "final.boostCashout")}</small>
            </div>
          ) : null}
          {summary.lockBreakCashoutBonus && summary.lockBreakCashoutBonus > 0 ? (
            <div className="final-score final-breakout">
              <span>{t(locale, "final.breakoutCashout")}</span>
              <strong>+{summary.lockBreakCashoutBonus}</strong>
              <small>{t(locale, "final.rookLockBroken")}</small>
            </div>
          ) : null}
          {summary.comebackRoutesArmed && summary.comebackRoutesArmed > 0 ? (
            <div className="final-score final-comeback">
              <span>{t(locale, "final.comebackCashout")}</span>
              <strong>x{summary.comebackRoutesArmed}</strong>
              <small>{t(locale, "final.beatRedBehind")}</small>
            </div>
          ) : null}
          {summary.lootChain && summary.lootChain > 1 ? (
            <div className="final-score final-chain">
              <span>{t(locale, "final.lootChain")}</span>
              <strong>x{summary.lootChain}</strong>
              <small>{summary.greedRoute === "successful" ? t(locale, "final.greedSuccessful") : t(locale, "final.mainRouteOnly")}</small>
            </div>
          ) : null}
          {summary.stolenRelicNames && summary.stolenRelicNames.length > 0 ? (
            <div className="final-score final-relics">
              <span>{t(locale, "final.relicsStolen")}</span>
              <strong>{summary.stolenRelicNames.length}</strong>
              <small>{relicList(summary.stolenRelicNames, locale)}</small>
            </div>
          ) : null}
          {summary.rivalRelicNames && summary.rivalRelicNames.length > 0 ? (
            <div className="final-score final-rival-relics">
              <span>{t(locale, "final.rivalRelics")}</span>
              <strong>{summary.rivalRelicNames.length}</strong>
              <small>{relicList(summary.rivalRelicNames, locale)}</small>
            </div>
          ) : null}
          {summary.pendingRivalRelicNames && summary.pendingRivalRelicNames.length > 0 ? (
            <div className="final-score final-pending-rival-relics">
              <span>{t(locale, "final.pendingCarrierLoot")}</span>
              <strong>{summary.pendingRivalRelicNames.length}</strong>
              <small>{relicList(summary.pendingRivalRelicNames, locale)}</small>
            </div>
          ) : null}
          {summary.alibiPulsesUsed && summary.alibiPulsesUsed > 0 ? (
            <div className="final-score final-alibi">
              <span>{t(locale, "final.alibiPulses")}</span>
              <strong>x{summary.alibiPulsesUsed}</strong>
              <small>{t(locale, "final.scannerJams")}</small>
            </div>
          ) : null}
          {summary.carrierIntercepts && summary.carrierIntercepts > 0 ? (
            <div className="final-score final-intercepts">
              <span>{t(locale, "final.carrierIntercepts")}</span>
              <strong>x{summary.carrierIntercepts}</strong>
              <small>{interceptedRelicLine}</small>
            </div>
          ) : null}
          {summary.ambushNearMisses && summary.ambushNearMisses > 0 ? (
            <div className="final-score final-ambush">
              <span>{t(locale, "final.ambushDodges")}</span>
              <strong>x{summary.ambushNearMisses}</strong>
              <small>{t(locale, "final.rivalAmbushDashed")}</small>
            </div>
          ) : null}
          {summary.scanBurns && summary.scanBurns > 0 ? (
            <div className="final-score final-burn">
              <span>{t(locale, "final.scanBurns")}</span>
              <strong>x{summary.scanBurns}</strong>
              <small>{t(locale, "final.alarmSpikes")}</small>
            </div>
          ) : null}
          <div className="final-score">
            <span>{t(locale, "final.blueCrew")}</span>
            <strong>{blueScore?.total ?? 0}</strong>
            <small>{t(locale, "final.blueScoreDetail", { loot: blueScore?.loot ?? 0, escape: blueScore?.escape ?? 0 })}</small>
          </div>
          <div className="final-score">
            <span>{t(locale, "final.redCrew")}</span>
            <strong>{redScore?.total ?? 0}</strong>
            <small>{t(locale, "final.redScoreDetail", { loot: redScore?.loot ?? 0 })}</small>
          </div>
        </section>
        {summary.highlightLines && summary.highlightLines.length > 0 ? (
          <section className="case-highlights" aria-label={t(locale, "final.caseHighlights")}>
            {summary.highlightLines.map((line, index) => (
              <div className="case-highlight" key={`${line}-${index}`}>
                <span>0{index + 1}</span>
                <strong>{localizeText(locale, line)}</strong>
              </div>
            ))}
          </section>
        ) : null}
        <section className="rematch-hook" aria-label={t(locale, "final.rematchHook")}>
          <strong>{rematchHook}</strong>
        </section>
        <section className="next-run-contracts" aria-label={t(locale, "final.nextRunContracts")}>
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
            <span>{t(locale, "final.runItBack")}</span>
            <small>{nextRunContracts[0]?.title ?? t(locale, "final.newContract")}</small>
          </button>
          <button onClick={copyResult}>
            <Copy aria-hidden="true" size={18} />
            {copyStatus === "copied" ? t(locale, "final.copied") : copyStatus === "blocked" ? t(locale, "final.copyBlocked") : t(locale, "final.copyResult")}
          </button>
          {onToggleSound ? (
            <button onClick={onToggleSound} aria-label={soundEnabled ? t(locale, "sound.on") : t(locale, "sound.off")} title={soundEnabled ? t(locale, "sound.on") : t(locale, "sound.off")}>
              {soundEnabled ? <Volume2 aria-hidden="true" size={18} /> : <VolumeX aria-hidden="true" size={18} />}
              {soundEnabled ? t(locale, "sound.on") : t(locale, "sound.off")}
            </button>
          ) : null}
          {onLocaleChange ? <LanguageToggle locale={locale} onLocaleChange={onLocaleChange} /> : null}
          <button onClick={onHome}>
            <Home aria-hidden="true" size={18} />
            {t(locale, "final.home")}
          </button>
        </div>
        {copyStatus === "blocked" ? (
          <section className="final-copy-fallback" aria-label={t(locale, "final.manualShareFallback")}>
            <strong>{t(locale, "final.clipboardBlocked")}</strong>
            <small>{t(locale, "final.manualCopy")}</small>
            <textarea aria-label={t(locale, "final.manualCaseFileText")} readOnly value={shareText} />
          </section>
        ) : null}
      </section>
    </main>
  );
}

function teamResultLabel(locale: Locale, winnerTeamId: MatchSummary["winnerTeamId"]): string {
  if (winnerTeamId === "tie") return t(locale, "final.tie");
  if (winnerTeamId === "blue") return t(locale, "final.blueCrew");
  return t(locale, "final.redCrew");
}

function winningRunLabel(locale: Locale, winnerTeamId: MatchSummary["winnerTeamId"]): string {
  if (winnerTeamId === "tie") return t(locale, "final.tieRun");
  if (winnerTeamId === "blue") return t(locale, "final.blueCrewWins");
  return t(locale, "final.redCrewWins");
}

function relicList(names: string[] | undefined, locale: Locale): string {
  return (names ?? []).map((name) => localizeText(locale, name)).join(" + ");
}

export function buildRematchHook(summary: MatchSummary, locale: Locale = "en"): string {
  const blueScore = summary.teamScores.find((score) => score.teamId === "blue");
  const redScore = summary.teamScores.find((score) => score.teamId === "red");
  const redWon = summary.winnerTeamId === "red" || (redScore?.total ?? 0) > (blueScore?.total ?? 0);

  if (redWon || (summary.rivalRelicNames?.length ?? 0) > 0) {
    return t(locale, "rematch.redWon");
  }

  if (summary.carrierIntercepts && summary.carrierIntercepts > 0) {
    return t(locale, "rematch.carrierIntercept");
  }

  if ((blueScore?.escape ?? 0) > 0 && (blueScore?.loot ?? 0) <= 0) {
    return t(locale, "rematch.emptyEscape");
  }

  if (summary.lockBreakCashoutBonus && summary.lockBreakCashoutBonus > 0) {
    return t(locale, "rematch.lockBreak");
  }

  if (summary.afterburnerExitBonus && summary.afterburnerExitBonus > 0) {
    return t(locale, "rematch.afterburner");
  }

  if (summary.runRating && summary.runRating !== "S-Rank") {
    return t(locale, "rematch.rank");
  }

  if ((summary.lootChain ?? 1) <= 1) {
    return t(locale, "rematch.chain");
  }

  return t(locale, "rematch.default");
}

export function buildLocalBestCaseRecord(summary: MatchSummary, at = Date.now()): LocalBestCaseRecord {
  const blueScore = summary.teamScores.find((score) => score.teamId === "blue");
  const afterburnerExitBonus = summary.afterburnerExitBonus && summary.afterburnerExitBonus > 0 ? summary.afterburnerExitBonus : undefined;
  const lockBreakCashoutBonus = summary.lockBreakCashoutBonus && summary.lockBreakCashoutBonus > 0 ? summary.lockBreakCashoutBonus : undefined;
  const carrierIntercepts = summary.carrierIntercepts && summary.carrierIntercepts > 0 ? summary.carrierIntercepts : undefined;
  return {
    version: 1,
    at,
    score: blueScore?.total ?? 0,
    title: summary.title,
    runRating: summary.runRating ?? "Unrated",
    lootChain: summary.lootChain ?? 1,
    relicCount: summary.stolenRelicNames?.length ?? 0,
    ...(afterburnerExitBonus ? { afterburnerExitBonus } : {}),
    ...(lockBreakCashoutBonus ? { lockBreakCashoutBonus } : {}),
    ...(carrierIntercepts ? { carrierIntercepts } : {})
  };
}

export function buildLocalBestCaseStatus(summary: MatchSummary, previous: LocalBestCaseRecord | null, at = Date.now(), locale: Locale = "en"): LocalBestCaseStatus {
  const current = buildLocalBestCaseRecord(summary, at);
  const isNewBest = !previous || compareLocalBestCaseRecords(current, previous) >= 0;
  const best = isNewBest ? current : previous;

  return {
    current,
    previous,
    best,
    isNewBest,
    title: isNewBest ? t(locale, "best.newBest") : t(locale, "best.toBeat"),
    detail: isNewBest ? formatLocalBestCaseDetail(current, locale) : t(locale, "best.bestCurrent", { best: previous.score, current: current.score }),
    delta: buildLocalBestDelta(current, previous, isNewBest, locale)
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
    typeof record.relicCount === "number" &&
    (record.afterburnerExitBonus === undefined || typeof record.afterburnerExitBonus === "number") &&
    (record.lockBreakCashoutBonus === undefined || typeof record.lockBreakCashoutBonus === "number") &&
    (record.carrierIntercepts === undefined || typeof record.carrierIntercepts === "number")
  );
}

function compareLocalBestCaseRecords(left: LocalBestCaseRecord, right: LocalBestCaseRecord): number {
  const scoreDelta = left.score - right.score;
  if (scoreDelta !== 0) return scoreDelta;

  const ratingDelta = localBestRatingValue(left.runRating) - localBestRatingValue(right.runRating);
  if (ratingDelta !== 0) return ratingDelta;

  const carrierDenialDelta = (left.carrierIntercepts ?? 0) - (right.carrierIntercepts ?? 0);
  if (carrierDenialDelta !== 0) return carrierDenialDelta;

  const breakoutDelta = (left.lockBreakCashoutBonus ?? 0) - (right.lockBreakCashoutBonus ?? 0);
  if (breakoutDelta !== 0) return breakoutDelta;

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

export function formatLocalBestCaseDetail(record: LocalBestCaseRecord, locale: Locale = "en"): string {
  const boostDetail = record.afterburnerExitBonus && record.afterburnerExitBonus > 0 ? t(locale, "best.boost", { boost: record.afterburnerExitBonus }) : "";
  const breakoutDetail = record.lockBreakCashoutBonus && record.lockBreakCashoutBonus > 0 ? t(locale, "best.breakout", { breakout: record.lockBreakCashoutBonus }) : "";
  const denialDetail = record.carrierIntercepts && record.carrierIntercepts > 0 ? t(locale, "best.denial", { denial: record.carrierIntercepts }) : "";
  return t(locale, "best.detail", { score: record.score, rating: record.runRating, chain: record.lootChain, boost: boostDetail, breakout: breakoutDetail, denial: denialDetail });
}

function buildLocalBestDelta(current: LocalBestCaseRecord, previous: LocalBestCaseRecord | null, isNewBest: boolean, locale: Locale): string {
  if (!previous) return t(locale, "best.firstSaved");
  if (isNewBest) return t(locale, "best.overPrevious", { score: Math.max(0, current.score - previous.score) });
  return t(locale, "best.pointsToBeat", { score: previous.score - current.score + 1 });
}

export function buildNextRunContracts(summary: MatchSummary, locale: Locale = "en"): NextRunContract[] {
  const blueScore = summary.teamScores.find((score) => score.teamId === "blue");
  const redScore = summary.teamScores.find((score) => score.teamId === "red");
  const redWon = summary.winnerTeamId === "red" || (redScore?.total ?? 0) > (blueScore?.total ?? 0);
  const emptyEscape = (blueScore?.escape ?? 0) > 0 && (blueScore?.loot ?? 0) <= 0;
  const redHasRelics = (summary.rivalRelicNames?.length ?? 0) > 0 || (summary.pendingRivalRelicNames?.length ?? 0) > 0;

  if (redWon || redHasRelics) {
    return [
      {
        label: t(locale, "contract.carrierHunt.label"),
        title: t(locale, "contract.carrierHunt.title"),
        detail: t(locale, "contract.carrierHunt.detail")
      },
      {
        label: t(locale, "contract.tempo.label"),
        title: t(locale, "contract.tempo.title"),
        detail: t(locale, "contract.tempo.detail")
      },
      {
        label: t(locale, "contract.cashout.label"),
        title: t(locale, "contract.cashout.title"),
        detail: t(locale, "contract.cashout.detail")
      }
    ];
  }

  if (summary.carrierIntercepts && summary.carrierIntercepts > 0) {
    return [
      {
        label: t(locale, "contract.denial.label"),
        title: t(locale, "contract.denial.title"),
        detail: t(locale, "contract.denial.detail")
      },
      {
        label: t(locale, "contract.cashout.label"),
        title: t(locale, "contract.bankRecovered.title"),
        detail: t(locale, "contract.bankRecovered.detail")
      },
      {
        label: t(locale, "contract.tempo.label"),
        title: t(locale, "contract.scoreBeforeBait.title"),
        detail: t(locale, "contract.scoreBeforeBait.detail")
      }
    ];
  }

  if (emptyEscape) {
    return [
      {
        label: t(locale, "contract.relicFirst.label"),
        title: t(locale, "contract.relicFirst.title"),
        detail: t(locale, "contract.relicFirst.detail")
      },
      {
        label: t(locale, "contract.value.label"),
        title: t(locale, "contract.value.title"),
        detail: t(locale, "contract.value.detail")
      },
      {
        label: t(locale, "contract.route.label"),
        title: t(locale, "contract.route.title"),
        detail: t(locale, "contract.route.detail")
      }
    ];
  }

  if (summary.runRating === "S-Rank" && summary.greedRoute === "successful" && (summary.lootChain ?? 1) > 1) {
    if (summary.afterburnerExitBonus && summary.afterburnerExitBonus > 0) {
      return [
        {
          label: t(locale, "contract.boost.label"),
          title: t(locale, "contract.boost.title"),
          detail: t(locale, "contract.boost.detail")
        },
        {
          label: t(locale, "contract.speedrun.label"),
          title: t(locale, "contract.speedrun.title"),
          detail: t(locale, "contract.speedrun.detail")
        },
        {
          label: t(locale, "contract.cleanPlay.label"),
          title: t(locale, "contract.cleanPlay.title"),
          detail: t(locale, "contract.cleanPlay.detail")
        }
      ];
    }

    return [
      {
        label: t(locale, "contract.speedrun.label"),
        title: t(locale, "contract.speedrun.title"),
        detail: t(locale, "contract.speedrun.detail")
      },
      {
        label: t(locale, "contract.cleanPlay.label"),
        title: t(locale, "contract.cleanPlay.title"),
        detail: t(locale, "contract.cleanPlay.detail")
      },
      {
        label: t(locale, "contract.encore.label"),
        title: t(locale, "contract.encore.title"),
        detail: t(locale, "contract.encore.detail")
      }
    ];
  }

  if (summary.runRating && summary.runRating !== "S-Rank") {
    return [
      {
        label: t(locale, "contract.rankPush.label"),
        title: t(locale, "contract.rankPush.title"),
        detail: t(locale, "contract.rankPush.detail")
      },
      {
        label: t(locale, "contract.cleanExit.label"),
        title: t(locale, "contract.cleanExit.title"),
        detail: t(locale, "contract.cleanExit.detail")
      },
      {
        label: t(locale, "contract.risk.label"),
        title: t(locale, "contract.risk.title"),
        detail: t(locale, "contract.risk.detail")
      }
    ];
  }

  return [
    {
      label: t(locale, "contract.tempo.label"),
      title: t(locale, "contract.scoreFirst.title"),
      detail: t(locale, "contract.scoreFirst.detail")
    },
    {
      label: t(locale, "contract.cashout.label"),
      title: t(locale, "contract.runToLift.title"),
      detail: t(locale, "contract.runToLift.detail")
    },
    {
      label: t(locale, "contract.style.label"),
      title: t(locale, "contract.style.title"),
      detail: t(locale, "contract.style.detail")
    }
  ];
}

export function buildCaseShareText(summary: MatchSummary, locale: Locale = "en"): string {
  const lines = [summary.caseFile];
  const highlightLines = buildShareHighlightLines(summary, locale);

  if (highlightLines.length) {
    lines.push(
      "",
      t(locale, "final.shareHighlights"),
      ...highlightLines.map((line, index) => `${String(index + 1).padStart(2, "0")}. ${line}`)
    );
  }

  lines.push("", t(locale, "final.shareNextRun"), buildRematchHook(summary, locale));
  lines.push("", t(locale, "final.sharePlay"), PUBLIC_PLAY_URL);
  return lines.join("\n");
}

function buildShareHighlightLines(summary: MatchSummary, locale: Locale): string[] {
  const baseLines = (summary.highlightLines ?? []).map((line) => localizeText(locale, line));
  if (summary.carrierIntercepts && summary.carrierIntercepts > 0) {
    const deniedLine = summary.interceptedRelicNames?.length
      ? t(locale, "final.redDenied", { relics: relicList(summary.interceptedRelicNames, locale) })
      : t(locale, "final.redDeniedRecovered");
    return [deniedLine, ...baseLines.filter((line) => line.toLocaleLowerCase() !== deniedLine.toLocaleLowerCase())];
  }

  if (summary.comebackRoutesArmed && summary.comebackRoutesArmed > 0) {
    const comebackLine = t(locale, "final.comebackBeatRed");
    return [comebackLine, ...baseLines.filter((line) => line.toLocaleLowerCase() !== comebackLine.toLocaleLowerCase())];
  }

  return baseLines;
}

export function buildCaseStamp(summary: MatchSummary, locale: Locale = "en") {
  const winner = winningRunLabel(locale, summary.winnerTeamId);
  const resultParts = [winner];
  const deniedCarrierQuote =
    summary.carrierIntercepts && summary.carrierIntercepts > 0
      ? summary.interceptedRelicNames?.length
        ? t(locale, "final.redDenied", { relics: relicList(summary.interceptedRelicNames, locale) })
        : t(locale, "final.redDeniedRecovered")
      : null;
  const comebackQuote = summary.comebackRoutesArmed && summary.comebackRoutesArmed > 0 ? t(locale, "final.comebackBeatRed") : null;
  const baseQuote = deniedCarrierQuote ?? comebackQuote ?? localizeText(locale, summary.highlightLines?.[0]) ?? buildRematchHook(summary, locale);
  const quote =
    deniedCarrierQuote || comebackQuote
      ? baseQuote
      : summary.lockBreakCashoutBonus && summary.lockBreakCashoutBonus > 0
        ? t(locale, "final.cashoutQuoteWithBase", {
            prefix: t(locale, "final.breakoutCashoutQuote", { bonus: summary.lockBreakCashoutBonus }),
            quote: baseQuote
          })
        : summary.afterburnerExitBonus && summary.afterburnerExitBonus > 0
          ? t(locale, "final.cashoutQuoteWithBase", {
              prefix: t(locale, "final.afterburnerCashoutQuote", { bonus: summary.afterburnerExitBonus }),
              quote: baseQuote
            })
          : baseQuote;

  if (summary.runRating) {
    resultParts.push(summary.runRating);
  }

  if (summary.lootChain && summary.lootChain > 1) {
    resultParts.push(t(locale, "final.lootChainCompact", { chain: summary.lootChain }));
  }

  return {
    kicker: t(locale, "final.caseStampKicker"),
    title: summary.title,
    result: resultParts.join(" · "),
    quote
  };
}

export function buildScoreMarginLabel(teamScores: TeamScore[], locale: Locale = "en"): string {
  const blueTotal = teamScores.find((score) => score.teamId === "blue")?.total ?? 0;
  const redTotal = teamScores.find((score) => score.teamId === "red")?.total ?? 0;
  const margin = Math.abs(blueTotal - redTotal);

  if (margin === 0) return t(locale, "final.tieGame");
  return blueTotal > redTotal ? t(locale, "final.blueBy", { margin }) : t(locale, "final.redBy", { margin });
}
