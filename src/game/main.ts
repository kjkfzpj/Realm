// Entry point: boots the engine, builds the world, wires input + HUD and runs
// the fixed-ish timestep loop. This is the only module that touches the DOM
// boot sequence; everything else is driven from here.
import { Engine } from './engine';
import { RTSCamera } from './camera';
import { Game } from './game';
import { Input } from './input';
import { HUD } from './hud';
import { Minimap } from './minimap';

function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const engine = new Engine(canvas);
  const game = new Game(engine);
  const rtsCam = new RTSCamera(engine.camera, canvas);
  const input = new Input(game, engine, rtsCam, canvas);
  const minimap = new Minimap(game, rtsCam);
  const hud = new HUD(game, input, minimap);

  // Frame the player's starting town center.
  rtsCam.focusOn(game.playerBase);

  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    rtsCam.update(dt);
    game.update(dt);
    hud.update();
    engine.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Expose for debugging in the console.
  (window as any).__rts = { game, engine, rtsCam };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
