import { EmailStatus } from "../../types/email";

const STYLES: Record<EmailStatus, string> = {
  scheduled: "bg-chip-bg text-chip-text border border-chip-border",
  processing: "bg-blue-50 text-blue-700 border border-blue-200",
  sent: "bg-brand-soft text-brand-dark border border-brand/30",
  failed: "bg-red-50 text-red-600 border border-red-200"
};

const LABELS: Record<EmailStatus, string> = {
  scheduled: "Scheduled",
  processing: "Sending",
  sent: "Sent",
  failed: "Failed"
};

export function StatusChip({ status }: { status: EmailStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
