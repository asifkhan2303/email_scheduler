const DAY_MS = 24 * 60 * 60 * 1000;

const time = (date: Date) =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

/** "Tue 9:15:12 AM" for the coming week, "Oct 6, 9:15:12 AM" otherwise. */
export function formatChipTime(value: string): string {
  const date = new Date(value);
  const distance = Math.abs(date.getTime() - Date.now());

  if (distance < 6 * DAY_MS) {
    return `${date.toLocaleDateString("en-US", { weekday: "short" })} ${time(date)}`;
  }

  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time(date)}`;
}

export function formatFullDate(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

/** Value for <input type="datetime-local"> in the user's local time zone. */
export function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function tomorrowAt(hour: number, minute = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
