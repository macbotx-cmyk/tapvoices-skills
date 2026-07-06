'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');

const MAX_REDIRECTS = 5;
const REDIRECT_STATUS = new Set([301, 302, 307, 308]);

function requestJson(urlString, { method = 'GET', token, body } = {}, redirectCount = 0) {
  const url = new URL(urlString);
  const payload = body ? JSON.stringify(body) : null;
  const headers = {
    Accept: 'application/json',
  };
  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(payload);
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-App-Authorization'] = `Bearer ${token}`;
  }

  const lib = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        method,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        headers,
      },
      (res) => {
        if (REDIRECT_STATUS.has(res.statusCode) && res.headers.location) {
          if (redirectCount >= MAX_REDIRECTS) {
            reject(new Error('Too many redirects'));
            return;
          }
          res.resume();
          const nextUrl = new URL(res.headers.location, urlString).href;
          requestJson(nextUrl, { method, token, body }, redirectCount + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            reject(new Error(`Invalid JSON (${res.statusCode}): ${raw.slice(0, 200)}`));
            return;
          }
          if (res.statusCode === 401) {
            reject(new Error(parsed.message || 'Unauthorized (401)'));
            return;
          }
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(parsed.message || `HTTP ${res.statusCode}`));
            return;
          }
          resolve(parsed);
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = { requestJson };
