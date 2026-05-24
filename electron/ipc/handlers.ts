import { ipcMain, BrowserWindow } from "electron";
import { IPC } from "../../shared/types";

type IpcHandlerFn = (event: Electron.IpcMainInvokeEvent, ...args: any[]) => unknown;
const handlers = new Map<string, IpcHandlerFn>();

export function registerHandler(channel: string, fn: IpcHandlerFn) {
  if (handlers.has(channel)) {
    console.warn(`Handler for ${channel} already registered, replacing.`);
  }
  handlers.set(channel, fn);
  ipcMain.handle(channel, fn);
}

export function removeHandler(channel: string) {
  handlers.delete(channel);
  ipcMain.removeHandler(channel);
}

export function emitToRenderer(channel: string, data: unknown) {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}

export function getAllChannels() {
  return Object.values(IPC);
}
