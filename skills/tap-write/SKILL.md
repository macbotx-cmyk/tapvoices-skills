---
name: tap-write
description: Write user-specified verbatim text to TapVoices via tap CLI (Agent inbox).
---

# Tap Write

Execute **only** when the user explicitly wants content sent **to TapVoices**.

## Hard constraints

- **No default bundle.** Forbidden: last agent turn, visible chat, unstated files, auto diff.
- **Empty scope → fail.** If nothing is specified, do **not** call write; ask what to send.
- **Verbatim UTF-8** in `--text` or `--file` the user pointed to.
- **Every push requires:** `--label` (display title) + **summary** (headline + bullets). Write summary **before** calling CLI — navigation digest for phone Query, not a substitute for verbatim `text`.

## CLI

```bash
npx tapvoices doctor --json
npx tapvoices write --text "ONLY_USER_SPECIFIED_CONTENT" \
  --label "cli-guide.md" \
  --summary-headline "TapVoices CLI install and bind" \
  --summary-bullets "install|bind|read inbox|sent" \
  --source-app cursor
npx tapvoices write --file ./path/user/named \
  --label "title" \
  --summary-json '{"headline":"One-line digest","bullets":["point 1","point 2"]}' \
  --source-app codex
# Optional: link to prior mail
npx tapvoices write --text "..." --label "..." --summary-headline "..." --summary-bullets "..." --ref-mail in_6
```

## source-app

`cursor`, `claude-code`, `codex`, or `ide`.

## After write

- Report CLI JSON `{ "ok": true, "kind": "inbox", "id": ... }`.
- Phone **auto-syncs** inbox (no Apply). Mail appears in **Live Voice → Agent Mail** list.

## Read (when user asks — see `/tap`)

```bash
npx tapvoices read inbox --latest --json
npx tapvoices read sent --latest --json
```

## Examples

**User:** 「把选中的代码发到 TapVoices」
→ Read selection only → write with label + summary you author from that content.

**User:** 「发到 TapVoices」（无内容）
→ Ask what to send; **do not** write chat log.

**User:** 「读 TapVoices 里最新文档」
→ `npx tapvoices read inbox --latest --json`
