// Captures gameplay screenshots for visual verification.
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const server = await createServer({ server: { port: 5181, strictPort: true } });
await server.listen();

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1600,900'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 900 });
await page.bringToFront();
await page.goto('http://localhost:5181/', { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1500));

// select villagers and send some to gather so the scene shows activity
await page.evaluate(() => {
  const g = window.__rts.game;
  const vils = g.units.filter((u) => u.faction === 'player' && u.kind === 'villager');
  g.selectUnits(vils);
  const tree = g.resources.filter((r) => r.type === 'wood').sort((a, b) => a.pos.distanceToSquared(g.playerBase) - b.pos.distanceToSquared(g.playerBase))[0];
  if (tree) g.command(tree.pos.clone(), tree, false);
});
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: 'docs/screenshot-overview.png' });

// zoom-in framing on the town center
await page.evaluate(() => {
  const c = window.__rts.rtsCam;
  c.focusOn(window.__rts.game.playerBase);
});
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: 'docs/screenshot-base.png' });

await browser.close();
await server.close();
console.log('screenshots written');
