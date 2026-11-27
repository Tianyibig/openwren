import { IconInbox, IconPencil, IconSun } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { Avatar, Button } from "../components/ui";
import { longTime } from "../lib/dates";
import { useT } from "../lib/useTranslate";
import { VIEW, useStore } from "../store";
import { backend } from "../backend";
import type { MessageSummary } from "../types";

/** A quiet start-of-day overview: unread total, recent mail, drafts — no AI. */
export function Overview() {
  const tr = useT();
  const accounts = useStore((s) => s.accounts);
  const folders = useStore((s) => s.folders);
  const drafts = useStore((s) => s.drafts);
  const selectFolder = useStore((s) => s.selectFolder);
  const selectMessage = useStore((s) => s.selectMessage);
  const compose = useStore((s) => s.compose);
  const unread = useMemo(() => folders.filter((f) => f.role === "inbox").reduce((n, f) => n + f.unread, 0), [folders]);
  const [recent, setRecent] = useState<MessageSummary[]>([]);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    if (accounts.length === 0) {
      setRecent([]);
      return;
    }
    let cancelled = false;
    void backend.listMessages(VIEW.inbox, null, 8, 0, null).then((items) => {
      if (!cancelled) setRecent(items);
    });
    return () => {
      cancelled = true;
    };
  }, [accounts.length, folders]);

  const weekday = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const unreadLine =
    unread === 0 ? tr("today.unreadNone") : unread === 1 ? tr("today.unreadOne") : tr("today.unreadMany", { n: unread });

  if (accounts.length === 0) {
    return (
      <section className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-card px-8 text-center" aria-label={tr("folder.today")}>
        <IconSun size={36} stroke={1.25} className="text-ink3" />
        <p className="text-base text-ink">{tr("today.empty")}</p>
      </section>
    );
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-card" aria-label={tr("folder.today")}>
      <div className="mx-auto w-full max-w-2xl px-8 pt-10 pb-8">
        <p className="text-xs text-ink3">{weekday}</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">{tr("today.greeting")}</h1>
        <p className="mt-2 text-ink2">{unreadLine}</p>
        {drafts.length > 0 && (
          <p className="mt-1 text-sm text-ink3">
            {drafts.length === 1 ? tr("today.draftsOne") : tr("today.draftsMany", { n: drafts.length })}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => selectFolder(VIEW.inbox)}>
            <IconInbox size={18} /> {tr("today.openInbox")}
          </Button>
          <Button onClick={() => compose()}>
            <IconPencil size={18} /> {tr("today.compose")}
          </Button>
        </div>

        <h2 className="mt-10 mb-3 text-xs font-medium tracking-wide text-ink3 uppercase">{tr("today.recent")}</h2>
        <div className="overflow-hidden rounded-[14px] border border-edge">
          {recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-ink2">{tr("list.emptyFolder")}</p>
          ) : (
            recent.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  selectFolder(VIEW.inbox);
                  void selectMessage(m.id);
                }}
                className="flex w-full items-center gap-3 border-b border-edge px-4 py-3 text-left last:border-b-0 hover:bg-hover"
              >
                <Avatar name={m.fromName} address={m.fromAddress} auth={m.auth} accountId={m.accountId} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`truncate ${m.unread ? "font-semibold text-ink" : "text-ink"}`}>{m.fromName}</span>
                    {accounts.length > 1 && <span className="truncate text-xs text-ink3">{m.accountAddress}</span>}
                    <span className="ml-auto flex-none text-xs text-ink3">{longTime(new Date(m.date * 1000), now)}</span>
                  </div>
                  <div className={`truncate text-sm ${m.unread ? "text-ink" : "text-ink2"}`}>{m.subject || tr("list.noSubject")}</div>
                  <div className="truncate text-xs text-ink3">{m.preview || " "}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
