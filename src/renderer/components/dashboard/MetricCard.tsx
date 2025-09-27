export interface MetricCardProps {
  title: string;
  value: string;
  helperText?: string;
  icon?: string;
  change?: {
    trend: "up" | "down";
    label: string;
  };
}

export const MetricCard = ({ title, value, helperText, icon, change }: MetricCardProps) => (
  <div className="metric-card">
    <div className="metric-card__heading">
      {icon && <span className={`k-icon k-i-${icon} metric-card__icon`} aria-hidden="true" />}
      <span className="metric-card__title">{title}</span>
    </div>
    <div className="metric-card__value">{value}</div>
    {helperText && <div className="metric-card__helper">{helperText}</div>}
    {change && (
      <div
        className={`metric-card__change metric-card__change--${change.trend}`}
      >
        <span className={`k-icon k-i-${change.trend === "up" ? "caret-alt-up" : "caret-alt-down"}`} aria-hidden="true" />
        <span>{change.label}</span>
      </div>
    )}
  </div>
);
