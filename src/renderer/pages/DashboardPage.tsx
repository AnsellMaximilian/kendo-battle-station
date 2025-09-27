import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  TabStrip,
  TabStripSelectEventArguments,
  TabStripTab,
  TileLayout,
  TileLayoutRepositionEvent,
} from "@progress/kendo-react-layout";
import { Button } from "@progress/kendo-react-buttons";

import {
  MetricCard,
  type MetricCardProps,
} from "../components/dashboard/MetricCard";
import { RuntimeInfoCard } from "../components/dashboard/RuntimeInfoCard";
import {
  PerformancePanel,
  type PerformanceMetric,
} from "../components/dashboard/PerformancePanel";
import {
  ProductivityChart,
  type ProductivityDatum,
} from "../components/dashboard/ProductivityChart";
import {
  RecentActivityGrid,
  type ActivityItem,
} from "../components/dashboard/RecentActivityGrid";
import type {
  DashboardLayoutPosition,
  SystemMetrics,
} from "../../shared/types";

const defaultPositions: DashboardLayoutPosition[] = [
  { order: 0, col: 1, row: 1, colSpan: 6, rowSpan: 2 },
  { order: 1, col: 7, row: 1, colSpan: 3, rowSpan: 1 },
  { order: 2, col: 7, row: 2, colSpan: 3, rowSpan: 1 },
  { order: 3, col: 10, row: 1, colSpan: 3, rowSpan: 2 },
  { order: 4, col: 1, row: 3, colSpan: 8, rowSpan: 3 },
  { order: 5, col: 9, row: 3, colSpan: 4, rowSpan: 3 },
];

const appMetricCards: MetricCardProps[] = [
  {
    title: "Clips captured",
    value: "128",
    helperText: "Today across all boards",
    icon: "copy",
    change: { trend: "up", label: "+12% vs yesterday" },
  },
  {
    title: "Tagged snippets",
    value: "86%",
    helperText: "Tagged clips this week",
    icon: "bookmark",
    change: { trend: "up", label: "+8 new tags" },
  },
  {
    title: "OCR queue",
    value: "6",
    helperText: "Images awaiting recognition",
    icon: "image",
    change: { trend: "down", label: "-2 pending" },
  },
  {
    title: "Storage health",
    value: "99.9%",
    helperText: "Indexed assets available",
    icon: "database",
  },
  {
    title: "Focus streak",
    value: "6",
    helperText: "Sessions completed today",
    icon: "clock",
    change: { trend: "up", label: "+2 vs goal" },
  },
];

const performanceMetrics: PerformanceMetric[] = [
  { id: "focus", label: "Focus minutes", value: 132, goal: 160 },
  { id: "break", label: "Break minutes", value: 38, goal: 40 },
  { id: "sessions", label: "Pomodoro sessions", value: 9, goal: 12 },
];

const productivityData: ProductivityDatum[] = [
  { day: "Mon", focusMinutes: 110, breakMinutes: 30 },
  { day: "Tue", focusMinutes: 125, breakMinutes: 34 },
  { day: "Wed", focusMinutes: 132, breakMinutes: 38 },
  { day: "Thu", focusMinutes: 118, breakMinutes: 33 },
  { day: "Fri", focusMinutes: 140, breakMinutes: 36 },
  { day: "Sat", focusMinutes: 96, breakMinutes: 28 },
  { day: "Sun", focusMinutes: 88, breakMinutes: 26 },
];

const roadmapItems = [
  {
    id: "storage-taxonomy",
    title: "Storage knowledge taxonomy",
    detail: "Define schemas for boards, tags, and retention policies",
  },
  {
    id: "clipboard-ocr",
    title: "Clipboard OCR pipeline",
    detail: "Wire renderer worker with tesseract.js and progress updates",
  },
  {
    id: "timer-float",
    title: "Always-on timer",
    detail: "Implement floating window controls and presets",
  },
];

const toNumber = (value: unknown, fallback: number | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

const sanitizePositions = (
  input: readonly Partial<DashboardLayoutPosition>[],
  fallback: readonly DashboardLayoutPosition[]
): DashboardLayoutPosition[] =>
  fallback.map((base, index) => {
    const match = input.find((candidate) => candidate.order === base.order);
    const candidate = match ?? input[index] ?? {};
    return {
      order: base.order,
      col: toNumber(candidate.col, base.col) ?? base.col,
      row: toNumber(candidate.row, base.row),
      colSpan: toNumber(candidate.colSpan, base.colSpan),
      rowSpan: toNumber(candidate.rowSpan, base.rowSpan),
    };
  });

const formatBytes = (bytes: number | undefined) => {
  if (!bytes || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

const formatDuration = (seconds: number | undefined) => {
  if (!seconds) {
    return "0s";
  }
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

const formatRelativeTime = (timestamp: number | undefined) => {
  if (!timestamp) {
    return "waiting for metrics";
  }
  const delta = Date.now() - timestamp;
  if (delta < 1000) {
    return "updated just now";
  }
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) {
    return `updated ${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `updated ${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `updated ${hours}h ago`;
};

const toPlatformLabel = () => {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = nav.userAgentData?.platform ?? nav.platform;
  const ua = nav.userAgent;
  if (platform) {
    return `${platform} | ${ua}`;
  }
  return ua;
};

const TileHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) => (
  <div className="tile-header">
    <div>
      <div className="tile-header__title">{title}</div>
      {subtitle && <div className="tile-header__subtitle">{subtitle}</div>}
    </div>
    {actions && <div className="tile-header__actions">{actions}</div>}
  </div>
);

export const DashboardPage = () => {
  const [positions, setPositions] =
    useState<DashboardLayoutPosition[]>(defaultPositions);
  const [metricsTab, setMetricsTab] = useState(0);
  const [systemMetrics, setSystemMetrics] = useState<
    SystemMetrics | undefined
  >();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await window.api.dashboard.getLayout();
        if (!cancelled && stored && stored.length > 0) {
          setPositions(sanitizePositions(stored, defaultPositions));
        }
      } catch (error) {
        console.error("Failed to load dashboard layout", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchMetrics = async () => {
      try {
        const metrics = await window.api.dashboard.getSystemMetrics();
        if (!cancelled) {
          setSystemMetrics(metrics);
        }
      } catch (error) {
        console.error("Failed to load system metrics", error);
      }
    };

    fetchMetrics();
    const interval = window.setInterval(fetchMetrics, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const persistLayout = useCallback(
    (value: readonly Partial<DashboardLayoutPosition>[]) => {
      setPositions((current) => {
        const baseline =
          current.length === defaultPositions.length
            ? current
            : defaultPositions;
        const next = sanitizePositions(value, baseline);
        void window.api.dashboard.saveLayout(next).catch((error) => {
          console.error("Failed to persist dashboard layout", error);
        });
        return next;
      });
    },
    []
  );

  const handleReposition = useCallback(
    (event: TileLayoutRepositionEvent) => {
      persistLayout(event.value as DashboardLayoutPosition[]);
    },
    [persistLayout]
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const activityItems = useMemo<ActivityItem[]>(() => {
    const now = Date.now();
    const minutesAgo = (minutes: number) => new Date(now - minutes * 60 * 1000);
    return [
      {
        id: "activity-1",
        time: timeFormatter.format(minutesAgo(12)),
        feature: "Clipboard",
        summary: "Captured rich text snippet from browser",
        status: "Success",
      },
      {
        id: "activity-2",
        time: timeFormatter.format(minutesAgo(38)),
        feature: "Storage",
        summary: "Indexed 4 new assets in Research board",
        status: "Indexed",
      },
      {
        id: "activity-3",
        time: timeFormatter.format(minutesAgo(56)),
        feature: "Pomodoro",
        summary: "Focus session completed with auto-start enabled",
        status: "Completed",
      },
      {
        id: "activity-4",
        time: timeFormatter.format(minutesAgo(74)),
        feature: "Timer",
        summary: "Always-on timer pinned to top-left corner",
        status: "Pinned",
      },
    ];
  }, [timeFormatter]);

  const runtimeInfo = useMemo(
    () => ({
      electron: window.api.versions.electron,
      chrome: window.api.versions.chrome,
      node: window.api.versions.node,
      platformLabel: toPlatformLabel(),
    }),
    []
  );

  const systemMetricCards = useMemo<MetricCardProps[]>(() => {
    if (!systemMetrics) {
      return [
        {
          title: "CPU usage",
          value: "--",
          helperText: "Collecting samples",
          icon: "graph",
        },
        {
          title: "Memory usage",
          value: "--",
          helperText: "Collecting samples",
          icon: "memory",
        },
        {
          title: "App footprint",
          value: "--",
          helperText: "Collecting samples",
          icon: "application-window",
        },
        {
          title: "System uptime",
          value: "--",
          helperText: "Collecting samples",
          icon: "time",
        },
      ];
    }

    return [
      {
        title: "CPU usage",
        value: `${systemMetrics.cpu.usagePercent.toFixed(1)}%`,
        helperText: `${systemMetrics.cpu.cores} logical cores`,
        icon: "graph",
      },
      {
        title: "Memory usage",
        value: `${systemMetrics.memory.usagePercent.toFixed(1)}%`,
        helperText: `${formatBytes(systemMetrics.memory.used)} of ${formatBytes(systemMetrics.memory.total)}`,
        icon: "memory",
      },
      {
        title: "App footprint",
        value: `${formatBytes(systemMetrics.appMemory.rss)}`,
        helperText: `${formatBytes(systemMetrics.appMemory.heap)} heap in use`,
        icon: "application-window",
      },
      {
        title: "System uptime",
        value: formatDuration(systemMetrics.uptimeSeconds),
        helperText: systemMetrics.loadAverage
          ? `1m load avg ${systemMetrics.loadAverage.toFixed(2)}`
          : "Load average unavailable",
        icon: "time",
      },
    ];
  }, [systemMetrics]);

  const systemPerformanceMetrics = useMemo<PerformanceMetric[]>(() => {
    if (!systemMetrics) {
      return [
        { id: "cpu", label: "CPU usage", value: 0, goal: 100 },
        { id: "memory", label: "Memory usage", value: 0, goal: 100 },
      ];
    }
    return [
      {
        id: "cpu",
        label: "CPU usage",
        value: Number(systemMetrics.cpu.usagePercent.toFixed(1)),
        goal: 100,
      },
      {
        id: "memory",
        label: "Memory usage",
        value: Number(systemMetrics.memory.usagePercent.toFixed(1)),
        goal: 100,
      },
    ];
  }, [systemMetrics]);

  const metricsTabs = useMemo(
    () => [
      { id: "app", title: "Battle Station", metrics: appMetricCards },
      { id: "system", title: "System", metrics: systemMetricCards },
    ],
    [systemMetricCards]
  );

  const tileItems = useMemo(
    () => [
      {
        header: (
          <TileHeader
            title="Insights overview"
            subtitle="Switch between application and host metrics"
          />
        ),
        body: (
          <div className="dashboard-tile">
            <TabStrip
              selected={metricsTab}
              onSelect={(event: TabStripSelectEventArguments) =>
                setMetricsTab(event.selected)
              }
            >
              {metricsTabs.map((tab) => (
                <TabStripTab key={tab.id} title={tab.title}>
                  <div className="metrics-grid">
                    {tab.metrics.map((metric) => (
                      <MetricCard
                        key={`${tab.id}-${metric.title}`}
                        {...metric}
                      />
                    ))}
                  </div>
                </TabStripTab>
              ))}
            </TabStrip>
          </div>
        ),
      },
      {
        header: (
          <TileHeader
            title="Runtime overview"
            subtitle="Environment details from the preload bridge"
          />
        ),
        body: (
          <div className="dashboard-tile">
            <RuntimeInfoCard runtime={runtimeInfo} />
          </div>
        ),
      },
      {
        header: (
          <TileHeader
            title="Focus performance"
            subtitle="Today's progress toward personal goals"
            actions={
              <Button
                size="small"
                onClick={() => undefined}
                title="Open Pomodoro settings"
              >
                Adjust goals
              </Button>
            }
          />
        ),
        body: (
          <div className="dashboard-tile">
            <PerformancePanel metrics={performanceMetrics} />
          </div>
        ),
      },
      {
        header: (
          <TileHeader
            title="System health"
            subtitle={formatRelativeTime(systemMetrics?.timestamp)}
            actions={
              <Button
                size="small"
                icon="refresh"
                onClick={() =>
                  window.api.dashboard
                    .getSystemMetrics()
                    .then(setSystemMetrics)
                    .catch((error) => {
                      console.error("Failed to refresh system metrics", error);
                    })
                }
              >
                Refresh
              </Button>
            }
          />
        ),
        body: (
          <div className="dashboard-tile">
            <PerformancePanel metrics={systemPerformanceMetrics} />
          </div>
        ),
      },
      {
        header: (
          <TileHeader
            title="Latest activity"
            subtitle="Recent events captured across modules"
            actions={
              <Button
                size="small"
                icon="arrow-right"
                onClick={() => undefined}
                title="View full activity log"
              >
                View log
              </Button>
            }
          />
        ),
        body: (
          <div className="dashboard-tile activity-grid">
            <RecentActivityGrid items={activityItems} />
          </div>
        ),
      },
      {
        header: (
          <TileHeader
            title="Upcoming milestones"
            subtitle="Planning queue for the Battle Station releases"
          />
        ),
        body: (
          <div className="dashboard-tile">
            <ProductivityChart data={productivityData} />
            <div className="dashboard-list">
              {roadmapItems.map((item) => (
                <div key={item.id} className="dashboard-list__item">
                  <div>
                    <div className="dashboard-list__primary">{item.title}</div>
                    <div className="dashboard-list__secondary">
                      {item.detail}
                    </div>
                  </div>
                  <span className="k-icon k-i-arrow-right" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        ),
      },
    ],
    [
      activityItems,
      metricsTab,
      metricsTabs,
      runtimeInfo,
      systemMetrics?.timestamp,
      systemPerformanceMetrics,
    ]
  );

  return (
    <TileLayout
      columns={12}
      rowHeight={140}
      gap={{ columns: 16, rows: 16 }}
      items={tileItems}
      positions={positions}
      style={{ minHeight: "70vh" }}
      onReposition={handleReposition}
    />
  );
};
