import type { LucideIcon } from "lucide-react";

type HomeAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
};

type HomeScreenProps = {
  actions: HomeAction[];
};

export function HomeScreen({ actions }: HomeScreenProps) {
  return (
    <main className="home-shell">
      <section className="home-panel" aria-label="Agent Alibi launch">
        <div>
          <p className="eyebrow">Moon Vault / 6 rounds / human + AI seats</p>
          <h1>Agent Alibi</h1>
          <p className="home-copy">
            Steal lunar artifacts, cover suspicious teammates, and escape before the vault seals.
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
