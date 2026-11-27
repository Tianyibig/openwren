# Absorbing MailX advantages into OpenWren

Reference: [GuqierMcl/MailX](https://github.com/GuqierMcl/MailX) (Apache-2.0). OpenWren keeps its own product identity (encrypted store, phishing/tracker protections, full-mailbox search). This plan records what MailX does well and which pieces OpenWren should take.

## Already strong in OpenWren

Encrypted SQLCipher database, phishing and tracker protections, unsubscribe, Focused/Other, snooze, rules, categories, pins, unlimited local search with server fallback, undo send / send later, English/Chinese UI, Chinese mailbox presets (QQ / 163 / 126 / yeah / 139 / Sina / Aliyun / Exmail).

## Absorbed so far

| MailX advantage | OpenWren change |
| --- | --- |
| IMAP ID after login (NetEase “Unsafe Login”) | Announce `OpenWren` + version when the server advertises `ID`; classify Unsafe Login as a clear auth failure |
| Chinese folder role names | Map 收件箱 / 已发送 / 垃圾邮件 / … when SPECIAL-USE is missing |
| iCloud Mail preset | `imap.mail.me.com` + `smtp.mail.me.com:587` STARTTLS with app-specific password steps |
| Feishu / Lark Mail presets | Organisation presets with dedicated-password guidance |
| Verification-code shortcut | Local heuristic on subject + plain body; copy bar in the reading pane |
| Sidebar top views | Cross-account Today / Inbox / Starred / Drafts / Sent (+ More); collapsible accounts |
| Lightweight “Now” | Today overview of unread + recent mail + drafts — no AI, no MCP |
| Verification-code desktop notice | After inbox bodies download, unique OTP is shown in the system notification text |
| Trash after copying a code | Settings → Notifications (off by default); reading-pane copy only; undo via toast |
| Forgotten-attachment reminder | Composer warns before send when the draft mentions an attachment but has none |
| Trailing quote fold | HTML and plain-text replies fold the last quote behind “Show quoted text” (Outlook / QQ / Original Message too) |
| Keyboard shortcut help | Press ? for an overlay; Settings → Shortcuts lists the same catalog |

## Next waves (not in this change)

Ordered by fit with OpenWren’s privacy-first stance and engineering cost.

### Wave A — Compatibility

1. **Outlook / Microsoft 365 browser sign-in (OAuth + XOAUTH2).** Password IMAP is closed on Outlook.com / M365. Needs OpenWren’s own Entra app registration (do not reuse MailX’s client id), refresh-token storage that fits Windows Credential Manager size limits, and personal vs work endpoints.
2. **Per-account SOCKS5 / HTTP CONNECT proxy.** Shared by IMAP, SMTP, and later translation; never fall back to direct when the proxy fails.
3. **NetEase IMAP ID field extras / provider-policy pause** if real 163 accounts still refuse after the basic ID announcement.

### Wave B — Reading helpers

1. **In-place translation** (subject + body, layout-preserving), with explicit consent and user-supplied DeepL / Microsoft / Google keys (or documented free channels). Translations stay local; remote images and attachments are never sent.
2. **Native OS “Copy code” notification actions** (Windows / macOS), matching MailX’s richer desktop lifecycle — Linux already shows the code in the notice text.

### Wave C — AI / MCP (opt-in only)

MailX’s “Now” page, built-in assistant, and local MCP bridge are valuable, but they send mail content to a model or to local agents. OpenWren should keep them **off by default**, with the same consent and scope controls MailX documents:

1. Shared tool layer in Rust (search, read, draft, organise, send with confirmation).
2. Local MCP stdio bridge (off until the user enables it).
3. Built-in assistant using user-configured OpenAI/Anthropic-compatible endpoints or Ollama.
4. Reading-pane summary and composer rewrite as later UI surfaces.

Do not ship a MailX cloud account, telemetry beyond OpenWren’s existing opt-in usage count, or automatic AI sending.

## Non-goals

Copying MailX’s UI chrome, Bun toolchain, unencrypted cache default, 30-day sync window, or dropping OpenWren’s phishing/tracker work. Where the two designs conflict, keep OpenWren’s privacy and search model.
