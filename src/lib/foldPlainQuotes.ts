/**
 * Fold a trailing plain-text quoted reply (companion to foldQuotes for HTML).
 *
 * Detects a trailing run of ">" / "|"-prefixed lines and an optional
 * "On … wrote:" attribution above them. Forwards and quote-only bodies stay open.
 */

const ATTR =
  /^(on\s.+wrote\s*:|在.+写道\s*[：:]|在.+寫道\s*[：:]|.+\s+wrote\s*:)\s*$/i;

const FORWARD =
  /----------\s*forwarded message\s*----------|-----original message-----|-----原始邮件-----|-----轉寄的郵件-----/i;

function isQuotedLine(line: string): boolean {
  return /^\s*[>|]/.test(line);
}

function isBlank(line: string): boolean {
  return line.trim() === "";
}

export interface PlainFold {
  head: string;
  quote: string;
}

/** Split plain text into the new part and a trailing quote to fold, or null. */
export function foldPlainQuotes(text: string): PlainFold | null {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return null;

  // Find the last non-blank line; it must be quoted.
  let end = lines.length - 1;
  while (end >= 0 && isBlank(lines[end]!)) end -= 1;
  if (end < 0 || !isQuotedLine(lines[end]!)) return null;

  // Walk up through quoted lines and blanks that sit inside the quote run.
  let start = end;
  while (start > 0) {
    const prev = lines[start - 1]!;
    if (isQuotedLine(prev) || isBlank(prev)) {
      start -= 1;
      continue;
    }
    break;
  }
  // Drop leading blanks inside the quote run.
  while (start <= end && isBlank(lines[start]!)) start += 1;
  if (start > end) return null;

  // Optional attribution line just above the quote run.
  let attr = start;
  if (attr > 0) {
    let i = attr - 1;
    while (i >= 0 && isBlank(lines[i]!)) i -= 1;
    if (i >= 0 && ATTR.test(lines[i]!.trim().replace(/\s+/g, " "))) {
      attr = i;
    }
  }

  const headLines = lines.slice(0, attr);
  while (headLines.length && isBlank(headLines[headLines.length - 1]!)) headLines.pop();
  const head = headLines.join("\n").trim();
  if (!head || FORWARD.test(head)) return null;

  const quote = lines.slice(attr).join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
  if (!quote.trim()) return null;
  return { head, quote };
}
