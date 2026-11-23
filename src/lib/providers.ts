import type { Security, ServerSettings } from "../types";

/**
 * Mail providers whose servers are known in advance, so nobody has to look them up.
 *
 * The Chinese free mailboxes here all keep client access switched off until it is
 * turned on in their web settings, and then hand out a separate code instead of
 * accepting the mailbox password. That is the step people get stuck on, so each
 * preset carries the instructions with it.
 */
export interface Host {
  host: string;
  port: number;
  security: Security;
}

export interface Provider {
  id: string;
  name: string;
  /** Addresses served by this provider, lower case. Empty for providers on any domain. */
  domains: string[];
  imap: Host;
  smtp: Host;
  /** What to do in the provider's web mailbox before a password or code works. */
  setup: {
    title: string;
    steps: string[];
    link?: { label: string; url: string };
  };
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
      title: "QQ Mail needs an authorisation code",
      steps: [
        "Open QQ Mail settings, then the Account tab (设置 → 账号).",
        "Turn on IMAP/SMTP service (开启 IMAP/SMTP 服务) and pass the verification step.",
        "Copy the 16-letter authorisation code (授权码) it shows, once. Your QQ password does not work here.",
      ],
      link: { label: "Open QQ Mail settings", url: "https://mail.qq.com" },
    },
  },
  {
    id: "163",
    name: "NetEase 163",
    domains: ["163.com"],
    imap: { host: "imap.163.com", port: 993, security: "tls" },
    smtp: { host: "smtp.163.com", port: 465, security: "tls" },
    code: true,
    setup: {
      title: "163 Mail needs an authorisation code",
      steps: [
        "Open 163 Mail settings, then POP3/SMTP/IMAP (设置 → POP3/SMTP/IMAP).",
        "Turn on IMAP/SMTP service (开启 IMAP/SMTP 服务) and pass the verification step.",
        "Copy the authorisation code (授权码) it shows, once. Your mailbox password does not work here.",
      ],
      link: { label: "Open 163 Mail settings", url: "https://mail.163.com" },
    },
  },
  {
    id: "126",
    name: "NetEase 126",
    domains: ["126.com"],
    imap: { host: "imap.126.com", port: 993, security: "tls" },
    smtp: { host: "smtp.126.com", port: 465, security: "tls" },
    code: true,
    setup: {
      title: "126 Mail needs an authorisation code",
      steps: [
        "Open 126 Mail settings, then POP3/SMTP/IMAP (设置 → POP3/SMTP/IMAP).",
        "Turn on IMAP/SMTP service (开启 IMAP/SMTP 服务) and pass the verification step.",
        "Copy the authorisation code (授权码) it shows, once. Your mailbox password does not work here.",
      ],
      link: { label: "Open 126 Mail settings", url: "https://mail.126.com" },
    },
  },
  {
    id: "yeah",
    name: "NetEase yeah.net",
    domains: ["yeah.net"],
    imap: { host: "imap.yeah.net", port: 993, security: "tls" },
    smtp: { host: "smtp.yeah.net", port: 465, security: "tls" },
    code: true,
    setup: {
      title: "yeah.net needs an authorisation code",
      steps: [
        "Open yeah.net settings, then POP3/SMTP/IMAP (设置 → POP3/SMTP/IMAP).",
        "Turn on IMAP/SMTP service (开启 IMAP/SMTP 服务) and pass the verification step.",
        "Copy the authorisation code (授权码) it shows, once.",
      ],
      link: { label: "Open yeah.net", url: "https://mail.yeah.net" },
    },
  },
  {
    id: "aliyun",
    name: "Alibaba Mail (aliyun.com)",
    domains: ["aliyun.com"],
    imap: { host: "imap.aliyun.com", port: 993, security: "tls" },
    smtp: { host: "smtp.aliyun.com", port: 465, security: "tls" },
    setup: {
      title: "Turn on IMAP in Alibaba Mail first",
      steps: [
        "Open Alibaba Mail settings, then the client settings (设置 → 客户端设置).",
        "Turn on IMAP/SMTP and save.",
        "Use your mailbox password unless the account hands out a client code.",
      ],
      link: { label: "Open Alibaba Mail", url: "https://mail.aliyun.com" },
    },
  },
  {
    id: "sina",
    name: "Sina Mail",
    domains: ["sina.com", "sina.cn", "sina.com.cn"],
    imap: { host: "imap.sina.com", port: 993, security: "tls" },
    smtp: { host: "smtp.sina.com", port: 465, security: "tls" },
    setup: {
      title: "Turn on IMAP in Sina Mail first",
      steps: [
        "Open Sina Mail settings, then the client settings (设置 → 客户端设置).",
        "Turn on IMAP/SMTP service and save.",
      ],
      link: { label: "Open Sina Mail", url: "https://mail.sina.com.cn" },
    },
  },
  {
    id: "139",
    name: "139 Mail (China Mobile)",
    domains: ["139.com"],
    imap: { host: "imap.139.com", port: 993, security: "tls" },
    smtp: { host: "smtp.139.com", port: 465, security: "tls" },
    code: true,
    setup: {
      title: "Turn on IMAP in 139 Mail first",
      steps: [
        "Open 139 Mail settings, then the client settings (设置 → 客户端设置).",
        "Turn on IMAP/SMTP service and pass the verification step.",
        "Use the code the page shows; the login password may be refused.",
      ],
      link: { label: "Open 139 Mail", url: "https://mail.139.com" },
    },
  },
  {
    id: "exmail",
    name: "Tencent Exmail (company mail)",
    domains: [],
    imap: { host: "imap.exmail.qq.com", port: 993, security: "tls" },
    smtp: { host: "smtp.exmail.qq.com", port: 465, security: "tls" },
    setup: {
      title: "Company mail on Tencent Exmail",
      steps: [
        "Ask your administrator to allow IMAP, or turn it on in the web mailbox settings.",
        "Use your mailbox password, or a client password if your administrator requires one.",
      ],
      link: { label: "Open Exmail", url: "https://exmail.qq.com" },
    },
  },
  {
    id: "mxhichina",
    name: "Alibaba company mail (mxhichina)",
    domains: [],
    imap: { host: "imap.mxhichina.com", port: 993, security: "tls" },
    smtp: { host: "smtp.mxhichina.com", port: 465, security: "tls" },
    setup: {
      title: "Company mail on Alibaba Mail",
      steps: [
        "Ask your administrator to allow IMAP, or turn it on in the web mailbox settings.",
        "Use your mailbox password, or a client password if your administrator requires one.",
      ],
      link: { label: "Open Alibaba Mail", url: "https://mail.mxhichina.com" },
    },
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
