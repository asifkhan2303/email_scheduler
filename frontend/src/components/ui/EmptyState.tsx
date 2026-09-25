interface EmptyStateProps {
  icon: "clock" | "sent" | "search";
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

const ICON_PATHS: Record<EmptyStateProps["icon"], string> = {
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  sent: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z",
  search: "M21 21l-4.35-4.35M17 10.5A6.5 6.5 0 114 10.5a6.5 6.5 0 0113 0z"
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line py-20 text-center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-muted">
        <path d={ICON_PATHS[icon]} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-xs text-sm text-ink-muted">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
