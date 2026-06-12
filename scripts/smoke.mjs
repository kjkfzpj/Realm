// Headless smoke test: serves the production build, loads it in headless
// Chromium with WebGL via SwiftShader, and asserts the game boots, ticks,
// and that commands mutate state without throwing.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const server = await createServer({ server: { port: 5180, strictPort: true } });
await server.listen();
const url = 'http://localhost:5180/';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows'],
});
const page = await browser.newPage();
await page.bringToFront();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('requestfailed', (r) => {
  const u = r.url();
  if (!u.endsWith('favicon.ico')) errors.push('REQ FAIL: ' + u);
});

let ok = true;
try {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2500)); // let a few hundred frames run

  // Verify the contextmenu (right-click / iPad two-finger click) command path
  // actually reaches game.command by dispatching a real DOM contextmenu event.
  const ctxWorked = await page.evaluate(() => {
    const g = window.__rts.game;
    const vils = g.units.filter((u) => u.faction === 'player' && u.kind === 'villager');
    g.selectUnits(vils);
    let called = false;
    const orig = g.command.bind(g);
    g.command = (...a) => { called = true; return orig(...a); };
    const canvas = document.getElementById('game');
    canvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 800, clientY: 450 }));
    g.command = orig;
    return called;
  });
  if (!ctxWorked) { console.error('FAIL: contextmenu command path did not fire'); ok = false; }

  const report = await page.evaluate(() => {
    const g = window.__rts?.game;
    if (!g) return { boot: false };
    // exercise the command + economy paths
    const before = { ...g.resourcesPool };
    const villagers = g.units.filter((u) => u.faction === 'player' && u.kind === 'villager');
    // nearest tree to the player base so the round-trip completes quickly
    let tree = null, bd = Infinity;
    for (const r of g.resources) {
      if (r.type !== 'wood') continue;
      const d = r.pos.distanceToSquared(g.playerBase);
      if (d < bd) { bd = d; tree = r; }
    }
    g.selectUnits(villagers);
    if (tree) g.command(tree.pos.clone(), tree, false);
    g.queueTraining(g.buildings.find((b) => b.kind === 'towncenter' && b.faction === 'player'), 'villager');
    return {
      boot: true,
      units: g.units.length,
      buildings: g.buildings.length,
      resources: g.resources.length,
      playerVillagers: villagers.length,
      hasTree: !!tree,
      selected: g.selected.length,
      popCap: g.popCap,
      rendererTriangles: window.__rts.engine.renderer.info.render.triangles,
      before,
    };
  });

  // let it run more to confirm gathering/training advance and no late errors.
  // Headless SwiftShader runs slowly and dt is clamped, so simulated time lags
  // wall-clock — wait generously to accumulate >8s of sim time for training.
  await new Promise((r) => setTimeout(r, 20000));
  const after = await page.evaluate(() => ({
    food: window.__rts.game.resourcesPool.food,
    wood: window.__rts.game.resourcesPool.wood,
    units: window.__rts.game.units.length,
    status: window.__rts.game.status,
    frame: window.__rts.engine.renderer.info.render.frame,
  }));

  console.log('REPORT', JSON.stringify(report, null, 2));
  console.log('AFTER ', JSON.stringify(after, null, 2));

  if (!report.boot) { console.error('FAIL: game did not boot'); ok = false; }
  if (report.units < 5) { console.error('FAIL: too few units'); ok = false; }
  if (report.rendererTriangles < 100) { console.error('FAIL: nothing rendered'); ok = false; }
  if (report.selected !== report.playerVillagers) { console.error('FAIL: selection mismatch'); ok = false; }
  if (after.wood <= report.before.wood) { console.error('FAIL: villagers did not deposit wood'); ok = false; }
  if (after.units <= report.units) { console.error('FAIL: training did not produce a unit'); ok = false; }
} catch (e) {
  console.error('EXCEPTION', e);
  ok = false;
}

if (errors.length) { console.error('CONSOLE ERRORS:\n' + errors.join('\n')); ok = false; }

await browser.close();
await server.close();
console.log(ok ? 'SMOKE OK' : 'SMOKE FAILED');
process.exit(ok ? 0 : 1);
