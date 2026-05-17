/**
 * Electron main process for Carousel Studio.
 *
 * Loads the Vite-built renderer (or the dev server in development), wires up
 * IPC handlers for filesystem-backed autosave, project save/open, and image
 * export dialogs. Renderer code feature-detects via `window.electronAPI`.
 */

'use strict';

const { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');

const isDev =
  process.env.NODE_ENV === 'development' ||
  !!process.env.VITE_DEV_SERVER_URL ||
  !app.isPackaged;

const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const AUTOSAVE_FILE = 'autosave.json';

// Single-instance lock — second launch focuses existing window instead.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

/** @type {BrowserWindow | null} */
let mainWindow = null;

function autosavePath() {
  return path.join(app.getPath('userData'), AUTOSAVE_FILE);
}

async function ensureUserData() {
  try {
    await fsp.mkdir(app.getPath('userData'), { recursive: true });
  } catch {
    // exists or we don't have permission; rely on Electron's default path
  }
}

function buildMenu() {
  const isMac = process.platform === 'darwin';

  const fileMenu = {
    label: '&File',
    submenu: [
      {
        label: 'New project',
        accelerator: 'CmdOrCtrl+N',
        click: () => mainWindow?.webContents.send('menu', 'file:new'),
      },
      { type: 'separator' },
      {
        label: 'Open project…',
        accelerator: 'CmdOrCtrl+O',
        click: () => mainWindow?.webContents.send('menu', 'file:open'),
      },
      {
        label: 'Save project…',
        accelerator: 'CmdOrCtrl+S',
        click: () => mainWindow?.webContents.send('menu', 'file:save'),
      },
      { type: 'separator' },
      {
        label: 'Export images…',
        accelerator: 'CmdOrCtrl+E',
        click: () => mainWindow?.webContents.send('menu', 'file:export'),
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  };

  const editMenu = {
    label: '&Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  };

  const viewMenu = {
    label: '&View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
      ...(isDev ? [{ role: 'toggleDevTools' }] : []),
    ],
  };

  const helpMenu = {
    label: '&Help',
    submenu: [
      {
        label: 'Keyboard shortcuts',
        accelerator: 'F1',
        click: () => mainWindow?.webContents.send('menu', 'help:shortcuts'),
      },
      { type: 'separator' },
      {
        label: 'About Carousel Studio',
        click: () =>
          dialog.showMessageBox({
            type: 'info',
            title: 'About Carousel Studio',
            message: 'Carousel Studio',
            detail: `A professional Instagram carousel & slide editor.\nVersion ${app.getVersion()}\nElectron ${process.versions.electron}`,
            buttons: ['OK'],
          }),
      },
    ],
  };

  const template = [];
  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }
  template.push(fileMenu, editMenu, viewMenu, helpMenu);
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  // Icon (if present in build resources)
  const iconPath = (() => {
    const candidates = [
      path.join(__dirname, '..', 'build', 'icon.png'),
      path.join(__dirname, '..', 'public', 'favicon.svg'),
    ];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) return p;
      } catch {
        // ignore
      }
    }
    return undefined;
  })();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#09090b',
    show: false,
    autoHideMenuBar: false,
    title: 'Carousel Studio',
    icon: iconPath ? nativeImage.createFromPath(iconPath) : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Allow file:// → loading data: URLs for image previews
      webSecurity: !isDev,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // External links open in the default browser, not inside the app window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    void mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  await ensureUserData();
  buildMenu();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── IPC ─────────────────────────────────────────────────────────────────

ipcMain.handle('autosave:save', async (_event, json) => {
  await ensureUserData();
  // Write atomically: tmp file + rename. Prevents a half-written file if
  // power loss happens mid-write.
  const target = autosavePath();
  const tmp = target + '.tmp';
  await fsp.writeFile(tmp, json, 'utf8');
  await fsp.rename(tmp, target);
  return target;
});

ipcMain.handle('autosave:load', async () => {
  try {
    const content = await fsp.readFile(autosavePath(), 'utf8');
    return content;
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
});

ipcMain.handle('autosave:clear', async () => {
  try {
    await fsp.unlink(autosavePath());
  } catch (err) {
    if (!err || err.code !== 'ENOENT') throw err;
  }
});

ipcMain.handle('project:save', async (_event, json, suggestedName) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Carousel Project',
    defaultPath: suggestedName || 'carousel-project.json',
    filters: [{ name: 'Carousel Project', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return null;
  await fsp.writeFile(result.filePath, json, 'utf8');
  return result.filePath;
});

ipcMain.handle('project:open', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Carousel Project',
    properties: ['openFile'],
    filters: [
      { name: 'Carousel Project', extensions: ['json'] },
      { name: 'All files', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const content = await fsp.readFile(filePath, 'utf8');
  return { path: filePath, content };
});

ipcMain.handle('export:image', async (_event, payload) => {
  if (!mainWindow) return null;
  const { ext, suggestedName, bytes } = payload || {};
  const safeExt = String(ext || 'png').replace(/[^a-z0-9]+/gi, '');
  const baseName = String(suggestedName || 'slide').replace(/\.[a-z0-9]+$/i, '');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export image',
    defaultPath: `${baseName}.${safeExt}`,
    filters: [{ name: safeExt.toUpperCase(), extensions: [safeExt] }],
  });
  if (result.canceled || !result.filePath) return null;
  await fsp.writeFile(result.filePath, Buffer.from(bytes));
  return result.filePath;
});

ipcMain.handle('export:bundle', async (_event, payload) => {
  if (!mainWindow) return null;
  const { ext, suggestedName, bytes } = payload || {};
  const safeExt = String(ext || 'zip').replace(/[^a-z0-9]+/gi, '');
  const baseName = String(suggestedName || 'carousel').replace(/\.[a-z0-9]+$/i, '');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export carousel',
    defaultPath: `${baseName}.${safeExt}`,
    filters: [{ name: safeExt.toUpperCase(), extensions: [safeExt] }],
  });
  if (result.canceled || !result.filePath) return null;
  await fsp.writeFile(result.filePath, Buffer.from(bytes));
  return result.filePath;
});
