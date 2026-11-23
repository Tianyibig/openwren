/**
 * The interface, in the languages it is written in.
 *
 * Strings live here rather than in the screens. Not everything is moved yet: the
 * settings dialog and the language switch came first, because that is where the
 * language is chosen. Screens still holding English are converted one at a time, and
 * `t` returns the key itself when one is missing, so a half-moved screen shows English
 * instead of nothing.
 */

export const LANGUAGES = [
  { id: "en", name: "English" },
  { id: "zh", name: "中文" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["id"];

/** One entry per string: the English text is the source, the others follow. */
export const MESSAGES: Record<string, { en: string; zh: string }> = {
  "settings.title": { en: "Settings", zh: "设置" },
  "settings.close": { en: "Close settings", zh: "关闭设置" },
  "settings.sections": { en: "Settings sections", zh: "设置分区" },
  "settings.accounts": { en: "Accounts", zh: "账户" },
  "settings.signatures": { en: "Signatures", zh: "签名" },
  "settings.sync": { en: "Sync and storage", zh: "同步与存储" },
  "settings.appearance": { en: "Appearance", zh: "外观" },
  "settings.privacy": { en: "Privacy", zh: "隐私" },
  "settings.rules": { en: "Rules", zh: "规则" },
  "settings.notifications": { en: "Notifications", zh: "通知" },
  "settings.about": { en: "About", zh: "关于" },
  "settings.sponsor": { en: "Sponsor", zh: "赞助" },

  "sync.keepText": { en: "Keep message text on this computer", zh: "邮件正文保存在这台电脑上" },
  "sync.keepAll": { en: "All mail", zh: "全部邮件" },
  "sync.keep2y": { en: "Last 2 years", zh: "最近 2 年" },
  "sync.keep1y": { en: "Last year", zh: "最近 1 年" },
  "sync.keep3m": { en: "Last 3 months", zh: "最近 3 个月" },
  "sync.keepNote": {
    en: "Sender, subject and date are always kept for all mail, so older messages stay searchable by those. Text of older messages is fetched when you open them or use “Search the server for more”. Applies from the next sync; text already downloaded is kept.",
    zh: "发件人、主题和日期始终保留，因此旧邮件仍可按这些内容搜索。更早邮件的正文会在你打开它们或使用「在服务器上继续搜索」时下载。设置从下次同步起生效，已下载的正文会保留。",
  },
  "sync.status": { en: "Sync status", zh: "同步状态" },
  "sync.waiting": { en: "Waiting…", zh: "等待中…" },
  "sync.now": { en: "Sync now", zh: "立即同步" },

  "storage.title": { en: "Where your mail is kept", zh: "邮件存放位置" },
  "storage.note": {
    en: "The encrypted database is kept in this folder. Put it on another disk, or in a folder your backup already covers.",
    zh: "加密数据库保存在这个文件夹里。可以放到其他磁盘，或放在备份已经覆盖的文件夹中。",
  },
  "storage.moveNotice": {
    en: "Your mail will be moved to {dir} the next time OpenWren starts. Mail that arrives in between moves with it.",
    zh: "下次启动 OpenWren 时，邮件会移动到 {dir}。在此之前收到的邮件也会一起搬过去。",
  },
  "storage.restart": { en: "Restart now", zh: "立即重启" },
  "storage.change": { en: "Change folder…", zh: "更换文件夹…" },
  "storage.choosing": { en: "Choosing…", zh: "选择中…" },

  "appearance.language": { en: "Language", zh: "界面语言" },
  "appearance.font": { en: "Font", zh: "字体" },
  "appearance.fontNunito": { en: "Nunito (rounded)", zh: "Nunito（圆体）" },
  "appearance.fontSystem": { en: "This computer's font", zh: "本机字体" },
  "appearance.fontSystemName": { en: "This computer's font ({name})", zh: "本机字体（{name}）" },
  "appearance.textSize": { en: "Text size", zh: "文字大小" },
  "appearance.timeFormat": { en: "Time format", zh: "时间格式" },
  "appearance.time24": { en: "24-hour (15:05)", zh: "24 小时制（15:05）" },
  "appearance.time12": { en: "AM / PM (3:05 PM)", zh: "上午 / 下午（3:05 PM）" },
  "appearance.theme": { en: "Theme", zh: "主题" },
  "appearance.themeSystem": { en: "Match system", zh: "跟随系统" },
  "appearance.themeLight": { en: "Light", zh: "浅色" },
  "appearance.themeDark": { en: "Dark", zh: "深色" },
  "appearance.focused": { en: "Focused inbox", zh: "重点收件箱" },
  "appearance.focusedOn": { en: "Split into Focused and Other", zh: "分为「重点」和「其他」" },
  "appearance.focusedOff": { en: "One list", zh: "单一列表" },
  "appearance.density": { en: "Message list density", zh: "邮件列表密度" },
  "appearance.roomy": { en: "Roomy", zh: "宽松" },
  "appearance.cozy": { en: "Cozy", zh: "适中" },
  "appearance.compact": { en: "Compact", zh: "紧凑" },
  "appearance.undoSend": { en: "Undo send", zh: "撤回发送" },
  "appearance.off": { en: "Off", zh: "关闭" },
  "appearance.seconds": { en: "{n} seconds", zh: "{n} 秒" },
};

/**
 * The language to use. A choice in Settings wins; until one is made the desktop's own
 * language decides, so a Chinese system starts in Chinese.
 */
export function language(choice: string | undefined): Lang {
  if (choice === "en" || choice === "zh") return choice;
  const system = typeof navigator === "undefined" ? "" : navigator.language;
  return system.toLowerCase().startsWith("zh") ? "zh" : "en";
}

/** The text for `key`, with `{name}` placeholders filled in. A missing key is returned as it is. */
export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = MESSAGES[key];
  if (!entry) return key;
  let text = entry[lang] ?? entry.en;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
