import { contextBridge, ipcRenderer } from "electron";

import { CHANNELS } from "./shared/channels";
import type {
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
  example: {
    exampleOne: async () => "example-one-response",
    exampleTwo: async () => 42,
  },
});
