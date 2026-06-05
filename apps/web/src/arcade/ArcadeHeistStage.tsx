import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { ArcadeHeistScene } from "./ArcadeHeistScene";
import type { ArcadeMissionConfig } from "./arcade-types";

type ArcadeHeistStageProps = ArcadeMissionConfig;

declare global {
  interface Window {
    __AGENT_ALIBI_FINISH_ARCADE__?: () => void;
  }
}

export function ArcadeHeistStage({ state, runId, onHudUpdate, onFinish }: ArcadeHeistStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<ArcadeHeistScene | null>(null);

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

    return () => {
      if (window.__AGENT_ALIBI_FINISH_ARCADE__) {
        delete window.__AGENT_ALIBI_FINISH_ARCADE__;
      }
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setMissionConfig({ state, runId, onHudUpdate, onFinish });
  }, [onFinish, onHudUpdate, runId, state]);

  return <div className="arcade-stage" ref={hostRef} aria-label="Playable Moon Vault arcade scene" />;
}
