import {
  IconArchive,
  IconArrowUpCircle,
  IconInbox,
  IconMailOff,
  IconMoon,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSend,
  IconSettings,
  IconStar,
  IconSun,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "../lib/useTranslate";
import { VIEW, useStore } from "../store";

type Entry = {
  id: string;
  title: string;
  keywords?: string;
  icon: typeof IconSearch;
  run: () => void;
};

function matches(text: string, entry: Pick<Entry, "title" | "keywords">): boolean {
  const hay = `${entry.title} ${entry.keywords ?? ""}`.toLowerCase();
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

/** Ctrl+K search & command hub (MailX-style). */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tr = useT();
  const accounts = useStore((s) => s.accounts);
  const folders = useStore((s) => s.folders);
  const selectFolder = useStore((s) => s.selectFolder);
  const compose = useStore((s) => s.compose);
  const setDialog = useStore((s) => s.setDialog);
  const syncNow = useStore((s) => s.syncNow);
  const setQuery = useStore((s) => s.setQuery);
  const setSetting = useStore((s) => s.setSetting);
  const query = useStore((s) => s.query);
  const outboxCount = useStore((s) => s.outbox?.length ?? 0);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setText("");
    setActive(0);
    const t = window.setTimeout(() => input.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const close = () => onClose();
  const act = (run: () => void) => {
    close();
    run();
  };

  const commands: Entry[] = useMemo(
    () => [
      { id: "compose", title: tr("palette.compose"), keywords: "new write mail", icon: IconPencil, run: () => compose() },
      { id: "settings", title: tr("palette.settings"), keywords: "preferences", icon: IconSettings, run: () => setDialog("settings") },
      { id: "add-account", title: tr("palette.addAccount"), keywords: "sign in", icon: IconPlus, run: () => setDialog("add-account") },
      { id: "sync", title: tr("palette.sync"), keywords: "refresh check mail", icon: IconRefresh, run: () => syncNow() },
      { id: "theme-light", title: tr("palette.themeLight"), keywords: "appearance", icon: IconSun, run: () => void setSetting("theme", "light") },
      { id: "theme-dark", title: tr("palette.themeDark"), keywords: "appearance", icon: IconMoon, run: () => void setSetting("theme", "dark") },
      { id: "theme-system", title: tr("palette.themeSystem"), keywords: "appearance", icon: IconSun, run: () => void setSetting("theme", "system") },
      ...(query.trim()
        ? [{ id: "clear-search", title: tr("palette.clearSearch"), keywords: "reset", icon: IconX, run: () => setQuery("") }]
        : []),
    ],
    [tr, compose, setDialog, syncNow, setSetting, query, setQuery],
  );

  const jumps: Entry[] = useMemo(() => {
    const views: Entry[] = [
      { id: "view-today", title: tr("folder.today"), keywords: "overview now", icon: IconSun, run: () => selectFolder(VIEW.overview) },
      { id: "view-inbox", title: tr("folder.inbox"), icon: IconInbox, run: () => selectFolder(VIEW.inbox) },
      { id: "view-starred", title: tr("folder.starred"), icon: IconStar, run: () => selectFolder(VIEW.flagged) },
      { id: "view-drafts", title: tr("folder.drafts"), icon: IconPencil, run: () => selectFolder(VIEW.drafts) },
      { id: "view-sent", title: tr("folder.sent"), icon: IconSend, run: () => selectFolder(VIEW.sent) },
      ...(outboxCount > 0
        ? [{ id: "view-outbox", title: tr("folder.outbox"), keywords: "queue send failed", icon: IconArrowUpCircle, run: () => selectFolder(VIEW.outbox) }]
        : []),
      { id: "view-archive", title: tr("folder.archive"), icon: IconArchive, run: () => selectFolder(VIEW.archive) },
      { id: "view-junk", title: tr("folder.junk"), icon: IconMailOff, run: () => selectFolder(VIEW.junk) },
      { id: "view-trash", title: tr("folder.trash"), icon: IconTrash, run: () => selectFolder(VIEW.trash) },
    ];
    const accountFolders = folders.map((f) => {
      const address = accounts.find((a) => a.id === f.accountId)?.address ?? "";
      return {
        id: `folder-${f.id}`,
        title: accounts.length > 1 ? `${f.name} · ${address}` : f.name,
        keywords: `${f.name} ${address} ${f.role}`,
        icon: IconInbox,
        run: () => selectFolder(f.id),
      };
    });
    return [...views, ...accountFolders];
  }, [tr, selectFolder, folders, accounts, outboxCount]);

  const typed = text.trim();
  const shownCommands = commands.filter((e) => matches(typed, e));
  const shownJumps = jumps.filter((e) => matches(typed, e));
  // When typing, prefer jumps first (mailbox names); when empty, commands first.
  const groups: { label: string; items: Entry[] }[] = typed
    ? [
        { label: tr("palette.jump"), items: shownJumps.slice(0, 12) },
        { label: tr("palette.commands"), items: shownCommands },
      ]
    : [
        { label: tr("palette.commands"), items: shownCommands },
        { label: tr("palette.jump"), items: shownJumps.slice(0, 8) },
      ];
  const flat = groups.flatMap((g) => g.items);
  const safeActive = flat.length ? Math.min(active, flat.length - 1) : 0;

  useEffect(() => setActive(0), [text]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-start justify-center bg-black/30 p-6 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr("palette.title")}
        className="flex w-[520px] max-w-full flex-col overflow-hidden rounded-[14px] border border-edge bg-card shadow-xl"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((n) => (flat.length ? (n + 1) % flat.length : 0));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((n) => (flat.length ? (n - 1 + flat.length) % flat.length : 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (flat[safeActive]) act(flat[safeActive]!.run);
            else if (typed) act(() => setQuery(typed));
          }
        }}
      >
        <label className="flex h-12 flex-none items-center gap-2 border-b border-edge px-4">
          <IconSearch size={18} className="flex-none text-ink3" />
          <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tr("palette.placeholder")}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink3"
            aria-label={tr("palette.placeholder")}
          />
          {text && (
            <button type="button" aria-label={tr("list.clearSearch")} className="text-ink3 hover:text-ink" onClick={() => setText("")}>
              <IconX size={16} />
            </button>
          )}
        </label>
        <div className="max-h-[min(420px,50vh)] overflow-y-auto py-2">
          {flat.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink2">
              {typed ? tr("palette.searchMail", { q: typed }) : tr("palette.empty")}
            </p>
          ) : (
            groups.map((g) =>
              g.items.length === 0 ? null : (
                <section key={g.label} className="mb-1">
                  <h3 className="px-4 py-1.5 text-[11px] font-medium tracking-wide text-ink3 uppercase">{g.label}</h3>
                  <ul role="listbox">
                    {g.items.map((item) => {
                      const idx = flat.indexOf(item);
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={idx === safeActive}
                            className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] ${idx === safeActive ? "bg-sel text-ink" : "text-ink2 hover:bg-hover"}`}
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => act(item.run)}
                          >
                            <Icon size={16} stroke={1.6} className="flex-none" />
                            <span className="truncate">{item.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ),
            )
          )}
          {typed && flat.length > 0 && (
            <button
              type="button"
              className="mx-4 mt-1 mb-2 flex w-[calc(100%-2rem)] items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-brand hover:bg-hover"
              onClick={() => act(() => setQuery(typed))}
            >
              <IconSearch size={16} />
              {tr("palette.searchMail", { q: typed })}
            </button>
          )}
          {typed && flat.length === 0 && (
            <button
              type="button"
              className="mx-4 mb-2 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-lg bg-soft px-3 py-2 text-[13px] text-brand"
              onClick={() => act(() => setQuery(typed))}
            >
              <IconSearch size={16} />
              {tr("palette.searchMail", { q: typed })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
