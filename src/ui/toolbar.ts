/**
 * Minimal DOM-based HUD + build toolbar. Rendering the UI with plain HTML/CSS
 * keeps text, buttons, and layout accessible and avoids reinventing widgets
 * inside Pixi. The canvas and the UI share the same root element.
 */

import { RenderApp } from '../render/app.js';
import { InputState, Tool } from './input.js';
import { TIER_NAMES } from '../sim/types.js';

export function mountHud(root: HTMLElement, app: RenderApp, input: InputState): () => void {
  root.classList.add('cb-root');

  const hud = document.createElement('div');
  hud.className = 'cb-hud';
  hud.innerHTML = `
    <header class="cb-topbar">
      <div class="cb-title">City Builder — <span data-cb="tier">Outpost</span></div>
      <div class="cb-stats">
        <span>Population <b data-cb="pop">0</b></span>
        <span>Jobs <b data-cb="jobs">0</b></span>
        <span>Treasury <b data-cb="treasury">0</b></span>
        <span>Income <b data-cb="income">0</b></span>
        <span>Upkeep <b data-cb="upkeep">0</b></span>
        <span>Date <b data-cb="date">Y0 M1 D1</b></span>
      </div>
      <div class="cb-speed">
        <button data-speed="0" title="Pause (Space)">❚❚</button>
        <button data-speed="1" class="on">1×</button>
        <button data-speed="2">2×</button>
        <button data-speed="4">4×</button>
      </div>
    </header>
    <aside class="cb-toolbar">
      <button data-tool="road"  title="Road (1)"><span>🛣</span>Road</button>
      <button data-tool="zone-r" title="Dwellings (2)"><span>🏠</span>Dwellings</button>
      <button data-tool="zone-c" title="Trade (3)"><span>🏬</span>Trade</button>
      <button data-tool="zone-i" title="Works (4)"><span>🏭</span>Works</button>
      <button data-tool="bulldoze" title="Bulldoze (X)"><span>🧹</span>Bulldoze</button>
      <button data-tool="none" title="Deselect (Esc)"><span>✕</span>None</button>
    </aside>
    <footer class="cb-log" data-cb="log"></footer>
  `;
  root.appendChild(hud);

  const byTool = new Map<Tool, HTMLButtonElement>();
  hud.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((btn) => {
    const t = btn.dataset.tool as Tool;
    byTool.set(t, btn);
    btn.addEventListener('click', () => {
      input.tool = t;
      refreshTool();
    });
  });
  const refreshTool = (): void => {
    for (const [t, btn] of byTool) btn.classList.toggle('on', t === input.tool);
  };
  refreshTool();
  window.addEventListener('cb:tool', refreshTool);

  const speedButtons = hud.querySelectorAll<HTMLButtonElement>('[data-speed]');
  speedButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = Number(btn.dataset.speed);
      app.tick.setSpeed(v);
      app.tick.setPaused(v === 0);
      speedButtons.forEach((b) => b.classList.toggle('on', b === btn));
    });
  });

  const qs = (sel: string): HTMLElement => hud.querySelector(sel) as HTMLElement;
  const elPop = qs('[data-cb="pop"]');
  const elJobs = qs('[data-cb="jobs"]');
  const elTreasury = qs('[data-cb="treasury"]');
  const elIncome = qs('[data-cb="income"]');
  const elUpkeep = qs('[data-cb="upkeep"]');
  const elDate = qs('[data-cb="date"]');
  const elTier = qs('[data-cb="tier"]');
  const elLog = qs('[data-cb="log"]');

  let lastRefresh = 0;
  const refresh = (now: number): void => {
    if (now - lastRefresh < 250) return;
    lastRefresh = now;
    const census = app.world.buildings.census();
    elPop.textContent = String(census.population);
    elJobs.textContent = String(census.jobs);
    elTreasury.textContent = String(app.world.economyState.treasury);
    elIncome.textContent = String(app.world.economyState.monthlyIncome);
    elUpkeep.textContent = String(app.world.economyState.monthlyUpkeep);
    const c = app.world.clock;
    elDate.textContent = `Y${c.year} M${c.month + 1} D${c.day + 1}`;
    elTier.textContent = TIER_NAMES[app.world.milestones.tier];
  };
  app.pixi.ticker.add((t) => refresh(performance.now() + t.deltaMS));

  const off = app.world.bus.on('logMessage', (ev) => {
    const p = document.createElement('p');
    p.className = `cb-log-${ev.level}`;
    p.textContent = ev.text;
    elLog.appendChild(p);
    while (elLog.childElementCount > 40) elLog.removeChild(elLog.firstChild!);
    elLog.scrollTop = elLog.scrollHeight;
  });

  return () => {
    off();
    window.removeEventListener('cb:tool', refreshTool);
    hud.remove();
  };
}
