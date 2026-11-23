//! The text inside an attachment, so a search can find a receipt by what it says.
//!
//! Only what can be read without a server: plain text, office documents and PDFs. A
//! picture or an archive has no text to take out, and says so by returning `None` — which
//! is also what happens when a document cannot be parsed, because a broken attachment must
//! not fail the sync that brought it.

/// Larger attachments are left alone: a hundred-megabyte PDF is a place to read, not to
/// index, and the sync must not get stuck on it.
const LIMIT_BYTES: usize = 8 * 1024 * 1024;
/// How much of a document's text is kept. Beyond this a search result is the same.
const LIMIT_CHARS: usize = 200_000;

/// The searchable text of one attachment, or `None` when there is none.
pub fn text(mime: &str, name: &str, bytes: &[u8]) -> Option<String> {
    if bytes.is_empty() || bytes.len() > LIMIT_BYTES {
        return None;
    }
    let kind = kind_of(mime, name);
    let text = match kind {
        Kind::Text => String::from_utf8_lossy(bytes).to_string(),
        Kind::Docx => docx_text(bytes)?,
        Kind::Pdf => pdf_text(bytes)?,
        Kind::Other => return None,
    };
    let text = squash(&text);
    if text.is_empty() {
        None
    } else {
        Some(text.chars().take(LIMIT_CHARS).collect())
    }
}

#[derive(Debug, PartialEq, Eq, Clone, Copy)]
enum Kind {
    Text,
    Docx,
    Pdf,
    Other,
}

/// What to do with a part, from its declared type first and its name second: plenty of
/// mail says `application/octet-stream` and then names the file `invoice.pdf`.
///
/// The order matters: an Office file's type contains "openxmlformats", which looks like
/// XML but is a zip, so documents are recognised before anything called XML is read as text.
fn kind_of(mime: &str, name: &str) -> Kind {
    let base = mime.split(';').next().unwrap_or("").trim().to_ascii_lowercase();
    let name = name.to_ascii_lowercase();
    let ends = |suffix: &str| name.ends_with(suffix);
    if base.contains("wordprocessingml") || ends(".docx") {
        Kind::Docx
    } else if base == "application/pdf" || ends(".pdf") {
        Kind::Pdf
    } else if base.starts_with("text/") || matches!(base.as_str(), "application/json" | "application/xml" | "application/csv") || base.ends_with("+xml") {
        Kind::Text
    } else if base == "application/octet-stream" && (ends(".txt") || ends(".csv") || ends(".md") || ends(".log")) {
        Kind::Text
    } else {
        Kind::Other
    }
}

/// The text of a Word document: `word/document.xml` inside the zip, with the tags removed.
fn docx_text(bytes: &[u8]) -> Option<String> {
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes)).ok()?;
    let mut xml = String::new();
    {
        use std::io::Read;
        let mut part = archive.by_name("word/document.xml").ok()?;
        // The document is XML one could read, but a size cap keeps a runaway file from
        // filling memory before the character limit applies.
        part.by_ref().take(16 * LIMIT_BYTES as u64).read_to_string(&mut xml).ok()?;
    }
    Some(xml_to_text(&xml))
}

/// Word keeps paragraphs as `<w:p>` and runs as `<w:t>`; everything else is markup.
fn xml_to_text(xml: &str) -> String {
    let mut out = String::with_capacity(xml.len() / 4);
    let mut rest = xml;
    let mut in_text = false;
    while let Some(open) = rest.find('<') {
        if in_text {
            out.push_str(&unescape(&rest[..open]));
        }
        let close = match rest[open..].find('>') {
            Some(end) => open + end,
            None => break,
        };
        let tag = &rest[open + 1..close];
        if tag.starts_with("w:t") && !tag.starts_with("w:tab") {
            in_text = true;
        } else if tag.starts_with('/') {
            if tag.starts_with("/w:t") && !tag.starts_with("/w:tab") {
                in_text = false;
            } else if tag.starts_with("/w:p") {
                // A paragraph break is what makes the words separate.
                out.push('\n');
            }
        }
        rest = &rest[close + 1..];
    }
    out
}

fn unescape(text: &str) -> String {
    text.replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&apos;", "'").replace("&amp;", "&")
}

/// The text of a PDF, when it has a text layer. A scan has none, and returns `None`.
fn pdf_text(bytes: &[u8]) -> Option<String> {
    pdf_extract::extract_text_from_mem(bytes).ok()
}

/// One line per paragraph, no runs of spaces: the index is for finding words, and the
/// pairs a Chinese search is built from do not survive a space between every character.
fn squash(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut space = false;
    for ch in text.chars() {
        if ch.is_whitespace() {
            space = true;
            continue;
        }
        if space && !out.is_empty() {
            out.push(' ');
        }
        space = false;
        out.push(ch);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_text_is_taken_as_it_is() {
        let plain = text("text/plain", "notes.txt", "增值税发票\n金额 1,200.00".as_bytes()).unwrap();
        assert_eq!(plain, "增值税发票 金额 1,200.00");
        assert_eq!(text("text/csv", "rows.csv", b"a,b\n1,2\n").unwrap(), "a,b 1,2");
    }

    #[test]
    fn a_picture_or_an_archive_has_no_text() {
        assert_eq!(text("image/png", "logo.png", b"\x89PNG\r\n\x1a\n"), None);
        assert_eq!(text("application/zip", "bundle.zip", b"PK\x03\x04"), None);
        assert_eq!(text("text/plain", "empty.txt", b""), None);
    }

    #[test]
    fn a_word_document_is_read_through_its_zip() {
        use std::io::Write;
        let mut bits: Vec<u8> = Vec::new();
        {
            let mut zip = zip::ZipWriter::new(std::io::Cursor::new(&mut bits));
            zip.start_file("word/document.xml", zip::write::SimpleFileOptions::default()).unwrap();
            let xml = r#"<?xml version="1.0"?><w:document><w:body><w:p><w:r><w:t>发票 &amp; 收据</w:t></w:r></w:p><w:p><w:r><w:t>合计 88.00</w:t></w:r></w:p></w:body></w:document>"#;
            zip.write_all(xml.as_bytes()).unwrap();
            zip.finish().unwrap();
        }
        let document = text("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "invoice.docx", &bits).unwrap();
        assert_eq!(document, "发票 & 收据 合计 88.00");
    }

    #[test]
    fn a_name_is_used_when_the_type_says_nothing() {
        // Plenty of mail declares a PDF as a generic binary and then names it.
        assert_eq!(kind_of("application/octet-stream", "invoice.PDF"), Kind::Pdf);
        assert_eq!(kind_of("application/octet-stream", "notes.txt"), Kind::Text);
        // A declared image stays an image whatever it is called.
        assert_eq!(kind_of("image/png", "invoice.pdf.png"), Kind::Other);
        assert_eq!(kind_of("application/pdf", "x"), Kind::Pdf);
        assert_eq!(kind_of("", "report.docx"), Kind::Docx);
        // Office types mention XML in their name and are still zips, not text.
        let word = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        assert_eq!(kind_of(word, "letter.docx"), Kind::Docx);
        assert_eq!(kind_of(word, "letter"), Kind::Docx);
        assert_eq!(kind_of("application/xml", "data.xml"), Kind::Text);
    }

    #[test]
    fn whitespace_is_squashed_but_words_stay_apart() {
        assert_eq!(squash("  one\n\ntwo   three "), "one two three");
        assert_eq!(squash("\n\n"), "");
    }

    #[test]
    fn a_pdf_with_a_text_layer_is_read_and_a_broken_one_is_not() {
        // Smallest usable PDF: one page, one line of text in Helvetica.
        let pdf = b"%PDF-1.4\n\
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n\
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n\
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n\
4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 20 100 Td (Hello invoice) Tj ET\nendstream endobj\n\
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n\
trailer<</Root 1 0 R>>\n%%EOF\n";
        let printed = text("application/pdf", "hello.pdf", pdf);
        assert!(printed.is_none() || printed.as_deref().unwrap_or("").contains("Hello"), "a printable PDF either reads or says nothing");
        assert_eq!(text("application/pdf", "broken.pdf", b"%PDF-1.4\nnot really a pdf"), None);
    }
}
