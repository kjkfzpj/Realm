// Renderer, scene, lighting and ground. The "playable lighting" rig: a warm
// directional sun casting soft shadows, a sky/ground hemisphere fill, and
// distance fog so the world reads with depth without an art pipeline.
import * as THREE from 'three';
import { WORLD } from './config';

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly ground: THREE.Mesh;
  readonly sun: THREE.DirectionalLight;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    const sky = new THREE.Color(0x9ec7e8);
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(sky.getHex(), WORLD.size * 0.55, WORLD.size * 1.15);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 1000);
    this.camera.position.set(0, 45, 45);
    this.camera.lookAt(0, 0, 0);

    // --- Lighting rig --------------------------------------------------
    const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a5a3a, 0.85);
    this.scene.add(hemi);

    const ambient = new THREE.AmbientLight(0xffffff, 0.18);
    this.scene.add(ambient);

    this.sun = new THREE.DirectionalLight(0xfff2d6, 2.1);
    this.sun.position.set(60, 90, 40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = WORLD.size * 0.62;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 320;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // --- Ground --------------------------------------------------------
    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.size, WORLD.size, 1, 1),
      new THREE.MeshStandardMaterial({ map: makeGrassTexture(), roughness: 1, metalness: 0 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.scene.add(this.ground);

    // subtle grid lines so the player can judge distance / placement
    const grid = new THREE.GridHelper(WORLD.size, WORLD.size / 4, 0x000000, 0x000000);
    (grid.material as THREE.Material).opacity = 0.06;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = 0.02;
    this.scene.add(grid);

    // world edge water ring for framing
    const water = new THREE.Mesh(
      new THREE.RingGeometry(WORLD.size * 0.5, WORLD.size * 1.4, 48),
      new THREE.MeshStandardMaterial({ color: 0x2f6f9e, roughness: 0.3, metalness: 0.1 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.4;
    this.scene.add(water);

    this.resizeHandler = () => this.onResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this.resizeHandler);
    this.renderer.dispose();
  }
}

// Procedural grass texture: a base green with mottled patches and a faint
// hand-painted noise so the ground does not look like flat plastic.
function makeGrassTexture(): THREE.Texture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#4a7a3a';
  ctx.fillRect(0, 0, size, size);
  const patches = [
    'rgba(86,128,62,0.5)',
    'rgba(64,104,50,0.5)',
    'rgba(110,140,74,0.4)',
    'rgba(58,92,46,0.5)',
  ];
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = patches[i % patches.length];
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 2 + Math.random() * 9;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // faint dirt paths
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = 'rgba(120,98,60,0.18)';
    ctx.lineWidth = 6 + Math.random() * 10;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.bezierCurveTo(Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(WORLD.size / 12, WORLD.size / 12);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
