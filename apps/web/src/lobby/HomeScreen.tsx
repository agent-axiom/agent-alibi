import type { LucideIcon } from "lucide-react";
import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { formatLocalBestCaseDetail, LOCAL_BEST_CASE_STORAGE_KEY, parseLocalBestCaseRecord, type LocalBestCaseRecord } from "../game-ui/FinalCaseFile";
import type { Locale } from "../i18n";
import { t } from "../i18n";
import { LanguageToggle } from "../game-ui/LanguageToggle";

type HomeAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
};

type HomeScreenProps = {
  actions: HomeAction[];
  soundEnabled: boolean;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onToggleSound: () => void;
};

export function HomeScreen({ actions, soundEnabled, locale, onLocaleChange, onToggleSound }: HomeScreenProps) {
  const SoundIcon = soundEnabled ? Volume2 : VolumeX;
  const [savedBestCase] = useState(readSavedBestCase);

  return (
    <main className="home-shell">
      <LanguageToggle className="home-language-toggle" locale={locale} onLocaleChange={onLocaleChange} />
      <button className={`sound-toggle ${soundEnabled ? "enabled" : ""}`} onClick={onToggleSound} type="button">
        <SoundIcon aria-hidden="true" size={18} />
        <span>{soundEnabled ? t(locale, "sound.on") : t(locale, "sound.off")}</span>
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
          <p className="eyebrow">{t(locale, "home.eyebrow")}</p>
          <h1>Agent Alibi</h1>
          <p className="home-copy">{t(locale, "home.copy")}</p>
        </div>
        {savedBestCase ? (
          <section className="home-best-case" aria-label="Saved best case">
            <span>{t(locale, "home.bestCase")}</span>
            <strong>{savedBestCase.title}</strong>
            <small>{formatLocalBestCaseDetail(savedBestCase, locale)}</small>
            <em>{buildSavedBestCaseCta(savedBestCase, locale)}</em>
          </section>
        ) : null}
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

function buildSavedBestCaseCta(record: LocalBestCaseRecord, locale: Locale): string {
  if (record.carrierIntercepts && record.carrierIntercepts > 0) return t(locale, "home.repeatDenial");
  return t(locale, "home.beatCase");
}

function readSavedBestCase(): LocalBestCaseRecord | null {
  if (typeof window === "undefined") return null;
  try {
    return parseLocalBestCaseRecord(window.localStorage.getItem(LOCAL_BEST_CASE_STORAGE_KEY));
  } catch {
    return null;
  }
}
