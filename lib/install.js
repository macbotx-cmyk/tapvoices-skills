'use strict';

const path = require('path');
const { spawn } = require('child_process');

const SKILLS_ROOT = path.join(__dirname, '..', 'skills');
const DEFAULT_AGENTS = ['cursor', 'claude-code', 'codex'];

function gitCloneFriendlyEnv() {
  return {
    ...process.env,
    GIT_CLONE_PROTECTION_ACTIVE: '0',
    GIT_HTTP_VERSION: process.env.GIT_HTTP_VERSION || 'HTTP/1.1',
  };
}

function runSkillsAdd(skillsPath, agent) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['skills', 'add', skillsPath, '--agent', agent, '-y', '-g'],
      {
        env: gitCloneFriendlyEnv(),
        stdio: 'inherit',
      }
    );
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ agent, ok: true });
      else reject(new Error(`skills add failed for ${agent} (exit ${code})`));
    });
  });
}

async function installSkills({ agents = DEFAULT_AGENTS, skillsPath = SKILLS_ROOT } = {}) {
  const installed = [];
  const failed = [];

  for (const agent of agents) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await runSkillsAdd(skillsPath, agent);
      installed.push(agent);
    } catch (err) {
      failed.push({ agent, message: err.message });
    }
  }

  if (installed.length === 0) {
    const detail = failed.map((f) => `${f.agent}: ${f.message}`).join('; ');
    throw new Error(`未能安装 Skill 到任何 Agent。${detail}`);
  }

  return { installed, failed, skillsPath };
}

module.exports = { installSkills, SKILLS_ROOT, DEFAULT_AGENTS };
