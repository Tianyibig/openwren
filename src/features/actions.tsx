import { IconBan, IconCode,
  IconArchive,
  IconClock,
  IconDeviceFloppy,
  IconFlag,
  IconFolderShare,
  IconInbox,
  IconMailOpened,
  IconPin,
  IconSparkles,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";

/** Mail services where each address is a different person. */
const PERSONAL = /@(gmail|googlemail|outlook|hotmail|live|msn|yahoo|ymail|icloud|me|mac|aol|proton|protonmail|pm|gmx|web|mail|zoho|fastmail|orange|free|laposte|wanadoo|sfr|bluewin)\.[a-z.]+$/i;
import { backend, errorText } from "../backend";
import { categories } from "../components/ui";
import type { MenuItem } from "../components/ui";
import { currentLanguage } from "../lib/currentLanguage";
import { t } from "../lib/i18n";
import { useStore } from "../store";
import type { MessageSummary } from "../types";

/** A menu label in the language the interface is in; menus are built outside React. */
function tr(key: string, vars?: Record<string, string | number>): string {
  return t(currentLanguage(), key, vars);
}

/** Unix seconds for snooze choices. */
export function snoozeTimes(now = new Date()): { label: string; at: number }[] {
  const at = (d: Date) => Math.floor(d.getTime() / 1000);
  const later = new Date(now.getTime() + 3 * 3600 * 1000);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  const monday = new Date(tomorrow);
  while (monday.getDay() !== 1) monday.setDate(monday.getDate() + 1);
  return [
    { label: tr("snooze.inThreeHours"), at: at(later) },
    { label: tr("snooze.tomorrow"), at: at(tomorrow) },
    { label: tr("snooze.monday"), at: at(monday) },
  ];
}

/** Folders of the message's account that it can move to. */
type MenuAction = Extract<MenuItem, { onSelect: () => void }>;

export function moveItems(m: MessageSummary): MenuAction[] {
  const { folders, moveMessages, targets } = useStore.getState();
  const ids = targets().includes(m.id) ? targets() : [m.id];
  return folders
    .filter((f) => f.accountId === m.accountId && f.id !== m.folderId && f.role !== "drafts")
    .map((f) => ({ label: f.name, onSelect: () => void moveMessages(ids, { folderId: f.id }) }));
}

export function categoryItems(m: MessageSummary): MenuItem[] {
  const { setCategories } = useStore.getState();
  const items: MenuItem[] = Object.keys(categories).map((name) => ({
    label: name,
    checked: m.categories.includes(name),
    onSelect: () => void setCategories(m.id, m.categories.includes(name) ? m.categories.filter((c) => c !== name) : [...m.categories, name]),
  }));
  if (m.categories.length > 0) items.push("divider", { label: tr("action.clearCategories"), onSelect: () => void setCategories(m.id, []) });
  return items;
}

export function snoozeItems(m: MessageSummary): MenuItem[] {
  const { snooze } = useStore.getState();
  return snoozeTimes().map((t) => ({ label: t.label, onSelect: () => void snooze(m.id, t.at) }));
}

/** The right-click menu of a message, also used for "more actions". */
export function messageMenu(m: MessageSummary): MenuItem[] {
  const s = useStore.getState();
  const ids = s.targets().includes(m.id) ? s.targets() : [m.id];
  const many = ids.length > 1;
  const save = () =>
    void backend
      .saveMessage(m.id, `${(m.subject || "message").replace(/[^\w .-]+/g, "_").slice(0, 60)}.eml`)
      .then((saved) => saved && s.showToast(tr("action.messageSaved")))
      .catch((e) => s.showToast(errorText(e)));
  const items: MenuItem[] = [
    { id: "archive", label: tr("reader.archive"), icon: <IconArchive size={16} />, onSelect: () => void s.moveMessages(ids, { role: "archive" }) },
    { id: "delete", label: tr("reader.delete"), icon: <IconTrash size={16} />, onSelect: () => void s.deleteMessages(ids), danger: true },
    { label: tr("action.moveInbox"), icon: <IconInbox size={16} />, onSelect: () => void s.moveMessages(ids, { role: "inbox" }) },
    { label: tr("action.markJunk"), icon: <IconFolderShare size={16} />, onSelect: () => void s.moveMessages(ids, { role: "junk" }) },
    "divider",
    { label: m.unread ? tr("reader.markRead") : tr("reader.markUnread"), icon: <IconMailOpened size={16} />, onSelect: () => ids.forEach((id) => void s.setFlags(id, { unread: !m.unread })) },
    { label: m.flagged ? tr("reader.removeFlag") : tr("reader.flag"), icon: <IconFlag size={16} />, onSelect: () => ids.forEach((id) => void s.setFlags(id, { flagged: !m.flagged })) },
  ];
  if (many) return items;
  const sameContact = s.contactView?.address.toLowerCase() === m.fromAddress.toLowerCase();
  return [
    ...items,
    { label: m.pinned ? tr("reader.unpin") : tr("reader.pin"), icon: <IconPin size={16} />, onSelect: () => void s.setFlags(m.id, { pinned: !m.pinned }) },
    { label: tr("action.snoozeTomorrow"), icon: <IconClock size={16} />, onSelect: () => void s.snooze(m.id, snoozeTimes()[1].at) },
    ...(!sameContact && m.fromAddress.trim()
      ? [{ label: tr("action.viewContact"), icon: <IconUser size={16} />, onSelect: () => s.viewContact(m) }]
      : []),
    "divider",
    { label: tr("action.sweep"), icon: <IconSparkles size={16} />, onSelect: () => void s.sweep(m.id), danger: true },
    ...(s.settings.focused_inbox !== "off" ? [{ label: m.focused ? tr("action.focusOther") : tr("action.focusInbox"), onSelect: () => void s.setSenderFocus(m.id, !m.focused) }] : []),
    { id: "block", label: tr("action.block"), icon: <IconBan size={16} />, onSelect: () => void s.blockSender(m.id, false), danger: true },
    // Blocking a whole domain makes no sense for addresses that millions of people share.
    ...(PERSONAL.test(m.fromAddress) ? [] : [{ label: tr("action.blockDomain", { domain: m.fromAddress.split("@").pop() ?? "" }), icon: <IconBan size={16} />, onSelect: () => void s.blockSender(m.id, true), danger: true }]),
    { id: "source", label: tr("action.viewSource"), icon: <IconCode size={16} />, onSelect: () => s.showSource(m.id) },
    { id: "save", label: tr("action.saveFile"), icon: <IconDeviceFloppy size={16} />, onSelect: save },
  ];
}
