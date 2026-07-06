---
name: tap-write
description: Write user-specified verbatim text to TapVoices via tap CLI (Handoff push).
---

# Tap Write

Execute **only** when the user explicitly wants content written to TapVoices.

## Hard constraints

- **No default bundle.** Forbidden: last agent turn, visible chat, unstated files, auto diff.
- **Empty scope → fail.** If nothing is specified, do **not** call write; ask what to write.
- **Verbatim UTF-8** in `--text` or `--file` the user pointed to.

## CLI

```bash
npx tapvoices doctor --json
npx tapvoices write --text "ONLY_USER_SPECIFIED_CONTENT" --source-app cursor
npx tapvoices write --file ./path/user/named --label "title" --source-app codex
cat file | npx tapvoices write --source-app claude-code
```

## source-app

`cursor`, `claude-code`, `codex`, or `ide`.

## After write

- Report CLI JSON `{ "ok": true, "id": ... }`.
- Tell user: foreground TapVoices on iPhone (background → foreground), then swipe **query** — main screen does not show push text (by design).

## Examples

**User:** 「把选中的代码写到 TapVoices」
→ Read selection only → `npx tapvoices write --text "..."`

**User:** 「写到 TapVoices」（无内容）
→ Ask what to write; **do not** write chat log
