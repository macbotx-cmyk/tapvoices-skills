---
name: tap-write
description: Write user-specified verbatim text to TapVoices via tap CLI (Agent inbox).
---

# Tap Write

Execute **only** when the user explicitly wants content sent **to TapVoices**.

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

- Report CLI JSON `{ "ok": true, "kind": "inbox", "id": ... }`.
- Tell user: open TapVoices on iPhone → **Apply** pending → content appears in **Agent inbox** (not mixed into Record timeline).

## Read (when user asks — see `/tap`)

```bash
npx tapvoices read inbox --latest --json
npx tapvoices read sent --latest --json
```

Read inbox or sent **as the user specifies**; they are peer mailboxes.

## Examples

**User:** 「把选中的代码发到 TapVoices」
→ Read selection only → `npx tapvoices write --text "..."`

**User:** 「发到 TapVoices」（无内容）
→ Ask what to send; **do not** write chat log

**User:** 「读 TapVoices 里最新文档」
→ `npx tapvoices read inbox --latest --json`

**User:** 「读我在手机上回的反馈」
→ `npx tapvoices read sent --latest --json`
