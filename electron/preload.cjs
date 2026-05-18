/**
 * Renderer-side preload. Exposes a minimal, audited surface area for the
 * renderer to talk to the main process: autosave, project dialogs, export
 * dialogs, and a menu-event subscription helper. No node, no fs, no ipc
 * leaks into the React tree.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,

  // Autosave I/O — writes go through the main process so we don't keep an
  // open file handle in the renderer.
  saveAutosave: (json) => ipcRenderer.invoke('autosave:save', json),
  loadAutosave: () => ipcRenderer.invoke('autosave:load'),
  clearAutosave: () => ipcRenderer.invoke('autosave:clear'),

  // Project file dialogs
  saveProjectFile: (json, suggestedName) =>
    ipcRenderer.invoke('project:save', json, suggestedName),
  openProjectFile: () => ipcRenderer.invoke('project:open'),

  // Image / bundle export dialogs. Bytes are passed as ArrayBuffer; the
  // main process turns them back into Buffer before writing.
  saveImageFile: (bytes, ext, suggestedName) =>
    ipcRenderer.invoke('export:image', { bytes, ext, suggestedName }),
  saveBundleFile: (bytes, ext, suggestedName) =>
    ipcRenderer.invoke('export:bundle', { bytes, ext, suggestedName }),

  // Menu → React. Returns an unsubscribe function.
  onMenuAction: (cb) => {
    const handler = (_event, action) => cb(action);
    ipcRenderer.on('menu', handler);
    return () => ipcRenderer.removeListener('menu', handler);
  },
});
