import { Bot, Play, X } from "lucide-react";
import type { GameState, LegalAction, PublicRoomState } from "@agent-alibi/shared";

type RoomScreenProps = {
  room: PublicRoomState | null;
  state: GameState | null;
  legalActions: LegalAction[];
  error: string | null;
  onAddAi: (profileId: string) => void;
  onRemoveAi: (slotId: string) => void;
  onStart: () => void;
};

const PROFILE_IDS = ["rook", "moth", "gremlin", "vesper", "anchor"];

export function RoomScreen({ room, state, legalActions, error, onAddAi, onRemoveAi, onStart }: RoomScreenProps) {
  if (state) {
    return null;
  }

  return (
    <main className="room-shell">
      <section className="room-lobby" aria-label="Room lobby">
        <div>
          <p className="eyebrow">Invite Link</p>
          <h1>{room ? `Room ${room.code}` : "Creating Room"}</h1>
          <p className="home-copy">{room ? `${window.location.origin}/room/${room.code}` : "Connecting to the heist server..."}</p>
          {error ? <p className="error-line">{error}</p> : null}
        </div>
        <div className="slot-list">
          {(room?.slots ?? []).map((slot) => (
            <div className="slot-row" key={slot.id}>
              <span>{slot.kind === "empty" ? "Empty Slot" : slot.name}</span>
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
              Add {profileId}
            </button>
          ))}
        </div>
        <button className="primary-action" onClick={onStart}>
          <Play aria-hidden="true" size={20} />
          Start Match
        </button>
      </section>
    </main>
  );
}
