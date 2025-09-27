interface PagePlaceholderProps {
  title: string;
  description: string;
}

export const PagePlaceholder = ({ title, description }: PagePlaceholderProps) => (
  <div className="placeholder-card">
    <h2>{title}</h2>
    <p>{description}</p>
  </div>
);
