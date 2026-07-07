# TapVoices CLI & Agent Skills

Send and read content between your coding agent (Cursor, Claude Code, Codex) and **TapVoices** on iPhone — Agent Mail: Agent inbox + your sent replies.

**Website:** [www.tapvoices.com](https://www.tapvoices.com)

## Install (one command)

```bash
npx tapvoices install
```

Installs `tap` + `tap-write` skills to **Cursor, Claude Code, and Codex** non-interactively.

With Device ID from **TapVoices app → Device** (phone icon), bind in the same step:

```bash
npx tapvoices install --device-id "<Device-ID>"
```

**Self-check only** (after install):

```bash
npx tapvoices doctor --json
```

Alternative (manual skills install from GitHub):

```bash
GIT_HTTP_VERSION=HTTP/1.1 npx skills add macbotx-cmyk/tapvoices-skills -y
```

## Write to TapVoices

After bind, when the user explicitly asks to send content:

```bash
npx tapvoices write --text "user-specified content" \
  --label "title" \
  --summary-headline "One-line digest" \
  --summary-bullets "point 1|point 2" \
  --source-app cursor
```

Response includes `"kind": "inbox"`. Phone auto-syncs to **Agent Mail** (no Apply).

**Rules:** only write when the user asks; never auto-push chat logs or unstated files. **`--label` and summary are required.**

## Read from TapVoices

When the user asks to read TapVoices content (no fixed order — inbox and sent are peer mailboxes):

```bash
npx tapvoices read inbox --latest --json
npx tapvoices read sent --latest --json
npx tapvoices show inbox in_101
npx tapvoices show sent se_201
```

- **`read inbox`** → latest Agent message (`kind: inbox`, field `text`)
- **`read sent`** → latest user reply (`kind: sent`, fields `summary` + `notes`)

Requires Agent Mail API on the server (deploy before use).

## Commands

| Command | Description |
|---------|-------------|
| `tapvoices install` | Install agent skills + optional Device ID bind |
| `tapvoices bind` | Bind iPhone Device ID |
| `tapvoices write` | Send text to TapVoices (Agent inbox) |
| `tapvoices read inbox\|sent` | Read latest or `--id` |
| `tapvoices show inbox\|sent <id>` | Read one message by id |
| `tapvoices doctor` | Check local config |

Legacy alias: `tap` (same CLI).

Config: `~/.tapvoices/config.json` · Default API: `https://www.tapvoices.com`

## Develop locally

```bash
git clone https://github.com/macbotx-cmyk/tapvoices-skills.git
cd tapvoices-skills
npm link
npx tapvoices install
```

Publish: `npm publish` (maintainers only).

## License

MIT — see [LICENSE](LICENSE).
