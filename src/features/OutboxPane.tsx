import { useEffect, useState } from "react";
import { backend, errorText } from "../backend";
import { Button } from "../components/ui";
import { longTime } from "../lib/dates";
import { useT } from "../lib/useTranslate";
import { useStore } from "../store";
import type { OutboxItem } from "../types";

/** Shared list of queued / failed sends (sidebar Outbox + Settings → Sync). */
export function OutboxList({ compact }: { compact?: boolean }) {
  const tr = useT();
  const showToast = useStore((s) => s.showToast);
  const refreshOutbox = useStore((s) => s.refreshOutbox);
  const items = useStore((s) => s.outbox);
  const [error, setError] = useState("");

  async function retry(id: number) {
    try {
      if (await backend.retrySend(id)) showToast(tr("outbox.retried"));
      await refreshOutbox();
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function cancel(id: number) {
    try {
      if (await backend.cancelSend(id)) showToast(tr("outbox.cancelled"));
      await refreshOutbox();
    } catch (e) {
      setError(errorText(e));
    }
  }

  const now = Math.floor(Date.now() / 1000);
  if (items === null) {
    return <p className="text-[13px] text-ink3">…</p>;
  }
  if (items.length === 0) {
    return <p className="text-[13px] text-ink3">{tr("outbox.empty")}</p>;
  }
  return (
    <>
      <div className={compact ? "divide-y divide-edge" : "divide-y divide-edge rounded-[10px] border border-edge"}>
        {items.map((item: OutboxItem) => (
          <div key={item.id} className={compact ? "px-4 py-3" : "px-3 py-2"}>
            <div className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{item.subject || tr("list.noSubject")}</span>
              <span className="flex-none text-xs text-ink3">
                {item.sendAt > now ? tr("outbox.scheduled", { when: longTime(new Date(item.sendAt * 1000), new Date()) }) : tr("outbox.waiting")}
              </span>
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
      {error && (
        <p className="selectable mt-3 rounded-[10px] bg-canvas px-3 py-2 text-[13px] text-danger" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/** Full-pane Outbox when selected in the sidebar (MailX-style). */
export function OutboxPane() {
  const tr = useT();
  const refreshOutbox = useStore((s) => s.refreshOutbox);
  useEffect(() => {
    void refreshOutbox();
    const timer = setInterval(() => void refreshOutbox(), 10_000);
    return () => clearInterval(timer);
  }, [refreshOutbox]);
  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card" aria-label={tr("folder.outbox")}>
      <div className="flex-none border-b border-edge px-5 pt-4 pb-3">
        <h1 className="text-lg font-medium text-ink">{tr("folder.outbox")}</h1>
        <p className="mt-1 text-[13px] text-ink2">{tr("outbox.note")}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <OutboxList compact />
      </div>
    </section>
  );
}
