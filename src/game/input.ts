// Pointer + keyboard command layer: single/box selection, right-click
// contextual orders, and building-placement ghost. Translates raw DOM events
// into Game commands.
import * as THREE from 'three';
import { Engine } from './engine';
import { Game } from './game';
import { Unit, Building, ResourceNode } from './entities';
import { RTSCamera } from './camera';
import { BUILDINGS, type BuildingKind } from './config';
import { buildingMesh } from './factory';

const ndc = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function rootEntity(obj: THREE.Object3D): Unit | Building | ResourceNode | null {
  let o: THREE.Object3D | null = obj;
  while (o) {
    if (o.userData && o.userData.entity) return o.userData.entity;
    o = o.parent;
  }
  return null;
}

export class Input {
  placingKind: BuildingKind | null = null;
  private ghost: THREE.Group | null = null;
  private dragStart: { x: number; y: number } | null = null;
  private dragging = false;
  private boxEl: HTMLDivElement;
  private shift = false;

  constructor(private game: Game, private engine: Engine, _cam: RTSCamera, dom: HTMLCanvasElement) {
    this.boxEl = document.createElement('div');
    this.boxEl.style.cssText =
      'position:fixed;border:1.5px solid #8fff6a;background:rgba(143,255,106,0.12);pointer-events:none;display:none;z-index:50;';
    document.body.appendChild(this.boxEl);

    // Right-click commands run from the contextmenu event so they fire on both
    // a desktop right-click and an iPad/Magic-Keyboard trackpad secondary click.
    dom.addEventListener('contextmenu', (e) => this.onContextMenu(e));
    dom.addEventListener('mousedown', (e) => this.onDown(e));
    dom.addEventListener('mousemove', (e) => this.onMove(e));
    window.addEventListener('mouseup', (e) => this.onUp(e));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') this.shift = true;
      if (e.key === 'Escape') this.cancelPlacement();
    });
    window.addEventListener('keyup', (e) => { if (e.key === 'Shift') this.shift = false; });
  }

  startPlacing(kind: BuildingKind) {
    if (!this.game.selected.some((u) => u.kind === 'villager')) {
      this.game.onMessage('Select a villager to build', 'warn');
      return;
    }
    if (!this.game.canAfford(BUILDINGS[kind].cost)) {
      this.game.onMessage('Not enough resources', 'warn');
      return;
    }
    this.cancelPlacement();
    this.placingKind = kind;
    this.ghost = buildingMesh(kind, 'player');
    this.ghost.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && 'transparent' in m) { m.transparent = true; m.opacity = 0.5; }
    });
    this.engine.scene.add(this.ghost);
  }

  cancelPlacement() {
    if (this.ghost) { this.engine.scene.remove(this.ghost); this.ghost = null; }
    this.placingKind = null;
  }

  private setNDC(e: MouseEvent) {
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  private groundPoint(e: MouseEvent): THREE.Vector3 | null {
    this.setNDC(e);
    raycaster.setFromCamera(ndc, this.engine.camera);
    const hit = new THREE.Vector3();
    return raycaster.ray.intersectPlane(groundPlane, hit) ? hit : null;
  }

  private pick(e: MouseEvent): { entity: Unit | Building | ResourceNode | null; point: THREE.Vector3 | null } {
    this.setNDC(e);
    raycaster.setFromCamera(ndc, this.engine.camera);
    const pickables: THREE.Object3D[] = [];
    for (const u of this.game.units) pickables.push(u.mesh);
    for (const b of this.game.buildings) pickables.push(b.mesh);
    for (const r of this.game.resources) pickables.push(r.mesh);
    const hits = raycaster.intersectObjects(pickables, true);
    const point = this.groundPoint(e);
    if (hits.length) {
      const ent = rootEntity(hits[0].object);
      if (ent) return { entity: ent, point: point ?? hits[0].point };
    }
    return { entity: null, point };
  }

  private onDown(e: MouseEvent) {
    if (e.button === 0) {
      if (this.placingKind) {
        this.confirmPlacement(e);
        return;
      }
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.dragging = false;
    }
  }

  private onContextMenu(e: MouseEvent) {
    e.preventDefault();
    if (this.placingKind) { this.cancelPlacement(); return; }
    const { entity, point } = this.pick(e);
    if (point) this.game.command(point, entity, e.shiftKey || this.shift);
  }

  private onMove(e: MouseEvent) {
    if (this.placingKind && this.ghost) {
      const p = this.groundPoint(e);
      if (p) {
        p.x = Math.round(p.x); p.z = Math.round(p.z);
        this.ghost.position.copy(p);
        const ok = this.game.canPlaceAt(this.placingKind, p) && this.game.canAfford(BUILDINGS[this.placingKind].cost);
        this.ghost.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (m && (m as any).emissive) (m as any).emissive.setHex(ok ? 0x0a3a0a : 0x3a0a0a);
        });
      }
      return;
    }
    if (this.dragStart) {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      if (!this.dragging && Math.hypot(dx, dy) > 6) this.dragging = true;
      if (this.dragging) {
        const x = Math.min(e.clientX, this.dragStart.x);
        const y = Math.min(e.clientY, this.dragStart.y);
        this.boxEl.style.display = 'block';
        this.boxEl.style.left = `${x}px`;
        this.boxEl.style.top = `${y}px`;
        this.boxEl.style.width = `${Math.abs(dx)}px`;
        this.boxEl.style.height = `${Math.abs(dy)}px`;
      }
    }
  }

  private onUp(e: MouseEvent) {
    if (e.button !== 0 || !this.dragStart) return;
    this.boxEl.style.display = 'none';
    if (this.dragging) {
      this.boxSelect(this.dragStart, { x: e.clientX, y: e.clientY });
    } else {
      const { entity } = this.pick(e);
      if (entity instanceof Unit) {
        if (entity.faction === 'player') {
          // select all same-kind on screen? Just select the one (or all of kind on double... keep simple)
          this.game.selectUnits([entity]);
        } else this.game.clearSelection();
      } else if (entity instanceof Building) {
        this.game.selectBuilding(entity);
      } else {
        this.game.clearSelection();
      }
    }
    this.dragStart = null;
    this.dragging = false;
  }

  private boxSelect(a: { x: number; y: number }, b: { x: number; y: number }) {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    const cam = this.engine.camera;
    const v = new THREE.Vector3();
    const picked: Unit[] = [];
    for (const u of this.game.units) {
      if (u.faction !== 'player' || u.dead) continue;
      v.copy(u.pos); v.y = 1; v.project(cam);
      const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
      if (v.z < 1 && sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) picked.push(u);
    }
    // prefer military if mixed? Keep all.
    if (picked.length) this.game.selectUnits(picked);
    else this.game.clearSelection();
  }

  private confirmPlacement(e: MouseEvent) {
    if (!this.placingKind) return;
    const p = this.groundPoint(e);
    if (!p) return;
    p.x = Math.round(p.x); p.z = Math.round(p.z); p.y = 0;
    const builders = this.game.selected.filter((u) => u.kind === 'villager');
    const ok = this.game.placeBuilding(this.placingKind, p, builders);
    if (ok && !this.shift) this.cancelPlacement();
    else if (ok) {
      // keep placing if shift held and still affordable
      if (!this.game.canAfford(BUILDINGS[this.placingKind].cost)) this.cancelPlacement();
    }
  }
}
