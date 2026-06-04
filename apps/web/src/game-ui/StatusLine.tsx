import { AlarmClock, Bot, Lock } from "lucide-react";
import type { GameState } from "@agent-alibi/shared";

type StatusLineProps = {
  state: GameState;
  isAiDemo: boolean;
};

export function StatusLine({ state, isAiDemo }: StatusLineProps) {
  const activeHumans = state.players.filter((player) => player.kind === "human" && player.status === "active").length;
  const activeAi = state.players.filter((player) => player.kind === "ai" && player.status === "active").length;

  return (
    <header className="statusline">
      <div>
        <strong>Round {state.round}/{state.maxRounds}</strong>
        <span>Moon Vault</span>
      </div>
      <div>
        <AlarmClock aria-hidden="true" size={18} />
        <span>Alarm {state.alarm}/5</span>
      </div>
      <div>
        <Bot aria-hidden="true" size={18} />
        <span>{activeAi} AI active</span>
      </div>
      <div>
        <Lock aria-hidden="true" size={18} />
        <span>{isAiDemo ? "Demo reveal" : `${activeHumans} human ready`}</span>
      </div>
    </header>
  );
}
