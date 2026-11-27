/**
 * Local verification-code recognition, adapted from MailX's conservative rules.
 *
 * Pure text heuristics only: no network, no clipboard, no claim that the sender
 * is genuine or that a login is in progress. A unique 4–8 character ASCII digit
 * or mixed letter/digit code next to clear verification language is required.
 */

const KEYWORDS = [
  "verification code",
  "security code",
  "authentication code",
  "confirmation code",
  "login code",
  "sign-in code",
  "sign in code",
  "one-time password",
  "one time password",
  "one-time code",
  "one time code",
  "otp",
  "验证码",
  "驗證碼",
  "校验码",
  "校驗碼",
  "动态密码",
  "動態密碼",
  "动态码",
  "動態碼",
] as const;

const SUFFIXES = ["to sign in", "to log in", "to verify your email", "to verify your account"] as const;

const BRIDGE_WORDS = new Set(["is", "your", "the", "this", "use", "enter", "below", "following", "为", "為", "是", "如下", "请使用", "請使用", "请输入", "請輸入"]);

const MAX_SUBJECT = 4096;
const MAX_BODY = 64 * 1024;
const CONTEXT = 96;

export type Detection = { status: "found"; code: string } | { status: "ambiguous" } | { status: "notFound" };

/** Recognise a unique verification code in subject + plain body, or say none / ambiguous. */
export function detectVerificationCode(subject: string, body: string): Detection {
  if (subject.length > MAX_SUBJECT || body.length > MAX_BODY) return { status: "notFound" };
  const subjectText = replySubject(subject) ? "" : normalize(subject);
  const subjectKeyword = keywordIn(subjectText.toLowerCase());
  const bodyText = unquoted(body);
  const codes = new Set<string>();
  scan(subjectText, null, codes);
  scan(bodyText, subjectKeyword, codes);
  if (codes.size === 0) return { status: "notFound" };
  if (codes.size > 1) return { status: "ambiguous" };
  return { status: "found", code: [...codes][0]! };
}

function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]/g, " ");
}

function replySubject(subject: string): boolean {
  const s = subject.trimStart().toLowerCase();
  return ["re:", "fw:", "fwd:", "re：", "fw：", "fwd：", "回复:", "回复：", "回覆:", "回覆：", "转发:", "转发：", "轉寄:", "轉寄："].some((p) => s.startsWith(p));
}

function unquoted(body: string): string {
  const lines = normalize(body).split("\n");
  let text = "";
  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    if (
      (lower.startsWith("on ") && lower.endsWith("wrote:")) ||
      (trimmed.startsWith("在") && (trimmed.endsWith("写道：") || trimmed.endsWith("寫道："))) ||
      lower.includes("-----original message-----") ||
      lower.includes("-----forwarded message-----") ||
      trimmed.includes("-----原始邮件-----")
    ) {
      break;
    }
    // Keep a newline even when skipping a quoted line, so two unrelated lines
    // cannot be glued into one token.
    if (!trimmed.startsWith(">")) text += line;
    text += "\n";
  }
  return text;
}

function scan(text: string, subjectKeyword: string | null, codes: Set<string>) {
  const lower = text.toLowerCase();
  const network = networkTokens(text);
  let networkIndex = 0;
  const firstLine = firstCodeLine(text);
  let previous: { end: number; ok: boolean } | null = null;
  const re = /[A-Za-z0-9]+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const code = match[0];
    const begin = match.index;
    const end = begin + code.length;
    while (network[networkIndex] && network[networkIndex]!.end <= begin) networkIndex += 1;
    const insideNetwork = network[networkIndex] && network[networkIndex]!.start <= begin;
    if (code.length < 4 || code.length > 8 || !/\d/.test(code) || insideNetwork || !wholeCode(text, begin, end)) {
      continue;
    }
    let ok = hasEvidence(lower, begin, end, subjectKeyword);
    if (!ok && previous?.ok && listSeparator(lower.slice(previous.end, begin))) ok = true;
    if (!ok && subjectKeyword && /^\d+$/.test(code) && begin === firstLine.start && end === firstLine.end) ok = true;
    if (!ok) continue;
    previous = { end, ok: true };
    codes.add(code);
    if (codes.size > 16) {
      codes.clear();
      return;
    }
  }
}

function hasEvidence(lower: string, start: number, end: number, subjectKeyword: string | null): boolean {
  const beforeStart = Math.max(0, start - CONTEXT);
  const afterEnd = Math.min(lower.length, end + CONTEXT);
  const before = lower.slice(beforeStart, start);
  const after = lower.slice(end, afterEnd);
  const keywords = subjectKeyword ? [...KEYWORDS, "code"] : KEYWORDS;
  for (const keyword of keywords) {
    const bi = before.lastIndexOf(keyword);
    if (bi >= 0 && keywordBoundary(before, bi, keyword) && !oldContext(before.slice(0, bi)) && bridge(before.slice(bi + keyword.length))) return true;
    const ai = after.indexOf(keyword);
    if (ai >= 0 && keywordBoundary(after, ai, keyword) && bridge(after.slice(0, ai)) && !oldContext(before)) return true;
  }
  for (const keyword of SUFFIXES) {
    const ai = after.indexOf(keyword);
    if (ai >= 0 && keywordBoundary(after, ai, keyword) && bridge(after.slice(0, ai)) && !oldContext(before)) return true;
  }
  return false;
}

function bridge(gap: string): boolean {
  if (gap.length > 48 || (gap.match(/\n/g) ?? []).length > 2) return false;
  const words = gap.split(/[\s:：=,，\-–—()（）[\]【】"'`*]+/).filter(Boolean);
  return words.every((word) => BRIDGE_WORDS.has(word));
}

function oldContext(prefix: string): boolean {
  const last = prefix.split(/[\n.。!！;；]/).pop() ?? "";
  if (["old", "previous", "expired", "invalid", "example"].some((w) => new RegExp(`(?:^|[^a-z])${w}(?:[^a-z]|$)`, "i").test(last))) return true;
  return ["旧", "舊", "上次", "过期", "過期", "示例", "do not use", "don't use"].some((w) => last.includes(w));
}

function keywordIn(lower: string): string | null {
  for (const keyword of KEYWORDS) {
    let from = 0;
    while (from <= lower.length) {
      const i = lower.indexOf(keyword, from);
      if (i < 0) break;
      if (keywordBoundary(lower, i, keyword) && !oldContext(lower.slice(0, i))) return keyword;
      from = i + 1;
    }
  }
  return null;
}

function keywordBoundary(text: string, start: number, keyword: string): boolean {
  if (/[^\x00-\x7f]/.test(keyword)) return true;
  const before = text[start - 1];
  const after = text[start + keyword.length];
  const word = (c: string | undefined) => !!c && /[A-Za-z0-9_]/.test(c);
  return !word(before) && !word(after);
}

function firstCodeLine(text: string): { start: number; end: number } {
  const trimmed = text.trimStart();
  const start = text.length - trimmed.length;
  const line = (trimmed.split("\n")[0] ?? "").trimEnd();
  return { start, end: start + line.length };
}

function listSeparator(gap: string): boolean {
  return gap.length <= 16 && ["or", "and", "或", "和", "、", ",", "，"].includes(gap.trim());
}

function networkTokens(text: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const re = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const token = match[0];
    if (token.includes("://") || token.includes("@") || token.slice(0, 4).toLowerCase() === "www.") {
      ranges.push({ start: match.index, end: match.index + token.length });
    }
  }
  return ranges;
}

function wholeCode(text: string, start: number, end: number): boolean {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const prevChar = before.slice(-1);
  const nextChar = after.slice(0, 1);
  const attached = (c: string) => /[A-Za-z0-9_@/\\]/.test(c);
  if (attached(prevChar) || attached(nextChar)) return false;
  const prev = before.trimEnd();
  const next = after.trimStart();
  if (/[$€£¥￥+]$/.test(prev) || /^[%％]/.test(next)) return false;
  if (separatedDigit([...prev].reverse().join("")) || separatedDigit(next)) return false;
  return true;
}

function separatedDigit(side: string): boolean {
  const first = side[0];
  if (!first) return false;
  if (/\d/.test(first)) return true;
  if (/[A-Za-z]/.test(first)) {
    const word = side.match(/^[A-Za-z0-9]{1,9}/)?.[0] ?? "";
    return word.length >= 4 && word.length <= 8 && /\d/.test(word);
  }
  if (first === "," || first === "，") {
    const rest = side.slice(1).trimStart();
    const word = rest.match(/^[A-Za-z0-9]{1,9}/)?.[0] ?? "";
    if (word.length >= 4 && word.length <= 8 && /\d/.test(word)) return false;
    return first === "," && /^\d/.test(word);
  }
  if ("-–—/".includes(first)) return /[A-Za-z0-9]/.test(side.slice(1).trimStart()[0] ?? "");
  if (first === "." || first === ":") return /^\d/.test(side.slice(1));
  return false;
}
