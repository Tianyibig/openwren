import { describe, expect, it } from "vitest";
import { composing } from "./keys";

describe("composing", () => {
  it("is true while an input method is still choosing a character", () => {
    expect(composing({ isComposing: true })).toBe(true);
    // Older web views do not report isComposing; 229 is the key code they send instead.
    expect(composing({ keyCode: 229 })).toBe(true);
  });

  it("is false for an ordinary key", () => {
    expect(composing({})).toBe(false);
    expect(composing({ isComposing: false, keyCode: 13 })).toBe(false);
    expect(composing({ keyCode: 0 })).toBe(false);
  });
});
