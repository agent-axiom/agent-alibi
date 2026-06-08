import { lazy, Suspense } from "react";
import { Eye, Footprints, Gem, Hand, LockKeyhole, Radio, Shield, Sparkles, Volume2, VolumeX, Zap } from "lucide-react";
import type { ActionKind } from "@agent-alibi/shared";
import { selectArcadeHudDensity } from "../arcade/hud-density";
import type { LocalMatchController } from "../local/useLocalMatch";
import { buildArcadeMomentumMeter } from "./arcade-momentum";
import type { Locale } from "../i18n";
import { localizeText, t } from "../i18n";
import { LanguageToggle } from "./LanguageToggle";

type MatchScreenProps = {
  match: LocalMatchController;
  soundEnabled?: boolean;
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  onToggleSound?: () => void;
};

const KIND_ICONS: Record<ActionKind, typeof Footprints> = {
  move: Footprints,
  scout: Eye,
  steal: Gem,
  distract: Radio,
  guard: Shield,
  sabotage: LockKeyhole,
  cover: Hand,
  escape: Zap
};

const ArcadeHeistStage = lazy(() =>
  import("../arcade/ArcadeHeistStage").then((module) => ({ default: module.ArcadeHeistStage }))
);
const HeistStage = lazy(() => import("../heist/HeistStage").then((module) => ({ default: module.HeistStage })));

export function MatchScreen({ match, soundEnabled = false, locale = "en", onLocaleChange, onToggleSound }: MatchScreenProps) {
  if (!match.state) return null;
  const state = match.state;

  if (match.arcade?.enabled) {
    const hud = match.arcade.hud;
    const blueLoot = hud?.lootValue ?? 0;
    const redLoot = hud?.aiLootValue ?? 0;
    const redPendingLoot = hud?.aiPendingLootValue ?? 0;
    const redThreatLoot = redLoot + redPendingLoot;
    const raceTone = blueLoot > redThreatLoot ? "leading" : blueLoot < redThreatLoot ? "trailing" : "tied";
    const radarFocus = hud?.radarBlips.find((blip) => blip.kind === "carrier") ?? hud?.radarBlips.find((blip) => blip.kind === "target" || blip.kind === "exit");
    const radarFocusLabel = radarFocus
      ? `${radarFocusPrefix(locale, radarFocus.kind, hud?.escapePayout?.cashout ?? null)}: ${localizeText(locale, radarFocus.label)}`
      : t(locale, "match.sweepClear");
    const routeChoice = hud?.routeChoice ?? null;
    const hudDensity = selectArcadeHudDensity(hud);
    const cashoutStepLabel = hud?.escapePayout ? t(locale, "match.cashoutStep", { cashout: hud.escapePayout.cashout }) : t(locale, "match.escape");
    const carriedLoot = hud && hud.lootValue > 0 && hud.escapePayout ? { loot: hud.lootValue, cashout: hud.escapePayout.cashout } : null;
    const blueRaceLabel = carriedLoot ? t(locale, "match.blueCarrying", { loot: carriedLoot.loot }) : t(locale, "match.blueScore", { loot: blueLoot });
    const redLootLabel = redPendingLoot > 0 ? t(locale, "match.redPending", { loot: redLoot, pending: redPendingLoot }) : t(locale, "match.redScore", { loot: redLoot });
    const lootScoreLabel = `Loot score: Blue ${blueLoot}, Red banked ${redLoot}${redPendingLoot > 0 ? `, Red pending ${redPendingLoot}` : ""}`;
    const redRaceLabel = redPendingLoot > 0 ? t(locale, "match.redRacePending", { loot: redLoot, pending: redPendingLoot }) : t(locale, "match.redRace", { loot: redLoot });
    const raceStatusLabel = redPendingLoot > 0
      ? t(locale, "match.recoverBeforeRed", { pending: redPendingLoot })
      : carriedLoot
        ? t(locale, "match.bankAtLift", { cashout: carriedLoot.cashout })
        : localizeText(locale, hud?.raceStatus ?? t(locale, "match.lootRaceTied"));
    const SoundIcon = soundEnabled ? Volume2 : VolumeX;
    const routePulse = hud?.routePulse ?? null;
    const rawBreakoutCashoutWindow = hud?.comboCashoutWindow ?? null;
    const scanLockCueActive = hud?.threatCue?.label === "Scan lock" && /jam/i.test(hud.threatCue.action);
    const threatCueActive = Boolean(hud?.threatCue);
    const denseThreatActive = hud?.threatCue?.label === "Laser sweep";
    const countdownPulseActive = hud?.phase === "lockdown";
    const countdownPulseAction = (hud?.lootValue ?? 0) > 0 ? t(locale, "match.cashoutNow") : t(locale, "match.escapeNow");
    const visibleRivalBark = countdownPulseActive ? null : (hud?.rivalBark ?? null);
    const breachAlert = visibleRivalBark?.agentName === "Red Crew" && /breach live/i.test(visibleRivalBark.line);
    const stealComplete = (hud?.lootValue ?? 0) > 0 || (hud?.artifactsStolen ?? 0) > 0;
    const cashoutSurge =
      carriedLoot && hud?.escapePayout && (hud.scorePopup?.tone === "loot" || hud.lootSpeedSurge)
        ? {
            cashout: hud.escapePayout.cashout,
            seconds: extractStatusSeconds(hud.rivalStatus),
            afterburner: hud.lootSpeedSurge
          }
        : null;
    const cashoutPayoff =
      hud?.extractionSequence?.active && hud.extractionSequence.outcome === "escaped" && hud.extractionSequence.cashoutValue > 0
        ? {
            cashout: hud.extractionSequence.cashoutValue,
            seconds: Math.max(1, Math.ceil(hud.extractionSequence.remainingMs / 1000))
          }
        : null;
    const firstStealCashoutMoment = Boolean(cashoutSurge && hud?.scorePopup?.tone === "loot" && hud.artifactsStolen === 1);
    const lockBreakPayoff = cashoutPayoff ? null : (hud?.lockBreakPayoff ?? null);
    const alibiPayoff = cashoutPayoff || lockBreakPayoff ? null : (hud?.alibiPayoff ?? null);
    const breachSprint = hud?.lootSpeedSurge?.label === "Breach Sprint" && (hud?.artifactsStolen ?? 0) === 0 ? hud.lootSpeedSurge : null;
    const ghostStepBoost = hud?.lootSpeedSurge?.label === "Ghost Step" ? hud.lootSpeedSurge : null;
    const visibleBreachSprint = cashoutPayoff || lockBreakPayoff || alibiPayoff ? null : breachSprint;
    const visibleGhostStepBoost = cashoutPayoff || lockBreakPayoff || alibiPayoff ? null : ghostStepBoost;
    const hunterChase = cashoutPayoff || lockBreakPayoff || alibiPayoff ? null : (hud?.hunterChaseCue ?? null);
    const rivalCashoutEmergency = cashoutPayoff || lockBreakPayoff || alibiPayoff || hunterChase ? null : hud?.rivalIntercept?.urgency === "critical" ? hud.rivalIntercept : null;
    const breakoutCashoutWindow = lockBreakPayoff ? null : rawBreakoutCashoutWindow;
    const scanLockActive = !lockBreakPayoff && !alibiPayoff && scanLockCueActive;
    const visibleCashoutSurge = cashoutPayoff || hunterChase || lockBreakPayoff || alibiPayoff || visibleGhostStepBoost || visibleBreachSprint ? null : cashoutSurge;
    const visibleScorePopup = cashoutPayoff || lockBreakPayoff || alibiPayoff || visibleGhostStepBoost || firstStealCashoutMoment ? null : (hud?.scorePopup ?? null);
    const visibleSpotlight = cashoutPayoff || lockBreakPayoff || alibiPayoff || visibleGhostStepBoost || firstStealCashoutMoment ? null : (hud?.spotlight ?? null);
    const visibleObjectiveBanner = cashoutPayoff || lockBreakPayoff || alibiPayoff || visibleGhostStepBoost || rivalCashoutEmergency || (firstStealCashoutMoment && hud?.objectiveBanner?.tone === "escape") ? null : (hud?.objectiveBanner ?? null);
    const visibleRoutePulse = cashoutPayoff || lockBreakPayoff || alibiPayoff || (firstStealCashoutMoment && routePulse?.mode === "escape") ? null : routePulse;
    const afterburnerActive = hud?.lootSpeedSurge?.label === "Afterburner";
    const breachSprintActive = Boolean(visibleBreachSprint);
    const ghostStepActive = Boolean(visibleGhostStepBoost);
    const rivalPressureActive = Boolean(redLoot > 0 || hud?.rivalObjective || hud?.rivalIntercept || hud?.lastRivalSteal);
    const carrierPressureActive = Boolean(hud?.rivalIntercept);
    const carrierEmergencyInteractReady = Boolean(
      rivalCashoutEmergency &&
        hud?.activeAction.key.toLowerCase().startsWith("e") &&
        /recover|intercept/i.test(hud.activeAction.label)
    );
    const displayedActiveAction = rivalCashoutEmergency && !carrierEmergencyInteractReady
      ? { key: t(locale, "match.move"), label: `Close gap ${rivalCashoutEmergency.distanceMeters}m`, tone: "danger" as const }
      : (hud?.activeAction ?? null);
    const displayedPrompt = rivalCashoutEmergency
      ? carrierEmergencyInteractReady
        ? "Press E / Space to intercept"
        : "Red cashout imminent"
      : (hud?.prompt ?? (hud?.phase === "lockdown" ? t(locale, "match.lockdown") : hud?.phase === "alarm" ? t(locale, "match.alarmRising") : t(locale, "match.heistLive")));
    const displayedObjective = localizeText(
      locale,
      rivalCashoutEmergency ? `Intercept ${rivalCashoutEmergency.agentName} before lift` : (hud?.objective ?? t(locale, "match.defaultObjective"))
    );
    const displayedObjectiveCompass = rivalCashoutEmergency
      ? {
          tone: "danger" as const,
          verb: "INTERCEPT",
          target: `${rivalCashoutEmergency.agentName} +${rivalCashoutEmergency.value}`,
          route: rivalCashoutEmergency.directionLabel,
          detail: `Deny Red +${rivalCashoutEmergency.value} / swing +${rivalCashoutEmergency.swingValue}`
        }
      : (hud?.objectiveCompass ?? null);
    const carrierContractLabel = hud?.rivalIntercept
      ? hud.rivalIntercept.urgency === "critical"
        ? "Stop " + hud.rivalIntercept.agentName + " cashout +" + hud.rivalIntercept.value
        : "Intercept " + hud.rivalIntercept.agentName + " +" + hud.rivalIntercept.value
      : "Intercept carrier";
    const cashoutCurrent = Boolean(hud?.canEscape) || countdownPulseActive;
    const heatCurrent = (carrierPressureActive || threatCueActive) && !cashoutCurrent;
    const contractCurrent = carrierPressureActive
      ? "heat"
      : !stealComplete
        ? "steal"
        : cashoutCurrent
          ? "cashout"
          : heatCurrent
            ? "heat"
            : "steal";
    const contractSteps = [
      {
        key: "steal",
        number: "1",
        label: "Steal relic",
        status: stealComplete ? "done" : contractCurrent === "steal" ? "current" : "queued"
      },
      {
        key: "heat",
        number: "2",
        label: carrierPressureActive ? carrierContractLabel : "Break heat",
        status: contractCurrent === "heat" ? "current" : stealComplete ? "ready" : "queued"
      },
      {
        key: "cashout",
        number: "3",
        label: stealComplete || cashoutCurrent ? cashoutStepLabel : "Cashout",
        status: contractCurrent === "cashout" ? "current" : "queued"
      }
    ];
    const momentumMeter =
      hudDensity === "opening"
        ? null
        : buildArcadeMomentumMeter({
            cleanBonusWindow: hud?.cleanBonusWindow ?? null,
            lootChainWindow: hud?.lootChainWindow ?? null
          });
    const openingTargetRoute = localizeText(locale, hud?.targetDistanceLabel?.replace(new RegExp("^Target\\s+", "i"), "") ?? "gold marker");
    return (
      <main
        className={`arcade-shell ${hud?.phase ?? "stealth"} ${hudDensity === "opening" ? "compact-opening" : ""} ${hudDensity === "chase" ? "chase-compact" : ""} ${firstStealCashoutMoment ? "first-steal-cashout-moment" : ""} ${cashoutPayoff ? "cashout-payoff-active" : ""} ${hunterChase ? "hunter-chase-active" : ""} ${alibiPayoff ? "alibi-payoff-active" : ""} ${lockBreakPayoff ? "lock-break-payoff-active" : ""} ${breachAlert ? "breach-alert" : ""} ${visibleRoutePulse ? "route-pulse-active" : ""} ${visibleRoutePulse?.mode === "alibi" ? "alibi-pulse-active" : ""} ${visibleRoutePulse?.mode === "comeback" ? "comeback-pulse-active" : ""} ${breakoutCashoutWindow ? "breakout-cashout-active" : ""} ${rivalCashoutEmergency ? "rival-cashout-emergency-active" : ""} ${scanLockActive ? "scan-lock-active" : ""} ${threatCueActive ? "threat-cue-active" : ""} ${denseThreatActive ? "dense-threat-active" : ""} ${countdownPulseActive ? "countdown-pulse-active" : ""} ${afterburnerActive ? "afterburner-active" : ""} ${breachSprintActive ? "breach-sprint-active" : ""} ${ghostStepActive ? "ghost-step-active" : ""} ${rivalPressureActive ? "rival-pressure-active" : ""}`}
      >
        <Suspense
          fallback={
            <div className="arcade-stage arcade-loading" aria-label="Loading Moon Vault arcade scene">
              {t(locale, "match.loadingArcade")}
            </div>
          }
        >
          <ArcadeHeistStage
            hud={hud}
            state={state}
            runId={match.arcade.runId}
            onHudUpdate={match.arcade.updateHud}
            onFinish={match.arcade.finishMission}
          />
        </Suspense>
        <div className="arcade-vignette" />
        {breachAlert ? <div className="arcade-breach-pulse" aria-label="Breach alert pulse" /> : null}
        {visibleBreachSprint ? (
          <div className="arcade-breach-sprint" aria-label="Breach sprint" aria-live="polite">
            <span>{t(locale, "match.breachSprint")}</span>
            <strong>{localizeText(locale, visibleBreachSprint.source ?? "Moon Pearl")} x{visibleBreachSprint.multiplier.toFixed(2)}</strong>
            <small>{t(locale, "match.breachSprintSmall", { seconds: visibleBreachSprint.secondsLeft })}</small>
          </div>
        ) : null}
        {visibleGhostStepBoost ? (
          <div className="arcade-ghost-step" aria-label="Ghost step boost" aria-live="polite">
            <span>{localizeText(locale, visibleGhostStepBoost.source ?? "Clean dodge")}</span>
            <strong>{localizeText(locale, visibleGhostStepBoost.label)} x{visibleGhostStepBoost.multiplier.toFixed(2)}</strong>
            <small>{t(locale, "match.ghostSpeedSmall", { seconds: visibleGhostStepBoost.secondsLeft })}</small>
          </div>
        ) : null}
        {cashoutPayoff ? (
          <div className="arcade-cashout-payoff" aria-label="Cashout payoff" aria-live="assertive">
            <span>{t(locale, "match.extractionLive")}</span>
            <strong>{t(locale, "match.cashoutBanked", { cashout: cashoutPayoff.cashout })}</strong>
            <small>{t(locale, "match.untilCaseFile", { seconds: cashoutPayoff.seconds })}</small>
          </div>
        ) : null}
        {visibleCashoutSurge ? (
          <div className="arcade-cashout-surge" aria-label="Cashout surge" aria-live="polite">
            <span>{t(locale, "match.runToLift")}</span>
            <strong>{t(locale, "match.bankValue", { cashout: visibleCashoutSurge.cashout })}</strong>
            {visibleCashoutSurge.afterburner ? (
              <>
                <small className="arcade-cashout-afterburner">
                  {localizeText(locale, visibleCashoutSurge.afterburner.label)} x{visibleCashoutSurge.afterburner.multiplier.toFixed(2)} · {visibleCashoutSurge.afterburner.secondsLeft}s boost
                </small>
                <small className="arcade-cashout-afterburner">
                  {visibleCashoutSurge.afterburner.exitBonus ? t(locale, "match.afterburnerExit") : t(locale, "match.ghostCleanEscape")}
                </small>
              </>
            ) : null}
            <small>{t(locale, "match.beforeScans", { seconds: visibleCashoutSurge.seconds })}</small>
          </div>
        ) : null}
        {hunterChase ? (
          <div className="arcade-hunter-chase" aria-label="Hunter chase" aria-live="assertive">
            <span>{t(locale, "match.hunterLockOn", { agentName: hunterChase.agentName })}</span>
            <strong>{t(locale, "match.dashBreakLock")}</strong>
            <small>{t(locale, "match.hunterClosing", { distance: hunterChase.distanceMeters, beams: hunterChase.beamCount })}</small>
          </div>
        ) : null}
        {rivalCashoutEmergency ? (
          <div className="arcade-rival-cashout-emergency" aria-label="Rival cashout emergency" aria-live="assertive">
            <span>{t(locale, "match.redCashoutImminent")}</span>
            <strong>{t(locale, "match.interceptNow")}</strong>
            <small>{t(locale, "match.denySwing", { value: rivalCashoutEmergency.value, swing: rivalCashoutEmergency.swingValue })}</small>
            <small>{t(locale, "match.agentLiftDistance", { agentName: rivalCashoutEmergency.agentName, distance: rivalCashoutEmergency.distanceMeters, seconds: rivalCashoutEmergency.cashoutSeconds })}</small>
          </div>
        ) : null}
        {lockBreakPayoff ? (
          <div className="arcade-lock-break-payoff" aria-label="Lock break payoff" aria-live="assertive">
            <span>{t(locale, "match.lockBroken")}</span>
            <strong>{t(locale, "match.breakoutCashout", { cashout: lockBreakPayoff.cashoutValue })}</strong>
            <div className="arcade-lock-break-contract">
              <b>{t(locale, "match.bankNow")}</b>
              <small>{t(locale, "match.lootBreakout", { base: lockBreakPayoff.baseCashoutValue, bonus: lockBreakPayoff.bonus })}</small>
            </div>
            <div
              aria-label="Breakout cashout timer"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={lockBreakPayoff.timerPercent}
              className="arcade-lock-break-meter"
              role="progressbar"
            >
              <i style={{ width: `${lockBreakPayoff.timerPercent}%` }} />
            </div>
            <small>{t(locale, "match.rookScanJammed", { seconds: lockBreakPayoff.secondsLeft })}</small>
          </div>
        ) : null}
        {alibiPayoff ? (
          <div className="arcade-alibi-payoff" aria-label="Alibi pulse payoff" aria-live="polite">
            <span>{localizeText(locale, alibiPayoff.label)}</span>
            <strong>{localizeText(locale, alibiPayoff.result)}</strong>
            <small>{localizeText(locale, alibiPayoff.detail)}</small>
            <small>{localizeText(locale, alibiPayoff.action)}</small>
          </div>
        ) : null}
        {breakoutCashoutWindow ? (
          <div className="arcade-breakout-cashout" aria-label="Breakout cashout window" aria-live="polite">
            <span>{localizeText(locale, breakoutCashoutWindow.label)}</span>
            <strong>{t(locale, "match.bonus", { bonus: breakoutCashoutWindow.bonus })}</strong>
            <small>{t(locale, "match.cashoutValue", { cashout: breakoutCashoutWindow.cashoutValue })}</small>
            <small>{t(locale, "match.secondsToBank", { seconds: breakoutCashoutWindow.secondsLeft })}</small>
          </div>
        ) : null}
        {scanLockActive ? (
          <div className="arcade-scan-lock-pulse" aria-label="Scan lock pulse">
            <span>{t(locale, "match.scanLock")}</span>
            <strong>{t(locale, "match.pressInteract")}</strong>
            <small>{t(locale, "match.jamScan")}</small>
          </div>
        ) : null}
        {countdownPulseActive ? (
          <div className="arcade-countdown-pulse" aria-label="Final countdown pulse">
            <span>{t(locale, "match.final30")}</span>
            <strong>{countdownPulseAction}</strong>
            <small>{t(locale, "match.beforeVaultSeals", { time: formatClock(hud.timeLeftMs) })}</small>
          </div>
        ) : null}
        {visibleRoutePulse ? (
          <div className={`arcade-route-pulse ${visibleRoutePulse.mode}`} aria-label="Route pulse">
            <span>{localizeText(locale, visibleRoutePulse.title)}</span>
            <strong>{localizeText(locale, visibleRoutePulse.detail)}</strong>
            <small>{localizeText(locale, visibleRoutePulse.action)}</small>
          </div>
        ) : null}

        {hudDensity === "opening" ? (
          <aside className="arcade-opening-contract" aria-label="Opening contract">
            <span>{t(locale, "match.openingContract")}</span>
            <strong>{t(locale, "match.stealMoonPearl")}</strong>
            <div>
              <small>1</small>
              <b>{t(locale, "match.moonPearlRoute", { route: openingTargetRoute })}</b>
            </div>
            <div>
              <small>2</small>
              <b>{t(locale, "match.cashoutAtrium")}</b>
            </div>
            <div>
              <small>3</small>
              <b>{t(locale, "match.pressAtRelic")}</b>
            </div>
          </aside>
        ) : null}

        {visibleObjectiveBanner ? (
          <div className={`arcade-objective-banner ${visibleObjectiveBanner.tone}`} aria-label="Objective banner" aria-live="polite">
            <span>{visibleObjectiveBanner.tone === "greed" ? t(locale, "match.optionalRisk") : visibleObjectiveBanner.tone === "escape" ? t(locale, "match.cashoutWindow") : t(locale, "match.primaryTarget")}</span>
            <strong>{localizeText(locale, visibleObjectiveBanner.title)}</strong>
            <small>{localizeText(locale, visibleObjectiveBanner.detail)}</small>
          </div>
        ) : null}

        <header className="arcade-topbar" aria-label="Live mission status">
          <div className="mission-title">
            <span>Agent Alibi</span>
            <strong>{t(locale, "match.moonVaultRun")}</strong>
            {onToggleSound ? (
              <button
                aria-label={soundEnabled ? t(locale, "sound.on") : t(locale, "sound.off")}
                className={`arcade-sound-toggle ${soundEnabled ? "enabled" : ""}`}
                onClick={onToggleSound}
                title={soundEnabled ? t(locale, "sound.on") : t(locale, "sound.off")}
                type="button"
              >
                <SoundIcon aria-hidden="true" size={18} />
              </button>
            ) : null}
          </div>
          <div className="arcade-stat">
            <span>{t(locale, "match.timer")}</span>
            <strong>{formatClock(hud?.timeLeftMs ?? 0)}</strong>
          </div>
          <div aria-label={lootScoreLabel} className={`arcade-stat arcade-loot-stat ${redPendingLoot > 0 ? "rival-pending" : ""}`}>
            <span>{t(locale, "match.loot")}</span>
            <strong>
              {blueLoot} / {redLootLabel}
            </strong>
          </div>
          <div className="arcade-alarm" aria-label={`Alarm ${hud?.alarm ?? match.state.alarm} of 5`}>
            <span>{t(locale, "match.alarm")}</span>
            <div>
              {Array.from({ length: 5 }, (_, index) => (
                <i className={index < (hud?.alarm ?? state.alarm) ? "lit" : ""} key={index} />
              ))}
            </div>
          </div>
          <div className={`arcade-condition ${hud?.vaultCondition.tone ?? "stable"}`} aria-label="Vault condition">
            <span>{localizeText(locale, hud?.vaultCondition.label ?? t(locale, "match.vaultStable"))}</span>
            <strong>{localizeText(locale, hud?.vaultCondition.detail ?? t(locale, "match.lowProfile"))}</strong>
          </div>
        </header>

        <aside className="arcade-radar" aria-label="Mini radar">
          <span>{t(locale, "match.radar")}</span>
          <div className="arcade-radar-map">
            {(hud?.radarBlips ?? []).map((blip) => (
              <span
                aria-label={`Radar ${blip.kind}: ${blip.label}`}
                className={`arcade-radar-blip ${blip.kind}`}
                key={`${blip.kind}-${blip.id}`}
                style={{ left: `${blip.x}%`, top: `${blip.y}%` }}
              />
            ))}
          </div>
          <small>{radarFocusLabel}</small>
        </aside>

        {visibleSpotlight ? (
          <div className="arcade-spotlight" aria-live="polite">
            {localizeText(locale, visibleSpotlight)}
          </div>
        ) : null}

        {visibleScorePopup ? (
          <div className={`arcade-score-popup ${visibleScorePopup.tone}`} aria-label="Score popup" aria-live="polite">
            <strong>{localizeText(locale, visibleScorePopup.label)}</strong>
            <span>{localizeText(locale, visibleScorePopup.detail)}</span>
          </div>
        ) : null}

        {visibleRivalBark ? (
          <div className={`arcade-rival-bark ${visibleRivalBark.tone}`} aria-label="Rival comms" aria-live="polite">
            <span>{visibleRivalBark.agentName}</span>
            <strong>{localizeText(locale, visibleRivalBark.line)}</strong>
          </div>
        ) : null}

        <aside className="arcade-roster" aria-label="Live agents">
          {state.players.map((player) => (
            <button
              className={`arcade-agent ${player.teamId} ${player.kind}`}
              key={player.id}
              onClick={() => match.selectPlayer(player.id)}
              type="button"
            >
              <span>{shortName(player.name)}</span>
              <strong>{player.name}</strong>
            </button>
          ))}
        </aside>

        <aside className="arcade-feed" aria-label="Mission radio">
          <div className="console-heading">
            <Radio size={16} />
            <span>{t(locale, "match.radio")}</span>
          </div>
          {(hud?.feed ?? ["Moon Vault breach started."]).slice(-5).map((line, index) => (
            <p key={`${line}-${index}`}>{localizeText(locale, line)}</p>
          ))}
        </aside>

        <section className="arcade-objective" aria-label="Current objective">
          <span>{localizeText(locale, displayedPrompt)}</span>
          <strong>{displayedObjective}</strong>
          <div className={`arcade-active-action ${displayedActiveAction?.tone ?? "neutral"}`} aria-label="Active action">
            <kbd>{localizeText(locale, displayedActiveAction?.key ?? t(locale, "match.move"))}</kbd>
            <span>{localizeText(locale, displayedActiveAction?.label ?? "Follow marker")}</span>
          </div>
          {displayedObjectiveCompass ? (
            <div className={`arcade-objective-compass ${displayedObjectiveCompass.tone}`} aria-label="Objective compass">
              <span>{localizeText(locale, displayedObjectiveCompass.verb)}</span>
              <strong>{localizeText(locale, displayedObjectiveCompass.target)}</strong>
              <i>{displayedObjectiveCompass.route}</i>
              <small>{localizeText(locale, displayedObjectiveCompass.detail)}</small>
            </div>
          ) : null}
          {hud?.rivalObjective ? (
            <div className={`arcade-rival-objective ${hud.rivalObjective.tone}`} aria-label="Rival objective">
              <span>{localizeText(locale, hud.rivalObjective.label)}</span>
              <strong>{localizeText(locale, hud.rivalObjective.title)}</strong>
              <small>{localizeText(locale, hud.rivalObjective.detail)}</small>
              <em>{localizeText(locale, hud.rivalObjective.action)}</em>
            </div>
          ) : null}
          {hud?.missionBeat ? (
            <div className={`arcade-mission-beat ${hud.missionBeat.tone}`} aria-label="Mission beat">
              <span>{localizeText(locale, hud.missionBeat.kicker)}</span>
              <strong>{localizeText(locale, hud.missionBeat.title)}</strong>
              <p>{localizeText(locale, hud.missionBeat.detail)}</p>
              <small>{localizeText(locale, hud.missionBeat.action)}</small>
              {hud.directorCue ? (
                <div className={"arcade-director-cue " + hud.directorCue.tone} aria-label="Heist director cue">
                  <span>{localizeText(locale, hud.directorCue.label)}</span>
                  <strong>{localizeText(locale, hud.directorCue.title)}</strong>
                  <p>{localizeText(locale, hud.directorCue.detail)}</p>
                  <em>{localizeText(locale, hud.directorCue.reward)}</em>
                </div>
              ) : null}
            </div>
          ) : null}
          {hud?.threatCue ? (
            <div className={`arcade-threat-cue ${hud.threatCue.tone}`} aria-label="Threat vector">
              <strong>{localizeText(locale, hud.threatCue.label)}</strong>
              <span>{localizeText(locale, hud.threatCue.detail)}</span>
              <small>{localizeText(locale, hud.threatCue.action)}</small>
            </div>
          ) : null}
          <div className="arcade-steps" aria-label="Contract chain">
            {contractSteps.map((step) => (
              <span
                aria-current={step.status === "current" ? "step" : undefined}
                aria-label={`${step.label} ${step.status === "done" ? "complete" : step.status}`}
                className={`${step.status} ${step.status === "current" ? "active" : ""}`}
                key={step.key}
              >
                <b>{step.number}</b> {localizeText(locale, step.label)}
              </span>
            ))}
          </div>
          <div className="arcade-mission-meta">
            <div className={`arcade-race ${raceTone}`} aria-label="Heist race">
              <span>{t(locale, "match.heistRace")}</span>
              <div>
                <strong>{blueRaceLabel}</strong>
                <i />
                <strong>{redRaceLabel}</strong>
              </div>
              <small>{raceStatusLabel}</small>
            </div>
            {hud?.lastRivalSteal ? (
              <div className="arcade-rival-loot" aria-label="Rival loot alert">
                {localizeText(locale, hud.lastRivalSteal)}
              </div>
            ) : null}
            {hud?.rivalIntercept ? (
              <div className={`arcade-rival-intercept ${hud.rivalIntercept.urgency}`} aria-label="Rival intercept">
                <span>{t(locale, "match.rivalCarrying", { agentName: hud.rivalIntercept.agentName })}</span>
                <strong>
                  {localizeText(locale, hud.rivalIntercept.relicName)} +{hud.rivalIntercept.value}
                </strong>
                <small>
                  {localizeText(
                    locale,
                    `${hud.rivalIntercept.distanceMeters}m away · ${
                      hud.rivalIntercept.urgency === "critical" ? "cashout imminent" : `cashout in ${hud.rivalIntercept.cashoutSeconds}s`
                    } · intercept with E · deny Red +${hud.rivalIntercept.value} / swing +${hud.rivalIntercept.swingValue}`
                  )}
                </small>
              </div>
            ) : null}
            {carriedLoot ? (
              <div className="arcade-carried-loot" aria-label="Carried loot">
                <span>{t(locale, "match.carryingLoot", { loot: carriedLoot.loot })}</span>
                <strong>{t(locale, "match.bankAtLift", { cashout: carriedLoot.cashout })}</strong>
              </div>
            ) : null}
            {hud?.escapePayout ? (
              <div className="arcade-escape-payout" aria-label="Escape payout">
                <span>{t(locale, "match.escapeBonus", { bonus: hud.escapePayout.escapeBonus })}</span>
                <strong>{t(locale, "match.cashoutPlain", { cashout: hud.escapePayout.cashout })}</strong>
              </div>
            ) : null}
            {hud?.extractionCue ? (
              <div className={`arcade-extraction-cue ${hud.extractionCue.tone}`} aria-label="Extraction cue">
                <span>{localizeText(locale, hud.extractionCue.label)}</span>
                <strong>{localizeText(locale, hud.extractionCue.detail)}</strong>
                <small>{localizeText(locale, hud.extractionCue.action)}</small>
              </div>
            ) : null}
            {routeChoice ? (
              <div className={`arcade-route-choice ${routeChoice.mode}`} aria-label="Route choice">
                <span>{routeChoice.mode === "greed" ? t(locale, "match.greedArmed") : t(locale, "match.bankNowValue", { cashout: routeChoice.cashoutNow })}</span>
                <strong>
                  {t(locale, "match.riskRelic", { value: routeChoice.greedRelicValue, relicName: localizeText(locale, routeChoice.greedRelicName) })}
                </strong>
                <small>
                  {routeChoice.mode === "greed"
                    ? t(locale, "match.projectedCashout", { cashout: routeChoice.projectedCashout, distance: routeChoice.greedDistanceMeters })
                    : t(locale, "match.pressGForCashout", { cashout: routeChoice.projectedCashout, distance: routeChoice.greedDistanceMeters })}
                </small>
              </div>
            ) : null}
            <div className="arcade-route" aria-label="Route distance">
              {localizeText(locale, hud?.targetDistanceLabel ?? t(locale, "match.targetPlotting"))}
            </div>
            <div className="arcade-rivals" aria-label="Rival crew status">
              {localizeText(locale, hud?.rivalStatus ?? t(locale, "match.rivalsScanning"))}
            </div>
            <div className={`arcade-rival-scan ${hud?.rivalPressureLevel ?? "standby"}`} aria-label="Nearest rival">
              {localizeText(locale, hud?.rivalDistanceLabel ?? t(locale, "match.nearestRivalScanning"))}
            </div>
            <div className={`arcade-scan-meter ${hud?.rivalScanStatus.tone ?? "idle"}`} aria-label="Rival scan meter">
              <span>{localizeText(locale, hud?.rivalScanStatus.label ?? t(locale, "match.scanClear"))}</span>
              <i>
                <b style={{ width: `${hud?.rivalScanStatus.progress ?? 0}%` }} />
              </i>
            </div>
            <div className="arcade-pace" aria-label="Run pace">
              {localizeText(locale, hud?.paceStatus ?? t(locale, "match.paceUnknown"))}
            </div>
            {momentumMeter ? (
              <div
                aria-label="Momentum meter"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={momentumMeter.value}
                className={`arcade-momentum-meter ${momentumMeter.tone}`}
                role="progressbar"
              >
                <div>
                  <span>{t(locale, "match.momentum")}</span>
                  <strong>{localizeText(locale, momentumMeter.label)}</strong>
                  <small>{localizeText(locale, momentumMeter.detail)}</small>
                </div>
                <i>
                  <b style={{ width: `${momentumMeter.value}%` }} />
                </i>
                <em>{localizeText(locale, momentumMeter.action)}</em>
              </div>
            ) : null}
            {hud?.cleanBonusWindow ? (
              <div className="arcade-clean-bonus" aria-label="Clean bonus window">
                <span>{localizeText(locale, hud.cleanBonusWindow.label)}</span>
                <strong>{localizeText(locale, hud.cleanBonusWindow.detail)}</strong>
                <small>{t(locale, "match.secondsLeft", { seconds: hud.cleanBonusWindow.secondsLeft })}</small>
              </div>
            ) : null}
            {hud?.lootChainWindow ? (
              <div className="arcade-loot-chain" aria-label="Loot chain window">
                <span>{localizeText(locale, hud.lootChainWindow.label)}</span>
                <strong>{localizeText(locale, hud.lootChainWindow.detail)}</strong>
                <small>{t(locale, "match.secondsLeft", { seconds: hud.lootChainWindow.secondsLeft })}</small>
              </div>
            ) : null}
            <div className={`arcade-dash ${hud?.dashReady === false ? "cooling" : ""}`} aria-label="Dash status">
              {hud?.dashReady === false ? t(locale, "match.dashCooling") : t(locale, "match.dashReady")}
            </div>
            <div className={`arcade-alibi-pulse ${hud?.alibiPulseStatus?.includes("cooling") ? "cooling" : ""}`} aria-label="Alibi pulse status">
              {localizeText(locale, hud?.alibiPulseStatus ?? t(locale, "match.alibiReady"))}
            </div>
            {hud?.greedStatus ? (
              <div className="arcade-greed" aria-label="Optional relic">
                {localizeText(locale, hud.greedStatus)}
              </div>
            ) : null}
          </div>
          <small>
            {t(locale, "match.controls")}
          </small>
        </section>
      </main>
    );
  }

  const latestEvents = match.lastEvents.length > 0 ? match.lastEvents : match.state.revealLog.slice(-3);
  const selectedActionId = match.selectedActionId ?? match.actionCards[0]?.actionId ?? null;
  const latestBeat = latestEvents.at(-1);
  const executeDisabled = !match.isAiDemo && match.actionCards.length === 0;
  const snapshot = {
    state,
    latestEvents,
    selectedPlayerId: match.selectedPlayerId
  };

  return (
    <main className="cinematic-shell">
      <Suspense
        fallback={
          <div className="heist-stage arcade-loading" aria-label="Loading Neon Moon Heist scene">
            Booting Moon Vault...
          </div>
        }
      >
        <HeistStage snapshot={snapshot} />
      </Suspense>
      <div className="heist-vignette" />

      <header className="heist-topbar" aria-label="Mission status">
        <div>
          <span>Agent Alibi</span>
          <strong>Neon Moon Heist</strong>
        </div>
        <div className="vault-meter" aria-label={`Alarm ${match.state.alarm} of 5`}>
          <span>Alarm {match.state.alarm}/5</span>
          <div>
            {Array.from({ length: 5 }, (_, index) => (
              <i className={index < match.state!.alarm ? "lit" : ""} key={index} />
            ))}
          </div>
        </div>
        <div className="round-chip">Round {match.state.round}/6</div>
      </header>

      <aside className="agent-roster" aria-label="Agents">
        {match.state.players.map((player) => (
          <button
            className={`agent-card ${player.teamId} ${player.status} ${match.selectedPlayerId === player.id ? "selected" : ""}`}
            key={player.id}
            onClick={() => match.selectPlayer(player.id)}
            type="button"
          >
            <span>{shortName(player.name)}</span>
            <strong>{player.name}</strong>
            <small>{player.status === "active" ? player.locationId.replaceAll("-", " ") : player.status}</small>
          </button>
        ))}
      </aside>

      <aside className="radio-console" aria-label="Radio feed">
        <div className="console-heading">
          <Radio size={16} />
          <span>Radio</span>
        </div>
        <div className="radio-lines">
          {match.briefingMessages.slice(-4).map((message) => (
            <p key={message.id}>
              <strong>{message.playerName}</strong>
              <span>{stripSpeaker(message.text)}</span>
            </p>
          ))}
          {latestEvents.slice(-3).map((event) => (
            <p className={`event-line ${event.tone}`} key={event.id}>
              <strong>Vault</strong>
              <span>{event.text}</span>
            </p>
          ))}
        </div>
      </aside>

      <section className="action-dock" aria-label="Planning cards">
        <div className="reveal-caption">
          <span>{latestBeat ? `Round ${latestBeat.round}` : "Briefing"}</span>
          <strong>{latestBeat?.text ?? "Choose a clean lie before the vault starts listening."}</strong>
        </div>

        <div className="action-cards">
          {match.isAiDemo ? (
            <div className="action-card selected">
              <Sparkles size={22} />
              <span>AI spectacle</span>
              <strong>Let agents collide</strong>
              <small>Run the next execution beat.</small>
            </div>
          ) : (
            match.actionCards.map((card) => {
              const Icon = KIND_ICONS[card.kind];
              return (
                <button
                  className={`action-card ${card.role} ${card.risk} ${selectedActionId === card.actionId ? "selected" : ""}`}
                  key={card.id}
                  onClick={() => match.selectAction(card.actionId)}
                  type="button"
                >
                  <Icon size={22} />
                  <span>{card.role}</span>
                  <strong>{card.title}</strong>
                  <small>{card.detail}</small>
                </button>
              );
            })
          )}
        </div>

        <button className="execute-button" disabled={executeDisabled} onClick={match.executeSelectedAction} type="button">
          <Zap size={20} />
          Execute
        </button>
      </section>
    </main>
  );
}

function shortName(name: string): string {
  if (name.toLowerCase().includes("you")) return "YOU";
  return name.slice(0, 3).toUpperCase();
}

function stripSpeaker(text: string): string {
  const separator = text.indexOf(":");
  return separator >= 0 ? text.slice(separator + 1).trim() : text;
}

function radarFocusPrefix(locale: Locale, kind: "player" | "target" | "exit" | "rival" | "carrier", cashoutValue: number | null): string {
  if (kind === "exit" && cashoutValue && cashoutValue > 0) return t(locale, "match.cashoutValue", { cashout: cashoutValue });
  if (kind === "exit") return t(locale, "radar.exit");
  if (kind === "carrier") return t(locale, "radar.carrier");
  return t(locale, "radar.target");
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function extractStatusSeconds(status: string | undefined): number {
  const match = status?.match(/(\d+)s/);
  return match ? Number(match[1]) : 0;
}
