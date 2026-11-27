import { IconBell, IconCloudDownload, IconFilter, IconHeart, IconInfoCircle, IconPalette, IconShieldLock, IconSignature, IconTrash, IconUserCircle, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import logo from "../../src-tauri/icons/128x128.png";
import { backend, errorText } from "../backend";
import type { AppInfo, StorageInfo } from "../backend";
import { RichText } from "../components/RichText";
import { Button, Chip, ErrorNote, IconButton, categories, fieldBox, fieldCaption } from "../components/ui";
import { TEXT_SIZES, fontChoice } from "../lib/font";
import { longTime } from "../lib/dates";
import { LANGUAGES, language } from "../lib/i18n";
import { useT } from "../lib/useTranslate";
import { REPOSITORY, SPONSOR_PAGE, WEBSITE } from "../lib/links";
import { pictureFromFile, signatureHtml } from "../lib/signature";
import { useStore } from "../store";
import type { SettingsPage } from "../store";
import type { OutboxItem, Rule, RulesSweep, SavedSignature } from "../types";
import { statusText } from "./FolderPane";
import { imageSenders } from "./HtmlBody";

const pages: [SettingsPage, string, typeof IconBell][] = [
  ["accounts", "settings.accounts", IconUserCircle],
  ["signatures", "settings.signatures", IconSignature],
  ["sync", "settings.sync", IconCloudDownload],
  ["appearance", "settings.appearance", IconPalette],
  ["privacy", "settings.privacy", IconShieldLock],
  ["rules", "settings.rules", IconFilter],
  ["notifications", "settings.notifications", IconBell],
  ["about", "settings.about", IconInfoCircle],
  ["sponsor", "settings.sponsor", IconHeart],
];

function Problem({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="selectable mt-3 rounded-[10px] bg-canvas px-3 py-2 text-[13px] text-danger" role="alert">
      {text}
    </p>
  );
}

function Options<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="mb-4">
      <div className={fieldCaption}>{label}</div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <Chip key={v} on={value === v} onClick={() => onChange(v)}>
            {text}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Accounts() {
  const accounts = useStore((s) => s.accounts);
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  const tr = useT();
  const { setSetting, setDialog, refresh } = useStore.getState();
  const [confirm, setConfirm] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);

  // A large mailbox takes a while to delete: say so instead of looking stuck.
  const [removing, setRemoving] = useState<number | null>(null);

  async function remove(id: number) {
    setError(null);
    setRemoving(id);
    try {
      await backend.removeAccount(id);
      setConfirm(null);
      await refresh();
    } catch (e) {
      setError(e);
    } finally {
      setRemoving(null);
    }
  }

  // Reordering: drag a row by its handle, or focus the handle and press the up or down arrow.
  const [dragged, setDragged] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  async function move(id: number, to: number) {
    const from = accounts.findIndex((a) => a.id === id);
    if (from < 0 || to < 0 || to >= accounts.length || to === from) return;
    const next = [...accounts];
    next.splice(to, 0, ...next.splice(from, 1));
    useStore.setState({ accounts: next }); // show it at once; the engine follows
    setError(null);
    try {
      await backend.reorderAccounts(next.map((a) => a.id));
    } catch (e) {
      setError(e);
    }
    await refresh();
  }

  return (
    <>
      {accounts.map((a, index) => (
        <div
          key={a.id}
          className={`mb-2 flex items-center gap-2 rounded-[10px] border py-2 pr-3 pl-1.5 ${over === a.id && dragged !== a.id ? "border-brand bg-soft" : "border-edge"} ${dragged === a.id ? "opacity-50" : ""}`}
          onDragOver={(e) => {
            if (dragged === null) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setOver(a.id);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragged !== null) void move(dragged, index);
            setDragged(null);
            setOver(null);
          }}
        >
          {accounts.length > 1 && (
            <button
              type="button"
              draggable
              aria-label={tr("accounts.move", { address: a.address })}
              title={tr("accounts.dragToReorder")}
              className="flex-none cursor-grab rounded-md p-1.5 text-ink3 hover:bg-hover hover:text-ink active:cursor-grabbing"
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", a.address);
                setDragged(a.id);
              }}
              onDragEnd={() => {
                setDragged(null);
                setOver(null);
              }}
              onKeyDown={(e) => {
                if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                e.preventDefault();
                void move(a.id, index + (e.key === "ArrowUp" ? -1 : 1));
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
                <circle cx="4" cy="4" r="1.6" />
                <circle cx="10" cy="4" r="1.6" />
                <circle cx="4" cy="10" r="1.6" />
                <circle cx="10" cy="10" r="1.6" />
              </svg>
            </button>
          )}
          <div className={`min-w-0 flex-1 ${accounts.length > 1 ? "" : "pl-1.5"}`}>
            <div className="selectable truncate">{a.address}</div>
            <div className="truncate text-xs text-ink2">
              {a.kind === "gmail" ? "Google" : "IMAP"}
              {progress[a.id] && ` · ${statusText(progress[a.id], tr)}`}
            </div>
            <div className="truncate text-xs text-ink2" title={tr("accounts.senderChecksHint")}>
              {a.authServer ? tr("accounts.senderChecksBy", { server: a.authServer }) : tr("accounts.senderChecksLearning")}
            </div>
          </div>
          {removing === a.id ? (
            <span className="text-[13px] text-ink2" role="status">
              {tr("accounts.removing")}
            </span>
          ) : confirm === a.id ? (
            <>
              <span className="text-[13px] text-ink2">{tr("accounts.removeQuestion")}</span>
              <Button className="h-8 text-danger" onClick={() => void remove(a.id)}>
                {tr("accounts.remove")}
              </Button>
              <Button className="h-8" onClick={() => setConfirm(null)}>
                {tr("accounts.keep")}
              </Button>
            </>
          ) : (
            <IconButton label={tr("accounts.removeOne", { address: a.address })} onClick={() => setConfirm(a.id)}>
              <IconTrash size={18} />
            </IconButton>
          )}
        </div>
      ))}
      {accounts.length === 0 && <p className="mb-2 text-ink2">{tr("folder.noAccounts")}</p>}
      <Button variant="primary" onClick={() => setDialog("add-account")}>
        {tr("folder.addAccount")}
      </Button>
      <p className="mt-2 text-xs text-ink3">
        {accounts.length > 1 && `${tr("accounts.orderNote")} `}
        {tr("accounts.removeNote")}
      </p>
      <ErrorNote error={error} className="mt-2" />

      <h3 className="mt-6 mb-1 font-semibold">{tr("accounts.googleTitle")}</h3>
      <p className="mb-2 text-[13px] text-ink2">{tr("accounts.googleNote")}</p>
      <label className={fieldCaption} htmlFor="g-id">
        {tr("accounts.clientId")}
      </label>
      <input id="g-id" className={fieldBox} value={settings.google_client_id ?? ""} placeholder="1234567890-abc.apps.googleusercontent.com" autoComplete="off" onChange={(e) => void setSetting("google_client_id", e.target.value)} />
      <label className={`${fieldCaption} mt-3`} htmlFor="g-secret">
        {tr("accounts.clientSecret")}
      </label>
      <input id="g-secret" type="password" className={fieldBox} value={settings.google_client_secret ?? ""} autoComplete="off" onChange={(e) => void setSetting("google_client_secret", e.target.value)} />
    </>
  );
}

function Signatures() {
  const signatures = useStore((s) => s.signatures);
  const defaults = useStore((s) => s.signatureDefaults);
  const accounts = useStore((s) => s.accounts);
  const loadPreferences = useStore((s) => s.loadPreferences);
  const tr = useT();
  const [editing, setEditing] = useState<SavedSignature | null>(signatures[0] ?? null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const defaultsOf = (accountId: number) => defaults.find((d) => d.accountId === accountId) ?? { accountId, newId: null, replyId: null };
  const nameOf = (id: number | null) => signatures.find((s) => s.id === id)?.name ?? null;

  // ----- saving, automatically -----
  /** The signature as last edited, and whether that is saved yet. */
  const latest = useRef(editing);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** Writes run one after another. */
  const writing = useRef(Promise.resolve());
  const run = (work: () => Promise<void>) => {
    writing.current = writing.current.then(work).then(
      () => (setError(""), setSaved(true)),
      (e) => setError(errorText(e)),
    );
    return writing.current;
  };
  /** Save now, if anything changed. Uses only refs, so it also works while Settings closes. */
  const flush = useRef(() => {
    clearTimeout(timer.current);
    const signature = latest.current;
    if (!dirty.current || !signature) return;
    dirty.current = false;
    void run(async () => {
      await backend.saveSignature(signature);
      await loadPreferences();
    });
  }).current;
  useEffect(() => flush, [flush]);

  /** Change the signature being edited; it is saved shortly after the last change. */
  const change = (part: Partial<SavedSignature>) => {
    if (!latest.current) return;
    latest.current = { ...latest.current, ...part };
    setEditing(latest.current);
    dirty.current = true;
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };
  const edit = (signature: SavedSignature | null) => {
    flush();
    latest.current = signature;
    setEditing(signature);
    setSaved(false);
  };

  /** Use the signature for an account's new mail or replies, or stop using it there. */
  const setUse = (accountId: number, which: "newId" | "replyId", on: boolean) => {
    const id = editing?.id;
    if (!id) return;
    void run(async () => {
      const now = useStore.getState().signatureDefaults.find((d) => d.accountId === accountId) ?? { accountId, newId: null, replyId: null };
      await backend.setSignatureDefaults({ ...now, [which]: on ? id : null });
      await loadPreferences();
    });
  };

  /** A new signature exists from the start, so every later change is simply saved. */
  const add = () => {
    flush();
    void run(async () => {
      const fresh: SavedSignature = { id: 0, name: tr("signature.new"), html: "", layout: "text", image: "" };
      const id = await backend.saveSignature(fresh);
      await loadPreferences();
      latest.current = { ...fresh, id };
      setEditing(latest.current);
    });
  };

  async function remove() {
    if (!editing) return;
    clearTimeout(timer.current);
    dirty.current = false;
    await run(async () => {
      await backend.deleteSignature(editing.id);
      await loadPreferences();
    });
    edit(useStore.getState().signatures[0] ?? null);
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {signatures.map((s) => (
          <Chip key={s.id} on={editing?.id === s.id} onClick={() => edit(s)}>
            {s.name}
          </Chip>
        ))}
        <Button variant="ghost" className="h-7 text-brand" onClick={add}>
          {tr("signature.new")}
        </Button>
      </div>
      {editing && (
        <>
          <label className={fieldCaption} htmlFor="sig-name">
            {tr("rules.name")}
          </label>
          <input id="sig-name" className={fieldBox} value={editing.name} placeholder={tr("signature.placeholder")} onChange={(e) => change({ name: e.target.value })} />
          <div className={`${fieldCaption} mt-3`}>{tr("composer.signature")}</div>
          <div className="rounded-[10px] border border-edge p-2">
            <RichText key={editing.id} label={tr("composer.signature")} className="h-36" initial={editing.html} onChange={(html) => html !== latest.current?.html && change({ html })} />
          </div>
          <div className={`${fieldCaption} mt-3`}>{tr("signature.picture")}</div>
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={tr("signature.layout")}>
            {(
              [
                ["text", tr("signature.noPicture")],
                ["left", tr("signature.left")],
                ["above", tr("signature.above")],
              ] as const
            ).map(([layout, name]) => (
              <Chip key={layout} on={editing.layout === layout} onClick={() => change({ layout })}>
                {name}
              </Chip>
            ))}
            {editing.layout !== "text" && (
              <>
                <label className="ml-2 inline-flex h-7 cursor-pointer items-center rounded-full border border-edge px-3 text-[13px] hover:bg-hover">
                  {editing.image ? tr("signature.changeImage") : tr("signature.chooseImage")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      pictureFromFile(file)
                        .then((image) => change({ image }))
                        .catch(() => setError(tr("signature.badImage")));
                    }}
                  />
                </label>
                {editing.image && (
                  <Button variant="ghost" className="h-7 text-ink2" onClick={() => change({ image: "" })}>
                    {tr("signature.removeImage")}
                  </Button>
                )}
              </>
            )}
          </div>
          {editing.layout !== "text" && (
            <>
              <div className={`${fieldCaption} mt-3`}>{tr("signature.preview")}</div>
              {editing.image ? (
                <div className="rich selectable rounded-[10px] border border-dashed border-edge p-3" dangerouslySetInnerHTML={{ __html: signatureHtml(editing) }} />
              ) : (
                <p className="text-[13px] text-ink2">{tr("signature.pictureNote")}</p>
              )}
            </>
          )}
          <div className={`${fieldCaption} mt-4`}>{tr("signature.addTo")}</div>
          {accounts.length === 0 ? (
            <p className="text-[13px] text-ink3">{tr("signature.addAccountFirst")}</p>
          ) : (
            <div className="divide-y divide-edge rounded-[10px] border border-edge">
              {accounts.map((a) => {
                const now = defaultsOf(a.id);
                const use = { fresh: now.newId === editing.id, reply: now.replyId === editing.id };
                // Another signature that this account keeps using where a box is not ticked.
                const other = [!use.fresh && now.newId !== editing.id && nameOf(now.newId), !use.reply && now.replyId !== editing.id && nameOf(now.replyId)].filter(Boolean);
                return (
                  <div key={a.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2" role="group" aria-label={a.address}>
                    <div className="min-w-40 flex-1">
                      <div className="truncate">{a.address}</div>
                      {other.length > 0 && <div className="text-xs text-ink3">{tr("signature.usesOtherwise", { names: [...new Set(other)].join("” and “") })}</div>}
                    </div>
                    <label className="flex items-center gap-1.5 text-[13px]">
                      <input type="checkbox" className="size-4 accent-brand" checked={use.fresh} onChange={(e) => setUse(a.id, "newId", e.target.checked)} />
                      {tr("folder.newMail")}
                    </label>
                    <label className="flex items-center gap-1.5 text-[13px]">
                      <input type="checkbox" className="size-4 accent-brand" checked={use.reply} onChange={(e) => setUse(a.id, "replyId", e.target.checked)} />
                      {tr("signature.replies")}
                    </label>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-1.5 text-xs text-ink3">{tr("signature.pickAnother")}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[13px] text-ink3" role="status">
              {saved ? tr("signature.saved") : tr("signature.autoSaved")}
            </span>
            <Button variant="ghost" className="ml-auto text-danger" onClick={() => void remove()}>
              <IconTrash size={16} /> {tr("signature.delete")}
            </Button>
          </div>
          <Problem text={error} />
        </>
      )}

    </>
  );
}

/** Where the mail database lives, and how to move it somewhere else. */
function WhereMailIsKept() {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tr = useT();
  useEffect(() => {
    backend
      .storageInfo()
      .then(setInfo)
      .catch((e) => setError(errorText(e)));
  }, []);

  async function choose() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      // The move itself happens at the next start, so nothing written meanwhile is lost.
      if (await backend.chooseStorageDir()) setInfo(await backend.storageInfo());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={`${fieldCaption} mt-5`}>{tr("storage.title")}</div>
      <p className="mb-2 text-[13px] text-ink2">{tr("storage.note")}</p>
      <div className="mb-2 selectable break-all rounded-[10px] border border-edge px-3 py-2 text-[13px]">{info ? info.dir : "…"}</div>
      {info?.pending ? (
        <div className="mb-2 rounded-[10px] bg-canvas px-3 py-2 text-[13px] text-ink2">
          <div className="selectable break-all">{tr("storage.moveNotice", { dir: info.pending })}</div>
          <Button className="mt-2" onClick={() => void backend.restartNow()}>
            {tr("storage.restart")}
          </Button>
        </div>
      ) : (
        <Button onClick={() => void choose()} disabled={busy}>
          {busy ? tr("storage.choosing") : tr("storage.change")}
        </Button>
      )}
      <Problem text={error} />
    </>
  );
}

function Sync() {
  const settings = useStore((s) => s.settings);
  const accounts = useStore((s) => s.accounts);
  const progress = useStore((s) => s.progress);
  const setSetting = useStore((s) => s.setSetting);
  const tr = useT();
  return (
    <>
      <Options
        label={tr("sync.keepText")}
        value={settings.body_days ?? "0"}
        onChange={(v) => void setSetting("body_days", v)}
        options={[
          ["0", tr("sync.keepAll")],
          ["730", tr("sync.keep2y")],
          ["365", tr("sync.keep1y")],
          ["90", tr("sync.keep3m")],
        ]}
      />
      <p className="mb-4 text-[13px] text-ink2">{tr("sync.keepNote")}</p>
      <WhereMailIsKept />
      <div className={`${fieldCaption} mt-5`}>{tr("sync.status")}</div>
      {accounts.map((a) => (
        <div key={a.id} className="mb-2 rounded-[10px] border border-edge px-3 py-2">
          <div className="truncate">{a.address}</div>
          <div className={`truncate text-xs ${progress[a.id]?.phase === "error" ? "text-danger" : "text-ink2"}`}>{statusText(progress[a.id], tr) || tr("sync.waiting")}</div>
        </div>
      ))}
      <Button onClick={() => void backend.syncNow()}>{tr("sync.now")}</Button>
      <QueuedSends />
    </>
  );
}

/** Messages written but not on the server yet: scheduled, or waiting for another try. */
function QueuedSends() {
  const tr = useT();
  const showToast = useStore((s) => s.showToast);
  const [items, setItems] = useState<OutboxItem[] | null>(null);
  const [error, setError] = useState("");
  const reload = () =>
    backend
      .listOutbox()
      .then(setItems)
      .catch((e) => setError(errorText(e)));
  useEffect(() => {
    void reload();
    // Nothing announces a send finishing or failing, so look again while the page is open.
    const timer = setInterval(() => void reload(), 10_000);
    return () => clearInterval(timer);
  }, []);

  async function retry(id: number) {
    try {
      if (await backend.retrySend(id)) showToast(tr("outbox.retried"));
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function cancel(id: number) {
    try {
      if (await backend.cancelSend(id)) showToast(tr("outbox.cancelled"));
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  const now = Math.floor(Date.now() / 1000);
  return (
    <>
      <div className={`${fieldCaption} mt-5`}>{tr("outbox.title")}</div>
      <p className="mb-2 text-[13px] text-ink2">{tr("outbox.note")}</p>
      {items === null ? (
        <p className="text-[13px] text-ink3">…</p>
      ) : items.length === 0 ? (
        <p className="text-[13px] text-ink3">{tr("outbox.empty")}</p>
      ) : (
        <div className="divide-y divide-edge rounded-[10px] border border-edge">
          {items.map((item) => (
            <div key={item.id} className="px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px]">{item.subject || tr("list.noSubject")}</span>
                <span className="flex-none text-xs text-ink3">{item.sendAt > now ? tr("outbox.scheduled", { when: longTime(new Date(item.sendAt * 1000), new Date()) }) : tr("outbox.waiting")}</span>
              </div>
              <div className="truncate text-xs text-ink2">{item.to}</div>
              <div className="mt-1 text-xs text-ink3">{item.attempts > 0 ? tr("outbox.tried", { n: item.attempts }) : tr("outbox.firstTry")}</div>
              {item.lastError && <div className="selectable mt-0.5 text-xs break-words text-danger">{tr("outbox.error", { error: item.lastError })}</div>}
              <div className="mt-1.5 flex gap-2">
                <Button className="h-7" onClick={() => void retry(item.id)}>
                  {tr("outbox.retry")}
                </Button>
                <Button className="h-7" variant="ghost" onClick={() => void cancel(item.id)}>
                  {tr("outbox.cancel")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Problem text={error} />
    </>
  );
}

function Appearance() {
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const systemFont = useStore((s) => s.systemFont.family);
  const tr = useT();
  return (
    <>
      <Options
        label={tr("appearance.language")}
        value={language(settings.language)}
        onChange={(v) => void setSetting("language", v)}
        options={LANGUAGES.map((l): [string, string] => [l.id, l.name])}
      />
      <Options
        label={tr("appearance.font")}
        value={fontChoice(settings.font)}
        onChange={(v) => void setSetting("font", v)}
        options={[
          ["inter", "Inter"],
          ["nunito", tr("appearance.fontNunito")],
          ["system", systemFont ? tr("appearance.fontSystemName", { name: systemFont }) : tr("appearance.fontSystem")],
        ]}
      />
      <Options label={tr("appearance.textSize")} value={settings.text_size ?? "15"} onChange={(v) => void setSetting("text_size", v)} options={TEXT_SIZES} />
      <Options
        label={tr("appearance.timeFormat")}
        value={settings.time_format === "12" ? "12" : "24"}
        onChange={(v) => void setSetting("time_format", v)}
        options={[
          ["24", tr("appearance.time24")],
          ["12", tr("appearance.time12")],
        ]}
      />
      <Options
        label={tr("appearance.theme")}
        value={settings.theme ?? "system"}
        onChange={(v) => void setSetting("theme", v)}
        options={[
          ["system", tr("appearance.themeSystem")],
          ["light", tr("appearance.themeLight")],
          ["dark", tr("appearance.themeDark")],
        ]}
      />
      <Options
        label={tr("appearance.focused")}
        value={settings.focused_inbox === "off" ? "off" : "on"}
        onChange={(v) => void setSetting("focused_inbox", v)}
        options={[
          ["on", tr("appearance.focusedOn")],
          ["off", tr("appearance.focusedOff")],
        ]}
      />
      <Options
        label={tr("appearance.density")}
        value={settings.density ?? "cozy"}
        onChange={(v) => void setSetting("density", v)}
        options={[
          ["roomy", tr("appearance.roomy")],
          ["cozy", tr("appearance.cozy")],
          ["compact", tr("appearance.compact")],
        ]}
      />
      <Options
        label={tr("appearance.undoSend")}
        value={settings.undo_seconds ?? "10"}
        onChange={(v) => void setSetting("undo_seconds", v)}
        options={[
          ["0", tr("appearance.off")],
          ["5", tr("appearance.seconds", { n: 5 })],
          ["10", tr("appearance.seconds", { n: 10 })],
          ["30", tr("appearance.seconds", { n: 30 })],
        ]}
      />
    </>
  );
}

function Privacy() {
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const tr = useT();
  const onOff: ["on" | "off", string][] = [
    ["on", tr("privacyPage.on")],
    ["off", tr("privacyPage.off")],
  ];
  const note = "mb-4 -mt-2 text-[13px] text-ink2";
  // Same format as the image list: a JSON list of text entries.
  const blockedList = imageSenders(settings.blocked_senders);
  const imageList = imageSenders(settings.image_senders);
  return (
    <>
      <Options label={tr("privacyPage.trackers")} value={settings.block_trackers === "off" ? "off" : "on"} onChange={(v) => void setSetting("block_trackers", v)} options={onOff} />
      <p className={note}>{tr("privacyPage.trackersNote")}</p>
      <Options label={tr("privacyPage.warn")} value={settings.phishing_warnings === "off" ? "off" : "on"} onChange={(v) => void setSetting("phishing_warnings", v)} options={onOff} />
      <p className={note}>{tr("privacyPage.warnNote")}</p>
      <Options label={tr("privacyPage.logos")} value={settings.brand_logos === "off" ? "off" : "on"} onChange={(v) => void setSetting("brand_logos", v)} options={onOff} />
      <p className={note}>{tr("privacyPage.logosNote")}</p>
      <Options label={tr("privacyPage.updates")} value={settings.update_check === "off" ? "off" : "on"} onChange={(v) => void setSetting("update_check", v)} options={onOff} />
      <p className={note}>{tr("privacyPage.updatesNote")}</p>
      <Options label={tr("privacyPage.usage")} value={settings.usage_stats === "on" ? "on" : "off"} onChange={(v) => void setSetting("usage_stats", v)} options={onOff} />
      <p className={note}>{tr("privacyPage.usageNote")}</p>
      <div className="mb-1 font-semibold">{tr("privacyPage.blockedTitle")}</div>
      <p className="mb-2 text-[13px] text-ink2">{tr("privacyPage.blockedNote")}</p>
      {blockedList.length === 0 ? (
        <p className="mb-4 text-[13px] text-ink3">{tr("privacyPage.nobodyBlocked")}</p>
      ) : (
        <div className="mb-4 rounded-[10px] border border-edge">
          {blockedList.map((entry) => (
            <div key={entry} className="flex items-center gap-2 border-b border-edge px-3 py-1.5 last:border-b-0">
              <span className="selectable min-w-0 flex-1 truncate">{entry.startsWith("@") ? tr("privacyPage.everyoneAt", { domain: entry.slice(1) }) : entry}</span>
              <Button className="h-7" onClick={() => void setSetting("blocked_senders", JSON.stringify(blockedList.filter((e) => e !== entry)))}>
                {tr("privacyPage.unblock")}
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="mb-1 font-semibold">{tr("privacyPage.imagesTitle")}</div>
      <p className="mb-2 text-[13px] text-ink2">{tr("privacyPage.imagesNote")}</p>
      {imageList.length === 0 ? (
        <p className="mb-4 text-[13px] text-ink3">{tr("privacyPage.noSenders")}</p>
      ) : (
        <div className="mb-4 rounded-[10px] border border-edge">
          {imageList.map((address) => (
            <div key={address} className="flex items-center gap-2 border-b border-edge px-3 py-1.5 last:border-b-0">
              <span className="selectable min-w-0 flex-1 truncate">{address}</span>
              <Button className="h-7" onClick={() => void setSetting("image_senders", JSON.stringify(imageList.filter((a) => a !== address)))}>
                {tr("privacyPage.remove")}
              </Button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[13px] text-ink2">{tr("privacyPage.alwaysOn")}</p>
    </>
  );
}

const blank: Rule = { id: 0, name: "", enabled: true, fromContains: "", subjectContains: "", action: "move", target: "Archive" };
const actionKeys: [Rule["action"], string][] = [
  ["move", "rules.move"],
  ["category", "rules.setCategory"],
  ["flag", "reader.flag"],
  ["read", "reader.markRead"],
  ["delete", "reader.delete"],
];

function Rules() {
  const tr = useT();
  const [rules, setRules] = useState<Rule[]>([]);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [error, setError] = useState("");
  const [sweeping, setSweeping] = useState(false);
  const [swept, setSwept] = useState<RulesSweep | null>(null);
  const reload = () => backend.listRules().then(setRules);
  useEffect(() => void reload(), []);

  /** Rules see new mail as it arrives; this runs them over what is already in the inbox. */
  async function runOverExisting() {
    setSweeping(true);
    setSwept(null);
    try {
      setSwept(await backend.applyRulesNow(null));
      setError("");
      await useStore.getState().refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSweeping(false);
    }
  }

  async function save() {
    if (!editing) return;
    try {
      await backend.saveRule(editing);
      setEditing(null);
      setError("");
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  const describe = (r: Rule) => {
    const from = r.fromContains && tr("rules.from", { value: r.fromContains });
    const subject = r.subjectContains && tr("rules.subject", { value: r.subjectContains });
    const condition = from && subject ? tr("rules.both", { first: from, second: subject }) : (from || subject || "");
    const action = actionKeys.find((a) => a[0] === r.action);
    return condition + " → " + (action ? tr(action[1]) : r.action) + (r.action === "move" || r.action === "category" ? tr("rules.target", { value: r.target }) : "");
  };

  return (
    <>
      <p className="mb-3 text-[13px] text-ink2">{tr("rules.intro")}</p>
      <div className="mb-3 rounded-[10px] border border-edge px-3 py-2.5">
        <div className="text-[13px]">{tr("rules.runTitle")}</div>
        <p className="mt-0.5 text-xs text-ink3">{tr("rules.runNote")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button className="h-8" onClick={() => void runOverExisting()} disabled={sweeping || rules.length === 0}>
            {sweeping ? tr("rules.running") : tr("rules.runNow")}
          </Button>
          {swept && (
            <span className="text-xs text-ink2" role="status">
              {swept.checked === 0 ? tr("rules.ranNothing") : swept.matched === 0 ? tr("rules.ranNoMatch", { checked: swept.checked }) : tr("rules.ranMatched", { checked: swept.checked, matched: swept.matched })}
            </span>
          )}
        </div>
      </div>
      {rules.map((r) => (
        <div key={r.id} className="mb-2 flex items-center gap-3 rounded-[10px] border border-edge px-3 py-2">
          <input type="checkbox" aria-label={tr("rules.enable", { name: r.name })} checked={r.enabled} onChange={(e) => void backend.saveRule({ ...r, enabled: e.target.checked }).then(reload)} />
          <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(r)}>
            <div className="truncate">{r.name}</div>
            <div className="truncate text-xs text-ink2">{describe(r)}</div>
          </button>
          <IconButton label={tr("rules.delete", { name: r.name })} onClick={() => void backend.deleteRule(r.id).then(reload)}>
            <IconTrash size={18} />
          </IconButton>
        </div>
      ))}
      {!editing && (
        <Button variant="primary" onClick={() => setEditing(blank)}>
          {tr("rules.new")}
        </Button>
      )}
      {editing && (
        <div className="mt-3 rounded-[10px] border border-edge p-3">
          <label className={fieldCaption} htmlFor="rule-name">
            {tr("rules.name")}
          </label>
          <input id="rule-name" className={fieldBox} value={editing.name} placeholder={tr("rules.namePlaceholder")} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className={fieldCaption} htmlFor="rule-from">
                {tr("rules.senderContains")}
              </label>
              <input id="rule-from" className={fieldBox} value={editing.fromContains} placeholder={tr("rules.senderPlaceholder")} onChange={(e) => setEditing({ ...editing, fromContains: e.target.value })} />
            </div>
            <div>
              <label className={fieldCaption} htmlFor="rule-subject">
                {tr("rules.subjectContains")}
              </label>
              <input id="rule-subject" className={fieldBox} value={editing.subjectContains} onChange={(e) => setEditing({ ...editing, subjectContains: e.target.value })} />
            </div>
            <div>
              <label className={fieldCaption} htmlFor="rule-action">
                {tr("rules.then")}
              </label>
              <select
                id="rule-action"
                className={fieldBox}
                value={editing.action}
                onChange={(e) => {
                  const action = e.target.value as Rule["action"];
                  setEditing({ ...editing, action, target: action === "category" ? "Blue" : action === "move" ? "Archive" : "" });
                }}
              >
                {actionKeys.map(([v, key]) => (
                  <option key={v} value={v}>
                    {tr(key)}
                  </option>
                ))}
              </select>
            </div>
            {editing.action === "move" && (
              <div>
                <label className={fieldCaption} htmlFor="rule-target">
                  {tr("rules.folderName")}
                </label>
                <input id="rule-target" className={fieldBox} value={editing.target} onChange={(e) => setEditing({ ...editing, target: e.target.value })} />
              </div>
            )}
            {editing.action === "category" && (
              <div>
                <label className={fieldCaption} htmlFor="rule-category">
                  {tr("rules.category")}
                </label>
                <select id="rule-category" className={fieldBox} value={editing.target} onChange={(e) => setEditing({ ...editing, target: e.target.value })}>
                  {Object.keys(categories).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" onClick={() => void save()}>
              {tr("rules.save")}
            </Button>
            <Button onClick={() => (setEditing(null), setError(""))}>{tr("rules.cancel")}</Button>
          </div>
          <Problem text={error} />
        </div>
      )}
    </>
  );
}

function Notifications() {
  const settings = useStore((s) => s.settings);
  const setSetting = useStore((s) => s.setSetting);
  const tr = useT();
  return (
    <>
      <Options
        label={tr("notify.focused")}
        value={settings.notifications ?? "on"}
        onChange={(v) => void setSetting("notifications", v)}
        options={[
          ["on", tr("privacyPage.on")],
          ["off", tr("privacyPage.off")],
        ]}
      />
      <p className="mb-4 -mt-2 text-[13px] text-ink2">{tr("notify.verificationNote")}</p>
      <Options
        label={tr("notify.trashAfterCopy")}
        value={settings.trash_verification_after_copy === "on" ? "on" : "off"}
        onChange={(v) => void setSetting("trash_verification_after_copy", v)}
        options={[
          ["on", tr("privacyPage.on")],
          ["off", tr("privacyPage.off")],
        ]}
      />
      <p className="mb-4 -mt-2 text-[13px] text-ink2">{tr("notify.trashAfterCopyNote")}</p>
      <Options
        label={tr("notify.closeToTray")}
        value={settings.close_to_tray === "off" ? "off" : "on"}
        onChange={(v) => void setSetting("close_to_tray", v)}
        options={[
          ["on", tr("notify.keepInTray")],
          ["off", tr("notify.quit")],
        ]}
      />
      <Options
        label={tr("notify.atLogin")}
        value={settings.start_at_login === "off" ? "off" : "on"}
        onChange={(v) => void setSetting("start_at_login", v)}
        options={[
          ["on", tr("notify.startInTray")],
          ["off", tr("notify.doNotStart")],
        ]}
      />
      <p className="text-[13px] text-ink2">{tr("notify.note")}</p>
    </>
  );
}

const builtWith: [string, string][] = [
  ["Tauri", "https://tauri.app"],
  ["Rust", "https://www.rust-lang.org"],
  ["React", "https://react.dev"],
  ["SQLCipher", "https://www.zetetic.net/sqlcipher/"],
  ["TipTap", "https://tiptap.dev"],
  ["Tabler Icons", "https://tabler.io/icons"],
  ["Inter", "https://rsms.me/inter/"],
];

/** The command that installs a new version on systems where apt or dnf does it. */
const SYSTEM_UPDATE: Record<string, string> = {
  deb: "sudo apt update && sudo apt install --only-upgrade openwren",
  rpm: "sudo dnf upgrade openwren",
};

/** Whether a newer version exists, and the way to get it for this kind of installation. */
function Updates({ version }: { version: string }) {
  const update = useStore((s) => s.update);
  const tr = useT();
  const [state, setState] = useState<"idle" | "checking" | "current" | "installing">("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function check() {
    setState("checking");
    setError("");
    try {
      const found = await backend.checkUpdate();
      useStore.setState({ update: found });
      setState(found ? "idle" : "current");
    } catch (e) {
      setError(errorText(e));
      setState("idle");
    }
  }
  async function install() {
    setState("installing");
    setError("");
    try {
      await backend.installUpdate(); // OpenWren restarts when this succeeds
    } catch (e) {
      setError(errorText(e));
      setState("idle");
    }
  }

  if (!update) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[10px] border border-edge px-3 py-2.5">
        <span className="text-ink2">{state === "current" ? tr("updates.newest", { version }) : state === "checking" ? tr("updates.checking") : tr("updates.watchNote")}</span>
        <Button className="ml-auto h-7" onClick={() => void check()}>
          {tr("updates.checkNow")}
        </Button>
        <Problem text={error} />
      </div>
    );
  }
  const command = SYSTEM_UPDATE[update.package];
  return (
    <div className="mt-4 rounded-[10px] border border-brand/40 bg-brand/5 px-3 py-2.5" role="status">
      <div className="font-semibold">{tr("updates.available", { version: update.version })}</div>
      {update.notes && <p className="mt-0.5 text-[13px] text-ink2">{update.notes}</p>}
      {update.how === "install" && (
        <div className="mt-2 flex items-center gap-3">
          <Button variant="primary" onClick={() => void install()}>
            {state === "installing" ? tr("updates.installing") : tr("updates.installRestart")}
          </Button>
          <span className="text-[13px] text-ink2">{tr("updates.signed")}</span>
        </div>
      )}
      {update.how === "system" && command && (
        <>
          <p className="mt-1 text-[13px] text-ink2">{tr("updates.systemInstalls")}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="selectable min-w-0 flex-1 overflow-x-auto rounded-md bg-canvas px-2 py-1.5 font-mono text-xs whitespace-nowrap">{command}</code>
            <Button
              className="h-7 flex-none"
              onClick={() => {
                void navigator.clipboard.writeText(command).then(() => setCopied(true));
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? tr("updates.copied") : tr("updates.copy")}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-ink3">{tr("updates.quitAndStart")}</p>
        </>
      )}
      {(update.how === "download" || (update.how === "system" && !command)) && (
        <Button className="mt-2" onClick={() => void backend.openLink(`${WEBSITE}/download/`)}>
          {tr("updates.downloadPage")}
        </Button>
      )}
      <Problem text={error} />
      {error && update.how === "install" && (
        <Button className="mt-2" onClick={() => void backend.openLink(`${WEBSITE}/download/`)}>
          {tr("updates.downloadPage")}
        </Button>
      )}
    </div>
  );
}

function About() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const tr = useT();
  useEffect(() => {
    backend
      .appInfo()
      .then(setInfo)
      .catch((e) => console.error("app_info failed", e));
  }, []);
  const row = "flex gap-3 border-b border-edge py-2";
  const name = "w-36 flex-none text-ink2";
  return (
    <>
      <div className="flex items-center gap-4">
        <img src={logo} alt="" className="size-16" />
        <div>
          <div className="text-lg font-semibold">OpenWren</div>
          <div className="text-ink2">{info ? tr("about.version", { version: info.version }) : tr("about.preview")}</div>
        </div>
      </div>
      <p className="mt-4">{tr("about.intro")}</p>
      <Updates version={info?.version ?? ""} />
      <div className="mt-4 text-[13px]">
        <div className={row}>
          <span className={name}>{tr("about.licence")}</span>
          <span>
            {tr("about.licenceText")}{" "}
            <button type="button" className="text-brand underline" onClick={() => void backend.openLink("https://www.apache.org/licenses/LICENSE-2.0")}>
              {tr("about.readLicence")}
            </button>
            {" · "}
            <button type="button" className="text-brand underline" onClick={() => void backend.openLink(REPOSITORY)}>
              {tr("about.viewCode")}
            </button>
          </span>
        </div>
        {info && (
          <>
            <div className={row}>
              <span className={name}>{tr("about.database")}</span>
              <span className="selectable break-all">{info.dataDir}/openwren.db</span>
            </div>
            <div className={row}>
              <span className={name}>{tr("about.encryption")}</span>
              <span>{info.cipher ? tr("about.encryptedWith", { version: info.cipher.split(" ")[0] }) : tr("about.notEncrypted")}</span>
            </div>
            <div className={row}>
              <span className={name}>{tr("about.dbVersion")}</span>
              <span>{info.schemaVersion}</span>
            </div>
          </>
        )}
        <div className={row}>
          <span className={name}>{tr("about.builtWith")}</span>
          <span>
            {builtWith.map(([label, url], i) => (
              <span key={label}>
                {i > 0 && ", "}
                <button type="button" className="text-brand underline" onClick={() => void backend.openLink(url)}>
                  {label}
                </button>
              </span>
            ))}
          </span>
        </div>
      </div>
      <Button className="mt-4" onClick={() => useStore.getState().setWelcome(true)}>
        {tr("about.showWelcome")}
      </Button>
    </>
  );
}

/** Why the project asks for sponsors, and the way to become one. */
function Sponsor() {
  const tr = useT();
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex size-10 flex-none items-center justify-center rounded-full bg-danger/10 text-danger">
        <IconHeart size={20} />
      </div>
      <div className="min-w-0">
        <div className="font-semibold">{tr("sponsor.title")}</div>
        <p className="mt-1 text-[13px] text-ink2">{tr("sponsor.note")}</p>
        <Button className="mt-3" onClick={() => void backend.openLink(SPONSOR_PAGE)}>
          <IconHeart size={16} className="text-danger" /> {tr("sponsor.button")}
        </Button>
        <p className="mt-4 text-[13px] text-ink2">
          {tr("sponsor.starBefore")}
          <button type="button" className="text-brand underline" onClick={() => void backend.openLink(REPOSITORY)}>
            GitHub
          </button>
          {tr("sponsor.starAfter")}
        </p>
      </div>
    </div>
  );
}

const content: Record<SettingsPage, () => React.ReactNode> = {
  accounts: Accounts,
  signatures: Signatures,
  sync: Sync,
  appearance: Appearance,
  privacy: Privacy,
  rules: Rules,
  notifications: Notifications,
  about: About,
  sponsor: Sponsor,
};

export function Settings() {
  const page = useStore((s) => s.settingsPage);
  const setDialog = useStore((s) => s.setDialog);
  const tr = useT();
  const close = () => setDialog(null);
  const Page = content[page];
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={tr("settings.title")}
        className="flex h-[560px] max-h-full w-[820px] max-w-full overflow-hidden rounded-[14px] border border-edge bg-card shadow-xl"
        onKeyDown={(e) => e.key === "Escape" && close()}
      >
        <nav className="w-[210px] flex-none bg-canvas px-2 py-4" aria-label={tr("settings.sections")}>
          <div className="px-2 pb-3 text-lg font-semibold">{tr("settings.title")}</div>
          {pages.map(([id, name, Icon]) => (
            <button
              key={id}
              type="button"
              aria-current={page === id}
              onClick={() => setDialog("settings", id)}
              className={`flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-left ${page === id ? "bg-sel" : "hover:bg-hover"}`}
            >
              <Icon size={18} className={id === "sponsor" ? "text-danger" : "text-ink2"} />
              <span className={id === "sponsor" ? "text-danger" : undefined}>{tr(name)}</span>
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-3 flex items-center">
            <h2 className="text-base font-semibold">{tr(pages.find((p) => p[0] === page)?.[1] ?? "")}</h2>
            <IconButton label={tr("settings.close")} className="ml-auto" onClick={close}>
              <IconX size={20} />
            </IconButton>
          </div>
          <Page />
        </div>
      </div>
    </div>
  );
}
