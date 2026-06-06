import { lazy, Suspense } from "react";
import { Eye, Footprints, Gem, Hand, LockKeyhole, Radio, Shield, Sparkles, Zap } from "lucide-react";
import type { ActionKind } from "@agent-alibi/shared";
import type { LocalMatchController } from "../local/useLocalMatch";

type MatchScreenProps = {
  match: LocalMatchController;
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

export function MatchScreen({ match }: MatchScreenProps) {
  if (!match.state) return null;
  const state = match.state;

  if (match.arcade?.enabled) {
    const hud = match.arcade.hud;
    return (
      <main className={`arcade-shell ${hud?.phase ?? "stealth"}`}>
        <Suspense
          fallback={
            <div className="arcade-stage arcade-loading" aria-label="Loading Moon Vault arcade scene">
              Booting Moon Vault...
            </div>
          }
        >
          <ArcadeHeistStage
            state={state}
            runId={match.arcade.runId}
            onHudUpdate={match.arcade.updateHud}
            onFinish={match.arcade.finishMission}
          />
        </Suspense>
        <div className="arcade-vignette" />

        <header className="arcade-topbar" aria-label="Live mission status">
          <div className="mission-title">
            <span>Agent Alibi</span>
            <strong>Moon Vault Run</strong>
          </div>
          <div className="arcade-stat">
            <span>Timer</span>
            <strong>{formatClock(hud?.timeLeftMs ?? 0)}</strong>
          </div>
          <div className="arcade-stat">
            <span>Loot</span>
            <strong>
              {hud?.lootValue ?? 0} / AI {hud?.aiLootValue ?? 0}
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
        </header>

        {hud?.spotlight ? (
          <div className="arcade-spotlight" aria-live="polite">
            {hud.spotlight}
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
          <span>{hud?.prompt ?? (hud?.phase === "lockdown" ? "Lockdown" : hud?.phase === "alarm" ? "Alarm rising" : "Heist live")}</span>
          <strong>{hud?.objective ?? "Steal a relic before the vault learns your name"}</strong>
          <div className={`arcade-active-action ${hud?.activeAction.tone ?? "neutral"}`} aria-label="Active action">
            <kbd>{hud?.activeAction.key ?? "Move"}</kbd>
            <span>{hud?.activeAction.label ?? "Follow marker"}</span>
          </div>
          <div className="arcade-steps" aria-label="Mission loop">
            <span className={hud?.loopStep === "steal" ? "active" : ""}>
              <b>1</b> Steal
            </span>
            <span className={hud?.loopStep === "escape" ? "active" : ""}>
              <b>2</b> Escape
            </span>
            <span>
              <b>3</b> Case File
            </span>
          </div>
          <div className="arcade-mission-meta">
            <div className="arcade-route" aria-label="Route distance">
              {hud?.targetDistanceLabel ?? "Target plotting"}
            </div>
            <div className="arcade-rivals" aria-label="Rival crew status">
              {hud?.rivalStatus ?? "Rivals scanning"}
            </div>
            <div className={`arcade-rival-scan ${hud?.rivalPressureLevel ?? "standby"}`} aria-label="Nearest rival">
              {hud?.rivalDistanceLabel ?? "Nearest rival scanning"}
            </div>
            <div className="arcade-pace" aria-label="Run pace">
              {hud?.paceStatus ?? "Pace unknown"}
            </div>
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
            {hud?.raceStatus ?? "Loot race is tied"} · WASD / arrows move · click to run · Shift dash · E / Space interact · G route
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

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
