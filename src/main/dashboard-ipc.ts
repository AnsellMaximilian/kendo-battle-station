import { ipcMain } from "electron";
import Store from "electron-store";
import os from "node:os";

import { CHANNELS } from "../shared/channels";
import type {
  DashboardLayoutPosition,
  SystemMetrics,
} from "../shared/types";

type LayoutStoreShape = {
  layout?: DashboardLayoutPosition[];
};

const dashboardStore = new Store<LayoutStoreShape>({ name: "dashboard" });

const sanitizeLayout = (
  positions: DashboardLayoutPosition[],
): DashboardLayoutPosition[] =>
  positions
    .map((position) => ({
      order: typeof position.order === "number" ? position.order : undefined,
      col: Number(position.col) || 1,
      row: typeof position.row === "number" ? position.row : undefined,
      colSpan:
        typeof position.colSpan === "number" && Number.isFinite(position.colSpan)
          ? position.colSpan
          : undefined,
      rowSpan:
        typeof position.rowSpan === "number" && Number.isFinite(position.rowSpan)
          ? position.rowSpan
          : undefined,
    }))
    .filter((position) => Number.isFinite(position.col));

interface CpuSnapshot {
  idle: number;
  total: number;
}

const readCpuSnapshot = (): CpuSnapshot => {
  const cpus = os.cpus();
  return cpus.reduce(
    (acc, cpu) => {
      const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
      return {
        idle: acc.idle + cpu.times.idle,
        total: acc.total + total,
      };
    },
    { idle: 0, total: 0 },
  );
};

let lastCpuSnapshot = readCpuSnapshot();

const collectSystemMetrics = (): SystemMetrics => {
  const currentCpu = readCpuSnapshot();
  const idleDiff = currentCpu.idle - lastCpuSnapshot.idle;
  const totalDiff = currentCpu.total - lastCpuSnapshot.total;
  lastCpuSnapshot = currentCpu;

  const cpuUsage = totalDiff > 0 ? 100 - (idleDiff / totalDiff) * 100 : 0;

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = totalMemory > 0 ? (usedMemory / totalMemory) * 100 : 0;

  const loadAverageRaw = os.loadavg();
  const loadAverage = Number.isFinite(loadAverageRaw[0]) ? loadAverageRaw[0] : null;

  const { rss, heapUsed } = process.memoryUsage();

  return {
    cpu: {
      usagePercent: Math.max(0, Math.min(100, Number(cpuUsage.toFixed(1)))),
      cores: os.cpus().length,
    },
    memory: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      usagePercent: Number(memoryUsage.toFixed(1)),
    },
    appMemory: {
      rss,
      heap: heapUsed,
    },
    loadAverage,
    uptimeSeconds: os.uptime(),
    platform: process.platform,
    timestamp: Date.now(),
  };
};

ipcMain.handle(CHANNELS.DASHBOARD.GET_LAYOUT, () => {
  return dashboardStore.get("layout");
});

ipcMain.handle(
  CHANNELS.DASHBOARD.SAVE_LAYOUT,
  (_event, nextLayout: DashboardLayoutPosition[]) => {
    if (Array.isArray(nextLayout)) {
      dashboardStore.set("layout", sanitizeLayout(nextLayout));
    }
  },
);

ipcMain.handle(CHANNELS.DASHBOARD.GET_SYSTEM_METRICS, () => collectSystemMetrics());
