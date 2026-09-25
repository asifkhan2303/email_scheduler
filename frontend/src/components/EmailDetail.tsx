import { useEffect, useState } from "react";
import { EmailDetail as EmailDetailType, EmailSummary } from "../types/email";
import { api, errorMessage } from "../services/api";
import { Avatar } from "./ui/Avatar";
import { StatusChip } from "./ui/StatusChip";
import { formatFullDate } from "../lib/format";
import { bodyToHtml } from "../lib/html";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useToast } from "../context/ToastContext";

interface EmailDetailProps {
  summary: EmailSummary;
  onBack: () => void;
  onCancelled: () => void;
}

export function EmailDetailView({ summary, onBack, onCancelled }: EmailDetailProps) {
  const [email, setEmail] = useState<EmailDetailType | null>(null);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    let cancelled = false;
    setEmail(null);
    setError("");

    api.emails
      .get(summary.id)
      .then((res) => !cancelled && setEmail(res.email))
      .catch((err) => !cancelled && setError(errorMessage(err, "Unable to load this email")));

    return () => {
      cancelled = true;
    };
  }, [summary.id]);

  async function cancelSend() {
    setCancelling(true);
    try {
      await api.emails.cancel(summary.id);
      showToast("Scheduled email cancelled");
      onCancelled();
    } catch (err) {
      showToast(errorMessage(err, "Could not cancel this email"), "error");
    } finally {
      setCancelling(false);
      setConfirmCancel(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="rounded-full p-1.5 text-ink-muted hover:bg-surface" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5m7-7-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="truncate text-sm font-semibold text-ink">{summary.subject}</h2>
        </div>

        {summary.status === "scheduled" && (
          <button
            onClick={() => setConfirmCancel(true)}
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface"
          >
            Cancel send
          </button>
        )}
      </div>

      <div className="px-6 py-5">
        <div className="mb-5 flex items-start gap-3">
          <Avatar name={summary.recipient} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-ink">{summary.sender}</span>
              <StatusChip status={summary.status} />
            </div>
            <div className="text-xs text-ink-muted">To: {summary.recipient}</div>
          </div>
          <div className="shrink-0 text-xs text-ink-muted">
            {summary.status === "sent" || summary.status === "failed"
              ? summary.sent_time && formatFullDate(summary.sent_time)
              : formatFullDate(summary.scheduled_time)}
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        {email?.error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{email.error}</p>
        )}

        {!email && !error ? (
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-line" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-line" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
          </div>
        ) : email ? (
          <div className="rich-text text-sm text-ink" dangerouslySetInnerHTML={{ __html: bodyToHtml(email.body) }} />
        ) : null}

        {email?.preview_url && (
          <a
            href={email.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-dark hover:underline"
          >
            View delivered message on Ethereal ↗
          </a>
        )}
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title="Cancel this send?"
          description="This scheduled email will be removed and will not be sent."
          confirmLabel="Cancel send"
          busy={cancelling}
          onConfirm={cancelSend}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </div>
  );
}
