---
name: tap
description: Install, bind, and write verbatim content to TapVoices mobile via tap CLI.
---

# TapVoices (tap)

Use when the user asks to **install TapVoices**, **bind Device ID**, or **write / push content to TapVoices**.

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

Do **not** ask the user to run separate `bind` / `write` commands in Terminal — run everything in the integrated shell.

## Write (after bind)

User must explicitly request a write. Run:

```bash
npx tapvoices write --text "<verbatim user-specified content>" --source-app cursor
```

Use `codex` or `claude-code` for `--source-app` when appropriate.

## Rules

1. Only write when the user clearly requests it.
2. Write exactly what the user specified — never default to last chat turn.
3. If scope is unclear, ask once; do not guess.

For write contract details, see **`/tap-write`**.
