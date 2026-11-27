/**
 * Fold a trailing plain-text quoted reply (companion to foldQuotes for HTML).
 *
 * Detects a trailing run of ">" / "|"-prefixed lines and an optional
 * "On … wrote:" attribution above them. Forwards and quote-only bodies stay open.
 */

const ATTR =
  /^(on\s.+wrote\s*:|在.+写道\s*[：:]|在.+寫道\s*[：:]|.+\s+wrote\s*:)\s*$/i;

/** True forwards — “Original Message” is a reply separator (folded below). */
const FORWARD =
  /----------\s*forwarded message\s*----------|-----?\s*begin forwarded message\s*-----?|----------\s*转发的邮件\s*----------|----------\s*轉寄的郵件\s*----------/i;

const SEPARATOR =
  /^-{3,}\s*original message\s*-{3,}\s*$|^-{3,}\s*原始邮件\s*-{3,}\s*$|^-{3,}\s*原始郵件\s*-{3,}\s*$/i;

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

  let end = lines.length - 1;
  while (end >= 0 && isBlank(lines[end]!)) end -= 1;
  if (end < 0) return null;

  // Prefer a trailing "-----Original Message-----" / 原始邮件 separator.
  let sep = -1;
  for (let i = 0; i <= end; i++) {
    if (SEPARATOR.test(lines[i]!.replace(/\u00a0/g, " ").trim())) {
      sep = i;
      break;
    }
  }

  let start: number;
  if (sep >= 0 && sep < end) {
    start = sep;
  } else {
    if (!isQuotedLine(lines[end]!)) return null;
    // Walk up through quoted lines and blanks that sit inside the quote run.
    start = end;
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
    if (!isQuotedLine(lines[start]!)) return null;
  }

  // Optional attribution line just above a > quote run (not above Original Message).
  let attr = start;
  if (sep < 0 && attr > 0) {
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
