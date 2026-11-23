import { describe, expect, it } from "vitest";
import type { MessageSummary } from "../types";
import { conversationFacts, conversations } from "./threads";

/** Just enough of a summary for these tests. */
function message(id: number, threadKey: string | null, extra: Partial<MessageSummary> = {}): MessageSummary {
  return { id, accountId: 1, threadKey, unread: false, flagged: false, hasAttachment: false, categories: [], ...extra } as MessageSummary;
}

describe("conversations", () => {
  it("collapses a conversation to one row, however far apart its messages were", () => {
    const rows = conversations([message(3, "a"), message(2, "b"), message(1, "a")]);
    expect(rows.map((r) => r.head.id)).toEqual([3, 2]);
    expect(rows[0].members.map((m) => m.id)).toEqual([3, 1]); // the reply stays behind the newest message, newest first
    expect(conversationFacts(rows[0]).count).toBe(2);
  });

  it("leaves a message whose conversation is unknown on its own", () => {
    const rows = conversations([message(2, null), message(1, null)]);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.members.length === 1)).toBe(true);
  });

  it("keeps two accounts apart even when the key is the same", () => {
    const rows = conversations([message(2, "same"), { ...message(1, "same"), accountId: 2 }]);
    expect(rows).toHaveLength(2);
  });

  it("says what the conversation has, not just its newest message", () => {
    const rows = conversations([message(2, "a", { unread: false }), message(1, "a", { unread: true, flagged: true, hasAttachment: true, categories: ["Blue"] })]);
    expect(conversationFacts(rows[0])).toMatchObject({ count: 2, unread: true, flagged: true, hasAttachment: true, categories: ["Blue"] });
  });

  it("lists a category once when several messages carry it", () => {
    const rows = conversations([message(2, "a", { categories: ["Red", "Blue"] }), message(1, "a", { categories: ["Blue"] })]);
    expect(conversationFacts(rows[0]).categories).toEqual(["Red", "Blue"]);
  });

  it("handles an empty list and a single message", () => {
    expect(conversations([])).toEqual([]);
    expect(conversations([message(1, "a")])[0].members).toHaveLength(1);
  });
});
