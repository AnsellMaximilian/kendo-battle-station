export interface DashboardLayoutPosition {
  order?: number;
  col: number;
  row?: number;
  colSpan?: number;
  rowSpan?: number;
}

export interface SystemMetrics {
  cpu: {
    usagePercent: number;
    cores: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  appMemory: {
    rss: number;
    heap: number;
  };
  loadAverage: number | null;
  uptimeSeconds: number;
  platform: NodeJS.Platform;
  timestamp: number;
}

export type AppAPI = {
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  dashboard: {
    getLayout: () => Promise<DashboardLayoutPosition[] | undefined>;
    saveLayout: (layout: DashboardLayoutPosition[]) => Promise<void>;
    getSystemMetrics: () => Promise<SystemMetrics>;
  };
  example: {
    exampleOne: () => Promise<string>;
    exampleTwo: () => Promise<number>;
  };
};
