import { useEffect, useRef, type PointerEvent } from "react";
import Phaser from "phaser";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand, Route, Zap } from "lucide-react";
import type { ArcadeHudState, ArcadeMissionConfig } from "../arcade/arcade-types";
import { MoonGetawayScene } from "./MoonGetawayScene";

type MoonGetawayStageProps = ArcadeMissionConfig & {
  hud?: ArcadeHudState | null;
};

type DebugWindow = Window & {
  __AGENT_ALIBI_FINISH_ARCADE__?: () => void;
  __AGENT_ALIBI_ARCADE_STATE__?: () => ReturnType<MoonGetawayScene["getDebugState"]>;
  __AGENT_ALIBI_ARCADE_DEBUG__?: {
    teleportToTarget: () => void;
    teleportToExit: () => void;
    forceRivalsActive: () => void;
    forceRivalPressure: (distanceMeters?: number) => void;
    forceRivalSteal: () => void;
    forceRivalCashout: () => void;
    forceRivalNearCashout: () => void;
    forceLockdown: () => void;
    forceSecuritySweep: () => void;
    forceSecuritySweepWarning: () => void;
  };
};

export function MoonGetawayStage({ state, runId, locale, onHudUpdate, onFinish, hud }: MoonGetawayStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MoonGetawayScene | null>(null);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onHudUpdateRef.current = onHudUpdate;
  }, [onHudUpdate]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    const scene = new MoonGetawayScene();
    const debugWindow = window as DebugWindow;
    sceneRef.current = scene;
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: "#03060d",
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: hostRef.current.clientWidth,
        height: hostRef.current.clientHeight
      },
      render: {
        antialias: true,
        pixelArt: false
      },
      scene
    });

    if (import.meta.env.DEV) {
      debugWindow.__AGENT_ALIBI_FINISH_ARCADE__ = () => scene.finishForDebug();
      debugWindow.__AGENT_ALIBI_ARCADE_STATE__ = () => scene.getDebugState();
      debugWindow.__AGENT_ALIBI_ARCADE_DEBUG__ = {
        teleportToTarget: () => scene.teleportToRelicForDebug(),
        teleportToExit: () => scene.teleportToExtractionForDebug(),
        forceRivalsActive: () => scene.forceChaseForDebug(),
        forceRivalPressure: () => scene.forceChaseForDebug(),
        forceRivalSteal: () => scene.forceChaseForDebug(),
        forceRivalCashout: () => scene.finishForDebug("caught"),
        forceRivalNearCashout: () => scene.forceChaseForDebug(),
        forceLockdown: () => scene.finishForDebug("sealed"),
        forceSecuritySweep: () => scene.forceChaseForDebug(),
        forceSecuritySweepWarning: () => scene.forceChaseForDebug()
      };
    }

    hostRef.current.focus({ preventScroll: true });

    return () => {
      delete debugWindow.__AGENT_ALIBI_FINISH_ARCADE__;
      delete debugWindow.__AGENT_ALIBI_ARCADE_STATE__;
      delete debugWindow.__AGENT_ALIBI_ARCADE_DEBUG__;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setMissionConfig({
      state,
      runId,
      locale,
      onHudUpdate: (nextHud) => onHudUpdateRef.current(nextHud),
      onFinish: (result) => onFinishRef.current(result)
    });
    hostRef.current?.focus({ preventScroll: true });
  }, [locale, runId, state]);

  const pressDirection = (direction: "up" | "down" | "left" | "right") => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    sceneRef.current?.setVirtualDirection(direction, true);
    hostRef.current?.focus({ preventScroll: true });
  };

  const releaseDirection = (direction: "up" | "down" | "left" | "right") => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    sceneRef.current?.setVirtualDirection(direction, false);
    hostRef.current?.focus({ preventScroll: true });
  };

  const tapDash = () => {
    sceneRef.current?.tapVirtualDash();
    hostRef.current?.focus({ preventScroll: true });
  };

  const tapInteract = () => {
    sceneRef.current?.tapVirtualInteract();
    hostRef.current?.focus({ preventScroll: true });
  };

  const tapRoute = () => {
    sceneRef.current?.tapVirtualRoute();
    hostRef.current?.focus({ preventScroll: true });
  };

  const dashLabel = hud?.dashReady === false ? "Dash cooling" : "Dash ready";
  const canInteract = Boolean(hud?.activeAction.key.toLowerCase().startsWith("e"));
  const interactLabel = canInteract ? `Interact: ${hud?.activeAction.label ?? "action"}` : "Interact";
  const routeLabel = "Alibi pulse";

  return (
    <>
      <div className="arcade-stage moon-getaway-stage" ref={hostRef} aria-label="Playable Moon Getaway arcade scene" tabIndex={0} />
      <div className="arcade-touch-controls" aria-label="Arcade touch controls">
        <div className="arcade-touch-dpad" aria-label="Movement pad">
          <button
            aria-label="Move up"
            className="up"
            onContextMenu={(event) => event.preventDefault()}
            onPointerCancel={releaseDirection("up")}
            onPointerDown={pressDirection("up")}
            onPointerLeave={releaseDirection("up")}
            onPointerUp={releaseDirection("up")}
            type="button"
          >
            <ArrowUp size={20} />
          </button>
          <button
            aria-label="Move left"
            className="left"
            onContextMenu={(event) => event.preventDefault()}
            onPointerCancel={releaseDirection("left")}
            onPointerDown={pressDirection("left")}
            onPointerLeave={releaseDirection("left")}
            onPointerUp={releaseDirection("left")}
            type="button"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            aria-label="Move right"
            className="right"
            onContextMenu={(event) => event.preventDefault()}
            onPointerCancel={releaseDirection("right")}
            onPointerDown={pressDirection("right")}
            onPointerLeave={releaseDirection("right")}
            onPointerUp={releaseDirection("right")}
            type="button"
          >
            <ArrowRight size={20} />
          </button>
          <button
            aria-label="Move down"
            className="down"
            onContextMenu={(event) => event.preventDefault()}
            onPointerCancel={releaseDirection("down")}
            onPointerDown={pressDirection("down")}
            onPointerLeave={releaseDirection("down")}
            onPointerUp={releaseDirection("down")}
            type="button"
          >
            <ArrowDown size={20} />
          </button>
        </div>
        <div className="arcade-touch-actions" aria-label="Action pad">
          <button aria-label={dashLabel} className={hud?.dashReady === false ? "cooling" : "ready"} onClick={tapDash} title={dashLabel} type="button">
            <Zap size={20} />
          </button>
          <button aria-label={interactLabel} className={canInteract ? "ready" : ""} onClick={tapInteract} title={interactLabel} type="button">
            <Hand size={20} />
          </button>
          <button aria-label={routeLabel} className="route-available" onClick={tapRoute} title={routeLabel} type="button">
            <Route size={20} />
          </button>
        </div>
      </div>
    </>
  );
}
