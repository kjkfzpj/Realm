// DOM HUD: resource readout, contextual command card, build/train buttons,
// event log, controls help and the win/lose overlay. Reads Game state every
// frame and rebuilds the command card whenever the selection changes.
import { Game } from './game';
import { Input } from './input';
import { Minimap } from './minimap';
import { BUILDINGS, TRAIN, type BuildingKind, type TrainKind } from './config';
import { Building } from './entities';

export class HUD {
  private resEl: HTMLElement;
  private cardEl: HTMLElement;
  private logEl: HTMLElement;
  private overlay: HTMLElement;

  constructor(private game: Game, private input: Input, private minimap: Minimap) {
    const root = document.createElement('div');
    root.className = 'hud';
    document.body.appendChild(root);

    // top resource bar
    this.resEl = el('div', 'hud-top');
    root.appendChild(this.resEl);

    // bottom-left minimap
    const mm = el('div', 'hud-minimap');
    mm.appendChild(minimap.canvas);
    root.appendChild(mm);

    // bottom-center command card
    this.cardEl = el('div', 'hud-card');
    root.appendChild(this.cardEl);

    // event log (bottom-right)
    this.logEl = el('div', 'hud-log');
    root.appendChild(this.logEl);

    // controls help (top-right)
    const help = el('div', 'hud-help');
    help.innerHTML =
      '<b>Controls</b><br>' +
      'Pan: WASD / edges • Rotate: Q/E • Zoom: wheel<br>' +
      'Select: left-click / drag-box • Command: right-click<br>' +
      'Build (villager selected): H House · J Barracks · K Mill<br>' +
      'Train (Town Center): V Villager • (Barracks): B Soldier · N Archer<br>' +
      'Attack-move: hold Shift + right-click • Cancel: Esc';
    root.appendChild(help);

    // game over overlay
    this.overlay = el('div', 'hud-overlay');
    this.overlay.style.display = 'none';
    root.appendChild(this.overlay);

    this.game.onMessage = (t, k) => this.log(t, k);
    this.game.onSelectionChanged = () => this.buildCard();
    this.game.onGameOver = (won) => this.showGameOver(won);

    this.installHotkeys();
    this.buildCard();
    this.log('Welcome, commander. Gather wood and food, raise houses, train an army, and crush the red town center.');
  }

  private installHotkeys() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const hasVil = this.game.selected.some((u) => u.kind === 'villager');
      const sb = this.game.selectedBuilding;
      switch (e.key.toLowerCase()) {
        case 'h': if (hasVil) this.input.startPlacing('house'); break;
        case 'j': if (hasVil) this.input.startPlacing('barracks'); break;
        case 'k': if (hasVil) this.input.startPlacing('mill'); break;
        case 'v': if (sb?.kind === 'towncenter') this.game.queueTraining(sb, 'villager'); break;
        case 'b': if (sb?.kind === 'barracks') this.game.queueTraining(sb, 'soldier'); break;
        case 'n': if (sb?.kind === 'barracks') this.game.queueTraining(sb, 'archer'); break;
      }
    });
  }

  private log(text: string, kind: 'info' | 'warn' = 'info') {
    const p = document.createElement('p');
    p.textContent = text;
    if (kind === 'warn') p.className = 'warn';
    this.logEl.prepend(p);
    while (this.logEl.childElementCount > 8) this.logEl.lastChild?.remove();
  }

  private buildCard() {
    const card = this.cardEl;
    card.innerHTML = '';
    const g = this.game;

    if (g.selectedBuilding) {
      const b = g.selectedBuilding;
      const def = BUILDINGS[b.kind];
      card.appendChild(title(def.label, b.complete ? '' : ' (building…)'));
      if (b.complete) {
        if (b.kind === 'towncenter') card.appendChild(this.trainBtn(b, 'villager', 'Villager (V)'));
        if (b.kind === 'barracks') {
          card.appendChild(this.trainBtn(b, 'soldier', 'Soldier (B)'));
          card.appendChild(this.trainBtn(b, 'archer', 'Archer (N)'));
        }
      }
      return;
    }

    const vils = g.selected.filter((u) => u.kind === 'villager');
    const army = g.selected.filter((u) => u.kind !== 'villager');
    if (g.selected.length) {
      const label = g.selected.length === 1
        ? cap(g.selected[0].kind)
        : `${g.selected.length} units (${vils.length} villagers, ${army.length} soldiers)`;
      card.appendChild(title(label, ''));
      if (vils.length) {
        card.appendChild(this.buildBtn('house', 'House (H)'));
        card.appendChild(this.buildBtn('barracks', 'Barracks (J)'));
        card.appendChild(this.buildBtn('mill', 'Mill (K)'));
      }
      return;
    }
    card.appendChild(title('No selection', ''));
    const tip = el('div', 'hud-tip');
    tip.textContent = 'Left-click a unit or drag a box to select. Right-click to command.';
    card.appendChild(tip);
  }

  private buildBtn(kind: BuildingKind, label: string): HTMLElement {
    const def = BUILDINGS[kind];
    const b = button(label, costStr(def.cost));
    b.onclick = () => this.input.startPlacing(kind);
    return b;
  }
  private trainBtn(building: Building, kind: TrainKind, label: string): HTMLElement {
    const def = TRAIN[kind];
    const b = button(label, costStr(def.cost));
    b.onclick = () => this.game.queueTraining(building, kind);
    return b;
  }

  private showGameOver(won: boolean) {
    this.overlay.style.display = 'flex';
    this.overlay.innerHTML =
      `<div class="hud-over-box ${won ? 'win' : 'lose'}">` +
      `<h1>${won ? 'Victory!' : 'Defeat'}</h1>` +
      `<p>${won ? 'The enemy town center lies in ruins. Well fought, commander.' : 'Your town center has fallen.'}</p>` +
      `<button id="restart">Play again</button></div>`;
    this.overlay.querySelector('#restart')!.addEventListener('click', () => location.reload());
  }

  update() {
    const g = this.game;
    const r = g.resourcesPool;
    this.resEl.innerHTML =
      stat('🌾', 'Food', Math.floor(r.food), '#e6b85c') +
      stat('🪵', 'Wood', Math.floor(r.wood), '#c79262') +
      stat('🪙', 'Gold', Math.floor(r.gold), '#f2d24e') +
      stat('👥', 'Pop', `${g.population}/${g.popCap}`, g.population >= g.popCap ? '#ff8a8a' : '#cfe6ff');

    // live training progress on the card
    const sb = g.selectedBuilding;
    if (sb && sb.queue.length) {
      let bar = this.cardEl.querySelector('.hud-queue') as HTMLElement | null;
      if (!bar) { bar = el('div', 'hud-queue'); this.cardEl.appendChild(bar); }
      const o = sb.queue[0];
      const pct = Math.round((1 - sb.trainTimer / o.total) * 100);
      bar.innerHTML = `Training ${o.kind}… ${pct}% &nbsp;(${sb.queue.length} queued)`;
    } else {
      this.cardEl.querySelector('.hud-queue')?.remove();
    }

    this.minimap.draw();
  }
}

// --- tiny DOM helpers -------------------------------------------------------
function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}
function title(main: string, sub: string): HTMLElement {
  const t = el('div', 'hud-card-title');
  t.innerHTML = `${main}<span>${sub}</span>`;
  return t;
}
function button(label: string, cost: string): HTMLElement {
  const b = document.createElement('button');
  b.className = 'hud-btn';
  b.innerHTML = `<span class="l">${label}</span><span class="c">${cost}</span>`;
  return b;
}
function stat(icon: string, name: string, val: string | number, color: string): string {
  return `<div class="hud-stat"><span class="i">${icon}</span><span class="n">${name}</span><b style="color:${color}">${val}</b></div>`;
}
function costStr(cost: Record<string, number | undefined>): string {
  const parts: string[] = [];
  if (cost.food) parts.push(`🌾${cost.food}`);
  if (cost.wood) parts.push(`🪵${cost.wood}`);
  if (cost.gold) parts.push(`🪙${cost.gold}`);
  return parts.join(' ');
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
