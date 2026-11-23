import type { Lang } from "./i18n";

/**
 * The language of the interface, for the parts of the code that are not React components:
 * date words, warning sentences, and menu items built by plain functions. Components use
 * `useT`, which reads the same setting; both are set from the store when it loads and
 * whenever Settings changes the language.
 */
let lang: Lang = "en";

export function setLanguage(next: Lang) {
  lang = next;
}

export function currentLanguage(): Lang {
  return lang;
}
