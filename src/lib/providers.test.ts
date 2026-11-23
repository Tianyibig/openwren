import { describe, expect, it } from "vitest";
import { PROVIDERS, providerById, providerForAddress, serverSettings } from "./providers";

describe("providerForAddress", () => {
  it("finds the servers of a Chinese mailbox by its domain", () => {
    expect(providerForAddress("anna@qq.com")?.id).toBe("qq");
    expect(providerForAddress("anna@163.com")?.id).toBe("163");
    expect(providerForAddress("anna@126.com")?.id).toBe("126");
    expect(providerForAddress("anna@yeah.net")?.id).toBe("yeah");
    expect(providerForAddress("anna@aliyun.com")?.id).toBe("aliyun");
    expect(providerForAddress("anna@sina.com.cn")?.id).toBe("sina");
    expect(providerForAddress("anna@139.com")?.id).toBe("139");
  });

  it("follows the domain, and the case it was typed in", () => {
    expect(providerForAddress("ANNA@VIP.QQ.COM")?.id).toBe("qq");
    expect(providerForAddress("anna@foxmail.com")?.id).toBe("qq");
    expect(providerForAddress("anna@mail.qq.com")?.id).toBe("qq");
  });

  it("leaves an address it does not know without a preset", () => {
    expect(providerForAddress("anna@gmail.com")).toBeUndefined();
    expect(providerForAddress("anna@company.example")).toBeUndefined();
    expect(providerForAddress("")).toBeUndefined();
    expect(providerForAddress("half-typed")).toBeUndefined();
  });

  it("does not match a domain that only ends with a known name", () => {
    // A look-alike registration must not be treated as the provider it imitates.
    expect(providerForAddress("anna@notqq.com")).toBeUndefined();
    expect(providerForAddress("anna@qq.com.evil.example")).toBeUndefined();
  });

  it("never picks a company preset by address: those servers are on any domain", () => {
    const company = PROVIDERS.filter((p) => p.domains.length === 0);
    expect(company.length).toBeGreaterThan(0);
    for (const provider of company) {
      expect(providerForAddress(`anna@${provider.id}.example`)).toBeUndefined();
    }
  });
});

describe("the presets", () => {
  it("are complete: an id, a name, an encrypted server each way and a port", () => {
    const ids = new Set<string>();
    for (const provider of PROVIDERS) {
      expect(provider.id).toMatch(/^[a-z0-9]+$/);
      expect(ids.has(provider.id)).toBe(false);
      ids.add(provider.id);
      expect(provider.name.trim()).not.toBe("");
      for (const host of [provider.imap, provider.smtp]) {
        expect(host.host).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
        expect(Number.isInteger(host.port)).toBe(true);
        expect(host.port).toBeGreaterThan(0);
        expect(host.port).toBeLessThanOrEqual(65535);
        // A preset that suggested a plain connection would leak the password.
        expect(host.security).toBe("tls");
      }
      expect(provider.setup.steps.length).toBeGreaterThan(0);
    }
  });

  it("say plainly where the password comes from when it is a code", () => {
    const qq = providerById("qq");
    expect(qq?.code).toBe(true);
    expect(qq?.setup.steps.join(" ")).toContain("授权码");
    expect(providerById("exmail")?.code).toBeUndefined();
  });

  it("are found by id, and unknown ids give nothing", () => {
    expect(providerById("163")?.smtp.host).toBe("smtp.163.com");
    expect(providerById("nope")).toBeUndefined();
  });
});

describe("serverSettings", () => {
  it("hands the engine the host, port, encryption and the address as the user", () => {
    const qq = providerById("qq");
    expect(qq && serverSettings(qq.imap, "anna@qq.com")).toEqual({ host: "imap.qq.com", port: 993, security: "tls", username: "anna@qq.com" });
    expect(qq && serverSettings(qq.smtp, "anna@qq.com")).toEqual({ host: "smtp.qq.com", port: 465, security: "tls", username: "anna@qq.com" });
  });
});
