/**
 * Pixi application bootstrap. Owns the WebGL/canvas context, the camera, and
 * the tile layer. Frame callback runs: sim.advance -> camera updates -> render.
 */

import { Application } from 'pixi.js';
import { World } from '../sim/world.js';
import { TickDriver } from '../sim/tick.js';
import { Camera } from './camera.js';
import { TileLayer } from './tileLayer.js';

export interface RenderApp {
  pixi: Application;
  camera: Camera;
  tileLayer: TileLayer;
  tick: TickDriver;
  world: World;
  setHover(tile: { x: number; y: number } | null): void;
  destroy(): void;
}

export async function createRenderApp(
  container: HTMLElement,
  world: World,
  tick: TickDriver,
): Promise<RenderApp> {
  const pixi = new Application();
  await pixi.init({
    background: '#0d120e',
    resizeTo: container,
    antialias: false,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  container.appendChild(pixi.canvas);

  const camera = new Camera({
    cx: world.size.width / 2,
    cy: world.size.height / 2,
    tileSize: 28,
    viewW: pixi.renderer.width,
    viewH: pixi.renderer.height,
  });
  const tileLayer = new TileLayer(world, camera);
  pixi.stage.addChild(tileLayer.root);

  const onResize = () => {
    camera.resize(pixi.renderer.width, pixi.renderer.height);
  };
  window.addEventListener('resize', onResize);

  let last = performance.now();
  pixi.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(100, now - last);
    last = now;
    tick.advance(dt);
    tileLayer.render();
  });

  return {
    pixi,
    camera,
    tileLayer,
    tick,
    world,
    setHover(tile) {
      tileLayer.hoverTile = tile;
    },
    destroy() {
      window.removeEventListener('resize', onResize);
      pixi.destroy(true, { children: true });
    },
  };
}
