import { useEffect, useMemo, useState } from "react";
import { OnlineRoomClient, type OnlineRoomSnapshot } from "./client";

export function useOnlineRoom() {
  const client = useMemo(() => new OnlineRoomClient(), []);
  const [snapshot, setSnapshot] = useState<OnlineRoomSnapshot>({
    room: null,
    state: null,
    legalActions: [],
    summary: null,
    error: null
  });

  useEffect(() => client.subscribe(setSnapshot), [client]);

  return {
    ...snapshot,
    connect: () => client.connect(),
    createRoom: (playerName: string) => client.createRoom(playerName),
    joinRoom: (roomCode: string, playerName: string) => client.joinRoom(roomCode, playerName),
    addAi: (profileId: string) => client.addAi(profileId),
    removeAi: (slotId: string) => client.removeAi(slotId),
    startMatch: () => client.startMatch(),
    lockAction: (actionId: string) => client.lockAction(actionId)
  };
}
