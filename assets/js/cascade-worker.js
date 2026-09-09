/* CASCADE simulation worker: deterministic state lives away from the render loop. */
'use strict';

const SERVICE_DEFINITIONS = [
  { id: 'gateway', name: 'API Gateway', short: 'GATEWAY', role: 'edge', dependencies: ['orders', 'auth', 'pricing'], base: { health: 98, cpu: 31, memory: 44, latency: 120, errors: 0.2, queue: 12, replicas: 3, traffic: 920, connectionUtilization: 31 } },
  { id: 'orders', name: 'Orders', short: 'ORDERS', role: 'service', dependencies: ['pricing', 'inventory'], base: { health: 98, cpu: 38, memory: 51, latency: 160, errors: 0.3, queue: 8, replicas: 3, traffic: 640, connectionUtilization: 38 } },
  { id: 'auth', name: 'Auth', short: 'AUTH', role: 'service', dependencies: ['redis'], base: { health: 99, cpu: 21, memory: 34, latency: 80, errors: 0.1, queue: 4, replicas: 2, traffic: 520, connectionUtilization: 21 } },
  { id: 'pricing', name: 'Pricing', short: 'PRICING', role: 'service', dependencies: ['postgres', 'cache'], base: { health: 98, cpu: 33, memory: 49, latency: 140, errors: 0.4, queue: 12, replicas: 3, traffic: 580, connectionUtilization: 33 } },
  { id: 'inventory', name: 'Inventory', short: 'INVENTORY', role: 'service', dependencies: ['postgres', 'cache'], base: { health: 98, cpu: 29, memory: 42, latency: 150, errors: 0.2, queue: 8, replicas: 2, traffic: 490, connectionUtilization: 29 } },
  { id: 'cache', name: 'Redis Cache', short: 'REDIS', role: 'data', dependencies: ['redis'], base: { health: 99, cpu: 18, memory: 63, latency: 16, errors: 0.1, queue: 2, replicas: 3, traffic: 780, connectionUtilization: 18 } },
  { id: 'postgres', name: 'PostgreSQL', short: 'POSTGRES', role: 'data', dependencies: [], base: { health: 98, cpu: 46, memory: 58, latency: 22, errors: 0.2, queue: 24, replicas: 3, traffic: 1200, connectionUtilization: 74 } },
  { id: 'redis', name: 'Redis Primary', short: 'REDIS DB', role: 'data', dependencies: [], base: { health: 99, cpu: 24, memory: 47, latency: 9, errors: 0.1, queue: 4, replicas: 3, traffic: 850, connectionUtilization: 24 } }
];

const SCENARIOS = [
  {
    id: 'latency',
    code: 'INC-DB17',
    title: 'Pricing latency spike',
    description: 'Checkout is waiting on Pricing. Follow the dependency edge before you add more callers to a saturated database.',
    symptom: 'checkout p95 · 8,412 ms',
    root: 'pricing',
    rootCause: 'PostgreSQL connection exhaustion',
    alternate: { action: 'failover', target: 'postgres' },
    failureText: 'Pricing latency keeps climbing; Orders is retrying the slow call.'
  },
  {
    id: 'traffic',
    code: 'INC-TR42',
    title: 'Traffic spike at the edge',
    description: 'A sudden launch doubled demand. The gateway is queuing requests faster than its replicas can drain them.',
    symptom: 'gateway queue · 1,942',
    root: 'gateway',
    rootCause: 'Unplanned traffic surge',
    failureText: 'The edge queue is overflowing; downstream services are receiving retries.'
  },
  {
    id: 'deployment',
    code: 'INC-RL09',
    title: 'The Friday deployment',
    description: 'A release changed the Orders retry policy. Every timeout now asks the same dependency to work harder.',
    symptom: 'orders errors · 38.0%',
    root: 'orders',
    rootCause: 'Retry regression in release 2026.09.09',
    failureText: 'Orders is retrying Pricing into saturation; customer impact is spreading.'
  }
];

const TOTAL_STAGES = 4;
const RUNBOOK_CARDS = [
  {
    id: 'bulkhead',
    name: 'Bulkhead',
    label: 'CONTAINMENT',
    description: 'Install a hard boundary between callers and a sick dependency.',
    benefit: 'Dependency pressure propagates 32% slower.',
    tradeoff: 'Some isolated requests fail fast while the wall is up.',
    targets: ['service', 'dependency-edge'],
    cost: 1,
    charges: 1,
    cooldown: 0,
    duration: 'run',
    effect: 'Reduce dependency-pressure propagation.',
    sideEffects: 'Isolated requests fail fast while containment is active.',
    prerequisites: []
  },
  {
    id: 'adaptive-scaling',
    name: 'Adaptive Autoscaling',
    label: 'CAPACITY',
    description: 'Let the platform add a replica when a service crosses its saturation line.',
    benefit: 'Services above 80% CPU can self-scale once per incident.',
    tradeoff: 'New capacity costs time and operational budget.',
    targets: ['service'],
    cost: 1,
    charges: 1,
    cooldown: 0,
    duration: 'run',
    effect: 'Add one replica automatically above the saturation line.',
    sideEffects: 'Capacity takes time and operational budget to come online.',
    prerequisites: []
  },
  {
    id: 'trace-sampling',
    name: 'Trace Sampling',
    label: 'OBSERVABILITY',
    description: 'Keep enough distributed traces to find the first domino quickly.',
    benefit: 'Inspection cooldown is cut in half and traces surface more clearly.',
    tradeoff: 'Sampling still shows symptoms if you stop at the edge.',
    targets: ['telemetry'],
    cost: 1,
    charges: 1,
    cooldown: 0,
    duration: 'run',
    effect: 'Shorten inspection cooldowns.',
    sideEffects: 'More evidence does not guarantee a correct diagnosis.',
    prerequisites: []
  },
  {
    id: 'chaos-tested',
    name: 'Chaos Tested',
    label: 'RESILIENCE',
    description: 'Exercise the secondary path before production asks for it.',
    benefit: 'Failover is stronger and recovery completes sooner.',
    tradeoff: 'The secondary cluster remains capacity-constrained.',
    targets: ['service', 'secondary-cluster'],
    cost: 1,
    charges: 1,
    cooldown: 0,
    duration: 'run',
    effect: 'Improve failover and recovery margins.',
    sideEffects: 'Secondary capacity can still saturate.',
    prerequisites: []
  },
  {
    id: 'conservative-deployments',
    name: 'Conservative Deployments',
    label: 'RELEASE SAFETY',
    description: 'Prefer a known-good release when a rollout changes behavior.',
    benefit: 'Rollbacks restore more health and latency margin.',
    tradeoff: 'You give up the newest release while the incident is active.',
    targets: ['release'],
    cost: 1,
    charges: 1,
    cooldown: 0,
    duration: 'run',
    effect: 'Increase rollback recovery margin.',
    sideEffects: 'The newest release remains disabled during the incident.',
    prerequisites: []
  },
  {
    id: 'aggressive-retry',
    name: 'Aggressive Retry',
    label: 'HIGH VARIANCE',
    description: 'Keep trying when a dependency is healthy and available.',
    benefit: 'Healthy paths recover small transient blips faster.',
    tradeoff: 'A sick dependency receives even more retry traffic.',
    targets: ['service', 'dependency-edge'],
    cost: 1,
    charges: 1,
    cooldown: 0,
    duration: 'run',
    effect: 'Recover healthy paths from small transient blips faster.',
    sideEffects: 'A sick dependency receives more retry traffic.',
    prerequisites: []
  }
];

let run = null;
let intervalId = null;

function hashSeed(value) {
  let hash = 2166136261;
  const text = String(value || '8F31A').toUpperCase();
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeSeed(value) {
  const cleaned = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (cleaned.length >= 4) return cleaned;
  return (cleaned + hashSeed(cleaned || '8F31A').toString(16).toUpperCase()).slice(0, 6);
}

function normalizeBuild(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(/[,.|]/);
  const valid = RUNBOOK_CARDS.map((card) => card.id);
  return values
    .map((cardId) => String(cardId || '').trim())
    .filter((cardId, index, list) => valid.includes(cardId) && list.indexOf(cardId) === index)
    .slice(0, TOTAL_STAGES - 1);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function statusFor(health) {
  if (health <= 44) return 'critical';
  if (health <= 76) return 'warning';
  return 'healthy';
}

function hasCard(cardId) {
  return Boolean(run && run.build.includes(cardId));
}

function cardMetadata(cardIds) {
  return cardIds
    .map((cardId) => RUNBOOK_CARDS.find((card) => card.id === cardId))
    .filter(Boolean)
    .map((card) => ({ ...card }));
}

function scenarioFor(seed, stage) {
  const scenarioHash = stage === 1 ? hashSeed(seed) : hashSeed(`${seed}|incident|${stage}`);
  return SCENARIOS[scenarioHash % SCENARIOS.length];
}

function upgradeOptions() {
  if (!run || !run.awaitingUpgrade || run.replayBuild || run.stage >= TOTAL_STAGES) return [];
  return RUNBOOK_CARDS
    .filter((card) => !run.build.includes(card.id))
    .map((card) => ({
      card,
      order: hashSeed(`${run.seed}|offer|${run.stage}|${run.build.join(':')}|${card.id}`)
    }))
    .sort((left, right) => left.order - right.order)
    .slice(0, 3)
    .map(({ card }) => ({ ...card }));
}

function serviceById(id) {
  return run.services.find((service) => service.id === id);
}

function emitEvent(text, level = 'info') {
  if (!run) return;
  const event = { time: round(run.time, 1), stage: run.stage, text, level };
  run.events += 1;
  postMessage({ type: 'event', event, count: run.events });
}

function snapshot() {
  const services = run.services.map((service) => ({
    id: service.id,
    name: service.name,
    short: service.short,
    role: service.role,
    dependencies: service.dependencies.slice(),
    health: round(service.health),
    cpu: round(service.cpu),
    memory: round(service.memory),
    latency: Math.round(service.latency),
    errors: round(service.errors),
    queue: Math.round(service.queue),
    replicas: service.replicas,
    traffic: Math.round(service.traffic),
    status: service.status,
    circuitOpen: Boolean(service.circuitOpen),
    failover: Boolean(service.failover)
  }));
  const averageHealth = services.reduce((sum, service) => sum + service.health, 0) / services.length;
  const gateway = services.find((service) => service.id === 'gateway');
  const impact = clamp(((100 - averageHealth) * 0.55) + ((100 - gateway.health) * 0.45) + (gateway.errors * 1.8), 0, 100);
  const blastRadius = services.filter((service) => service.status !== 'healthy').length;
  const phase = run.complete
    ? (run.success ? 'STABILIZED' : 'OUTAGE')
    : (run.resolved ? 'RECOVERING' : (impact > 42 ? 'CRITICAL' : (impact > 14 ? 'DEGRADING' : (run.time > 0 ? 'INVESTIGATING' : 'STANDBY'))));
  return {
    seed: run.seed,
    mode: run.mode,
    time: round(run.time, 1),
    stage: run.stage,
    totalStages: TOTAL_STAGES,
    services,
    impact: round(impact),
    blastRadius,
    phase,
    resolved: run.resolved,
    complete: run.complete,
    incidentComplete: run.complete,
    runComplete: run.runComplete,
    awaitingUpgrade: run.awaitingUpgrade,
    replayBuild: run.replayBuild,
    success: run.success,
    runSuccess: run.runComplete ? run.success : null,
    scenario: { id: run.scenario.id, code: run.scenario.code, title: run.scenario.title, description: run.scenario.description, symptom: run.scenario.symptom, root: run.scenario.root, rootCause: run.scenario.rootCause },
    build: run.build.slice(),
    buildCards: cardMetadata(run.build),
    upgradeOptions: upgradeOptions(),
    stagesCompleted: run.runComplete ? TOTAL_STAGES : Math.max(0, run.stage - 1),
    unnecessaryChanges: run.stageUnnecessaryChanges,
    totalUnnecessaryChanges: run.totalUnnecessaryChanges,
    diagnosed: run.diagnosed
  };
}

function recordSnapshot() {
  const current = snapshot();
  run.history.push(current);
  if (run.history.length > 1400) run.history.shift();
  postMessage({ type: 'snapshot', snapshot: current });
  return current;
}

function initialiseServices(seedHash) {
  return SERVICE_DEFINITIONS.map((definition, index) => {
    const jitter = ((seedHash >>> (index % 16)) & 7) - 3;
    const service = {
      id: definition.id,
      name: definition.name,
      short: definition.short,
      role: definition.role,
      dependencies: definition.dependencies.slice(),
      base: { ...definition.base },
      health: clamp(definition.base.health + jitter * 0.2, 1, 100),
      cpu: clamp(definition.base.cpu + jitter, 0, 100),
      memory: clamp(definition.base.memory + jitter, 0, 100),
      latency: Math.max(1, definition.base.latency + jitter * 2),
      errors: Math.max(0, definition.base.errors + jitter * 0.05),
      queue: Math.max(0, definition.base.queue + jitter),
      replicas: definition.base.replicas,
      traffic: Math.max(1, definition.base.traffic + jitter * 12),
      loadBoost: 0,
      circuitOpen: false,
      failover: false,
      autoScaled: false
    };
    service.status = statusFor(service.health);
    return service;
  });
}

function resetIncident() {
  const topologyHash = hashSeed(`${run.seed}|topology|${run.stage}|${run.build.join(':')}`);
  run.scenario = scenarioFor(run.seed, run.stage);
  run.services = initialiseServices(topologyHash);
  run.time = 0;
  run.maxTime = run.mode === 'freeplay' ? 120 : 90;
  run.stageUnnecessaryChanges = 0;
  run.diagnosed = false;
  run.resolved = false;
  run.complete = false;
  run.success = false;
  run.awaitingUpgrade = false;
  run.recoveryTime = 0;
  run.actionCooldown = 0;
  run.history = [];
}

function start(seed, mode, build, replayBuild) {
  if (intervalId) clearInterval(intervalId);
  const normalized = normalizeSeed(seed);
  const selectedBuild = normalizeBuild(build);
  run = {
    seed: normalized,
    mode: mode === 'freeplay' ? 'freeplay' : 'recruiter',
    stage: 1,
    build: selectedBuild,
    replayBuild: Boolean(replayBuild),
    runComplete: false,
    events: 0,
    totalUnnecessaryChanges: 0,
    scenario: null,
    services: [],
    time: 0,
    maxTime: 90,
    stageUnnecessaryChanges: 0,
    diagnosed: false,
    resolved: false,
    complete: false,
    success: false,
    awaitingUpgrade: false,
    runSuccess: null,
    recoveryTime: 0,
    actionCooldown: 0,
    history: []
  };
  resetIncident();
  emitEvent(`Incident ${run.stage}/${TOTAL_STAGES}: ${run.scenario.title}. Customer impact is increasing.`, 'warning');
  emitEvent(run.build.length ? `Build online: ${run.build.join(' · ')}.` : `Seed ${run.seed} initialized. Trace the graph before changing capacity.`, 'info');
  const initial = recordSnapshot();
  postMessage({ type: 'started', snapshot: initial, maxTime: run.maxTime });
  intervalId = setInterval(tick, 100);
}

function applyBaseline(next, previous) {
  const smoothing = (current, target, amount) => current + ((target - current) * amount);
  next.cpu = smoothing(previous.cpu, next.base.cpu, 0.018);
  next.memory = smoothing(previous.memory, next.base.memory, 0.009);
  next.latency = smoothing(previous.latency, next.base.latency, 0.024);
  next.errors = Math.max(0, smoothing(previous.errors, next.base.errors, 0.018));
  next.queue = Math.max(0, smoothing(previous.queue, next.base.queue, 0.022));
  next.traffic = smoothing(previous.traffic, next.base.traffic, 0.01) + next.loadBoost;
  next.loadBoost *= 0.992;
  if (hasCard('aggressive-retry') && !run.resolved && next.health > 76) {
    next.health += 0.02;
    next.latency = Math.max(next.base.latency, next.latency - 0.7);
  }
  if (next.circuitOpen) {
    next.traffic = Math.max(next.base.traffic * 0.45, next.traffic - 2.8);
    next.queue = Math.max(0, next.queue - 1.8);
  }
  if (next.failover) {
    next.latency = smoothing(next.latency, next.base.latency * 0.72, 0.04);
    next.errors = smoothing(next.errors, next.base.errors * 0.45, 0.04);
  }
}

function applyDependencyStress(next, previousById) {
  const dependencyStress = next.dependencies.reduce((total, dependencyId) => {
    const dependency = previousById[dependencyId];
    return total + (dependency ? Math.max(0, (88 - dependency.health) / 88) : 0);
  }, 0);
  if (!dependencyStress) return;
  const propagationFactor = hasCard('bulkhead') ? 0.68 : 1;
  const retryFactor = hasCard('aggressive-retry') ? 1.12 : 1;
  next.latency += dependencyStress * 8;
  next.errors += dependencyStress * 2.2;
  next.queue += dependencyStress * 2.8;
  next.cpu += dependencyStress * 1.1;
  next.health -= dependencyStress * 0.52 * propagationFactor;
  next.traffic += dependencyStress * 12 * retryFactor;
}

function applyIncidentPressure(next) {
  const scenario = run.scenario;
  if (hasCard('adaptive-scaling') && !run.resolved && next.cpu > 80 && next.replicas < 8 && !next.autoScaled) {
    next.autoScaled = true;
    next.replicas += 1;
    next.cpu = Math.max(10, next.cpu - 13);
    next.queue = Math.max(0, next.queue - 9);
    emitEvent(`Adaptive Autoscaling added a ${next.name} replica at the saturation line.`, 'info');
  }
  if (run.resolved && next.id === scenario.root) {
    next.health += (100 - next.health) * 0.045;
    next.latency = Math.max(next.base.latency, next.latency - 9);
    next.errors = Math.max(next.base.errors, next.errors - 0.35);
    next.queue = Math.max(next.base.queue, next.queue - 2.2);
    next.cpu = Math.max(next.base.cpu, next.cpu - 0.8);
    return;
  }
  if (next.id !== scenario.root || run.resolved) return;
  if (scenario.id === 'latency') {
    next.latency += 72 + run.time * 2.1;
    next.errors += 0.55 + run.time * 0.018;
    next.queue += 2.8;
    next.cpu += 0.52;
    next.health -= 0.19;
  } else if (scenario.id === 'traffic') {
    next.traffic += 7 + run.time * 0.045;
    next.cpu += 0.72;
    next.queue += 2.35;
    next.latency += 5.5;
    next.errors += 0.12;
    next.health -= 0.12;
  } else {
    next.errors += 0.7;
    next.latency += 27;
    next.queue += 2.5;
    next.cpu += 0.42;
    next.health -= 0.25;
  }
}

function tick() {
  if (!run || run.complete) return;
  const before = run.services.map((service) => ({ ...service }));
  const previousById = Object.fromEntries(before.map((service) => [service.id, service]));
  run.time += 0.1;
  run.actionCooldown = Math.max(0, run.actionCooldown - 0.1);
  run.services = run.services.map((service) => {
    const next = { ...service, dependencies: service.dependencies.slice() };
    applyBaseline(next, service);
    applyDependencyStress(next, previousById);
    applyIncidentPressure(next);
    if (run.resolved && next.id !== run.scenario.root) {
      next.health += (100 - next.health) * 0.012;
      next.errors = Math.max(next.base.errors, next.errors - 0.08);
      next.queue = Math.max(next.base.queue, next.queue - 0.45);
    }
    next.health = clamp(next.health, 0, 100);
    next.cpu = clamp(next.cpu, 0, 100);
    next.memory = clamp(next.memory, 0, 100);
    next.latency = clamp(next.latency, 1, 99999);
    next.errors = clamp(next.errors, 0, 100);
    next.queue = clamp(next.queue, 0, 99999);
    next.replicas = Math.max(1, Math.min(12, next.replicas));
    next.status = statusFor(next.health);
    return next;
  });

  const previousStatuses = Object.fromEntries(before.map((service) => [service.id, service.status]));
  run.services.forEach((service) => {
    if (service.status !== previousStatuses[service.id] && service.status !== 'healthy') {
      const level = service.status === 'critical' ? 'critical' : 'warning';
      emitEvent(`${service.name} is ${service.status}. Dependency pressure is propagating.`, level);
    }
  });

  if (run.resolved) {
    run.recoveryTime += 0.1;
    const recoveryTarget = hasCard('chaos-tested') ? 11 : 17;
    const recoveryWindow = hasCard('chaos-tested') ? 4.5 : 7;
    if (run.recoveryTime >= recoveryWindow && snapshot().impact < recoveryTarget) finish(true);
  } else if (run.time >= run.maxTime) {
    finish(false);
  }

  if (!run.complete) recordSnapshot();
}

function finish(success) {
  if (!run || run.complete) return;
  run.complete = true;
  run.success = success;
  run.awaitingUpgrade = Boolean(success && run.stage < TOTAL_STAGES);
  run.runComplete = Boolean(!success || run.stage >= TOTAL_STAGES);
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
  emitEvent(success
    ? `Incident ${run.stage}/${TOTAL_STAGES} stabilized. The city is healthy enough to hand back to daylight.`
    : run.scenario.failureText, success ? 'info' : 'critical');
  if (run.runComplete) {
    run.runSuccess = success;
    emitEvent(success ? `Run complete. Final build: ${run.build.length ? run.build.join(' · ') : 'baseline operations'}.` : 'Run ended. Re-run the build and change less, earlier.', success ? 'info' : 'critical');
  } else {
    emitEvent(`Choose one runbook before incident ${run.stage + 1}.`, 'info');
  }
  const finalSnapshot = snapshot();
  run.history.push(finalSnapshot);
  postMessage({ type: 'snapshot', snapshot: finalSnapshot });
  postMessage({ type: 'complete', snapshot: finalSnapshot, history: run.history, maxTime: run.maxTime });
}

function continueAfterIncident(cardId) {
  if (!run || !run.complete || !run.awaitingUpgrade || run.runComplete) return;
  if (!run.replayBuild) {
    const selected = RUNBOOK_CARDS.find((card) => card.id === cardId);
    if (!selected || run.build.includes(selected.id) || !upgradeOptions().some((card) => card.id === selected.id)) return;
    run.build.push(selected.id);
    emitEvent(`Runbook installed: ${selected.name}. ${selected.benefit}`, 'info');
  } else {
    emitEvent(`Replaying the installed build: ${run.build.length ? run.build.join(' · ') : 'baseline operations'}.`, 'info');
  }
  run.stage += 1;
  resetIncident();
  emitEvent(`Incident ${run.stage}/${TOTAL_STAGES}: ${run.scenario.title}. New telemetry window open.`, 'warning');
  const initial = recordSnapshot();
  postMessage({ type: 'started', snapshot: initial, maxTime: run.maxTime });
  intervalId = setInterval(tick, 100);
}

function action(actionId, targetId) {
  if (!run || run.complete || run.actionCooldown > 0) return;
  const target = serviceById(targetId);
  if (!target) return;
  run.actionCooldown = hasCard('trace-sampling') ? 0.55 : 1.1;

  if (actionId === 'inspect') {
    if (target.id === run.scenario.root) {
      run.diagnosed = true;
      emitEvent(`Trace complete: ${target.name} is the first failing dependency edge.`, 'info');
    } else {
      emitEvent(`Trace checked: ${target.name} is carrying symptoms, not the root cause.`, 'info');
    }
    recordSnapshot();
    return;
  }

  const scenario = run.scenario;
  const isCorrect = (actionId === scenario.correctAction && target.id === scenario.root) || (scenario.alternate && actionId === scenario.alternate.action && target.id === scenario.alternate.target);
  if (isCorrect) {
    run.resolved = true;
    run.recoveryTime = 0;
    if (actionId === 'circuit') {
      target.circuitOpen = true;
      target.traffic *= 0.72;
      target.errors += 1.4;
      emitEvent(`Circuit opened on ${target.name}. Retries are no longer feeding the failure.`, 'info');
    } else if (actionId === 'failover') {
      target.failover = true;
      target.health = Math.min(100, target.health + (hasCard('chaos-tested') ? 32 : 24));
      emitEvent(`Traffic failed over from ${target.name} to the secondary cluster.`, 'info');
    } else if (actionId === 'scale') {
      target.replicas += 2;
      target.cpu = Math.max(10, target.cpu - 22);
      target.queue = Math.max(0, target.queue - 20);
      target.health = Math.min(100, target.health + 18);
      emitEvent(`Two ${target.name} replicas are online. The edge queue is draining.`, 'info');
    } else if (actionId === 'rollback') {
      const rollbackStrength = hasCard('conservative-deployments') ? 1.25 : 1;
      target.health = Math.min(100, target.health + (30 * rollbackStrength));
      target.errors = Math.max(target.base.errors, target.errors * (hasCard('conservative-deployments') ? 0.26 : 0.38));
      target.latency = Math.max(target.base.latency, target.latency * (hasCard('conservative-deployments') ? 0.3 : 0.42));
      emitEvent(`${target.name} rolled back to the last known-good release.`, 'info');
    }
  } else {
    run.stageUnnecessaryChanges += 1;
    run.totalUnnecessaryChanges += 1;
    if (actionId === 'restart') {
      target.health = Math.min(100, target.health + 13);
      target.errors *= 0.62;
      target.queue = Math.max(0, target.queue - 5);
      emitEvent(`${target.name} restarted. It is quieter, but the dependency is still failing.`, 'warning');
    } else if (actionId === 'scale') {
      target.replicas += 2;
      target.cpu = Math.max(10, target.cpu - 10);
      target.health = Math.min(100, target.health + 6);
      target.dependencies.forEach((dependencyId) => {
        const dependency = serviceById(dependencyId);
        if (dependency) dependency.loadBoost += 15;
      });
      emitEvent(`${target.name} scaled, adding pressure to its dependencies.`, 'warning');
    } else if (actionId === 'rollback') {
      target.health = Math.min(100, target.health + 10);
      target.errors *= 0.72;
      emitEvent(`${target.name} rolled back, but the pager is still active elsewhere.`, 'warning');
    } else if (actionId === 'circuit') {
      target.circuitOpen = true;
      target.traffic *= 0.65;
      target.errors += 3.2;
      emitEvent(`Circuit opened on ${target.name}. Some requests will now fail fast.`, 'warning');
    } else if (actionId === 'failover') {
      target.failover = true;
      target.health = Math.min(100, target.health + 10);
      emitEvent(`${target.name} moved to a constrained secondary. Watch its capacity.`, 'warning');
    }
  }
  target.status = statusFor(target.health);
  recordSnapshot();
}

self.onmessage = (message) => {
  const payload = message.data || {};
  if (payload.type === 'start') start(payload.seed, payload.mode, payload.build, payload.replayBuild);
  if (payload.type === 'action') action(payload.action, payload.target);
  if ((payload.type === 'upgrade' || payload.type === 'continue') && run) continueAfterIncident(payload.cardId);
  if (payload.type === 'replay' && run && run.history.length) {
    const index = clamp(Number(payload.index) || 0, 0, run.history.length - 1);
    postMessage({ type: 'replay', snapshot: run.history[index], index, total: run.history.length });
  }
};
