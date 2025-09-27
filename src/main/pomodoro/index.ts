import { App, BrowserWindow, Notification, ipcMain } from "electron";
import Store from "electron-store";
import { randomUUID } from "node:crypto";

import { CHANNELS } from "../../shared/channels";
import type {
  PomodoroControlPayload,
  PomodoroPhase,
  PomodoroSessionSummary,
  PomodoroSettings,
  PomodoroState,
} from "../../shared/types";

interface PomodoroStoreShape {
  settings?: PomodoroSettings;
  state?: {
    phase: PomodoroPhase;
    cycle: number;
    totalCycles: number;
    remainingSeconds: number;
    durationSeconds: number;
    running: boolean;
    completedSessions: number;
    phaseStartedAt: number | null;
  };
  history?: PomodoroSessionSummary[];
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
  autoStartNext: true,
  soundEnabled: false,
  notificationsEnabled: true,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const normalizeSettings = (settings: PomodoroSettings): PomodoroSettings => ({
  focusMinutes: clamp(Math.round(settings.focusMinutes) || DEFAULT_SETTINGS.focusMinutes, 5, 120),
  shortBreakMinutes: clamp(
    Math.round(settings.shortBreakMinutes) || DEFAULT_SETTINGS.shortBreakMinutes,
    1,
    60,
  ),
  longBreakMinutes: clamp(
    Math.round(settings.longBreakMinutes) || DEFAULT_SETTINGS.longBreakMinutes,
    5,
    60,
  ),
  cyclesBeforeLongBreak: clamp(
    Math.round(settings.cyclesBeforeLongBreak) || DEFAULT_SETTINGS.cyclesBeforeLongBreak,
    2,
    10,
  ),
  autoStartNext: Boolean(settings.autoStartNext),
  soundEnabled: Boolean(settings.soundEnabled),
  notificationsEnabled: Boolean(settings.notificationsEnabled),
});

interface InternalState extends PomodoroState {
  phaseStartedAt: number | null;
}

class PomodoroService {
  private store = new Store<PomodoroStoreShape>({ name: "pomodoro" });
  private state: InternalState;
  private history: PomodoroSessionSummary[];
  private timer: NodeJS.Timer | undefined;

  constructor(private readonly app: App) {
    const storedSettings = this.store.get("settings");
    const settings = storedSettings ? normalizeSettings(storedSettings) : DEFAULT_SETTINGS;

    const storedState = this.store.get("state");
    this.state = {
      phase: storedState?.phase ?? "idle",
      cycle: storedState?.cycle ?? 0,
      totalCycles: storedState?.totalCycles ?? 0,
      remainingSeconds: storedState?.remainingSeconds ?? settings.focusMinutes * 60,
      durationSeconds: storedState?.durationSeconds ?? settings.focusMinutes * 60,
      running: storedState?.running ?? false,
      settings,
      updatedAt: Date.now(),
      completedSessions: storedState?.completedSessions ?? 0,
      phaseStartedAt: storedState?.phaseStartedAt ?? null,
    };

    this.history = this.store.get("history", []);

    if (this.state.running) {
      this.startTimer();
    }

    this.app.on("browser-window-created", (_event, window) => {
      window.webContents.once("did-finish-load", () => {
        this.emitState(window.webContents.send.bind(window.webContents));
      });
    });
  }

  getState(): PomodoroState {
    const { phaseStartedAt, ...rest } = this.state;
    void phaseStartedAt;
    return rest;
  }

  getHistory(): PomodoroSessionSummary[] {
    return this.history.slice().sort((a, b) => b.startedAt - a.startedAt);
  }

  clearHistory() {
    this.history = [];
    this.persist();
  }

  updateSettings(next: PomodoroSettings) {
    const normalized = normalizeSettings(next);
    this.state.settings = normalized;
    if (this.state.phase === "idle") {
      this.state.remainingSeconds = normalized.focusMinutes * 60;
      this.state.durationSeconds = normalized.focusMinutes * 60;
    }
    this.persist();
    this.broadcastState();
  }

  control(payload: PomodoroControlPayload) {
    switch (payload.command) {
      case "start":
        this.start();
        break;
      case "pause":
        this.pause();
        break;
      case "resume":
        this.resume();
        break;
      case "skip":
        this.skip();
        break;
      case "reset":
        this.reset();
        break;
      default:
        break;
    }
  }

  private start() {
    if (this.state.phase === "idle") {
      this.beginPhase("focus", this.state.settings.focusMinutes * 60);
    }
    this.state.running = true;
    this.startTimer();
    this.persist();
    this.broadcastState();
  }

  private pause() {
    if (!this.state.running) {
      return;
    }
    this.state.running = false;
    this.stopTimer();
    this.persist();
    this.broadcastState();
  }

  private resume() {
    if (this.state.running || this.state.phase === "idle") {
      return;
    }
    this.state.running = true;
    this.startTimer();
    this.persist();
    this.broadcastState();
  }

  private skip() {
    if (this.state.phase === "idle") {
      return;
    }
    this.completePhase(true);
  }

  private reset() {
    this.stopTimer();
    this.state.phase = "idle";
    this.state.running = false;
    this.state.cycle = 0;
    this.state.remainingSeconds = this.state.settings.focusMinutes * 60;
    this.state.durationSeconds = this.state.settings.focusMinutes * 60;
    this.state.phaseStartedAt = null;
    this.state.updatedAt = Date.now();
    this.persist();
    this.broadcastState();
  }

  private beginPhase(phase: PomodoroPhase, durationSeconds: number) {
    this.state.phase = phase;
    this.state.durationSeconds = durationSeconds;
    this.state.remainingSeconds = durationSeconds;
    this.state.phaseStartedAt = Date.now();
    this.state.updatedAt = Date.now();

    if (phase === "focus") {
      this.state.totalCycles += 1;
    }

    if (this.state.settings.notificationsEnabled) {
      this.showNotification(
        phase === "focus" ? "Focus session" : phase === "longBreak" ? "Long break" : "Break",
        phase === "focus"
          ? "Time to focus 💪"
          : phase === "longBreak"
          ? "Take a relaxing long break ☕"
          : "Short break started",
      );
    }
  }

  private completePhase(skipAutoAdvance: boolean) {
    const completedPhase = this.state.phase;
    const startedAt = this.state.phaseStartedAt ?? Date.now() - this.state.durationSeconds * 1000;
    const endedAt = Date.now();

    if (completedPhase !== "idle") {
      this.history.unshift({
        id: randomUUID(),
        phase: completedPhase,
        startedAt,
        endedAt,
        durationSeconds: this.state.durationSeconds,
      });
      this.history = this.history.slice(0, 200);
    }

    if (completedPhase === "focus") {
      this.state.cycle += 1;
      this.state.completedSessions += 1;
    }

    const nextPhase = this.determineNextPhase(completedPhase);
    this.persist();

    if (skipAutoAdvance) {
      this.state.running = false;
      this.stopTimer();
      this.state.phase = nextPhase === "focus" ? "idle" : nextPhase;
      this.state.remainingSeconds = this.durationForPhase(nextPhase);
      this.state.durationSeconds = this.state.remainingSeconds;
      this.state.phaseStartedAt = null;
      this.state.updatedAt = Date.now();
      this.broadcastState();
      return;
    }

    if (nextPhase === "focus") {
      this.beginPhase("focus", this.state.settings.focusMinutes * 60);
      this.state.running = this.state.settings.autoStartNext;
      if (!this.state.running) {
        this.stopTimer();
      }
    } else if (nextPhase === "shortBreak") {
      this.beginPhase("shortBreak", this.state.settings.shortBreakMinutes * 60);
      this.state.running = this.state.settings.autoStartNext;
      if (!this.state.running) {
        this.stopTimer();
      }
    } else if (nextPhase === "longBreak") {
      this.beginPhase("longBreak", this.state.settings.longBreakMinutes * 60);
      this.state.running = this.state.settings.autoStartNext;
      if (!this.state.running) {
        this.stopTimer();
      }
      if (this.state.running) {
        this.state.cycle = 0;
      }
    }

    if (this.state.running) {
      this.startTimer();
    }
    this.persist();
    this.broadcastState();
  }

  private durationForPhase(phase: PomodoroPhase): number {
    switch (phase) {
      case "focus":
        return this.state.settings.focusMinutes * 60;
      case "shortBreak":
        return this.state.settings.shortBreakMinutes * 60;
      case "longBreak":
        return this.state.settings.longBreakMinutes * 60;
      default:
        return this.state.settings.focusMinutes * 60;
    }
  }

  private determineNextPhase(current: PomodoroPhase): PomodoroPhase {
    if (current === "focus") {
      if (this.state.cycle >= this.state.settings.cyclesBeforeLongBreak) {
        this.state.cycle = 0;
        return "longBreak";
      }
      return "shortBreak";
    }
    return "focus";
  }

  private startTimer() {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      if (!this.state.running) {
        return;
      }
      if (this.state.remainingSeconds > 0) {
        this.state.remainingSeconds -= 1;
        this.state.updatedAt = Date.now();
        this.broadcastState();
      } else {
        this.completePhase(false);
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private showNotification(title: string, body: string) {
    try {
      new Notification({ title, body, silent: false }).show();
    } catch (error) {
      console.warn("Unable to show notification", error);
    }
  }

  private broadcastState() {
    this.persist();
    const state = this.getState();
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(CHANNELS.POMODORO.STATE_EVENT, state);
    }
  }

  private emitState(sender: (channel: string, state: PomodoroState) => void) {
    sender(CHANNELS.POMODORO.STATE_EVENT, this.getState());
  }

  private persist() {
    const { phaseStartedAt, ...rest } = this.state;
    this.store.set("settings", this.state.settings);
    this.store.set("state", {
      ...rest,
      phaseStartedAt,
    });
    this.store.set("history", this.history);
  }
}

export const initializePomodoroFeature = async (app: App) => {
  const service = new PomodoroService(app);

  ipcMain.handle(CHANNELS.POMODORO.GET_STATE, () => service.getState());
  ipcMain.handle(CHANNELS.POMODORO.UPDATE_SETTINGS, (_event, settings: PomodoroSettings) => {
    service.updateSettings(settings);
  });
  ipcMain.handle(CHANNELS.POMODORO.CONTROL, (_event, payload: PomodoroControlPayload) => {
    service.control(payload);
  });
  ipcMain.handle(CHANNELS.POMODORO.GET_HISTORY, () => service.getHistory());
  ipcMain.handle(CHANNELS.POMODORO.CLEAR_HISTORY, () => service.clearHistory());
};





