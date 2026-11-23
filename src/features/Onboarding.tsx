import {
  IconArrowLeft,
  IconArrowRight,
  IconBrandGoogle,
  IconCheck,
  IconCode,
  IconEyeOff,
  IconHeart,
  IconLock,
  IconMail,
  IconPaperclip,
  IconShieldCheck,
  IconUserHeart,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import logo from "../../src-tauri/icons/128x128@2x.png";
import { backend } from "../backend";
import { PRIVACY_PAGE, REPOSITORY, SPONSOR_PAGE } from "../lib/links";
import { TEXT_SIZES } from "../lib/font";
import { useT } from "../lib/useTranslate";
import { useStore } from "../store";
import { preferAccountKind } from "./AddAccount";
import { MOD } from "../lib/keys";

const STEPS = ["onboard.steps.welcome", "onboard.steps.account", "onboard.steps.look", "onboard.steps.ready"] as const;

/** The filled accent button used only here: the one obvious next step on each screen. */
function Next({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-card hover:opacity-90 disabled:opacity-40">
      {children}
    </button>
  );
}

function Point({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3.5">
      <div className="flex size-10 flex-none items-center justify-center rounded-xl bg-soft text-brand">{icon}</div>
      <div>
        <div className="text-ink">{title}</div>
        <div className="text-ink2">{text}</div>
      </div>
    </div>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div>
      <div className="mb-2 text-ink2">{label}</div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map(([v, name]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`h-9 rounded-full px-4 ${value === v ? "bg-soft text-brand" : "border border-edge text-ink2 hover:bg-hover"}`}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A small picture of the app for the right-hand side: three messages, one of them flagged as suspicious. */
function Preview() {
  const tr = useT();
  const row = "flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]";
  const avatar = "flex size-9 flex-none items-center justify-center rounded-full text-xs";
  return (
    <div className="flex w-full max-w-[380px] flex-col gap-3" aria-hidden="true">
      <div className={row}>
        <div className={`${avatar} bg-[#1f1f1e] text-white`}>
          <IconMail size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-ink">
            Mona Kane <span className="size-[7px] rounded-full bg-dot" /> <span className="ml-auto text-xs text-brand">9:41</span>
          </div>
          <div className="truncate text-ink2">{tr("onboard.preview.subject1")}</div>
        </div>
      </div>
      <div className={`${row} translate-x-6`}>
        <div className={`${avatar} bg-chip text-ink2`}>PS</div>
        <div className="min-w-0 flex-1">
          <div className="text-ink">PayPal Security</div>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-warn px-2.5 py-0.5 text-xs text-on-warn">
            <IconShieldCheck size={14} /> {tr("reader.reason.notConfirmed")}
          </div>
        </div>
      </div>
      <div className={row}>
        <div className={`${avatar} bg-[#1DB954] text-white`}>
          <IconPaperclip size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-ink">{tr("onboard.preview.subject2")}</div>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-soft px-2.5 py-0.5 text-xs text-brand">
            <IconEyeOff size={14} /> {tr("reader.trackerMany", { n: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** First-run welcome: what OpenWren is, add an account, pick the look, start. */
export function Onboarding() {
  const accounts = useStore((s) => s.accounts);
  const settings = useStore((s) => s.settings);
  const { setSetting, setDialog, setWelcome } = useStore.getState();
  const tr = useT();
  // Nothing is chosen in advance: the count is sent only after "Count this copy".
  const counted = settings.usage_stats === "on" ? true : settings.usage_stats === "off" ? false : null;
  const [step, setStep] = useState(0);
  const [sentShown, setSentShown] = useState(false);
  const had = useState(accounts.length)[0];

  // Adding an account in the dialog moves the welcome on by itself.
  useEffect(() => {
    if (step === 1 && accounts.length > had) setStep(2);
  }, [accounts.length, had, step]);

  const add = (kind: "google" | "imap") => {
    preferAccountKind(kind);
    setDialog("add-account");
  };
  const finish = () => {
    void setSetting("onboarded", "yes");
    setWelcome(false);
  };
  const card = "flex w-full items-center gap-4 rounded-2xl border border-edge px-5 py-4 text-left hover:border-line hover:bg-hover";

  return (
    <div className="absolute inset-0 z-[5] flex bg-card" role="dialog" aria-modal="true" aria-label={tr("onboard.aria")}>
      <div className="flex min-w-0 flex-1 flex-col px-14 py-10">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="" className="size-8" />
          <span className="text-lg text-ink">OpenWren</span>
          <button type="button" onClick={finish} className="ml-auto rounded-lg px-3 py-1.5 text-ink3 hover:bg-hover hover:text-ink">
            {tr("onboard.skip")}
          </button>
        </div>

        {/* In a short window the page scrolls; the buttons below stay in view. */}
        <div className="-mr-4 flex min-h-0 flex-1 flex-col overflow-y-auto py-6 pr-4">
          <div className="my-auto max-w-[460px]">
            {step === 0 && (
              <>
                <h1 className="text-[34px] leading-tight text-ink">{tr("onboard.welcome.title")}</h1>
                <p className="mt-3 text-[17px] text-ink2">{tr("onboard.welcome.text")}</p>
                <div className="mt-8 flex flex-col gap-5">
                  <Point icon={<IconLock size={20} />} title={tr("onboard.welcome.privateTitle")} text={tr("onboard.welcome.privateText")} />
                  <Point icon={<IconShieldCheck size={20} />} title={tr("onboard.welcome.guardTitle")} text={tr("onboard.welcome.guardText")} />
                  <Point icon={<IconMail size={20} />} title={tr("onboard.welcome.onePlaceTitle")} text={tr("onboard.welcome.onePlaceText")} />
                  <div className="flex gap-3.5">
                    <div className="flex size-10 flex-none items-center justify-center rounded-xl bg-soft text-brand">
                      <IconCode size={20} />
                    </div>
                    <div>
                      <div className="text-ink">{tr("onboard.welcome.freeTitle")}</div>
                      <div className="text-ink2">
                        {tr("onboard.welcome.freeText")}{" "}
                        <button type="button" className="text-brand underline" onClick={() => void backend.openLink(REPOSITORY)}>
                          {tr("onboard.welcome.viewCode")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-[30px] leading-tight text-ink">{tr("onboard.account.title")}</h1>
                <p className="mt-3 text-ink2">{tr("onboard.account.note")}</p>
                {accounts.length > 0 && (
                  <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-soft px-3 py-1 text-brand">
                    <IconCheck size={16} /> {tr("onboard.account.added", { what: accounts.length === 1 ? accounts[0].address : tr("onboard.account.many", { n: accounts.length }) })}
                  </p>
                )}
                <div className="mt-6 flex flex-col gap-3">
                  <button type="button" className={card} onClick={() => add("google")}>
                    <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-soft text-brand">
                      <IconBrandGoogle size={22} />
                    </span>
                    <span>
                      <span className="block text-ink">{tr("onboard.account.gmail")}</span>
                      <span className="block text-ink2">{tr("onboard.account.gmailText")}</span>
                    </span>
                    <IconArrowRight size={18} className="ml-auto text-ink3" />
                  </button>
                  <button type="button" className={card} onClick={() => add("imap")}>
                    <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-soft text-brand">
                      <IconMail size={22} />
                    </span>
                    <span>
                      <span className="block text-ink">{tr("onboard.account.other")}</span>
                      <span className="block text-ink2">{tr("onboard.account.otherText")}</span>
                    </span>
                    <IconArrowRight size={18} className="ml-auto text-ink3" />
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h1 className="text-[30px] leading-tight text-ink">{tr("onboard.look.title")}</h1>
                <p className="mt-3 text-ink2">{tr("onboard.look.note")}</p>
                <div className="mt-7 flex flex-col gap-6">
                  <Choice
                    label={tr("onboard.look.theme")}
                    value={(settings.theme ?? "system") as "system" | "light" | "dark"}
                    onChange={(v) => void setSetting("theme", v)}
                    options={[
                      ["system", tr("onboard.look.themeSystem")],
                      ["light", tr("appearance.themeLight")],
                      ["dark", tr("appearance.themeDark")],
                    ]}
                  />
                  <Choice label={tr("onboard.look.textSize")} value={settings.text_size ?? "15"} onChange={(v) => void setSetting("text_size", v)} options={TEXT_SIZES} />
                  <Choice
                    label={tr("onboard.look.time")}
                    value={settings.time_format === "12" ? "12" : "24"}
                    onChange={(v) => void setSetting("time_format", v)}
                    options={[
                      ["24", "15:05"],
                      ["12", "3:05 PM"],
                    ]}
                  />
                </div>
                <div className="mt-7 rounded-2xl border border-edge px-4 py-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-10 flex-none items-center justify-center rounded-full bg-soft text-brand">
                      <IconUserHeart size={20} />
                    </div>
                    <div className="min-w-0">
                      <div id="usage-count" className="text-ink">
                        {tr("onboard.usage.title")}
                      </div>
                      <div className="mt-1 text-[13px] text-ink2">{tr("onboard.usage.text")}</div>
                      <div className="mt-1.5 text-[13px] text-ink3">{tr("onboard.usage.signature")}</div>
                    </div>
                  </div>
                  <div className="mt-3.5 flex flex-wrap items-center gap-2" role="radiogroup" aria-labelledby="usage-count">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={counted === true}
                      onClick={() => void setSetting("usage_stats", "on")}
                      className={`h-9 rounded-lg border px-3.5 text-[14px] ${counted === true ? "border-brand bg-brand/10 text-brand" : "border-edge text-ink hover:bg-hover"}`}
                    >
                      {tr("onboard.usage.yes")}
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={counted === false}
                      onClick={() => void setSetting("usage_stats", "off")}
                      className={`h-9 rounded-lg border px-3.5 text-[14px] ${counted === false ? "border-brand bg-brand/10 text-brand" : "border-edge text-ink hover:bg-hover"}`}
                    >
                      {tr("onboard.usage.no")}
                    </button>
                    <button type="button" aria-expanded={sentShown} aria-controls="usage-sent" onClick={() => setSentShown(!sentShown)} className="ml-auto rounded-md px-1.5 py-1 text-[13px] text-brand hover:underline">
                      {sentShown ? tr("onboard.usage.hide") : tr("onboard.usage.show")}
                    </button>
                  </div>
                  {sentShown && (
                    <div id="usage-sent" className="mt-3 rounded-xl bg-canvas px-3.5 py-3">
                      <div className="text-xs text-ink3">{tr("onboard.usage.contains")}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {["onboard.usage.fact1", "onboard.usage.fact2", "onboard.usage.fact3", "onboard.usage.fact4", "onboard.usage.fact5", "onboard.usage.fact6"].map((key) => (
                          <span key={key} className="rounded-full border border-edge bg-card px-2.5 py-0.5 text-xs text-ink2">
                            {tr(key)}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-ink3">
                        <IconLock size={14} className="flex-none" />
                        <span>
                          {tr("onboard.usage.never")}{" "}
                          <button type="button" className="text-brand hover:underline" onClick={() => void backend.openLink(PRIVACY_PAGE)}>
                            {tr("onboard.usage.privacy")}
                          </button>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-soft text-brand">
                  <IconCheck size={30} />
                </div>
                <h1 className="text-[30px] leading-tight text-ink">{tr("onboard.ready.title")}</h1>
                <p className="mt-3 text-ink2">{accounts.length > 0 ? tr("onboard.ready.downloading") : tr("onboard.ready.noAccount")}</p>
                <div className="mt-7 flex flex-col gap-2.5 text-ink2">
                  {[
                    [`${MOD} K`, tr("onboard.ready.search")],
                    [`${MOD} N`, tr("onboard.ready.compose")],
                    [tr("onboard.ready.rightClick"), tr("onboard.ready.rightClickWhat")],
                  ].map(([keys, what]) => (
                    <div key={keys} className="flex items-center gap-3">
                      <kbd className="min-w-[92px] rounded-lg border border-edge bg-canvas px-2.5 py-1 text-center text-[13px] text-ink">{keys}</kbd>
                      {what}
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex items-start gap-3.5 rounded-2xl border border-edge px-4 py-4">
                  <div className="flex size-10 flex-none items-center justify-center rounded-full bg-danger/10 text-danger">
                    <IconHeart size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-ink">{tr("sponsor.title")}</div>
                    <div className="mt-1 text-[13px] text-ink2">{tr("onboard.ready.sponsorText")}</div>
                    <button
                      type="button"
                      onClick={() => void backend.openLink(SPONSOR_PAGE)}
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-edge px-3.5 text-[14px] text-ink hover:bg-hover"
                    >
                      <IconHeart size={16} className="text-danger" /> {tr("sponsor.button")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-none items-center gap-4">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-ink2 hover:bg-hover">
              <IconArrowLeft size={18} /> {tr("onboard.back")}
            </button>
          )}
          {step === 0 && (
            <Next onClick={() => setStep(1)}>
              {tr("onboard.start")} <IconArrowRight size={18} />
            </Next>
          )}
          {step === 1 &&
            (accounts.length > 0 ? (
              <Next onClick={() => setStep(2)}>
                {tr("onboard.continue")} <IconArrowRight size={18} />
              </Next>
            ) : (
              <button type="button" onClick={() => setStep(2)} className="h-11 rounded-xl px-3 text-ink2 hover:bg-hover">
                {tr("onboard.later")}
              </button>
            ))}
          {step === 2 && (
            <>
              <Next onClick={() => setStep(3)} disabled={counted === null}>
                {tr("onboard.continue")} <IconArrowRight size={18} />
              </Next>
              {counted === null && (
                <span className="whitespace-nowrap text-[13px] text-ink3" role="status">
                  {tr("onboard.usage.answer")}
                </span>
              )}
            </>
          )}
          {step === 3 && <Next onClick={finish}>{tr("onboard.openInbox")}</Next>}
          <div className="ml-auto flex items-center gap-2" aria-label={tr("onboard.step", { step: step + 1, total: STEPS.length, name: tr(STEPS[step]) })}>
            {STEPS.map((name, i) => (
              <span key={name} className={`h-1.5 rounded-full ${i === step ? "w-6 bg-brand" : "w-1.5 bg-edge"}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="hidden w-[44%] max-w-[560px] flex-none items-center justify-center bg-soft px-10 lg:flex">
        <Preview />
      </div>
    </div>
  );
}
