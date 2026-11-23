import { useStore } from "../store";
import { language, t } from "./i18n";
import type { Lang } from "./i18n";

/** The language the interface is in, as chosen in Settings or as the desktop has it. */
export function useLang(): Lang {
  return language(useStore((s) => s.settings.language));
}

/** A translator for the current language, for use while drawing a screen. */
export function useT() {
  const lang = useLang();
  return (key: string, vars?: Record<string, string | number>) => t(lang, key, vars);
}
