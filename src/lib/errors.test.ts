import { describe, expect, it } from "vitest";
import { errorKind, errorText } from "./errors";

describe("errorKind", () => {
  it("reads the category the engine sent", () => {
    expect(errorKind({ kind: "auth", message: "The server did not accept the sign-in." })).toBe("auth");
    expect(errorKind({ kind: "network", message: "Connecting timed out." })).toBe("network");
    expect(errorKind({ kind: "notFound", message: "No longer there." })).toBe("notFound");
  });

  it("has no category for anything else", () => {
    expect(errorKind("a plain string")).toBeNull();
    expect(errorKind(new Error("boom"))).toBeNull();
    expect(errorKind({ kind: "not-a-kind", message: "x" })).toBeNull();
    expect(errorKind(null)).toBeNull();
    expect(errorKind(undefined)).toBeNull();
  });
});

describe("errorText", () => {
  it("takes the message from whatever shape arrived", () => {
    expect(errorText({ kind: "auth", message: "The server did not accept the sign-in." })).toBe("The server did not accept the sign-in.");
    expect(errorText("a plain string")).toBe("a plain string");
    expect(errorText(new Error("boom"))).toBe("boom");
  });

  it("says something when there is nothing to say", () => {
    expect(errorText(null)).toBe("Something went wrong.");
    expect(errorText({ kind: "auth", message: "" })).toBe("Something went wrong.");
  });
});
