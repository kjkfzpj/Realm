// Game entities: units, buildings and resource nodes. Entities own their data
// and their per-frame behaviour; cross-entity queries (nearest drop-off,
// nearest enemy) are delegated to the Game context passed into update().
import * as THREE from 'three';
import {
  UNIT, BUILDINGS, COLORS, RESOURCE_NODE,
  type Faction, type ResourceType, type UnitKind, type BuildingKind,
} from './config';
import {
  buildVillager, buildSoldier, buildArcher, buildingMesh,
  buildTree, buildGold, buildBerry,
} from './factory';
import type { Game } from './game';

let NEXT_ID = 1;
const tmp = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Billboard health bar shared by units and buildings
// ---------------------------------------------------------------------------
class HealthBar {
  group = new THREE.Group();
  private fill: THREE.Mesh;
  private width: number;
  constructor(width: number, height: number, yOffset: number) {
    this.width = width;
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(width + 0.1, height + 0.1),
      new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false, transparent: true, opacity: 0.85 }),
    );
    this.fill = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color: 0x46d05a, depthTest: false }),
    );
    bg.renderOrder = 998;
    this.fill.renderOrder = 999;
    this.group.add(bg);
    this.group.add(this.fill);
    this.group.position.y = yOffset;
    this.group.visible = false;
  }
  set(ratio: number, friendly: boolean) {
    ratio = THREE.MathUtils.clamp(ratio, 0, 1);
    this.fill.scale.x = ratio;
    this.fill.position.x = -(this.width * (1 - ratio)) / 2;
    (this.fill.material as THREE.MeshBasicMaterial).color.setHex(
      friendly ? (ratio > 0.5 ? 0x46d05a : ratio > 0.25 ? 0xd0c046 : 0xd0463a) : 0xd0463a,
    );
  }
  faceCamera(q: THREE.Quaternion) {
    this.group.quaternion.copy(q);
  }
}

// ---------------------------------------------------------------------------
// Selection ring
// ---------------------------------------------------------------------------
function makeRing(radius: number, color: number): THREE.Mesh {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.85, radius, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = false;
  return ring;
}

// ---------------------------------------------------------------------------
// Resource node
// ---------------------------------------------------------------------------
export class ResourceNode {
  id = NEXT_ID++;
  mesh: THREE.Group;
  amount: number;
  type: ResourceType;
  radius = 1.4;
  dead = false;
  constructor(public kind: keyof typeof RESOURCE_NODE, public pos: THREE.Vector3) {
    const def = RESOURCE_NODE[kind];
    this.amount = def.amount;
    this.type = def.type;
    this.mesh = kind === 'tree' ? buildTree() : kind === 'gold' ? buildGold() : buildBerry();
    this.mesh.position.copy(pos);
    this.mesh.userData.entity = this;
  }
  take(want: number): number {
    const got = Math.min(want, this.amount);
    this.amount -= got;
    if (this.amount <= 0) this.dead = true;
    return got;
  }
}

// ---------------------------------------------------------------------------
// Building
// ---------------------------------------------------------------------------
export type TrainOrder = { kind: UnitKind; remaining: number; total: number };

export class Building {
  id = NEXT_ID++;
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  radius: number;
  complete: boolean;
  buildProgress: number; // 0..maxHp
  dead = false;
  selected = false;
  rallyPoint: THREE.Vector3 | null = null;
  queue: TrainOrder[] = [];
  trainTimer = 0;
  private ring: THREE.Mesh;
  private bar: HealthBar;
  private windmill?: THREE.Object3D;

  constructor(public kind: BuildingKind, public faction: Faction, public pos: THREE.Vector3, prebuilt = false) {
    const def = BUILDINGS[kind];
    this.maxHp = def.maxHp;
    this.radius = def.footprint * 0.62;
    this.complete = prebuilt;
    this.buildProgress = prebuilt ? def.maxHp : 0;
    this.hp = prebuilt ? def.maxHp : Math.max(1, def.maxHp * 0.05);
    this.mesh = buildingMesh(kind, faction);
    this.mesh.position.copy(pos);
    this.mesh.userData.entity = this;
    this.windmill = this.mesh.userData.windmill;
    if (!prebuilt) {
      this.mesh.scale.set(1, 0.04, 1);
      this.mesh.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && 'transparent' in m) { m.transparent = true; m.opacity = 0.55; }
      });
    }
    this.ring = makeRing(this.radius + 0.6, faction === 'player' ? COLORS.selection : COLORS.enemy);
    this.mesh.add(this.ring);
    this.bar = new HealthBar(def.footprint * 0.8, 0.4, def.footprint * 0.9 + 4);
    this.mesh.add(this.bar.group);
  }

  addBuild(amount: number): boolean {
    if (this.complete) return true;
    this.buildProgress = Math.min(this.maxHp, this.buildProgress + amount);
    this.hp = this.buildProgress;
    const ratio = this.buildProgress / this.maxHp;
    this.mesh.scale.set(1, THREE.MathUtils.lerp(0.04, 1, ratio), 1);
    if (this.buildProgress >= this.maxHp) {
      this.complete = true;
      this.mesh.scale.set(1, 1, 1);
      this.mesh.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && 'opacity' in m) { m.opacity = 1; m.transparent = false; }
      });
      return true;
    }
    return false;
  }

  damage(amount: number) {
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  setSelected(v: boolean) {
    this.selected = v;
    this.ring.visible = v;
  }

  update(dt: number, game: Game, camQuat: THREE.Quaternion) {
    if (this.windmill && this.complete) this.windmill.rotation.z += dt * 1.2;
    // training queue
    if (this.complete && this.queue.length > 0) {
      this.trainTimer -= dt;
      const order = this.queue[0];
      if (this.trainTimer <= 0) {
        game.completeTraining(this, order.kind);
        this.queue.shift();
        if (this.queue.length > 0) this.trainTimer = game.trainTimeFor(this.queue[0].kind);
      }
    }
    // health bar
    const ratio = this.hp / this.maxHp;
    this.bar.group.visible = this.selected || (this.complete && ratio < 0.999) || !this.complete;
    if (this.bar.group.visible) { this.bar.set(ratio, this.faction === 'player'); this.bar.faceCamera(camQuat); }
  }
}

// ---------------------------------------------------------------------------
// Unit
// ---------------------------------------------------------------------------
export type UnitState = 'idle' | 'move' | 'gather' | 'return' | 'build' | 'attackMove' | 'attack';

export class Unit {
  id = NEXT_ID++;
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  dead = false;
  selected = false;
  state: UnitState = 'idle';

  moveTarget: THREE.Vector3 | null = null; // final destination for move/attackMove
  gatherNode: ResourceNode | null = null;
  carry = 0;
  carryType: ResourceType | null = null;
  buildTarget: Building | null = null;
  combatTarget: Unit | Building | null = null;
  private cooldown = 0;
  private ring: THREE.Mesh;
  private bar: HealthBar;
  private bob = Math.random() * Math.PI * 2;

  constructor(public kind: UnitKind, public faction: Faction, pos: THREE.Vector3) {
    const def = UNIT[kind];
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.speed = def.speed;
    this.radius = def.radius;
    this.mesh = kind === 'villager' ? buildVillager(faction) : kind === 'archer' ? buildArcher(faction) : buildSoldier(faction);
    this.mesh.position.copy(pos);
    this.mesh.userData.entity = this;
    this.ring = makeRing(this.radius + 0.3, faction === 'player' ? COLORS.selection : COLORS.enemy);
    this.mesh.add(this.ring);
    this.bar = new HealthBar(1.3, 0.22, 2.2);
    this.mesh.add(this.bar.group);
  }

  get pos() { return this.mesh.position; }

  setSelected(v: boolean) {
    this.selected = v;
    this.ring.visible = v;
  }

  damage(amount: number) {
    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  // --- command helpers (set intent; the systems below execute) ----------
  orderMove(p: THREE.Vector3) {
    this.clearTasks();
    this.moveTarget = p.clone();
    this.state = 'move';
  }
  orderGather(node: ResourceNode) {
    this.clearTasks();
    this.gatherNode = node;
    this.carryType = node.type;
    this.state = 'gather';
  }
  orderBuild(b: Building) {
    this.clearTasks();
    this.buildTarget = b;
    this.state = 'build';
  }
  orderAttack(target: Unit | Building) {
    this.clearTasks();
    this.combatTarget = target;
    this.state = 'attack';
  }
  orderAttackMove(p: THREE.Vector3) {
    this.clearTasks();
    this.moveTarget = p.clone();
    this.state = 'attackMove';
  }
  private clearTasks() {
    this.moveTarget = null;
    this.gatherNode = null;
    this.buildTarget = null;
    this.combatTarget = null;
  }

  private moveToward(target: THREE.Vector3, dt: number, stopAt: number): boolean {
    tmp.copy(target).sub(this.pos); tmp.y = 0;
    const d = tmp.length();
    if (d <= stopAt) return true;
    tmp.normalize();
    const step = Math.min(this.speed * dt, d - stopAt);
    this.pos.addScaledVector(tmp, step);
    // face movement direction
    this.mesh.rotation.y = Math.atan2(tmp.x, tmp.z);
    // little walking bob
    this.bob += dt * 12;
    this.mesh.position.y = Math.abs(Math.sin(this.bob)) * 0.08;
    return false;
  }

  update(dt: number, game: Game, camQuat: THREE.Quaternion) {
    this.cooldown -= dt;
    const def = UNIT[this.kind];

    switch (this.state) {
      case 'idle': {
        this.mesh.position.y = 0;
        // soldiers auto-acquire nearby enemies
        if (this.kind !== 'villager') {
          const t = game.findNearestEnemy(this.pos, this.faction, def.attackRange + 6);
          if (t) { this.combatTarget = t; this.state = 'attack'; }
        }
        break;
      }
      case 'move': {
        if (!this.moveTarget || this.moveToward(this.moveTarget, dt, 0.2)) {
          this.moveTarget = null; this.state = 'idle';
        }
        break;
      }
      case 'attackMove': {
        const t = game.findNearestEnemy(this.pos, this.faction, def.attackRange + 8);
        if (t) { this.combatTarget = t; this.state = 'attack'; break; }
        if (!this.moveTarget || this.moveToward(this.moveTarget, dt, 0.2)) {
          this.moveTarget = null; this.state = 'idle';
        }
        break;
      }
      case 'gather': {
        const node = this.gatherNode;
        if (!node || node.dead) { this.gatherNode = null; this.tryFindSameResource(game); break; }
        if (this.moveToward(node.pos, dt, node.radius + this.radius)) {
          // mine it
          const cap = UNIT.villager.carryCapacity;
          const got = node.take(UNIT.villager.gatherRate * dt);
          this.carry += got;
          this.carryType = node.type;
          this.mesh.lookAt(node.pos.x, 0, node.pos.z);
          if (this.carry >= cap || node.dead) this.state = 'return';
        }
        break;
      }
      case 'return': {
        const drop = game.findDropOff(this.faction, this.pos);
        if (!drop) { this.state = 'idle'; break; }
        if (this.moveToward(drop.pos, dt, drop.radius + this.radius)) {
          if (this.carry > 0 && this.carryType) game.addResource(this.faction, this.carryType, Math.round(this.carry));
          this.carry = 0;
          // go back to gathering if node still alive
          if (this.gatherNode && !this.gatherNode.dead) this.state = 'gather';
          else this.tryFindSameResource(game);
        }
        break;
      }
      case 'build': {
        const b = this.buildTarget;
        if (!b || b.dead || b.complete) {
          this.buildTarget = null; this.state = 'idle'; break;
        }
        if (this.moveToward(b.pos, dt, b.radius + this.radius + 0.3)) {
          this.mesh.lookAt(b.pos.x, 0, b.pos.z);
          if (b.addBuild(UNIT.villager.buildRate * dt)) { this.buildTarget = null; this.state = 'idle'; }
        }
        break;
      }
      case 'attack': {
        const t = this.combatTarget;
        if (!t || (t as Unit | Building).dead) {
          this.combatTarget = null;
          this.state = this.kind === 'villager' ? 'idle' : 'idle';
          break;
        }
        const targetPos = (t as Unit).pos ?? (t as Building).pos;
        const reach = def.attackRange + ((t as Building).radius ?? (t as Unit).radius ?? 0.6) + this.radius;
        if (this.moveToward(targetPos, dt, reach)) {
          this.mesh.lookAt(targetPos.x, 0, targetPos.z);
          if (this.cooldown <= 0) {
            this.cooldown = def.attackCooldown;
            if (this.kind === 'archer') game.spawnProjectile(this.pos, targetPos, def.attack, this.faction, t);
            else { (t as Unit | Building).damage(def.attack); game.flashHit(targetPos); }
          }
        }
        break;
      }
    }

    // health bar visibility
    const ratio = this.hp / this.maxHp;
    this.bar.group.visible = this.selected || ratio < 0.999;
    if (this.bar.group.visible) { this.bar.set(ratio, this.faction === 'player'); this.bar.faceCamera(camQuat); }
  }

  private tryFindSameResource(game: Game) {
    if (!this.carryType) { this.state = 'idle'; return; }
    const next = game.findNearestResource(this.pos, this.carryType);
    if (next) { this.gatherNode = next; this.state = 'gather'; }
    else this.state = 'idle';
  }
}
