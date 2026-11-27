/**
 * Fold a trailing quoted reply in HTML mail (MailX-style, conservative).
 *
 * Wraps the last trailing quote region in a <details> so the reader can expand
 * it. Recognises blockquotes / Gmail quotes, Outlook web (#divRplyFwdMsg),
 * Outlook desktop From/Sent/Subject blocks, and QQ / “Original Message”
 * separators. Forwards and quote-only bodies are left alone.
 */

const ATTR =
  /^(on\s.+wrote\s*:|在.+写道\s*[：:]|在.+寫道\s*[：:]|.+\s+wrote\s*:)\s*$/i;

/** True forwards — “Original Message” is a reply separator, not a forward. */
const FORWARD =
  /----------\s*forwarded message\s*----------|-----?\s*begin forwarded message\s*-----?|----------\s*转发的邮件\s*----------|----------\s*轉寄的郵件\s*----------/i;

const SEPARATOR =
  /^-{3,}\s*original message\s*-{3,}\s*$|^-{3,}\s*原始邮件\s*-{3,}\s*$|^-{3,}\s*原始郵件\s*-{3,}\s*$|^-{5,}\s*原始邮件\s*-{5,}|^--+[\s\u00a0]*原始邮件[\s\u00a0]*--+/i;

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE;
}

function isBlank(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return !node.textContent?.trim();
  if (!isElement(node)) return true;
  if (node.tagName === "BR") return true;
  const id = node.id;
  if (id === "appendonsend") return true;
  return !node.textContent?.trim() && node.querySelector("img, table, hr") === null;
}

function isHr(node: Node): boolean {
  return isElement(node) && node.tagName === "HR";
}

function isQuoteRoot(el: HTMLElement): boolean {
  if (el.tagName === "BLOCKQUOTE") return true;
  const cls = el.className?.toString?.() ?? "";
  return /\bgmail_quote\b/i.test(cls) || /\bgmail_extra\b/i.test(cls) || el.getAttribute("type") === "cite";
}

function isOutlookId(el: HTMLElement): boolean {
  const id = el.id;
  return id === "divRplyFwdMsg" || id === "oriMsgHtmlSeperator";
}

function hasOutlookBorder(el: HTMLElement): boolean {
  const style = el.getAttribute("style") ?? "";
  return /border-top[^;]*#e1e1e1/i.test(style);
}

function hasHeaderLabels(el: HTMLElement): boolean {
  // Outlook often puts labels in <b>From:</b> with no space before the next label in textContent.
  const html = el.innerHTML.replace(/\u00a0/g, " ");
  const from = /<b>\s*from\s*:\s*<\/b>/i.test(html) || /<b>\s*发件人\s*:\s*<\/b>/.test(html) || /<b>\s*發件人\s*:\s*<\/b>/.test(html);
  const sent =
    /<b>\s*sent\s*:\s*<\/b>/i.test(html) ||
    /<b>\s*发送时间\s*:\s*<\/b>/.test(html) ||
    /<b>\s*發送時間\s*:\s*<\/b>/.test(html);
  const subject = /<b>\s*subject\s*:\s*<\/b>/i.test(html) || /<b>\s*主题\s*:\s*<\/b>/.test(html) || /<b>\s*主題\s*:\s*<\/b>/.test(html);
  if (from && (sent || subject)) return true;
  const t = (el.textContent ?? "").replace(/\u00a0/g, " ");
  return (
    (/\bfrom\s*:/i.test(t) || t.includes("发件人:") || t.includes("發件人:")) &&
    (/\bsent\s*:/i.test(t) || t.includes("发送时间:") || t.includes("發送時間:") || /\bsubject\s*:/i.test(t) || t.includes("主题:") || t.includes("主題:"))
  );
}

function isSeparatorLine(text: string): boolean {
  return SEPARATOR.test(text.replace(/\u00a0/g, " ").trim());
}

/** A top-level node that starts an Outlook / QQ quoted region. */
function isSeparatorStart(el: HTMLElement): boolean {
  if (isOutlookId(el) || el.querySelector("#divRplyFwdMsg, #oriMsgHtmlSeperator")) return true;
  if (hasOutlookBorder(el) && hasHeaderLabels(el)) return true;
  const firstLines = (el.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (firstLines.some((l) => isSeparatorLine(l))) return true;
  // QQ wraps the separator in an inner div.
  for (const child of Array.from(el.children).slice(0, 4)) {
    if (isSeparatorLine(child.textContent ?? "")) return true;
  }
  return false;
}

function visiblePrefix(body: HTMLElement, before: Node): string {
  let text = "";
  for (const node of Array.from(body.childNodes)) {
    if (node === before) break;
    text += node.textContent ?? "";
    if (text.length > 4000) break;
  }
  return text;
}

function extendBack(kids: Node[], startIdx: number): number {
  let i = startIdx;
  while (i > 0) {
    const prev = kids[i - 1]!;
    if (isHr(prev) || isBlank(prev)) {
      i -= 1;
      continue;
    }
    break;
  }
  return i;
}

function regionOk(body: HTMLElement, start: Node, endIdx: number, kids: Node[]): { start: Node; end: Node } | null {
  for (let i = endIdx + 1; i < kids.length; i++) {
    if (!isBlank(kids[i]!)) return null;
  }
  const prefix = visiblePrefix(body, start).trim();
  if (!prefix || FORWARD.test(prefix)) return null;
  return { start, end: kids[endIdx]! };
}

function findBlockquoteQuote(body: HTMLElement, kids: Node[]): { start: Node; end: Node } | null {
  let endIdx = -1;
  for (let i = kids.length - 1; i >= 0; i--) {
    const node = kids[i]!;
    if (isBlank(node)) continue;
    if (isElement(node) && isQuoteRoot(node)) {
      endIdx = i;
      break;
    }
    return null;
  }
  if (endIdx < 0) return null;
  let start: Node = kids[endIdx]!;
  const prev = kids[endIdx - 1];
  if (prev && isElement(prev) && (prev.tagName === "P" || prev.tagName === "DIV")) {
    const line = (prev.textContent ?? "").trim().replace(/\s+/g, " ");
    if (ATTR.test(line)) start = prev;
  }
  return regionOk(body, start, endIdx, kids);
}

function findSeparatorQuote(body: HTMLElement, kids: Node[]): { start: Node; end: Node } | null {
  let markerIdx = -1;
  for (let i = 0; i < kids.length; i++) {
    const node = kids[i]!;
    if (isElement(node) && isSeparatorStart(node)) {
      markerIdx = i;
      break;
    }
  }
  if (markerIdx < 0) return null;
  // Fold from the marker through the last non-blank child.
  let endIdx = kids.length - 1;
  while (endIdx > markerIdx && isBlank(kids[endIdx]!)) endIdx -= 1;
  if (endIdx <= markerIdx) {
    // Marker alone with nothing after still folds if there is a prefix.
    endIdx = markerIdx;
  }
  const startIdx = extendBack(kids, markerIdx);
  return regionOk(body, kids[startIdx]!, endIdx, kids);
}

function findTrailingQuote(body: HTMLElement): { start: Node; end: Node } | null {
  const kids = Array.from(body.childNodes);
  return findBlockquoteQuote(body, kids) ?? findSeparatorQuote(body, kids);
}

/** Fold a trailing quote into <details class="openwren-quote">. Mutates `doc`. */
export function foldQuotes(doc: Document, label: string): boolean {
  const body = doc.body;
  if (!body) return false;
  const found = findTrailingQuote(body);
  if (!found) return false;

  const details = doc.createElement("details");
  details.className = "openwren-quote";
  const summary = doc.createElement("summary");
  summary.textContent = label;
  details.appendChild(summary);

  const nodes: Node[] = [];
  let walk: Node | null = found.start;
  while (walk) {
    const next: Node | null = walk.nextSibling;
    nodes.push(walk);
    if (walk === found.end) break;
    walk = next;
  }
  for (const node of nodes) details.appendChild(node);
  body.appendChild(details);
  return true;
}
