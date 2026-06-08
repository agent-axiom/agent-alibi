import { lazy, Suspense } from "react";
import { Eye, Footprints, Gem, Hand, LockKeyhole, Radio, Shield, Sparkles, Volume2, VolumeX, Zap } from "lucide-react";
import type { ActionKind } from "@agent-alibi/shared";
import { selectArcadeHudDensity } from "../arcade/hud-density";
import type { LocalMatchController } from "../local/useLocalMatch";
import { buildArcadeMomentumMeter } from "./arcade-momentum";

type MatchScreenProps = {
  match: LocalMatchController;
  soundEnabled?: boolean;
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

export function MatchScreen({ match, soundEnabled = false, onToggleSound }: MatchScreenProps) {
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
      ? `${radarFocusPrefix(radarFocus.kind, hud?.escapePayout?.cashout ?? null)}: ${radarFocus.label}`
      : "Sweep clear";
    const routeChoice = hud?.routeChoice ?? null;
    const hudDensity = selectArcadeHudDensity(hud);
    const cashoutStepLabel = hud?.escapePayout ? `Cashout +${hud.escapePayout.cashout}` : "Escape";
    const carriedLoot = hud && hud.lootValue > 0 && hud.escapePayout ? { loot: hud.lootValue, cashout: hud.escapePayout.cashout } : null;
    const blueRaceLabel = carriedLoot ? `Blue carrying +${carriedLoot.loot}` : `Blue ${blueLoot}`;
    const redLootLabel = redPendingLoot > 0 ? `AI ${redLoot} (+${redPendingLoot} pending)` : `AI ${redLoot}`;
    const lootScoreLabel = `Loot score: Blue ${blueLoot}, Red banked ${redLoot}${redPendingLoot > 0 ? `, Red pending ${redPendingLoot}` : ""}`;
    const redRaceLabel = redPendingLoot > 0 ? `Red ${redLoot} (+${redPendingLoot} pending)` : `Red ${redLoot}`;
    const raceStatusLabel = redPendingLoot > 0
      ? `Recover +${redPendingLoot} before Red banks`
      : carriedLoot
        ? `Bank +${carriedLoot.cashout} at lift`
        : (hud?.raceStatus ?? "Loot race is tied");
    const SoundIcon = soundEnabled ? Volume2 : VolumeX;
    const routePulse = hud?.routePulse ?? null;
    const rawBreakoutCashoutWindow = hud?.comboCashoutWindow ?? null;
    const scanLockCueActive = hud?.threatCue?.label === "Scan lock" && /jam/i.test(hud.threatCue.action);
    const threatCueActive = Boolean(hud?.threatCue);
    const denseThreatActive = hud?.threatCue?.label === "Laser sweep";
    const countdownPulseActive = hud?.phase === "lockdown";
    const countdownPulseAction = (hud?.lootValue ?? 0) > 0 ? "Cashout now" : "Escape now";
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
      hud?.extractionSequence?.active && hud.extractionSequence.outcome === "escaped"
        ? {
            cashout: hud.extractionSequence.cashoutValue,
            seconds: Math.max(1, Math.ceil(hud.extractionSequence.remainingMs / 1000))
          }
        : null;
    const firstStealCashoutMoment = Boolean(cashoutSurge && hud?.scorePopup?.tone === "loot" && hud.artifactsStolen === 1);
    const lockBreakPayoff = cashoutPayoff ? null : (hud?.lockBreakPayoff ?? null);
    const alibiPayoff = cashoutPayoff || lockBreakPayoff ? null : (hud?.alibiPayoff ?? null);
    const hunterChase = cashoutPayoff || lockBreakPayoff || alibiPayoff ? null : (hud?.hunterChaseCue ?? null);
    const rivalCashoutEmergency = cashoutPayoff || lockBreakPayoff || alibiPayoff || hunterChase ? null : hud?.rivalIntercept?.urgency === "critical" ? hud.rivalIntercept : null;
    const breakoutCashoutWindow = lockBreakPayoff ? null : rawBreakoutCashoutWindow;
    const scanLockActive = !lockBreakPayoff && !alibiPayoff && scanLockCueActive;
    const visibleCashoutSurge = cashoutPayoff || hunterChase || lockBreakPayoff || alibiPayoff ? null : cashoutSurge;
    const visibleScorePopup = cashoutPayoff || lockBreakPayoff || alibiPayoff || firstStealCashoutMoment ? null : (hud?.scorePopup ?? null);
    const visibleSpotlight = cashoutPayoff || lockBreakPayoff || alibiPayoff || firstStealCashoutMoment ? null : (hud?.spotlight ?? null);
    const visibleObjectiveBanner = cashoutPayoff || lockBreakPayoff || alibiPayoff || rivalCashoutEmergency || (firstStealCashoutMoment && hud?.objectiveBanner?.tone === "escape") ? null : (hud?.objectiveBanner ?? null);
    const visibleRoutePulse = cashoutPayoff || lockBreakPayoff || alibiPayoff || (firstStealCashoutMoment && routePulse?.mode === "escape") ? null : routePulse;
    const afterburnerActive = Boolean(hud?.lootSpeedSurge);
    const rivalPressureActive = Boolean(redLoot > 0 || hud?.rivalObjective || hud?.rivalIntercept || hud?.lastRivalSteal);
    const carrierPressureActive = Boolean(hud?.rivalIntercept);
    const carrierEmergencyInteractReady = Boolean(
      rivalCashoutEmergency &&
        hud?.activeAction.key.toLowerCase().startsWith("e") &&
        /recover|intercept/i.test(hud.activeAction.label)
    );
    const displayedActiveAction = rivalCashoutEmergency && !carrierEmergencyInteractReady
      ? { key: "Move", label: `Close gap ${rivalCashoutEmergency.distanceMeters}m`, tone: "danger" as const }
      : (hud?.activeAction ?? null);
    const displayedPrompt = rivalCashoutEmergency
      ? carrierEmergencyInteractReady
        ? "Press E / Space to intercept"
        : "Red cashout imminent"
      : (hud?.prompt ?? (hud?.phase === "lockdown" ? "Lockdown" : hud?.phase === "alarm" ? "Alarm rising" : "Heist live"));
    const displayedObjective = rivalCashoutEmergency ? `Intercept ${rivalCashoutEmergency.agentName} before lift` : (hud?.objective ?? "Steal a relic before the vault learns your name");
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
    const openingTargetRoute = hud?.targetDistanceLabel?.replace(new RegExp("^Target\\s+", "i"), "") ?? "gold marker";
    return (
      <main
        className={`arcade-shell ${hud?.phase ?? "stealth"} ${hudDensity === "opening" ? "compact-opening" : ""} ${hudDensity === "chase" ? "chase-compact" : ""} ${firstStealCashoutMoment ? "first-steal-cashout-moment" : ""} ${cashoutPayoff ? "cashout-payoff-active" : ""} ${hunterChase ? "hunter-chase-active" : ""} ${alibiPayoff ? "alibi-payoff-active" : ""} ${lockBreakPayoff ? "lock-break-payoff-active" : ""} ${breachAlert ? "breach-alert" : ""} ${visibleRoutePulse ? "route-pulse-active" : ""} ${visibleRoutePulse?.mode === "alibi" ? "alibi-pulse-active" : ""} ${visibleRoutePulse?.mode === "comeback" ? "comeback-pulse-active" : ""} ${breakoutCashoutWindow ? "breakout-cashout-active" : ""} ${rivalCashoutEmergency ? "rival-cashout-emergency-active" : ""} ${scanLockActive ? "scan-lock-active" : ""} ${threatCueActive ? "threat-cue-active" : ""} ${denseThreatActive ? "dense-threat-active" : ""} ${countdownPulseActive ? "countdown-pulse-active" : ""} ${afterburnerActive ? "afterburner-active" : ""} ${rivalPressureActive ? "rival-pressure-active" : ""}`}
      >
        <Suspense
          fallback={
            <div className="arcade-stage arcade-loading" aria-label="Loading Moon Vault arcade scene">
              Booting Moon Vault...
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
        {cashoutPayoff ? (
          <div className="arcade-cashout-payoff" aria-label="Cashout payoff" aria-live="assertive">
            <span>Extraction live</span>
            <strong>Cashout banked +{cashoutPayoff.cashout}</strong>
            <small>{cashoutPayoff.seconds}s until case file</small>
          </div>
        ) : null}
        {visibleCashoutSurge ? (
          <div className="arcade-cashout-surge" aria-label="Cashout surge" aria-live="polite">
            <span>Run to lift</span>
            <strong>Bank +{visibleCashoutSurge.cashout}</strong>
            {visibleCashoutSurge.afterburner ? (
              <>
                <small className="arcade-cashout-afterburner">
                  Afterburner x{visibleCashoutSurge.afterburner.multiplier.toFixed(2)} · {visibleCashoutSurge.afterburner.secondsLeft}s boost
                </small>
                <small className="arcade-cashout-afterburner">Afterburner exit +1</small>
              </>
            ) : null}
            <small>{visibleCashoutSurge.seconds}s before scans · cashout or greed</small>
          </div>
        ) : null}
        {hunterChase ? (
          <div className="arcade-hunter-chase" aria-label="Hunter chase" aria-live="assertive">
            <span>{hunterChase.agentName} lock-on</span>
            <strong>Dash to break lock</strong>
            <small>{hunterChase.distanceMeters}m closing · {hunterChase.beamCount} beams live</small>
          </div>
        ) : null}
        {rivalCashoutEmergency ? (
          <div className="arcade-rival-cashout-emergency" aria-label="Rival cashout emergency" aria-live="assertive">
            <span>Red cashout imminent</span>
            <strong>Intercept now</strong>
            <small>Deny Red +{rivalCashoutEmergency.value} / swing +{rivalCashoutEmergency.swingValue}</small>
            <small>{rivalCashoutEmergency.agentName} is {rivalCashoutEmergency.distanceMeters}m from lift · {rivalCashoutEmergency.cashoutSeconds}s</small>
          </div>
        ) : null}
        {lockBreakPayoff ? (
          <div className="arcade-lock-break-payoff" aria-label="Lock break payoff" aria-live="assertive">
            <span>Lock broken</span>
            <strong>Breakout cashout +{lockBreakPayoff.cashoutValue}</strong>
            <div className="arcade-lock-break-contract">
              <b>Bank now</b>
              <small>+{lockBreakPayoff.baseCashoutValue} loot +{lockBreakPayoff.bonus} breakout</small>
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
            <small>Rook scan jammed · {lockBreakPayoff.secondsLeft}s to bank</small>
          </div>
        ) : null}
        {alibiPayoff ? (
          <div className="arcade-alibi-payoff" aria-label="Alibi pulse payoff" aria-live="polite">
            <span>{alibiPayoff.label}</span>
            <strong>{alibiPayoff.result}</strong>
            <small>{alibiPayoff.detail}</small>
            <small>{alibiPayoff.action}</small>
          </div>
        ) : null}
        {breakoutCashoutWindow ? (
          <div className="arcade-breakout-cashout" aria-label="Breakout cashout window" aria-live="polite">
            <span>{breakoutCashoutWindow.label}</span>
            <strong>+{breakoutCashoutWindow.bonus} bonus</strong>
            <small>Cashout +{breakoutCashoutWindow.cashoutValue}</small>
            <small>{breakoutCashoutWindow.secondsLeft}s to bank</small>
          </div>
        ) : null}
        {scanLockActive ? (
          <div className="arcade-scan-lock-pulse" aria-label="Scan lock pulse">
            <span>Scan lock</span>
            <strong>Press E / Space</strong>
            <small>Jam scan before alarm burns</small>
          </div>
        ) : null}
        {countdownPulseActive ? (
          <div className="arcade-countdown-pulse" aria-label="Final countdown pulse">
            <span>Final 30s</span>
            <strong>{countdownPulseAction}</strong>
            <small>{formatClock(hud.timeLeftMs)} before the vault seals</small>
          </div>
        ) : null}
        {visibleRoutePulse ? (
          <div className={`arcade-route-pulse ${visibleRoutePulse.mode}`} aria-label="Route pulse">
            <span>{visibleRoutePulse.title}</span>
            <strong>{visibleRoutePulse.detail}</strong>
            <small>{visibleRoutePulse.action}</small>
          </div>
        ) : null}

        {hudDensity === "opening" ? (
          <aside className="arcade-opening-contract" aria-label="Opening contract">
            <span>Moon Vault Contract</span>
            <strong>Steal Moon Pearl +3</strong>
            <div>
              <small>1</small>
              <b>{"Moon Pearl - " + openingTargetRoute}</b>
            </div>
            <div>
              <small>2</small>
              <b>Cashout at Atrium Lift</b>
            </div>
            <div>
              <small>3</small>
              <b>Press E / Space at relic</b>
            </div>
          </aside>
        ) : null}

        {visibleObjectiveBanner ? (
          <div className={`arcade-objective-banner ${visibleObjectiveBanner.tone}`} aria-label="Objective banner" aria-live="polite">
            <span>{visibleObjectiveBanner.tone === "greed" ? "Optional risk" : visibleObjectiveBanner.tone === "escape" ? "Cashout window" : "Primary target"}</span>
            <strong>{visibleObjectiveBanner.title}</strong>
            <small>{visibleObjectiveBanner.detail}</small>
          </div>
        ) : null}

        <header className="arcade-topbar" aria-label="Live mission status">
          <div className="mission-title">
            <span>Agent Alibi</span>
            <strong>Moon Vault Run</strong>
            {onToggleSound ? (
              <button
                aria-label={soundEnabled ? "Sound On" : "Sound Off"}
                className={`arcade-sound-toggle ${soundEnabled ? "enabled" : ""}`}
                onClick={onToggleSound}
                title={soundEnabled ? "Sound On" : "Sound Off"}
                type="button"
              >
                <SoundIcon aria-hidden="true" size={18} />
              </button>
            ) : null}
          </div>
          <div className="arcade-stat">
            <span>Timer</span>
            <strong>{formatClock(hud?.timeLeftMs ?? 0)}</strong>
          </div>
          <div aria-label={lootScoreLabel} className={`arcade-stat arcade-loot-stat ${redPendingLoot > 0 ? "rival-pending" : ""}`}>
            <span>Loot</span>
            <strong>
              {blueLoot} / {redLootLabel}
            </strong>
          </div>
          <div className="arcade-alarm" aria-label={`Alarm ${hud?.alarm ?? match.state.alarm} of 5`}>
            <span>Alarm</span>
            <div>
              {Array.from({ length: 5 }, (_, index) => (
                <i className={index < (hud?.alarm ?? state.alarm) ? "lit" : ""} key={index} />
              ))}
            </div>
          </div>
          <div className={`arcade-condition ${hud?.vaultCondition.tone ?? "stable"}`} aria-label="Vault condition">
            <span>{hud?.vaultCondition.label ?? "Vault Stable"}</span>
            <strong>{hud?.vaultCondition.detail ?? "Low profile"}</strong>
          </div>
        </header>

        <aside className="arcade-radar" aria-label="Mini radar">
          <span>Radar</span>
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
            {visibleSpotlight}
          </div>
        ) : null}

        {visibleScorePopup ? (
          <div className={`arcade-score-popup ${visibleScorePopup.tone}`} aria-label="Score popup" aria-live="polite">
            <strong>{visibleScorePopup.label}</strong>
            <span>{visibleScorePopup.detail}</span>
          </div>
        ) : null}

        {visibleRivalBark ? (
          <div className={`arcade-rival-bark ${visibleRivalBark.tone}`} aria-label="Rival comms" aria-live="polite">
            <span>{visibleRivalBark.agentName}</span>
            <strong>{visibleRivalBark.line}</strong>
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
            <span>Radio</span>
          </div>
          {(hud?.feed ?? ["Moon Vault breach started."]).slice(-5).map((line, index) => (
            <p key={`${line}-${index}`}>{line}</p>
          ))}
        </aside>

        <section className="arcade-objective" aria-label="Current objective">
          <span>{displayedPrompt}</span>
          <strong>{displayedObjective}</strong>
          <div className={`arcade-active-action ${displayedActiveAction?.tone ?? "neutral"}`} aria-label="Active action">
            <kbd>{displayedActiveAction?.key ?? "Move"}</kbd>
            <span>{displayedActiveAction?.label ?? "Follow marker"}</span>
          </div>
          {displayedObjectiveCompass ? (
            <div className={`arcade-objective-compass ${displayedObjectiveCompass.tone}`} aria-label="Objective compass">
              <span>{displayedObjectiveCompass.verb}</span>
              <strong>{displayedObjectiveCompass.target}</strong>
              <i>{displayedObjectiveCompass.route}</i>
              <small>{displayedObjectiveCompass.detail}</small>
            </div>
          ) : null}
          {hud?.rivalObjective ? (
            <div className={`arcade-rival-objective ${hud.rivalObjective.tone}`} aria-label="Rival objective">
              <span>{hud.rivalObjective.label}</span>
              <strong>{hud.rivalObjective.title}</strong>
              <small>{hud.rivalObjective.detail}</small>
              <em>{hud.rivalObjective.action}</em>
            </div>
          ) : null}
          {hud?.missionBeat ? (
            <div className={`arcade-mission-beat ${hud.missionBeat.tone}`} aria-label="Mission beat">
              <span>{hud.missionBeat.kicker}</span>
              <strong>{hud.missionBeat.title}</strong>
              <p>{hud.missionBeat.detail}</p>
              <small>{hud.missionBeat.action}</small>
              {hud.directorCue ? (
                <div className={"arcade-director-cue " + hud.directorCue.tone} aria-label="Heist director cue">
                  <span>{hud.directorCue.label}</span>
                  <strong>{hud.directorCue.title}</strong>
                  <p>{hud.directorCue.detail}</p>
                  <em>{hud.directorCue.reward}</em>
                </div>
              ) : null}
            </div>
          ) : null}
          {hud?.threatCue ? (
            <div className={`arcade-threat-cue ${hud.threatCue.tone}`} aria-label="Threat vector">
              <strong>{hud.threatCue.label}</strong>
              <span>{hud.threatCue.detail}</span>
              <small>{hud.threatCue.action}</small>
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
                <b>{step.number}</b> {step.label}
              </span>
            ))}
          </div>
          <div className="arcade-mission-meta">
            <div className={`arcade-race ${raceTone}`} aria-label="Heist race">
              <span>Heist Race</span>
              <div>
                <strong>{blueRaceLabel}</strong>
                <i />
                <strong>{redRaceLabel}</strong>
              </div>
              <small>{raceStatusLabel}</small>
            </div>
            {hud?.lastRivalSteal ? (
              <div className="arcade-rival-loot" aria-label="Rival loot alert">
                {hud.lastRivalSteal}
              </div>
            ) : null}
            {hud?.rivalIntercept ? (
              <div className={`arcade-rival-intercept ${hud.rivalIntercept.urgency}`} aria-label="Rival intercept">
                <span>{hud.rivalIntercept.agentName} carrying</span>
                <strong>
                  {hud.rivalIntercept.relicName} +{hud.rivalIntercept.value}
                </strong>
                <small>
                  {hud.rivalIntercept.distanceMeters}m away ·{" "}
                  {hud.rivalIntercept.urgency === "critical" ? "cashout imminent" : `cashout in ${hud.rivalIntercept.cashoutSeconds}s`} · intercept with E · deny Red +{hud.rivalIntercept.value} / swing +{hud.rivalIntercept.swingValue}
                </small>
              </div>
            ) : null}
            {carriedLoot ? (
              <div className="arcade-carried-loot" aria-label="Carried loot">
                <span>Carrying +{carriedLoot.loot}</span>
                <strong>Bank +{carriedLoot.cashout} at lift</strong>
              </div>
            ) : null}
            {hud?.escapePayout ? (
              <div className="arcade-escape-payout" aria-label="Escape payout">
                <span>Escape bonus +{hud.escapePayout.escapeBonus}</span>
                <strong>Cashout {hud.escapePayout.cashout}</strong>
              </div>
            ) : null}
            {hud?.extractionCue ? (
              <div className={`arcade-extraction-cue ${hud.extractionCue.tone}`} aria-label="Extraction cue">
                <span>{hud.extractionCue.label}</span>
                <strong>{hud.extractionCue.detail}</strong>
                <small>{hud.extractionCue.action}</small>
              </div>
            ) : null}
            {routeChoice ? (
              <div className={`arcade-route-choice ${routeChoice.mode}`} aria-label="Route choice">
                <span>{routeChoice.mode === "greed" ? "Greed armed" : `Bank +${routeChoice.cashoutNow} now`}</span>
                <strong>
                  Risk +{routeChoice.greedRelicValue}: {routeChoice.greedRelicName}
                </strong>
                <small>
                  {routeChoice.mode === "greed"
                    ? `Projected cashout +${routeChoice.projectedCashout} · ${routeChoice.greedDistanceMeters}m to relic`
                    : `Press G for cashout +${routeChoice.projectedCashout} · ${routeChoice.greedDistanceMeters}m detour`}
                </small>
              </div>
            ) : null}
            <div className="arcade-route" aria-label="Route distance">
              {hud?.targetDistanceLabel ?? "Target plotting"}
            </div>
            <div className="arcade-rivals" aria-label="Rival crew status">
              {hud?.rivalStatus ?? "Rivals scanning"}
            </div>
            <div className={`arcade-rival-scan ${hud?.rivalPressureLevel ?? "standby"}`} aria-label="Nearest rival">
              {hud?.rivalDistanceLabel ?? "Nearest rival scanning"}
            </div>
            <div className={`arcade-scan-meter ${hud?.rivalScanStatus.tone ?? "idle"}`} aria-label="Rival scan meter">
              <span>{hud?.rivalScanStatus.label ?? "Scan clear"}</span>
              <i>
                <b style={{ width: `${hud?.rivalScanStatus.progress ?? 0}%` }} />
              </i>
            </div>
            <div className="arcade-pace" aria-label="Run pace">
              {hud?.paceStatus ?? "Pace unknown"}
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
                  <span>Momentum</span>
                  <strong>{momentumMeter.label}</strong>
                  <small>{momentumMeter.detail}</small>
                </div>
                <i>
                  <b style={{ width: `${momentumMeter.value}%` }} />
                </i>
                <em>{momentumMeter.action}</em>
              </div>
            ) : null}
            {hud?.cleanBonusWindow ? (
              <div className="arcade-clean-bonus" aria-label="Clean bonus window">
                <span>{hud.cleanBonusWindow.label}</span>
                <strong>{hud.cleanBonusWindow.detail}</strong>
                <small>{hud.cleanBonusWindow.secondsLeft}s left</small>
              </div>
            ) : null}
            {hud?.lootChainWindow ? (
              <div className="arcade-loot-chain" aria-label="Loot chain window">
                <span>{hud.lootChainWindow.label}</span>
                <strong>{hud.lootChainWindow.detail}</strong>
                <small>{hud.lootChainWindow.secondsLeft}s left</small>
              </div>
            ) : null}
            <div className={`arcade-dash ${hud?.dashReady === false ? "cooling" : ""}`} aria-label="Dash status">
              {hud?.dashReady === false ? "Dash cooling" : "Dash ready"}
            </div>
            <div className={`arcade-alibi-pulse ${hud?.alibiPulseStatus?.includes("cooling") ? "cooling" : ""}`} aria-label="Alibi pulse status">
              {hud?.alibiPulseStatus ?? "Alibi ready"}
            </div>
            {hud?.greedStatus ? (
              <div className="arcade-greed" aria-label="Optional relic">
                {hud.greedStatus}
              </div>
            ) : null}
          </div>
          <small>
            WASD / arrows move · click to run · Shift dash · E / Space interact · G route
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

function radarFocusPrefix(kind: "player" | "target" | "exit" | "rival" | "carrier", cashoutValue: number | null): string {
  if (kind === "exit" && cashoutValue && cashoutValue > 0) return `Cashout +${cashoutValue}`;
  if (kind === "exit") return "Exit";
  if (kind === "carrier") return "Carrier";
  return "Target";
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
