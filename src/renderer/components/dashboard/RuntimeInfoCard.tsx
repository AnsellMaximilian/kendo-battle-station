interface RuntimeInfo {
  electron?: string;
  chrome?: string;
  node?: string;
  platformLabel: string;
}

interface RuntimeInfoCardProps {
  runtime: RuntimeInfo;
}

export const RuntimeInfoCard = ({ runtime }: RuntimeInfoCardProps) => (
  <div className="runtime-card">
    <div className="runtime-card__grid">
      <div className="runtime-card__item">
        <span className="runtime-card__label">Electron</span>
        <span className="runtime-card__value">{runtime.electron ?? "n/a"}</span>
      </div>
      <div className="runtime-card__item">
        <span className="runtime-card__label">Chrome</span>
        <span className="runtime-card__value">{runtime.chrome ?? "n/a"}</span>
      </div>
      <div className="runtime-card__item">
        <span className="runtime-card__label">Node.js</span>
        <span className="runtime-card__value">{runtime.node ?? "n/a"}</span>
      </div>
      <div className="runtime-card__item runtime-card__item--wide">
        <span className="runtime-card__label">Detected platform</span>
        <span className="runtime-card__value">{runtime.platformLabel}</span>
      </div>
    </div>
    <p className="runtime-card__helper">
      Values are read from the preload bridge when available and fall back to the browser runtime, keeping the shell portable across desktop platforms.
    </p>
  </div>
);
