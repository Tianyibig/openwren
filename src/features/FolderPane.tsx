import {
  IconArrowUpCircle,
  IconAlertCircle,
  IconArchive,
  IconChevronRight,
  IconCircleCheck,
  IconDots,
  IconFolder,
  IconInbox,
  IconMailOff,
  IconMailOpened,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSend,
  IconSettings,
  IconStar,
  IconSun,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import logo from "../../src-tauri/icons/128x128.png";
import { Button, ContextMenu } from "../components/ui";
import { VIEW, isOutbox, isOverview, isVirtualView, useStore, virtualFolder } from "../store";
import { useT } from "../lib/useTranslate";
import type { Translate } from "../lib/useTranslate";
import { DRAG_TYPE } from "./MessageList";
import type { Folder, FolderRole, Progress } from "../types";

const icons: Record<FolderRole, typeof IconInbox> = {
  inbox: IconInbox,
  drafts: IconPencil,
  sent: IconSend,
  trash: IconTrash,
  junk: IconMailOff,
  archive: IconArchive,
  custom: IconFolder,
};

const viewIcon: Record<number, typeof IconInbox> = {
  [VIEW.overview]: IconSun,
  [VIEW.inbox]: IconInbox,
  [VIEW.flagged]: IconStar,
  [VIEW.drafts]: IconPencil,
  [VIEW.sent]: IconSend,
  [VIEW.archive]: IconArchive,
  [VIEW.junk]: IconMailOff,
  [VIEW.trash]: IconTrash,
};

/** One folder or cross-account view row. */
function FolderRow({
  folder,
  label,
  pinned,
  icon,
}: {
  folder: Folder;
  label?: string;
  pinned?: boolean;
  icon?: typeof IconInbox;
}) {
  const selected = useStore((s) => s.folderId === folder.id && !s.query.trim());
  const selectFolder = useStore((s) => s.selectFolder);
  const moveMessages = useStore((s) => s.moveMessages);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const markFolderRead = useStore((s) => s.markFolderRead);
  const showToast = useStore((s) => s.showToast);
  const [over, setOver] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const tr = useT();
  const real = !isVirtualView(folder.id);
  const Icon = icon ?? (pinned && real ? IconStar : icons[folder.role]);
  const name = label ?? folder.name;
  const starLabel = folder.favorite ? tr("folder.removeFavorite") : tr("folder.addFavorite");
  return (
    <>
      <button
        type="button"
        onClick={() => selectFolder(folder.id)}
        aria-current={selected}
        title={name}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        onDragOver={(e) => {
          if (!real || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const { ids, accountId } = JSON.parse(e.dataTransfer.getData(DRAG_TYPE)) as { ids: number[]; accountId: number };
          if (accountId !== folder.accountId) showToast(tr("folder.moveWithinAccount"));
          else void moveMessages(ids, { folderId: folder.id });
        }}
        className={`flex w-full flex-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left ${over ? "bg-soft text-ink" : selected ? "bg-sel text-ink" : "text-ink2 hover:bg-hover"}`}
      >
        <Icon size={18} stroke={1.6} className="flex-none" />
        <span className="truncate">{name}</span>
        {folder.unread > 0 && <span className="ml-auto pl-1 text-xs text-ink3">{folder.unread}</span>}
      </button>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={[
            { label: tr("folder.markAllRead"), icon: <IconMailOpened size={16} />, onSelect: () => void markFolderRead(folder) },
            ...(real ? [{ label: starLabel, icon: <IconStar size={16} />, onSelect: () => void toggleFavorite(folder) }] : []),
          ]}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}

/** Cross-account views at the top of the sidebar (MailX-style). */
function TopViews({ folders }: { folders: Folder[] }) {
  const tr = useT();
  const folderId = useStore((s) => s.folderId);
  const outboxCount = useStore((s) => s.outbox?.length ?? 0);
  const [more, setMore] = useState(false);
  const primary: { id: number; label: string }[] = [
    { id: VIEW.overview, label: tr("folder.today") },
    { id: VIEW.inbox, label: tr("folder.inbox") },
    { id: VIEW.flagged, label: tr("folder.starred") },
    { id: VIEW.drafts, label: tr("folder.drafts") },
    { id: VIEW.sent, label: tr("folder.sent") },
  ];
  const extra: { id: number; label: string }[] = [
    { id: VIEW.archive, label: tr("folder.archive") },
    { id: VIEW.junk, label: tr("folder.junk") },
    { id: VIEW.trash, label: tr("folder.trash") },
  ];
  const showMore = more || extra.some((v) => v.id === folderId);
  const row = (id: number, label: string) => {
    if (id === VIEW.overview) {
      return (
        <button
          key={id}
          type="button"
          onClick={() => useStore.getState().selectFolder(id)}
          aria-current={isOverview(folderId)}
          className={`flex w-full flex-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left ${isOverview(folderId) ? "bg-sel text-ink" : "text-ink2 hover:bg-hover"}`}
        >
          <IconSun size={18} stroke={1.6} className="flex-none" />
          <span className="truncate">{label}</span>
        </button>
      );
    }
    const folder = virtualFolder(id, folders)!;
    return <FolderRow key={id} folder={folder} label={label} icon={viewIcon[id]} />;
  };
  return (
    <section className="flex flex-none flex-col gap-px pb-1">
      {primary.map((v) => row(v.id, v.label))}
      {/* Outbox only while something is waiting or failed (MailX-style). */}
      {(outboxCount > 0 || isOutbox(folderId)) && (
        <button
          type="button"
          onClick={() => useStore.getState().selectFolder(VIEW.outbox)}
          aria-current={isOutbox(folderId)}
          className={`flex w-full flex-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left ${isOutbox(folderId) ? "bg-sel text-ink" : "text-ink2 hover:bg-hover"}`}
        >
          <IconArrowUpCircle size={18} stroke={1.6} className="flex-none" />
          <span className="truncate">{tr("folder.outbox")}</span>
          {outboxCount > 0 && <span className="ml-auto pl-1 text-xs text-ink3">{outboxCount}</span>}
        </button>
      )}
      <button type="button" onClick={() => setMore(!showMore)} aria-expanded={showMore} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-ink2 hover:bg-hover">
        <IconDots size={18} stroke={1.6} className="flex-none" />
        {showMore ? tr("folder.less") : tr("folder.more")}
      </button>
      {showMore && extra.map((v) => row(v.id, v.label))}
    </section>
  );
}

/** An account: collapsed to one row by default when there are several (MailX-style). */
function AccountFolders({ address, folders, startOpen }: { address: string; folders: Folder[]; startOpen: boolean }) {
  const selectedId = useStore((s) => s.folderId);
  const tr = useT();
  const main = folders.filter((f) => f.role !== "custom");
  const extra = folders.filter((f) => f.role === "custom");
  const selectedHere = folders.some((f) => f.id === selectedId);
  const [open, setOpen] = useState(startOpen || selectedHere);
  const [more, setMore] = useState(false);
  useEffect(() => {
    if (selectedHere) setOpen(true);
  }, [selectedHere]);
  const shownExtra = more || extra.some((f) => f.id === selectedId);
  const unread = folders.reduce((n, f) => n + (f.role === "junk" ? 0 : f.unread), 0);
  return (
    <section className="flex flex-none flex-col gap-px">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title={address}
        className="flex w-full items-center gap-1.5 rounded-lg px-2.5 pt-4 pb-1.5 text-left text-xs text-ink3 hover:bg-hover"
      >
        <IconChevronRight size={14} stroke={2} className={`flex-none transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="min-w-0 flex-1 truncate">{address}</span>
        {!open && unread > 0 && <span className="flex-none text-ink3">{unread}</span>}
      </button>
      {open && (
        <>
          {main.map((f) => (
            <FolderRow key={f.id} folder={f} />
          ))}
          {extra.length > 0 && (
            <button type="button" onClick={() => setMore(!shownExtra)} aria-expanded={shownExtra} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-ink2 hover:bg-hover">
              <IconDots size={18} stroke={1.6} className="flex-none" />
              {shownExtra ? tr("folder.less") : tr("folder.more")}
            </button>
          )}
          {shownExtra && extra.map((f) => <FolderRow key={f.id} folder={f} />)}
        </>
      )}
    </section>
  );
}

/** One line describing what sync is doing for an account. */
export function statusText(p: Progress | undefined, tr: Translate): string {
  if (!p) return "";
  switch (p.phase) {
    case "folders":
      return tr("sync.checkingFolders");
    case "headers":
      return tr("sync.syncing", { folder: p.message, done: p.done.toLocaleString(), total: p.total.toLocaleString() });
    case "bodies":
      return tr("sync.downloading", { done: p.done.toLocaleString(), total: p.total.toLocaleString() });
    case "idle":
      return tr("sync.upToDate");
    case "error":
      return p.message;
  }
}

/** Shown above the sync line when a newer version exists. Opens Settings, About. */
function UpdateNotice() {
  const update = useStore((s) => s.update);
  const setDialog = useStore((s) => s.setDialog);
  const tr = useT();
  if (!update) return null;
  return (
    <button
      type="button"
      onClick={() => setDialog("settings", "about")}
      title={tr("folder.updateTitle", { version: update.version })}
      className="mt-1 flex w-full flex-none items-center gap-2 rounded-lg bg-brand/10 px-2.5 py-2 text-left text-xs font-medium text-brand hover:bg-brand/15"
    >
      <IconArrowUpCircle size={16} stroke={1.8} className="flex-none" />
      <span className="truncate">{tr("folder.updateAvailable", { version: update.version })}</span>
    </button>
  );
}

/** The line at the bottom of the sidebar: what sync is doing. Clicking it shows every account's state. */
function SyncStatus() {
  const syncNow = useStore((s) => s.syncNow);
  const setDialog = useStore((s) => s.setDialog);
  const accounts = useStore((s) => s.accounts);
  const progress = useStore((s) => s.progress);
  const tr = useT();
  const [open, setOpen] = useState<{ left: number; bottom: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);
  const all = accounts.flatMap((a) => (progress[a.id] ? [progress[a.id]] : []));
  const failed = all.find((p) => p.phase === "error");
  const busy = all.find((p) => p.phase !== "idle" && p.phase !== "error");
  const text = failed ? statusText(failed, tr) : busy ? statusText(busy, tr) : tr("sync.upToDate");
  const Icon = failed ? IconAlertCircle : busy ? IconRefresh : IconCircleCheck;
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open !== null}
        onClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          setOpen({ left: box.left, bottom: window.innerHeight - box.top + 4 });
        }}
        title={tr("folder.clickForAccounts", { text })}
        className={`mt-1 flex w-full flex-none items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-hover ${failed ? "text-danger" : "text-ink3"}`}
      >
        <Icon size={16} stroke={1.6} className={`flex-none ${busy && !failed ? "animate-spin" : ""}`} />
        <span className="truncate" role="status">
          {text}
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-30" onMouseDown={() => setOpen(null)}>
          <div
            role="dialog"
            aria-label={tr("folder.syncStatus")}
            className="fixed z-30 w-[340px] max-w-[calc(100vw-16px)] rounded-[10px] border border-edge bg-card p-3 shadow-lg"
            style={open}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-2 font-semibold text-ink">{tr("folder.syncStatus")}</div>
            {accounts.length === 0 && <p className="text-[13px] text-ink2">{tr("folder.noAccounts")}</p>}
            {accounts.map((a) => {
              const p = progress[a.id];
              const bad = p?.phase === "error";
              const Mark = bad ? IconAlertCircle : !p || p.phase === "idle" ? IconCircleCheck : IconRefresh;
              return (
                <div key={a.id} className="mb-2 flex gap-2">
                  <Mark size={16} stroke={1.6} className={`mt-0.5 flex-none ${bad ? "text-danger" : "text-ink3"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="selectable truncate text-[13px] text-ink">{a.address}</div>
                    <div className={`selectable text-xs break-words ${bad ? "text-danger" : "text-ink2"}`}>{statusText(p, tr) || tr("sync.waiting")}</div>
                    {p?.phase === "error" && p.kind && <div className="mt-0.5 text-xs text-danger">{tr(`error.${p.kind}`)}</div>}
                  </div>
                </div>
              );
            })}
            <div className="mt-3 flex gap-2">
              <Button className="h-8" onClick={syncNow}>
                {tr("sync.now")}
              </Button>
              {failed && (
                <Button
                  className="h-8"
                  onClick={() => {
                    setOpen(null);
                    setDialog("settings", "accounts");
                  }}
                >
                  {tr("folder.accountSettings")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** In the header beside Settings: checks every account for new mail now. Turns while a check runs. */
function RefreshButton() {
  const syncNow = useStore((s) => s.syncNow);
  const busy = useStore((s) => Object.values(s.progress).some((p) => p.phase !== "idle" && p.phase !== "error"));
  const tr = useT();
  return (
    <button type="button" aria-label={tr("folder.checkMail")} title={tr("folder.checkMail")} onClick={syncNow} className="ml-auto rounded-lg p-1.5 text-ink3 hover:bg-hover hover:text-ink">
      <IconRefresh size={18} stroke={1.6} className={busy ? "animate-spin" : ""} />
    </button>
  );
}

export function FolderPane({ width }: { width: number }) {
  const compose = useStore((s) => s.compose);
  const accounts = useStore((s) => s.accounts);
  const folders = useStore((s) => s.folders);
  const setDialog = useStore((s) => s.setDialog);
  const tr = useT();
  const favorites = folders.filter((f) => f.favorite && f.role !== "inbox");
  const owner = (f: Folder) => (accounts.length > 1 ? `${f.name} · ${accounts.find((a) => a.id === f.accountId)?.address ?? ""}` : undefined);
  return (
    <nav className="flex flex-none flex-col bg-card px-2.5 pt-3.5 pb-2" style={{ width }} aria-label={tr("folder.pane")}>
      <div className="mb-3 flex flex-none items-center gap-2 pr-0.5 pl-2">
        <img src={logo} alt="" className="size-[22px]" />
        <span className="truncate text-[17px] text-ink">OpenWren</span>
        <RefreshButton />
        <button type="button" aria-label={tr("folder.settings")} title={tr("folder.settings")} onClick={() => setDialog("settings")} className="rounded-lg p-1.5 text-ink3 hover:bg-hover hover:text-ink">
          <IconSettings size={18} stroke={1.6} />
        </button>
      </div>
      <button type="button" onClick={() => compose()} className="mb-3 flex h-10 w-full flex-none items-center justify-center gap-2 rounded-[10px] bg-soft text-brand hover:brightness-[0.97]">
        <IconPencil size={18} stroke={1.6} />
        {tr("folder.newMail")}
      </button>
      <div className="-mx-2.5 flex min-h-0 flex-1 flex-col gap-px overflow-y-auto px-2.5">
        {accounts.length > 0 && <TopViews folders={folders} />}
        {favorites.length > 0 && (
          <section className="flex flex-none flex-col gap-px border-t border-edge pt-2">
            {favorites.map((f) => (
              <FolderRow key={`fav-${f.id}`} folder={f} label={owner(f)} pinned />
            ))}
          </section>
        )}
        {accounts.length > 0 && (
          <p className="px-2.5 pt-4 pb-1 text-xs text-ink3">{tr("folder.mailboxes")}</p>
        )}
        {accounts.map((a, i) => (
          <AccountFolders key={a.id} address={a.address} folders={folders.filter((f) => f.accountId === a.id)} startOpen={accounts.length === 1 || i === 0} />
        ))}
        {accounts.length === 0 && (
          <button type="button" onClick={() => setDialog("add-account")} className="mt-2 flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-left text-brand hover:bg-hover">
            <IconPlus size={18} stroke={1.6} />
            {tr("folder.addAccount")}
          </button>
        )}
      </div>
      <UpdateNotice />
      <SyncStatus />
    </nav>
  );
}
