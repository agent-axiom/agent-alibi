import { Eye, Footprints, Hand, LockKeyhole, Shield, Siren, Sparkles } from "lucide-react";
import type { ActionKind, LegalAction } from "@agent-alibi/shared";

type ActionPanelProps = {
  actions: LegalAction[];
  isAiDemo: boolean;
  onLock: (actionId: string) => void;
  onAdvanceAiOnly: () => void;
};

const ICONS: Record<ActionKind, typeof Footprints> = {
  move: Footprints,
  scout: Eye,
  steal: Sparkles,
  distract: Siren,
  guard: Shield,
  sabotage: LockKeyhole,
  cover: Hand,
  escape: Footprints
};

export function ActionPanel({ actions, isAiDemo, onLock, onAdvanceAiOnly }: ActionPanelProps) {
  return (
    <section className="panel action-panel" aria-label="Actions">
      <div className="panel-heading">
        <h2>{isAiDemo ? "AI Demo" : "Lock Action"}</h2>
      </div>
      {isAiDemo ? (
        <button className="lock-button" onClick={onAdvanceAiOnly}>
          Advance AI Round
        </button>
      ) : (
        <div className="action-grid">
          {actions.length === 0 ? (
            <button className="lock-button" onClick={onAdvanceAiOnly}>
              Watch AI Round
            </button>
          ) : (
            actions.map((action) => {
              const Icon = ICONS[action.kind];
              return (
                <button className={`action-button risk-${action.risk}`} key={action.id} onClick={() => onLock(action.id)}>
                  <Icon aria-hidden="true" size={18} />
                  <span>{action.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
