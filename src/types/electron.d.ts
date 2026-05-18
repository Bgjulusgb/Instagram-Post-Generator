/**
 * Type declarations for the preload-bridge API exposed when the app is
 * launched inside Electron. Renderer-side code feature-detects via
 * `window.electronAPI?.isElectron`.
 */
export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: true;
      platform: NodeJS.Platform;
      version: string;

      // Autosave on the filesystem
      saveAutosave: (json: string) => Promise<string>;
      loadAutosave: () => Promise<string | null>;
      clearAutosave: () => Promise<void>;

      // Project file dialogs
      saveProjectFile: (json: string, suggestedName?: string) => Promise<string | null>;
      openProjectFile: () => Promise<{ path: string; content: string } | null>;

      // Image export dialog
      saveImageFile: (
        bytes: ArrayBuffer,
        ext: string,
        suggestedName?: string,
      ) => Promise<string | null>;
      saveBundleFile: (
        bytes: ArrayBuffer,
        ext: string,
        suggestedName?: string,
      ) => Promise<string | null>;

      // Window controls
      onMenuAction: (cb: (action: string) => void) => () => void;
    };
  }
}
