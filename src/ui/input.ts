/**
 * Mouse and keyboard input. Translates raw events into sim commands against
 * the currently selected tool. Intentionally framework-free so we can swap
 * the UI toolkit later without rewriting controls.
 */

import { RenderApp } from '../render/app.js';
import { ZoneKind } from '../sim/types.js';

export type Tool = 'none' | 'road' | 'bulldoze' | 'zone-r' | 'zone-c' | 'zone-i';

export interface InputState {
  tool: Tool;
  isDragging: boolean;
  lastTile: { x: number; y: number } | null;
  isPanning: boolean;
  panAnchor: { x: number; y: number } | null;
}

export function attachInput(app: RenderApp, state: InputState): () => void {
  const canvas = app.pixi.canvas as HTMLCanvasElement;

  const apply = (x: number, y: number): void => {
    switch (state.tool) {
      case 'road':
        app.world.roads.place(x, y, app.world.bus);
        break;
      case 'bulldoze':
        // Phase 1: remove road tiles and clear zone marks.
        if (!app.world.roads.remove(x, y, app.world.bus)) {
          app.world.zoning.clear(x, y, app.world.bus);
        }
        break;
      case 'zone-r':
        app.world.zoning.paint(x, y, ZoneKind.Residential, app.world.bus);
        break;
      case 'zone-c':
        app.world.zoning.paint(x, y, ZoneKind.Commercial, app.world.bus);
        break;
      case 'zone-i':
        app.world.zoning.paint(x, y, ZoneKind.Industrial, app.world.bus);
        break;
    }
  };

  const onDown = (ev: MouseEvent): void => {
    canvas.focus();
    const rect = canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    if (ev.button === 2 || (ev.button === 0 && ev.shiftKey)) {
      state.isPanning = true;
      state.panAnchor = { x: sx, y: sy };
      return;
    }
    if (ev.button !== 0) return;
    state.isDragging = true;
    const { tx, ty } = app.camera.screenToTile(sx, sy);
    state.lastTile = { x: tx, y: ty };
    apply(tx, ty);
  };

  const onMove = (ev: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const { tx, ty } = app.camera.screenToTile(sx, sy);
    app.setHover({ x: tx, y: ty });
    if (state.isPanning && state.panAnchor) {
      const dx = sx - state.panAnchor.x;
      const dy = sy - state.panAnchor.y;
      app.camera.panBy(-dx / app.camera.state.tileSize, -dy / app.camera.state.tileSize);
      state.panAnchor = { x: sx, y: sy };
    }
    if (state.isDragging) {
      if (!state.lastTile || state.lastTile.x !== tx || state.lastTile.y !== ty) {
        // Paint every tile on the line between last and current for smooth drags.
        paintLine(state.lastTile, { x: tx, y: ty }, apply);
        state.lastTile = { x: tx, y: ty };
      }
    }
  };

  const onUp = (): void => {
    state.isDragging = false;
    state.isPanning = false;
    state.lastTile = null;
    state.panAnchor = null;
  };

  const onLeave = (): void => {
    app.setHover(null);
    onUp();
  };

  const onWheel = (ev: WheelEvent): void => {
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
    app.camera.zoomAt(sx, sy, factor);
  };

  const onContextMenu = (ev: MouseEvent): void => {
    ev.preventDefault();
  };

  const onKey = (ev: KeyboardEvent): void => {
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const panStep = 2;
    switch (ev.key) {
      case '1':
        state.tool = 'road';
        break;
      case '2':
        state.tool = 'zone-r';
        break;
      case '3':
        state.tool = 'zone-c';
        break;
      case '4':
        state.tool = 'zone-i';
        break;
      case 'x':
      case 'X':
        state.tool = 'bulldoze';
        break;
      case 'Escape':
        state.tool = 'none';
        break;
      case 'ArrowLeft':
      case 'a':
        app.camera.panBy(-panStep, 0);
        break;
      case 'ArrowRight':
      case 'd':
        app.camera.panBy(panStep, 0);
        break;
      case 'ArrowUp':
      case 'w':
        app.camera.panBy(0, -panStep);
        break;
      case 'ArrowDown':
      case 's':
        app.camera.panBy(0, panStep);
        break;
      case ' ': {
        app.tick.setPaused(!app.tick.isPaused());
        break;
      }
      case '+':
      case '=':
        app.camera.zoomAt(app.camera.state.viewW / 2, app.camera.state.viewH / 2, 1.15);
        break;
      case '-':
      case '_':
        app.camera.zoomAt(app.camera.state.viewW / 2, app.camera.state.viewH / 2, 1 / 1.15);
        break;
    }
    window.dispatchEvent(new CustomEvent('cb:tool', { detail: state.tool }));
  };

  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKey);

  return () => {
    canvas.removeEventListener('mousedown', onDown);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    canvas.removeEventListener('mouseleave', onLeave);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('keydown', onKey);
  };
}

function paintLine(
  from: { x: number; y: number } | null,
  to: { x: number; y: number },
  apply: (x: number, y: number) => void,
): void {
  if (!from) {
    apply(to.x, to.y);
    return;
  }
  // Bresenham between the two tiles.
  let x0 = from.x;
  let y0 = from.y;
  const x1 = to.x;
  const y1 = to.y;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    apply(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}
