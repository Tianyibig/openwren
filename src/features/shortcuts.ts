/**
 * Keyboard shortcuts of the main window, in one place: the help overlay and
 * Settings → Shortcuts render this list. Bindings match App.tsx / MessageList.
 */

import { MOD, isMac } from "../lib/keys";

export type ShortcutGroup = "browse" | "act" | "respond";

export interface ShortcutRow {
  id: string;
  /** Alternatives, each a sequence of key caps. */
  keys: string[][];
  group: ShortcutGroup;
  labelKey: string;
}

export const SHORTCUT_GROUPS: { id: ShortcutGroup; labelKey: string }[] = [
  { id: "browse", labelKey: "shortcuts.groupBrowse" },
  { id: "act", labelKey: "shortcuts.groupAct" },
  { id: "respond", labelKey: "shortcuts.groupRespond" },
];

export const SHORTCUTS: ShortcutRow[] = [
  { id: "next", keys: [["↓"]], group: "browse", labelKey: "shortcuts.next" },
  { id: "previous", keys: [["↑"]], group: "browse", labelKey: "shortcuts.previous" },
  { id: "search", keys: [[MOD, "K"]], group: "browse", labelKey: "shortcuts.search" },
  { id: "help", keys: [["?"]], group: "browse", labelKey: "shortcuts.help" },
  { id: "archive", keys: [["Backspace"]], group: "act", labelKey: "shortcuts.archive" },
  {
    id: "delete",
    keys: isMac ? [["Delete"]] : [["Delete"]],
    group: "act",
    labelKey: "shortcuts.delete",
  },
  { id: "flag", keys: [["Insert"]], group: "act", labelKey: "shortcuts.flag" },
  {
    id: "unread",
    keys: isMac ? [[MOD, "U"]] : [[MOD, "U"], [MOD, "Q"]],
    group: "act",
    labelKey: "shortcuts.unread",
  },
  { id: "undo", keys: [[MOD, "Z"]], group: "act", labelKey: "shortcuts.undo" },
  { id: "reply", keys: [[MOD, "R"]], group: "respond", labelKey: "shortcuts.reply" },
  { id: "replyAll", keys: [[MOD, "Shift", "R"]], group: "respond", labelKey: "shortcuts.replyAll" },
  { id: "forward", keys: [[MOD, "F"]], group: "respond", labelKey: "shortcuts.forward" },
  { id: "compose", keys: [[MOD, "N"]], group: "respond", labelKey: "shortcuts.compose" },
];
