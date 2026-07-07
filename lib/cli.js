'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { requestJson } = require('./http');
const { installSkills } = require('./install');
const {
  CONFIG_PATH,
  loadConfig,
  saveConfig,
  apiBase,
  normalizeApiBase,
  hasToken,
  requireToken,
} = require('./config');

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      flags.help = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }
    positional.push(arg);
  }
  return { positional, flags };
}

function promptLine(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function registerDeviceId(config, deviceId) {
  const trimmed = String(deviceId || '').trim();
  if (!trimmed) {
    throw new Error('Device ID 不能为空');
  }
  const base = apiBase(config);
  const resp = await requestJson(`${base}/api/app/register`, {
    method: 'POST',
    body: { deviceId: trimmed },
  });
  if (resp.code !== 0 || !resp.data || !resp.data.token) {
    throw new Error(resp.message || 'register failed');
  }
  config.token = resp.data.token;
  saveConfig(config);
  return { deviceId: trimmed, userId: resp.data.userId };
}

async function cmdBind(flags) {
  const config = loadConfig();
  if (flags['api-base']) {
    config.apiBase = normalizeApiBase(String(flags['api-base']).trim());
  } else {
    config.apiBase = apiBase(config);
  }

  let deviceId = flags['device-id'] ? String(flags['device-id']).trim() : '';
  if (!deviceId && process.stdin.isTTY) {
    process.stdout.write('\nTapVoices · 绑定 iPhone\n');
    process.stdout.write('打开 TapVoices → Device（手机图标）→ 复制 Device ID\n\n');
    deviceId = await promptLine('Device ID: ');
  }
  if (!deviceId) {
    throw new Error('请提供 Device ID：npx tapvoices bind --device-id "<UUID>"');
  }

  const result = await registerDeviceId(config, deviceId);
  process.stdout.write(`\n✓ 已绑定 Device ID\n`);
  process.stdout.write(`✓ API: ${apiBase(config)}\n`);
  process.stdout.write(`✓ 配置: ${CONFIG_PATH}\n`);
  if (result.userId != null) {
    process.stdout.write(`✓ userId: ${result.userId}\n`);
  }
  process.stdout.write('\n下一步：在 Agent 里说「把 XXX 原样写到 TapVoices」\n');
  process.stdout.write('手机：切后台再切回 App，上滑 query 可引用写入内容。\n\n');
}

async function cmdAuth(flags) {
  await cmdBind(flags);
}

async function cmdInstall(flags) {
  process.stdout.write('TapVoices · 安装 Agent Skills（Cursor / Codex / Claude Code）\n');
  process.stdout.write('（非交互模式，依次安装到各 Agent…）\n\n');
  const { installed, failed } = await installSkills();

  process.stdout.write(`✓ 已安装: ${installed.join(', ')}\n`);
  if (failed.length > 0) {
    process.stdout.write(`⚠ 跳过: ${failed.map((f) => f.agent).join(', ')}\n`);
  }

  const config = loadConfig();
  config.apiBase = apiBase(config);

  if (hasToken(config)) {
    process.stdout.write('\n✓ 本机已绑定 Device ID\n');
    process.stdout.write('在 Agent 里说「把 XXX 原样写到 TapVoices」即可，无需再跑其它命令。\n\n');
    return;
  }

  let deviceId = flags['device-id'] ? String(flags['device-id']).trim() : '';
  if (!deviceId && process.stdin.isTTY) {
    process.stdout.write('\n绑定 iPhone（一次性）\n');
    process.stdout.write('打开 TapVoices → Device（手机图标）→ 复制 Device ID\n\n');
    deviceId = await promptLine('Device ID（直接回车可稍后在 Agent 里绑定）: ');
  }

  if (deviceId) {
    const result = await registerDeviceId(config, deviceId);
    process.stdout.write('\n✓ 已绑定 Device ID\n');
    process.stdout.write(`✓ API: ${apiBase(config)}\n`);
    if (result.userId != null) {
      process.stdout.write(`✓ userId: ${result.userId}\n`);
    }
    process.stdout.write('\n在 Agent 里说「把 XXX 原样写到 TapVoices」即可。\n\n');
    return;
  }

  process.stdout.write('\nSkills 已装好。绑定 Device ID 后 Agent 才能写入手机：\n');
  process.stdout.write('  npx tapvoices bind\n');
  process.stdout.write('或在 Agent 里发送 Device ID 后让它执行:\n');
  process.stdout.write('  npx tapvoices bind --device-id "<Device-ID>"\n\n');
}

async function readWriteText(flags, positional) {
  if (flags.text !== undefined) {
    if (flags.text === true) {
      const err = new Error(
        'No content to write. Provide --text "..." , --file, or pipe stdin. Refusing to guess content (AC-NO-SCOPE).'
      );
      err.code = 2;
      throw err;
    }
    const text = String(flags.text);
    if (!text.trim()) {
      const err = new Error(
        'No content to write. Provide non-empty --text, --file, or pipe stdin. Refusing to guess content (AC-NO-SCOPE).'
      );
      err.code = 2;
      throw err;
    }
    return text;
  }
  if (flags.file) {
    const filePath = path.resolve(String(flags.file));
    const text = fs.readFileSync(filePath, 'utf8');
    if (!text.trim()) {
      throw new Error(`File is empty: ${filePath}`);
    }
    return text;
  }
  if (positional.length > 0) {
    throw new Error('Unexpected positional args. Use --text or --file, or pipe stdin.');
  }
  if (process.stdin.isTTY) {
    const err = new Error(
      'No content to write. Provide --text, --file, or pipe stdin. Refusing to guess content (AC-NO-SCOPE).'
    );
    err.code = 2;
    throw err;
  }
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) {
    const err = new Error('stdin is empty. Refusing to write (AC-NO-SCOPE).');
    err.code = 2;
    throw err;
  }
  return text;
}

async function cmdWrite(flags, positional) {
  const config = loadConfig();
  const token = requireToken(config);
  const text = await readWriteText(flags, positional);
  const body = { text };
  if (flags.label) body.label = String(flags.label);
  if (flags['source-app']) body.sourceApp = String(flags['source-app']);

  const resp = await requestJson(`${apiBase(config)}/api/app/handoff/push`, {
    method: 'POST',
    token,
    body,
  });
  if (resp.code !== 0) {
    throw new Error(resp.message || 'push failed');
  }
  const id = resp.data && resp.data.id;
  const kind = (resp.data && resp.data.kind) || 'inbox';
  process.stdout.write(JSON.stringify({ ok: true, kind, id, queued: true }, null, 0));
  process.stdout.write('\n');
}

async function mailGet(config, token, path) {
  const resp = await requestJson(`${apiBase(config)}${path}`, {
    method: 'GET',
    token,
  });
  if (resp.code !== 0) {
    throw new Error(resp.message || 'read failed');
  }
  return resp.data;
}

async function cmdRead(flags, positional) {
  const config = loadConfig();
  const token = requireToken(config);
  const mailbox = positional[0];
  if (!mailbox || !['inbox', 'sent'].includes(mailbox)) {
    const err = new Error('Usage: tapvoices read inbox|sent [--latest|--id ID]');
    err.code = 2;
    throw err;
  }
  const sub = flags.latest ? 'latest' : flags.id ? String(flags.id) : 'latest';
  const path = sub === 'latest'
    ? `/api/app/mail/${mailbox}/latest`
    : `/api/app/mail/${mailbox}/${encodeURIComponent(sub)}`;
  const data = await mailGet(config, token, path);
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(data)}\n`);
}

async function cmdShow(flags, positional) {
  const config = loadConfig();
  const token = requireToken(config);
  const mailbox = positional[0];
  const id = positional[1] || flags.id;
  if (!mailbox || !['inbox', 'sent'].includes(mailbox) || !id) {
    const err = new Error('Usage: tapvoices show inbox|sent <id>');
    err.code = 2;
    throw err;
  }
  const data = await mailGet(config, token, `/api/app/mail/${mailbox}/${encodeURIComponent(String(id))}`);
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(data)}\n`);
}

async function cmdDoctor(flags) {
  const config = loadConfig();
  const bound = hasToken(config);
  const out = {
    ok: bound,
    configPath: CONFIG_PATH,
    apiBase: apiBase(config),
    bound,
    hasToken: bound,
    node: process.version,
  };
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    return;
  }
  process.stdout.write(`config: ${CONFIG_PATH}\n`);
  process.stdout.write(`apiBase: ${out.apiBase}\n`);
  process.stdout.write(`bound: ${bound ? 'yes' : 'no (run: npx tapvoices bind)'}\n`);
}

function printHelp() {
  process.stdout.write(`TapVoices — write to and read from TapVoices (Agent Mail)

Usage:
  tapvoices install [--device-id ID]     Install skills; bind iPhone in same step if ID given
  tapvoices bind [--device-id ID]       Bind iPhone Device ID (interactive if omitted)
  tapvoices write --text "..." [--label LABEL] [--source-app cursor|codex|claude-code|ide]
  tapvoices write --file path/to/file
  echo "..." | tapvoices write
  tapvoices read inbox|sent [--latest] [--id ID] [--json]
  tapvoices show inbox|sent <id> [--json]
  tapvoices doctor [--json]

Legacy:
  tapvoices auth                        Alias for tapvoices bind
  tap ...                               Alias for tapvoices (same CLI)

Environment:
  TAPVOICES_TOKEN                 JWT (overrides config)
  TAPVOICES_API_BASE              API root (default https://www.tapvoices.com)

Config: ~/.tapvoices/config.json

Cursor first-time (one command on tapvoices.com):
  npx tapvoices install

If the user pastes Device ID in chat, run once:
  npx tapvoices install --device-id "<UUID>"
`);
}

async function runCli(argv) {
  const { positional, flags } = parseArgs(argv);
  if (flags.help || positional.length === 0) {
    printHelp();
    return;
  }
  const cmd = positional[0];
  const rest = positional.slice(1);
  switch (cmd) {
    case 'install':
      await cmdInstall(flags);
      break;
    case 'bind':
      await cmdBind(flags);
      break;
    case 'auth':
      await cmdAuth(flags);
      break;
    case 'write':
      await cmdWrite(flags, rest);
      break;
    case 'read':
      await cmdRead(flags, rest);
      break;
    case 'show':
      await cmdShow(flags, rest);
      break;
    case 'doctor':
      await cmdDoctor(flags);
      break;
    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
}

module.exports = { runCli, loadConfig, saveConfig, CONFIG_PATH };
