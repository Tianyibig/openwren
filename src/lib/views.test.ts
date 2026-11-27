import { describe, expect, it } from "vitest";
import { VIEW, currentFolder, isOverview, isVirtualView, virtualFolder } from "../store";
import type { Folder } from "../types";

const folders: Folder[] = [
  { id: 1, accountId: 1, name: "Inbox", role: "inbox", favorite: false, unread: 3 },
  { id: 2, accountId: 2, name: "Inbox", role: "inbox", favorite: false, unread: 1 },
  { id: 3, accountId: 1, name: "Drafts", role: "drafts", favorite: false, unread: 0 },
  { id: 4, accountId: 1, name: "Sent", role: "sent", favorite: false, unread: 0 },
];

describe("virtual views", () => {
  it("recognises negative ids as cross-account views", () => {
    expect(isVirtualView(VIEW.inbox)).toBe(true);
    expect(isVirtualView(VIEW.trash)).toBe(true);
    expect(isVirtualView(VIEW.overview)).toBe(false);
    expect(isOverview(VIEW.overview)).toBe(true);
    expect(isOverview(VIEW.inbox)).toBe(false);
  });

  it("sums unread for inbox and drafts across accounts", () => {
    expect(virtualFolder(VIEW.inbox, folders)?.unread).toBe(4);
    expect(virtualFolder(VIEW.drafts, folders)?.role).toBe("drafts");
    expect(virtualFolder(VIEW.sent, folders)?.name).toBe("Sent");
  });

  it("currentFolder skips Today and resolves virtual or real folders", () => {
    expect(currentFolder({ folders, folderId: VIEW.overview })).toBeUndefined();
    expect(currentFolder({ folders, folderId: VIEW.inbox })?.id).toBe(VIEW.inbox);
    expect(currentFolder({ folders, folderId: 1 })?.name).toBe("Inbox");
  });
});
