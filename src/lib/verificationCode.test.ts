import { describe, expect, it } from "vitest";
import { detectVerificationCode } from "./verificationCode";

describe("detectVerificationCode", () => {
  it("finds a unique Chinese verification code", () => {
    expect(detectVerificationCode("登录验证码", "您的验证码是 482913，10 分钟内有效。")).toEqual({
      status: "found",
      code: "482913",
    });
  });

  it("finds an English one-time password", () => {
    expect(detectVerificationCode("Your verification code", "Your verification code is 001234.")).toEqual({
      status: "found",
      code: "001234",
    });
  });

  it("ignores reply subjects and quoted history", () => {
    expect(detectVerificationCode("Re: Your verification code: 111111", "On Mon someone wrote:\n> verification code 222222\n")).toEqual({
      status: "notFound",
    });
  });

  it("does not treat years next to verification language as codes", () => {
    expect(detectVerificationCode("Notice", "Your verification code expires in 2026.")).toEqual({ status: "notFound" });
  });

  it("reports ambiguity when two different codes appear", () => {
    expect(detectVerificationCode("Codes", "verification code 123456 or 654321")).toEqual({ status: "ambiguous" });
  });

  it("skips codes inside URLs and addresses", () => {
    expect(detectVerificationCode("Link", "verification code https://example.com/path/12345678")).toEqual({ status: "notFound" });
  });
});
