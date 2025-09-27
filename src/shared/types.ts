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

export type ClipType = "text" | "image" | "html" | "file";

export interface Clip {
  id: string;
  type: ClipType;
  createdAt: number;
  updatedAt: number;
  text?: string;
  html?: string;
  imagePath?: string;
  imagePreview?: string;
  filePath?: string;
  tags: string[];
  board?: string;
  favorite?: boolean;
  ocrText?: string;
  hash?: string;
}

export type ClipSummary = Clip;

export interface ClipUpsert {
  id: string;
  text?: string;
  html?: string;
  tags?: string[];
  board?: string | null;
  favorite?: boolean;
  ocrText?: string | null;
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
  clipboard: {
    getHistory: () => Promise<ClipSummary[]>;
    copyToClipboard: (id: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
    upsert: (clip: ClipUpsert) => Promise<string>;
    ocrImage: (id: string) => Promise<void>;
    setTags: (id: string, tags: string[]) => Promise<void>;
  };
  example: {
    exampleOne: () => Promise<string>;
    exampleTwo: () => Promise<number>;
  };
};
