import { contextBridge, ipcRenderer } from "electron";

import { CHANNELS } from "./shared/channels";
import type {
  ClipSummary,
  ClipUpsert,
  DashboardLayoutPosition,
  SystemMetrics,
} from "./shared/types";

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
  example: {
    exampleOne: async () => "example-one-response",
    exampleTwo: async () => 42,
  },
});
