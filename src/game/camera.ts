// RTS camera rig: an orbit-style controller focused on a ground point. Pans
// with WASD / arrow keys / screen-edge scrolling, zooms with the wheel and
// rotates with Q/E. Classic Age-of-Empires feel.
import * as THREE from 'three';
import { WORLD } from './config';

export class RTSCamera {
  readonly camera: THREE.PerspectiveCamera;
  target = new THREE.Vector3(0, 0, 0);
  private distance = 55;
  private yaw = Math.PI * 0.25;
  private pitch = 0.95; // radians from horizontal-ish; clamped
  private minDist = 14;
  private maxDist = 110;
  private keys = new Set<string>();
  private edgePan = { x: 0, y: 0 };
  private rotating = false;
  private lastMouse = new THREE.Vector2();

  constructor(camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.camera = camera;
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance = THREE.MathUtils.clamp(this.distance + Math.sign(e.deltaY) * (3 + this.distance * 0.05), this.minDist, this.maxDist);
    }, { passive: false });
    dom.addEventListener('mousemove', (e) => {
      // edge scrolling
      const m = 24;
      this.edgePan.x = e.clientX < m ? -1 : e.clientX > window.innerWidth - m ? 1 : 0;
      this.edgePan.y = e.clientY < m ? -1 : e.clientY > window.innerHeight - m ? 1 : 0;
      if (this.rotating) {
        const dx = e.clientX - this.lastMouse.x;
        this.yaw -= dx * 0.005;
        this.lastMouse.set(e.clientX, e.clientY);
      }
    });
    dom.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        this.rotating = true;
        this.lastMouse.set(e.clientX, e.clientY);
        e.preventDefault();
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 1) this.rotating = false;
    });
    this.update(0);
  }

  // Move focus toward a world point (e.g. from minimap click).
  focusOn(p: THREE.Vector3) {
    this.target.set(p.x, 0, p.z);
  }

  update(dt: number) {
    const panSpeed = (12 + this.distance * 0.6);
    let mx = 0;
    let mz = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) mz -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) mz += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) mx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) mx += 1;
    mx += this.edgePan.x;
    mz += this.edgePan.y;
    if (this.keys.has('q')) this.yaw += dt * 1.2;
    if (this.keys.has('e')) this.yaw -= dt * 1.2;

    if (mx !== 0 || mz !== 0) {
      // pan relative to camera yaw, on the ground plane
      const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const right = new THREE.Vector3(forward.z, 0, -forward.x);
      const move = new THREE.Vector3()
        .addScaledVector(forward, -mz)
        .addScaledVector(right, mx);
      if (move.lengthSq() > 0) move.normalize().multiplyScalar(panSpeed * dt);
      this.target.add(move);
    }
    const lim = WORLD.size * 0.5;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -lim, lim);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -lim, lim);

    // position camera on a sphere around the target
    const horiz = Math.cos(this.pitch) * this.distance;
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * horiz,
      Math.sin(this.pitch) * this.distance,
      Math.cos(this.yaw) * horiz,
    );
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }
}
