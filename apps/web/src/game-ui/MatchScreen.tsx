import { Eye, Footprints, Gem, Hand, LockKeyhole, Radio, Shield, Sparkles, Zap } from "lucide-react";
import type { ActionKind } from "@agent-alibi/shared";
import { HeistStage } from "../heist/HeistStage";
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

export function MatchScreen({ match }: MatchScreenProps) {
  if (!match.state) return null;

  const latestEvents = match.lastEvents.length > 0 ? match.lastEvents : match.state.revealLog.slice(-3);
  const selectedActionId = match.selectedActionId ?? match.actionCards[0]?.actionId ?? null;
  const latestBeat = latestEvents.at(-1);
  const executeDisabled = !match.isAiDemo && match.actionCards.length === 0;
  const snapshot = {
    state: match.state,
    latestEvents,
    selectedPlayerId: match.selectedPlayerId
  };

  return (
    <main className="cinematic-shell">
      <HeistStage snapshot={snapshot} />
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
