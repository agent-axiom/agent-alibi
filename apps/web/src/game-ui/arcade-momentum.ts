import type { ArcadeCleanBonusWindow, ArcadeLootChainWindow } from "../arcade/arcade-types";

export type ArcadeMomentumMeter = {
  tone: "clean" | "chain";
  label: string;
  detail: string;
  action: string;
  value: number;
};

export function buildArcadeMomentumMeter(input: {
  cleanBonusWindow: ArcadeCleanBonusWindow | null;
  lootChainWindow: ArcadeLootChainWindow | null;
}): ArcadeMomentumMeter | null {
  if (input.lootChainWindow) {
    return {
      tone: "chain",
      label: input.lootChainWindow.label,
      detail: input.lootChainWindow.detail,
      action: `${input.lootChainWindow.secondsLeft}s to chain or cashout`,
      value: clampMomentum(input.lootChainWindow.secondsLeft * 10)
    };
  }

  if (input.cleanBonusWindow) {
    return {
      tone: "clean",
      label: input.cleanBonusWindow.label,
      detail: input.cleanBonusWindow.detail,
      action: `${input.cleanBonusWindow.secondsLeft}s for clean exit`,
      value: clampMomentum(Math.round((input.cleanBonusWindow.secondsLeft / 60) * 100))
    };
  }

  return null;
}

function clampMomentum(value: number) {
  return Math.max(8, Math.min(100, value));
}
