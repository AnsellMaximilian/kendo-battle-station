import { contextBridge, ipcRenderer } from "electron";

import { CHANNELS } from "./shared/channels";
import type {
  ClipSummary,
  ClipUpsert,
  DashboardLayoutPosition,
  PomodoroControlPayload,
  PomodoroSessionSummary,
  PomodoroSettings,
  PomodoroState,
  SystemMetrics,
} from "./shared/types";

type Listener = (state: PomodoroState) => void;

contextBridge.exposeInMainWorld("api", {
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  dashboard: {
    getLayout: () =>
      ipcRenderer.invoke(
        CHANNELS.DASHBOARD.GET_LAYOUT,
      ) as Promise<DashboardLayoutPosition[] | undefined>,
    saveLayout: (layout: DashboardLayoutPosition[]) =>
      ipcRenderer.invoke(CHANNELS.DASHBOARD.SAVE_LAYOUT, layout) as Promise<void>,
    getSystemMetrics: () =>
      ipcRenderer.invoke(
        CHANNELS.DASHBOARD.GET_SYSTEM_METRICS,
      ) as Promise<SystemMetrics>,
  },
  clipboard: {
    getHistory: () =>
      ipcRenderer.invoke(CHANNELS.CLIPBOARD.GET_HISTORY) as Promise<ClipSummary[]>,
    copyToClipboard: (id: string) =>
      ipcRenderer.invoke(CHANNELS.CLIPBOARD.COPY, id) as Promise<void>,
    delete: (id: string) =>
      ipcRenderer.invoke(CHANNELS.CLIPBOARD.DELETE, id) as Promise<void>,
    upsert: (clip: ClipUpsert) =>
      ipcRenderer.invoke(CHANNELS.CLIPBOARD.UPSERT, clip) as Promise<string>,
    ocrImage: (id: string) =>
      ipcRenderer.invoke(CHANNELS.CLIPBOARD.OCR_IMAGE, id) as Promise<void>,
    setTags: (id: string, tags: string[]) =>
      ipcRenderer.invoke(CHANNELS.CLIPBOARD.SET_TAGS, { id, tags }) as Promise<void>,
  },
  pomodoro: {
    getState: () =>
      ipcRenderer.invoke(CHANNELS.POMODORO.GET_STATE) as Promise<PomodoroState>,
    updateSettings: (settings: PomodoroSettings) =>
      ipcRenderer.invoke(CHANNELS.POMODORO.UPDATE_SETTINGS, settings) as Promise<void>,
    control: (payload: PomodoroControlPayload) =>
      ipcRenderer.invoke(CHANNELS.POMODORO.CONTROL, payload) as Promise<void>,
    getHistory: () =>
      ipcRenderer.invoke(CHANNELS.POMODORO.GET_HISTORY) as Promise<PomodoroSessionSummary[]>,
    clearHistory: () =>
      ipcRenderer.invoke(CHANNELS.POMODORO.CLEAR_HISTORY) as Promise<void>,
    onStateChanged: (listener: Listener) => {
      const handler = (_event: unknown, state: PomodoroState) => listener(state);
      ipcRenderer.on(CHANNELS.POMODORO.STATE_EVENT, handler);
      return () => ipcRenderer.removeListener(CHANNELS.POMODORO.STATE_EVENT, handler);
    },
  },
  example: {
    exampleOne: async () => "example-one-response",
    exampleTwo: async () => 42,
  },
});
