import { IconAlertTriangle, IconArchive, IconChevronRight, IconFlag, IconPaperclip, IconPin, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, CategoryDot, ContextMenu, IconButton, Marked } from "../components/ui";
import { groupLabel, shortTime } from "../lib/dates";
import { authProblem, nameProblem } from "../lib/privacy";
import { conversations, type Conversation } from "../lib/threads";
import { useT } from "../lib/useTranslate";
import { VIEW, currentFolder, isVirtualView, useStore } from "../store";
import type { Only } from "../store";
import type { MessageSummary, StoredDraft } from "../types";
import { messageMenu } from "./actions";
import { SearchChips } from "./SearchChips";
import { MOD, mod } from "../lib/keys";

/** Drag-and-drop type for message ids dragged onto a folder. */
export const DRAG_TYPE = "application/x-openwren-messages";

interface Section<T> {
  label: string;
  items: T[];
}

/** Group things that are already sorted newest first by their section label. */
function sections<T>(items: T[], label: (x: T) => string): Section<T>[] {
  const out: Section<T>[] = [];
  for (const m of items) {
    const l = label(m);
    const last = out[out.length - 1];
    if (last && last.label === l) last.items.push(m);
    else out.push({ label: l, items: [m] });
  }
  return out;
}

/** How a row stands for a whole conversation: how many messages, and whether they show. */
interface Fold {
  count: number;
  expanded: boolean;
  toggle: () => void;
}

function Row({
  m,
  now,
  query,
  onMenu,
  thread,
  nested,
}: {
  m: MessageSummary;
  now: Date;
  query: string;
  onMenu: (x: number, y: number, m: MessageSummary) => void;
  thread?: Fold;
  /** A message shown under the conversation it belongs to. */
  nested?: boolean;
}) {
  const open = useStore((s) => s.messageId === m.id);
  const ticked = useStore((s) => s.selected.includes(m.id));
  const tr = useT();
  const { selectMessage, prefetch } = useStore.getState();
  // What can be told without opening the message: failed sender checks, or a name the address does not match.
  const warn = useStore((s) => s.settings.phishing_warnings !== "off");
  const server = useStore((s) => s.accounts.find((a) => a.id === m.accountId)?.authServer);
  const multiAccount = useStore((s) => s.accounts.length > 1);
  const crossAccount = useStore((s) => isVirtualView(s.folderId));
  const showAccount = multiAccount && (crossAccount || !!query);
  const suspicious = useMemo(() => (warn ? (authProblem(m.auth, server) ?? nameProblem(m.fromName, m.fromAddress)) : null), [warn, m.auth, server, m.fromName, m.fromAddress]);
  const date = new Date(m.date * 1000);
  const { moveMessages, deleteMessages, setFlags } = useStore.getState();
  return (
    <div
      role="option"
      aria-selected={ticked}
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        const s = useStore.getState();
        const ids = s.selected.includes(m.id) ? s.selected : [m.id];
        e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ ids, accountId: m.accountId }));
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={(e) => void selectMessage(m.id, e.ctrlKey || e.metaKey ? "toggle" : e.shiftKey ? "range" : "single")}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e.clientX, e.clientY, m);
      }}
      onKeyDown={(e) => e.key === "Enter" && void selectMessage(m.id)}
      // Pointing at a message gets it ready, so the click shows it at once.
      onMouseEnter={() => prefetch(m.id)}
      style={{ paddingTop: "var(--row-pad)", paddingBottom: "var(--row-pad)" }}
      // Rows run edge to edge and are divided by hairlines. Unread mail is bold, with a dot and a blue time;
      // once read, the sender and subject drop to regular weight and the subject turns grey.
      // A message shown under its conversation is indented, so the grouping is visible.
      className={`group relative flex cursor-default gap-3 border-b border-edge px-4 ${nested ? "pl-9" : ""} ${open || ticked ? "bg-sel" : "hover:bg-hover"}`}
    >
      <Avatar name={m.fromName} address={m.fromAddress} auth={m.auth} accountId={m.accountId} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {thread && (
            <button
              type="button"
              aria-expanded={thread.expanded}
              aria-label={thread.expanded ? tr("list.foldThread") : tr("list.expandThread")}
              title={thread.expanded ? tr("list.foldThread") : tr("list.expandThread")}
              onClick={(e) => {
                // Opening the conversation is not the same as opening the newest message.
                e.stopPropagation();
                thread.toggle();
              }}
              className="-ml-1 flex flex-none items-center gap-0.5 rounded text-xs text-ink3 hover:text-ink"
            >
              <IconChevronRight size={14} stroke={2} className={thread.expanded ? "rotate-90" : ""} />
              {thread.count}
            </button>
          )}
          <span className={`truncate text-ink ${m.unread ? "font-semibold" : ""}`}>
            <Marked text={m.fromName} query={query} />
          </span>
          {suspicious && (
            <span className="flex-none text-[#b7791f]" title={suspicious} role="img" aria-label={tr("list.suspicious")}>
              <IconAlertTriangle size={15} stroke={1.6} />
            </span>
          )}
          {m.unread && <span className="size-[7px] flex-none rounded-full bg-dot" aria-label={tr("list.unread")} />}
          <span className="flex flex-none items-center gap-1 text-ink3">
            {m.categories.map((c) => (
              <CategoryDot key={c} name={c} />
            ))}
            {/* The word was not in the mail itself: say where it was found. */}
            {m.attachmentHit && (
              <span title={tr("list.attachmentHit")} className="flex-none rounded bg-canvas px-1.5 text-[11px] text-ink2">
                {tr("list.attachmentHitShort")}
              </span>
            )}
            {m.hasAttachment && <IconPaperclip size={14} stroke={1.6} />}
            {m.flagged && <IconFlag size={14} className="text-danger" />}
            {m.pinned && <IconPin size={14} className="text-brand" />}
          </span>
          <span className={`ml-auto flex-none pl-1 text-xs whitespace-nowrap group-hover:invisible ${m.unread ? "text-brand" : "text-ink3"}`}>{shortTime(date, now)}</span>
        </div>
        <div className={`truncate ${m.unread ? "font-semibold text-ink" : "text-ink2"}`}>
          <Marked text={m.subject || tr("list.noSubject")} query={query} />
        </div>
        {/* A non-breaking space keeps the row height while the preview is still downloading. */}
        <div className={`truncate ${m.unread ? "text-ink2" : "text-ink3"}`}>
          {query ? `${m.folderName} · ${m.accountAddress}` : showAccount ? `${m.accountAddress} · ${m.preview || " "}` : m.preview || " "}
        </div>
      </div>
      {/* Hover rail: archive · delete · flag · pin (product-plan §6.3), like MailX email-card. */}
      <div className="absolute top-6 right-1.5 hidden rounded-lg bg-card shadow-sm group-hover:flex" onClick={(e) => e.stopPropagation()}>
        <IconButton label={tr("reader.archive")} className="size-7" onClick={() => void moveMessages([m.id], { role: "archive" })}>
          <IconArchive size={16} />
        </IconButton>
        <IconButton label={tr("reader.delete")} className="size-7" onClick={() => void deleteMessages([m.id])}>
          <IconTrash size={16} />
        </IconButton>
        <IconButton
          label={m.flagged ? tr("reader.removeFlag") : tr("reader.flag")}
          className={`size-7 ${m.flagged ? "text-danger" : ""}`}
          onClick={() => void setFlags(m.id, { flagged: !m.flagged })}
        >
          <IconFlag size={16} />
        </IconButton>
        <IconButton
          label={m.pinned ? tr("reader.unpin") : tr("reader.pin")}
          className={`size-7 ${m.pinned ? "text-brand" : ""}`}
          onClick={() => void setFlags(m.id, { pinned: !m.pinned })}
        >
          <IconPin size={16} />
        </IconButton>
      </div>
    </div>
  );
}

/** A draft kept on this computer. Clicking it opens the composer again. */
function DraftRow({ d, now, showAccount }: { d: StoredDraft; now: Date; showAccount?: boolean }) {
  const open = useStore((s) => s.draft?.id === d.id);
  const account = useStore((s) => s.accounts.find((a) => a.id === d.accountId)?.address);
  const { openDraft, deleteDraft } = useStore.getState();
  const tr = useT();
  return (
    <div
      role="option"
      aria-selected={open}
      tabIndex={0}
      onClick={() => openDraft(d.id)}
      onKeyDown={(e) => e.key === "Enter" && openDraft(d.id)}
      style={{ paddingTop: "var(--row-pad)", paddingBottom: "var(--row-pad)" }}
      className={`group relative flex cursor-default gap-3 border-b border-edge px-4 ${open ? "bg-sel" : "hover:bg-hover"}`}
    >
      <Avatar name={d.to || tr("list.draft")} />
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2">
          <span className="truncate">{d.to || tr("list.noRecipient")}</span>
          <span className="flex-none text-xs whitespace-nowrap text-ink2 group-hover:invisible">{shortTime(new Date(d.updatedAt * 1000), now)}</span>
        </div>
        <div className="truncate">{d.subject || tr("list.noSubject")}</div>
        <div className="truncate text-ink2">
          {showAccount && account ? `${account} · ` : ""}
          {d.html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim() || " "}
        </div>
      </div>
      {/* The open draft is discarded from the composer, which knows about unsaved typing. */}
      {!open && (
        <div className="absolute top-6 right-1.5 hidden rounded-lg bg-card shadow-sm group-hover:flex" onClick={(e) => e.stopPropagation()}>
          <IconButton label={tr("list.discardDraft")} className="size-7" onClick={() => void deleteDraft(d.id)}>
            <IconTrash size={16} />
          </IconButton>
        </div>
      )}
    </div>
  );
}

export function MessageList({ width }: { width: number }) {
  const items = useStore((s) => s.items);
  const pinned = useStore((s) => s.pinned);
  const hasMore = useStore((s) => s.hasMore);
  const loadMore = useStore((s) => s.loadMore);
  const folders = useStore((s) => s.folders);
  const folderId = useStore((s) => s.folderId);
  const folder = useMemo(() => currentFolder({ folders, folderId }), [folders, folderId]);
  const allDrafts = useStore((s) => s.drafts);
  const typed = useStore((s) => s.query);
  const query = typed.trim();
  const setQuery = useStore((s) => s.setQuery);
  const only = useStore((s) => s.only);
  const setOnly = useStore((s) => s.setOnly);
  const search = useRef<HTMLInputElement>(null);
  // Ctrl+K (or Ctrl+E, as in Outlook) jumps to search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mod(e) && ["k", "e"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const searchServer = useStore((s) => s.searchServer);
  const tr = useT();
  const [menu, setMenu] = useState<{ x: number; y: number; m: MessageSummary } | null>(null);
  // Folded conversations: the setting keeps the choice, and `opened` holds the ones showing.
  const collapsed = useStore((s) => s.settings.threads === "on");
  const setSetting = useStore((s) => s.setSetting);
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  // Moving to another folder or searching again starts with every conversation folded.
  useEffect(() => setOpened(new Set()), [folderId, query, only]);
  const threadOf = (m: MessageSummary) => (m.threadKey ? `${m.accountId}:${m.threadKey}` : null);
  const toggleThread = (key: string) =>
    setOpened((seen) => {
      const next = new Set(seen);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  // Refreshed whenever the list changes, so "Today" stays right overnight.
  const now = useMemo(() => new Date(), [items]);
  const focusedInbox = useStore((s) => s.settings.focused_inbox !== "off");
  // "Other" (mailings only) is offered for inboxes while the Focused inbox setting is on.
  const isInbox = folder?.role === "inbox" && focusedInbox;
  const chips: [Only, string][] = [
    ["all", tr("list.chipAll")],
    ["unread", tr("list.chipUnread")],
    ["flagged", tr("list.chipFlagged")],
    ...(isInbox ? ([["other", tr("list.chipOther")]] as [Only, string][]) : []),
  ];

  const groups = useMemo(() => {
    // One row per conversation when folded, one row per message otherwise.
    const rows = (list: MessageSummary[]): Conversation[] => (collapsed ? conversations(list) : list.map((m) => ({ head: m, members: [m] })));
    if (query) return sections(rows(items), (r) => String(new Date(r.head.date * 1000).getFullYear()));
    return sections(
      rows(items.filter((m) => !m.pinned)),
      (r) => groupLabel(new Date(r.head.date * 1000), now),
    );
  }, [items, query, now, collapsed]);
  // Pinned mail is shown first, whichever folder it is in.
  const pins = (collapsed ? conversations(pinned) : pinned.map((m) => ({ head: m, members: [m] }))).filter(
    (r) => only === "all" || (only === "unread" ? r.head.unread : r.head.flagged),
  );
  const shown: Section<Conversation>[] = pins.length ? [{ label: tr("list.pinned"), items: pins }, ...groups] : groups;

  // Drafts written here are listed above the server's Drafts folder. Cross-account Drafts shows every local draft.
  const drafts = useMemo(() => {
    if (query || folder?.role !== "drafts") return [];
    if (folderId === VIEW.drafts) return allDrafts;
    return allDrafts.filter((d) => d.accountId === folder.accountId);
  }, [allDrafts, folder, folderId, query]);
  const empty = items.length === 0 && pinned.length === 0 && drafts.length === 0;
  return (
    <section className="flex flex-none flex-col overflow-hidden bg-card" style={{ width }} aria-label={tr("list.messages")}>
      <div className="flex-none border-b border-edge px-4 pt-3.5 pb-3">
        <label className={`flex h-9 items-center gap-2 rounded-lg px-3 ${typed ? "bg-card ring-1 ring-line" : "bg-canvas focus-within:bg-card focus-within:ring-1 focus-within:ring-line"}`}>
          <IconSearch size={16} className="flex-none text-ink3" />
          <input
            ref={search}
            value={typed}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder={tr("list.searchPlaceholder")}
            title={tr("list.searchHint")}
            aria-label={tr("list.searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink3"
          />
          {typed ? (
            <button type="button" aria-label={tr("list.clearSearch")} className="flex-none text-ink3 hover:text-ink" onClick={() => setQuery("")}>
              <IconX size={16} />
            </button>
          ) : (
            <span className="flex-none text-[11px] text-ink3">{MOD} K</span>
          )}
        </label>
        {query ? (
          <>
            <SearchChips />
            <div className="mt-2 flex items-baseline text-xs text-ink2">
              <span className="text-ink">{items.length === 1 ? tr("list.resultOne") : tr("list.resultMany", { n: items.length })}</span>
              <span className="ml-auto">{tr("list.newestFirst")}</span>
            </div>
          </>
        ) : (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="toolbar" aria-label={tr("list.show")}>
            {chips.map(([value, name]) => (
              <button
                key={value}
                type="button"
                aria-pressed={only === value}
                onClick={() => setOnly(value)}
                className={`h-7 rounded-full px-3 text-[13px] ${only === value ? "bg-soft text-brand" : "border border-edge text-ink2 hover:bg-hover"}`}
              >
                {name}
              </button>
            ))}
            {/* Folding is a choice about this list, so the switch sits with the filters. */}
            <button
              type="button"
              aria-pressed={collapsed}
              title={tr("list.threadsHint")}
              onClick={() => void setSetting("threads", collapsed ? "off" : "on")}
              className={`ml-auto h-7 rounded-full px-3 text-[13px] ${collapsed ? "bg-soft text-brand" : "border border-edge text-ink2 hover:bg-hover"}`}
            >
              {tr("list.threads")}
            </button>
          </div>
        )}
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto pb-1.5"
        role="listbox"
        aria-multiselectable
        aria-label={tr("list.messageList")}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (hasMore && el.scrollHeight - el.scrollTop - el.clientHeight < 600) void loadMore();
        }}
      >
        {drafts.length > 0 && (
          <div>
            <div className="border-b border-edge px-4 pt-3 pb-2 text-xs text-ink3">{tr("list.writtenHere")}</div>
            {drafts.map((d) => (
              <DraftRow key={d.id} d={d} now={now} showAccount={folderId === VIEW.drafts} />
            ))}
          </div>
        )}
        {shown.map((g) => (
          <div key={g.label}>
            <div className="border-b border-edge px-4 pt-3 pb-2 text-xs text-ink3">{g.label}</div>
            {g.items.map((row) => {
              const key = threadOf(row.head);
              const expandable = row.members.length > 1 && key !== null;
              const expanded = expandable && opened.has(key);
              return (
                <div key={row.head.id}>
                  <Row
                    m={row.head}
                    now={now}
                    query={query}
                    onMenu={(x, y, msg) => setMenu({ x, y, m: msg })}
                    thread={expandable ? { count: row.members.length, expanded, toggle: () => toggleThread(key) } : undefined}
                  />
                  {expanded && row.members.slice(1).map((m) => <Row key={m.id} m={m} now={now} query={query} onMenu={(x, y, msg) => setMenu({ x, y, m: msg })} nested />)}
                </div>
              );
            })}
          </div>
        ))}
        {empty && (
          <p className="px-4 py-10 text-center text-ink2">
            {query
              ? tr("list.noMatch")
              : !folder
                ? tr("list.needAccount")
                : only === "other"
                  ? tr("list.noMailings")
                  : only === "unread"
                    ? tr("list.noUnread")
                    : only === "flagged"
                      ? tr("list.noFlagged")
                      : tr("list.emptyFolder")}
          </p>
        )}
        {query && (
          <button type="button" onClick={() => void searchServer()} className="mx-auto my-2 block rounded-full px-3 py-1.5 text-brand hover:bg-hover">
            {tr("list.searchServer")}
          </button>
        )}
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={messageMenu(menu.m)} onClose={() => setMenu(null)} />}
    </section>
  );
}
