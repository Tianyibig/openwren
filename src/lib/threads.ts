import type { MessageSummary } from "../types";

/** One conversation as the list shows it: the newest message, and the ones behind it. */
export interface Conversation {
  /** The message the list shows for the conversation. */
  head: MessageSummary;
  /** Every message of the conversation on this page, newest first, so the head comes first. */
  members: MessageSummary[];
}

/**
 * Group the messages on screen into conversations.
 *
 * The list arrives newest first, so the first message of a conversation to appear is its
 * newest, and that is the one the row shows. Messages of one conversation may sit far
 * apart in the list (someone replies after other mail arrived), which is why this cannot
 * only look at neighbours. A message whose conversation is unknown — one stored before
 * threading, or without a Message-ID to thread on — stands alone.
 */
export function conversations(items: MessageSummary[]): Conversation[] {
  const byThread = new Map<string, Conversation>();
  const out: Conversation[] = [];
  for (const item of items) {
    // Conversation keys are per account: the same subject in two mailboxes is two conversations.
    const key = item.threadKey ? `${item.accountId}:${item.threadKey}` : null;
    const seen = key ? byThread.get(key) : undefined;
    if (seen) {
      seen.members.push(item);
      continue;
    }
    const row: Conversation = { head: item, members: [item] };
    if (key) byThread.set(key, row);
    out.push(row);
  }
  return out;
}

/** What a collapsed row says about the conversation standing behind it. */
export function conversationFacts(row: Conversation) {
  const members = row.members;
  return {
    count: members.length,
    unread: members.some((m) => m.unread),
    flagged: members.some((m) => m.flagged),
    hasAttachment: members.some((m) => m.hasAttachment),
    categories: [...new Set(members.flatMap((m) => m.categories))],
  };
}
