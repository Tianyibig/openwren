/** Keyboard shortcuts use Cmd on a Mac and Ctrl everywhere else. */

export const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent);

/** True when the shortcut key of this system is held: Cmd on macOS, Ctrl elsewhere. */
export function mod(e: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return isMac ? e.metaKey : e.ctrlKey;
}

/** How that key is written in hints: "⌘" or "Ctrl". */
export const MOD = isMac ? "⌘" : "Ctrl";

/**
 * True while an input method is still composing a character. Keys pressed to pick a
 * candidate belong to the method, not to the app: Enter picks one, the arrows move
 * between them, and no shortcut may fire in the middle of that. `keyCode` 229 is what
 * older web views report instead of `isComposing`.
 */
export function composing(e: { isComposing?: boolean; keyCode?: number }): boolean {
  return e.isComposing === true || e.keyCode === 229;
}
