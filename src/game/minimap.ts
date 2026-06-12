// Lightweight 2D minimap drawn to a canvas. Shows terrain extent, resources,
// units and buildings by faction, and the camera focus. Click to jump the
// camera; right-click to issue a move order there.
import * as THREE from 'three';
import { WORLD } from './config';
import { Game } from './game';
import { RTSCamera } from './camera';

export class Minimap {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size = 190;

  constructor(private game: Game, private cam: RTSCamera) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = this.size;
    this.canvas.style.cssText = 'width:190px;height:190px;display:block;border-radius:6px;cursor:pointer;';
    this.ctx = this.canvas.getContext('2d')!;
    const handle = (e: MouseEvent, right: boolean) => {
      const rect = this.canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const wx = (nx - 0.5) * WORLD.size;
      const wz = (ny - 0.5) * WORLD.size;
      const world = new THREE.Vector3(wx, 0, wz);
      if (right) this.game.command(world, null, false);
      else this.cam.focusOn(world);
    };
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('mousedown', (e) => handle(e, e.button === 2));
  }

  private toPx(x: number, z: number): [number, number] {
    return [(x / WORLD.size + 0.5) * this.size, (z / WORLD.size + 0.5) * this.size];
  }

  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = '#3c6630';
    ctx.fillRect(0, 0, this.size, this.size);
    // resources
    for (const r of this.game.resources) {
      const [x, y] = this.toPx(r.pos.x, r.pos.z);
      ctx.fillStyle = r.type === 'wood' ? '#2f6d34' : r.type === 'gold' ? '#f2c14e' : '#c0455a';
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    // buildings
    for (const b of this.game.buildings) {
      const [x, y] = this.toPx(b.pos.x, b.pos.z);
      ctx.fillStyle = b.faction === 'player' ? '#7fb2ff' : '#ff8a8a';
      const s = b.kind === 'towncenter' ? 5 : 3;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
    // units
    for (const u of this.game.units) {
      const [x, y] = this.toPx(u.pos.x, u.pos.z);
      ctx.fillStyle = u.faction === 'player' ? (u.kind === 'villager' ? '#cfe6ff' : '#3d7bd6') : '#c23b3b';
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    // camera focus marker
    const [cx, cy] = this.toPx(this.cam.target.x, this.cam.target.z);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 16, cy - 11, 32, 22);
  }
}
