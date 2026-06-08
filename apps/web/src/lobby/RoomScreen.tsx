import { Bot, Play, X } from "lucide-react";
import type { Locale } from "../i18n";
import { t } from "../i18n";
import { LanguageToggle } from "../game-ui/LanguageToggle";
import type { GameState, LegalAction, PublicRoomState } from "@agent-alibi/shared";

type RoomScreenProps = {
  room: PublicRoomState | null;
  state: GameState | null;
  legalActions: LegalAction[];
  error: string | null;
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  onAddAi: (profileId: string) => void;
  onRemoveAi: (slotId: string) => void;
  onStart: () => void;
};

const PROFILE_IDS = ["rook", "moth", "gremlin", "vesper", "anchor"];

export function RoomScreen({ room, state, legalActions, error, locale = "en", onLocaleChange, onAddAi, onRemoveAi, onStart }: RoomScreenProps) {
  if (state) {
    return null;
  }

  return (
    <main className="room-shell">
      <section className="room-lobby" aria-label="Room lobby">
        {onLocaleChange ? <LanguageToggle locale={locale} onLocaleChange={onLocaleChange} /> : null}
        <div>
          <p className="eyebrow">{t(locale, "room.inviteLink")}</p>
          <h1>{room ? `Room ${room.code}` : t(locale, "room.creating")}</h1>
          <p className="home-copy">{room ? `${window.location.origin}/room/${room.code}` : t(locale, "room.connecting")}</p>
          {error ? <p className="error-line">{error}</p> : null}
        </div>
        <div className="slot-list">
          {(room?.slots ?? []).map((slot) => (
            <div className="slot-row" key={slot.id}>
              <span>{slot.kind === "empty" ? t(locale, "room.emptySlot") : slot.name}</span>
              <small>{slot.kind === "ai" ? slot.agentProfileId : slot.kind}</small>
              {slot.kind === "ai" ? (
                <button aria-label={`Remove ${slot.name}`} onClick={() => onRemoveAi(slot.id)}>
                  <X aria-hidden="true" size={16} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <div className="agent-picker">
          {PROFILE_IDS.map((profileId) => (
            <button key={profileId} onClick={() => onAddAi(profileId)}>
              <Bot aria-hidden="true" size={18} />
              {t(locale, "room.addAgent", { profileId })}
            </button>
          ))}
        </div>
        <button className="primary-action" onClick={onStart}>
          <Play aria-hidden="true" size={20} />
          {t(locale, "room.startMatch")}
        </button>
      </section>
    </main>
  );
}
