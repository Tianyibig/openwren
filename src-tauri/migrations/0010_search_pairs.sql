-- Chinese, Japanese and Korean text is now indexed as overlapping pairs of characters,
-- so a word inside a sentence written without spaces can be found (see src/cjk.rs).
-- What the table holds was written by the old scheme and cannot be rewritten in SQL;
-- it is rebuilt from the messages and bodies already on disk on the next start
-- (store.rs, reindex_search).
DELETE FROM search_index;
