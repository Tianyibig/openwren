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

  it("folds an Outlook on the web reply from the rule", () => {
    const html = `<div>My answer</div><div id="appendonsend"></div><hr style="display:inline-block;width:98%" tabindex="-1"><div id="divRplyFwdMsg" dir="ltr"><font face="Calibri"><b>From:</b> Bob<br><b>Sent:</b> Monday<br><b>Subject:</b> Hi</font></div><div>quoted body text</div>`;
    const doc = parse(html);
    expect(foldQuotes(doc, "Show quoted text")).toBe(true);
    const details = doc.querySelector("details.openwren-quote")!;
    expect(doc.body.textContent).toContain("My answer");
    expect(details.textContent).toContain("quoted body text");
    expect(details.querySelector("hr")).toBeTruthy();
    expect(doc.body.querySelector(":scope > hr")).toBeNull();
  });

  it("folds an Outlook desktop From/Sent/Subject header block", () => {
    const html = `<div>Reply here</div><div style="border:none;border-top:solid #E1E1E1 1.0pt;padding:3.0pt 0in 0in 0in"><p class="MsoNormal"><b>From:</b> Bob<br><b>Sent:</b> Monday<br><b>To:</b> me<br><b>Subject:</b> Plan</p></div><div><p>the earlier message</p></div>`;
    const doc = parse(html);
    expect(foldQuotes(doc, "Show quoted text")).toBe(true);
    expect(doc.querySelector("details.openwren-quote")!.textContent).toContain("the earlier message");
    const zh = parse(
      `<div>好的</div><div style="border:none;border-top:solid #E1E1E1 1.0pt"><p><b>发件人:</b> 张三<br><b>发送时间:</b> 周一<br><b>主题:</b> 计划</p></div><div>早前内容</div>`,
    );
    expect(foldQuotes(zh, "显示引用内容")).toBe(true);
    expect(zh.querySelector("details.openwren-quote")!.textContent).toContain("早前内容");
  });

  it("folds a QQ original-mail separator", () => {
    const html = `<div>收到</div><div><br></div><div style="font-size:12px"><div>------------------&nbsp;原始邮件&nbsp;------------------</div><div style="background:#efefef;padding:8px"><div><b>发件人:</b>&nbsp;"a" &lt;a@qq.com&gt;;</div><div><b>发送时间:</b>&nbsp;2026年11月11日(星期三) 下午5:36</div><div><b>收件人:</b>&nbsp;"b";</div><div><b>主题:</b>&nbsp;Re: 计划</div></div><div>早先正文</div></div>`;
    const doc = parse(html);
    expect(foldQuotes(doc, "显示引用内容")).toBe(true);
    expect(doc.querySelector("details.openwren-quote")!.textContent).toContain("早先正文");
    expect(doc.body.firstElementChild!.textContent).toBe("收到");
  });
});
