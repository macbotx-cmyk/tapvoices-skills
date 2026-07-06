# TapVoices CLI & Agent Skills

Push verbatim text from your coding agent (Cursor, Claude Code, Codex) to **TapVoices** on iPhone — voice-first, no long reading on a small screen.

**Website:** [www.tapvoices.com](https://www.tapvoices.com)

## Install (one command)

```bash
npx tapvoices install
```

Installs `tap` + `tap-write` skills to **Cursor, Claude Code, and Codex** non-interactively. No need to run `npx skills add` separately.

With Device ID from **TapVoices app → Device** (phone icon), bind in the same step:

```bash
npx tapvoices install --device-id "<Device-ID>"
```

**Self-check only** (after install):

```bash
npx tapvoices doctor --json
```

Alternative (manual skills install from GitHub; if clone fails, prefix `GIT_HTTP_VERSION=HTTP/1.1`):

```bash
GIT_HTTP_VERSION=HTTP/1.1 npx skills add macbotx-cmyk/tapvoices-skills -y
```

## Write from your agent

After bind, ask your agent explicitly, for example:

> Write this selection to TapVoices verbatim.

The agent runs:

```bash
npx tapvoices write --text "user-specified content" --source-app cursor
```

**Rules:** only write when the user asks; never auto-push chat logs or unstated files.

## Commands

| Command | Description |
|---------|-------------|
| `tapvoices install` | Install agent skills + optional Device ID bind |
| `tapvoices bind` | Bind iPhone Device ID |
| `tapvoices write` | Push text to phone Handoff queue |
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
