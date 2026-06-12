// The Game orchestrator: owns all entities, the player's resource economy,
// the command layer, combat resolution, a lightweight enemy AI and the
// win/lose check. The render/UI layers read from here; nothing reaches back.
import * as THREE from 'three';
import { Engine } from './engine';
import { Unit, Building, ResourceNode } from './entities';
import {
  BUILDINGS, TRAIN, STARTING_RESOURCES, MAX_POP, COLORS,
  type Faction, type ResourceType, type ResourcePool, type UnitKind, type BuildingKind, type TrainKind,
} from './config';
import { generateWorld } from './world';

export type GameStatus = 'playing' | 'won' | 'lost';

interface Projectile {
  mesh: THREE.Mesh;
  target: Unit | Building;
  damage: number;
  speed: number;
}
interface Effect { obj: THREE.Object3D; life: number; max: number; }

export class Game {
  scene: THREE.Scene;
  engine: Engine;
  units: Unit[] = [];
  buildings: Building[] = [];
  resources: ResourceNode[] = [];
  private projectiles: Projectile[] = [];
  private effects: Effect[] = [];

  resourcesPool: ResourcePool = { ...STARTING_RESOURCES };
  status: GameStatus = 'playing';

  selected: Unit[] = [];
  selectedBuilding: Building | null = null;

  playerBase = new THREE.Vector3();
  enemyBase = new THREE.Vector3();

  // hooks set by main/HUD
  onMessage: (text: string, kind?: 'info' | 'warn') => void = () => {};
  onSelectionChanged: () => void = () => {};
  onGameOver: (won: boolean) => void = () => {};

  // enemy AI timers
  private enemyTrainTimer = 12;
  private enemyAttackTimer = 35;
  private enemyWave = 0;

  constructor(engine: Engine) {
    this.engine = engine;
    this.scene = engine.scene;
    const { playerBase, enemyBase } = generateWorld(this);
    this.playerBase.copy(playerBase);
    this.enemyBase.copy(enemyBase);
  }

  // -----------------------------------------------------------------
  // Spawning
  // -----------------------------------------------------------------
  spawnUnit(kind: UnitKind, faction: Faction, pos: THREE.Vector3): Unit {
    const u = new Unit(kind, faction, pos);
    this.units.push(u);
    this.scene.add(u.mesh);
    return u;
  }
  spawnBuilding(kind: BuildingKind, faction: Faction, pos: THREE.Vector3, prebuilt = false): Building {
    const b = new Building(kind, faction, pos, prebuilt);
    this.buildings.push(b);
    this.scene.add(b.mesh);
    return b;
  }
  spawnResource(kind: 'tree' | 'gold' | 'berry', pos: THREE.Vector3): ResourceNode {
    const r = new ResourceNode(kind, pos);
    this.resources.push(r);
    this.scene.add(r.mesh);
    return r;
  }

  // -----------------------------------------------------------------
  // Economy
  // -----------------------------------------------------------------
  addResource(faction: Faction, type: ResourceType, amount: number) {
    if (faction !== 'player') return; // enemy economy is abstracted
    this.resourcesPool[type] += amount;
  }
  canAfford(cost: Partial<ResourcePool>): boolean {
    return (['food', 'wood', 'gold'] as ResourceType[]).every((k) => (this.resourcesPool[k] ?? 0) >= (cost[k] ?? 0));
  }
  spend(cost: Partial<ResourcePool>) {
    for (const k of ['food', 'wood', 'gold'] as ResourceType[]) this.resourcesPool[k] -= cost[k] ?? 0;
  }
  get population(): number {
    return this.units.filter((u) => u.faction === 'player').length;
  }
  get popCap(): number {
    const cap = this.buildings
      .filter((b) => b.faction === 'player' && b.complete)
      .reduce((s, b) => s + BUILDINGS[b.kind].popProvided, 0);
    return Math.min(cap, MAX_POP);
  }

  // -----------------------------------------------------------------
  // Queries used by entity behaviour
  // -----------------------------------------------------------------
  findDropOff(faction: Faction, from: THREE.Vector3): Building | null {
    let best: Building | null = null;
    let bd = Infinity;
    for (const b of this.buildings) {
      if (b.faction !== faction || !b.complete || !BUILDINGS[b.kind].isDropOff) continue;
      const d = b.pos.distanceToSquared(from);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  findNearestResource(from: THREE.Vector3, type: ResourceType): ResourceNode | null {
    let best: ResourceNode | null = null;
    let bd = Infinity;
    for (const r of this.resources) {
      if (r.dead || r.type !== type) continue;
      const d = r.pos.distanceToSquared(from);
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }
  findNearestEnemy(from: THREE.Vector3, faction: Faction, range: number): Unit | Building | null {
    let best: Unit | Building | null = null;
    let bd = range * range;
    for (const u of this.units) {
      if (u.faction === faction || u.dead) continue;
      const d = u.pos.distanceToSquared(from);
      if (d < bd) { bd = d; best = u; }
    }
    for (const b of this.buildings) {
      if (b.faction === faction || b.dead) continue;
      const d = b.pos.distanceToSquared(from);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // -----------------------------------------------------------------
  // Combat effects
  // -----------------------------------------------------------------
  spawnProjectile(from: THREE.Vector3, _to: THREE.Vector3, damage: number, _faction: Faction, target: Unit | Building) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.8, 5),
      new THREE.MeshBasicMaterial({ color: 0x3a2a1a }),
    );
    mesh.position.copy(from); mesh.position.y = 1.2;
    this.scene.add(mesh);
    this.projectiles.push({ mesh, target, damage, speed: 38 });
  }
  flashHit(pos: THREE.Vector3) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.4, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos); ring.position.y = 0.6;
    this.scene.add(ring);
    this.effects.push({ obj: ring, life: 0.3, max: 0.3 });
  }
  private spawnPuff(pos: THREE.Vector3, color: number) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }),
    );
    puff.position.copy(pos); puff.position.y = 1;
    this.scene.add(puff);
    this.effects.push({ obj: puff, life: 0.5, max: 0.5 });
  }

  // -----------------------------------------------------------------
  // Training
  // -----------------------------------------------------------------
  trainTimeFor(kind: UnitKind): number {
    const entry = (TRAIN as Record<string, { time: number }>)[kind];
    return entry ? entry.time : 8;
  }
  queueTraining(building: Building, kind: TrainKind) {
    const def = TRAIN[kind];
    if (building.kind !== def.from) { this.onMessage(`Cannot train ${kind} here`, 'warn'); return; }
    if (!building.complete) { this.onMessage('Building not finished', 'warn'); return; }
    if (this.population + this.pendingPop() >= this.popCap) { this.onMessage('Need more houses (pop cap)', 'warn'); return; }
    if (!this.canAfford(def.cost)) { this.onMessage('Not enough resources', 'warn'); return; }
    this.spend(def.cost);
    if (building.queue.length === 0) building.trainTimer = def.time;
    building.queue.push({ kind: kind as UnitKind, remaining: def.time, total: def.time });
  }
  private pendingPop(): number {
    return this.buildings.filter((b) => b.faction === 'player').reduce((s, b) => s + b.queue.length, 0);
  }
  completeTraining(building: Building, kind: UnitKind) {
    const spawn = building.pos.clone();
    spawn.x += (Math.random() - 0.5) * 4;
    spawn.z += building.radius + 2;
    const u = this.spawnUnit(kind, building.faction, spawn);
    if (building.rallyPoint) u.orderMove(building.rallyPoint);
    if (building.faction === 'player') this.onMessage(`${kind} trained`);
  }

  // -----------------------------------------------------------------
  // Building placement (called by input after the player confirms a spot)
  // -----------------------------------------------------------------
  canPlaceAt(kind: BuildingKind, pos: THREE.Vector3): boolean {
    const def = BUILDINGS[kind];
    const r = def.footprint * 0.62;
    for (const b of this.buildings) {
      if (b.pos.distanceTo(pos) < r + b.radius + 1) return false;
    }
    for (const res of this.resources) {
      if (!res.dead && res.pos.distanceTo(pos) < r + res.radius) return false;
    }
    return true;
  }
  placeBuilding(kind: BuildingKind, pos: THREE.Vector3, builders: Unit[]): boolean {
    const def = BUILDINGS[kind];
    if (!this.canAfford(def.cost)) { this.onMessage('Not enough resources', 'warn'); return false; }
    if (!this.canPlaceAt(kind, pos)) { this.onMessage('Cannot build there', 'warn'); return false; }
    this.spend(def.cost);
    const b = this.spawnBuilding(kind, 'player', pos, false);
    for (const u of builders) if (u.kind === 'villager') u.orderBuild(b);
    this.onMessage(`${def.label} foundation laid`);
    return true;
  }

  // -----------------------------------------------------------------
  // Selection + commands (invoked from input layer)
  // -----------------------------------------------------------------
  clearSelection() {
    for (const u of this.selected) u.setSelected(false);
    this.selected = [];
    if (this.selectedBuilding) { this.selectedBuilding.setSelected(false); this.selectedBuilding = null; }
    this.onSelectionChanged();
  }
  selectUnits(units: Unit[]) {
    this.clearSelection();
    this.selected = units.filter((u) => u.faction === 'player' && !u.dead);
    for (const u of this.selected) u.setSelected(true);
    this.onSelectionChanged();
  }
  selectBuilding(b: Building) {
    this.clearSelection();
    if (b.faction === 'player') { this.selectedBuilding = b; b.setSelected(true); }
    this.onSelectionChanged();
  }

  // Right-click contextual command on a world point / entity.
  command(point: THREE.Vector3, entity: Unit | Building | ResourceNode | null, attackMove = false) {
    if (this.selectedBuilding && !this.selected.length) {
      // set rally point
      this.selectedBuilding.rallyPoint = point.clone();
      this.spawnPuff(point, COLORS.selection);
      return;
    }
    if (!this.selected.length) return;

    // Enemy target -> attack
    if (entity instanceof Unit && entity.faction !== 'player') {
      for (const u of this.selected) u.orderAttack(entity);
      this.spawnPuff(entity.pos, COLORS.enemy);
      return;
    }
    if (entity instanceof Building && entity.faction !== 'player') {
      for (const u of this.selected) u.orderAttack(entity);
      this.spawnPuff(entity.pos, COLORS.enemy);
      return;
    }
    // Friendly incomplete building -> help build
    if (entity instanceof Building && entity.faction === 'player' && !entity.complete) {
      for (const u of this.selected) if (u.kind === 'villager') u.orderBuild(entity);
      this.spawnPuff(entity.pos, COLORS.selection);
      return;
    }
    // Resource node -> gather (villagers only)
    if (entity instanceof ResourceNode && !entity.dead) {
      let gathered = false;
      for (const u of this.selected) if (u.kind === 'villager') { u.orderGather(entity); gathered = true; }
      if (gathered) this.spawnPuff(entity.pos, COLORS.gold);
      else this.moveFormation(point, attackMove);
      return;
    }
    // Ground -> move/attack-move in formation
    this.moveFormation(point, attackMove);
    this.spawnPuff(point, COLORS.selection);
  }

  private moveFormation(point: THREE.Vector3, attackMove: boolean) {
    const n = this.selected.length;
    const cols = Math.ceil(Math.sqrt(n));
    const spacing = 2.2;
    this.selected.forEach((u, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const offset = new THREE.Vector3((col - (cols - 1) / 2) * spacing, 0, (row - (cols - 1) / 2) * spacing);
      const dest = point.clone().add(offset);
      if (attackMove) u.orderAttackMove(dest); else u.orderMove(dest);
    });
  }

  // -----------------------------------------------------------------
  // Main update
  // -----------------------------------------------------------------
  update(dt: number) {
    if (this.status !== 'playing') return;
    const camQuat = this.engine.camera.quaternion;

    for (const u of this.units) u.update(dt, this, camQuat);
    for (const b of this.buildings) b.update(dt, this, camQuat);
    this.updateProjectiles(dt);
    this.updateEffects(dt);
    this.simpleUnitSeparation();
    this.enemyAI(dt);
    this.cleanup();
    this.checkVictory();
  }

  private updateProjectiles(dt: number) {
    const tmp = new THREE.Vector3();
    for (const p of this.projectiles) {
      if (p.target.dead) { p.mesh.visible = false; continue; }
      const tp = (p.target as Unit).pos ?? (p.target as Building).pos;
      tmp.copy(tp); tmp.y = 1.2; tmp.sub(p.mesh.position);
      const d = tmp.length();
      if (d < 0.6) {
        (p.target as Unit | Building).damage(p.damage);
        this.flashHit(tp);
        p.mesh.visible = false;
        continue;
      }
      tmp.normalize();
      p.mesh.position.addScaledVector(tmp, Math.min(p.speed * dt, d));
      p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp);
    }
    this.projectiles = this.projectiles.filter((p) => {
      if (!p.mesh.visible) { this.scene.remove(p.mesh); return false; }
      return true;
    });
  }

  private updateEffects(dt: number) {
    this.effects = this.effects.filter((e) => {
      e.life -= dt;
      const t = e.life / e.max;
      const s = 1 + (1 - t) * 2;
      e.obj.scale.setScalar(s);
      const m = (e.obj as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (m && 'opacity' in m) m.opacity = Math.max(0, t);
      if (e.life <= 0) { this.scene.remove(e.obj); return false; }
      return true;
    });
  }

  // Cheap O(n^2) push so units don't fully overlap. n is small here.
  private simpleUnitSeparation() {
    const push = new THREE.Vector3();
    for (let i = 0; i < this.units.length; i++) {
      const a = this.units[i];
      if (a.dead) continue;
      for (let j = i + 1; j < this.units.length; j++) {
        const b = this.units[j];
        if (b.dead) continue;
        push.copy(a.pos).sub(b.pos); push.y = 0;
        const min = a.radius + b.radius;
        const d = push.length();
        if (d > 0.0001 && d < min) {
          push.multiplyScalar((min - d) / d * 0.5);
          a.pos.add(push);
          b.pos.sub(push);
        }
      }
    }
  }

  // -----------------------------------------------------------------
  // Enemy AI: trains soldiers and launches escalating waves at the player.
  // -----------------------------------------------------------------
  private enemyAI(dt: number) {
    const enemyTC = this.buildings.find((b) => b.faction === 'enemy' && b.kind === 'towncenter' && !b.dead);
    if (!enemyTC) return;

    this.enemyTrainTimer -= dt;
    const enemyMilitary = this.units.filter((u) => u.faction === 'enemy' && u.kind !== 'villager' && !u.dead);
    if (this.enemyTrainTimer <= 0 && enemyMilitary.length < 18) {
      this.enemyTrainTimer = 9;
      const kind: UnitKind = Math.random() < 0.35 ? 'archer' : 'soldier';
      const a = Math.random() * Math.PI * 2;
      this.spawnUnit(kind, 'enemy', new THREE.Vector3(enemyTC.pos.x + Math.cos(a) * 7, 0, enemyTC.pos.z + Math.sin(a) * 7));
    }

    this.enemyAttackTimer -= dt;
    if (this.enemyAttackTimer <= 0) {
      this.enemyWave++;
      this.enemyAttackTimer = Math.max(22, 45 - this.enemyWave * 2);
      const targetB = this.buildings.find((b) => b.faction === 'player' && b.kind === 'towncenter' && !b.dead)
        ?? this.buildings.find((b) => b.faction === 'player' && !b.dead);
      const target = targetB ? targetB.pos.clone() : this.playerBase.clone();
      const force = enemyMilitary.slice(0, 4 + this.enemyWave);
      for (const u of force) u.orderAttackMove(target);
      if (force.length >= 3) this.onMessage(`Enemy raid incoming! (wave ${this.enemyWave})`, 'warn');
    }
  }

  private cleanup() {
    for (const u of this.units) if (u.dead && u.mesh.parent) {
      this.spawnPuff(u.pos, u.faction === 'player' ? COLORS.player : COLORS.enemy);
      this.scene.remove(u.mesh);
      if (this.selected.includes(u)) this.selected = this.selected.filter((s) => s !== u);
    }
    this.units = this.units.filter((u) => !u.dead);
    for (const b of this.buildings) if (b.dead && b.mesh.parent) {
      this.spawnPuff(b.pos, 0x555555);
      this.scene.remove(b.mesh);
      if (this.selectedBuilding === b) this.selectedBuilding = null;
    }
    this.buildings = this.buildings.filter((b) => !b.dead);
    for (const r of this.resources) if (r.dead && r.mesh.parent) this.scene.remove(r.mesh);
    this.resources = this.resources.filter((r) => !r.dead);
  }

  private checkVictory() {
    const playerTC = this.buildings.some((b) => b.faction === 'player' && b.kind === 'towncenter');
    const enemyTC = this.buildings.some((b) => b.faction === 'enemy' && b.kind === 'towncenter');
    if (!playerTC) { this.status = 'lost'; this.onGameOver(false); }
    else if (!enemyTC) { this.status = 'won'; this.onGameOver(true); }
  }
}
