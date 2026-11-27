//! Local verification-code recognition (MailX-style conservative rules).
//!
//! Pure text heuristics only: no network, no clipboard. A unique 4–8 character
//! ASCII digit or mixed letter/digit code next to clear verification language
//! is required. Used for desktop notifications after new mail bodies arrive.

use std::collections::HashSet;

const KEYWORDS: &[&str] = &[
    "verification code",
    "security code",
    "authentication code",
    "confirmation code",
    "login code",
    "sign-in code",
    "sign in code",
    "one-time password",
    "one time password",
    "one-time code",
    "one time code",
    "otp",
    "验证码",
    "驗證碼",
    "校验码",
    "校驗碼",
    "动态密码",
    "動態密碼",
    "动态码",
    "動態碼",
];

const SUFFIXES: &[&str] = &["to sign in", "to log in", "to verify your email", "to verify your account"];

const BRIDGE_WORDS: &[&str] = &["is", "your", "the", "this", "use", "enter", "below", "following", "为", "為", "是", "如下", "请使用", "請使用", "请输入", "請輸入"];

const MAX_SUBJECT: usize = 4096;
const MAX_BODY: usize = 64 * 1024;
const CONTEXT: usize = 96;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Detection {
    Found(String),
    Ambiguous,
    NotFound,
}

/// Recognise a unique verification code in subject + plain body.
pub fn detect(subject: &str, body: &str) -> Detection {
    if subject.len() > MAX_SUBJECT || body.len() > MAX_BODY {
        return Detection::NotFound;
    }
    let subject_text = if reply_subject(subject) {
        String::new()
    } else {
        normalize(subject)
    };
    let subject_keyword = keyword_in(&subject_text.to_lowercase());
    let body_text = unquoted(body);
    let mut codes = HashSet::new();
    scan(&subject_text, None, &mut codes);
    scan(&body_text, subject_keyword.as_deref(), &mut codes);
    match codes.len() {
        0 => Detection::NotFound,
        1 => Detection::Found(codes.into_iter().next().unwrap()),
        _ => Detection::Ambiguous,
    }
}

fn normalize(text: &str) -> String {
    text.replace("\r\n", "\n").replace('\r', "\n").chars().map(|c| if c.is_whitespace() && c != '\n' { ' ' } else { c }).collect()
}

fn reply_subject(subject: &str) -> bool {
    let s = subject.trim_start().to_lowercase();
    ["re:", "fw:", "fwd:", "re：", "fw：", "fwd：", "回复:", "回复：", "回覆:", "回覆：", "转发:", "转发：", "轉寄:", "轉寄："]
        .iter()
        .any(|p| s.starts_with(p))
}

fn unquoted(body: &str) -> String {
    let mut text = String::new();
    for line in normalize(body).split('\n') {
        let trimmed = line.trim();
        let lower = trimmed.to_lowercase();
        if (lower.starts_with("on ") && lower.ends_with("wrote:"))
            || (trimmed.starts_with('在') && (trimmed.ends_with("写道：") || trimmed.ends_with("寫道：")))
            || lower.contains("-----original message-----")
            || lower.contains("-----forwarded message-----")
            || trimmed.contains("-----原始邮件-----")
        {
            break;
        }
        if !trimmed.starts_with('>') {
            text.push_str(line);
        }
        text.push('\n');
    }
    text
}

fn scan(text: &str, subject_keyword: Option<&str>, codes: &mut HashSet<String>) {
    let lower = text.to_lowercase();
    let network = network_tokens(text);
    let mut network_index = 0usize;
    let first_line = first_code_line(text);
    let mut previous: Option<(usize, bool)> = None;
    let bytes = text.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if !bytes[i].is_ascii_alphanumeric() {
            i += 1;
            continue;
        }
        let begin = i;
        while i < bytes.len() && bytes[i].is_ascii_alphanumeric() {
            i += 1;
        }
        let end = i;
        let code = &text[begin..end];
        while network_index < network.len() && network[network_index].1 <= begin {
            network_index += 1;
        }
        let inside_network = network_index < network.len() && network[network_index].0 <= begin;
        if code.len() < 4 || code.len() > 8 || !code.chars().any(|c| c.is_ascii_digit()) || inside_network || !whole_code(text, begin, end) {
            continue;
        }
        let mut ok = has_evidence(&lower, begin, end, subject_keyword);
        if !ok {
            if let Some((prev_end, prev_ok)) = previous {
                if prev_ok && list_separator(&lower[prev_end..begin]) {
                    ok = true;
                }
            }
        }
        if !ok
            && subject_keyword.is_some()
            && code.chars().all(|c| c.is_ascii_digit())
            && begin == first_line.0
            && end == first_line.1
        {
            ok = true;
        }
        if !ok {
            continue;
        }
        previous = Some((end, true));
        codes.insert(code.to_string());
        if codes.len() > 16 {
            codes.clear();
            return;
        }
    }
}

fn has_evidence(lower: &str, start: usize, end: usize, subject_keyword: Option<&str>) -> bool {
    let before_start = start.saturating_sub(CONTEXT);
    let after_end = (end + CONTEXT).min(lower.len());
    let before = &lower[before_start..start];
    let after = &lower[end..after_end];
    let keywords: Vec<&str> = if subject_keyword.is_some() {
        KEYWORDS.iter().copied().chain(std::iter::once("code")).collect()
    } else {
        KEYWORDS.to_vec()
    };
    for keyword in &keywords {
        if let Some(bi) = before.rfind(keyword) {
            if keyword_boundary(before, bi, keyword) && !old_context(&before[..bi]) && bridge(&before[bi + keyword.len()..]) {
                return true;
            }
        }
        if let Some(ai) = after.find(keyword) {
            if keyword_boundary(after, ai, keyword) && bridge(&after[..ai]) && !old_context(before) {
                return true;
            }
        }
    }
    for keyword in SUFFIXES {
        if let Some(ai) = after.find(keyword) {
            if keyword_boundary(after, ai, keyword) && bridge(&after[..ai]) && !old_context(before) {
                return true;
            }
        }
    }
    false
}

fn bridge(gap: &str) -> bool {
    if gap.len() > 48 || gap.matches('\n').count() > 2 {
        return false;
    }
    gap.split(|c: char| " \t:：=,，-–—()（）[]【】\"'`*".contains(c))
        .filter(|w| !w.is_empty())
        .all(|word| BRIDGE_WORDS.contains(&word))
}

fn old_context(prefix: &str) -> bool {
    let last = prefix.rsplit(['\n', '.', '。', '!', '！', ';', '；']).next().unwrap_or("");
    let lower = last.to_lowercase();
    for w in ["old", "previous", "expired", "invalid", "example"] {
        if word_boundary_contains(&lower, w) {
            return true;
        }
    }
    ["旧", "舊", "上次", "过期", "過期", "示例", "do not use", "don't use"].iter().any(|w| last.contains(w))
}

fn word_boundary_contains(hay: &str, word: &str) -> bool {
    let mut from = 0;
    while let Some(i) = hay[from..].find(word) {
        let i = from + i;
        let before = i.checked_sub(1).and_then(|j| hay.as_bytes().get(j)).copied();
        let after = hay.as_bytes().get(i + word.len()).copied();
        let letter = |b: Option<u8>| b.is_some_and(|b| b.is_ascii_alphabetic());
        if !letter(before) && !letter(after) {
            return true;
        }
        from = i + 1;
    }
    false
}

fn keyword_in(lower: &str) -> Option<String> {
    for keyword in KEYWORDS {
        let mut from = 0;
        while from <= lower.len() {
            if let Some(i) = lower[from..].find(keyword) {
                let i = from + i;
                if keyword_boundary(lower, i, keyword) && !old_context(&lower[..i]) {
                    return Some((*keyword).to_string());
                }
                from = i + 1;
            } else {
                break;
            }
        }
    }
    None
}

fn keyword_boundary(text: &str, start: usize, keyword: &str) -> bool {
    if keyword.chars().any(|c| !c.is_ascii()) {
        return true;
    }
    let before = start.checked_sub(1).and_then(|i| text.as_bytes().get(i)).copied().map(|b| b as char);
    let after = text.as_bytes().get(start + keyword.len()).copied().map(|b| b as char);
    let word = |c: Option<char>| c.is_some_and(|c| c.is_ascii_alphanumeric() || c == '_');
    !word(before) && !word(after)
}

fn first_code_line(text: &str) -> (usize, usize) {
    let trimmed = text.trim_start();
    let start = text.len() - trimmed.len();
    let line = trimmed.split('\n').next().unwrap_or("").trim_end();
    (start, start + line.len())
}

fn list_separator(gap: &str) -> bool {
    gap.len() <= 16 && ["or", "and", "或", "和", "、", ",", "，"].contains(&gap.trim())
}

fn network_tokens(text: &str) -> Vec<(usize, usize)> {
    let mut ranges = Vec::new();
    let mut i = 0;
    let bytes = text.as_bytes();
    while i < bytes.len() {
        if bytes[i].is_ascii_whitespace() {
            i += 1;
            continue;
        }
        let begin = i;
        while i < bytes.len() && !bytes[i].is_ascii_whitespace() {
            i += 1;
        }
        let token = &text[begin..i];
        let head = token.get(..4).unwrap_or(token).to_lowercase();
        if token.contains("://") || token.contains('@') || head == "www." {
            ranges.push((begin, i));
        }
    }
    ranges
}

fn whole_code(text: &str, start: usize, end: usize) -> bool {
    let before = &text[..start];
    let after = &text[end..];
    let prev_char = before.chars().last();
    let next_char = after.chars().next();
    let attached = |c: Option<char>| c.is_some_and(|c| c.is_ascii_alphanumeric() || "_@/\\".contains(c));
    if attached(prev_char) || attached(next_char) {
        return false;
    }
    let prev = before.trim_end();
    let next = after.trim_start();
    if prev.ends_with(['$', '€', '£', '¥', '￥', '+']) || next.starts_with(['%', '％']) {
        return false;
    }
    if separated_digit(&prev.chars().rev().collect::<String>()) || separated_digit(next) {
        return false;
    }
    true
}

fn separated_digit(side: &str) -> bool {
    let Some(first) = side.chars().next() else {
        return false;
    };
    if first.is_ascii_digit() {
        return true;
    }
    if first.is_ascii_alphabetic() {
        let word: String = side.chars().take_while(|c| c.is_ascii_alphanumeric()).take(9).collect();
        return (4..=8).contains(&word.len()) && word.chars().any(|c| c.is_ascii_digit());
    }
    if first == ',' || first == '，' {
        let rest = side[first.len_utf8()..].trim_start();
        let word: String = rest.chars().take_while(|c| c.is_ascii_alphanumeric()).take(9).collect();
        if (4..=8).contains(&word.len()) && word.chars().any(|c| c.is_ascii_digit()) {
            return false;
        }
        return first == ',' && word.starts_with(|c: char| c.is_ascii_digit());
    }
    if "-–—/".contains(first) {
        return side[first.len_utf8()..].trim_start().starts_with(|c: char| c.is_ascii_alphanumeric());
    }
    if first == '.' || first == ':' {
        return side[1..].starts_with(|c: char| c.is_ascii_digit());
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_chinese_code() {
        assert_eq!(detect("登录验证码", "您的验证码是 482913，10 分钟内有效。"), Detection::Found("482913".into()));
    }

    #[test]
    fn finds_english_otp() {
        assert_eq!(detect("Your verification code", "Your verification code is 001234."), Detection::Found("001234".into()));
    }

    #[test]
    fn ignores_replies_and_quotes() {
        assert_eq!(
            detect("Re: Your verification code: 111111", "On Mon someone wrote:\n> verification code 222222\n"),
            Detection::NotFound
        );
    }

    #[test]
    fn ignores_years() {
        assert_eq!(detect("Notice", "Your verification code expires in 2026."), Detection::NotFound);
    }

    #[test]
    fn reports_ambiguity() {
        assert_eq!(detect("Codes", "verification code 123456 or 654321"), Detection::Ambiguous);
    }

    #[test]
    fn skips_urls() {
        assert_eq!(detect("Link", "verification code https://example.com/path/12345678"), Detection::NotFound);
    }
}
