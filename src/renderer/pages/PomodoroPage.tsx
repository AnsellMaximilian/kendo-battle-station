import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@progress/kendo-react-buttons";
import {
  Input,
  NumericTextBox,
  Switch,
  SwitchChangeEvent,
} from "@progress/kendo-react-inputs";
import { ProgressBar } from "@progress/kendo-react-progressbars";
import {
  TabStrip,
  TabStripSelectEventArguments,
  TabStripTab,
} from "@progress/kendo-react-layout";

import { MetricCard } from "../components/dashboard/MetricCard";
import type {
  MetricCardProps,
} from "../components/dashboard/MetricCard";
import type {
  PomodoroControlPayload,
  PomodoroPhase,
  PomodoroSessionSummary,
  PomodoroSettings,
  PomodoroState,
} from "../../shared/types";

const phaseLabels: Record<PomodoroPhase, string> = {
  idle: "Idle",
  focus: "Focus",
  shortBreak: "Short Break",
  longBreak: "Long Break",
};

const formatTime = (seconds: number) => {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const secs = (clamped % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
};

export const PomodoroPage = () => {
  const [state, setState] = useState<PomodoroState | null>(null);
  const [history, setHistory] = useState<PomodoroSessionSummary[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<PomodoroSettings | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [filterTerm, setFilterTerm] = useState("");

  const lastCompletedSessions = useRef<number | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const [initialState, sessionHistory] = await Promise.all([
          window.api.pomodoro.getState(),
          window.api.pomodoro.getHistory(),
        ]);
        setState(initialState);
        setSettingsDraft(initialState.settings);
        setHistory(sessionHistory);
        lastCompletedSessions.current = initialState.completedSessions;
      } catch (error) {
        console.error("Failed to load Pomodoro state", error);
      }
      unsubscribe = window.api.pomodoro.onStateChanged((next) => {
        setState(next);
      });
    })();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (!state) {
      return;
    }
    if (!settingsDirty) {
      setSettingsDraft(state.settings);
    }
    if (lastCompletedSessions.current !== state.completedSessions) {
      lastCompletedSessions.current = state.completedSessions;
      void window.api.pomodoro.getHistory().then(setHistory).catch((error) => {
        console.error("Failed to refresh Pomodoro history", error);
      });
    }
  }, [state, settingsDirty]);

  const handleControl = useCallback(
    async (command: PomodoroControlPayload["command"]) => {
      setIsPerformingAction(true);
      try {
        await window.api.pomodoro.control({ command });
      } catch (error) {
        console.error("Failed to execute Pomodoro command", error);
      } finally {
        setIsPerformingAction(false);
      }
    },
    [],
  );

  const handleSettingChange = <K extends keyof PomodoroSettings>(key: K, value: PomodoroSettings[K]) => {
    if (!settingsDraft) {
      return;
    }
    setSettingsDraft({ ...settingsDraft, [key]: value });
    setSettingsDirty(true);
  };

  const handleSettingsSave = async () => {
    if (!settingsDraft) {
      return;
    }
    setIsSavingSettings(true);
    try {
      await window.api.pomodoro.updateSettings(settingsDraft);
      setSettingsDirty(false);
    } catch (error) {
      console.error("Failed to update Pomodoro settings", error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSettingsReset = () => {
    if (state) {
      setSettingsDraft(state.settings);
    }
    setSettingsDirty(false);
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Clear Pomodoro session history?")) {
      return;
    }
    try {
      await window.api.pomodoro.clearHistory();
      setHistory([]);
    } catch (error) {
      console.error("Failed to clear history", error);
    }
  };

  const nowState = state ?? undefined;
  const duration = nowState?.durationSeconds ?? 0;
  const remaining = nowState?.remainingSeconds ?? duration;
  const elapsed = duration > 0 ? duration - remaining : 0;
  const progressValue = duration > 0 ? (elapsed / duration) * 100 : 0;

  const summaryCards: MetricCardProps[] = useMemo(() => {
    if (!nowState) {
      return [
        { title: "Current phase", value: "--", helperText: "Awaiting state" },
        { title: "Cycle", value: "--", helperText: "Focus sessions" },
        { title: "Completed", value: "--", helperText: "Focus sessions today" },
        { title: "Next step", value: "--", helperText: "Pending" },
      ];
    }
    const nextPhase = nowState.phase === "focus"
      ? (nowState.cycle >= nowState.settings.cyclesBeforeLongBreak ? "longBreak" : "shortBreak")
      : "focus";
    return [
      {
        title: "Current phase",
        value: phaseLabels[nowState.phase],
        helperText: nowState.running ? "Timer in progress" : "Timer paused",
      },
      {
        title: "Cycle",
        value: `${nowState.cycle}/${nowState.settings.cyclesBeforeLongBreak}`,
        helperText: "Focus sessions until long break",
      },
      {
        title: "Completed",
        value: nowState.completedSessions.toString(),
        helperText: "Focus sessions completed",
      },
      {
        title: "Next step",
        value: phaseLabels[nextPhase],
        helperText: nextPhase === "focus" ? "Back to work" : "Take a break",
      },
    ];
  }, [nowState]);

  const filteredHistory = useMemo(() => {
    const term = filterTerm.trim().toLowerCase();
    if (!term) {
      return history;
    }
    return history.filter((session) => {
      const label = `${phaseLabels[session.phase]} ${formatDuration(session.durationSeconds)}`.toLowerCase();
      return label.includes(term);
    });
  }, [history, filterTerm]);

  const actionPrimaryLabel = useMemo(() => {
    if (!nowState) {
      return "Start";
    }
    if (nowState.phase === "idle") {
      return "Start";
    }
    if (nowState.running) {
      return "Pause";
    }
    return "Resume";
  }, [nowState]);

  const handlePrimaryAction = () => {
    if (!nowState) {
      handleControl("start").catch(() => undefined);
      return;
    }
    if (nowState.phase === "idle") {
      handleControl("start").catch(() => undefined);
    } else if (nowState.running) {
      handleControl("pause").catch(() => undefined);
    } else {
      handleControl("resume").catch(() => undefined);
    }
  };

  return (
    <div className="pomodoro-page">
      <div className="pomodoro-header">
        <div>
          <h1>Pomodoro Focus Studio</h1>
          <p className="pomodoro-header__subtitle">
            Guide your focus and recovery cycles with persistent timers, alerts, and history.
          </p>
        </div>
        <div className="pomodoro-header__controls">
          <Button
            themeColor="primary"
            onClick={handlePrimaryAction}
            disabled={isPerformingAction}
          >
            {actionPrimaryLabel}
          </Button>
          <Button
            look="outline"
            onClick={() => handleControl("skip")}
            disabled={isPerformingAction || !nowState || nowState.phase === "idle"}
          >
            Skip
          </Button>
          <Button
            look="flat"
            onClick={() => handleControl("reset")}
            disabled={isPerformingAction}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="metrics-grid pomodoro-metrics">
        {summaryCards.map((card) => (
          <MetricCard key={card.title} {...card} />
        ))}
      </div>

      <div className="pomodoro-timer-card">
        <div className="pomodoro-timer-card__left">
          <div className="pomodoro-timer-card__time">{formatTime(remaining)}</div>
          <ProgressBar value={progressValue} labelVisible={false} />
          <div className="pomodoro-timer-card__phase-label">
            {nowState ? phaseLabels[nowState.phase] : "Loading"}
            {nowState && nowState.phase !== "idle" && (
              <span className="pomodoro-timer-card__status">
                {nowState.running ? "Running" : "Paused"}
              </span>
            )}
          </div>
        </div>
        <div className="pomodoro-timer-card__right">
          <div className="pomodoro-settings-toggle">
            <Switch
              checked={settingsDraft?.autoStartNext ?? false}
              onChange={(event: SwitchChangeEvent) =>
                handleSettingChange("autoStartNext", event.value ?? false)
              }
            />
            <div>
              <div className="pomodoro-settings-toggle__title">Auto-start next phase</div>
              <div className="pomodoro-settings-toggle__subtitle">
                Continue automatically when a session completes
              </div>
            </div>
          </div>
          <div className="pomodoro-settings-toggle">
            <Switch
              checked={settingsDraft?.notificationsEnabled ?? true}
              onChange={(event: SwitchChangeEvent) =>
                handleSettingChange("notificationsEnabled", event.value ?? false)
              }
            />
            <div>
              <div className="pomodoro-settings-toggle__title">Desktop notifications</div>
              <div className="pomodoro-settings-toggle__subtitle">
                Alert me when focus or breaks begin
              </div>
            </div>
          </div>
          <div className="pomodoro-settings-toggle">
            <Switch
              checked={settingsDraft?.soundEnabled ?? false}
              onChange={(event: SwitchChangeEvent) =>
                handleSettingChange("soundEnabled", event.value ?? false)
              }
            />
            <div>
              <div className="pomodoro-settings-toggle__title">Sound cues</div>
              <div className="pomodoro-settings-toggle__subtitle">Play an audible alert on transitions</div>
            </div>
          </div>
        </div>
      </div>

      <div className="pomodoro-tabs">
        <TabStrip selected={activeTab} onSelect={(event: TabStripSelectEventArguments) => setActiveTab(event.selected)}>
          <TabStripTab title="Durations">
            <div className="pomodoro-settings-grid">
              <div className="pomodoro-settings-field">
                <label htmlFor="focus-minutes">Focus minutes</label>
                <NumericTextBox
                  id="focus-minutes"
                  min={5}
                  max={120}
                  value={settingsDraft?.focusMinutes}
                  onChange={(event) =>
                    handleSettingChange("focusMinutes", event.value ?? DEFAULT_SETTINGS.focusMinutes)
                  }
                />
              </div>
              <div className="pomodoro-settings-field">
                <label htmlFor="short-break">Short break minutes</label>
                <NumericTextBox
                  id="short-break"
                  min={1}
                  max={60}
                  value={settingsDraft?.shortBreakMinutes}
                  onChange={(event) =>
                    handleSettingChange(
                      "shortBreakMinutes",
                      event.value ?? DEFAULT_SETTINGS.shortBreakMinutes,
                    )
                  }
                />
              </div>
              <div className="pomodoro-settings-field">
                <label htmlFor="long-break">Long break minutes</label>
                <NumericTextBox
                  id="long-break"
                  min={5}
                  max={60}
                  value={settingsDraft?.longBreakMinutes}
                  onChange={(event) =>
                    handleSettingChange(
                      "longBreakMinutes",
                      event.value ?? DEFAULT_SETTINGS.longBreakMinutes,
                    )
                  }
                />
              </div>
              <div className="pomodoro-settings-field">
                <label htmlFor="cycles">Cycles before long break</label>
                <NumericTextBox
                  id="cycles"
                  min={2}
                  max={10}
                  value={settingsDraft?.cyclesBeforeLongBreak}
                  onChange={(event) =>
                    handleSettingChange(
                      "cyclesBeforeLongBreak",
                      event.value ?? DEFAULT_SETTINGS.cyclesBeforeLongBreak,
                    )
                  }
                />
              </div>
            </div>
            <div className="pomodoro-settings-actions">
              <Button
                themeColor="primary"
                onClick={handleSettingsSave}
                disabled={!settingsDirty || isSavingSettings}
              >
                Save settings
              </Button>
              <Button look="flat" onClick={handleSettingsReset} disabled={!settingsDirty || isSavingSettings}>
                Revert
              </Button>
            </div>
          </TabStripTab>
          <TabStripTab title="History">
            <div className="pomodoro-history-header">
              <Input
                value={filterTerm}
                onChange={(event) => setFilterTerm(event.value ?? "")}
                placeholder="Filter history"
              />
              <Button look="flat" onClick={handleClearHistory}>Clear history</Button>
            </div>
            <div className="pomodoro-history-list">
              {filteredHistory.length === 0 ? (
                <div className="pomodoro-history-empty">No sessions recorded yet.</div>
              ) : (
                filteredHistory.map((session) => (
                  <div key={session.id} className="pomodoro-history-item">
                    <div>
                      <div className="pomodoro-history-item__title">{phaseLabels[session.phase]}</div>
                      <div className="pomodoro-history-item__meta">
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(session.startedAt)}
                      </div>
                    </div>
                    <div className="pomodoro-history-item__duration">
                      {formatDuration(session.durationSeconds)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabStripTab>
        </TabStrip>
      </div>
    </div>
  );
};

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
  autoStartNext: true,
  soundEnabled: false,
  notificationsEnabled: true,
};


