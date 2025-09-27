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

export type PomodoroPhase = "idle" | "focus" | "shortBreak" | "longBreak";

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
  autoStartNext: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface PomodoroState {
  phase: PomodoroPhase;
  cycle: number;
  totalCycles: number;
  remainingSeconds: number;
  durationSeconds: number;
  running: boolean;
  settings: PomodoroSettings;
  updatedAt: number;
  completedSessions: number;
}

export interface PomodoroSessionSummary {
  id: string;
  phase: PomodoroPhase;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
}

export interface PomodoroControlPayload {
  command: "start" | "pause" | "resume" | "skip" | "reset";
}

export type TimerMode = "countdown" | "countup";

export interface FloatingTimerSettings {
  mode: TimerMode;
  durationSeconds: number;
  alwaysOnTop: boolean;
  clickThrough: boolean;
  rememberPosition: boolean;
  theme: "light" | "dark";
}

export interface FloatingTimerState {
  running: boolean;
  elapsedSeconds: number;
  remainingSeconds: number;
  durationSeconds: number;
  mode: TimerMode;
  updatedAt: number;
  position: { x: number; y: number } | null;
  visible: boolean;
}

export interface FloatingTimerControlPayload {
  command: "start" | "pause" | "resume" | "reset" | "toggle";
  durationSeconds?: number;
  mode?: TimerMode;
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
  pomodoro: {
    getState: () => Promise<PomodoroState>;
    updateSettings: (settings: PomodoroSettings) => Promise<void>;
    control: (payload: PomodoroControlPayload) => Promise<void>;
    onStateChanged: (listener: (state: PomodoroState) => void) => () => void;
    getHistory: () => Promise<PomodoroSessionSummary[]>;
    clearHistory: () => Promise<void>;
  };
  floatingTimer: {
    getState: () => Promise<FloatingTimerState>;
    updateSettings: (settings: FloatingTimerSettings) => Promise<void>;
    control: (payload: FloatingTimerControlPayload) => Promise<void>;
    onStateChanged: (listener: (state: FloatingTimerState) => void) => () => void;
  };
  example: {
    exampleOne: () => Promise<string>;
    exampleTwo: () => Promise<number>;
  };
};
