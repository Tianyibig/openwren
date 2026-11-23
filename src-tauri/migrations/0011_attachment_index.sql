-- Attachment text, so a search can reach inside a document the mail carried.
--
-- There is no separate "indexed" flag: a row here means the text was taken out and
-- stored, and an attachment without a row has either not been looked at yet or held
-- nothing searchable (a picture, an archive). The tokens are the same overlapping pairs
-- the message index uses (see src/cjk.rs), so one search string matches both.
--
-- Not a contentless table: re-syncing a message deletes and re-inserts its attachments,
-- and a contentless FTS5 table can only delete a row by being told the text again.

CREATE VIRTUAL TABLE attachment_index USING fts5(text);
