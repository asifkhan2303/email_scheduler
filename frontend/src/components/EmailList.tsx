import { EmailKind, EmailSummary } from "../types/email";
import { formatChipTime } from "../lib/format";
import { StatusChip } from "./ui/StatusChip";
import { EmptyState } from "./ui/EmptyState";
import { EmailListSkeleton } from "./ui/Skeleton";

interface EmailListProps {
  kind: EmailKind;
  emails: EmailSummary[];
  loading: boolean;
  hasQuery: boolean;
  selectedId: string | null;
  onSelect: (email: EmailSummary) => void;
  onCompose: () => void;
}

export function EmailList({ kind, emails, loading, hasQuery, selectedId, onSelect, onCompose }: EmailListProps) {
  if (loading) return <EmailListSkeleton />;

  if (!emails.length) {
    if (hasQuery) {
      return <EmptyState icon="search" title="No matches" description="Try a different name, email, or subject." />;
    }

    return kind === "scheduled" ? (
      <EmptyState
        icon="clock"
        title="Nothing scheduled"
        description="Compose an email and pick a send time to see it here."
        action={{ label: "Compose New Email", onClick: onCompose }}
      />
    ) : (
      <EmptyState icon="sent" title="Nothing sent yet" description="Emails appear here once they've gone out." />
    );
  }

  return (
    <ul className="divide-y divide-line">
      {emails.map((email) => (
        <li key={email.id}>
          <button
            onClick={() => onSelect(email)}
            className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 text-left transition-colors hover:bg-surface ${
              selectedId === email.id ? "bg-brand-soft/60" : ""
            }`}
          >
            <span className="truncate text-sm text-ink-muted">
              <span className="text-ink">To: {email.recipient}</span>
            </span>

            <span className="justify-self-end text-ink-muted">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-0 hover:opacity-100">
                <path d="M12 17.75l-6.16 3.24 1.18-6.88L2 9.24l6.92-1L12 2l3.08 6.24 6.92 1-5.02 4.87 1.18 6.88z" />
              </svg>
            </span>

            <span className="col-span-2 flex min-w-0 items-center gap-2 text-sm">
              {kind === "scheduled" ? (
                <span className="shrink-0 rounded-full bg-chip-bg px-2.5 py-0.5 text-xs font-medium text-chip-text">
                  {formatChipTime(email.scheduled_time)}
                </span>
              ) : (
                <StatusChip status={email.status} />
              )}

              <span className="truncate">
                <span className="font-medium text-ink">{email.subject}</span>
                <span className="text-ink-muted"> · {email.preview}</span>
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
