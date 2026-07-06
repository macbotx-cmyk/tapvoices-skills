'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const CONFIG_DIR = path.join(os.homedir(), '.tapvoices');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
/** Vercel redirects apex → www; CLI uses www to avoid 307. iOS App unchanged. */
const DEFAULT_API_BASE = 'https://www.tapvoices.com';

function normalizeApiBase(base) {
  const trimmed = String(base || '').trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_API_BASE;
  if (trimmed === 'https://tapvoices.com' || trimmed === 'http://tapvoices.com') {
    return DEFAULT_API_BASE;
  }
  return trimmed;
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveConfig(config) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function apiBase(config) {
  const base = config.apiBase || process.env.TAPVOICES_API_BASE || DEFAULT_API_BASE;
  return normalizeApiBase(base);
}

function hasToken(config) {
  return Boolean((config.token || process.env.TAPVOICES_TOKEN || '').trim());
}

function requireToken(config) {
  const token = (config.token || process.env.TAPVOICES_TOKEN || '').trim();
  if (!token) {
    const err = new Error(
      '未绑定 Device ID。请运行: npx tapvoices bind（或在 Agent 里发送 Device ID 后执行 npx tapvoices bind --device-id "..."）'
    );
    err.code = 2;
    throw err;
  }
  return token;
}

module.exports = {
  CONFIG_DIR,
  CONFIG_PATH,
  DEFAULT_API_BASE,
  loadConfig,
  saveConfig,
  apiBase,
  normalizeApiBase,
  hasToken,
  requireToken,
};
