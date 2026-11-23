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
  "sync.checkingFolders": { en: "Checking folders…", zh: "正在检查文件夹…" },
  "sync.syncing": { en: "Syncing {folder}: {done} of {total}", zh: "正在同步{folder}：{done} / {total}" },
  "sync.downloading": { en: "Downloading mail text: {done} of {total}", zh: "正在下载正文：{done} / {total}" },
  "sync.upToDate": { en: "Up to date", zh: "已是最新" },

  "folder.pane": { en: "Folders", zh: "文件夹" },
  "folder.allInboxes": { en: "All inboxes", zh: "所有收件箱" },
  "folder.newMail": { en: "New mail", zh: "写邮件" },
  "folder.addAccount": { en: "Add account", zh: "添加账户" },
  "folder.settings": { en: "Settings", zh: "设置" },
  "folder.checkMail": { en: "Check for new mail", zh: "检查新邮件" },
  "folder.more": { en: "More", zh: "更多" },
  "folder.less": { en: "Less", zh: "收起" },
  "folder.markAllRead": { en: "Mark all as read", zh: "全部标为已读" },
  "folder.addFavorite": { en: "Add to Favorites", zh: "加入收藏" },
  "folder.removeFavorite": { en: "Remove from Favorites", zh: "取消收藏" },
  "folder.moveWithinAccount": { en: "Messages can only be moved within their own account.", zh: "只能在同一账户内的文件夹之间移动邮件。" },
  "folder.syncStatus": { en: "Sync status", zh: "同步状态" },
  "folder.clickForAccounts": { en: "{text}. Click to see each account.", zh: "{text}。点击查看各账户。" },
  "folder.noAccounts": { en: "No accounts yet.", zh: "还没有账户。" },
  "folder.accountSettings": { en: "Account settings", zh: "账户设置" },
  "folder.updateAvailable": { en: "Update available: {version}", zh: "有新版本：{version}" },
  "folder.updateTitle": { en: "OpenWren {version} is available", zh: "OpenWren {version} 可以更新了" },

  "list.messages": { en: "Messages", zh: "邮件" },
  "list.messageList": { en: "Message list", zh: "邮件列表" },
  "list.searchPlaceholder": { en: "Search mail", zh: "搜索邮件" },
  "list.searchHint": { en: "Try from:name, has:attachment or before:2024-01-31", zh: "可试试 from:名字、has:attachment 或 before:2024-01-31" },
  "list.clearSearch": { en: "Clear search", zh: "清除搜索" },
  "list.resultOne": { en: "1 result", zh: "1 封结果" },
  "list.resultMany": { en: "{n} results", zh: "{n} 封结果" },
  "list.newestFirst": { en: "Newest first", zh: "最新在前" },
  "list.show": { en: "Show", zh: "显示" },
  "list.chipAll": { en: "All", zh: "全部" },
  "list.chipUnread": { en: "Unread", zh: "未读" },
  "list.chipFlagged": { en: "Flagged", zh: "已标记" },
  "list.chipOther": { en: "Other", zh: "其他" },
  "list.writtenHere": { en: "Written here", zh: "本机草稿" },
  "list.pinned": { en: "Pinned", zh: "已置顶" },
  "list.noMatch": { en: "No mail matches. Try fewer words or another date range.", zh: "没有匹配的邮件。可以少输几个词，或换个日期范围。" },
  "list.needAccount": { en: "Add an account to see your mail.", zh: "添加账户后即可查看邮件。" },
  "list.noMailings": { en: "No mailings here.", zh: "这里没有群发邮件。" },
  "list.noUnread": { en: "No unread mail here.", zh: "这里没有未读邮件。" },
  "list.noFlagged": { en: "No flagged mail here.", zh: "这里没有已标记的邮件。" },
  "list.emptyFolder": { en: "This folder is empty.", zh: "这个文件夹是空的。" },
  "list.searchServer": { en: "Search the server for more", zh: "在服务器上继续搜索" },
  "list.noSubject": { en: "(no subject)", zh: "（无主题）" },
  "list.noRecipient": { en: "(no recipient)", zh: "（无收件人）" },
  "list.draft": { en: "Draft", zh: "草稿" },
  "list.discardDraft": { en: "Discard draft", zh: "丢弃草稿" },
  "list.unread": { en: "Unread", zh: "未读" },
  "list.suspicious": { en: "Suspicious message", zh: "可疑邮件" },

  "privacy.authFailed": {
    en: "Your mail server could not confirm who sent this ({methods} failed). The sender's address may be forged.",
    zh: "你的邮件服务器无法确认发件人（{methods} 未通过）。发件地址可能是伪造的。",
  },
  "privacy.lookAlikeAddress": {
    en: "The sender's address {host} contains letters from another alphabet that look like ordinary ones. This is a common way to imitate a known address.",
    zh: "发件地址 {host} 里混入了形似普通字母的其他文字，这是仿冒已知地址的常见做法。",
  },
  "privacy.imitatedAddress": {
    en: "The sender's address {domain} looks like {known} but is a different address. This is a common way to imitate a known address.",
    zh: "发件地址 {domain} 与 {known} 很像，但并不是同一个地址，这是仿冒已知地址的常见做法。",
  },
  "privacy.shownAddress": {
    en: "The sender's name shows the address {shown}, but this message came from {address}.",
    zh: "发件人名称里写的是 {shown}，但这封邮件来自 {address}。",
  },
  "privacy.claimedBrand": {
    en: 'The sender\'s name says "{brand}", but the address {address} does not belong to {brand}.',
    zh: "发件人名称写着「{brand}」，但地址 {address} 并不属于 {brand}。",
  },

  "reader.pane": { en: "Reading pane", zh: "阅读窗格" },
  "reader.addFirst": { en: "Add your first account", zh: "添加第一个账户" },
  "reader.keepNote": { en: "OpenWren keeps your mail on this computer and in sync with your mail server.", zh: "OpenWren 把邮件保存在这台电脑上，并与邮件服务器保持同步。" },
  "reader.addAccount": { en: "Add account", zh: "添加账户" },
  "reader.messagesSelected": { en: "{n} messages selected", zh: "已选择 {n} 封邮件" },
  "reader.archive": { en: "Archive", zh: "归档" },
  "reader.delete": { en: "Delete", zh: "删除" },
  "reader.markRead": { en: "Mark as read", zh: "标为已读" },
  "reader.markUnread": { en: "Mark as unread", zh: "标为未读" },
  "reader.dragToMove": { en: "Drag the selection onto a folder to move it.", zh: "把选中的邮件拖到文件夹上即可移动。" },
  "reader.couldNotLoad": { en: "This message couldn't be loaded.", zh: "这封邮件无法载入。" },
  "reader.tryAgain": { en: "Try again", zh: "重试" },
  "reader.selectMessage": { en: "Select a message to read it", zh: "选择一封邮件来阅读" },
  "reader.loading": { en: "Loading…", zh: "载入中…" },

  "reader.beCareful": { en: "Be careful with this message", zh: "这封邮件需要小心" },
  "reader.reasonsMore": { en: "{first}, and {n} more reasons", zh: "{first}，另有 {n} 项原因" },
  "reader.details": { en: "Details", zh: "详情" },
  "reader.hide": { en: "Hide", zh: "收起" },
  "reader.block": { en: "Block", zh: "屏蔽" },
  "reader.reason.notConfirmed": { en: "Sender not confirmed", zh: "发件人未通过验证" },
  "reader.reason.nameMismatch": { en: "Sender name does not match the address", zh: "发件人名称与地址不符" },
  "reader.reason.misleadingLink": { en: "Misleading link", zh: "链接与文字不符" },
  "reader.reason.lookAlikeLink": { en: "Look-alike link", zh: "形似域名链接" },
  "reader.misleadingLink": { en: 'A link shows "{shown}" but leads to {goes}.', zh: "某个链接显示「{shown}」，实际却指向 {goes}。" },
  "reader.lookAlikeLink": { en: "A link leads to {name}, a name that uses look-alike letters from another alphabet.", zh: "某个链接指向 {name}，其中混入了形似的其他文字。" },

  "reader.mailing": { en: "This is a mailing.", zh: "这是一封群发邮件。" },
  "reader.unsubscribe": { en: "Unsubscribe", zh: "退订" },
  "reader.cancel": { en: "Cancel", zh: "取消" },
  "reader.sending": { en: "Sending…", zh: "发送中…" },
  "reader.askUnsubscribe": { en: "Ask {sender} to stop sending you mail? {how}", zh: "让 {sender} 停止给你发邮件？{how}" },
  "reader.unsubOneClick": { en: "OpenWren sends the request to {to} for you.", zh: "OpenWren 会替你向 {to} 发送退订请求。" },
  "reader.unsubMail": { en: "OpenWren sends an unsubscribe message from your address to {to}.", zh: "OpenWren 会用你的地址向 {to} 发送一封退订邮件。" },
  "reader.unsubLink": { en: "The unsubscribe page at {to} opens in your browser.", zh: "会在浏览器里打开 {to} 的退订页面。" },
  "reader.unsubTo": { en: "the sender", zh: "发件人" },

  "reader.replyTo": { en: "Reply to {name}", zh: "回复 {name}" },
  "reader.attachFile": { en: "Attach a file", zh: "添加附件" },
  "reader.signatureFormat": { en: "Signature and formatting", zh: "签名与格式" },
  "reader.forward": { en: "Forward", zh: "转发" },
  "reader.send": { en: "Send", zh: "发送" },

  "reader.actions": { en: "Message actions", zh: "邮件操作" },
  "reader.snooze": { en: "Snooze", zh: "稍后处理" },
  "reader.removeFlag": { en: "Remove flag", zh: "取消标记" },
  "reader.flag": { en: "Flag", zh: "标记" },
  "reader.unpin": { en: "Unpin", zh: "取消置顶" },
  "reader.pin": { en: "Pin", zh: "置顶" },
  "reader.reply": { en: "Reply", zh: "回复" },
  "reader.replyAll": { en: "Reply all", zh: "全部回复" },
  "reader.moveTo": { en: "Move to", zh: "移动到" },
  "reader.moreActions": { en: "More actions", zh: "更多操作" },
  "reader.noSubject": { en: "(no subject)", zh: "（无主题）" },

  "reader.conversation": { en: "Conversation", zh: "会话" },
  "reader.messagesInConversation": { en: "{n} messages in this conversation", zh: "本会话共 {n} 封邮件" },
  "reader.toLine": { en: "to {to}", zh: "收件人 {to}" },
  "reader.ccLine": { en: ", cc {cc}", zh: "，抄送 {cc}" },
  "reader.undisclosed": { en: "undisclosed recipients", zh: "未公开的收件人" },
  "reader.editDraft": { en: "Edit draft", zh: "编辑草稿" },

  "reader.categoryGroup": { en: "Colour categories", zh: "颜色分类" },
  "reader.removeCategory": { en: "Remove {name}", zh: "移除 {name}" },
  "reader.categoryLabel": { en: "{name} category", zh: "{name} 分类" },

  "reader.privacyNote": { en: "Privacy: {what}.", zh: "隐私：{what}。" },
  "reader.trackerOne": { en: "1 tracking image removed", zh: "已去除 1 个追踪图片" },
  "reader.trackerMany": { en: "{n} tracking images removed", zh: "已去除 {n} 个追踪图片" },
  "reader.linkOne": { en: "tracking removed from 1 link", zh: "已去除 1 个链接上的追踪参数" },
  "reader.linkMany": { en: "tracking removed from {n} links", zh: "已去除 {n} 个链接上的追踪参数" },

  "reader.openingFile": { en: "Opening {name}…", zh: "正在打开 {name}…" },
  "reader.fileSaved": { en: "{name} saved", zh: "已保存 {name}" },
  "reader.openFile": { en: "Open {name}", zh: "打开 {name}" },
  "reader.moreForFile": { en: "More for {name}", zh: "{name} 的更多操作" },
  "reader.open": { en: "Open", zh: "打开" },
  "reader.saveAs": { en: "Save as…", zh: "另存为…" },

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
