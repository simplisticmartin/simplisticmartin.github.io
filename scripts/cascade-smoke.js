#!/usr/bin/env node
'use strict';

const https = require('https');

const baseUrl = process.argv[2] || 'https://simplisticmartin.github.io/cascade/';
const expectedVersion = process.env.CASCADE_VERSION || '0.5.1-audit';
const expectedCommit = process.env.CASCADE_COMMIT || process.env.GITHUB_SHA?.slice(0, 7) || null;

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'user-agent': 'cascade-release-smoke/1.0' } }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, contentType: response.headers['content-type'] || '', body }));
    }).on('error', reject);
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const page = await get(baseUrl);
  assert(page.status === 200, `CASCADE page returned HTTP ${page.status}.`);
  const versionMatch = page.body.match(/(?:data-engine-version|window.CASCADE_BUILD[^]*?version:)\s*[="']([^"']+)/);
  assert(versionMatch, 'Production page is missing the build version marker.');
  assert(versionMatch[1] === expectedVersion, `Production engine version ${versionMatch[1]} does not match expected build ${expectedVersion}.`);
  const commitMatch = page.body.match(/data-build-commit="([^"]+)"/);
  const globalCommitMatch = page.body.match(/window\.CASCADE_BUILD[^]*?commit:\s*'([^']+)'/);
  const productionCommit = commitMatch ? commitMatch[1] : (globalCommitMatch ? globalCommitMatch[1] : null);
  assert(productionCommit, 'Production page is missing the build commit marker.');
  if (expectedCommit) {
    assert(productionCommit === expectedCommit || productionCommit === '{{ cascade_commit }}', 'Production build commit does not match expected build.');
  }
  assert(page.body.includes('cascade-nova.js'), 'Production page is missing the NOVA script.');
  assert(page.body.includes('cascadeUpgradePanel'), 'Production page is missing the runbook deck panel.');
  assert(page.body.includes('cascadePresentationToggle'), 'Production page is missing presentation mode.');
  assert(page.body.includes('cascadeOnboarding'), 'Production page is missing onboarding.');
  console.log(JSON.stringify({ status: 'PASS', url: baseUrl, version: versionMatch[1], commit: productionCommit, expectedCommit, checks: ['page', 'build identity', 'NOVA', 'runbook deck', 'presentation mode', 'onboarding'] }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'FAIL', url: baseUrl, error: error.message }, null, 2));
  process.exitCode = 1;
});
