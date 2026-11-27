// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { composeKind, draftMentionsAttachment, mentionsAttachment, ownBodyText } from "./attachmentMention";

describe("mentionsAttachment", () => {
  it("finds Chinese attachment language", () => {
    for (const text of ["请查收附件", "附上报价单", "附带一份", "随信附说明", "详见附表", "所附文件"]) {
      expect(mentionsAttachment(text)).toBe(true);
    }
    expect(mentionsAttachment("附近的餐厅")).toBe(false);
  });

  it("finds English attachment language as whole words", () => {
    for (const text of ["I attach the file", "See ATTACHED.", "the attachment", "two attachments", "Enclosed is the form"]) {
      expect(mentionsAttachment(text)).toBe(true);
    }
    for (const text of ["reattached", "attaching it later", "detachment", "enclosedness"]) {
      expect(mentionsAttachment(text)).toBe(false);
    }
  });
});

describe("ownBodyText and draftMentionsAttachment", () => {
  it("treats the whole new-mail body and subject", () => {
    expect(draftMentionsAttachment({ subject: "合同附件", html: "<p>你好</p>", isReply: false })).toBe(true);
    expect(draftMentionsAttachment({ subject: "Hello", html: "<p>Please see the attachment.</p>", isReply: false })).toBe(true);
  });

  it("ignores a reply subject that mentions attachments", () => {
    expect(
      draftMentionsAttachment({
        subject: "Re: 合同附件",
        html: "<p>收到，谢谢。</p>",
        isReply: true,
      }),
    ).toBe(false);
  });

  it("still catches attachment language in the reply body", () => {
    expect(
      draftMentionsAttachment({
        subject: "Re: Hello",
        html: "<p>请查收附件</p>",
        isReply: true,
      }),
    ).toBe(true);
  });

  it("only scans above a forwarded message header", () => {
    const html = `<p>见附件</p><p>---------- Forwarded message ----------</p><p>attachment in original</p>`;
    expect(composeKind({ isReply: true, html })).toBe("forward");
    expect(ownBodyText(html, "forward")).toBe("见附件");
    expect(draftMentionsAttachment({ subject: "Fw: x", html, isReply: true })).toBe(true);
    expect(
      draftMentionsAttachment({
        subject: "Fw: x",
        html: `<p>Hi</p><p>---------- Forwarded message ----------</p><p>See the attachment</p>`,
        isReply: true,
      }),
    ).toBe(false);
  });
});
