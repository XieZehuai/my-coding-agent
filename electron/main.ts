import { app, BrowserWindow } from "electron";
import { join } from "path";
import { registerAllHandlers } from "./ipc/register";
import { closeDb } from "./db/connection";
import { applyWindowState, loadWindowState, trackWindowState, windowOptionsFromState } from "./utils/window-state";
import { conversationRegistry } from "./services/conversation-registry";

process.env.DIST_ELECTRON = join(__dirname);
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, "../public")
  : process.env.DIST;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const savedState = loadWindowState();

  mainWindow = new BrowserWindow({
    ...windowOptionsFromState(savedState),
    title: "Coding Agent",
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  trackWindowState(mainWindow);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(process.env.DIST!, "index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    applyWindowState(mainWindow, savedState);
  });
}

app.whenReady().then(() => {
  registerAllHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  conversationRegistry.disposeAll();
  closeDb();
});
