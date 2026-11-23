//! Chinese, Japanese and Korean text for the full-text index.
//!
//! SQLite's `unicode61` tokenizer splits on characters that are not letters, so a
//! sentence written without spaces becomes one long token and a word inside it cannot be
//! found. Indexing every pair of neighbouring characters, and asking the index for the
//! pairs a query is made of instead, makes those words findable without a dictionary and
//! without a tokenizer of our own.
//!
//! A two-letter word such as 发票 is then exactly one token in the index, and a longer
//! one such as 增值税发票 is the sequence of its pairs, searched as a phrase.

/// True for a character that is written without spaces after it: Han, kana, Hangul.
fn joins(c: char) -> bool {
    matches!(
        c as u32,
        0x3040..=0x30FF        // kana
        | 0x3400..=0x4DBF      // Han, extension A
        | 0x4E00..=0x9FFF      // Han
        | 0xAC00..=0xD7AF      // Hangul syllables
        | 0xF900..=0xFAFF      // Han, compatibility ideographs
        | 0x20000..=0x2FA1F    // Han, extensions B to F
    )
}

/// The text to keep in the index. Runs of such characters become their overlapping
/// pairs, separated by spaces: "增值税发票" is stored as "增值 值税 税发 发票".
/// Everything else is left alone, and pieces with no letter or digit in them are
/// dropped because the tokenizer would discard them anyway.
pub fn expand(text: &str) -> String {
    let mut parts: Vec<String> = Vec::new();
    let mut plain = String::new();
    let mut run: Vec<char> = Vec::new();

    fn flush_plain(plain: &mut String, parts: &mut Vec<String>) {
        let trimmed = plain.trim();
        if trimmed.chars().any(char::is_alphanumeric) {
            parts.push(trimmed.to_string());
        }
        plain.clear();
    }

    fn flush_run(run: &mut Vec<char>, parts: &mut Vec<String>) {
        match run.len() {
            0 => {}
            // A single character is too short to be a pair: keep it as itself, so text
            // that happens to be one character is still findable.
            1 => parts.push(run[0].to_string()),
            _ => parts.extend(run.windows(2).map(|pair| pair.iter().collect::<String>())),
        }
        run.clear();
    }

    for c in text.chars() {
        if joins(c) {
            flush_plain(&mut plain, &mut parts);
            run.push(c);
        } else {
            flush_run(&mut run, &mut parts);
            plain.push(c);
        }
    }
    flush_run(&mut run, &mut parts);
    flush_plain(&mut plain, &mut parts);
    parts.join(" ")
}

/// True when the whole term is one character written without spaces, and so too short to
/// be a pair in the index. Such a query is answered by scanning text instead.
pub fn lone(term: &str) -> bool {
    let mut chars = term.chars();
    matches!((chars.next(), chars.next()), (Some(c), None) if joins(c))
}

/// True when every character is one of those written without spaces, which is how the
/// index knows a term of two characters is already a whole pair and needs no prefix.
pub fn unspaced(term: &str) -> bool {
    !term.is_empty() && term.chars().all(joins)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_chinese_sentence_becomes_its_overlapping_pairs() {
        assert_eq!(expand("增值税发票"), "增值 值税 税发 发票");
        assert_eq!(expand("发票"), "发票");
        assert_eq!(expand("票"), "票");
    }

    #[test]
    fn text_that_has_spaces_is_left_alone() {
        assert_eq!(expand("Invoice 2023-1102"), "Invoice 2023-1102");
        assert_eq!(expand("Søren Østergård"), "Søren Østergård");
        assert_eq!(expand(""), "");
    }

    #[test]
    fn a_run_of_characters_is_kept_apart_from_the_words_beside_it() {
        assert_eq!(expand("abc增值税def"), "abc 增值 值税 def");
        assert_eq!(expand("请查收 Invoice"), "请查 查收 Invoice");
        // Punctuation with no letter in it would be dropped by the tokenizer; it only
        // separates the pairs around it.
        assert_eq!(expand("发票，报销"), "发票 报销");
    }

    #[test]
    fn kana_and_hangul_are_indexed_the_same_way() {
        assert_eq!(expand("カタカナ"), "カタ タカ カナ");
        assert_eq!(expand("안녕하세요"), "안녕 녕하 하세 세요");
    }

    #[test]
    fn one_character_is_recognised_as_too_short_to_be_a_pair() {
        assert!(lone("票"));
        assert!(!lone("发票"));
        assert!(!lone("a"));
        assert!(!lone(""));
    }

    #[test]
    fn a_pair_is_recognised_as_already_whole() {
        assert!(unspaced("发票"));
        assert!(!unspaced("invoice"));
        assert!(!unspaced("发票 2023"));
        assert!(!unspaced(""));
    }
}
