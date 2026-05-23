import { app, BrowserWindow, screen } from "electron";
import * as fs from "fs";
import * as path from "path";

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
  isFullScreen?: boolean;
}

const MIN_WIDTH = 900;
const MIN_HEIGHT = 600;

export const WINDOW_STATE_DEFAULTS: WindowState = {
  width: 1200,
  height: 800,
};

function stateFilePath(): string {
  return path.join(app.getPath("userData"), "window-state.json");
}

function isOnVisibleDisplay(bounds: Electron.Rectangle): boolean {
  return screen.getAllDisplays().some((display) => {
    const { x, y, width, height } = display.workArea;
    return bounds.x < x + width && bounds.x + bounds.width > x && bounds.y < y + height && bounds.y + bounds.height > y;
  });
}

function normalizeState(raw: Partial<WindowState>): WindowState {
  const width = Math.max(MIN_WIDTH, Number(raw.width) || WINDOW_STATE_DEFAULTS.width);
  const height = Math.max(MIN_HEIGHT, Number(raw.height) || WINDOW_STATE_DEFAULTS.height);

  const state: WindowState = {
    width,
    height,
    isMaximized: Boolean(raw.isMaximized),
    isFullScreen: Boolean(raw.isFullScreen),
  };

  const x = Number(raw.x);
  const y = Number(raw.y);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    const bounds = { x, y, width, height };
    if (isOnVisibleDisplay(bounds)) {
      state.x = x;
      state.y = y;
    }
  }

  return state;
}

export function loadWindowState(): WindowState {
  try {
    const filePath = stateFilePath();
    if (!fs.existsSync(filePath)) {
      return { ...WINDOW_STATE_DEFAULTS };
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Partial<WindowState>;
    return normalizeState(parsed);
  } catch {
    return { ...WINDOW_STATE_DEFAULTS };
  }
}

export function saveWindowState(win: BrowserWindow): void {
  if (win.isDestroyed()) return;

  const bounds = win.isMaximized() || win.isFullScreen() ? win.getNormalBounds() : win.getBounds();

  const state: WindowState = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: win.isMaximized(),
    isFullScreen: win.isFullScreen(),
  };

  fs.writeFileSync(stateFilePath(), JSON.stringify(state, null, 2), "utf-8");
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(win: BrowserWindow): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveWindowState(win);
  }, 400);
}

export function trackWindowState(win: BrowserWindow): void {
  const save = () => scheduleSave(win);

  win.on("resize", save);
  win.on("move", save);
  win.on("maximize", save);
  win.on("unmaximize", save);
  win.on("enter-full-screen", save);
  win.on("leave-full-screen", save);

  win.on("close", () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    saveWindowState(win);
  });
}

export function windowOptionsFromState(state: WindowState): Electron.BrowserWindowConstructorOptions {
  const options: Electron.BrowserWindowConstructorOptions = {
    width: state.width,
    height: state.height,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
  };

  if (state.x !== undefined && state.y !== undefined) {
    options.x = state.x;
    options.y = state.y;
  }

  return options;
}

export function applyWindowState(win: BrowserWindow, state: WindowState): void {
  if (state.isMaximized) {
    win.maximize();
  }
  if (state.isFullScreen) {
    win.setFullScreen(true);
  }
}
