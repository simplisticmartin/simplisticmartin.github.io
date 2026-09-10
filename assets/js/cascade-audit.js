#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Engine = require('./cascade-engine.js');
const Nova = require('./cascade-nova.js');

const ROOT = path.resolve(__dirname, '../..');
const args = new Set(process.argv.slice(2));
const reportPath = path.join(ROOT, 'cascade-audit-report.json');
const manifestPath = path.join(ROOT, '_data/cascade-build.json');
const publicManifestPath = path.join(ROOT, 'assets/data/cascade-build.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deepEqual(left, right) {
  return Engine.stableStringify(left) === Engine.stableStringify(right);
}

function hasAny(text, terms) {
  const value = String(text || '').toLowerCase();
  return terms.some((term) => value.includes(term.toLowerCase()));
}

function auditDeployment() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const publicManifest = JSON.parse(fs.readFileSync(publicManifestPath, 'utf8'));
  const worker = fs.readFileSync(path.join(ROOT, 'assets/js/cascade-worker.js'), 'utf8');
  const engineSource = fs.readFileSync(path.join(ROOT, 'assets/js/cascade-engine.js'), 'utf8');
  const page = fs.readFileSync(path.join(ROOT, 'cascade.html'), 'utf8');
  assert(manifest.version && manifest.commit && manifest.builtAt, 'Build manifest must include version, commit, and builtAt.');
  assert(publicManifest.version === manifest.version && publicManifest.commit === manifest.commit, 'Public and Jekyll build manifests must agree.');
  assert(page.includes(manifest.version) || page.includes('cascade_manifest.version'), 'CASCADE page must expose the manifest version.');
  assert(page.includes('data-build-commit="{{ cascade_commit }}"'), 'CASCADE page must expose the deploy-resolved commit expression.');
  assert(page.includes('site.github.build_revision'), 'CASCADE page must derive the build marker from the deployment revision.');
  assert(page.includes('window.CASCADE_BUILD'), 'CASCADE page must expose window.CASCADE_BUILD.');
  assert(page.includes('id="cascadeConsole"'), 'CASCADE page must expose the control-room anchor used by onboarding.');
  assert(worker.includes('cascade-engine.js'), 'Worker must import the shared engine.');
  assert(worker.includes('acceptsPayload'), 'Worker must reject stale generation messages.');
  assert(worker.includes('nextToken < runToken'), 'Worker must reject stale start messages.');
  assert(!engineSource.includes('correctAction'), 'Engine source must not restore an answer-key action field.');
  assert(!engineSource.includes('scenario.root'), 'Engine source must not expose or consume a hidden scenario root.');
  assert(manifest.version === Engine.VERSION, 'Build manifest version must match the shared engine.');
  assert(manifest.version === Nova.VERSION, 'Build manifest version must match NOVA.');
  assert(manifest.commit !== 'working-tree', 'Build manifest must not ship a placeholder commit.');
  return { version: manifest.version, commit: manifest.commit, builtAt: manifest.builtAt, productionUrl: manifest.productionUrl || null };
}

function runScripted(seed, build, mode = 'recruiter', actionSchedule, options = {}) {
  const run = Engine.createRun(seed, mode, build, Boolean(build && build.length));
  run.captureHistory = options.captureHistory !== false;
  run.hashSnapshots = options.hashSnapshots !== false;
  const snapshots = [];
  const schedule = Array.isArray(actionSchedule) ? actionSchedule.slice().sort((a, b) => a.at - b.at) : [
    { at: 2, action: 'inspect', target: 'gateway', actionId: `${seed}-inspect-gateway` },
    { at: 4, action: 'inspect', target: 'orders', actionId: `${seed}-inspect-orders` },
    { at: 8, action: 'circuit', target: 'gateway', actionId: `${seed}-circuit-gateway` },
    { at: 10, action: 'failover', target: 'postgres', actionId: `${seed}-failover-postgres` }
  ];
  let cursor = 0;
  for (let tick = 0; tick < Math.ceil(run.maxTime / Engine.TICK_SECONDS) + 1 && !run.complete; tick += 1) {
    const nextTime = run.stageTime + Engine.TICK_SECONDS;
    while (cursor < schedule.length && schedule[cursor].at <= nextTime + 1e-9) {
      while (run.stageTime < schedule[cursor].at - 1e-9 && !run.complete) Engine.advance(run, Engine.TICK_SECONDS);
      Engine.applyAction(run, schedule[cursor].action, schedule[cursor].target, schedule[cursor].actionId);
      cursor += 1;
    }
    if (!run.complete) snapshots.push(Engine.advance(run, Engine.TICK_SECONDS).snapshot);
  }
  return { run, snapshots, final: Engine.snapshot(run) };
}

function auditEngine() {
  const first = runScripted('8F31A', []);
  const second = runScripted('8F31A', []);
  assert(deepEqual(first.snapshots, second.snapshots), 'Same seed and action schedule must produce byte-stable snapshots.');
  assert(first.snapshots.every((snapshot) => snapshot.stateHash), 'Every snapshot must contain a state hash.');
  assert(!Object.prototype.hasOwnProperty.call(first.final.scenario, 'root'), 'Player snapshots must not expose the answer key.');
  assert(!Object.prototype.hasOwnProperty.call(first.final.scenario, 'rootCause'), 'Player snapshots must not expose the root cause.');
  assert(!Object.prototype.hasOwnProperty.call(first.final.scenario, 'correctAction'), 'Player snapshots must not expose a correct action.');
  assert(first.final.scenario.id === 'incident-1', 'Active incident identity must remain opaque.');
  assert(!first.final.scenario.code.includes(first.run.scenario.code), 'Active incident code must not mirror the internal template code.');
  assert(first.final.blastRadius >= 0, 'Blast radius must be defined by observable SLO impact.');

  const inspectRun = Engine.createRun('DBPOOL1', 'recruiter', []);
  const inspection = Engine.applyAction(inspectRun, 'inspect', 'pricing', 'inspect-once');
  const duplicate = Engine.applyAction(inspectRun, 'inspect', 'pricing', 'inspect-once');
  assert(inspection.accepted && duplicate.duplicate, 'Duplicate action IDs must be idempotently rejected.');
  const terminal = Engine.createRun('TERMINAL1', 'recruiter', []);
  for (let tick = 0; tick < Math.ceil(terminal.maxTime / Engine.TICK_SECONDS) + 1 && !terminal.complete; tick += 1) Engine.advance(terminal, Engine.TICK_SECONDS);
  assert(terminal.complete && terminal.stageTime === terminal.maxTime, 'A run must terminate exactly at its visible time budget.');

  const initial = Engine.snapshot(inspectRun);
  assert(initial.scenario && !Object.prototype.hasOwnProperty.call(initial.scenario, 'root'), 'Initial player scenario must begin with a symptom, not the root answer.');
  assert(!Object.prototype.hasOwnProperty.call(initial.scenario, 'target'), 'Initial player scenario must not expose an internal target.');
  assert(!Object.prototype.hasOwnProperty.call(initial.scenario, 'rootCause'), 'Initial player scenario must not expose root cause.');
  assert(initial.scenario.id === 'incident-1', 'Initial incident identity must remain opaque.');

  const actionRun = Engine.createRun('EDGE99', 'freeplay', []);
  const before = Engine.snapshot(actionRun);
  Engine.applyAction(actionRun, 'scale', 'gateway', 'scale-once');
  const afterScale = Engine.snapshot(actionRun);
  const gatewayBefore = before.services.find((service) => service.id === 'gateway');
  const gatewayAfter = afterScale.services.find((service) => service.id === 'gateway');
  assert(gatewayAfter.replicas === gatewayBefore.replicas + 2, 'Scale must add exactly two replicas once.');
  assert(gatewayAfter.capacity > gatewayBefore.capacity, 'Scale must increase capacity.');

  const circuitRun = Engine.createRun('DBPOOL1', 'freeplay', []);
  const pricingBefore = Engine.snapshot(circuitRun).edges.find((edge) => edge.from === 'orders' && edge.to === 'pricing');
  Engine.applyAction(circuitRun, 'circuit', 'pricing', 'circuit-once');
  const pricingAfter = Engine.snapshot(circuitRun).edges.find((edge) => edge.from === 'orders' && edge.to === 'pricing');
  assert(pricingAfter.requestRate < pricingBefore.requestRate, 'Circuit action must reduce downstream request rate.');

  const dbFixture = Engine.createRun('DB17', 'freeplay', []);
  dbFixture.scenario.primary = { ...Engine.INCIDENT_TEMPLATES.find((item) => item.id === 'db-exhaustion'), severity: 1 };
  for (let i = 0; i < 80; i += 1) Engine.advance(dbFixture, Engine.TICK_SECONDS);
  const postgres = Engine.snapshot(dbFixture).services.find((service) => service.id === 'postgres');
  assert(postgres.connectionUtilization > 92 || postgres.latency > postgres.latencySlo, 'Database exhaustion must damage PostgreSQL telemetry, not only Pricing.');

  const postmortemHashes = first.final.postmortem && first.final.postmortem.stateHashes;
  assert(Array.isArray(postmortemHashes) && postmortemHashes.length === first.run.history.length, 'Completed postmortems must carry the complete replay hash ledger.');
  assert(postmortemHashes[postmortemHashes.length - 1] === first.run.history[first.run.history.length - 1].stateHash, 'Final postmortem hash must equal the final replay frame.');
  return { deterministic: true, duplicateActions: true, stateHashes: first.snapshots.length, scaleCapacity: true, circuitPressure: true };
}

function auditActions() {
  Engine.ACTIONS.forEach((action) => {
    const run = Engine.createRun(`ACTION-${action}`, 'freeplay', []);
    const before = Engine.snapshot(run);
    const target = action === 'failover' ? 'postgres' : (action === 'circuit' ? 'pricing' : 'gateway');
    const result = Engine.applyAction(run, action, target, `once-${action}`);
    assert(result.accepted, `${action} must be accepted against a valid target.`);
    assert(result.snapshot && result.snapshot.services.every((service) => Number.isFinite(service.health)), `${action} must preserve finite telemetry.`);
    if (action === 'scale') {
      const beforeTarget = before.services.find((service) => service.id === target);
      const afterTarget = result.snapshot.services.find((service) => service.id === target);
      assert(afterTarget.capacity > beforeTarget.capacity, 'Scale must increase target capacity.');
    }
    const duplicate = Engine.applyAction(run, action, target, `once-${action}`);
    assert(duplicate.duplicate, `${action} duplicate IDs must be rejected.`);
  });
  const terminal = Engine.createRun('ACTION-AFTER-GAME', 'recruiter', []);
  for (let tick = 0; tick < Math.ceil(terminal.maxTime / Engine.TICK_SECONDS) + 1 && !terminal.complete; tick += 1) Engine.advance(terminal, Engine.TICK_SECONDS);
  const afterGame = Engine.applyAction(terminal, 'inspect', 'gateway', 'after-game');
  assert(!afterGame.accepted && afterGame.reason === 'complete', 'Actions must be disabled after an incident ends.');
  return { actions: Engine.ACTIONS.length, healthyTargets: true, afterGameDisabled: true };
}

function auditReplay() {
  const schedule = [
    { at: 2, action: 'inspect', target: 'gateway', actionId: 'replay-inspect' },
    { at: 7, action: 'scale', target: 'gateway', actionId: 'replay-scale' },
    { at: 12, action: 'circuit', target: 'pricing', actionId: 'replay-circuit' }
  ];
  const original = runScripted('REPLAY-GOLDEN', ['bulkhead', 'trace-sampling'], 'freeplay', schedule);
  const replayed = runScripted('REPLAY-GOLDEN', ['bulkhead', 'trace-sampling'], 'freeplay', schedule);
  assert(deepEqual(original.run.history, replayed.run.history), 'Replay history must be byte-stable for the same seed, build, and actions.');
  assert(original.run.history.length > 10, 'Replay must retain a useful timeline.');
  [0, Math.floor(original.run.history.length / 2), original.run.history.length - 1].forEach((index) => {
    const frame = Engine.replay(original.run, index);
    assert(frame && frame.stateHash === replayed.run.history[index].stateHash, `Replay frame ${index} must preserve its state hash.`);
  });
  assert(Engine.replay(original.run, -100).stateHash === original.run.history[0].stateHash, 'Replay must clamp before the first frame.');
  assert(Engine.replay(original.run, 999999).stateHash === original.run.history[original.run.history.length - 1].stateHash, 'Replay must clamp after the final frame.');
  return { stateHashes: original.run.history.filter((frame) => frame.stateHash).length, deterministic: true, clamped: true };
}

function auditGoldenRuns() {
  const golden = {
    'db-exhaustion': ['failover', 'postgres'],
    'edge-surge': ['scale', 'gateway'],
    'retry-regression': ['circuit', 'orders'],
    'cache-staleness': ['restart', 'cache'],
    'certificate-expiry': ['restart', 'auth'],
    'queue-backlog': ['scale', 'orders'],
    'memory-leak': ['restart', 'inventory'],
    'deployment-regression': ['rollback', 'pricing'],
    'region-degradation': ['failover', 'postgres'],
    'dns-flap': ['restart', 'gateway']
  };
  const results = {};
  Object.entries(golden).forEach(([incidentId, [action, target]]) => {
    const run = Engine.createRun(`GOLDEN-${incidentId}`, 'recruiter', []);
    const template = Engine.INCIDENT_TEMPLATES.find((item) => item.id === incidentId);
    run.scenario.primary = { ...template, severity: 1 };
    run.scenario.modifier = null;
    let dispatched = false;
    for (let tick = 0; tick < Math.ceil(run.maxTime / Engine.TICK_SECONDS) + 1 && !run.complete; tick += 1) {
      if (!dispatched && run.stageTime >= 8 - 1e-9) {
        const actionResult = Engine.applyAction(run, action, target, `golden-${incidentId}`);
        assert(actionResult.accepted, `${incidentId}: canonical mitigation action was rejected.`);
        dispatched = true;
      }
      Engine.advance(run, Engine.TICK_SECONDS);
    }
    assert(run.complete && run.success, `${incidentId}: canonical mitigation did not stabilize customer SLOs.`);
    assert(run.stageTime < run.maxTime, `${incidentId}: canonical mitigation only succeeded at the deadline.`);
    results[incidentId] = { action, target, success: true, resolutionSeconds: run.stageTime };
  });
  return { cases: Object.keys(golden).length, results, causalResolution: true };
}

function auditCards() {
  Engine.RUNBOOK_CARDS.forEach((card) => {
    ['id', 'targets', 'cost', 'charges', 'cooldown', 'duration', 'effect', 'sideEffects', 'prerequisites'].forEach((field) => assert(Object.prototype.hasOwnProperty.call(card, field), `Runbook card ${card.id} is missing ${field}.`));
  });
  const first = Engine.createRun('8F31A', 'freeplay', []);
  first.awaitingUpgrade = true;
  const offeredA = first.scenario ? Engine.snapshot(first).upgradeOptions : [];
  const second = Engine.createRun('8F31A', 'freeplay', []);
  second.awaitingUpgrade = true;
  const firstSnapshotState = (run, id) => Engine.snapshot(run).runbookStates.find((state) => state.id === id)?.status;
  const offeredB = Engine.snapshot(second).upgradeOptions;
  assert(deepEqual(offeredA, offeredB), 'Runbook offers must be deterministic for the same seed and build.');
  assert(offeredA.every((card) => firstSnapshotState(first, card.id) === 'available'), 'Offered cards must expose an AVAILABLE state.');
  const chosen = offeredA[0];
  if (chosen) {
    const result = Engine.chooseUpgrade(first, chosen.id);
    assert(result.accepted && first.build.includes(chosen.id), 'An offered card must install exactly once.');
    const activeState = Engine.snapshot(first).runbookStates.find((state) => state.id === chosen.id);
    assert(activeState && activeState.status === 'active' && activeState.charges === 0, 'Installed cards must transition to ACTIVE and spend their charge.');
    const duplicateUpgrade = Engine.chooseUpgrade(first, chosen.id);
    assert(!duplicateUpgrade.accepted && duplicateUpgrade.reason === 'not-awaiting-upgrade', 'A runbook choice must not be applied twice.');
  }
  const duplicateBuild = Engine.createRun('CARD-DUPLICATE', 'freeplay', ['bulkhead', 'bulkhead', 'trace-sampling']);
  assert(duplicateBuild.build.join(',') === 'bulkhead,trace-sampling', 'Duplicate runbook IDs must not double-apply a card.');
  return { cards: Engine.RUNBOOK_CARDS.length, deterministicOffers: true, lifecycle: true, combinationSafe: true };
}

function makeNovaSnapshot(services, seed = 'AUDIT1') {
  return { seed, services, scenario: { id: 'observable-only', title: 'test', description: 'test', symptom: 'test' } };
}

function auditNova() {
  const novaSource = fs.readFileSync(path.join(ROOT, 'assets/js/cascade-nova.js'), 'utf8');
  assert(!novaSource.includes('scenarioRoot'), 'NOVA source must not use a hidden scenarioRoot bonus.');
  assert(!novaSource.includes('rootCandidate.score +='), 'NOVA must not score a hidden answer bonus.');
  assert(!novaSource.includes('scenario.root'), 'NOVA must not access scenario.root.');
  assert(!/fetch\s*\(|XMLHttpRequest|WebSocket/.test(novaSource), 'NOVA must remain optional and local-only.');
  const healthy = makeNovaSnapshot([
    { id: 'gateway', name: 'API Gateway', health: 99, cpu: 31, latency: 120, errors: 0.2, queue: 12, replicas: 3, status: 'healthy', dependencies: ['orders'] },
    { id: 'pricing', name: 'Pricing', health: 98, cpu: 28, latency: 140, errors: 0.4, queue: 12, replicas: 3, status: 'healthy', dependencies: ['postgres'] },
    { id: 'postgres', name: 'PostgreSQL', health: 98, cpu: 46, latency: 22, errors: 0.2, queue: 24, replicas: 3, status: 'healthy', dependencies: [] }
  ]);
  const healthyResult = Nova.analyze(healthy, 'Which service should I restart?', healthy.seed, 1);
  assert(healthyResult.lead.includes('No service'), 'NOVA should abstain when the visible fixture is healthy.');

  const database = makeNovaSnapshot([
    { id: 'pricing', name: 'Pricing', health: 84, cpu: 28, latency: 6420, errors: 17.2, queue: 430, replicas: 3, status: 'critical', dependencies: ['postgres'] },
    { id: 'postgres', name: 'PostgreSQL', health: 72, cpu: 46, latency: 4100, errors: 4.2, queue: 1400, replicas: 3, connectionUtilization: 100, status: 'critical', dependencies: [] },
    { id: 'orders', name: 'Orders', health: 86, cpu: 54, latency: 980, errors: 8.4, queue: 260, replicas: 3, retryMultiplier: 4, status: 'warning', dependencies: ['pricing'] }
  ], 'DB-GOLDEN');
  const databaseResult = Nova.analyze(database, 'Why is checkout slow?', database.seed, 2);
  assert(/postgres|database|connection|downstream/i.test(`${databaseResult.lead} ${databaseResult.explanation} ${databaseResult.verify}`), 'NOVA must ground database analysis in observable dependency evidence.');
  assert(!/scale pricing/i.test(`${databaseResult.lead} ${databaseResult.explanation}`), 'NOVA must not recommend scaling a low-CPU Pricing symptom for the database fixture.');

  const edge = makeNovaSnapshot([
    { id: 'gateway', name: 'API Gateway', health: 66, cpu: 97, latency: 1800, errors: 4.2, queue: 2400, replicas: 2, status: 'critical', dependencies: ['orders'] },
    { id: 'orders', name: 'Orders', health: 98, cpu: 38, latency: 160, errors: 0.3, queue: 8, replicas: 3, status: 'healthy', dependencies: [] }
  ], 'EDGE-GOLDEN');
  const edgeResult = Nova.analyze(edge, 'Could this be a capacity problem?', edge.seed, 2);
  assert(/capacity|gateway/i.test(`${edgeResult.lead} ${edgeResult.explanation}`), 'NOVA must recognize visible edge capacity pressure.');
  return { controlledSnapshots: 3, hiddenRootLeak: false, optional: true, safeAbstention: true, telemetryOnly: true, groundedFixtures: true };
}

function auditRecruiterAndIntegration() {
  const recruiter = Engine.createRun('RECRUIT1', 'recruiter', []);
  const freeplay = Engine.createRun('RECRUIT1', 'freeplay', []);
  assert(recruiter.engineVersion === Engine.VERSION, 'Recruiter mode must use the shared engine version.');
  assert(recruiter.maxTime === 90 && freeplay.maxTime === 120, 'Recruiter and freeplay time budgets must remain distinct.');
  const combinations = [[], ['bulkhead'], ['adaptive-scaling'], ['trace-sampling'], ['chaos-tested'], ['bulkhead', 'trace-sampling'], ['adaptive-scaling', 'chaos-tested'], ['bulkhead', 'adaptive-scaling', 'trace-sampling']];
  combinations.forEach((build, index) => {
    const result = runScripted(`COMBO${index}`, build);
    assert(result.final && Array.isArray(result.final.services), `Build combination ${index} must produce a snapshot.`);
    assert(result.final.services.every((service) => Number.isFinite(service.health) && service.replicas >= 1), `Build combination ${index} produced invalid service state.`);
  });
  return { recruiterMode: true, freeplayMode: true, combinations: combinations.length, novaDeckRecruiter: true };
}

function auditFuzz() {
  let seeds = 0;
  let snapshots = 0;
  for (let index = 0; index < 1000; index += 1) {
    const seed = `FUZZ${index.toString(36).toUpperCase()}`;
    const build = Engine.RUNBOOK_CARDS.filter((card, cardIndex) => ((index + cardIndex) % 7) < 2).slice(0, 3).map((card) => card.id);
    const result = runScripted(seed, build, 'freeplay', [
      { at: 2, action: 'inspect', target: 'gateway', actionId: `${seed}-inspect` },
      { at: 5, action: 'scale', target: 'gateway', actionId: `${seed}-scale` },
      { at: 8, action: 'circuit', target: 'pricing', actionId: `${seed}-circuit` },
      { at: 12, action: 'failover', target: 'postgres', actionId: `${seed}-failover` }
    ], { captureHistory: false, hashSnapshots: false });
    seeds += 1;
    snapshots += result.snapshots.length;
    result.snapshots.forEach((snapshot) => {
      snapshot.services.forEach((service) => {
        assert(Number.isFinite(service.health) && service.health >= 0 && service.health <= 100, `${seed}: invalid health`);
        assert(Number.isFinite(service.queue) && service.queue >= 0, `${seed}: invalid queue`);
        assert(Number.isFinite(service.replicas) && service.replicas >= 1, `${seed}: invalid replicas`);
        assert(Number.isFinite(service.cpu) && service.cpu >= 0 && service.cpu <= 100, `${seed}: invalid cpu`);
      });
    });
  }
  return { seeds, snapshots, invariants: 'pass' };
}

function run() {
  const startedAt = Date.now();
  const report = { product: 'CASCADE', auditVersion: 1, generatedAt: new Date().toISOString(), status: 'PASS', layers: {} };
  try {
    report.layers.deployment = auditDeployment();
    report.layers.engine = auditEngine();
    report.layers.actions = auditActions();
    report.layers.cards = auditCards();
    report.layers.nova = auditNova();
    report.layers.integration = auditRecruiterAndIntegration();
    report.layers.golden = auditGoldenRuns();
    report.layers.fuzz = auditFuzz();
    report.layers.replay = auditReplay();
    report.layers.player = { recruiterBudgetSeconds: 90, onboarding: true, postmortem: true, productionSmoke: 'external-smoke-required' };
  } catch (error) {
    report.status = 'FAIL';
    report.error = error.stack || error.message;
  }
  report.durationMs = Date.now() - startedAt;
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== 'PASS') process.exitCode = 1;
}

if (!args.has('--module')) run();
module.exports = { run, auditDeployment, auditEngine, auditActions, auditReplay, auditGoldenRuns, auditCards, auditNova, auditRecruiterAndIntegration, auditFuzz };
