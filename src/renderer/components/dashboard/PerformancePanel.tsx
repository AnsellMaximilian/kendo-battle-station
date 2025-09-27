import { ProgressBar } from "@progress/kendo-react-progressbars";

export interface PerformanceMetric {
  id: string;
  label: string;
  value: number;
  goal: number;
}

interface PerformancePanelProps {
  metrics: PerformanceMetric[];
}

const formatPercent = (value: number, goal: number) => {
  if (!goal) {
    return "0%";
  }
  return `${Math.round((value / goal) * 100)}%`;
};

export const PerformancePanel = ({ metrics }: PerformancePanelProps) => (
  <div className="performance-panel">
    {metrics.map((metric) => {
      const percent = metric.goal
        ? Math.min((metric.value / metric.goal) * 100, 100)
        : 0;
      return (
        <div key={metric.id} className="performance-panel__row">
          <div className="performance-panel__label">
            <span className="performance-panel__label-primary">{metric.label}</span>
            <span className="performance-panel__label-secondary">
              {metric.value} / {metric.goal}
            </span>
          </div>
          <div className="performance-panel__progress">
            <ProgressBar value={percent} animation={true} labelVisible={false} />
            <span className="performance-panel__percent-text">
              {formatPercent(metric.value, metric.goal)}
            </span>
          </div>
        </div>
      );
    })}
  </div>
);
