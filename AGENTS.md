## Refer to this project outline. Use best practices and neat project folder

# Project Outline — “Battle Station” (Electron + React + KendoReact)

## Top-Level Modules

1. **Dashboard** (TileLayout + system metrics) — you already specced this
2. **Storage** (app-scoped library with metadata) — you already specced this
3. **Clipboard & Snippets Studio** ✅ (new)
4. **Pomodoro** with native notifications ✅ (new)
5. **Always-On Timer** (floating, always-on-top window) ✅ (new)

Below are the three new modules with dependencies, Kendo components, IPC and data models, plus global app structure.

---

## 3) Clipboard & Snippets Studio

### What it does

- Records clipboard history (text, images, files, HTML fragments).
- Lets users tag, search, favorite, and group into boards.
- Quick paste, templates, and (optional) on-device OCR for images.

### Key dependencies

- **Core**: `electron`, `electron-store`, `uuid`
- **Clipboard**: Electron’s `clipboard` & `nativeImage`
- **Watcher**: polling or `global-shortcut` for capture combo (e.g., Ctrl+Shift+C)
- **Optional OCR**: `tesseract.js` (renderer worker) or call `tesseract-ocr` via `child_process`
- **Search** (optional): `flexsearch` or `mini-search` for local full-text
- **Images** (thumbs): `sharp` (main process) if you want thumbnails

### KendoReact components

- **TileLayout** (pin “Latest Clips”, “Pinned”, “Templates”, “OCR Queue” tiles)
- **Data Grid** (history with type, preview, tags, date)
- **AutoComplete / MultiSelect / Chips** (tags & quick filtering)
- **TabStrip** (All / Text / Images / Files / Templates)
- **Dialog / Window** (detail, edit, preview)
- **Notification** (copied to clipboard, errors)
- **Toolbar / AppBar** (actions)
- **ProgressBar** (OCR queue)

### IPC surface (preload)

```ts
clipboardAPI: {
  getHistory: () => Promise<ClipSummary[]>,
  copyToClipboard: (id: string) => Promise<void>,
  delete: (id: string) => Promise<void>,
  upsert: (clip: ClipUpsert) => Promise<string>,
  ocrImage: (id: string) => Promise<void>,
  setTags: (id: string, tags: string[]) => Promise<void>,
}
```

### Data model (electron-store kv + optional SQLite if you grow)

```ts
type ClipType = "text" | "image" | "html" | "file";
interface Clip {
  id: string;
  type: ClipType;
  createdAt: number;
  updatedAt: number;
  text?: string; // for text/html after stripping
  html?: string; // optional raw html
  imagePath?: string; // saved PNG/JPEG in userData/clips/
  filePath?: string; // original file pointer
  tags: string[];
  board?: string;
  favorite?: boolean;
  ocrText?: string;
}
```

### Flow

- **Capture loop**: main process polls `clipboard.read*()` every ~500ms (debounce identical content) OR require a hotkey to capture.
- **Persist**: write each clip to `electron-store` (or JSON file) and save images under `userData/clips/`.
- **Paste**: IPC → main sets clipboard (`clipboard.writeText`, `clipboard.writeImage`), optional simulated paste via `robotjs` (if you want auto-paste; otherwise show “Copied”).
- **OCR** (optional): enqueue to worker; write `ocrText` when done.

---

## 4) Pomodoro (with native notifications)

### What it does

- Start/stop Focus and Break cycles (custom durations).
- Sends **system notifications** on state changes.
- Optional auto-actions: toggle Do Not Disturb (platform-specific) or play sound.

### Can Electron do system notifications?

Yes. Use the **HTML5 `new Notification()`** (renderer with permission) or Electron’s **`new Notification({ title, body })`** from the main process for more consistent OS behavior. Windows toast, macOS Notification Center, Linux libnotify (varies by DE).

### Dependencies

- **Core**: `electron`, `electron-store`
- **Sounds** (optional): `howler` in renderer or play OS beep
- **Tray** (optional): use `Tray` for quick control

### KendoReact components

- **TileLayout** (Pomodoro tile with big countdown)
- **Buttons / ButtonGroup** (Start, Pause, Reset)
- **NumericTextBox** (set focus/break lengths)
- **Switch** (auto-start next session)
- **ProgressBar** (time remaining)
- **Notification** (in-app toasts alongside system notifications)

### Persistence (electron-store)

```ts
pomodoro: {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLong: number;
  autoStartNext: boolean;
  sound: boolean;
}
```

### System notification example (main)

```ts
import { Notification } from "electron";

function notify(title: string, body: string) {
  new Notification({ title, body, silent: false }).show();
}
```

---

## 5) Always-On Timer (floating window)

### What it does

- Minimal always-on-top window with large digits.
- Click-through mode (optional) so it doesn’t steal focus.
- Presets, lap, count up/down, draggable position (remember it).

### Dependencies

- **Core**: `electron`, `electron-store`
- **Window mgmt**: `BrowserWindow` with `alwaysOnTop: true`, `frameless`, rounded via CSS

### KendoReact components

- **TileLayout** (main app tile to control the floating timer)
- **Buttons / ButtonGroup** (Start, Lap, Reset)
- **NumericTextBox** (preset minutes)
- **Switch** (always-on-top, click-through)
- **Dialog** (rename/preset save)

### Implementation hints

- Spawn a **secondary BrowserWindow** (`alwaysOnTop: true`, `transparent: true`, `frame: false`).
- For click-through: `win.setIgnoreMouseEvents(true, { forward: true })`.
- Persist position/size in `electron-store` on `move`/`resize` events.

---

## Global Architecture & Packages

### Electron main

- **App state**: `electron-store` (layouts, settings, timer/pomodoro state)
- **Windows**: main window + optional floating timer
- **Security**: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- **IPC**: tightly scoped; validate all inputs

### Renderer (React + KendoReact Free)

- **UI**: AppBar/Drawer shell; TileLayout dashboard
- **State**: `zustand` or `redux-toolkit` (your call)
- **Styling**: Tailwind or CSS Modules
- **Routing**: `react-router`

### Suggested dependencies list

- Runtime: `electron`, `electron-store`, `uuid`
- UI: `react`, `react-dom`, `@progress/kendo-react-layout`, `@progress/kendo-react-inputs`, `@progress/kendo-react-buttons`, `@progress/kendo-react-indicators`, `@progress/kendo-react-data-tools`, `@progress/kendo-react-grid`, `@progress/kendo-react-charts`, `@progress/kendo-theme-default`
- State/Utils: `zustand` (or redux), `dayjs`
- Optional: `sharp`, `tesseract.js`, `flexsearch`, `chokidar`, `robotjs` (or `@nut-tree/nut-js`), `dotenv`

_(Trim optional ones if you keep v1 lean.)_

---

## App Shell & Kendo Components Map

- **Shell**: `AppBar` (title, global actions), `Drawer` (Dashboard / Storage / Clipboard / Pomodoro / Timer / Settings)
- **Dashboard**: `TileLayout`, `Chart`, `Sparkline`, `Data Grid`, `Notification`, `ProgressBar`
- **Storage**: `TreeView`, `Data Grid`, `Dialog`, `Upload`, `Chips`/`MultiSelect`, `TabStrip`, `ProgressBar`
- **Clipboard**: `TileLayout`, `Data Grid`, `AutoComplete`, `MultiSelect`, `Dialog`, `TabStrip`, `Notification`, `ProgressBar`
- **Pomodoro**: `TileLayout` tile + dedicated page with `Buttons`, `NumericTextBox`, `Switch`, `ProgressBar`, `Notification`
- **Always-On Timer**: control tile (Buttons, NumericTextBox, Switch), plus floating window UI

---

## Example: persist TileLayout via electron-store

**preload.ts**

```ts
contextBridge.exposeInMainWorld("store", {
  get: (key: string) => ipcRenderer.invoke("store:get", key),
  set: (key: string, val: any) => ipcRenderer.invoke("store:set", key, val),
});
```

**main/store.ts**

```ts
import Store from "electron-store";
const store = new Store({ name: "settings" });

ipcMain.handle("store:get", (_e, key) => store.get(key));
ipcMain.handle("store:set", (_e, key, val) => {
  store.set(key, val);
  return true;
});
```

**renderer (save layout)**

```ts
const saveLayout = (state: LayoutState) =>
  (window as any).store.set("dashboard.layout", state);

const loadLayout = async () =>
  (await (window as any).store.get("dashboard.layout")) as
    | LayoutState
    | undefined;
```

---

## Example: system notification on Pomodoro phase switch

```ts
// main/pomodoro.ts
function onPhaseChange(phase: "Focus" | "Break") {
  new Notification({
    title: `Pomodoro: ${phase}`,
    body: phase === "Focus" ? "Time to focus 💪" : "Break time ☕",
  }).show();
}
```

---

## Example: floating “Always-On” timer window

```ts
// main/floating-timer.ts
function createTimerWindow() {
  const win = new BrowserWindow({
    width: 240,
    height: 96,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.loadFile("timer.html");
  return win;
}

// toggles click-through
function setClickThrough(win: BrowserWindow, on: boolean) {
  win.setIgnoreMouseEvents(on, { forward: true });
}
```
