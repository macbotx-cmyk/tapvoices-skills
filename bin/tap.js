#!/usr/bin/env node
'use strict';

const { runCli } = require('../lib/cli');

runCli(process.argv.slice(2)).catch((err) => {
  const message = err && err.message ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(typeof err.code === 'number' ? err.code : 1);
});
