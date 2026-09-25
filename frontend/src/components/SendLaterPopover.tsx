import { useState } from "react";
import { toDateTimeLocal, tomorrowAt } from "../lib/format";

interface SendLaterPopoverProps {
  value: string;
  onChange: (isoLocal: string) => void;
  onClose: () => void;
}

const QUICK_OPTIONS = [
  { label: "In 5 minutes", get: () => new Date(Date.now() + 5 * 60 * 1000) },
  { label: "Tomorrow, 9:00 AM", get: () => tomorrowAt(9) },
  { label: "Tomorrow, 10:00 AM", get: () => tomorrowAt(10) },
  { label: "Tomorrow, 3:00 PM", get: () => tomorrowAt(15) }
];

export function SendLaterPopover({ value, onChange, onClose }: SendLaterPopoverProps) {
  const [custom, setCustom] = useState(value);

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-line bg-white p-4 shadow-xl">
      <p className="mb-2 text-sm font-semibold text-ink">Send Later</p>

      <input
        type="datetime-local"
        value={custom}
        min={toDateTimeLocal(new Date())}
        onChange={(e) => setCustom(e.target.value)}
        className="mb-3 w-full rounded-lg border border-line px-3 py-2 text-sm"
      />

      <ul className="mb-3 space-y-0.5">
        {QUICK_OPTIONS.map((option) => (
          <li key={option.label}>
            <button
              type="button"
              onClick={() => setCustom(toDateTimeLocal(option.get()))}
              className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-ink hover:bg-surface"
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex justify-end gap-2 border-t border-line pt-3">
        <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-ink-muted hover:bg-surface">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(custom);
            onClose();
          }}
          disabled={!custom}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}
