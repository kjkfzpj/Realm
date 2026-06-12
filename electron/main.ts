/**
 * Electron main process. Spawns a BrowserWindow pointing at either the Vite
 * dev server (development) or the packaged dist/index.html (production).
 *
 * The main process owns file I/O and exposes a minimal IPC surface to the
 * renderer: save/load dialogs and listing installed mods. All of it is
 * mediated through preload via contextBridge — the renderer never gets direct
 * node access.
 */

import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

const isDev = !app.isPackaged;

async function createWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0b0f0c',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    await win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function userSavesDir(): string {
  const dir = path.join(app.getPath('userData'), 'saves');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function modsDir(): string {
  // Mods live in userData so installed games can have mods without admin rights.
  // For dev, the repository `mods/` folder is the fallback.
  const userMods = path.join(app.getPath('userData'), 'mods');
  fs.mkdirSync(userMods, { recursive: true });
  return userMods;
}

function registerIpc(): void {
  ipcMain.handle('cb:save-dialog', async (_e, defaultName: string) => {
    const out = await dialog.showSaveDialog({
      title: 'Save City',
      defaultPath: path.join(userSavesDir(), defaultName),
      filters: [{ name: 'City Save', extensions: ['citysave'] }],
    });
    return out.canceled ? null : out.filePath;
  });

  ipcMain.handle('cb:load-dialog', async () => {
    const out = await dialog.showOpenDialog({
      title: 'Load City',
      defaultPath: userSavesDir(),
      properties: ['openFile'],
      filters: [{ name: 'City Save', extensions: ['citysave', 'json'] }],
    });
    return out.canceled || out.filePaths.length === 0 ? null : out.filePaths[0];
  });

  ipcMain.handle('cb:write-file', async (_e, p: string, data: string) => {
    await fs.promises.writeFile(p, data, 'utf8');
    return true;
  });

  ipcMain.handle('cb:read-file', async (_e, p: string) => {
    return await fs.promises.readFile(p, 'utf8');
  });

  ipcMain.handle('cb:mods-dir', async () => modsDir());
}

Menu.setApplicationMenu(null);

app.whenReady().then(async () => {
  registerIpc();
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
