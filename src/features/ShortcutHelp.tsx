import { Button } from "../components/ui";
import { useT } from "../lib/useTranslate";
import { useStore } from "../store";
import { SHORTCUT_GROUPS, SHORTCUTS } from "./shortcuts";

/** One key cap in a chord. */
function Kbd({ children }: { children: string }) {
  return <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded-md border border-edge bg-canvas px-1.5 py-0.5 font-sans text-[12px] text-ink2">{children}</kbd>;
}

/** Shared list for the ? overlay and Settings → Shortcuts. */
export function ShortcutList() {
  const tr = useT();
  return (
    <div className="space-y-5">
      {SHORTCUT_GROUPS.map((group) => {
        const rows = SHORTCUTS.filter((s) => s.group === group.id);
        if (!rows.length) return null;
        return (
          <section key={group.id}>
            <h3 className="mb-2 text-xs font-medium tracking-wide text-ink3 uppercase">{tr(group.labelKey)}</h3>
            <ul className="space-y-1.5">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-4 text-[13px]">
                  <span className="text-ink2">{tr(row.labelKey)}</span>
                  <span className="flex flex-none flex-wrap items-center justify-end gap-1.5">
                    {row.keys.map((chord, i) => (
                      <span key={i} className="inline-flex items-center gap-0.5">
                        {i > 0 && <span className="px-1 text-ink3">/</span>}
                        {chord.map((cap) => (
                          <Kbd key={cap}>{cap}</Kbd>
                        ))}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Overlay opened with ? — lists the main-window shortcuts. */
export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const tr = useT();
  const setDialog = useStore((s) => s.setDialog);
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        className="flex max-h-full w-[440px] max-w-full flex-col overflow-hidden rounded-[14px] border border-edge bg-card shadow-xl"
      >
        <div className="flex-none px-6 pt-5">
          <h2 id="shortcut-help-title" className="text-[17px] font-semibold text-ink">
            {tr("shortcuts.title")}
          </h2>
          <p className="mt-0.5 text-ink3">{tr("shortcuts.hint")}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <ShortcutList />
        </div>
        <div className="flex flex-none items-center gap-3 border-t border-edge px-6 py-3">
          <button
            type="button"
            className="text-brand hover:underline"
            onClick={() => {
              onClose();
              setDialog("settings", "shortcuts");
            }}
          >
            {tr("shortcuts.openSettings")}
          </button>
          <Button variant="primary" autoFocus className="ml-auto" onClick={onClose}>
            {tr("shortcuts.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
