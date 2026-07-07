---
name: tap
description: Install, bind, write to, and read from TapVoices via tap CLI (Agent Mail).
---

# TapVoices (tap)

Use when the user asks to **install TapVoices**, **bind Device ID**, **write to TapVoices**, or **read from TapVoices**.

## Install (first time)

User says: 「帮我安装 TapVoices」

Run:

```bash
npx tapvoices install
```

If the user also provides Device ID (TapVoices app → Device icon), bind in the **same** command:

```bash
npx tapvoices install --device-id "<UUID>"
```

Do **not** ask the user to run separate commands in Terminal — run everything in the integrated shell.

## Write (after bind)

User must explicitly request sending content **to TapVoices**. Run:

```bash
npx tapvoices write --text "<verbatim user-specified content>" --source-app cursor
```

Use `codex` or `claude-code` for `--source-app` when appropriate.

Success JSON includes `"kind": "inbox"`. Tell the user to **Apply** on iPhone (Agent inbox).

## Read (when user asks)

**Inbox** and **sent** are peer mailboxes — read whichever the user asks for; **no default order**.

```bash
npx tapvoices read inbox --latest --json
npx tapvoices read sent --latest --json
npx tapvoices show inbox in_101
npx tapvoices show sent se_201
```

| Read | `kind` | Use |
|------|--------|-----|
| `read inbox` | `inbox` | Agent delivery — field `text` |
| `read sent` | `sent` | User reply — `summary` + `body` (`holds[]`, `queries[]`) |

Parse by `kind`; do not treat inbox and sent as the same shape.

## Rules

1. Only write when the user clearly requests it.
2. Write exactly what the user specified — never default to last chat turn.
3. Only read when the user clearly asks to read TapVoices (inbox, sent, or both).
4. If scope is unclear, ask once; do not guess.

For write contract details, see **`/tap-write`**.
