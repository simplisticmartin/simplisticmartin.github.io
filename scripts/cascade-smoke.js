#!/usr/bin/env node
'use strict';

const https = require('https');

const baseUrl = process.argv[2] || 'https://simplisticmartin.github.io/cascade/';
const expectedVersion = process.env.CASCADE_VERSION || '0.5.1-audit';
const expectedCommit = process.env.CASCADE_COMMIT || process.env.GITHUB_SHA?.slice(0, 7) || null;
const attempts = Math.max(1, Number.parseInt(process.env.CASCADE_SMOKE_ATTEMPTS || '1', 10) || 1);
const delayMs = Math.max(0, Number.parseInt(process.env.CASCADE_SMOKE_DELAY_MS || '0', 10) || 0);
const expectedManifestUrl = new URL('/assets/data/cascade-build.json', baseUrl).toString();

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

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function checkOnce() {
  const page = await get(baseUrl);
  assert(page.status === 200, `CASCADE page returned HTTP ${page.status}.`);

  const manifest = await get(expectedManifestUrl);
  assert(manifest.status === 200, `CASCADE build manifest returned HTTP ${manifest.status}.`);
  assert(/application\/json/i.test(manifest.contentType), `CASCADE build manifest returned ${manifest.contentType}, not JSON.`);
  let manifestJson;
  try {
    manifestJson = JSON.parse(manifest.body);
  } catch (error) {
    throw new Error(`CASCADE build manifest is not valid JSON: ${error.message}`);
  }
  assert(manifestJson.version === expectedVersion, `Production manifest version ${manifestJson.version} does not match expected build ${expectedVersion}.`);
  assert(Array.isArray(manifestJson.features) && manifestJson.features.includes('nova-local-analyst'), 'Production manifest is missing the NOVA feature contract.');
  assert(manifestJson.features.includes('runbook-deck'), 'Production manifest is missing the runbook deck feature contract.');

  const versionMatch = page.body.match(/(?:data-engine-version|window.CASCADE_BUILD[^]*?version:)\s*[="']([^"']+)/);
  assert(versionMatch, 'Production page is missing the build version marker.');
  assert(versionMatch[1] === expectedVersion, `Production engine version ${versionMatch[1]} does not match expected build ${expectedVersion}.`);

  const commitMatch = page.body.match(/data-build-commit="([^"]+)"/);
  const globalCommitMatch = page.body.match(/window\.CASCADE_BUILD[^]*?commit:\s*'([^']+)'/);
  const productionCommit = commitMatch ? commitMatch[1] : (globalCommitMatch ? globalCommitMatch[1] : null);
  assert(productionCommit, 'Production page is missing the build commit marker.');
  assert(/^[0-9a-f]{7}$/i.test(productionCommit), `Production build commit ${productionCommit} is not a seven-character revision.`);
  assert(manifestJson.commit === productionCommit, `Production page commit ${productionCommit} does not match manifest commit ${manifestJson.commit}.`);
  if (expectedCommit) assert(productionCommit === expectedCommit, `Production build commit ${productionCommit} does not match expected build ${expectedCommit}.`);

  assert(page.body.includes('cascade-nova.js'), 'Production page is missing the NOVA script.');
  assert(page.body.includes('cascadeUpgradePanel'), 'Production page is missing the runbook deck panel.');
  assert(page.body.includes('cascadePresentationToggle'), 'Production page is missing presentation mode.');
  assert(page.body.includes('cascadeOnboarding'), 'Production page is missing onboarding.');
  return { version: versionMatch[1], commit: productionCommit, manifestUrl: expectedManifestUrl };
}

async function main() {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await checkOnce();
      console.log(JSON.stringify({ status: 'PASS', url: baseUrl, ...result, expectedCommit, attempt, attempts, checks: ['page', 'build identity', 'manifest parity', 'NOVA', 'runbook deck', 'presentation mode', 'onboarding'] }, null, 2));
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts && delayMs > 0) await wait(delayMs);
    }
  }
  throw new Error(`${lastError ? lastError.message : 'Unknown production smoke failure'} (after ${attempts} attempt${attempts === 1 ? '' : 's'})`);
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'FAIL', url: baseUrl, expectedVersion, expectedCommit, attempts, error: error.message }, null, 2));
  process.exitCode = 1;
});
