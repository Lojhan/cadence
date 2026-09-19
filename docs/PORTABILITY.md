# Portable archives

Full exports use archive version 2. Imports accept versions 1 and 2. An older
Cadence release that only supports version 1 must be upgraded before importing
a full version 2 archive. Individual-song exports remain version 1.

Both versions include preferences and personal songs, original chart text, and
supported personal-song progress. Import creates new personal-song IDs, remaps
the last selected personal song, and restores its position against the imported
chart. Existing personal songs are retained. Preferences are replaced by the
archive values in the same transaction.

Version 2 adds `catalogPositions`: the stable catalog song ID, its ordered chord
sequence, index, and completion flag. Catalog content is not replaced by an
archive. A position is restored only when the destination has that catalog ID
with exactly the same sequence. Missing or changed catalog entries are skipped,
preserving any destination progress; a last-selected catalog ID that is no longer
available falls back to the default progression. Personal-song IDs in this list
cannot overwrite personal progress.

Position indices must be within their archived sequence. Duplicate personal-song
keys or catalog-position references invalidate the archive. Any validation or
write failure rolls back the entire import, including songs, positions and
preferences. Position writes use the destination's revision, not an archived
user/database revision. Catalog progress is exported only when it belongs to the
currently installed song revision.

Archives contain no credentials, provider identity IDs, payment identifiers,
raw audio, or browser-specific microphone IDs. They are limited to 10 MB and
validated again on the server.
