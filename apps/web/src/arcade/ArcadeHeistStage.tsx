import { useEffect, useRef, type PointerEvent } from "react";
import Phaser from "phaser";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand, Route, Zap } from "lucide-react";
import { ArcadeHeistScene } from "./ArcadeHeistScene";
import type { ArcadeHudState, ArcadeMissionConfig } from "./arcade-types";

type ArcadeHeistStageProps = ArcadeMissionConfig & {
  hud?: ArcadeHudState | null;
};

declare global {
  interface Window {
    __AGENT_ALIBI_FINISH_ARCADE__?: () => void;
    __AGENT_ALIBI_ARCADE_STATE__?: () => ReturnType<ArcadeHeistScene["getDebugState"]>;
    __AGENT_ALIBI_ARCADE_DEBUG__?: {
      teleportToTarget: () => void;
      forceRivalPressure: (distanceMeters?: number) => void;
      forceRivalSteal: () => void;
      forceRivalCashout: () => void;
      forceRivalNearCashout: () => void;
      forceLockdown: () => void;
      forceSecuritySweep: () => void;
      forceSecuritySweepWarning: () => void;
    };
  }
}

export function ArcadeHeistStage({ state, runId, onHudUpdate, onFinish, hud }: ArcadeHeistStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<ArcadeHeistScene | null>(null);
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

    const scene = new ArcadeHeistScene();
    sceneRef.current = scene;
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: "#050811",
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
      window.__AGENT_ALIBI_FINISH_ARCADE__ = () => scene.finishForDebug();
      window.__AGENT_ALIBI_ARCADE_STATE__ = () => scene.getDebugState();
      window.__AGENT_ALIBI_ARCADE_DEBUG__ = {
        teleportToTarget: () => scene.teleportToTargetForDebug(),
        forceRivalPressure: (distanceMeters?: number) => scene.forceRivalPressureForDebug(distanceMeters),
        forceRivalSteal: () => scene.forceRivalStealForDebug(),
        forceRivalCashout: () => scene.forceRivalCashoutForDebug(),
        forceRivalNearCashout: () => scene.forceRivalNearCashoutForDebug(),
        forceLockdown: () => scene.forceLockdownForDebug(),
        forceSecuritySweep: () => scene.forceSecuritySweepForDebug(),
        forceSecuritySweepWarning: () => scene.forceSecuritySweepWarningForDebug()
      };
    }
    hostRef.current.focus({ preventScroll: true });

    return () => {
      if (window.__AGENT_ALIBI_FINISH_ARCADE__) {
        delete window.__AGENT_ALIBI_FINISH_ARCADE__;
      }
      if (window.__AGENT_ALIBI_ARCADE_STATE__) {
        delete window.__AGENT_ALIBI_ARCADE_STATE__;
      }
      if (window.__AGENT_ALIBI_ARCADE_DEBUG__) {
        delete window.__AGENT_ALIBI_ARCADE_DEBUG__;
      }
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setMissionConfig({
      state,
      runId,
      onHudUpdate: (hud) => onHudUpdateRef.current(hud),
      onFinish: (result) => onFinishRef.current(result)
    });
    hostRef.current?.focus({ preventScroll: true });
  }, [runId, state]);

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
  const routeArmed = Boolean(hud?.greedStatus?.toLowerCase().startsWith("greed route"));
  const routeAvailable = Boolean(hud?.greedStatus && !routeArmed);
  const cashoutRouteLabel = hud?.escapePayout ? `cashout +${hud.escapePayout.cashout}` : "cashout";
  const routeLabel = routeArmed
    ? `Switch route: greed route armed / ${cashoutRouteLabel}`
    : routeAvailable
      ? `Switch route: ${cashoutRouteLabel} or greed route available`
      : "Switch route";

  return (
    <>
      <div className="arcade-stage" ref={hostRef} aria-label="Playable Moon Vault arcade scene" tabIndex={0} />
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
          <button
            aria-label={routeLabel}
            className={routeArmed ? "route-armed" : routeAvailable ? "route-available" : ""}
            onClick={tapRoute}
            title={routeLabel}
            type="button"
          >
            <Route size={20} />
          </button>
        </div>
      </div>
    </>
  );
}
