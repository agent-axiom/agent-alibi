import type { LucideIcon } from "lucide-react";
import { Volume2, VolumeX } from "lucide-react";

type HomeAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
};

type HomeScreenProps = {
  actions: HomeAction[];
  soundEnabled: boolean;
  onToggleSound: () => void;
};

export function HomeScreen({ actions, soundEnabled, onToggleSound }: HomeScreenProps) {
  const SoundIcon = soundEnabled ? Volume2 : VolumeX;

  return (
    <main className="home-shell">
      <button className={`sound-toggle ${soundEnabled ? "enabled" : ""}`} onClick={onToggleSound} type="button">
        <SoundIcon aria-hidden="true" size={18} />
        <span>{soundEnabled ? "Sound On" : "Sound Off"}</span>
      </button>
      <div className="home-visual" aria-hidden="true">
        <span className="vault-beam" />
        <i className="vault-room room-a" />
        <i className="vault-room room-b" />
        <i className="vault-room room-c" />
        <i className="vault-agent agent-a" />
        <i className="vault-agent agent-b" />
        <i className="vault-gem" />
      </div>
      <section className="home-panel" aria-label="Agent Alibi launch">
        <div>
          <p className="eyebrow">Neon Moon Heist / six rounds / human + AI crew</p>
          <h1>Agent Alibi</h1>
          <p className="home-copy">
            Pick a plan, watch agents lie through lasers, steal lunar relics, and escape before the vault seals.
          </p>
        </div>
        <div className="home-actions">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button className="primary-action" key={action.label} onClick={action.onClick}>
                <Icon aria-hidden="true" size={22} />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
