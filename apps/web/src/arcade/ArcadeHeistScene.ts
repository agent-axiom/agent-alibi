import Phaser from "phaser";
import type { ArtifactState, GameState, PlayerState, Room, TeamId } from "@agent-alibi/shared";
import { ALIBI_PULSE_COOLDOWN_MS, buildAlibiPulseStatus, canUseAlibiPulse } from "./alibi-pulse";
import { rateArcadeRun } from "./arcade-rules";
import {
  ARCADE_MISSION_DURATION_MS,
  type ArcadeExtractionCue,
  type ArcadeHudPhase,
  type ArcadeHudState,
  type ArcadeMissionConfig,
  type ArcadeObjectiveBanner,
  type ArcadeRadarBlip,
  type ArcadeRivalBark,
  type ArcadeRivalIntercept,
  type ArcadeRouteChoice,
  type ArcadeRoutePulse,
  type ArcadeScorePopup,
  type ArcadeThreatCue
} from "./arcade-types";
import { buildActiveActionHint, buildArcadeGuidance, buildObjectiveCompass, buildRivalPressure, type RivalPressure } from "./guidance";
import { buildMissionBeat } from "./mission-beats";
import { nextMovementImpulse, selectMovementVector, type MovementImpulse, type MovementVector } from "./movement";
import { buildObjectiveDirectionLabel } from "./navigation";
import { buildRivalScanStatus, updateRivalScan as advanceRivalScan, type RivalScanState } from "./rival-scan";

const WORLD_WIDTH = 1680;
const WORLD_HEIGHT = 1040;
const PLAYER_SPEED = 285;
const DASH_SPEED = 620;
const AI_SPEED = 150;
const PICKUP_RADIUS = 42;
const EXIT_RADIUS = 74;
const INTERCEPT_RADIUS = 64;
const DASH_COOLDOWN_MS = 1150;
const AI_GRACE_MS = 10_500;
const AI_WAKE_HOLD_MS = 14_000;
const LOOT_CHAIN_WINDOW_MS = 12_000;

const TEAM_COLORS: Record<TeamId, number> = {
  blue: 0x4cf4f0,
  red: 0xff4f7b
};

type RuntimeArtifact = {
  id: string;
  name: string;
  roomId: string;
  value: number;
  size: ArtifactState["size"];
  x: number;
  y: number;
  takenBy?: string;
  gem: Phaser.GameObjects.Polygon;
  label: Phaser.GameObjects.Text;
};

type CarriedRelic = {
  name: string;
  value: number;
};

type RuntimeAgent = {
  id: string;
  name: string;
  teamId: TeamId;
  x: number;
  y: number;
  targetRoomId: string;
  lootValue: number;
  carriedRelics: CarriedRelic[];
  body: Phaser.GameObjects.Container;
  dot: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  ship: Phaser.GameObjects.Container;
  carrierBadge: Phaser.GameObjects.Container;
  carrierBadgeLabel: Phaser.GameObjects.Text;
};

type ArcadeObjectiveTarget =
  | { kind: "artifact"; id: string; label: string; x: number; y: number }
  | { kind: "carrier"; id: string; label: string; x: number; y: number }
  | { kind: "escape"; id: "escape"; label: string; x: number; y: number };

type RouteMode = "escape" | "greed";

type RivalScan = {
  name: string;
  distanceMeters: number;
  dx: number;
  dy: number;
};

type RivalCarrierRun = {
  agent: RuntimeAgent;
  relic: CarriedRelic;
  distanceMeters: number;
  directionLabel: string;
};

type ImpactKind = "steal" | "intercept" | "alibi" | "escape" | "lockdown" | "cashout";
type CameraKickKind = ImpactKind | "dash";

type MotionTrailPoint = {
  x: number;
  y: number;
  ageMs: number;
  ttlMs: number;
  radius: number;
  color: number;
};

type MovementKeys = {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  shift: Phaser.Input.Keyboard.Key;
  e: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
};

type RawMovementKeys = {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  SHIFT: Phaser.Input.Keyboard.Key;
  E: Phaser.Input.Keyboard.Key;
  SPACE: Phaser.Input.Keyboard.Key;
};

type HeldDirection = "up" | "down" | "left" | "right";

export class ArcadeHeistScene extends Phaser.Scene {
  private config?: ArcadeMissionConfig;
  private state?: GameState;
  private rooms = new Map<string, { room: Room; x: number; y: number }>();
  private arenaRoomLabelCount = 0;
  private arenaZoneBeacons = new Set<string>();
  private artifacts: RuntimeArtifact[] = [];
  private aiAgents: RuntimeAgent[] = [];
  private player?: RuntimeAgent;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: MovementKeys;
  private heldDirections = new Set<HeldDirection>();
  private shiftHeld = false;
  private keyboardImpulse?: MovementImpulse;
  private pointerTarget?: Phaser.Math.Vector2;
  private elapsedMs = 0;
  private alarm = 1;
  private dashCooldownMs = 0;
  private lootValue = 0;
  private artifactsStolen = 0;
  private stolenRelicNames: string[] = [];
  private rivalRelicNames: string[] = [];
  private lastLootChainAtMs = Number.NEGATIVE_INFINITY;
  private aiLootValue = 0;
  private lastHudAt = -1;
  private feed: string[] = [];
  private spotlight: string | null = null;
  private spotlightUntilMs = 0;
  private scorePopup: ArcadeScorePopup | null = null;
  private scorePopupUntilMs = 0;
  private objectiveBanner: ArcadeObjectiveBanner | null = null;
  private objectiveBannerUntilMs = 0;
  private rivalBark: ArcadeRivalBark | null = null;
  private rivalBarkUntilMs = 0;
  private routePulse: ArcadeRoutePulse | null = null;
  private routePulseUntilMs = 0;
  private finished = false;
  private aiReleased = false;
  private aiWakeHoldMs = 0;
  private aiActionHoldMs = 0;
  private lastRivalPressureLevel: RivalPressure["level"] = "standby";
  private rivalScanState: RivalScanState = { chargeMs: 0, cooldownMs: 0 };
  private alibiPulseCooldownMs = 0;
  private alibiPulsesUsed = 0;
  private scanBurns = 0;
  private carrierIntercepts = 0;
  private interceptedRelicNames: string[] = [];
  private lastRivalSteal: string | null = null;
  private playerName = "Agent You";
  private routeMode: RouteMode = "escape";
  private escapeZone?: Phaser.GameObjects.Container;
  private escapePayoutBadge?: Phaser.GameObjects.Container;
  private escapePayoutBadgeLabel?: Phaser.GameObjects.Text;
  private targetMarker?: Phaser.GameObjects.Container;
  private targetBeam?: Phaser.GameObjects.Graphics;
  private threatHalo?: Phaser.GameObjects.Graphics;
  private carrierRoute?: Phaser.GameObjects.Graphics;
  private motionTrail?: Phaser.GameObjects.Graphics;
  private motionTrailPoints: MotionTrailPoint[] = [];
  private motionTrailBurstCount = 0;
  private motionTrailActiveUntilMs = 0;
  private impactCount = 0;
  private lastImpact: { kind: ImpactKind; count: number; atMs: number } | null = null;
  private cameraKickCount = 0;
  private lastCameraKick: { kind: CameraKickKind; count: number; atMs: number } | null = null;

  constructor() {
    super("arcade-heist");
  }

  create() {
    this.cameras.main.setBackgroundColor("#050811");
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.pointerTarget = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
    });
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.input.keyboard?.on("keydown", this.handleKeyDown, this);
    window.addEventListener("keydown", this.handleWindowKeyDown, true);
    window.addEventListener("keyup", this.handleWindowKeyUp, true);
    window.addEventListener("blur", this.clearWindowKeys);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.handleKeyDown, this);
      window.removeEventListener("keydown", this.handleWindowKeyDown, true);
      window.removeEventListener("keyup", this.handleWindowKeyUp, true);
      window.removeEventListener("blur", this.clearWindowKeys);
    });
    const rawKeys = this.input.keyboard?.addKeys("W,A,S,D,SHIFT,E,SPACE") as RawMovementKeys | undefined;
    this.keys = rawKeys
      ? {
          w: rawKeys.W,
          a: rawKeys.A,
          s: rawKeys.S,
          d: rawKeys.D,
          shift: rawKeys.SHIFT,
          e: rawKeys.E,
          space: rawKeys.SPACE
        }
      : undefined;

    if (this.config) {
      this.startMission(this.config);
    }
  }

  setMissionConfig(config: ArcadeMissionConfig) {
    this.config = config;
    if (this.sys.isActive()) {
      this.startMission(config);
    }
  }

  finishForDebug() {
    if (this.finished) return;
    this.finish("escaped");
  }

  setVirtualDirection(direction: HeldDirection, pressed: boolean) {
    if (pressed) {
      this.heldDirections.add(direction);
      this.pointerTarget = undefined;
      this.keyboardImpulse = nextMovementImpulse(undefined, movementVectorFromDirection(direction), 0);
      return;
    }

    this.heldDirections.delete(direction);
  }

  tapVirtualDash() {
    this.shiftHeld = true;
    this.time.delayedCall(420, () => {
      this.shiftHeld = false;
    });
  }

  tapVirtualInteract() {
    this.tryInteract();
  }

  tapVirtualRoute() {
    this.toggleRouteMode();
  }

  getDebugState() {
    const target = this.currentObjectiveTarget();
    const nearestRival = this.nearestRivalScan();
    const routeGuide = this.routeGuideDebug(target);
    return {
      player: this.player ? { x: this.player.x, y: this.player.y } : null,
      camera: {
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
        zoom: this.cameras.main.zoom
      },
      lootValue: this.lootValue,
      aiLootValue: this.aiLootValue,
      alarmRaw: Number(this.alarm.toFixed(3)),
      dashCooldownMs: Math.round(this.dashCooldownMs),
      rivalScanChargeMs: Math.round(this.rivalScanState.chargeMs),
      alibiPulseCooldownMs: Math.round(this.alibiPulseCooldownMs),
      targetArtifact: this.primaryTargetArtifact()
        ? {
            id: this.primaryTargetArtifact()!.id,
            name: this.primaryTargetArtifact()!.name,
            x: this.primaryTargetArtifact()!.x,
            y: this.primaryTargetArtifact()!.y
          }
        : null,
      target,
      targetMarker: this.targetMarkerDebug(),
      hasTargetBeam: Boolean(this.targetBeam),
      routeGuide,
      threatHalo: this.threatHaloDebug(),
      carrierCashoutRoute: this.carrierCashoutRouteDebug(),
      carrierBadges: this.carrierBadgesDebug(),
      escapeZoneBadge: this.escapeZoneBadgeDebug(),
      motionTrail: this.motionTrailDebug(),
      arenaLabels: this.arenaLabelsDebug(),
      routeMode: this.routeMode,
      nearestRival,
      rivalsReleased: this.aiReleased,
      rivalsActive: this.rivalsAreActive(),
      rivalWakeHoldMs: Math.round(this.aiWakeHoldMs),
      rivals: this.aiAgents.map((agent) => ({
        name: agent.name,
        visualLabel: agent.label.text,
        alpha: Number(agent.body.alpha.toFixed(2)),
        x: Math.round(agent.x),
        y: Math.round(agent.y)
      })),
      lastRivalSteal: this.lastRivalSteal,
      rivalIntercept: this.rivalIntercept(),
      impulse: this.keyboardImpulse ?? null,
      lastImpact: this.lastImpact,
      lastCameraKick: this.lastCameraKick
    };
  }

  teleportToTargetForDebug() {
    if (!this.player) return;
    const target = this.currentObjectiveTarget();
    if (!target) return;
    const offsetY = target.kind === "artifact" ? 28 : 0;
    this.moveAgent(this.player, target.x - this.player.x, target.y + offsetY - this.player.y);
    this.pointerTarget = undefined;
    this.emitHudIfNeeded(true);
  }

  forceRivalPressureForDebug(distanceMeters = 8) {
    const rival = this.aiAgents[0];
    if (!this.player || !rival) return;
    const distancePx = Math.max(1, distanceMeters) * 8;
    const direction = this.player.x + distancePx < WORLD_WIDTH - 82 ? 1 : -1;
    this.moveAgent(rival, this.player.x + direction * distancePx - rival.x, this.player.y - rival.y);
    this.releaseRivals({ announce: false, holdMs: 0 });
    this.aiWakeHoldMs = 0;
    this.aiActionHoldMs = 10_000;
    this.updateRivalPressureFeed();
    this.updateThreatHalo();
    this.emitHudIfNeeded(true);
  }

  forceRivalStealForDebug() {
    const rival = this.aiAgents[0];
    const artifact = this.artifacts.find((candidate) => !candidate.takenBy);
    if (!rival || !artifact) return;

    this.releaseRivals({ announce: false, holdMs: 0 });
    this.aiWakeHoldMs = 0;
    this.aiActionHoldMs = 10_000;
    this.moveAgent(rival, artifact.x - rival.x, artifact.y - rival.y);
    this.stealArtifact(artifact, rival, rival.name);
    this.updateThreatHalo();
    this.emitHudIfNeeded(true);
  }

  forceRivalCashoutForDebug() {
    const rival = this.aiAgents.find((agent) => agent.carriedRelics.length > 0);
    if (!rival) return;
    const target = this.escapeZone ?? this.rooms.get("atrium");
    if (target) {
      this.moveAgent(rival, target.x - rival.x, target.y - rival.y);
    }
    this.cashoutRivalCarrier(rival);
  }

  forceRivalNearCashoutForDebug() {
    const rival = this.aiAgents.find((agent) => agent.carriedRelics.length > 0);
    const target = this.escapeZone ?? this.rooms.get("atrium");
    if (!rival || !target) return;

    this.moveAgent(rival, target.x + EXIT_RADIUS + 18 - rival.x, target.y - rival.y);
    rival.targetRoomId = "atrium";
    this.updateCarrierBadges();
    this.updateTargetMarker();
    this.updateThreatHalo();
    this.updateCarrierCashoutRoute();
    this.emitHudIfNeeded(true);
  }

  forceLockdownForDebug() {
    this.elapsedMs = Math.max(this.elapsedMs, ARCADE_MISSION_DURATION_MS - 25_000);
    this.flashSpotlight("Vault lockdown");
    this.impactPulse("lockdown");
    this.feedLine("Vault lockdown imminent. Escape route priority.");
    this.emitHudIfNeeded(true);
  }

  override update(_time: number, delta: number) {
    if (!this.state || !this.player || this.finished) return;

    this.elapsedMs += delta;
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - delta);
    this.alibiPulseCooldownMs = Math.max(0, this.alibiPulseCooldownMs - delta);

    this.updatePlayer(delta);
    this.updateMotionTrail(delta);
    this.updateAi(delta);
    this.updateCarrierBadges();
    this.updateRivalPressureFeed();
    this.updateRivalScan(delta);
    this.updateTargetMarker();
    this.updateThreatHalo();
    this.updateCarrierCashoutRoute();
    this.updateEscapePayoutBadge();
    this.updateAlarm(delta);
    this.emitHudIfNeeded(false);

    if (this.elapsedMs >= ARCADE_MISSION_DURATION_MS) {
      this.finish(this.lootValue > 0 && this.isNearExit() ? "escaped" : "sealed");
    }
  }

  private startMission(config: ArcadeMissionConfig) {
    this.config = config;
    this.state = config.state;
    this.rooms.clear();
    this.arenaRoomLabelCount = 0;
    this.arenaZoneBeacons.clear();
    this.artifacts = [];
    this.aiAgents = [];
    this.player = undefined;
    this.heldDirections.clear();
    this.shiftHeld = false;
    this.keyboardImpulse = undefined;
    this.pointerTarget = undefined;
    this.elapsedMs = 0;
    this.alarm = 1;
    this.dashCooldownMs = 0;
    this.lootValue = 0;
    this.artifactsStolen = 0;
    this.stolenRelicNames = [];
    this.rivalRelicNames = [];
    this.lastLootChainAtMs = Number.NEGATIVE_INFINITY;
    this.aiLootValue = 0;
    this.lastHudAt = -1;
    this.feed = ["Moon Vault breach started.", "Rival agents wait for your first score.", "Move fast. Steal clean. Escape before lockdown."];
    this.spotlight = null;
    this.spotlightUntilMs = 0;
    this.scorePopup = null;
    this.scorePopupUntilMs = 0;
    this.objectiveBanner = null;
    this.objectiveBannerUntilMs = 0;
    this.rivalBark = null;
    this.rivalBarkUntilMs = 0;
    this.routePulse = null;
    this.routePulseUntilMs = 0;
    this.finished = false;
    this.aiReleased = false;
    this.aiWakeHoldMs = 0;
    this.aiActionHoldMs = 0;
    this.lastRivalPressureLevel = "standby";
    this.rivalScanState = { chargeMs: 0, cooldownMs: 0 };
    this.alibiPulseCooldownMs = 0;
    this.alibiPulsesUsed = 0;
    this.scanBurns = 0;
    this.carrierIntercepts = 0;
    this.interceptedRelicNames = [];
    this.lastRivalSteal = null;
    this.routeMode = "escape";
    this.targetMarker = undefined;
    this.targetBeam = undefined;
    this.threatHalo = undefined;
    this.escapePayoutBadge = undefined;
    this.escapePayoutBadgeLabel = undefined;
    this.carrierRoute = undefined;
    this.motionTrail = undefined;
    this.motionTrailPoints = [];
    this.motionTrailBurstCount = 0;
    this.motionTrailActiveUntilMs = 0;
    this.impactCount = 0;
    this.lastImpact = null;
    this.cameraKickCount = 0;
    this.lastCameraKick = null;
    this.playerName = config.state.players.find((player) => player.kind === "human")?.name ?? "Agent You";

    this.tweens.killAll();
    this.children.removeAll(true);
    this.drawWorld(config.state);
    this.createActors(config.state);
    this.resizeCamera();
    this.updateTargetMarker();
    this.updateThreatHalo();
    this.updateCarrierCashoutRoute();
    this.updateCarrierBadges();
    this.updateEscapePayoutBadge();
    this.scale.off("resize", this.resizeCamera, this);
    this.scale.on("resize", this.resizeCamera, this);
    this.flashObjectiveBanner({
      tone: "steal",
      title: "Steal Moon Pearl",
      detail: "First score wins tempo"
    });
    this.emitHudIfNeeded(true);
  }

  private drawWorld(state: GameState) {
    const bg = this.add.graphics();
    bg.fillStyle(0x050811, 1);
    bg.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x7efcff, 0.06);
    for (let x = 0; x <= WORLD_WIDTH; x += 64) grid.lineBetween(x, 0, x, WORLD_HEIGHT);
    for (let y = 0; y <= WORLD_HEIGHT; y += 64) grid.lineBetween(0, y, WORLD_WIDTH, y);

    for (const room of state.rooms) {
      this.rooms.set(room.id, {
        room,
        x: 210 + (room.x / 100) * 1260,
        y: 155 + (room.y / 100) * 730
      });
    }

    const corridors = this.add.graphics();
    corridors.lineStyle(54, 0x1a2740, 0.94);
    for (const edge of state.edges) {
      const from = this.rooms.get(edge.from);
      const to = this.rooms.get(edge.to);
      if (!from || !to) continue;
      corridors.lineBetween(from.x, from.y, to.x, to.y);
    }
    corridors.lineStyle(4, 0x7efcff, 0.18);
    for (const edge of state.edges) {
      const from = this.rooms.get(edge.from);
      const to = this.rooms.get(edge.to);
      if (!from || !to) continue;
      corridors.lineBetween(from.x, from.y, to.x, to.y);
    }

    for (const { room, x, y } of this.rooms.values()) {
      this.drawRoom(room, x, y);
    }

    this.createArtifacts(state);
    this.createEscapeZone();
  }

  private drawRoom(room: Room, x: number, y: number) {
    const danger = Phaser.Math.Clamp(room.danger, 0, 4);
    const accent = danger >= 3 ? 0xff4f7b : room.id.includes("vault") ? 0xffd56a : 0x4cf4f0;
    const width = room.id === "inner-vault" ? 230 : 190;
    const height = room.id === "inner-vault" ? 138 : 112;

    const halo = this.add.rectangle(x, y, width + 34, height + 34, accent, 0.08);
    halo.setStrokeStyle(2, accent, 0.28);

    const panel = this.add.rectangle(x, y, width, height, 0x101827, 0.96);
    panel.setStrokeStyle(3, accent, 0.7);

    this.add
      .text(x, y - height / 2 - 22, room.name.toUpperCase(), {
        color: "#dffcff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "900",
        stroke: "#050811",
        strokeThickness: 5
      })
      .setOrigin(0.5);
    this.arenaRoomLabelCount += 1;

    if (room.id === "inner-vault") {
      this.createZoneBadge(x, y + height / 2 - 24, "HIGH VALUE", 0xffd56a);
    } else if (room.id === "east-hall" || room.id === "west-hall") {
      this.createZoneBadge(x, y + height / 2 - 22, "RIVAL ENTRY", 0xff4f7b);
    } else if (danger >= 3) {
      this.createZoneBadge(x, y + height / 2 - 22, `RISK ${danger}`, 0xff4f7b);
    }
  }

  private createZoneBadge(x: number, y: number, text: string, color: number) {
    this.arenaZoneBeacons.add(text);
    const width = Math.max(76, text.length * 8 + 18);
    const plate = this.add.rectangle(0, 0, width, 24, 0x050811, 0.78).setStrokeStyle(2, color, 0.72);
    const label = this.add
      .text(0, 0, text, {
        color: `#${color.toString(16).padStart(6, "0")}`,
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "900",
        stroke: "#050811",
        strokeThickness: 3
      })
      .setOrigin(0.5);
    this.add.container(x, y, [plate, label]).setDepth(11);
  }

  private createArtifacts(state: GameState) {
    const roomCounts = new Map<string, number>();
    this.artifacts = state.artifacts.map((artifact) => {
      const room = this.rooms.get(artifact.roomId) ?? this.rooms.get("atrium")!;
      const index = roomCounts.get(artifact.roomId) ?? 0;
      roomCounts.set(artifact.roomId, index + 1);
      const x = room.x + (index - 0.5) * 38;
      const y = room.y + 10 + (index % 2) * 22;
      const size = artifact.size === "major" ? 20 : 15;
      const color = artifact.size === "major" ? 0xff4f7b : 0xffd56a;
      const gem = this.add.polygon(x, y, [
        { x: 0, y: -size },
        { x: size, y: 0 },
        { x: 0, y: size },
        { x: -size, y: 0 }
      ], color, 0.98);
      gem.setStrokeStyle(4, 0xf8fdff, 0.86);
      const label = this.add
        .text(x, y + size + 16, artifact.value.toString(), {
          color: "#050811",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "900",
          backgroundColor: "#ffd56a",
          padding: { x: 6, y: 2 }
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: gem,
        scale: { from: 0.92, to: 1.12 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });

      return { ...artifact, x, y, gem, label };
    });
  }

  private createEscapeZone() {
    const atrium = this.rooms.get("atrium");
    if (!atrium) return;
    const ring = this.add.circle(0, 0, EXIT_RADIUS, 0x4cf4f0, 0.07).setStrokeStyle(4, 0x7effdf, 0.52);
    this.arenaZoneBeacons.add("EXTRACT");
    const extract = this.add
      .text(0, -EXIT_RADIUS - 24, "EXTRACT", {
        color: "#7effdf",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "900",
        stroke: "#050811",
        strokeThickness: 5
      })
      .setOrigin(0.5);
    const label = this.add
      .text(0, EXIT_RADIUS + 24, "ESCAPE LIFT", {
        color: "#7effdf",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "900",
        stroke: "#050811",
        strokeThickness: 5
      })
      .setOrigin(0.5);
    const badgePlate = this.add.rectangle(0, 0, 126, 30, 0x07101c, 0.86).setStrokeStyle(2, 0x7effdf, 0.82);
    this.escapePayoutBadgeLabel = this.add
      .text(0, 0, "CASHOUT +0", {
        color: "#d9fff6",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "13px",
        fontStyle: "950",
        stroke: "#050811",
        strokeThickness: 4
      })
      .setOrigin(0.5);
    this.escapePayoutBadge = this.add.container(0, -EXIT_RADIUS - 58, [badgePlate, this.escapePayoutBadgeLabel]).setVisible(false);
    this.escapeZone = this.add.container(atrium.x, atrium.y + 92, [ring, extract, label, this.escapePayoutBadge]);
  }

  private createActors(state: GameState) {
    const atrium = this.rooms.get("atrium")!;
    const human = state.players.find((player) => player.kind === "human") ?? state.players[0]!;
    this.player = this.createRuntimeAgent(human, atrium.x, atrium.y + 18, true);

    const aiStarts = ["east-hall", "west-hall", "guard-post", "vault-door", "moon-gallery"];
    for (const [index, ai] of state.players.filter((player) => player.kind === "ai").entries()) {
      const room = this.rooms.get(aiStarts[index % aiStarts.length]!) ?? atrium;
      const runtime = this.createRuntimeAgent(ai, room.x + (index % 2 === 0 ? 30 : -30), room.y, false);
      runtime.targetRoomId = this.pickAiTarget(runtime);
      this.aiAgents.push(runtime);
    }
    this.setRivalStandbyVisuals(true);

    this.cameras.main.startFollow(this.player.body, true, 0.06, 0.06);
  }

  private createRuntimeAgent(player: PlayerState, x: number, y: number, controlled: boolean): RuntimeAgent {
    const color = controlled ? 0xffd56a : TEAM_COLORS[player.teamId];
    const shadow = this.add.circle(0, 12, 24, 0x000000, 0.22);
    const dot = this.add.circle(0, 0, controlled ? 20 : 17, color, 0.98).setStrokeStyle(4, 0xf8fdff, controlled ? 0.9 : 0.65);
    const visor = this.add.rectangle(6, -4, 16, 5, 0x050811, 0.58);
    const ship = this.add.container(0, 0, [dot, visor]);
    const label = this.add
      .text(0, 32, controlled ? "YOU" : player.name.toUpperCase(), {
        color: controlled ? "#ffd56a" : "#f8fdff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: controlled ? "15px" : "12px",
        fontStyle: "900",
        stroke: "#050811",
        strokeThickness: 5
      })
      .setOrigin(0.5);
    const badgePlate = this.add.rectangle(0, -48, 48, 26, 0x050811, 0.88).setStrokeStyle(2, 0xff4f7b, 0.86);
    const badgeGem = this.add.polygon(-16, -48, [
      { x: 0, y: -7 },
      { x: 7, y: 0 },
      { x: 0, y: 7 },
      { x: -7, y: 0 }
    ], 0xffd56a, 0.98);
    const carrierBadgeLabel = this.add
      .text(9, -48, "+0", {
        color: "#fff7d6",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "950",
        stroke: "#050811",
        strokeThickness: 4
      })
      .setOrigin(0.5);
    const carrierBadge = this.add.container(0, 0, [badgePlate, badgeGem, carrierBadgeLabel]).setVisible(false);
    const body = this.add.container(x, y, [shadow, ship, label, carrierBadge]);
    body.setDepth(controlled ? 20 : 12);

    return {
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      x,
      y,
      targetRoomId: "atrium",
      lootValue: 0,
      carriedRelics: [],
      body,
      dot,
      label,
      ship,
      carrierBadge,
      carrierBadgeLabel
    };
  }

  private updatePlayer(delta: number) {
    if (!this.player) return;

    const held = this.readHeldMovementVector();
    this.keyboardImpulse = nextMovementImpulse(this.keyboardImpulse, this.readTappedMovementVector(), delta);
    const selected = selectMovementVector({ held, impulse: this.keyboardImpulse });
    const vector = new Phaser.Math.Vector2(selected.x, selected.y);

    if (vector.lengthSq() > 0) {
      this.pointerTarget = undefined;
    } else if (this.pointerTarget) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.pointerTarget.x, this.pointerTarget.y);
      if (distance > 8) {
        vector.set(this.pointerTarget.x - this.player.x, this.pointerTarget.y - this.player.y);
      } else {
        this.pointerTarget = undefined;
      }
    }

    if (vector.lengthSq() > 0) {
      let speed = PLAYER_SPEED;
      if ((this.shiftHeld || this.keys?.shift.isDown) && this.dashCooldownMs <= 0) {
        speed = DASH_SPEED;
        this.dashCooldownMs = DASH_COOLDOWN_MS;
        this.addTrail(this.player.x, this.player.y, vector);
        this.cameraKick("dash");
      }
      this.moveAgent(this.player, vector.x * speed * (delta / 1000), vector.y * speed * (delta / 1000));
      this.player.ship.rotation = Phaser.Math.Angle.Between(0, 0, vector.x, vector.y) + Math.PI / 2;
    }
  }

  private readHeldMovementVector(): MovementVector {
    const vector = { x: 0, y: 0 };
    const cursors = this.cursors;
    const keys = this.keys;
    if (this.heldDirections.has("up") || keys?.w.isDown || cursors?.up?.isDown) vector.y -= 1;
    if (this.heldDirections.has("down") || keys?.s.isDown || cursors?.down?.isDown) vector.y += 1;
    if (this.heldDirections.has("left") || keys?.a.isDown || cursors?.left?.isDown) vector.x -= 1;
    if (this.heldDirections.has("right") || keys?.d.isDown || cursors?.right?.isDown) vector.x += 1;
    return vector;
  }

  private readTappedMovementVector(): MovementVector {
    const vector = { x: 0, y: 0 };
    const cursors = this.cursors;
    const keys = this.keys;
    if ((keys?.w && Phaser.Input.Keyboard.JustDown(keys.w)) || (cursors?.up && Phaser.Input.Keyboard.JustDown(cursors.up))) {
      vector.y -= 1;
    }
    if ((keys?.s && Phaser.Input.Keyboard.JustDown(keys.s)) || (cursors?.down && Phaser.Input.Keyboard.JustDown(cursors.down))) {
      vector.y += 1;
    }
    if ((keys?.a && Phaser.Input.Keyboard.JustDown(keys.a)) || (cursors?.left && Phaser.Input.Keyboard.JustDown(cursors.left))) {
      vector.x -= 1;
    }
    if ((keys?.d && Phaser.Input.Keyboard.JustDown(keys.d)) || (cursors?.right && Phaser.Input.Keyboard.JustDown(cursors.right))) {
      vector.x += 1;
    }
    return vector;
  }

  private handleKeyDown(event: KeyboardEvent) {
    this.activateKey(event.key, event);
  }

  private handleWindowKeyDown = (event: KeyboardEvent) => {
    this.activateKey(event.key, event);
  };

  private handleWindowKeyUp = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() === "shift") {
      this.shiftHeld = false;
      return;
    }

    const direction = movementDirectionFromKey(event.key);
    if (!direction) return;
    event.preventDefault();
    this.heldDirections.delete(direction);
  };

  private clearWindowKeys = () => {
    this.heldDirections.clear();
    this.shiftHeld = false;
  };

  private activateKey(key: string, event?: KeyboardEvent) {
    const normalized = key.toLowerCase();
    if (normalized === "e" || normalized === " " || normalized === "spacebar") {
      event?.preventDefault();
      this.tryInteract();
      return;
    }

    if (normalized === "g") {
      event?.preventDefault();
      this.toggleRouteMode();
      return;
    }

    if (normalized === "shift") {
      this.shiftHeld = true;
      return;
    }

    const direction = movementDirectionFromKey(key);
    if (!direction) return;
    event?.preventDefault();
    this.heldDirections.add(direction);
    this.pointerTarget = undefined;
    this.keyboardImpulse = nextMovementImpulse(undefined, movementVectorFromDirection(direction), 0);
  }

  private updateAi(delta: number) {
    if (!this.aiReleased) {
      const firstScoreWokeRivals = this.artifactsStolen > 0;
      if (!firstScoreWokeRivals && this.elapsedMs < AI_GRACE_MS) return;
      this.releaseRivals({ announce: true, holdMs: AI_WAKE_HOLD_MS });
      return;
    }

    if (this.aiWakeHoldMs > 0) {
      this.aiWakeHoldMs = Math.max(0, this.aiWakeHoldMs - delta);
      return;
    }

    if (this.aiActionHoldMs > 0) {
      this.aiActionHoldMs = Math.max(0, this.aiActionHoldMs - delta);
      return;
    }

    for (const agent of this.aiAgents) {
      const target = this.aiTargetPoint(agent);
      if (!target) continue;
      const vector = new Phaser.Math.Vector2(target.x - agent.x, target.y - agent.y);
      if (vector.length() < 36) {
        if (this.cashoutRivalCarrier(agent)) {
          agent.targetRoomId = this.pickAiTarget(agent);
          continue;
        }
        this.aiStealNearby(agent);
        if (agent.carriedRelics.length === 0) {
          agent.targetRoomId = this.pickAiTarget(agent);
        }
        continue;
      }
      vector.normalize();
      this.moveAgent(agent, vector.x * AI_SPEED * (delta / 1000), vector.y * AI_SPEED * (delta / 1000));
      agent.ship.rotation = Phaser.Math.Angle.Between(0, 0, vector.x, vector.y) + Math.PI / 2;
    }
  }

  private aiTargetPoint(agent: RuntimeAgent): { x: number; y: number } | undefined {
    if (agent.carriedRelics.length > 0) {
      return this.escapeZone ?? this.rooms.get("atrium");
    }
    return this.rooms.get(agent.targetRoomId) ?? this.rooms.get("inner-vault");
  }

  private moveAgent(agent: RuntimeAgent, dx: number, dy: number) {
    agent.x = Phaser.Math.Clamp(agent.x + dx, 82, WORLD_WIDTH - 82);
    agent.y = Phaser.Math.Clamp(agent.y + dy, 82, WORLD_HEIGHT - 82);
    agent.body.setPosition(agent.x, agent.y);
  }

  private stealArtifact(artifact: RuntimeArtifact, actor: RuntimeAgent, actorLabel: string) {
    if (artifact.takenBy) return;
    artifact.takenBy = actor.id;

    if (actor.id === this.player?.id) {
      actor.lootValue += artifact.value;
      this.lootValue += artifact.value;
      this.artifactsStolen += 1;
      this.stolenRelicNames.push(artifact.name);
      this.lastLootChainAtMs = this.elapsedMs;
      this.alarm = Math.min(5, this.alarm + (artifact.size === "major" ? 0.34 : 0.18));
      this.feedLine(`${artifact.name} secured. Escape route unlocked.`);
      this.routeMode = "escape";
      this.flashSpotlight(this.artifactsStolen > 1 ? `Loot chain x${this.artifactsStolen}` : `${artifact.name} secured`);
      this.flashScorePopup({
        tone: "loot",
        label: `+${artifact.value} ${artifact.name}`,
        detail: this.artifactsStolen > 1 ? `Loot chain x${this.artifactsStolen}` : "Relic secured"
      });
      this.flashObjectiveBanner(this.buildEscapeBanner(this.artifactsStolen === 1));
      this.impactPulse("steal");
      this.collectArtifactVisual(artifact, 0xffd56a);
      this.updateEscapePayoutBadge();
      if (this.artifactsStolen === 1) {
        this.releaseRivals({ announce: true, holdMs: AI_WAKE_HOLD_MS });
      }
      this.updateTargetMarker();
      this.updateThreatHalo();
      return;
    }

    actor.carriedRelics.push({ name: artifact.name, value: artifact.value });
    actor.targetRoomId = "atrium";
    this.alarm = Math.min(5, this.alarm + 0.12);
    this.lastRivalSteal = `Red +${artifact.value}: ${actorLabel} stole ${artifact.name}`;
    this.flashRivalBark({
      tone: "taunt",
      agentName: actorLabel,
      line: `${artifact.name} is mine. Catch the carrier if you can.`
    });
    this.feedLine(`${actorLabel} stole ${artifact.name}.`);
    this.collectArtifactVisual(artifact, TEAM_COLORS[actor.teamId]);
    this.updateCarrierBadges();
    this.updateTargetMarker();
    this.updateThreatHalo();
    this.updateCarrierCashoutRoute();
  }

  private cashoutRivalCarrier(rival: RuntimeAgent): boolean {
    if (rival.carriedRelics.length === 0) return false;
    const target = this.escapeZone ?? this.rooms.get("atrium");
    if (target && Phaser.Math.Distance.Between(rival.x, rival.y, target.x, target.y) > EXIT_RADIUS) return false;

    const cashed = rival.carriedRelics.splice(0);
    const cashedValue = cashed.reduce((total, relic) => total + relic.value, 0);
    const cashedNames = cashed.map((relic) => relic.name);
    rival.lootValue += cashedValue;
    this.aiLootValue += cashedValue;
    this.rivalRelicNames.push(...cashedNames);
    this.lastRivalSteal = `Red cashed out +${cashedValue}: ${rival.name} escaped with ${this.relicListLabel(cashed)}`;
    this.flashSpotlight(`Red cashout +${cashedValue}`);
    this.flashScorePopup({
      tone: "rival",
      label: `Red +${cashedValue} Cashout`,
      detail: `${rival.name} reached Atrium Lift`
    });
    this.impactPulse("cashout");
    this.flashRivalBark({
      tone: "taunt",
      agentName: rival.name,
      line: `Cashed out ${this.relicListLabel(cashed)}. Too slow.`
    });
    this.feedLine(`${rival.name} cashed out ${this.relicListLabel(cashed)} at the Atrium Lift.`);
    this.updateCarrierBadges();
    this.updateTargetMarker();
    this.updateThreatHalo();
    this.updateCarrierCashoutRoute();
    return true;
  }

  private flashSpotlight(text: string) {
    this.spotlight = text;
    this.spotlightUntilMs = this.elapsedMs + 1_800;
    this.emitHudIfNeeded(true);
  }

  private flashScorePopup(popup: ArcadeScorePopup) {
    this.scorePopup = popup;
    this.scorePopupUntilMs = this.elapsedMs + 1_800;
    this.emitHudIfNeeded(true);
  }

  private flashObjectiveBanner(banner: ArcadeObjectiveBanner, durationMs = 1_550) {
    this.objectiveBanner = banner;
    this.objectiveBannerUntilMs = this.elapsedMs + durationMs;
    this.emitHudIfNeeded(true);
  }

  private flashRivalBark(bark: ArcadeRivalBark) {
    this.rivalBark = bark;
    this.rivalBarkUntilMs = this.elapsedMs + 2_600;
    this.emitHudIfNeeded(true);
  }

  private flashRoutePulse(pulse: ArcadeRoutePulse) {
    this.routePulse = pulse;
    this.routePulseUntilMs = this.elapsedMs + 2_000;
    this.emitHudIfNeeded(true);
  }

  private releaseRivals({ announce, holdMs }: { announce: boolean; holdMs: number }) {
    if (this.aiReleased) return;
    this.aiReleased = true;
    this.aiWakeHoldMs = holdMs;
    this.setRivalStandbyVisuals(false);
    if (announce) {
      this.feedLine("Rival agents entered the vault.");
      this.flashRivalBark({
        tone: "panic",
        agentName: "Red Crew",
        line: `Breach live. ${Math.max(1, Math.ceil(holdMs / 1000))}s before scans.`
      });
    }
    this.emitHudIfNeeded(true);
  }

  private setRivalStandbyVisuals(standby: boolean) {
    for (const agent of this.aiAgents) {
      agent.body.setAlpha(standby ? 0.46 : 1);
      agent.body.setDepth(standby ? 10 : 12);
      agent.ship.setScale(standby ? 0.86 : 1);
      agent.label.setText(standby ? "STANDBY" : agent.name.toUpperCase());
      agent.label.setColor(standby ? "#ff9fbd" : "#f8fdff");
    }
  }

  private impactPulse(kind: ImpactKind) {
    this.impactCount += 1;
    this.lastImpact = { kind, count: this.impactCount, atMs: Math.round(this.elapsedMs) };
    this.cameraKick(kind);
  }

  private cameraKick(kind: CameraKickKind) {
    this.cameraKickCount += 1;
    this.lastCameraKick = { kind, count: this.cameraKickCount, atMs: Math.round(this.elapsedMs) };
    const camera = this.cameras.main;
    const settings = {
      dash: { duration: 110, intensity: 0.0028, color: null },
      steal: { duration: 130, intensity: 0.0045, color: [255, 213, 106] },
      intercept: { duration: 170, intensity: 0.0062, color: [255, 79, 123] },
      alibi: { duration: 150, intensity: 0.0048, color: [76, 244, 240] },
      escape: { duration: 190, intensity: 0.0055, color: [126, 255, 223] },
      lockdown: { duration: 220, intensity: 0.007, color: [255, 79, 123] },
      cashout: { duration: 190, intensity: 0.0065, color: [255, 79, 123] }
    } satisfies Record<CameraKickKind, { duration: number; intensity: number; color: [number, number, number] | null }>;
    const kick = settings[kind];
    camera.shake(kick.duration, kick.intensity, true);
    if (kick.color) {
      camera.flash(kick.duration, kick.color[0], kick.color[1], kick.color[2], true);
    }
  }

  private buildEscapeBanner(includeGreedHint: boolean): ArcadeObjectiveBanner {
    const cashout = this.lootValue + 2;
    return {
      tone: "escape",
      title: `Escape with ${this.lootValue} loot`,
      detail: includeGreedHint ? `Cashout ${cashout} or risk greed route` : `Cashout ${cashout} before lockdown`
    };
  }

  private tryInteract() {
    if (!this.player) return;
    const rivalCarrier = this.nearRivalCarrier();
    if (rivalCarrier) {
      this.interceptRivalCarrier(rivalCarrier);
      return;
    }

    if (this.tryAlibiPulse()) return;

    if (this.isNearExit()) {
      if (this.lootValue > 0 || this.timeLeftMs() <= 30_000) {
        this.finish("escaped");
      } else {
        this.feedLine("The lift rejects an empty-handed alibi.");
      }
      return;
    }

    const artifact = this.nearPlayerArtifact();
    if (artifact) {
      this.stealArtifact(artifact, this.player, "You");
      return;
    }

    this.feedLine("No relic in reach. Follow the gold marker.");
  }

  private interceptRivalCarrier(rival: RuntimeAgent) {
    if (rival.carriedRelics.length === 0) return;

    const recovered = rival.carriedRelics.splice(0);
    const recoveredValue = recovered.reduce((total, relic) => total + relic.value, 0);
    const recoveredNames = recovered.map((relic) => relic.name);
    rival.lootValue = Math.max(0, rival.lootValue - recoveredValue);
    this.lootValue += recoveredValue;
    this.artifactsStolen += recovered.length;
    this.stolenRelicNames.push(...recoveredNames);
    this.carrierIntercepts += 1;
    this.interceptedRelicNames.push(...recoveredNames);
    this.lastLootChainAtMs = this.elapsedMs;
    for (const relicName of recoveredNames) {
      const index = this.rivalRelicNames.indexOf(relicName);
      if (index >= 0) this.rivalRelicNames.splice(index, 1);
    }
    this.lastRivalSteal = null;
    this.alarm = Math.min(5, this.alarm + 0.16);
    this.shoveRivalAway(rival);
    this.flashSpotlight(`Intercepted ${rival.name}`);
    this.flashScorePopup({
      tone: "recover",
      label: `Recovered +${recoveredValue}`,
      detail: this.relicListLabel(recovered)
    });
    this.impactPulse("intercept");
    this.flashRivalBark({
      tone: "panic",
      agentName: rival.name,
      line: "That was almost elegant. Almost."
    });
    this.feedLine(`Intercepted ${rival.name}. Recovered ${this.relicListLabel(recovered)}.`);
    this.addInterceptVisual(rival.x, rival.y);
    this.updateCarrierBadges();
    this.updateTargetMarker();
    this.updateThreatHalo();
    this.updateCarrierCashoutRoute();
  }

  private tryAlibiPulse(): boolean {
    if (!this.player) return false;
    const scan = this.nearestRivalScan();
    if (!canUseAlibiPulse(this.rivalPressure(scan).level, this.alibiPulseCooldownMs)) return false;
    const rival = this.aiAgents.find((agent) => agent.name === scan?.name);
    if (!rival) return false;

    this.alibiPulseCooldownMs = ALIBI_PULSE_COOLDOWN_MS;
    this.alibiPulsesUsed += 1;
    this.rivalScanState = { chargeMs: 0, cooldownMs: 900 };
    this.shoveRivalAway(rival);
    this.addAlibiPulseVisual();
    this.flashSpotlight("Alibi pulse: scanner jammed");
    this.impactPulse("alibi");
    this.feedLine(`You jammed ${rival.name}'s scan. Break for the exit.`);
    return true;
  }

  private shoveRivalAway(rival: RuntimeAgent) {
    if (!this.player) return;
    const vector = new Phaser.Math.Vector2(rival.x - this.player.x, rival.y - this.player.y);
    if (vector.lengthSq() === 0) vector.set(1, 0);
    vector.normalize();
    this.moveAgent(rival, vector.x * 190, vector.y * 190);
    rival.ship.rotation = Phaser.Math.Angle.Between(0, 0, vector.x, vector.y) + Math.PI / 2;
  }

  private addAlibiPulseVisual() {
    if (!this.player) return;
    const ring = this.add.circle(this.player.x, this.player.y, 54, 0x7effdf, 0.18).setStrokeStyle(4, 0x7effdf, 0.9).setDepth(20);
    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy()
    });
  }

  private addInterceptVisual(x: number, y: number) {
    const burst = this.add.circle(x, y, 36, 0xffd56a, 0.2).setStrokeStyle(4, 0xffd56a, 0.82).setDepth(21);
    this.tweens.add({
      targets: burst,
      scale: 2.4,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
      onComplete: () => burst.destroy()
    });
  }

  private aiStealNearby(agent: RuntimeAgent) {
    const artifact = this.artifacts.find(
      (candidate) =>
        !candidate.takenBy &&
        Phaser.Math.Distance.Between(agent.x, agent.y, candidate.x, candidate.y) < PICKUP_RADIUS + 18
    );
    if (!artifact) return;
    this.stealArtifact(artifact, agent, agent.name);
  }

  private collectArtifactVisual(artifact: RuntimeArtifact, color: number) {
    artifact.label.destroy();
    this.tweens.add({
      targets: artifact.gem,
      y: artifact.y - 42,
      scale: 1.8,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => artifact.gem.destroy()
    });
    this.add.circle(artifact.x, artifact.y, 40, color, 0.2).setDepth(18);
  }

  private updateAlarm(delta: number) {
    const pressure = delta / ARCADE_MISSION_DURATION_MS * 3.5;
    this.alarm = Math.min(5, this.alarm + pressure);
    if (this.alarm >= 4.65 && this.timeLeftMs() > 10_000) {
      this.feedLine("Lockdown sirens are spooling up.");
    }
  }

  private pickAiTarget(agent: RuntimeAgent): string {
    const available = this.artifacts.filter((artifact) => !artifact.takenBy);
    if (available.length === 0) return "atrium";
    const nearest = available
      .map((artifact) => {
        const room = this.rooms.get(artifact.roomId)!;
        return {
          roomId: artifact.roomId,
          distance: Phaser.Math.Distance.Between(agent.x, agent.y, room.x, room.y)
        };
      })
      .sort((a, b) => a.distance - b.distance)[0];
    return nearest?.roomId ?? "inner-vault";
  }

  private isNearExit(): boolean {
    if (!this.player || !this.escapeZone) return false;
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.escapeZone.x, this.escapeZone.y) <= EXIT_RADIUS;
  }

  private timeLeftMs(): number {
    return Math.max(0, ARCADE_MISSION_DURATION_MS - this.elapsedMs);
  }

  private phase(): ArcadeHudPhase {
    if (this.alarm >= 5 || this.timeLeftMs() <= 30_000) return "lockdown";
    if (this.alarm >= 3) return "alarm";
    return "stealth";
  }

  private emitHudIfNeeded(force: boolean) {
    if (!this.config || !this.state) return;
    if (!force && this.elapsedMs - this.lastHudAt < 180) return;
    this.lastHudAt = this.elapsedMs;
    const canEscape = this.lootValue > 0 || this.timeLeftMs() <= 30_000;
    if (this.spotlight && this.elapsedMs >= this.spotlightUntilMs) {
      this.spotlight = null;
    }
    if (this.scorePopup && this.elapsedMs >= this.scorePopupUntilMs) {
      this.scorePopup = null;
    }
    if (this.objectiveBanner && this.elapsedMs >= this.objectiveBannerUntilMs) {
      this.objectiveBanner = null;
    }
    if (this.rivalBark && this.elapsedMs >= this.rivalBarkUntilMs) {
      this.rivalBark = null;
    }
    if (this.routePulse && this.elapsedMs >= this.routePulseUntilMs) {
      this.routePulse = null;
    }
    const targetArtifact = this.primaryTargetArtifact();
    const targetArtifactLabel = targetArtifact ? this.artifactTargetLabel(targetArtifact) : null;
    const nearArtifact = this.nearPlayerArtifact();
    const objectiveTarget = this.currentObjectiveTarget();
    const targetDistanceMeters =
      this.player && objectiveTarget
        ? Math.max(0, Math.round(Phaser.Math.Distance.Between(this.player.x, this.player.y, objectiveTarget.x, objectiveTarget.y) / 8))
        : null;
    const nearestRival = this.nearestRivalScan();
    const rivalPressure = this.rivalPressure(nearestRival);
    const rivalCarrier = this.nearRivalCarrier();
    const rivalCarrierRelic = rivalCarrier?.carriedRelics.at(-1) ?? null;
    const escapePayout = this.escapePayout(canEscape);
    const guidance = buildArcadeGuidance({
      lootValue: this.lootValue,
      aiLootValue: this.aiLootValue,
      artifactsStolen: this.artifactsStolen,
      totalArtifacts: this.artifacts.length,
      targetArtifactName: targetArtifactLabel,
      nearArtifactName: nearArtifact?.name ?? null,
      nearExit: this.isNearExit(),
      canEscape,
      cashoutValue: escapePayout?.cashout ?? null,
      timeLeftMs: this.timeLeftMs()
    });
    const greedPromptActive = this.routeMode === "greed" && Boolean(targetArtifact);
    const alibiPulseReady = !rivalCarrier && canUseAlibiPulse(rivalPressure.level, this.alibiPulseCooldownMs);
    const prompt = rivalCarrier ? "Press E / Space to intercept" : alibiPulseReady ? "Press E / Space to jam rival scan" : greedPromptActive && nearArtifact ? "Press E / Space to steal" : guidance.prompt;
    const greedStatus = this.greedStatus(guidance.greedStatus);
    const rivalIntercept = this.rivalIntercept();
    const routeChoiceRelic = greedStatus
      ?.replace(/^Optional relic:\s*/i, "")
      .replace(/^Greed route:\s*/i, "")
      .replace(/\s*·\s*press G$/i, "");
    const targetDirectionLabel =
      objectiveTarget && targetDistanceMeters !== null && this.player
        ? buildObjectiveDirectionLabel({
            kind: objectiveTarget.kind === "escape" ? "exit" : objectiveTarget.kind === "carrier" ? "carrier" : "target",
            cashoutValue: objectiveTarget.kind === "escape" ? (escapePayout?.cashout ?? null) : null,
            dx: objectiveTarget.x - this.player.x,
            dy: objectiveTarget.y - this.player.y,
            distanceMeters: targetDistanceMeters
          })
        : null;
    const objectiveCompass = buildObjectiveCompass({
      kind: alibiPulseReady ? "scan" : (objectiveTarget?.kind ?? "artifact"),
      targetLabel: alibiPulseReady ? `${nearestRival?.name ?? "Rival"} scan` : this.objectiveCompassTargetLabel(objectiveTarget, targetArtifactLabel),
      directionLabel: alibiPulseReady ? this.rivalDirectionLabel(nearestRival, rivalPressure) : targetDirectionLabel,
      distanceMeters: alibiPulseReady ? (nearestRival?.distanceMeters ?? null) : targetDistanceMeters,
      cashoutValue: escapePayout?.cashout ?? null,
      timeLeftMs: this.timeLeftMs()
    });

    const hud: ArcadeHudState = {
      phase: this.phase(),
      timeLeftMs: this.timeLeftMs(),
      alarm: Math.ceil(this.alarm),
      lootValue: this.lootValue,
      aiLootValue: this.aiLootValue,
      artifactsStolen: this.artifactsStolen,
      totalArtifacts: this.artifacts.length,
      canEscape,
      dashReady: this.dashCooldownMs <= 0,
      objective: rivalCarrier ? `Intercept ${rivalCarrier.name}'s carrier run` : alibiPulseReady ? "Jam the rival scan" : greedPromptActive ? `Greed route: steal ${this.artifactTargetLabel(targetArtifact!)}` : guidance.objective,
      prompt,
      objectiveCompass,
      activeAction: buildActiveActionHint({
        alibiPulseReady,
        nearRivalCarrierName: rivalCarrier?.name ?? null,
        nearRivalCarrierRelicName: rivalCarrierRelic?.name ?? null,
        nearRivalCarrierValue: rivalCarrierRelic?.value ?? null,
        nearArtifactName: nearArtifact?.name ?? null,
        nearArtifactValue: nearArtifact?.value ?? null,
        nearExit: this.isNearExit(),
        canEscape,
        cashoutValue: escapePayout?.cashout ?? null
      }),
      loopStep: rivalCarrier || alibiPulseReady ? "survive" : guidance.loopStep,
      raceStatus: guidance.raceStatus,
      lastRivalSteal: this.lastRivalSteal,
      rivalIntercept,
      vaultCondition: this.vaultCondition(),
      escapePayout,
      extractionCue: this.extractionCue(escapePayout),
      routeChoice: this.routeChoice(escapePayout, targetArtifact),
      routePulse: this.routePulse,
      radarBlips: this.buildRadarBlips(objectiveTarget),
      greedStatus,
      targetDistanceLabel: targetDirectionLabel,
      rivalStatus: this.rivalStatus(),
      rivalDistanceLabel: this.rivalDirectionLabel(nearestRival, rivalPressure),
      rivalPressureLevel: rivalPressure.level,
      rivalScanStatus: buildRivalScanStatus(this.rivalScanState, rivalPressure.level),
      alibiPulseStatus: buildAlibiPulseStatus({
        rivalPressureLevel: rivalPressure.level,
        cooldownMs: this.alibiPulseCooldownMs
      }),
      paceStatus: this.paceStatus(),
      cleanBonusWindow: this.cleanBonusWindow(),
      lootChainWindow: this.lootChainWindow(),
      missionBeat: buildMissionBeat({
        targetArtifactName: targetArtifact?.name ?? null,
        targetArtifactValue: targetArtifact?.value ?? null,
        lootValue: this.lootValue,
        rivalLootValue: this.aiLootValue,
        canEscape,
        cashoutValue: escapePayout?.cashout ?? null,
        routeChoiceRelic: routeChoiceRelic ?? null,
        routeMode: this.routeMode,
        rivalCarrier: rivalIntercept,
        alibiPulseReady,
        nearestRivalName: nearestRival?.name ?? null,
        phase: this.phase(),
        timeLeftMs: this.timeLeftMs()
      }),
      threatCue: this.threatCue(rivalIntercept, alibiPulseReady, nearestRival),
      objectiveBanner: this.objectiveBanner,
      rivalBark: this.rivalBark,
      scorePopup: this.scorePopup,
      spotlight: this.spotlight,
      feed: this.feed.slice(-5)
    };
    this.config.onHudUpdate(hud);
  }

  private objectiveCompassTargetLabel(target: ArcadeObjectiveTarget | undefined, fallbackArtifactLabel: string | null): string | null {
    if (!target) return fallbackArtifactLabel;
    if (target.kind === "escape") return "Atrium Lift";
    if (target.kind === "carrier") return this.targetMarkerLabel(target);
    return target.label ?? fallbackArtifactLabel;
  }

  private updateRivalPressureFeed() {
    const pressure = this.rivalPressure();
    if (pressure.level === "clear" || pressure.level === "standby") {
      this.lastRivalPressureLevel = pressure.level;
      return;
    }
    if (this.lastRivalPressureLevel === pressure.level || !pressure.radioLine) return;
    this.lastRivalPressureLevel = pressure.level;
    this.feedLine(pressure.radioLine);
  }

  private updateRivalScan(delta: number) {
    const pressure = this.rivalPressure();
    const result = advanceRivalScan(this.rivalScanState, pressure.level, delta);
    this.rivalScanState = result.state;
    if (result.alarmDelta <= 0) return;
    this.scanBurns += 1;
    this.alarm = Math.min(5, this.alarm + result.alarmDelta);
    if (result.spotlight) this.flashSpotlight(result.spotlight);
    if (result.radioLine) this.feedLine(result.radioLine);
  }

  private nearestRivalScan(): RivalScan | null {
    if (!this.player || this.aiAgents.length === 0) return null;
    const nearest = this.aiAgents
      .map((agent) => ({
        name: agent.name,
        distanceMeters: Math.max(0, Math.round(Phaser.Math.Distance.Between(this.player!.x, this.player!.y, agent.x, agent.y) / 8)),
        dx: agent.x - this.player!.x,
        dy: agent.y - this.player!.y
      }))
      .sort((left, right) => left.distanceMeters - right.distanceMeters)[0];
    return nearest ?? null;
  }

  private rivalDirectionLabel(scan: RivalScan | null, pressure: RivalPressure): string | null {
    if (!scan) return pressure.label;
    const nearestLabel = buildObjectiveDirectionLabel({
      kind: "rival",
      dx: scan.dx,
      dy: scan.dy,
      distanceMeters: scan.distanceMeters
    });
    const directionText = nearestLabel.replace(/^Nearest rival\s+/i, "");
    if (pressure.level === "danger") return `Rival on you: ${scan.name} ${directionText}`;
    if (pressure.level === "closing") return `Rival close: ${scan.name} ${directionText}`;
    return nearestLabel;
  }

  private rivalPressure(scan = this.nearestRivalScan()): RivalPressure {
    return buildRivalPressure({
      aiReleased: this.rivalsAreActive(),
      nearestRivalName: scan?.name ?? null,
      distanceMeters: scan?.distanceMeters ?? null
    });
  }

  private rivalsAreActive(): boolean {
    return this.aiReleased && this.aiWakeHoldMs <= 0;
  }

  private vaultCondition() {
    if (this.phase() === "lockdown") {
      return {
        tone: "lockdown" as const,
        label: "Vault Lockdown",
        detail: "Lockdown imminent"
      };
    }
    if (this.phase() === "alarm") {
      return {
        tone: "alarm" as const,
        label: "Alarm Rising",
        detail: "Guards triangulating"
      };
    }
    return {
      tone: "stable" as const,
      label: "Vault Stable",
      detail: "Low profile"
    };
  }

  private escapePayout(canEscape: boolean) {
    if (!canEscape || this.lootValue <= 0) return null;
    const escapeBonus = 2;
    return {
      escapeBonus,
      cashout: this.lootValue + escapeBonus
    };
  }

  private updateEscapePayoutBadge() {
    if (!this.escapePayoutBadge || !this.escapePayoutBadgeLabel) return;
    if (this.lootValue <= 0 || this.finished) {
      this.escapePayoutBadge.setVisible(false);
      this.escapePayoutBadge.setData("visible", false);
      this.escapePayoutBadge.setData("label", "");
      return;
    }

    const label = `Cashout +${this.lootValue + 2}`;
    this.escapePayoutBadgeLabel.setText(label.toUpperCase());
    this.escapePayoutBadge.setVisible(true);
    this.escapePayoutBadge.setData("visible", true);
    this.escapePayoutBadge.setData("label", label);
  }

  private escapeZoneBadgeDebug() {
    if (!this.escapePayoutBadge?.getData("visible")) return { visible: false, label: "" };
    return {
      visible: true,
      label: String(this.escapePayoutBadge.getData("label") ?? "")
    };
  }

  private extractionCue(escapePayout: { cashout: number } | null): ArcadeExtractionCue | null {
    if (!escapePayout) return null;
    const ready = this.isNearExit();
    return {
      tone: ready ? "ready" : "armed",
      label: ready ? "Extract now" : "Extraction armed",
      detail: `Atrium Lift · Cashout ${escapePayout.cashout}`,
      action: ready ? `Press E / Space to cashout +${escapePayout.cashout}` : "Follow the cyan ring"
    };
  }

  private routeChoice(escapePayout: { cashout: number } | null, targetArtifact: RuntimeArtifact | undefined): ArcadeRouteChoice | null {
    if (!escapePayout || !targetArtifact || !this.canGreedRoute()) return null;
    const greedDistanceMeters = this.player
      ? Math.max(0, Math.round(Phaser.Math.Distance.Between(this.player.x, this.player.y, targetArtifact.x, targetArtifact.y) / 8))
      : 0;
    return {
      mode: this.routeMode,
      cashoutNow: escapePayout.cashout,
      greedRelicName: targetArtifact.name,
      greedRelicValue: targetArtifact.value,
      greedDistanceMeters,
      projectedCashout: escapePayout.cashout + targetArtifact.value
    };
  }

  private buildRadarBlips(target?: ArcadeObjectiveTarget): ArcadeRadarBlip[] {
    const blips: ArcadeRadarBlip[] = [];
    if (this.player) {
      blips.push({
        id: this.player.id,
        kind: "player",
        label: this.player.name,
        x: this.radarX(this.player.x),
        y: this.radarY(this.player.y)
      });
    }
    if (target && target.kind !== "carrier") {
      blips.push({
        id: target.id,
        kind: target.kind === "escape" ? "exit" : "target",
        label: target.label,
        x: this.radarX(target.x),
        y: this.radarY(target.y)
      });
    }
    for (const rival of this.aiAgents) {
      const carriedRelic = rival.carriedRelics.at(-1);
      blips.push({
        id: rival.id,
        kind: carriedRelic ? "carrier" : "rival",
        label: carriedRelic ? `${rival.name} carrying ${carriedRelic.name}` : rival.name,
        x: this.radarX(rival.x),
        y: this.radarY(rival.y)
      });
    }
    return blips;
  }

  private radarX(x: number): number {
    return Phaser.Math.Clamp((x / WORLD_WIDTH) * 100, 4, 96);
  }

  private radarY(y: number): number {
    return Phaser.Math.Clamp((y / WORLD_HEIGHT) * 100, 4, 96);
  }

  private greedStatus(baseStatus: string | null): string | null {
    if (!baseStatus) return null;
    if (this.routeMode === "greed" && this.canGreedRoute()) {
      return baseStatus.replace("Optional relic:", "Greed route:");
    }
    return `${baseStatus} · press G`;
  }

  private paceStatus(): string {
    const { runRating, styleBonus } = rateArcadeRun({
      outcome: "escaped",
      alarm: Math.ceil(this.alarm),
      elapsedMs: this.elapsedMs
    });
    return styleBonus > 0 ? `${runRating} pace` : "Bonus window closed";
  }

  private cleanBonusWindow() {
    const elapsedSeconds = this.elapsedMs / 1000;
    if (elapsedSeconds <= 60 && Math.ceil(this.alarm) <= 2) {
      return {
        label: "Clean bonus",
        detail: "S-Rank +3",
        secondsLeft: Math.max(0, Math.ceil(60 - elapsedSeconds))
      };
    }
    if (elapsedSeconds <= 75 && Math.ceil(this.alarm) <= 3) {
      return {
        label: "Clean bonus",
        detail: "A-Rank +2",
        secondsLeft: Math.max(0, Math.ceil(75 - elapsedSeconds))
      };
    }
    if (elapsedSeconds <= 90 && Math.ceil(this.alarm) <= 3) {
      return {
        label: "Clean bonus",
        detail: "B-Rank +1",
        secondsLeft: Math.max(0, Math.ceil(90 - elapsedSeconds))
      };
    }
    return null;
  }

  private lootChainWindow() {
    if (this.artifactsStolen <= 0 || !this.primaryTargetArtifact()) return null;
    const remainingMs = LOOT_CHAIN_WINDOW_MS - (this.elapsedMs - this.lastLootChainAtMs);
    if (remainingMs <= 0) return null;
    return {
      label: `Loot chain x${this.artifactsStolen}`,
      detail: "Next relic keeps streak",
      secondsLeft: Math.max(0, Math.ceil(remainingMs / 1000))
    };
  }

  private rivalIntercept(): ArcadeRivalIntercept | null {
    if (!this.player) return null;
    const carrier = this.nearestRivalCarrierRun();
    if (!carrier) return null;
    const cashoutSeconds = this.carrierCashoutSeconds(carrier.agent);
    return {
      agentName: carrier.agent.name,
      relicName: carrier.relic.name,
      value: carrier.relic.value,
      distanceMeters: carrier.distanceMeters,
      directionLabel: carrier.directionLabel,
      cashoutSeconds,
      urgency: cashoutSeconds <= 4 ? "critical" : "chase"
    };
  }

  private carrierCashoutSeconds(agent: RuntimeAgent): number {
    const target = this.escapeZone ?? this.rooms.get("atrium");
    if (!target) return 0;
    const distance = Phaser.Math.Distance.Between(agent.x, agent.y, target.x, target.y);
    return Math.max(1, Math.ceil(distance / AI_SPEED));
  }

  private threatCue(
    rivalIntercept: ArcadeRivalIntercept | null,
    alibiPulseReady: boolean,
    nearestRival: RivalScan | null
  ): ArcadeThreatCue | null {
    if (rivalIntercept) {
      return {
        tone: "danger",
        label: rivalIntercept.directionLabel,
        detail:
          rivalIntercept.urgency === "critical"
            ? `${rivalIntercept.agentName} with ${rivalIntercept.relicName} +${rivalIntercept.value} · cashout imminent`
            : `${rivalIntercept.agentName} with ${rivalIntercept.relicName} +${rivalIntercept.value} · cashout in ${rivalIntercept.cashoutSeconds}s`,
        action: "Close gap and press E"
      };
    }

    if (this.phase() === "lockdown") {
      const action = this.lootValue > 0 ? "Cashout before the doors close" : "Escape before the doors close";
      return {
        tone: "danger",
        label: "Vault sealing",
        detail: `${Math.max(1, Math.ceil(this.timeLeftMs() / 1000))}s before the Moon Vault closes`,
        action
      };
    }

    if (this.aiReleased && this.aiWakeHoldMs > 0) {
      return {
        tone: "warning",
        label: "Rivals waking",
        detail: `${Math.max(1, Math.ceil(this.aiWakeHoldMs / 1000))}s head start before scans`,
        action: "Choose cashout or greed now"
      };
    }

    if (alibiPulseReady && nearestRival) {
      return {
        tone: "warning",
        label: "Scan lock",
        detail: "Scanner is charging your alarm.",
        action: "Press E / Space to jam"
      };
    }

    return null;
  }

  private rivalStatus(): string {
    if (this.phase() === "lockdown") return `Vault sealing in ${Math.max(1, Math.ceil(this.timeLeftMs() / 1000))}s`;
    if (this.rivalsAreActive()) return "Rivals active";
    if (this.aiReleased) return `Rivals waking in ${Math.max(1, Math.ceil(this.aiWakeHoldMs / 1000))}s`;
    const seconds = Math.max(1, Math.ceil(Math.max(0, AI_GRACE_MS - this.elapsedMs - 500) / 1000));
    return `Rivals wake after first score or ${seconds}s`;
  }

  private primaryTargetArtifact(): RuntimeArtifact | undefined {
    return this.artifacts
      .filter((artifact) => !artifact.takenBy)
      .sort((a, b) => {
        if (a.size !== b.size) return a.size === "major" ? -1 : 1;
        return b.value - a.value;
      })[0];
  }

  private canGreedRoute(): boolean {
    return this.lootValue > 0 && this.timeLeftMs() > 45_000 && Boolean(this.primaryTargetArtifact());
  }

  private toggleRouteMode() {
    if (!this.canGreedRoute()) {
      this.routeMode = "escape";
      this.flashObjectiveBanner(this.buildEscapeBanner(false));
      this.emitHudIfNeeded(true);
      return;
    }
    this.routeMode = this.routeMode === "greed" ? "escape" : "greed";
    this.updateTargetMarker();
    const targetArtifact = this.primaryTargetArtifact();
    const escapePayout = this.escapePayout(true);
    this.flashObjectiveBanner(
      this.routeMode === "greed" && targetArtifact
        ? {
            tone: "greed",
            title: "Greed route armed",
            detail: `Steal ${targetArtifact.name} before escape`
          }
        : this.buildEscapeBanner(false),
      2_400
    );
    this.flashRoutePulse(
      this.routeMode === "greed" && targetArtifact && escapePayout
        ? {
            mode: "greed",
            title: "Greed route locked",
            detail: `Cashout +${escapePayout.cashout + targetArtifact.value} if you survive`,
            action: `${targetArtifact.name} marker live`
          }
        : {
            mode: "escape",
            title: "Cashout route locked",
            detail: `Bank +${escapePayout?.cashout ?? this.lootValue} at Atrium Lift`,
            action: "Atrium Lift marker live"
          }
    );
    this.emitHudIfNeeded(true);
  }

  private currentObjectiveTarget(): ArcadeObjectiveTarget | undefined {
    const carrier = this.nearestRivalCarrierRun();
    if (carrier) {
      return {
        kind: "carrier",
        id: carrier.agent.id,
        label: `${carrier.agent.name} carrier`,
        x: carrier.agent.x,
        y: carrier.agent.y
      };
    }

    const artifact = this.primaryTargetArtifact();

    if (this.routeMode === "greed" && this.canGreedRoute() && artifact) {
      return {
        kind: "artifact",
        id: artifact.id,
        label: this.artifactTargetLabel(artifact),
        x: artifact.x,
        y: artifact.y
      };
    }

    if ((this.lootValue > 0 || this.timeLeftMs() <= 30_000) && this.escapeZone) {
      return {
        kind: "escape",
        id: "escape",
        label: "Atrium Lift",
        x: this.escapeZone.x,
        y: this.escapeZone.y
      };
    }

    return artifact
      ? {
          kind: "artifact",
          id: artifact.id,
          label: this.artifactTargetLabel(artifact),
          x: artifact.x,
          y: artifact.y
        }
      : undefined;
  }

  private artifactTargetLabel(artifact: RuntimeArtifact): string {
    return `${artifact.name} +${artifact.value}`;
  }

  private nearPlayerArtifact(): RuntimeArtifact | undefined {
    if (!this.player) return undefined;
    return this.artifacts.find(
      (artifact) =>
        !artifact.takenBy &&
        Phaser.Math.Distance.Between(this.player!.x, this.player!.y, artifact.x, artifact.y) <= PICKUP_RADIUS + 18
    );
  }

  private nearestRivalCarrierRun(): RivalCarrierRun | undefined {
    if (!this.player) return undefined;
    return this.aiAgents
      .filter((agent) => agent.carriedRelics.length > 0)
      .map((agent) => {
        const relic = agent.carriedRelics.at(-1);
        if (!relic) return null;
        const dx = agent.x - this.player!.x;
        const dy = agent.y - this.player!.y;
        const distance = Phaser.Math.Distance.Between(this.player!.x, this.player!.y, agent.x, agent.y);
        const distanceMeters = Math.max(0, Math.round(distance / 8));
        return {
          agent,
          relic,
          distanceMeters,
          directionLabel: buildObjectiveDirectionLabel({
            kind: "carrier",
            dx,
            dy,
            distanceMeters
          })
        };
      })
      .filter((carrier): carrier is RivalCarrierRun => Boolean(carrier))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
  }

  private nearRivalCarrier(): RuntimeAgent | undefined {
    if (!this.player) return undefined;
    return this.aiAgents.find(
      (agent) =>
        agent.carriedRelics.length > 0 &&
        Phaser.Math.Distance.Between(this.player!.x, this.player!.y, agent.x, agent.y) <= INTERCEPT_RADIUS
    );
  }

  private updateCarrierBadges() {
    for (const agent of this.aiAgents) {
      const relic = agent.carriedRelics.at(-1);
      const visible = Boolean(relic);
      agent.carrierBadge.setVisible(visible);
      agent.carrierBadge.setData("visible", visible);
      agent.carrierBadge.setData("agentName", agent.name);
      if (!relic) {
        agent.carrierBadge.setData("label", "");
        continue;
      }

      const label = `+${relic.value}`;
      agent.carrierBadgeLabel.setText(label);
      agent.carrierBadge.setData("label", label);
    }
  }

  private carrierBadgesDebug() {
    return this.aiAgents
      .filter((agent) => Boolean(agent.carrierBadge.getData("visible")))
      .map((agent) => ({
        agentName: String(agent.carrierBadge.getData("agentName") ?? agent.name),
        label: String(agent.carrierBadge.getData("label") ?? ""),
        visible: true
      }));
  }

  private updateCarrierCashoutRoute() {
    const carrier = this.nearestRivalCarrierRun();
    const target = this.escapeZone ?? this.rooms.get("atrium");
    if (!carrier || !target) {
      this.clearCarrierCashoutRoute();
      return;
    }

    if (!this.carrierRoute) {
      this.carrierRoute = this.add.graphics().setDepth(7);
    }

    const from = carrier.agent;
    const distance = Phaser.Math.Distance.Between(from.x, from.y, target.x, target.y);
    const chevronCount = this.routeChevronCount(distance);
    const pulseAlpha = 0.22 + Math.sin(this.elapsedMs / 140) * 0.07;

    this.carrierRoute.clear();
    this.carrierRoute.lineStyle(18, 0xff4f7b, 0.08);
    this.carrierRoute.strokeLineShape(new Phaser.Geom.Line(from.x, from.y, target.x, target.y));
    this.carrierRoute.lineStyle(5, 0xff4f7b, pulseAlpha);
    this.carrierRoute.strokeLineShape(new Phaser.Geom.Line(from.x, from.y, target.x, target.y));
    this.carrierRoute.fillStyle(0xff4f7b, 0.13);
    this.carrierRoute.fillCircle(target.x, target.y, 58);
    this.drawCarrierCashoutChevrons(from, target, chevronCount);
    this.carrierRoute.setData("visible", true);
    this.carrierRoute.setData("targetLabel", "Atrium Lift");
    this.carrierRoute.setData("chevronCount", chevronCount);
    this.carrierRoute.setData("distanceMeters", Math.max(0, Math.round(distance / 8)));
  }

  private drawCarrierCashoutChevrons(from: { x: number; y: number }, target: { x: number; y: number }, chevronCount: number) {
    if (!this.carrierRoute || chevronCount <= 0) return;
    const angle = Phaser.Math.Angle.Between(from.x, from.y, target.x, target.y);
    const forwardX = Math.cos(angle);
    const forwardY = Math.sin(angle);
    const sideX = Math.cos(angle + Math.PI / 2);
    const sideY = Math.sin(angle + Math.PI / 2);
    this.carrierRoute.fillStyle(0xff4f7b, 0.78);

    for (let index = 1; index <= chevronCount; index += 1) {
      const progress = index / (chevronCount + 1);
      const x = Phaser.Math.Linear(from.x, target.x, progress);
      const y = Phaser.Math.Linear(from.y, target.y, progress);
      const tipX = x + forwardX * 16;
      const tipY = y + forwardY * 16;
      const baseX = x - forwardX * 12;
      const baseY = y - forwardY * 12;
      this.carrierRoute.fillTriangle(tipX, tipY, baseX + sideX * 8, baseY + sideY * 8, baseX - sideX * 8, baseY - sideY * 8);
    }
  }

  private clearCarrierCashoutRoute() {
    this.carrierRoute?.clear();
    this.carrierRoute?.setData("visible", false);
  }

  private carrierCashoutRouteDebug() {
    if (!this.carrierRoute?.getData("visible")) return null;
    return {
      visible: true,
      targetLabel: String(this.carrierRoute.getData("targetLabel") ?? ""),
      chevronCount: Number(this.carrierRoute.getData("chevronCount") ?? 0),
      distanceMeters: Number(this.carrierRoute.getData("distanceMeters") ?? 0)
    };
  }

  private relicListLabel(relics: CarriedRelic[]): string {
    if (relics.length === 1) return `${relics[0]!.name} +${relics[0]!.value}`;
    const total = relics.reduce((sum, relic) => sum + relic.value, 0);
    return `${relics.length} relics +${total}`;
  }

  private updateThreatHalo() {
    const carrier = this.nearestRivalCarrierRun();
    if (carrier) {
      this.drawThreatHalo(carrier.agent, "carrier", carrier.distanceMeters);
      return;
    }

    const scan = this.nearestRivalScan();
    const pressure = this.rivalPressure(scan);
    if (!scan || pressure.level === "clear" || pressure.level === "standby") {
      this.clearThreatHalo();
      return;
    }

    const rival = this.aiAgents.find((agent) => agent.name === scan.name);
    if (!rival) {
      this.clearThreatHalo();
      return;
    }

    this.drawThreatHalo(rival, "scan", scan.distanceMeters);
  }

  private drawThreatHalo(agent: RuntimeAgent, kind: "carrier" | "scan", distanceMeters: number) {
    if (!this.threatHalo) {
      this.threatHalo = this.add.graphics().setDepth(19);
    }

    const color = kind === "carrier" ? 0xff4f7b : 0xffd56a;
    const coreRadius = kind === "carrier" ? 64 : 52;
    const outerRadius = coreRadius + (kind === "carrier" ? 18 : 13);
    const alpha = kind === "carrier" ? 0.82 : 0.64;

    this.threatHalo.clear();
    this.threatHalo.fillStyle(color, kind === "carrier" ? 0.12 : 0.09);
    this.threatHalo.fillCircle(agent.x, agent.y, coreRadius);
    this.threatHalo.lineStyle(kind === "carrier" ? 4 : 3, color, alpha);
    this.threatHalo.strokeCircle(agent.x, agent.y, coreRadius);
    this.threatHalo.lineStyle(1, color, kind === "carrier" ? 0.38 : 0.28);
    this.threatHalo.strokeCircle(agent.x, agent.y, outerRadius);

    const tickLength = kind === "carrier" ? 18 : 13;
    this.threatHalo.lineStyle(2, color, kind === "carrier" ? 0.72 : 0.48);
    for (let index = 0; index < 4; index += 1) {
      const angle = index * (Math.PI / 2);
      const innerX = agent.x + Math.cos(angle) * (coreRadius - tickLength);
      const innerY = agent.y + Math.sin(angle) * (coreRadius - tickLength);
      const outerX = agent.x + Math.cos(angle) * (coreRadius + tickLength * 0.45);
      const outerY = agent.y + Math.sin(angle) * (coreRadius + tickLength * 0.45);
      this.threatHalo.lineBetween(innerX, innerY, outerX, outerY);
    }

    this.threatHalo.setData("kind", kind);
    this.threatHalo.setData("agentName", agent.name);
    this.threatHalo.setData("distanceMeters", distanceMeters);
  }

  private clearThreatHalo() {
    this.threatHalo?.clear();
    this.threatHalo?.setData("kind", null);
    this.threatHalo?.setData("agentName", null);
    this.threatHalo?.setData("distanceMeters", null);
  }

  private threatHaloDebug() {
    const kind = this.threatHalo?.getData("kind") as "carrier" | "scan" | null | undefined;
    if (!kind) return null;
    return {
      kind,
      visible: true,
      agentName: String(this.threatHalo?.getData("agentName") ?? ""),
      distanceMeters: Number(this.threatHalo?.getData("distanceMeters") ?? 0)
    };
  }

  private motionTrailDebug() {
    return {
      active: this.motionTrailActive(),
      burstCount: this.motionTrailBurstCount,
      pointCount: this.motionTrailPoints.length,
      activeMs: Math.max(0, Math.round(this.motionTrailActiveUntilMs - this.elapsedMs))
    };
  }

  private arenaLabelsDebug() {
    return {
      roomCount: this.arenaRoomLabelCount,
      zoneBeacons: Array.from(this.arenaZoneBeacons).sort()
    };
  }

  private targetMarkerDebug() {
    if (!this.targetMarker) return null;
    return {
      label: String(this.targetMarker.getData("label") ?? ""),
      visible: true
    };
  }

  private updateTargetMarker() {
    const target = this.currentObjectiveTarget();
    if (!target) {
      this.targetMarker?.destroy(true);
      this.targetMarker = undefined;
      this.targetBeam?.destroy();
      this.targetBeam = undefined;
      return;
    }

    this.updateTargetBeam(target);

    const targetKey = `${target.kind}:${target.id}`;
    const markerLabel = this.targetMarkerLabel(target);
    if (!this.targetMarker || this.targetMarker.getData("targetKey") !== targetKey || this.targetMarker.getData("label") !== markerLabel) {
      this.targetMarker?.destroy(true);
      const ring = this.add.circle(0, 0, 44, 0xffd56a, 0.08).setStrokeStyle(4, 0xffd56a, 0.9);
      const pointer = this.add.triangle(0, -62, 0, -18, -16, 12, 16, 12, 0xffd56a, 0.92);
      const label = this.add
        .text(0, -88, markerLabel.toUpperCase(), {
          color: "#ffd56a",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "900",
          stroke: "#050811",
          strokeThickness: 5
        })
        .setOrigin(0.5);
      this.targetMarker = this.add.container(target.x, target.y, [ring, pointer, label]).setDepth(16);
      this.targetMarker.setData("targetKey", targetKey);
      this.targetMarker.setData("label", markerLabel);
      this.tweens.add({
        targets: ring,
        scale: { from: 0.9, to: 1.2 },
        alpha: { from: 0.65, to: 1 },
        duration: 780,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      return;
    }

    this.targetMarker.setPosition(target.x, target.y);
  }

  private updateTargetBeam(target: ArcadeObjectiveTarget) {
    if (!this.player) return;
    if (!this.targetBeam) {
      this.targetBeam = this.add.graphics().setDepth(5);
    }

    const color = target.kind === "escape" ? 0x7effdf : target.kind === "carrier" ? 0xff4f7b : 0xffd56a;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    this.targetBeam.clear();
    this.targetBeam.lineStyle(8, color, 0.1);
    this.targetBeam.strokeLineShape(new Phaser.Geom.Line(this.player.x, this.player.y, target.x, target.y));
    this.targetBeam.lineStyle(3, color, 0.45);
    this.targetBeam.strokeLineShape(new Phaser.Geom.Line(this.player.x, this.player.y, target.x, target.y));
    this.drawRouteChevrons(target, color, distance);
    this.targetBeam.fillStyle(color, 0.14);
    this.targetBeam.fillCircle(target.x, target.y, target.kind === "escape" ? 68 : target.kind === "carrier" ? 58 : 50);
  }

  private targetMarkerLabel(target: ArcadeObjectiveTarget): string {
    if (target.kind === "escape" && this.lootValue > 0) return `Cashout +${this.lootValue + 2}`;
    if (target.kind !== "carrier") return target.label;
    const carrier = this.aiAgents.find((agent) => agent.id === target.id);
    if (!carrier) return target.label;
    const carriedRelic = carrier.carriedRelics.at(-1);
    return carriedRelic ? `${carrier.name} +${carriedRelic.value}` : target.label;
  }

  private routeGuideDebug(target: ArcadeObjectiveTarget | undefined) {
    if (!this.player || !target) return null;
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    return {
      kind: target.kind,
      distanceMeters: Math.max(0, Math.round(distance / 8)),
      chevronCount: this.routeChevronCount(distance)
    };
  }

  private routeChevronCount(distance: number) {
    if (distance < 72) return 0;
    return Phaser.Math.Clamp(Math.floor(distance / 92), 1, 7);
  }

  private drawRouteChevrons(target: ArcadeObjectiveTarget, color: number, distance: number) {
    if (!this.player) return;
    const chevronCount = this.routeChevronCount(distance);
    if (chevronCount <= 0) return;

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const forwardX = Math.cos(angle);
    const forwardY = Math.sin(angle);
    const sideX = Math.cos(angle + Math.PI / 2);
    const sideY = Math.sin(angle + Math.PI / 2);
    this.targetBeam?.fillStyle(color, target.kind === "carrier" ? 0.72 : 0.6);

    for (let index = 1; index <= chevronCount; index += 1) {
      const progress = index / (chevronCount + 1);
      const x = Phaser.Math.Linear(this.player.x, target.x, progress);
      const y = Phaser.Math.Linear(this.player.y, target.y, progress);
      const tipX = x + forwardX * 18;
      const tipY = y + forwardY * 18;
      const baseX = x - forwardX * 13;
      const baseY = y - forwardY * 13;
      this.targetBeam?.fillTriangle(tipX, tipY, baseX + sideX * 9, baseY + sideY * 9, baseX - sideX * 9, baseY - sideY * 9);
    }
  }

  private pendingRivalRelicNames(): string[] {
    return this.aiAgents.flatMap((agent) => agent.carriedRelics.map((relic) => relic.name));
  }

  private finish(outcome: "escaped" | "sealed" | "caught") {
    if (!this.config || this.finished) return;
    this.finished = true;
    if (outcome === "escaped") {
      this.impactPulse("escape");
      this.scorePopup = {
        tone: "bonus",
        label: "+2 Escape bonus",
        detail: `Cashout ${this.lootValue + 2}`
      };
      this.scorePopupUntilMs = this.elapsedMs + 1_800;
    }
    this.emitHudIfNeeded(true);
    this.config.onFinish({
      outcome,
      playerName: this.playerName,
      lootValue: this.lootValue,
      artifactsStolen: this.artifactsStolen,
      stolenRelicNames: this.stolenRelicNames,
      rivalRelicNames: this.rivalRelicNames,
      pendingRivalRelicNames: this.pendingRivalRelicNames(),
      aiLootValue: this.aiLootValue,
      alarm: Math.ceil(this.alarm),
      elapsedMs: this.elapsedMs,
      alibiPulsesUsed: this.alibiPulsesUsed,
      scanBurns: this.scanBurns,
      carrierIntercepts: this.carrierIntercepts,
      interceptedRelicNames: this.interceptedRelicNames
    });
  }

  private feedLine(text: string) {
    if (this.feed.at(-1) === text) return;
    this.feed.push(text);
    if (this.feed.length > 9) this.feed.shift();
    this.emitHudIfNeeded(true);
  }

  private addTrail(x: number, y: number, direction: Phaser.Math.Vector2) {
    if (!this.motionTrail) {
      this.motionTrail = this.add.graphics().setDepth(9);
    }

    const heading = direction.clone();
    if (heading.lengthSq() === 0) heading.set(0, -1);
    heading.normalize();
    const side = new Phaser.Math.Vector2(-heading.y, heading.x);
    const colors = [0x7effdf, 0xffd56a, 0xffffff];

    this.motionTrailBurstCount += 1;
    this.motionTrailActiveUntilMs = this.elapsedMs + 560;
    for (let index = 0; index < 7; index += 1) {
      const lag = index * 18;
      const sideOffset = (index % 2 === 0 ? 1 : -1) * Math.min(10, index * 2.4);
      this.motionTrailPoints.push({
        x: x - heading.x * lag + side.x * sideOffset,
        y: y - heading.y * lag + side.y * sideOffset,
        ageMs: index * 18,
        ttlMs: 420 + index * 28,
        radius: 25 - index * 1.8,
        color: colors[index % colors.length]!
      });
    }
    if (this.motionTrailPoints.length > 40) {
      this.motionTrailPoints.splice(0, this.motionTrailPoints.length - 40);
    }
    this.renderMotionTrail();
  }

  private updateMotionTrail(delta: number) {
    if (!this.motionTrail) return;
    this.motionTrailPoints = this.motionTrailPoints
      .map((point) => ({ ...point, ageMs: point.ageMs + delta }))
      .filter((point) => point.ageMs <= point.ttlMs);

    if (!this.motionTrailActive()) {
      this.motionTrail.clear();
      return;
    }

    this.renderMotionTrail();
  }

  private renderMotionTrail() {
    if (!this.motionTrail) return;
    this.motionTrail.clear();

    for (let index = 0; index < this.motionTrailPoints.length; index += 1) {
      const point = this.motionTrailPoints[index]!;
      const progress = Phaser.Math.Clamp(point.ageMs / point.ttlMs, 0, 1);
      const alpha = (1 - progress) * 0.42;
      const radius = Math.max(4, point.radius * (1 + progress * 1.4));
      this.motionTrail.fillStyle(point.color, alpha * 0.36);
      this.motionTrail.fillCircle(point.x, point.y, radius + 12);
      this.motionTrail.fillStyle(point.color, alpha);
      this.motionTrail.fillCircle(point.x, point.y, radius);

      const next = this.motionTrailPoints[index + 1];
      if (!next) continue;
      this.motionTrail.lineStyle(5, point.color, alpha * 0.36);
      this.motionTrail.lineBetween(point.x, point.y, next.x, next.y);
    }
  }

  private motionTrailActive() {
    return this.motionTrailPoints.length > 0 || this.elapsedMs < this.motionTrailActiveUntilMs;
  }

  private resizeCamera = () => {
    const camera = this.cameras.main;
    const zoom = Phaser.Math.Clamp(Math.min(this.scale.width / 1120, this.scale.height / 720), 0.62, 1.08);
    camera.setZoom(zoom);
    camera.setDeadzone(Math.max(140, this.scale.width * 0.28), Math.max(110, this.scale.height * 0.24));
  };
}

function movementDirectionFromKey(key: string): HeldDirection | null {
  const normalized = key.toLowerCase();
  if (normalized === "arrowup" || normalized === "w") return "up";
  if (normalized === "arrowdown" || normalized === "s") return "down";
  if (normalized === "arrowleft" || normalized === "a") return "left";
  if (normalized === "arrowright" || normalized === "d") return "right";
  return null;
}

function movementVectorFromDirection(direction: HeldDirection): MovementVector {
  if (direction === "up") return { x: 0, y: -1 };
  if (direction === "down") return { x: 0, y: 1 };
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  return { x: 0, y: 0 };
}
