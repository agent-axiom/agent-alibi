import Phaser from "phaser";
import { ARCADE_MISSION_DURATION_MS, type ArcadeHudState, type ArcadeMissionConfig } from "../arcade/arcade-types";
import { buildObjectiveCompass } from "../arcade/guidance";
import type { ArcadeMissionOutcome } from "../arcade/arcade-rules";
import { buildGetawayMissionResult, selectGetawayObjective, updateGetawayChasePressure, type GetawayChasePressure } from "./getaway-rules";

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";
type GetawayPhase = "launch" | "steal" | "chase" | "escape" | "finished";

type RivalState = Point & {
  id: string;
  name: string;
  color: number;
  speed: number;
  released: boolean;
};

export type GetawayDebugState = {
  mode: "moon-getaway";
  mapStyle: "continuous-roadway";
  roomLabels: number;
  objective: "steal" | "escape" | "finished";
  phase: GetawayPhase;
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
  chasePressure: GetawayChasePressure;
  rivalContactMs: number;
};

const WORLD = { width: 1800, height: 1040 };
const PLAYER_START: Point = { x: 260, y: 760 };
const RELIC = { x: 1190, y: 355, label: "Moon Pearl", value: 3 };
const EXTRACTION = { x: 1530, y: 790, label: "Extraction" };
const INTERACT_RADIUS = 82;
const MAX_SPEED = 310;
const DASH_SPEED = 560;
const DASH_COOLDOWN_MS = 1600;
const RIVAL_CAPTURE_RADIUS = 58;
const RIVAL_CAPTURE_HOLD_MS = 650;

const ROAD_PATHS: Point[][] = [
  [
    { x: 150, y: 790 },
    { x: 380, y: 730 },
    { x: 620, y: 640 },
    { x: 840, y: 520 },
    { x: 1085, y: 410 },
    { x: 1190, y: 355 }
  ],
  [
    { x: 785, y: 545 },
    { x: 980, y: 690 },
    { x: 1220, y: 780 },
    { x: 1530, y: 790 },
    { x: 1690, y: 710 }
  ],
  [
    { x: 535, y: 660 },
    { x: 590, y: 430 },
    { x: 720, y: 255 },
    { x: 920, y: 210 },
    { x: 1110, y: 285 }
  ],
  [
    { x: 1030, y: 450 },
    { x: 1225, y: 565 },
    { x: 1430, y: 560 },
    { x: 1640, y: 430 }
  ],
  [
    { x: 330, y: 880 },
    { x: 580, y: 885 },
    { x: 820, y: 835 },
    { x: 1050, y: 770 }
  ],
  [
    { x: 250, y: 560 },
    { x: 420, y: 500 },
    { x: 595, y: 430 }
  ]
];

const HAZARDS: Point[] = [
  { x: 455, y: 565 },
  { x: 520, y: 805 },
  { x: 705, y: 705 },
  { x: 760, y: 330 },
  { x: 900, y: 620 },
  { x: 1015, y: 305 },
  { x: 1110, y: 545 },
  { x: 1265, y: 670 },
  { x: 1360, y: 480 },
  { x: 1450, y: 870 },
  { x: 1580, y: 650 },
  { x: 1660, y: 485 }
];

const CRATERS: Array<Point & { radius: number }> = [
  { x: 180, y: 220, radius: 42 },
  { x: 380, y: 325, radius: 28 },
  { x: 500, y: 970, radius: 36 },
  { x: 690, y: 120, radius: 44 },
  { x: 910, y: 940, radius: 54 },
  { x: 1260, y: 145, radius: 38 },
  { x: 1510, y: 250, radius: 64 },
  { x: 1685, y: 925, radius: 46 }
];

export class MoonGetawayScene extends Phaser.Scene {
  private missionConfig: ArcadeMissionConfig | null = null;
  private activeRunId: string | null = null;
  private worldGraphics: Phaser.GameObjects.Graphics | null = null;
  private playerTarget: Phaser.GameObjects.Zone | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keyW: Phaser.Input.Keyboard.Key | null = null;
  private keyA: Phaser.Input.Keyboard.Key | null = null;
  private keyS: Phaser.Input.Keyboard.Key | null = null;
  private keyD: Phaser.Input.Keyboard.Key | null = null;
  private keyE: Phaser.Input.Keyboard.Key | null = null;
  private keySpace: Phaser.Input.Keyboard.Key | null = null;
  private keyShift: Phaser.Input.Keyboard.Key | null = null;
  private virtualDirections: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };
  private player = { x: PLAYER_START.x, y: PLAYER_START.y, vx: 0, vy: 0, facing: -0.2 };
  private rivals: RivalState[] = [];
  private startTimeMs = 0;
  private elapsedMs = 0;
  private lastHudEmitMs = -1;
  private dashCooldownUntilMs = 0;
  private alibiPulsesUsed = 0;
  private rivalContactMs = 0;
  private chasePressure: GetawayChasePressure = "clear";
  private hasRelic = false;
  private rivalsReleased = false;
  private finished = false;
  private phase: GetawayPhase = "launch";

  constructor() {
    super("moon-getaway");
  }

  setMissionConfig(config: ArcadeMissionConfig): void {
    const newRun = this.activeRunId !== config.runId;
    this.missionConfig = config;
    if (newRun) {
      this.activeRunId = config.runId;
      this.resetRun();
    }
    this.emitHud(true);
  }

  create(): void {
    this.worldGraphics = this.add.graphics();
    this.playerTarget = this.add.zone(this.player.x, this.player.y, 4, 4);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBackgroundColor("#03060d");
    this.cameras.main.startFollow(this.playerTarget, true, 0.12, 0.12);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    }

    this.resetRun();
    this.drawWorld();
    this.emitHud(true);
  }

  override update(time: number, delta: number): void {
    if (this.finished) return;
    if (this.startTimeMs <= 0) this.startTimeMs = time;
    this.elapsedMs = Math.min(ARCADE_MISSION_DURATION_MS, time - this.startTimeMs);

    if (ARCADE_MISSION_DURATION_MS - this.elapsedMs <= 0) {
      this.finishRun(this.hasRelic ? "caught" : "sealed");
      return;
    }

    if (this.justInteractPressed()) this.tryInteract();
    if (this.keyJustDown(this.keyShift)) this.tryDash();
    this.updateMovement(delta);
    this.updateRivals(delta);
    this.updateChasePressure(delta);
    this.playerTarget?.setPosition(this.player.x, this.player.y);
    this.drawWorld();
    this.emitHud();
  }

  getDebugState(): GetawayDebugState {
    const objective = selectGetawayObjective({
      hasRelic: this.hasRelic,
      escaped: this.finished && this.hasRelic,
      caught: this.finished && !this.hasRelic
    });
    const routeTarget = this.hasRelic ? EXTRACTION.label : RELIC.label;
    return {
      mode: "moon-getaway",
      mapStyle: "continuous-roadway",
      roomLabels: 0,
      objective: objective.phase === "finished" ? "finished" : objective.phase,
      phase: this.phase,
      hasRelic: this.hasRelic,
      rivalsReleased: this.rivalsReleased,
      lootValue: this.hasRelic ? RELIC.value : 0,
      timeLeftMs: this.timeLeftMs(),
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        speed: Math.round(Math.hypot(this.player.vx, this.player.vy))
      },
      relic: {
        x: RELIC.x,
        y: RELIC.y,
        label: RELIC.label,
        value: RELIC.value,
        stolen: this.hasRelic
      },
      extraction: {
        x: EXTRACTION.x,
        y: EXTRACTION.y,
        active: this.hasRelic,
        label: EXTRACTION.label
      },
      route: {
        from: "player",
        to: routeTarget,
        color: this.hasRelic ? "cyan" : "gold",
        points: this.currentRoute().length
      },
      roadSegments: ROAD_PATHS.length,
      hazardCount: HAZARDS.length,
      rivalCount: this.rivals.length,
      chasePressure: this.chasePressure,
      rivalContactMs: Math.round(this.rivalContactMs)
    };
  }

  finishForDebug(outcome: ArcadeMissionOutcome = "escaped"): void {
    if (outcome === "escaped") {
      this.hasRelic = true;
      this.rivalsReleased = true;
      this.phase = "finished";
    }
    this.finishRun(outcome);
  }

  teleportToRelicForDebug(): void {
    this.player.x = RELIC.x - 38;
    this.player.y = RELIC.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.syncCameraTarget();
    this.emitHud(true);
  }

  teleportToExtractionForDebug(): void {
    this.player.x = EXTRACTION.x - 42;
    this.player.y = EXTRACTION.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.syncCameraTarget();
    this.emitHud(true);
  }

  forceChaseForDebug(): void {
    this.hasRelic = true;
    this.releaseRivals();
    this.phase = "chase";
    this.emitHud(true);
  }

  forceRivalPressureForDebug(distanceMeters = 2): void {
    this.forceChaseForDebug();
    const rival = this.rivals[0];
    if (!rival) return;
    const distancePixels = Math.max(8, distanceMeters * 10);
    rival.x = this.player.x - distancePixels;
    rival.y = this.player.y;
    rival.released = true;
    this.rivalContactMs = 0;
    this.chasePressure = "warning";
    this.emitHud(true);
  }

  setVirtualDirection(direction: Direction, active: boolean): void {
    this.virtualDirections[direction] = active;
  }

  tapVirtualDash(): void {
    this.tryDash();
  }

  tapVirtualInteract(): void {
    this.tryInteract();
  }

  tapVirtualRoute(): void {
    if (!this.hasRelic) return;
    this.alibiPulsesUsed += 1;
    this.rivals.forEach((rival) => {
      rival.x += rival.x < this.player.x ? -80 : 80;
      rival.y += rival.y < this.player.y ? -60 : 60;
    });
    this.emitHud(true);
  }

  private resetRun(): void {
    this.player = { x: PLAYER_START.x, y: PLAYER_START.y, vx: 0, vy: 0, facing: -0.2 };
    this.rivals = [
      { id: "rook", name: "Rook", x: 250, y: 300, color: 0xff4d6d, speed: 175, released: false },
      { id: "vesper", name: "Vesper", x: 1580, y: 245, color: 0xff8a2a, speed: 155, released: false },
      { id: "gremlin", name: "Gremlin", x: 1665, y: 910, color: 0xff2f88, speed: 190, released: false }
    ];
    this.startTimeMs = this.sceneNow();
    this.elapsedMs = 0;
    this.lastHudEmitMs = -1;
    this.dashCooldownUntilMs = 0;
    this.alibiPulsesUsed = 0;
    this.rivalContactMs = 0;
    this.chasePressure = "clear";
    this.hasRelic = false;
    this.rivalsReleased = false;
    this.finished = false;
    this.phase = "steal";
    this.syncCameraTarget();
  }

  private syncCameraTarget(): void {
    this.playerTarget?.setPosition(this.player.x, this.player.y);
    this.cameras?.main?.centerOn(this.player.x, this.player.y);
  }

  private updateMovement(delta: number): void {
    const seconds = Math.min(0.04, delta / 1000);
    const input = this.inputVector();
    const acceleration = this.hasRelic ? 720 : 820;
    this.player.vx += input.x * acceleration * seconds;
    this.player.vy += input.y * acceleration * seconds;

    if (input.x === 0) this.player.vx *= 0.9;
    if (input.y === 0) this.player.vy *= 0.9;

    const speed = Math.hypot(this.player.vx, this.player.vy);
    const maxSpeed = this.hasRelic ? MAX_SPEED * 1.05 : MAX_SPEED;
    if (speed > maxSpeed) {
      this.player.vx = (this.player.vx / speed) * maxSpeed;
      this.player.vy = (this.player.vy / speed) * maxSpeed;
    }

    this.player.x = Phaser.Math.Clamp(this.player.x + this.player.vx * seconds, 70, WORLD.width - 70);
    this.player.y = Phaser.Math.Clamp(this.player.y + this.player.vy * seconds, 70, WORLD.height - 70);
    if (Math.hypot(this.player.vx, this.player.vy) > 14) {
      this.player.facing = Math.atan2(this.player.vy, this.player.vx);
    }
  }

  private inputVector(): Point {
    const left = Boolean(this.cursors?.left.isDown || this.keyA?.isDown || this.virtualDirections.left);
    const right = Boolean(this.cursors?.right.isDown || this.keyD?.isDown || this.virtualDirections.right);
    const up = Boolean(this.cursors?.up.isDown || this.keyW?.isDown || this.virtualDirections.up);
    const down = Boolean(this.cursors?.down.isDown || this.keyS?.isDown || this.virtualDirections.down);
    const x = (right ? 1 : 0) - (left ? 1 : 0);
    const y = (down ? 1 : 0) - (up ? 1 : 0);
    const length = Math.hypot(x, y);
    return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
  }

  private updateRivals(delta: number): void {
    if (!this.rivalsReleased) return;
    const seconds = Math.min(0.04, delta / 1000);
    for (const rival of this.rivals) {
      rival.released = true;
      const dx = this.player.x - rival.x;
      const dy = this.player.y - rival.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const orbit = Math.sin((this.elapsedMs + rival.speed * 11) / 420) * 0.34;
      const angle = Math.atan2(dy, dx) + orbit;
      rival.x += Math.cos(angle) * rival.speed * seconds;
      rival.y += Math.sin(angle) * rival.speed * seconds;
    }
  }

  private updateChasePressure(delta: number): void {
    const pressure = updateGetawayChasePressure({
      hasRelic: this.hasRelic,
      rivalsReleased: this.rivalsReleased,
      nearestRivalDistance: this.nearestRivalDistance(),
      previousContactMs: this.rivalContactMs,
      deltaMs: delta,
      captureRadius: RIVAL_CAPTURE_RADIUS,
      captureHoldMs: RIVAL_CAPTURE_HOLD_MS
    });
    this.rivalContactMs = pressure.contactMs;
    this.chasePressure = pressure.pressure;
    if (pressure.caught) {
      this.finishRun("caught");
    }
  }

  private tryDash(): void {
    const now = this.sceneNow();
    if (now < this.dashCooldownUntilMs) return;
    const input = this.inputVector();
    const angle = input.x !== 0 || input.y !== 0 ? Math.atan2(input.y, input.x) : this.player.facing;
    this.player.vx = Math.cos(angle) * DASH_SPEED;
    this.player.vy = Math.sin(angle) * DASH_SPEED;
    this.dashCooldownUntilMs = now + DASH_COOLDOWN_MS;
  }

  private justInteractPressed(): boolean {
    return this.keyJustDown(this.keyE) || this.keyJustDown(this.keySpace);
  }

  private keyJustDown(key: Phaser.Input.Keyboard.Key | null): boolean {
    return key ? Phaser.Input.Keyboard.JustDown(key) : false;
  }

  private tryInteract(): void {
    if (!this.hasRelic && this.distanceTo(RELIC) <= INTERACT_RADIUS) {
      this.hasRelic = true;
      this.phase = "chase";
      this.releaseRivals();
      this.emitHud(true);
      return;
    }

    if (this.hasRelic && this.distanceTo(EXTRACTION) <= INTERACT_RADIUS) {
      this.phase = "escape";
      this.finishRun("escaped");
    }
  }

  private releaseRivals(): void {
    this.rivalsReleased = true;
    this.rivals.forEach((rival) => {
      rival.released = true;
    });
    this.rivalContactMs = 0;
    this.chasePressure = "clear";
  }

  private finishRun(outcome: ArcadeMissionOutcome): void {
    if (this.finished || !this.missionConfig) return;
    this.finished = true;
    this.phase = "finished";
    const lootValue = outcome === "escaped" && this.hasRelic ? RELIC.value : 0;
    this.missionConfig.onFinish(
      buildGetawayMissionResult({
        outcome,
        playerName: this.humanPlayerName(),
        lootValue,
        elapsedMs: Math.max(1, Math.round(this.elapsedMs)),
        alarm: this.alarmLevel(),
        alibiPulsesUsed: this.alibiPulsesUsed
      })
    );
  }

  private emitHud(force = false): void {
    if (!this.missionConfig) return;
    const now = this.sceneNow();
    if (!force && now - this.lastHudEmitMs < 120) return;
    this.lastHudEmitMs = now;
    this.missionConfig.onHudUpdate(this.buildHudState());
  }

  private buildHudState(): ArcadeHudState {
    const nearRelic = !this.hasRelic && this.distanceTo(RELIC) <= INTERACT_RADIUS;
    const nearExit = this.hasRelic && this.distanceTo(EXTRACTION) <= INTERACT_RADIUS;
    const timeLeftMs = this.timeLeftMs();
    const objective = selectGetawayObjective({ hasRelic: this.hasRelic, escaped: false, caught: false });
    const targetLabel = this.hasRelic ? "Extraction" : "Moon Pearl +3";
    const targetDistance = Math.round(this.distanceTo(this.hasRelic ? EXTRACTION : RELIC) / 10);
    const activeAction = nearRelic
      ? { key: "E", label: "Steal +3", tone: "success" as const }
      : nearExit
        ? { key: "E", label: "Cashout +5", tone: "success" as const }
        : { key: "Move", label: "Drive", tone: "neutral" as const };

    return {
      phase: "stealth",
      timeLeftMs,
      alarm: this.alarmLevel(),
      lootValue: this.hasRelic ? RELIC.value : 0,
      aiLootValue: 0,
      aiPendingLootValue: 0,
      artifactsStolen: this.hasRelic ? 1 : 0,
      totalArtifacts: 1,
      canEscape: this.hasRelic,
      dashReady: this.sceneNow() >= this.dashCooldownUntilMs,
      objective: objective.label,
      prompt: nearRelic ? "Steal" : nearExit ? "Cashout" : "",
      objectiveCompass: buildObjectiveCompass({
        kind: this.hasRelic ? "escape" : "artifact",
        targetLabel,
        directionLabel: null,
        distanceMeters: targetDistance,
        cashoutValue: this.hasRelic ? 5 : null,
        timeLeftMs
      }),
      activeAction,
      loopStep: this.hasRelic ? "escape" : "steal",
      raceStatus: this.hasRelic ? "Blue carrying +3" : "Reach the Moon Pearl",
      lastRivalSteal: null,
      rivalIntercept: null,
      rivalObjective: null,
      rivalIntelCards: [],
      vaultCondition: {
        tone: this.hasRelic ? "alarm" : "stable",
        label: this.hasRelic ? "Chase Live" : "Vault Quiet",
        detail: this.hasRelic ? "Exit route armed" : "Low profile"
      },
      escapePayout: this.hasRelic ? { escapeBonus: 2, cashout: 5 } : null,
      extractionCue: null,
      extractionSequence: null,
      hunterChaseCue: this.hasRelic
        ? {
            agentName: "Rook",
            distanceMeters: Math.round(this.nearestRivalDistance() / 10),
            beamCount: this.chasePressure === "critical" ? 4 : 2
          }
        : null,
      lockBreakPayoff: null,
      routeChoice: null,
      routePulse: null,
      alibiPayoff: null,
      radarBlips: [
        { id: "moon-pearl", kind: "target", label: "Moon Pearl", x: 66, y: 35 },
        { id: "lift", kind: "exit", label: "Extraction", x: 85, y: 76 },
        ...this.rivals.map((rival) => ({ id: rival.id, kind: "rival" as const, label: rival.name, x: (rival.x / WORLD.width) * 100, y: (rival.y / WORLD.height) * 100 }))
      ],
      greedStatus: null,
      targetDistanceLabel: `${targetDistance}m`,
      rivalStatus: this.rivalsReleased ? "Rivals chasing" : "Rivals asleep",
      rivalDistanceLabel: this.rivalsReleased ? `${Math.round(this.nearestRivalDistance() / 10)}m` : null,
      rivalPressureLevel: this.chasePressure === "critical" ? "danger" : this.rivalsReleased ? "closing" : "standby",
      rivalScanStatus: {
        label: this.chasePressure === "critical" ? "Capture lock" : this.rivalsReleased ? "Chase" : "Clear",
        tone: this.chasePressure === "critical" ? "charging" : this.rivalsReleased ? "charging" : "idle",
        progress: this.chasePressure === "critical" ? 85 : this.chasePressure === "warning" ? 45 : this.rivalsReleased ? 20 : 0
      },
      alibiPulseStatus: "Alibi ready",
      paceStatus: timeLeftMs > 90_000 ? "S-Rank pace" : "Move",
      cleanBonusWindow: null,
      lootChainWindow: null,
      lootSpeedSurge: null,
      comboCashoutWindow: null,
      missionBeat: {
        tone: this.hasRelic ? "success" : "focus",
        kicker: this.hasRelic ? "Getaway" : "First hit",
        title: objective.label,
        detail: this.hasRelic ? "Follow cyan to extraction." : "Follow gold to the relic.",
        action: nearRelic || nearExit ? "Press E / Space" : "Drive"
      },
      directorCue: {
        tone: this.hasRelic ? "success" : "focus",
        label: "Director cue",
        title: objective.label,
        detail: this.hasRelic ? "Cashout is live." : "First score starts the chase.",
        reward: this.hasRelic ? "Bank +5." : "Steal +3.",
        action: nearRelic || nearExit ? "Press E / Space." : "Follow the route."
      },
      threatCue: null,
      objectiveBanner: null,
      rivalBark: null,
      scorePopup: null,
      spotlight: null,
      feed: []
    };
  }

  private drawWorld(): void {
    const graphics = this.worldGraphics;
    if (!graphics) return;
    graphics.clear();
    graphics.fillStyle(0x03060d, 1);
    graphics.fillRect(0, 0, WORLD.width, WORLD.height);
    this.drawStarfield(graphics);
    this.drawRoads(graphics);
    this.drawHangars(graphics);
    this.drawHazards(graphics);
    this.drawRoute(graphics);
    this.drawCaptureRisk(graphics);
    this.drawExtraction(graphics);
    this.drawRelic(graphics);
    this.drawRivals(graphics);
    this.drawPlayer(graphics);
  }

  private drawStarfield(graphics: Phaser.GameObjects.Graphics): void {
    for (const crater of CRATERS) {
      graphics.fillStyle(0x09101d, 0.75);
      graphics.fillCircle(crater.x, crater.y, crater.radius);
      graphics.lineStyle(2, 0x1b2a3c, 0.5);
      graphics.strokeCircle(crater.x, crater.y, crater.radius);
    }
    for (let index = 0; index < 95; index += 1) {
      const x = (index * 137) % WORLD.width;
      const y = (index * 271) % WORLD.height;
      const alpha = 0.16 + ((index * 17) % 30) / 100;
      graphics.fillStyle(index % 5 === 0 ? 0x9de7ff : 0x31435f, alpha);
      graphics.fillCircle(x, y, index % 7 === 0 ? 2 : 1);
    }
  }

  private drawRoads(graphics: Phaser.GameObjects.Graphics): void {
    for (const path of ROAD_PATHS) {
      this.strokePath(graphics, path, 82, 0x111a2a, 0.96);
      this.strokePath(graphics, path, 58, 0x1d3146, 0.92);
      this.strokePath(graphics, path, 4, 0x52f0ff, 0.2);
      for (const point of path) {
        graphics.fillStyle(0x1d3146, 0.92);
        graphics.fillCircle(point.x, point.y, 29);
      }
    }
  }

  private drawHangars(graphics: Phaser.GameObjects.Graphics): void {
    const pads = [
      { x: 250, y: 760, w: 230, h: 120, color: 0x10384f },
      { x: 1180, y: 355, w: 210, h: 150, color: 0x4b3b13 },
      { x: 1530, y: 790, w: 260, h: 150, color: 0x123f36 },
      { x: 915, y: 220, w: 210, h: 110, color: 0x172644 },
      { x: 1430, y: 560, w: 230, h: 110, color: 0x1a2138 }
    ];
    for (const pad of pads) {
      graphics.fillStyle(pad.color, 0.72);
      graphics.fillRoundedRect(pad.x - pad.w / 2, pad.y - pad.h / 2, pad.w, pad.h, 18);
      graphics.lineStyle(3, 0x83f7ff, 0.18);
      graphics.strokeRoundedRect(pad.x - pad.w / 2, pad.y - pad.h / 2, pad.w, pad.h, 18);
    }
  }

  private drawHazards(graphics: Phaser.GameObjects.Graphics): void {
    for (const hazard of HAZARDS) {
      graphics.fillStyle(0xff3d6a, 0.2);
      graphics.fillCircle(hazard.x, hazard.y, 28);
      graphics.lineStyle(2, 0xff3d6a, 0.72);
      graphics.strokeCircle(hazard.x, hazard.y, 18);
      graphics.lineStyle(1, 0xffc247, 0.55);
      graphics.lineBetween(hazard.x - 13, hazard.y, hazard.x + 13, hazard.y);
      graphics.lineBetween(hazard.x, hazard.y - 13, hazard.x, hazard.y + 13);
    }
  }

  private drawRoute(graphics: Phaser.GameObjects.Graphics): void {
    const route = this.currentRoute();
    const color = this.hasRelic ? 0x44f2ff : 0xffd45a;
    this.strokePath(graphics, route, 18, color, 0.16);
    this.strokePath(graphics, route, 5, color, 0.9);
    for (let index = 1; index < route.length; index += 1) {
      const point = route[index]!;
      graphics.fillStyle(color, 0.9);
      graphics.fillCircle(point.x, point.y, 7 + Math.sin(this.elapsedMs / 180 + index) * 2);
    }
  }

  private drawRelic(graphics: Phaser.GameObjects.Graphics): void {
    if (this.hasRelic) return;
    const pulse = 1 + Math.sin(this.elapsedMs / 180) * 0.12;
    graphics.fillStyle(0xffd45a, 0.18);
    graphics.fillCircle(RELIC.x, RELIC.y, 82 * pulse);
    graphics.lineStyle(5, 0xffd45a, 0.78);
    graphics.strokeCircle(RELIC.x, RELIC.y, 46 * pulse);
    graphics.fillStyle(0xfff2a7, 1);
    graphics.fillTriangle(RELIC.x, RELIC.y - 28, RELIC.x + 28, RELIC.y, RELIC.x, RELIC.y + 28);
    graphics.fillTriangle(RELIC.x, RELIC.y - 28, RELIC.x - 28, RELIC.y, RELIC.x, RELIC.y + 28);
  }

  private drawExtraction(graphics: Phaser.GameObjects.Graphics): void {
    const active = this.hasRelic;
    const color = active ? 0x42ffba : 0x2a6f67;
    const alpha = active ? 0.82 : 0.35;
    graphics.fillStyle(color, 0.12 + alpha * 0.16);
    graphics.fillCircle(EXTRACTION.x, EXTRACTION.y, active ? 105 : 72);
    graphics.lineStyle(active ? 7 : 4, color, alpha);
    graphics.strokeCircle(EXTRACTION.x, EXTRACTION.y, active ? 72 : 48);
    graphics.lineStyle(3, 0xe7fff8, active ? 0.9 : 0.32);
    graphics.strokeCircle(EXTRACTION.x, EXTRACTION.y, active ? 36 : 28);
  }

  private drawRivals(graphics: Phaser.GameObjects.Graphics): void {
    for (const rival of this.rivals) {
      const alpha = rival.released ? 0.95 : 0.34;
      graphics.fillStyle(rival.color, 0.12);
      graphics.fillCircle(rival.x, rival.y, rival.released ? 42 : 25);
      graphics.fillStyle(rival.color, alpha);
      graphics.fillCircle(rival.x, rival.y, rival.released ? 15 : 10);
      if (rival.released) {
        graphics.lineStyle(3, rival.color, 0.55);
        graphics.lineBetween(rival.x, rival.y, this.player.x, this.player.y);
      }
    }
  }

  private drawCaptureRisk(graphics: Phaser.GameObjects.Graphics): void {
    if (!this.hasRelic || this.chasePressure === "clear") return;
    const danger = this.chasePressure === "critical";
    graphics.fillStyle(danger ? 0xff2f5f : 0xff9f2f, danger ? 0.14 : 0.08);
    graphics.fillCircle(this.player.x, this.player.y, RIVAL_CAPTURE_RADIUS + (danger ? 24 : 12));
    graphics.lineStyle(danger ? 5 : 3, danger ? 0xff2f5f : 0xffb34a, danger ? 0.75 : 0.45);
    graphics.strokeCircle(this.player.x, this.player.y, RIVAL_CAPTURE_RADIUS);
  }

  private drawPlayer(graphics: Phaser.GameObjects.Graphics): void {
    const angle = this.player.facing;
    const nose = { x: this.player.x + Math.cos(angle) * 27, y: this.player.y + Math.sin(angle) * 27 };
    const left = { x: this.player.x + Math.cos(angle + 2.45) * 21, y: this.player.y + Math.sin(angle + 2.45) * 21 };
    const right = { x: this.player.x + Math.cos(angle - 2.45) * 21, y: this.player.y + Math.sin(angle - 2.45) * 21 };

    graphics.lineStyle(2, 0x96f7ff, 0.35);
    for (let index = 1; index <= 4; index += 1) {
      graphics.strokeCircle(this.player.x, this.player.y, 22 + index * 9);
    }
    graphics.fillStyle(0x53f7ff, 0.2);
    graphics.fillCircle(this.player.x, this.player.y, 42);
    graphics.fillStyle(0xbafcff, 1);
    graphics.fillTriangle(nose.x, nose.y, left.x, left.y, right.x, right.y);
    graphics.lineStyle(3, 0x07111c, 0.9);
    graphics.strokeTriangle(nose.x, nose.y, left.x, left.y, right.x, right.y);
    if (this.hasRelic) {
      graphics.fillStyle(0xffd45a, 1);
      graphics.fillCircle(this.player.x - Math.cos(angle) * 8, this.player.y - Math.sin(angle) * 8, 7);
    }
  }

  private strokePath(graphics: Phaser.GameObjects.Graphics, points: Point[], width: number, color: number, alpha: number): void {
    graphics.lineStyle(width, color, alpha);
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1]!;
      const point = points[index]!;
      graphics.lineBetween(previous.x, previous.y, point.x, point.y);
    }
  }

  private currentRoute(): Point[] {
    if (this.hasRelic) {
      return [
        { x: this.player.x, y: this.player.y },
        { x: 1230, y: 770 },
        { x: EXTRACTION.x, y: EXTRACTION.y }
      ];
    }

    return [
      { x: this.player.x, y: this.player.y },
      { x: 620, y: 640 },
      { x: 940, y: 475 },
      { x: RELIC.x, y: RELIC.y }
    ];
  }

  private distanceTo(point: Point): number {
    return Math.hypot(this.player.x - point.x, this.player.y - point.y);
  }

  private nearestRivalDistance(): number {
    return this.rivals.reduce((nearest, rival) => Math.min(nearest, Math.hypot(this.player.x - rival.x, this.player.y - rival.y)), Number.POSITIVE_INFINITY);
  }

  private timeLeftMs(): number {
    return Math.max(0, ARCADE_MISSION_DURATION_MS - Math.round(this.elapsedMs));
  }

  private alarmLevel(): number {
    const base = 1 + Math.floor(this.elapsedMs / 34_000);
    return Phaser.Math.Clamp(base + (this.rivalsReleased ? 1 : 0), 1, 5);
  }

  private humanPlayerName(): string {
    return this.missionConfig?.state.players.find((player) => player.kind === "human")?.name ?? "Agent You";
  }

  private sceneNow(): number {
    return this.time?.now ?? 0;
  }
}
