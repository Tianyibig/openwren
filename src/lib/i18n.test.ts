import { describe, expect, it } from "vitest";
import { LANGUAGES, MESSAGES, language, t } from "./i18n";

/** The `{name}` placeholders in a string, in the order they appear. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe("the message table", () => {
  it("has every message in every language, and nothing empty", () => {
    for (const [key, entry] of Object.entries(MESSAGES)) {
      for (const { id } of LANGUAGES) {
        const text = entry[id];
        expect(text, `${key} in ${id}`).toBeTruthy();
        expect(text.trim(), `${key} in ${id}`).not.toBe("");
      }
    }
  });

  it("keeps the same placeholders in each language", () => {
    // A translation that drops {dir} would put a bare sentence where a path belongs.
    for (const [key, entry] of Object.entries(MESSAGES)) {
      expect(placeholders(entry.zh), `${key} in zh`).toEqual(placeholders(entry.en));
    }
  });
});

describe("language", () => {
  it("uses the choice made in Settings", () => {
    expect(language("zh")).toBe("zh");
    expect(language("en")).toBe("en");
  });

  it("follows the desktop until a choice is made", () => {
    const original = navigator.language;
    const set = (value: string) => Object.defineProperty(navigator, "language", { value, configurable: true });
    try {
      set("zh-CN");
      expect(language(undefined)).toBe("zh");
      expect(language("")).toBe("zh");
      set("de-DE");
      expect(language(undefined)).toBe("en");
    } finally {
      set(original);
    }
  });

  it("ignores a stored value it does not know", () => {
    expect(language("klingon")).toBe(language(undefined));
  });
});

describe("t", () => {
  it("gives the text in the language asked for", () => {
    expect(t("en", "settings.title")).toBe("Settings");
    expect(t("zh", "settings.title")).toBe("设置");
  });

  it("fills in the placeholders", () => {
    expect(t("en", "storage.moveNotice", { dir: "/mnt/mail" })).toContain("/mnt/mail");
    expect(t("zh", "appearance.seconds", { n: 5 })).toBe("5 秒");
    expect(t("en", "appearance.seconds", { n: 5 })).toBe("5 seconds");
  });

  it("returns the key it does not have, so a half-moved screen still says something", () => {
    expect(t("zh", "screen.that.does.not.exist")).toBe("screen.that.does.not.exist");
  });
});
