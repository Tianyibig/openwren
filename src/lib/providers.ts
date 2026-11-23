import type { Security, ServerSettings } from "../types";

/**
 * Mail providers whose servers are known in advance, so nobody has to look them up.
 *
 * The Chinese free mailboxes here all keep client access switched off until it is turned
 * on in their web settings, and then hand out a separate code instead of accepting the
 * mailbox password. That is the step people get stuck on, so each preset carries the
 * instructions with it, in both languages the interface speaks.
 */
export interface Host {
  host: string;
  port: number;
  security: Security;
}

/** What to do in the provider's web mailbox, in one language. */
export interface Setup {
  title: string;
  steps: string[];
}

export interface Provider {
  id: string;
  name: string;
  /** Addresses served by this provider, lower case. Empty for providers on any domain. */
  domains: string[];
  imap: Host;
  smtp: Host;
  /** The instructions, per language. Both are written, so switching the language does not leave a gap. */
  setup: { en: Setup; zh: Setup };
  /** Where the steps happen. The address is the same in every language; the label is not. */
  link?: { url: string; en: string; zh: string };
  /** True when the provider hands out a code to use instead of the login password. */
  code?: boolean;
}

/** Providers with fixed servers, most used first. */
export const PROVIDERS: Provider[] = [
  {
    id: "qq",
    name: "QQ Mail",
    domains: ["qq.com", "vip.qq.com", "foxmail.com"],
    imap: { host: "imap.qq.com", port: 993, security: "tls" },
    smtp: { host: "smtp.qq.com", port: 465, security: "tls" },
    code: true,
    setup: {
      en: {
        title: "QQ Mail needs an authorisation code",
        steps: [
          "Open QQ Mail settings, then the Account tab.",
          "Turn on the IMAP/SMTP service and pass the verification step.",
          "Copy the 16-letter authorisation code it shows, once. Your QQ password does not work here.",
        ],
      },
      zh: {
        title: "QQ 邮箱需要授权码",
        steps: ["打开 QQ 邮箱的「设置 → 账号」。", "开启「IMAP/SMTP 服务」并通过验证。", "复制页面上显示的 16 位授权码（只显示一次）。这里不能用你的 QQ 密码。"],
      },
    },
    link: { url: "https://mail.qq.com", en: "Open QQ Mail settings", zh: "打开 QQ 邮箱设置" },
  },
  {
    id: "163",
    name: "NetEase 163",
    domains: ["163.com"],
    imap: { host: "imap.163.com", port: 993, security: "tls" },
    smtp: { host: "smtp.163.com", port: 465, security: "tls" },
    code: true,
    setup: {
      en: {
        title: "163 Mail needs an authorisation code",
        steps: [
          "Open 163 Mail settings, then POP3/SMTP/IMAP.",
          "Turn on the IMAP/SMTP service and pass the verification step.",
          "Copy the authorisation code it shows, once. Your mailbox password does not work here.",
        ],
      },
      zh: {
        title: "163 邮箱需要授权码",
        steps: ["打开 163 邮箱的「设置 → POP3/SMTP/IMAP」。", "开启「IMAP/SMTP 服务」并通过验证。", "复制页面上显示的授权码（只显示一次）。这里不能用邮箱登录密码。"],
      },
    },
    link: { url: "https://mail.163.com", en: "Open 163 Mail settings", zh: "打开 163 邮箱设置" },
  },
  {
    id: "126",
    name: "NetEase 126",
    domains: ["126.com"],
    imap: { host: "imap.126.com", port: 993, security: "tls" },
    smtp: { host: "smtp.126.com", port: 465, security: "tls" },
    code: true,
    setup: {
      en: {
        title: "126 Mail needs an authorisation code",
        steps: [
          "Open 126 Mail settings, then POP3/SMTP/IMAP.",
          "Turn on the IMAP/SMTP service and pass the verification step.",
          "Copy the authorisation code it shows, once. Your mailbox password does not work here.",
        ],
      },
      zh: {
        title: "126 邮箱需要授权码",
        steps: ["打开 126 邮箱的「设置 → POP3/SMTP/IMAP」。", "开启「IMAP/SMTP 服务」并通过验证。", "复制页面上显示的授权码（只显示一次）。这里不能用邮箱登录密码。"],
      },
    },
    link: { url: "https://mail.126.com", en: "Open 126 Mail settings", zh: "打开 126 邮箱设置" },
  },
  {
    id: "yeah",
    name: "NetEase yeah.net",
    domains: ["yeah.net"],
    imap: { host: "imap.yeah.net", port: 993, security: "tls" },
    smtp: { host: "smtp.yeah.net", port: 465, security: "tls" },
    code: true,
    setup: {
      en: {
        title: "yeah.net needs an authorisation code",
        steps: ["Open yeah.net settings, then POP3/SMTP/IMAP.", "Turn on the IMAP/SMTP service and pass the verification step.", "Copy the authorisation code it shows, once."],
      },
      zh: {
        title: "yeah.net 需要授权码",
        steps: ["打开 yeah.net 的「设置 → POP3/SMTP/IMAP」。", "开启「IMAP/SMTP 服务」并通过验证。", "复制页面上显示的授权码（只显示一次）。"],
      },
    },
    link: { url: "https://mail.yeah.net", en: "Open yeah.net", zh: "打开 yeah.net" },
  },
  {
    id: "aliyun",
    name: "Alibaba Mail (aliyun.com)",
    domains: ["aliyun.com"],
    imap: { host: "imap.aliyun.com", port: 993, security: "tls" },
    smtp: { host: "smtp.aliyun.com", port: 465, security: "tls" },
    setup: {
      en: {
        title: "Turn on IMAP in Alibaba Mail first",
        steps: ["Open Alibaba Mail settings, then the client settings.", "Turn on IMAP/SMTP and save.", "Use your mailbox password unless the account hands out a client code."],
      },
      zh: {
        title: "先在阿里邮箱里开启 IMAP",
        steps: ["打开阿里邮箱的「设置 → 客户端设置」。", "开启 IMAP/SMTP 并保存。", "使用邮箱密码；如果账户提供了客户端专用密码，则用它。"],
      },
    },
    link: { url: "https://mail.aliyun.com", en: "Open Alibaba Mail", zh: "打开阿里邮箱" },
  },
  {
    id: "sina",
    name: "Sina Mail",
    domains: ["sina.com", "sina.cn", "sina.com.cn"],
    imap: { host: "imap.sina.com", port: 993, security: "tls" },
    smtp: { host: "smtp.sina.com", port: 465, security: "tls" },
    setup: {
      en: {
        title: "Turn on IMAP in Sina Mail first",
        steps: ["Open Sina Mail settings, then the client settings.", "Turn on the IMAP/SMTP service and save."],
      },
      zh: {
        title: "先在新浪邮箱里开启 IMAP",
        steps: ["打开新浪邮箱的「设置 → 客户端设置」。", "开启 IMAP/SMTP 服务并保存。"],
      },
    },
    link: { url: "https://mail.sina.com.cn", en: "Open Sina Mail", zh: "打开新浪邮箱" },
  },
  {
    id: "139",
    name: "139 Mail (China Mobile)",
    domains: ["139.com"],
    imap: { host: "imap.139.com", port: 993, security: "tls" },
    smtp: { host: "smtp.139.com", port: 465, security: "tls" },
    code: true,
    setup: {
      en: {
        title: "Turn on IMAP in 139 Mail first",
        steps: ["Open 139 Mail settings, then the client settings.", "Turn on the IMAP/SMTP service and pass the verification step.", "Use the code the page shows; the login password may be refused."],
      },
      zh: {
        title: "先在 139 邮箱里开启 IMAP",
        steps: ["打开 139 邮箱的「设置 → 客户端设置」。", "开启 IMAP/SMTP 服务并通过验证。", "使用页面显示的授权码；登录密码可能被拒绝。"],
      },
    },
    link: { url: "https://mail.139.com", en: "Open 139 Mail", zh: "打开 139 邮箱" },
  },
  {
    id: "exmail",
    name: "Tencent Exmail (company mail)",
    domains: [],
    imap: { host: "imap.exmail.qq.com", port: 993, security: "tls" },
    smtp: { host: "smtp.exmail.qq.com", port: 465, security: "tls" },
    setup: {
      en: {
        title: "Company mail on Tencent Exmail",
        steps: ["Ask your administrator to allow IMAP, or turn it on in the web mailbox settings.", "Use your mailbox password, or a client password if your administrator requires one."],
      },
      zh: {
        title: "腾讯企业邮的邮箱",
        steps: ["请管理员开放 IMAP，或在网页版邮箱设置里自行开启。", "使用邮箱密码；如果管理员要求，则使用客户端专用密码。"],
      },
    },
    link: { url: "https://exmail.qq.com", en: "Open Exmail", zh: "打开腾讯企业邮" },
  },
  {
    id: "mxhichina",
    name: "Alibaba company mail (mxhichina)",
    domains: [],
    imap: { host: "imap.mxhichina.com", port: 993, security: "tls" },
    smtp: { host: "smtp.mxhichina.com", port: 465, security: "tls" },
    setup: {
      en: {
        title: "Company mail on Alibaba Mail",
        steps: ["Ask your administrator to allow IMAP, or turn it on in the web mailbox settings.", "Use your mailbox password, or a client password if your administrator requires one."],
      },
      zh: {
        title: "阿里企业邮箱的邮箱",
        steps: ["请管理员开放 IMAP，或在网页版邮箱设置里自行开启。", "使用邮箱密码；如果管理员要求，则使用客户端专用密码。"],
      },
    },
    link: { url: "https://mail.mxhichina.com", en: "Open Alibaba Mail", zh: "打开阿里企业邮箱" },
  },
];

/** The provider whose servers this address belongs to, if any. */
export function providerForAddress(address: string): Provider | undefined {
  const domain = address.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain) return undefined;
  return PROVIDERS.find((p) => p.domains.some((d) => domain === d || domain.endsWith(`.${d}`)));
}

export function providerById(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** A preset as the account settings the engine takes. */
export function serverSettings(host: Host, username: string): ServerSettings {
  return { host: host.host, port: host.port, security: host.security, username };
}
