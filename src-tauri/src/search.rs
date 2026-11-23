//! The search box language: free words plus operators such as `from:` and `before:`.

use chrono::NaiveDate;

use crate::cjk;

#[derive(Debug, Default, PartialEq)]
pub struct Parsed {
    /// FTS5 expression, or None when the query has only non-text filters.
    pub fts: Option<String>,
    /// Plain words and operator values, for searching on the server.
    pub words: Vec<String>,
    /// Single characters written without spaces, which are shorter than a pair in the
    /// index. They are answered by scanning the subject and body text instead.
    pub scan: Vec<String>,
    pub has_attachment: bool,
    pub unread: bool,
    pub flagged: bool,
    /// Unix seconds: only mail before / on or after this moment.
    pub before: Option<i64>,
    pub after: Option<i64>,
    /// Folder name or role to search in.
    pub folder: Option<String>,
}

/// Split on spaces, keeping "quoted phrases" (also after an operator) together.
fn tokens(input: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut current = String::new();
    let mut quoted = false;
    for c in input.chars() {
        match c {
            '"' => quoted = !quoted,
            c if c.is_whitespace() && !quoted => {
                if !current.is_empty() {
                    out.push(std::mem::take(&mut current));
                }
            }
            c => current.push(c),
        }
    }
    if !current.is_empty() {
        out.push(current);
    }
    out
}

fn day(value: &str) -> Option<i64> {
    let date = NaiveDate::parse_from_str(value, "%Y-%m-%d").ok()?;
    Some(date.and_hms_opt(0, 0, 0)?.and_utc().timestamp())
}

/// One FTS5 term: a phrase for several words, a prefix match for one, and the pairs of
/// characters for text written without spaces (see [`cjk`]). None when the text is a
/// single such character: that is shorter than anything the index holds.
fn term(value: &str) -> Option<String> {
    let expanded = cjk::expand(value);
    let parts: Vec<String> = expanded.split_whitespace().map(escape).collect();
    match parts.as_slice() {
        [] => None,
        [one] if cjk::lone(one) => None,
        // Two characters written without spaces are a whole pair already, and a word
        // gets its usual prefix match so "invo" finds "invoice".
        [one] if cjk::unspaced(one) => Some(format!("\"{one}\"")),
        [one] => Some(format!("\"{one}\"*")),
        many => Some(format!("\"{}\"", many.join(" "))),
    }
}

/// The same, for the value of an operator such as `from:`. A single character there is
/// still a single token: scanning would lose which field it has to appear in.
fn operator_term(value: &str) -> String {
    term(value).unwrap_or_else(|| format!("\"{}\"", escape(value)))
}

fn escape(value: &str) -> String {
    value.replace('"', "\"\"")
}

pub fn parse(input: &str) -> Parsed {
    let mut p = Parsed::default();
    let mut fts = Vec::new();
    for token in tokens(input) {
        let (key, value) = match token.split_once(':') {
            Some((k, v)) if !v.is_empty() => (k.to_ascii_lowercase(), v.to_string()),
            _ => (String::new(), token.clone()),
        };
        match key.as_str() {
            "from" => fts.push(format!("sender:{}", operator_term(&value))),
            "to" => fts.push(format!("recipients:{}", operator_term(&value))),
            "subject" => fts.push(format!("subject:{}", operator_term(&value))),
            "has" if value.eq_ignore_ascii_case("attachment") => {
                p.has_attachment = true;
                continue;
            }
            "is" if value.eq_ignore_ascii_case("unread") => {
                p.unread = true;
                continue;
            }
            "is" if value.eq_ignore_ascii_case("flagged") => {
                p.flagged = true;
                continue;
            }
            "before" if day(&value).is_some() => {
                p.before = day(&value);
                continue;
            }
            "after" if day(&value).is_some() => {
                p.after = day(&value);
                continue;
            }
            "in" => {
                p.folder = Some(value);
                continue;
            }
            // Not an operator we know: search for the text as typed.
            _ => {
                match term(&token) {
                    Some(text) => fts.push(text),
                    // One character written without spaces: too short for the index.
                    None => p.scan.push(token.clone()),
                }
                p.words.push(token);
                continue;
            }
        }
        p.words.push(value);
    }
    if !fts.is_empty() {
        p.fts = Some(fts.join(" "));
    }
    p
}

impl Parsed {
    pub fn is_empty(&self) -> bool {
        self.fts.is_none()
            && self.scan.is_empty()
            && !self.has_attachment
            && !self.unread
            && !self.flagged
            && self.before.is_none()
            && self.after.is_none()
            && self.folder.is_none()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_words_become_prefix_terms() {
        let p = parse("invoice 2023");
        assert_eq!(p.fts.as_deref(), Some("\"invoice\"* \"2023\"*"));
        assert_eq!(p.words, ["invoice", "2023"]);
    }

    #[test]
    fn operators_target_columns_and_filters() {
        let p = parse("from:\"Nordic Print\" subject:invoice has:attachment before:2024-01-01 in:archive is:unread");
        assert_eq!(p.fts.as_deref(), Some("sender:\"Nordic Print\" subject:\"invoice\"*"));
        assert!(p.has_attachment && p.unread && !p.flagged);
        assert_eq!(p.before, Some(1704067200));
        assert_eq!(p.folder.as_deref(), Some("archive"));
        assert_eq!(p.words, ["Nordic Print", "invoice"]);
    }

    #[test]
    fn unknown_operators_and_bad_dates_are_searched_as_text() {
        let p = parse("re:hello before:soon 10:30");
        assert_eq!(p.fts.as_deref(), Some("\"re:hello\"* \"before:soon\"* \"10:30\"*"));
        assert!(p.before.is_none());
    }

    #[test]
    fn filters_alone_need_no_text() {
        let p = parse("has:attachment after:2025-06-01");
        assert!(p.fts.is_none());
        assert!(!p.is_empty());
        assert!(parse("   ").is_empty());
    }

    #[test]
    fn chinese_words_are_asked_for_as_pairs() {
        // Two characters are one pair, so a word of that length is a single token.
        let two = parse("发票");
        assert_eq!(two.fts.as_deref(), Some("\"发票\""));
        assert!(two.scan.is_empty());
        // Longer words are their pairs, in order, so they stay adjacent.
        let four = parse("增值税发票");
        assert_eq!(four.fts.as_deref(), Some("\"增值 值税 税发 发票\""));
        assert_eq!(four.words, ["增值税发票"]);
    }

    #[test]
    fn a_single_character_is_scanned_instead_of_searched_in_the_index() {
        let p = parse("票");
        assert!(p.fts.is_none());
        assert_eq!(p.scan, ["票"]);
        assert!(!p.is_empty());
        // Mixed with a word, both paths are used.
        let mixed = parse("invoice 票");
        assert_eq!(mixed.fts.as_deref(), Some("\"invoice\"*"));
        assert_eq!(mixed.scan, ["票"]);
    }

    #[test]
    fn chinese_in_an_operator_keeps_its_field() {
        let p = parse("from:张三");
        assert_eq!(p.fts.as_deref(), Some("sender:\"张三\""));
        assert!(p.scan.is_empty());
        let longer = parse("subject:王小明");
        assert_eq!(longer.fts.as_deref(), Some("subject:\"王小 小明\""));
    }
}
