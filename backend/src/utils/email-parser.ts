const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRecipients(input: string): string[] {
  const candidates = input
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(candidates.filter((email) => EMAIL_REGEX.test(email)))];
}
