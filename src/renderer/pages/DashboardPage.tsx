import { useMemo } from "react";
import type { ReactNode } from "react";
import { TileLayout, TileLayoutItem } from "@progress/kendo-react-layout";
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
import type { AppAPI } from "../../shared/types";

const metrics: MetricCardProps[] = [
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

const getRuntimeBridge = (): AppAPI | undefined => {
  return (globalThis as typeof globalThis & { api?: AppAPI }).api;
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
  const runtimeInfo = useMemo(() => {
    const api = getRuntimeBridge();
    return {
      electron: api?.versions.electron,
      chrome: api?.versions.chrome,
      node: api?.versions.node,
      platformLabel: toPlatformLabel(),
    };
  }, []);

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

  const tileItems = useMemo<TileLayoutItem[]>(
    () => [
      {
        order: 0,
        colSpan: 6,
        rowSpan: 2,
        header: (
          <TileHeader
            title="Key insights"
            subtitle="Snapshots across clipboard, storage, and focus"
          />
        ),
        body: (
          <div className="dashboard-tile">
            <div className="metrics-grid">
              {metrics.map((metric) => (
                <MetricCard key={metric.title} {...metric} />
              ))}
            </div>
          </div>
        ),
      },
      {
        order: 1,
        colSpan: 3,
        rowSpan: 2,
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
        order: 2,
        colSpan: 3,
        rowSpan: 2,
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
        order: 3,
        colSpan: 8,
        rowSpan: 3,
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
        order: 4,
        colSpan: 4,
        rowSpan: 3,
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
    [activityItems, runtimeInfo]
  );

  return (
    <TileLayout
      id="SWAGGER"
      columns={12}
      rowHeight={140}
      gap={{ columns: 16, rows: 16 }}
      items={[tileItems[tileItems.length - 3]]}
      style={{ minHeight: "70vh" }}
    />
  );
};
