import { inflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

const FINAL_CASE_TIMEOUT_MS = 15_000;

type GetawayDebugState = {
  mode: "moon-getaway";
  mapStyle: "continuous-roadway";
  roomLabels: number;
  objective: "steal" | "escape" | "finished";
  phase: "launch" | "steal" | "chase" | "escape" | "finished";
  hasRelic: boolean;
  rivalsReleased: boolean;
  lootValue: number;
  timeLeftMs: number;
  player: { x: number; y: number; speed: number };
  relic: { x: number; y: number; label: string; value: number; stolen: boolean };
  extraction: { x: number; y: number; active: boolean; label: string };
  route: { from: string; to: string; color: "gold" | "cyan"; points: number };
  roadSegments: number;
  hazardCount: number;
  rivalCount: number;
};

type AgentAlibiWindow = Window & {
  __AGENT_ALIBI_FINISH_ARCADE__?: () => void;
  __AGENT_ALIBI_ARCADE_STATE__?: () => GetawayDebugState | undefined;
  __AGENT_ALIBI_ARCADE_DEBUG__?: {
    teleportToTarget?: () => void;
    teleportToExit?: () => void;
    forceRivalsActive?: () => void;
    forceRivalPressure?: (distanceMeters?: number) => void;
  };
};

async function expectFinalCaseFile(page: Page) {
  await expect(page.locator(".case-file pre").getByText(/agent alibi case file/i)).toBeVisible({
    timeout: FINAL_CASE_TIMEOUT_MS
  });
}

async function startSoloArcade(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /play now vs ai/i }).click();
  await expect(page.getByLabel(/playable moon getaway arcade scene/i)).toBeVisible();
}

async function waitForGetawayState(page: Page, predicate: (state: GetawayDebugState) => boolean = () => true) {
  await page.waitForFunction(() => typeof (window as AgentAlibiWindow).__AGENT_ALIBI_ARCADE_STATE__ === "function");
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const state = await page.evaluate(() => (window as AgentAlibiWindow).__AGENT_ALIBI_ARCADE_STATE__?.());
    if (state && predicate(state)) return state;
    await page.waitForTimeout(100);
  }
  throw new Error("Timed out waiting for Moon Getaway debug state");
}

async function visibleText(page: Page, selector: string) {
  return page.evaluate((rootSelector) => {
    const root = document.querySelector(rootSelector);
    if (!root) return "";
    const pieces: string[] = [];
    const isVisible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.05 && rect.width > 0 && rect.height > 0;
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      const parent = node.parentElement;
      if (text && parent && isVisible(parent)) {
        pieces.push(text);
      }
      node = walker.nextNode();
    }
    return pieces.join(" ").replace(/\s+/g, " ").trim();
  }, selector);
}

async function canvasSignal(page: Page) {
  const canvas = page.locator(".arcade-stage canvas");
  const box = await canvas.boundingBox();
  if (!box) return { exists: false, width: 0, height: 0, coloredPixels: 0, brightPixels: 0 };
  return pngSignal(await canvas.screenshot({ type: "png" }));
}

function pngSignal(png: Buffer) {
  const signature = png.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") return { exists: true, width: 0, height: 0, coloredPixels: 0, brightPixels: 0 };

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }

  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (width <= 0 || height <= 0 || bitDepth !== 8 || bytesPerPixel === 0) {
    return { exists: true, width, height, coloredPixels: 0, brightPixels: 0 };
  }

  const inflated = inflateSync(Buffer.concat(idat));
  const rowBytes = width * bytesPerPixel;
  const pixels = Buffer.alloc(rowBytes * height);
  let inputOffset = 0;

  for (let row = 0; row < height; row += 1) {
    const filter = inflated[inputOffset] ?? 0;
    inputOffset += 1;
    const rowStart = row * rowBytes;
    const prevRowStart = rowStart - rowBytes;
    for (let column = 0; column < rowBytes; column += 1) {
      const raw = inflated[inputOffset + column] ?? 0;
      const left = column >= bytesPerPixel ? pixels[rowStart + column - bytesPerPixel] ?? 0 : 0;
      const up = row > 0 ? pixels[prevRowStart + column] ?? 0 : 0;
      const upLeft = row > 0 && column >= bytesPerPixel ? pixels[prevRowStart + column - bytesPerPixel] ?? 0 : 0;
      pixels[rowStart + column] = (raw + pngFilterValue(filter, left, up, upLeft)) & 0xff;
    }
    inputOffset += rowBytes;
  }

  let coloredPixels = 0;
  let brightPixels = 0;
  for (let index = 0; index < pixels.length; index += bytesPerPixel) {
    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    const alpha = bytesPerPixel === 4 ? pixels[index + 3] ?? 0 : 255;
    if (alpha > 20 && Math.max(red, green, blue) - Math.min(red, green, blue) > 24) coloredPixels += 1;
    if (alpha > 20 && red + green + blue > 140) brightPixels += 1;
  }

  return { exists: true, width, height, coloredPixels, brightPixels };
}

function pngFilterValue(filter: number, left: number, up: number, upLeft: number) {
  if (filter === 1) return left;
  if (filter === 2) return up;
  if (filter === 3) return Math.floor((left + up) / 2);
  if (filter !== 4) return 0;

  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}

test("home screen surfaces the saved best case target", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "agent-alibi:best-case:v1",
      JSON.stringify({
        version: 1,
        at: 123,
        score: 12,
        title: "Profitable Disaster",
        runRating: "S-Rank",
        lootChain: 2,
        relicCount: 2,
        afterburnerExitBonus: 1
      })
    );
  });
  await page.reload();

  const savedBest = page.getByLabel(/saved best case/i);
  await expect(savedBest.getByText(/best case/i)).toBeVisible();
  await expect(savedBest.getByText(/profitable disaster/i)).toBeVisible();
  await expect(savedBest.getByText(/beat your case/i)).toBeVisible();
});

test("sound preference survives a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /sound off/i }).click();
  await expect(page.getByRole("button", { name: /sound on/i })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("agent-alibi:sound-enabled:v1"))).toBe("true");

  await page.reload();
  await expect(page.getByRole("button", { name: /sound on/i })).toBeVisible();
});

test("language picker supports English Russian and Chinese and persists", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /play now vs ai/i })).toBeVisible();

  await page.getByLabel(/language/i).getByRole("button", { name: /Русский/i }).click();
  await expect(page.getByRole("button", { name: /Играть против AI/i })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("agent-alibi:locale:v1"))).toBe("ru");

  await page.reload();
  await expect(page.getByRole("button", { name: /Играть против AI/i })).toBeVisible();

  await page.getByLabel(/language/i).getByRole("button", { name: /中文/i }).click();
  await expect(page.getByRole("button", { name: /立即对战 AI/i })).toBeVisible();
  await page.getByRole("button", { name: /立即对战 AI/i }).click();

  await expect(page.getByLabel(/playable moon getaway arcade scene/i)).toBeVisible();
  await expect(page.locator(".arcade-shell")).toHaveClass(/moon-getaway/);
  const state = await waitForGetawayState(page);
  expect(state.mode).toBe("moon-getaway");
  expect(state.roomLabels).toBe(0);
});

test("moon getaway opens as a low-text continuous top-down chase", async ({ page }) => {
  await startSoloArcade(page);

  await expect(page.getByLabel(/opening contract/i)).toBeHidden();
  await expect(page.locator(".arcade-shell")).toHaveClass(/moon-getaway/);
  const text = await visibleText(page, ".arcade-shell");
  expect(text.length).toBeLessThan(220);
  expect(text).toMatch(/2:30/);
  expect(text).toMatch(/\+3/i);
  expect(text).not.toMatch(/briefing|contract|director|scan|mission radio|live agents|rival intel/i);

  const state = await waitForGetawayState(page);
  expect(state.mode).toBe("moon-getaway");
  expect(state.mapStyle).toBe("continuous-roadway");
  expect(state.roomLabels).toBe(0);
  expect(state.objective).toBe("steal");
  expect(state.phase).toBe("steal");
  expect(state.roadSegments).toBeGreaterThanOrEqual(6);
  expect(state.hazardCount).toBeGreaterThanOrEqual(10);
  expect(state.rivalCount).toBeGreaterThanOrEqual(3);
  expect(state.route).toMatchObject({ from: "player", to: "Moon Pearl", color: "gold" });

  const signal = await canvasSignal(page);
  expect(signal.exists).toBe(true);
  expect(signal.width).toBeGreaterThan(600);
  expect(signal.height).toBeGreaterThan(360);
  expect(signal.coloredPixels).toBeGreaterThan(35_000);
  expect(signal.brightPixels).toBeGreaterThan(10_000);
});

test("moon getaway supports movement, relic pickup, chase, and extraction", async ({ page }) => {
  await startSoloArcade(page);
  const before = await waitForGetawayState(page);

  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(350);
  await page.keyboard.up("ArrowRight");
  const after = await waitForGetawayState(page);
  expect(after.player.x).toBeGreaterThan(before.player.x + 20);

  await page.evaluate(() => (window as AgentAlibiWindow).__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget?.());
  await page.keyboard.press("Space");
  const carrying = await waitForGetawayState(page, (state) => state.objective === "escape");
  expect(carrying.hasRelic).toBe(true);
  expect(carrying.rivalsReleased).toBe(true);
  expect(carrying.lootValue).toBe(3);
  expect(carrying.route).toMatchObject({ to: "Extraction", color: "cyan" });

  await page.evaluate(() => (window as AgentAlibiWindow).__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToExit?.());
  await page.keyboard.press("Space");
  await expectFinalCaseFile(page);
  await expect(page.locator(".case-file pre")).toContainText(/Winner: Blue Crew/i);
  await expect(page.locator(".case-file pre")).toContainText(/escaped with 1 relic/i);
  await expect(page.locator(".case-file")).toContainText(/Moon Pearl/i);
});

test("moon getaway rivals can catch a greedy player", async ({ page }) => {
  await startSoloArcade(page);
  await page.evaluate(() => (window as AgentAlibiWindow).__AGENT_ALIBI_ARCADE_DEBUG__?.teleportToTarget?.());
  await page.keyboard.press("Space");
  await waitForGetawayState(page, (state) => state.objective === "escape");

  await page.evaluate(() => (window as AgentAlibiWindow).__AGENT_ALIBI_ARCADE_DEBUG__?.forceRivalPressure?.(2));

  await expectFinalCaseFile(page);
  await expect(page.locator(".case-file")).toContainText(/caught in the alarm wash/i);
  await expect(page.locator(".case-file")).not.toContainText(/escaped with 1 relic/i);
});

test("mobile moon getaway keeps controls away from objective and canvas", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startSoloArcade(page);

  const layout = await page.evaluate(() => {
    const controls = document.querySelector(`[aria-label="Arcade touch controls"]`)?.getBoundingClientRect();
    const objective = document.querySelector(`[aria-label="Current objective"]`)?.getBoundingClientRect();
    const topbar = document.querySelector(`[aria-label="Live mission status"]`)?.getBoundingClientRect();
    const overlaps = (a?: DOMRect, b?: DOMRect) =>
      Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    return {
      controls: controls ? { width: controls.width, height: controls.height, bottom: window.innerHeight - controls.bottom } : null,
      objective: objective ? { width: objective.width, height: objective.height } : null,
      topbar: topbar ? { width: topbar.width, height: topbar.height } : null,
      controlsOverlapObjective: overlaps(controls, objective),
      topbarOverlapObjective: overlaps(topbar, objective)
    };
  });

  expect(layout.controls).not.toBeNull();
  expect(layout.objective).not.toBeNull();
  expect(layout.topbar).not.toBeNull();
  expect(layout.controlsOverlapObjective).toBe(false);
  expect(layout.topbarOverlapObjective).toBe(false);
  expect(layout.objective?.width).toBeLessThanOrEqual(240);
});

test("copy result exposes manual case file when clipboard is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as Window & { __AGENT_ALIBI_BLOCKED_COPY_TEXT__?: string }).__AGENT_ALIBI_BLOCKED_COPY_TEXT__ = text;
          throw new DOMException("Clipboard blocked", "NotAllowedError");
        }
      }
    });
  });

  await startSoloArcade(page);
  await page.waitForFunction(() => typeof (window as AgentAlibiWindow).__AGENT_ALIBI_FINISH_ARCADE__ === "function");
  await page.evaluate(() => (window as AgentAlibiWindow).__AGENT_ALIBI_FINISH_ARCADE__?.());
  await expectFinalCaseFile(page);

  await page.getByRole("button", { name: /copy result/i }).click();

  await expect(page.getByRole("button", { name: /copy blocked/i })).toBeVisible();
  const manualShare = page.getByLabel(/manual share fallback/i);
  await expect(manualShare.getByText(/clipboard blocked/i)).toBeVisible();
  await expect(manualShare.locator("textarea")).toContainText(/agent alibi case file/i);
  await expect(manualShare.locator("textarea")).toContainText(/play\s+https:\/\/agent-axiom\.github\.io\/agent-alibi\//i);
  await expect(page.getByText(/copied/i)).toHaveCount(0);
});
