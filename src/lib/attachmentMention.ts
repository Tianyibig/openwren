/**
 * Forgotten-attachment reminder heuristics, adapted from MailX (sending.md §17.6).
 *
 * Replies and forwards inherit subjects like "Re: 合同附件", so only new mail's
 * subject counts; the body counts only where the user wrote it.
 */

const CHINESE = ["附件", "附上", "附带", "随信附", "见附", "所附"] as const;
const ENGLISH = /\b(?:attach|attached|attachments?|enclosed)\b/i;

/** Words that suggest the sender meant to attach a file. */
export function mentionsAttachment(text: string): boolean {
  return CHINESE.some((word) => text.includes(word)) || ENGLISH.test(text);
}

export type ComposeKind = "new" | "reply" | "forward";

const FORWARD_DIVIDER = "---------- Forwarded message ----------";

/** How this draft was started: new mail, a reply, or a forward. */
export function composeKind(draft: { isReply: boolean; html: string; forwarded?: unknown }): ComposeKind {
  if (draft.forwarded || draft.html.includes(FORWARD_DIVIDER)) return "forward";
  if (draft.isReply) return "reply";
  return "new";
}

/** Strip tags and keep readable text for the mention check. */
function plainFromHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent ?? "";
}

/**
 * What the user wrote themselves: a reply's editor body (quote is separate in
 * OpenWren), a forward without the forwarded header and everything after it,
 * or new mail as a whole.
 */
export function ownBodyText(html: string, kind: ComposeKind): string {
  if (kind === "forward") {
    const at = html.indexOf(FORWARD_DIVIDER);
    return plainFromHtml(at >= 0 ? html.slice(0, at) : html);
  }
  return plainFromHtml(html);
}

/** True when the draft talks about an attachment the user may have forgotten. */
export function draftMentionsAttachment(
  draft: { subject: string; html: string; isReply: boolean; forwarded?: unknown },
  kind: ComposeKind = composeKind(draft),
): boolean {
  return (kind === "new" && mentionsAttachment(draft.subject)) || mentionsAttachment(ownBodyText(draft.html, kind));
}
