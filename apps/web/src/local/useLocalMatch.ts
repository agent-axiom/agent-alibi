import { useMemo, useState } from "react";
import type { GameState, LegalAction, MatchSummary, RevealEvent } from "@agent-alibi/shared";
import { chooseFallbackDecision } from "@agent-alibi/ai";
import { buildMatchSummary, createInitialGameState, generateLegalActions, resolveRound } from "@agent-alibi/game";
import { buildArcadeMatchSummary, type ArcadeMissionResult } from "../arcade/arcade-rules";
import { ARCADE_MISSION_DURATION_MS, type ArcadeController, type ArcadeHudState } from "../arcade/arcade-types";
import { buildMissionBeat } from "../arcade/mission-beats";
import { buildActionCards, type ActionCard } from "../game-ui/action-cards";

type BriefingMessage = {
  id: string;
  playerName: string;
  text: string;
};

export type LocalMatchController = {
  state: GameState | null;
  legalActions: LegalAction[];
  actionCards: ActionCard[];
  briefingMessages: BriefingMessage[];
  lastEvents: RevealEvent[];
  summary: MatchSummary | null;
  isAiDemo: boolean;
  arcade?: ArcadeController;
  selectedActionId: string | null;
  selectedPlayerId?: string;
  startSolo: () => void;
  startAiDemo: () => void;
  selectAction: (actionId: string) => void;
  selectPlayer: (playerId: string) => void;
  executeSelectedAction: () => void;
  lockAction: (actionId: string) => void;
  advanceAiOnly: () => void;
  reset: () => void;
};

const HUMAN_ID = "p-human";
const SOLO_AI_PROFILES = ["rook", "gremlin", "anchor"];
const AI_DEMO_PROFILES = ["rook", "moth", "gremlin", "vesper"];

export function useLocalMatch(): LocalMatchController {
  const [state, setState] = useState<GameState | null>(null);
  const [briefingMessages, setBriefingMessages] = useState<BriefingMessage[]>([]);
  const [lastEvents, setLastEvents] = useState<RevealEvent[]>([]);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [isAiDemo, setIsAiDemo] = useState(false);
  const [arcadeHud, setArcadeHud] = useState<ArcadeHudState | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>(HUMAN_ID);

  const legalActions = useMemo(() => {
    if (!state || summary || isAiDemo) return [];
    return generateLegalActions(state, HUMAN_ID);
  }, [isAiDemo, state, summary]);

  const actionCards = useMemo(() => {
    if (!state || summary || isAiDemo) return [];
    return buildActionCards(state, legalActions);
  }, [isAiDemo, legalActions, state, summary]);

  function startSolo() {
    const nextState = createInitialGameState({
      matchId: `local-${Date.now()}`,
      humanPlayerName: "Agent You",
      aiProfileIds: SOLO_AI_PROFILES,
      seed: "solo-seed"
    });
    setState(nextState);
    setSummary(null);
    setIsAiDemo(false);
    setArcadeHud(makeInitialArcadeHud(nextState));
    setLastEvents(nextState.revealLog.slice(-1));
    setSelectedActionId(null);
    setSelectedPlayerId(HUMAN_ID);
    setBriefingMessages(makeBriefing(nextState));
  }

  function startAiDemo() {
    const nextState = createInitialGameState({
      matchId: `demo-${Date.now()}`,
      humanPlayerName: "Rook",
      aiProfileIds: AI_DEMO_PROFILES,
      seed: "ai-demo-seed"
    });
    nextState.players[0]!.kind = "ai";
    nextState.players[0]!.agentProfileId = "rook";
    setState(nextState);
    setSummary(null);
    setIsAiDemo(true);
    setArcadeHud(null);
    setLastEvents(nextState.revealLog.slice(-1));
    setSelectedActionId(null);
    setSelectedPlayerId(nextState.players[0]?.id);
    setBriefingMessages(makeBriefing(nextState));
  }

  function selectAction(actionId: string) {
    setSelectedActionId(actionId);
  }

  function selectPlayer(playerId: string) {
    setSelectedPlayerId(playerId);
  }

  function executeSelectedAction() {
    if (isAiDemo) {
      advanceAiOnly();
      return;
    }
    const actionId = selectedActionId ?? actionCards[0]?.actionId;
    if (actionId) {
      lockAction(actionId);
    }
  }

  function lockAction(actionId: string) {
    if (!state) return;
    const humanAction = legalActions.find((action) => action.id === actionId);
    playRound(humanAction);
  }

  function advanceAiOnly() {
    playRound(undefined);
  }

  function playRound(humanAction: LegalAction | undefined) {
    if (!state) return;

    const lockedActions: Record<string, LegalAction> = {};
    const messages: BriefingMessage[] = [];
    if (humanAction) {
      lockedActions[HUMAN_ID] = humanAction;
    }

    for (const player of state.players.filter((candidate) => candidate.status === "active" && candidate.kind === "ai")) {
      const decision = chooseFallbackDecision(state, player.id, player.agentProfileId);
      const action = generateLegalActions(state, player.id).find((candidate) => candidate.id === decision.chosenActionId);
      if (action) {
        lockedActions[player.id] = action;
      }
      messages.push({
        id: `${state.round}-${player.id}`,
        playerName: player.name,
        text: decision.publicMessage
      });
    }

    const resolved = resolveRound(state, lockedActions, `${state.rngSeed}:${state.round}`);
    setState(resolved.state);
    setLastEvents(resolved.events);
    setSelectedActionId(null);
    setBriefingMessages(messages);

    if (resolved.state.phase === "finished") {
      setSummary(buildMatchSummary(resolved.state));
    }
  }

  function reset() {
    setState(null);
    setBriefingMessages([]);
    setLastEvents([]);
    setSummary(null);
    setIsAiDemo(false);
    setArcadeHud(null);
    setSelectedActionId(null);
    setSelectedPlayerId(HUMAN_ID);
  }

  function finishArcadeMission(result: ArcadeMissionResult) {
    setArcadeHud((current) =>
      current
        ? {
            ...current,
            phase: result.outcome,
            alarm: result.alarm,
            lootValue: result.lootValue,
            aiLootValue: result.aiLootValue,
            artifactsStolen: result.artifactsStolen,
            timeLeftMs: Math.max(0, ARCADE_MISSION_DURATION_MS - result.elapsedMs),
            objective: result.outcome === "escaped" ? "Case closed. Exit route burned clean." : "Case closed. The vault kept its receipt.",
            prompt: "Review the case file",
            loopStep: result.outcome === "escaped" ? "escape" : "survive",
            raceStatus: result.lootValue >= result.aiLootValue ? "You won the loot race" : "AI crew won the loot race"
          }
        : current
    );
    setSummary(buildArcadeMatchSummary(result));
  }

  const arcade =
    state && !isAiDemo && !summary
      ? {
          enabled: true as const,
          runId: state.matchId,
          hud: arcadeHud,
          updateHud: setArcadeHud,
          finishMission: finishArcadeMission
        }
      : undefined;

  return {
    state,
    legalActions,
    actionCards,
    briefingMessages,
    lastEvents,
    summary,
    isAiDemo,
    arcade,
    selectedActionId,
    selectedPlayerId,
    startSolo,
    startAiDemo,
    selectAction,
    selectPlayer,
    executeSelectedAction,
    lockAction,
    advanceAiOnly,
    reset
  };
}

function makeBriefing(state: GameState): BriefingMessage[] {
  return state.players
    .filter((player) => player.kind === "ai")
    .map((player) => ({
      id: `brief-${player.id}`,
      playerName: player.name,
      text: `${player.name}: Six rounds, one vault, zero believable receipts.`
    }));
}

function makeInitialArcadeHud(state: GameState): ArcadeHudState {
  return {
    phase: "stealth",
    timeLeftMs: ARCADE_MISSION_DURATION_MS,
    alarm: state.alarm,
    lootValue: 0,
    aiLootValue: 0,
    artifactsStolen: 0,
    totalArtifacts: state.artifacts.length,
    canEscape: false,
    dashReady: true,
    objective: "Steal the Moon Pearl",
    prompt: "Follow the gold marker",
    activeAction: {
      key: "Move",
      label: "Follow marker",
      tone: "neutral"
    },
    loopStep: "steal",
    raceStatus: "Loot race is tied",
    lastRivalSteal: null,
    rivalIntercept: null,
    vaultCondition: {
      tone: "stable",
      label: "Vault Stable",
      detail: "Low profile"
    },
    escapePayout: null,
    radarBlips: [],
    greedStatus: null,
    targetDistanceLabel: "Target plotting",
    rivalStatus: "Rivals enter in 5s",
    rivalDistanceLabel: "Nearest rival scanning",
    rivalPressureLevel: "standby",
    rivalScanStatus: {
      label: "Scan clear",
      tone: "idle",
      progress: 0
    },
    alibiPulseStatus: "Alibi ready",
    paceStatus: "S-Rank pace",
    cleanBonusWindow: {
      label: "Clean bonus",
      detail: "S-Rank +3",
      secondsLeft: 60
    },
    lootChainWindow: null,
    missionBeat: buildMissionBeat({
      targetArtifactName: "Moon Pearl",
      lootValue: 0,
      canEscape: false,
      cashoutValue: null,
      routeChoiceRelic: null,
      routeMode: "escape",
      rivalCarrier: null,
      alibiPulseReady: false,
      nearestRivalName: null
    }),
    threatCue: null,
    spotlight: null,
    feed: ["Moon Vault breach started.", "Rival agents enter in 5 seconds.", "Move fast. Steal clean. Escape before lockdown."]
  };
}
