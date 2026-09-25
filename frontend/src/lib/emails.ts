const EMAIL_REGEX = /^[^\s@,;<>()"']+@[^\s@,;<>()"']+\.[^\s@,;<>()"']+$/;

export interface ParsedRecipients {
  valid: string[];
  invalid: string[];
}

/**
 * Defensive lead parsing for CSV / text input. Any token containing "@" is a
 * candidate (headers, names and other columns are ignored); candidates that
 * are not valid addresses are counted so the user can see what was skipped.
 */
export function parseRecipients(text: string): ParsedRecipients {
  const valid = new Set<string>();
  const invalid = new Set<string>();

  for (const raw of text.split(/[\s,;]+/)) {
    const token = raw.replace(/^["'<]+|["'>]+$/g, "").trim().toLowerCase();
    if (!token.includes("@")) continue;

    if (EMAIL_REGEX.test(token)) valid.add(token);
    else invalid.add(token);
  }

  return { valid: [...valid], invalid: [...invalid] };
}
