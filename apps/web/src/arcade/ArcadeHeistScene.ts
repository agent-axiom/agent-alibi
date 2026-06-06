import Phaser from "phaser";
import type { ArtifactState, GameState, PlayerState, Room, TeamId } from "@agent-alibi/shared";
import { ALIBI_PULSE_COOLDOWN_MS, buildAlibiPulseStatus, canUseAlibiPulse } from "./alibi-pulse";
import { rateArcadeRun } from "./arcade-rules";
import { ARCADE_MISSION_DURATION_MS, type ArcadeHudPhase, type ArcadeHudState, type ArcadeMissionConfig, type ArcadeRadarBlip } from "./arcade-types";
import { buildActiveActionHint, buildArcadeGuidance, buildRivalPressure, type RivalPressure } from "./guidance";
import { nextMovementImpulse, selectMovementVector, type MovementImpulse, type MovementVector } from "./movement";
import { buildRivalScanStatus, updateRivalScan as advanceRivalScan, type RivalScanState } from "./rival-scan";

const WORLD_WIDTH = 1680;
const WORLD_HEIGHT = 1040;
const PLAYER_SPEED = 285;
const DASH_SPEED = 620;
const AI_SPEED = 150;
const PICKUP_RADIUS = 42;
const EXIT_RADIUS = 74;
const DASH_COOLDOWN_MS = 1150;
const AI_GRACE_MS = 5_500;

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

type RuntimeAgent = {
  id: string;
  name: string;
  teamId: TeamId;
  x: number;
  y: number;
  targetRoomId: string;
  lootValue: number;
  body: Phaser.GameObjects.Container;
  dot: Phaser.GameObjects.Arc;
  ship: Phaser.GameObjects.Container;
};

type ArcadeObjectiveTarget =
  | { kind: "artifact"; id: string; label: string; x: number; y: number }
  | { kind: "escape"; id: "escape"; label: string; x: number; y: number };

type RouteMode = "escape" | "greed";

type RivalScan = {
  name: string;
  distanceMeters: number;
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
  private aiLootValue = 0;
  private lastHudAt = -1;
  private feed: string[] = [];
  private spotlight: string | null = null;
  private spotlightUntilMs = 0;
  private finished = false;
  private aiReleased = false;
  private lastRivalPressureLevel: RivalPressure["level"] = "standby";
  private rivalScanState: RivalScanState = { chargeMs: 0, cooldownMs: 0 };
  private alibiPulseCooldownMs = 0;
  private alibiPulsesUsed = 0;
  private scanBurns = 0;
  private lastRivalSteal: string | null = null;
  private playerName = "Agent You";
  private routeMode: RouteMode = "escape";
  private escapeZone?: Phaser.GameObjects.Container;
  private targetMarker?: Phaser.GameObjects.Container;
  private targetBeam?: Phaser.GameObjects.Graphics;

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

  getDebugState() {
    const target = this.currentObjectiveTarget();
    const nearestRival = this.nearestRivalScan();
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
      hasTargetBeam: Boolean(this.targetBeam),
      routeMode: this.routeMode,
      nearestRival,
      lastRivalSteal: this.lastRivalSteal,
      impulse: this.keyboardImpulse ?? null
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
    this.aiReleased = true;
    this.updateRivalPressureFeed();
    this.emitHudIfNeeded(true);
  }

  forceRivalStealForDebug() {
    const rival = this.aiAgents[0];
    const artifact = this.artifacts.find((candidate) => !candidate.takenBy);
    if (!rival || !artifact) return;

    this.aiReleased = true;
    this.moveAgent(rival, artifact.x - rival.x, artifact.y - rival.y);
    this.stealArtifact(artifact, rival, rival.name);
    this.emitHudIfNeeded(true);
  }

  forceLockdownForDebug() {
    this.elapsedMs = Math.max(this.elapsedMs, ARCADE_MISSION_DURATION_MS - 25_000);
    this.flashSpotlight("Vault lockdown");
    this.feedLine("Vault lockdown imminent. Escape route priority.");
    this.emitHudIfNeeded(true);
  }

  override update(_time: number, delta: number) {
    if (!this.state || !this.player || this.finished) return;

    this.elapsedMs += delta;
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - delta);
    this.alibiPulseCooldownMs = Math.max(0, this.alibiPulseCooldownMs - delta);

    this.updatePlayer(delta);
    this.updateAi(delta);
    this.updateRivalPressureFeed();
    this.updateRivalScan(delta);
    this.updateTargetMarker();
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
    this.aiLootValue = 0;
    this.lastHudAt = -1;
    this.feed = ["Moon Vault breach started.", "Rival agents enter in 5 seconds.", "Move fast. Steal clean. Escape before lockdown."];
    this.spotlight = null;
    this.spotlightUntilMs = 0;
    this.finished = false;
    this.aiReleased = false;
    this.lastRivalPressureLevel = "standby";
    this.rivalScanState = { chargeMs: 0, cooldownMs: 0 };
    this.alibiPulseCooldownMs = 0;
    this.alibiPulsesUsed = 0;
    this.scanBurns = 0;
    this.lastRivalSteal = null;
    this.routeMode = "escape";
    this.targetMarker = undefined;
    this.targetBeam = undefined;
    this.playerName = config.state.players.find((player) => player.kind === "human")?.name ?? "Agent You";

    this.tweens.killAll();
    this.children.removeAll(true);
    this.drawWorld(config.state);
    this.createActors(config.state);
    this.resizeCamera();
    this.updateTargetMarker();
    this.scale.off("resize", this.resizeCamera, this);
    this.scale.on("resize", this.resizeCamera, this);
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
    this.escapeZone = this.add.container(atrium.x, atrium.y + 92, [ring, label]);
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
    const body = this.add.container(x, y, [shadow, ship, label]);
    body.setDepth(controlled ? 20 : 12);

    return {
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      x,
      y,
      targetRoomId: "atrium",
      lootValue: 0,
      body,
      dot,
      ship
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
        this.addTrail(this.player.x, this.player.y);
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
    if (this.elapsedMs < AI_GRACE_MS) return;
    if (!this.aiReleased) {
      this.aiReleased = true;
      this.feedLine("Rival agents entered the vault.");
    }

    for (const agent of this.aiAgents) {
      const target = this.rooms.get(agent.targetRoomId) ?? this.rooms.get("inner-vault");
      if (!target) continue;
      const vector = new Phaser.Math.Vector2(target.x - agent.x, target.y - agent.y);
      if (vector.length() < 36) {
        this.aiStealNearby(agent);
        agent.targetRoomId = this.pickAiTarget(agent);
        continue;
      }
      vector.normalize();
      this.moveAgent(agent, vector.x * AI_SPEED * (delta / 1000), vector.y * AI_SPEED * (delta / 1000));
      agent.ship.rotation = Phaser.Math.Angle.Between(0, 0, vector.x, vector.y) + Math.PI / 2;
    }
  }

  private moveAgent(agent: RuntimeAgent, dx: number, dy: number) {
    agent.x = Phaser.Math.Clamp(agent.x + dx, 82, WORLD_WIDTH - 82);
    agent.y = Phaser.Math.Clamp(agent.y + dy, 82, WORLD_HEIGHT - 82);
    agent.body.setPosition(agent.x, agent.y);
  }

  private stealArtifact(artifact: RuntimeArtifact, actor: RuntimeAgent, actorLabel: string) {
    if (artifact.takenBy) return;
    artifact.takenBy = actor.id;
    actor.lootValue += artifact.value;

    if (actor.id === this.player?.id) {
      this.lootValue += artifact.value;
      this.artifactsStolen += 1;
      this.stolenRelicNames.push(artifact.name);
      this.alarm = Math.min(5, this.alarm + (artifact.size === "major" ? 0.34 : 0.18));
      this.feedLine(`You stole ${artifact.name}. Escape route unlocked.`);
      this.routeMode = "escape";
      this.flashSpotlight(this.artifactsStolen > 1 ? `Loot chain x${this.artifactsStolen}` : `${artifact.name} secured`);
      this.collectArtifactVisual(artifact, 0xffd56a);
      this.updateTargetMarker();
      return;
    }

    this.aiLootValue += artifact.value;
    this.rivalRelicNames.push(artifact.name);
    this.alarm = Math.min(5, this.alarm + 0.12);
    this.lastRivalSteal = `Red +${artifact.value}: ${actorLabel} stole ${artifact.name}`;
    this.feedLine(`${actorLabel} stole ${artifact.name}.`);
    this.collectArtifactVisual(artifact, TEAM_COLORS[actor.teamId]);
    this.updateTargetMarker();
  }

  private flashSpotlight(text: string) {
    this.spotlight = text;
    this.spotlightUntilMs = this.elapsedMs + 1_800;
    this.emitHudIfNeeded(true);
  }

  private tryInteract() {
    if (!this.player) return;
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
    const guidance = buildArcadeGuidance({
      lootValue: this.lootValue,
      aiLootValue: this.aiLootValue,
      artifactsStolen: this.artifactsStolen,
      totalArtifacts: this.artifacts.length,
      targetArtifactName: targetArtifactLabel,
      nearArtifactName: nearArtifact?.name ?? null,
      nearExit: this.isNearExit(),
      canEscape,
      timeLeftMs: this.timeLeftMs()
    });
    const greedPromptActive = this.routeMode === "greed" && Boolean(targetArtifact);
    const alibiPulseReady = canUseAlibiPulse(rivalPressure.level, this.alibiPulseCooldownMs);

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
      objective: alibiPulseReady ? "Jam the rival scan" : greedPromptActive ? `Greed route: steal ${this.artifactTargetLabel(targetArtifact!)}` : guidance.objective,
      prompt: alibiPulseReady ? "Press E / Space to jam rival scan" : greedPromptActive && nearArtifact ? "Press E / Space to steal" : guidance.prompt,
      activeAction: buildActiveActionHint({
        alibiPulseReady,
        nearArtifactName: nearArtifact?.name ?? null,
        nearExit: this.isNearExit(),
        canEscape
      }),
      loopStep: alibiPulseReady ? "survive" : guidance.loopStep,
      raceStatus: guidance.raceStatus,
      lastRivalSteal: this.lastRivalSteal,
      vaultCondition: this.vaultCondition(),
      radarBlips: this.buildRadarBlips(objectiveTarget),
      greedStatus: this.greedStatus(guidance.greedStatus),
      targetDistanceLabel:
        objectiveTarget && targetDistanceMeters !== null
          ? `${objectiveTarget.kind === "escape" ? "Exit" : "Target"} ${targetDistanceMeters}m`
          : null,
      rivalStatus: this.rivalStatus(),
      rivalDistanceLabel: rivalPressure.label,
      rivalPressureLevel: rivalPressure.level,
      rivalScanStatus: buildRivalScanStatus(this.rivalScanState, rivalPressure.level),
      alibiPulseStatus: buildAlibiPulseStatus({
        rivalPressureLevel: rivalPressure.level,
        cooldownMs: this.alibiPulseCooldownMs
      }),
      paceStatus: this.paceStatus(),
      spotlight: this.spotlight,
      feed: this.feed.slice(-5)
    };
    this.config.onHudUpdate(hud);
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
        distanceMeters: Math.max(0, Math.round(Phaser.Math.Distance.Between(this.player!.x, this.player!.y, agent.x, agent.y) / 8))
      }))
      .sort((left, right) => left.distanceMeters - right.distanceMeters)[0];
    return nearest ?? null;
  }

  private rivalPressure(scan = this.nearestRivalScan()): RivalPressure {
    return buildRivalPressure({
      aiReleased: this.aiReleased,
      nearestRivalName: scan?.name ?? null,
      distanceMeters: scan?.distanceMeters ?? null
    });
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
    if (target) {
      blips.push({
        id: target.id,
        kind: target.kind === "escape" ? "exit" : "target",
        label: target.label,
        x: this.radarX(target.x),
        y: this.radarY(target.y)
      });
    }
    for (const rival of this.aiAgents) {
      blips.push({
        id: rival.id,
        kind: "rival",
        label: rival.name,
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

  private rivalStatus(): string {
    if (this.aiReleased) return "Rivals active";
    const seconds = Math.max(1, Math.ceil(Math.max(0, AI_GRACE_MS - this.elapsedMs - 500) / 1000));
    return `Rivals enter in ${seconds}s`;
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
      this.emitHudIfNeeded(true);
      return;
    }
    this.routeMode = this.routeMode === "greed" ? "escape" : "greed";
    this.updateTargetMarker();
    this.emitHudIfNeeded(true);
  }

  private currentObjectiveTarget(): ArcadeObjectiveTarget | undefined {
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
    if (!this.targetMarker || this.targetMarker.getData("targetKey") !== targetKey) {
      this.targetMarker?.destroy(true);
      const ring = this.add.circle(0, 0, 44, 0xffd56a, 0.08).setStrokeStyle(4, 0xffd56a, 0.9);
      const pointer = this.add.triangle(0, -62, 0, -18, -16, 12, 16, 12, 0xffd56a, 0.92);
      const label = this.add
        .text(0, -88, target.kind === "escape" ? "ESCAPE" : "TARGET", {
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

    const color = target.kind === "escape" ? 0x7effdf : 0xffd56a;
    this.targetBeam.clear();
    this.targetBeam.lineStyle(3, color, 0.32);
    this.targetBeam.strokeLineShape(new Phaser.Geom.Line(this.player.x, this.player.y, target.x, target.y));
    this.targetBeam.fillStyle(color, 0.14);
    this.targetBeam.fillCircle(target.x, target.y, target.kind === "escape" ? 68 : 50);
  }

  private finish(outcome: "escaped" | "sealed" | "caught") {
    if (!this.config || this.finished) return;
    this.finished = true;
    this.emitHudIfNeeded(true);
    this.config.onFinish({
      outcome,
      playerName: this.playerName,
      lootValue: this.lootValue,
      artifactsStolen: this.artifactsStolen,
      stolenRelicNames: this.stolenRelicNames,
      rivalRelicNames: this.rivalRelicNames,
      aiLootValue: this.aiLootValue,
      alarm: Math.ceil(this.alarm),
      elapsedMs: this.elapsedMs,
      alibiPulsesUsed: this.alibiPulsesUsed,
      scanBurns: this.scanBurns
    });
  }

  private feedLine(text: string) {
    if (this.feed.at(-1) === text) return;
    this.feed.push(text);
    if (this.feed.length > 9) this.feed.shift();
    this.emitHudIfNeeded(true);
  }

  private addTrail(x: number, y: number) {
    const trail = this.add.circle(x, y, 28, 0xffd56a, 0.24).setDepth(8);
    this.tweens.add({
      targets: trail,
      scale: 2.8,
      alpha: 0,
      duration: 360,
      ease: "Cubic.easeOut",
      onComplete: () => trail.destroy()
    });
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
