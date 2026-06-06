import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { ArcadeHeistScene } from "./ArcadeHeistScene";
import type { ArcadeMissionConfig } from "./arcade-types";

type ArcadeHeistStageProps = ArcadeMissionConfig;

declare global {
  interface Window {
    __AGENT_ALIBI_FINISH_ARCADE__?: () => void;
    __AGENT_ALIBI_ARCADE_STATE__?: () => ReturnType<ArcadeHeistScene["getDebugState"]>;
  }
}

export function ArcadeHeistStage({ state, runId, onHudUpdate, onFinish }: ArcadeHeistStageProps) {
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
    window.__AGENT_ALIBI_FINISH_ARCADE__ = () => scene.finishForDebug();
    window.__AGENT_ALIBI_ARCADE_STATE__ = () => scene.getDebugState();
    hostRef.current.focus({ preventScroll: true });

    return () => {
      if (window.__AGENT_ALIBI_FINISH_ARCADE__) {
        delete window.__AGENT_ALIBI_FINISH_ARCADE__;
      }
      if (window.__AGENT_ALIBI_ARCADE_STATE__) {
        delete window.__AGENT_ALIBI_ARCADE_STATE__;
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

  return <div className="arcade-stage" ref={hostRef} aria-label="Playable Moon Vault arcade scene" tabIndex={0} />;
}
