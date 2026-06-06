import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { NeonMoonScene } from "./NeonMoonScene";
import type { HeistSceneSnapshot } from "./scene-types";

type HeistStageProps = {
  snapshot: HeistSceneSnapshot;
};

export function HeistStage({ snapshot }: HeistStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<NeonMoonScene | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    const scene = new NeonMoonScene();
    sceneRef.current = scene;
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: "#060915",
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

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.updateSnapshot(snapshot);
  }, [snapshot]);

  return <div className="heist-stage" ref={hostRef} aria-label="Neon Moon Heist scene" />;
}
