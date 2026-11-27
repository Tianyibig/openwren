// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { foldQuotes } from "./foldQuotes";

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("foldQuotes", () => {
  it("folds a trailing OpenWren-style reply quote", () => {
    const doc = parse(`<p>Thanks!</p><p>On Mon, Alice wrote:</p><blockquote><p>Please review</p></blockquote>`);
    expect(foldQuotes(doc, "Show quoted text")).toBe(true);
    const details = doc.querySelector("details.openwren-quote");
    expect(details).toBeTruthy();
    expect(details!.querySelector("summary")!.textContent).toBe("Show quoted text");
    expect(details!.textContent).toContain("Please review");
    expect(details!.textContent).toContain("On Mon, Alice wrote:");
    expect(doc.body.firstElementChild!.textContent).toBe("Thanks!");
  });

  it("folds a trailing gmail_quote", () => {
    const doc = parse(`<div>Hi</div><div class="gmail_quote"><blockquote>old</blockquote></div>`);
    expect(foldQuotes(doc, "Show quoted text")).toBe(true);
    expect(doc.querySelector("details.openwren-quote")!.textContent).toContain("old");
  });

  it("does not fold forwards", () => {
    const doc = parse(
      `<p>FYI</p><p>---------- Forwarded message ----------</p><blockquote><p>secret</p></blockquote>`,
    );
    expect(foldQuotes(doc, "Show quoted text")).toBe(false);
  });

  it("does not fold quote-only bodies", () => {
    const doc = parse(`<blockquote><p>only quote</p></blockquote>`);
    expect(foldQuotes(doc, "Show quoted text")).toBe(false);
  });

  it("does not fold interleaved quotes", () => {
    const doc = parse(`<p>a</p><blockquote>mid</blockquote><p>more</p>`);
    expect(foldQuotes(doc, "Show quoted text")).toBe(false);
  });
});
