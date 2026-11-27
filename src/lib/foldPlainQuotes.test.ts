import { describe, expect, it } from "vitest";
import { foldPlainQuotes } from "./foldPlainQuotes";

describe("foldPlainQuotes", () => {
  it("folds trailing > quotes with an On…wrote line", () => {
    const text = ["Thanks!", "", "On Mon, Alice wrote:", "> Please review", "> the patch."].join("\n");
    const folded = foldPlainQuotes(text);
    expect(folded?.head).toBe("Thanks!");
    expect(folded?.quote).toContain("On Mon, Alice wrote:");
    expect(folded?.quote).toContain("> Please review");
  });

  it("folds a trailing quote run without attribution", () => {
    const text = "Hi\n\n> old line\n> another";
    expect(foldPlainQuotes(text)).toEqual({ head: "Hi", quote: "> old line\n> another" });
  });

  it("does not fold forwards", () => {
    const text = "FYI\n\n---------- Forwarded message ----------\n> secret";
    expect(foldPlainQuotes(text)).toBeNull();
  });

  it("does not fold quote-only bodies", () => {
    expect(foldPlainQuotes("> only quote\n> more")).toBeNull();
  });

  it("does not fold interleaved quotes", () => {
    expect(foldPlainQuotes("a\n> mid\nmore")).toBeNull();
  });
});
