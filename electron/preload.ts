/**
 * Preload: exposes a narrow, typed API to the renderer. Never expose `require`
 * or raw `fs` — everything must funnel through named IPC handlers so the
 * attack surface is small and the contract is explicit.
 */

import { contextBridge, ipcRenderer } from 'electron';

const api = {
  saveDialog: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('cb:save-dialog', defaultName),
  loadDialog: (): Promise<string | null> => ipcRenderer.invoke('cb:load-dialog'),
  writeFile: (p: string, data: string): Promise<boolean> =>
    ipcRenderer.invoke('cb:write-file', p, data),
  readFile: (p: string): Promise<string> => ipcRenderer.invoke('cb:read-file', p),
  modsDir: (): Promise<string> => ipcRenderer.invoke('cb:mods-dir'),
};

contextBridge.exposeInMainWorld('city', api);

declare global {
  // Renderer-visible typed handle.
  interface Window {
    city: typeof api;
  }
}

export {};
