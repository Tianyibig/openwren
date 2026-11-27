/**
 * Fold a trailing quoted reply in HTML mail (MailX-style, conservative).
 *
 * Wraps the last trailing blockquote / Gmail quote (and its "On … wrote:" line)
 * in a <details> so the reader can expand it. Forwards and quote-only bodies
 * are left alone.
 */

const ATTR =
  /^(on\s.+wrote\s*:|在.+写道\s*[：:]|在.+寫道\s*[：:]|.+\s+wrote\s*:)\s*$/i;

const FORWARD =
  /----------\s*forwarded message\s*----------|-----original message-----|-----原始邮件-----|-----轉寄的郵件-----/i;

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE;
}

function isBlank(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return !node.textContent?.trim();
  if (!isElement(node)) return true;
  if (node.tagName === "BR") return true;
  return !node.textContent?.trim() && node.querySelector("img, table, hr") === null;
}

function isQuoteRoot(el: HTMLElement): boolean {
  if (el.tagName === "BLOCKQUOTE") return true;
  const cls = el.className?.toString?.() ?? "";
  return /\bgmail_quote\b/i.test(cls) || /\bgmail_extra\b/i.test(cls) || el.getAttribute("type") === "cite";
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

function findTrailingQuote(body: HTMLElement): { start: Node; end: HTMLElement } | null {
  const kids = Array.from(body.childNodes);
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
  const quote = kids[endIdx] as HTMLElement;

  // Only blanks may follow the quote.
  for (let i = endIdx + 1; i < kids.length; i++) {
    if (!isBlank(kids[i]!)) return null;
  }

  let start: Node = quote;
  const prev = kids[endIdx - 1];
  if (prev && isElement(prev) && prev.tagName === "P") {
    const line = (prev.textContent ?? "").trim().replace(/\s+/g, " ");
    if (ATTR.test(line)) start = prev;
  }

  // Need real content before the folded region.
  const prefix = visiblePrefix(body, start).trim();
  if (!prefix || FORWARD.test(prefix)) return null;

  return { start, end: quote };
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
