import { FormEvent, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "../services/api";
import { parseRecipients } from "../lib/emails";
import { htmlToPlainText } from "../lib/html";
import { toDateTimeLocal } from "../lib/format";
import { RichTextEditor } from "./RichTextEditor";
import { SendLaterPopover } from "./SendLaterPopover";
import { useToast } from "../context/ToastContext";
import { ROTATE_LABEL } from "../lib/constants";

interface ComposeModalProps {
  onClose: () => void;
  onScheduled: () => void;
}

export function ComposeModal({ onClose, onScheduled }: ComposeModalProps) {
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [senders, setSenders] = useState<string[]>([]);
  const [sender, setSender] = useState(ROTATE_LABEL);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fileName, setFileName] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [startTime, setStartTime] = useState(toDateTimeLocal(new Date()));
  const [sendLaterOpen, setSendLaterOpen] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState("2");
  const [hourlyLimit, setHourlyLimit] = useState("200");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.emails
      .senders()
      .then((res) => setSenders(res.senders))
      .catch(() => setSenders([]));
  }, []);

  function handleFile(file?: File) {
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const { valid, invalid } = parseRecipients(String(reader.result || ""));
      setRecipients(valid);
      setInvalidCount(invalid.length);
    };
    reader.readAsText(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!htmlToPlainText(body).trim()) {
      setError("Write something in the email body first.");
      return;
    }
    if (!recipients.length) {
      setError("Upload a CSV or text file with at least one valid email address.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.emails.schedule({
        subject,
        body,
        startTime: new Date(startTime).toISOString(),
        delay: Math.max(0, Number(delaySeconds) || 0) * 1000,
        hourlyLimit: Math.max(1, Number(hourlyLimit) || 1),
        recipients,
        sender: sender === ROTATE_LABEL ? "rotate" : sender
      });

      showToast(`Scheduled ${response.totalRecipients} email${response.totalRecipients === 1 ? "" : "s"}`);
      onScheduled();
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Scheduling failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 sm:items-center">
      <form onSubmit={submit} className="my-6 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="text-ink-muted hover:text-ink" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5m7-7-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2 className="text-base font-semibold text-ink">Compose New Email</h2>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSendLaterOpen((open) => !open)}
              className="rounded-full p-2 text-ink-muted hover:bg-surface"
              title="Send later"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button disabled={loading} className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              {loading ? "Scheduling…" : "Send"}
            </button>

            {sendLaterOpen && (
              <SendLaterPopover value={startTime} onChange={setStartTime} onClose={() => setSendLaterOpen(false)} />
            )}
          </div>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-6 py-4">
          <div className="flex items-center gap-3 border-b border-line pb-3 text-sm">
            <span className="w-14 shrink-0 text-ink-muted">From</span>
            <select
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="w-full rounded-lg bg-transparent py-1 text-ink outline-none"
            >
              <option value={ROTATE_LABEL}>Rotate across all senders ({senders.length || 1})</option>
              {senders.map((address) => (
                <option key={address} value={address}>
                  {address}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 border-b border-line pb-3 text-sm">
            <span className="w-14 shrink-0 text-ink-muted">To</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface"
            >
              {fileName || "Upload CSV / text of leads"}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            <span className="ml-auto shrink-0 text-xs text-ink-muted">
              {recipients.length} valid
              {invalidCount > 0 && <span className="text-amber-600"> · {invalidCount} skipped</span>}
            </span>
          </div>

          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            maxLength={255}
            className="w-full border-b border-line pb-3 text-sm outline-none placeholder:text-ink-muted"
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-ink-muted">
              Delay between 2 emails (seconds)
              <input
                type="number"
                min={0}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
              />
            </label>

            <label className="text-xs text-ink-muted">
              Hourly limit
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>

          <RichTextEditor value={body} onChange={setBody} placeholder="Type your email…" />

          <p className="text-xs text-ink-muted">Sending starts {new Date(startTime).toLocaleString()}.</p>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>
      </form>
    </div>
  );
}
