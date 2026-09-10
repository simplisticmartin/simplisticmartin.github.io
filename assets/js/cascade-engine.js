/*
 * CASCADE // shared deterministic simulation engine
 *
 * No DOM, Worker, timer, or network APIs live here. The browser worker and
 * the Node audit harness call the same state machine, so seeded incidents,
 * actions, recovery, build choices, and replay hashes stay honest.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CascadeEngine = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = '0.5.1-audit';
  const TICK_SECONDS = 0.1;
  const TOTAL_STAGES = 4;
  const ACTIONS = ['inspect', 'restart', 'scale', 'rollback', 'circuit', 'failover'];

  const SERVICE_DEFINITIONS = [
    { id: 'gateway', name: 'API Gateway', short: 'GATEWAY', role: 'edge', dependencies: ['orders', 'auth', 'pricing'], callWeights: { orders: 0.52, auth: 0.16, pricing: 0.32 }, base: { health: 98, cpu: 31, memory: 44, latency: 120, errors: 0.2, queue: 12, replicas: 3, traffic: 920, connectionUtilization: 31, latencySlo: 250, errorSlo: 2, queueSlo: 180, memorySlo: 88 } },
    { id: 'orders', name: 'Orders', short: 'ORDERS', role: 'service', dependencies: ['pricing', 'inventory'], callWeights: { pricing: 0.58, inventory: 0.42 }, base: { health: 98, cpu: 38, memory: 51, latency: 160, errors: 0.3, queue: 8, replicas: 3, traffic: 640, connectionUtilization: 38, latencySlo: 400, errorSlo: 3, queueSlo: 140, memorySlo: 88 } },
    { id: 'auth', name: 'Auth', short: 'AUTH', role: 'service', dependencies: ['redis'], callWeights: { redis: 1 }, base: { health: 99, cpu: 21, memory: 34, latency: 80, errors: 0.1, queue: 4, replicas: 2, traffic: 520, connectionUtilization: 21, latencySlo: 220, errorSlo: 2, queueSlo: 80, memorySlo: 88 } },
    { id: 'pricing', name: 'Pricing', short: 'PRICING', role: 'service', dependencies: ['postgres', 'cache'], callWeights: { postgres: 0.72, cache: 0.28 }, base: { health: 98, cpu: 33, memory: 49, latency: 140, errors: 0.4, queue: 12, replicas: 3, traffic: 580, connectionUtilization: 33, latencySlo: 350, errorSlo: 3, queueSlo: 120, memorySlo: 88 } },
    { id: 'inventory', name: 'Inventory', short: 'INVENTORY', role: 'service', dependencies: ['postgres', 'cache'], callWeights: { postgres: 0.66, cache: 0.34 }, base: { health: 98, cpu: 29, memory: 42, latency: 150, errors: 0.2, queue: 8, replicas: 2, traffic: 490, connectionUtilization: 29, latencySlo: 380, errorSlo: 3, queueSlo: 110, memorySlo: 88 } },
    { id: 'cache', name: 'Redis Cache', short: 'REDIS', role: 'data', dependencies: ['redis'], callWeights: { redis: 1 }, base: { health: 99, cpu: 18, memory: 63, latency: 16, errors: 0.1, queue: 2, replicas: 3, traffic: 780, connectionUtilization: 18, latencySlo: 90, errorSlo: 2, queueSlo: 60, memorySlo: 90 } },
    { id: 'postgres', name: 'PostgreSQL', short: 'POSTGRES', role: 'data', dependencies: [], callWeights: {}, base: { health: 98, cpu: 46, memory: 58, latency: 22, errors: 0.2, queue: 24, replicas: 3, traffic: 1200, connectionUtilization: 74, latencySlo: 180, errorSlo: 2, queueSlo: 160, memorySlo: 90 } },
    { id: 'redis', name: 'Redis Primary', short: 'REDIS DB', role: 'data', dependencies: [], callWeights: {}, base: { health: 99, cpu: 24, memory: 47, latency: 9, errors: 0.1, queue: 4, replicas: 3, traffic: 850, connectionUtilization: 24, latencySlo: 70, errorSlo: 2, queueSlo: 70, memorySlo: 90 } }
  ];

  /*
   * The seed chooses a mechanic and a small secondary disturbance. The target
   * and cause remain internal until a completed postmortem; active snapshots
   * contain symptoms and telemetry only.
   */
  const INCIDENT_TEMPLATES = [
    { id: 'db-exhaustion', code: 'INC-DB17', title: 'Checkout latency is rising', description: 'Checkout p95 is climbing and several callers are waiting on the same data path.', symptom: 'checkout p95 · 8,412 ms', target: 'postgres', cause: 'PostgreSQL connection pool exhaustion', family: 'database', severity: 1 },
    { id: 'edge-surge', code: 'INC-TR42', title: 'Demand is arriving faster than the edge can drain it', description: 'A launch has changed the request shape. Watch the queue and downstream response time together.', symptom: 'gateway queue · 1,942', target: 'gateway', cause: 'Unplanned traffic surge at the edge', family: 'capacity', severity: 0.9 },
    { id: 'retry-regression', code: 'INC-RR08', title: 'Timeouts are multiplying', description: 'A caller is asking a slow dependency to do the same work again. The first visible error may be downstream.', symptom: 'orders retries · 4.0×', target: 'orders', cause: 'Retry amplification in the request path', family: 'retry', severity: 0.88 },
    { id: 'cache-staleness', code: 'INC-CA21', title: 'Freshness has fallen below the checkout contract', description: 'Responses are fast enough to look healthy, but the cache is serving increasingly old state.', symptom: 'cache freshness · 41%', target: 'cache', cause: 'Stale cache entries and an invalidation backlog', family: 'cache', severity: 0.72 },
    { id: 'certificate-expiry', code: 'INC-TLS4', title: 'Connections are beginning to disappear', description: 'A security boundary is approaching expiry. Some callers fail while others still look nominal.', symptom: 'auth handshake errors · 12%', target: 'auth', cause: 'Certificate renewal window missed', family: 'security', severity: 0.76 },
    { id: 'queue-backlog', code: 'INC-QB31', title: 'The order queue is not draining', description: 'Work is arriving normally, but service capacity is no longer keeping pace with the backlog.', symptom: 'orders queue · 1,180', target: 'orders', cause: 'Queue consumer capacity loss', family: 'capacity', severity: 0.82 },
    { id: 'memory-leak', code: 'INC-ML52', title: 'A service is slowly running out of room', description: 'Memory and garbage-collection pressure are rising while request volume stays ordinary.', symptom: 'inventory memory · 94%', target: 'inventory', cause: 'Gradual memory leak in an inventory worker', family: 'resource', severity: 0.72 },
    { id: 'deployment-regression', code: 'INC-RL09', title: 'A release changed the shape of failure', description: 'A fresh release has changed timeout behavior. Compare release signals with dependency telemetry.', symptom: 'pricing errors · 18%', target: 'pricing', cause: 'Release regression in the pricing timeout policy', family: 'release', severity: 0.82 },
    { id: 'region-degradation', code: 'INC-RG66', title: 'The primary data path is losing capacity', description: 'A partial regional impairment is reducing the margin on a shared data boundary.', symptom: 'primary capacity · 29%', target: 'postgres', cause: 'Partial regional degradation on the primary cluster', family: 'resilience', severity: 0.74 },
    { id: 'dns-flap', code: 'INC-DN14', title: 'Routes are becoming intermittent', description: 'Some requests reach the edge and some do not. Look for a change in error mix rather than one red building.', symptom: 'gateway 5xx · 9%', target: 'gateway', cause: 'Intermittent name-resolution failure', family: 'network', severity: 0.68 }
  ];

  const RUNBOOK_CARDS = [
    { id: 'bulkhead', name: 'Bulkhead', label: 'CONTAINMENT', description: 'Install a hard boundary between callers and a sick dependency.', benefit: 'Dependency pressure propagates 32% slower.', tradeoff: 'Some isolated requests fail fast while the wall is up.', targets: ['service', 'dependency-edge'], cost: 1, charges: 1, cooldown: 0, duration: 'run', effect: 'Reduce dependency-pressure propagation.', sideEffects: 'Isolated requests fail fast while containment is active.', prerequisites: [] },
    { id: 'adaptive-scaling', name: 'Adaptive Autoscaling', label: 'CAPACITY', description: 'Let the platform add a replica when a service crosses its saturation line.', benefit: 'Services above 80% CPU can self-scale once per incident.', tradeoff: 'New capacity costs time and operational budget.', targets: ['service'], cost: 1, charges: 1, cooldown: 0, duration: 'run', effect: 'Add one replica automatically above the saturation line.', sideEffects: 'Capacity takes time and operational budget to come online.', prerequisites: [] },
    { id: 'trace-sampling', name: 'Trace Sampling', label: 'OBSERVABILITY', description: 'Keep enough distributed traces to find the first domino quickly.', benefit: 'Inspection cooldown is cut in half and traces surface more clearly.', tradeoff: 'Sampling still shows symptoms if you stop at the edge.', targets: ['telemetry'], cost: 1, charges: 1, cooldown: 0, duration: 'run', effect: 'Shorten inspection cooldowns.', sideEffects: 'More evidence does not guarantee a correct diagnosis.', prerequisites: [] },
    { id: 'chaos-tested', name: 'Chaos Tested', label: 'RESILIENCE', description: 'Exercise the secondary path before production asks for it.', benefit: 'Failover is stronger and recovery completes sooner.', tradeoff: 'The secondary cluster remains capacity-constrained.', targets: ['service', 'secondary-cluster'], cost: 1, charges: 1, cooldown: 0, duration: 'run', effect: 'Improve failover and recovery margins.', sideEffects: 'Secondary capacity can still saturate.', prerequisites: [] },
    { id: 'conservative-deployments', name: 'Conservative Deployments', label: 'RELEASE SAFETY', description: 'Prefer a known-good release when a rollout changes behavior.', benefit: 'Rollbacks restore more health and latency margin.', tradeoff: 'You give up the newest release while the incident is active.', targets: ['release'], cost: 1, charges: 1, cooldown: 0, duration: 'run', effect: 'Increase rollback recovery margin.', sideEffects: 'The newest release remains disabled during the incident.', prerequisites: [] },
    { id: 'aggressive-retry', name: 'Aggressive Retry', label: 'HIGH VARIANCE', description: 'Keep trying when a dependency is healthy and available.', benefit: 'Healthy paths recover small transient blips faster.', tradeoff: 'A sick dependency receives even more retry traffic.', targets: ['service', 'dependency-edge'], cost: 1, charges: 1, cooldown: 0, duration: 'run', effect: 'Recover healthy paths from small transient blips faster.', sideEffects: 'A sick dependency receives more retry traffic.', prerequisites: [] }
  ];

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
      .map((id) => String(id || '').trim())
      .filter((id, index, list) => valid.includes(id) && list.indexOf(id) === index)
      .slice(0, TOTAL_STAGES - 1);
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function round(value, digits) {
    const factor = 10 ** (digits === undefined ? 2 : digits);
    return Math.round(value * factor) / factor;
  }

  function stableStringify(value) {
    if (value === undefined) return 'null';
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  function hashState(value) {
    return hashSeed(stableStringify(value)).toString(16).toUpperCase().padStart(8, '0');
  }

  function cloneService(service) {
    return { ...service, dependencies: service.dependencies.slice(), callWeights: { ...service.callWeights }, base: { ...service.base } };
  }

  function serviceById(run, id) {
    return run.services.find((service) => service.id === id);
  }

  function hasCard(run, id) {
    return run.build.includes(id);
  }

  function cardMetadata(ids) {
    return ids.map((id) => RUNBOOK_CARDS.find((card) => card.id === id)).filter(Boolean).map((card) => ({ ...card, targets: card.targets.slice(), prerequisites: card.prerequisites.slice() }));
  }

  function cardStates(run) {
    const offered = new Set(upgradeOptions(run).map((card) => card.id));
    return RUNBOOK_CARDS.map((card) => {
      const active = run.build.includes(card.id);
      return {
        id: card.id,
        status: active ? 'active' : (offered.has(card.id) ? 'available' : 'locked'),
        charges: active ? 0 : card.charges,
        cooldown: 0,
        duration: card.duration,
        effect: card.effect,
        sideEffects: card.sideEffects
      };
    });
  }

  function sloValue(service, key, fallback) {
    if (service[key] !== undefined) return service[key];
    if (service.base && service.base[key] !== undefined) return service.base[key];
    return fallback;
  }

  function statusFor(service) {
    const latencySlo = sloValue(service, 'latencySlo', service.base ? service.base.latency * 1.35 : Infinity);
    const errorSlo = sloValue(service, 'errorSlo', service.base ? service.base.errors + 1.2 : Infinity);
    const queueSlo = sloValue(service, 'queueSlo', service.base ? service.base.queue + 18 : Infinity);
    const critical = service.health <= 44
      || service.latency > latencySlo * 2
      || service.errors > errorSlo * 2
      || service.queue > queueSlo * 1.8
      || service.saturation > 1.35
      || service.connectionUtilization > 98
      || service.cacheFreshness < 35
      || service.certificateTtl < 12;
    const warning = service.health <= 78
      || service.latency > latencySlo
      || service.errors > errorSlo
      || service.queue > queueSlo
      || service.saturation > 1.05
      || service.connectionUtilization > 92
      || service.cacheFreshness < 70
      || service.certificateTtl < 35;
    return critical ? 'critical' : (warning ? 'warning' : 'healthy');
  }

  function scenarioFor(seed, stage, build) {
    const primary = INCIDENT_TEMPLATES[hashSeed(`${seed}|incident|${stage}|${build.join(':')}`) % INCIDENT_TEMPLATES.length];
    const modifier = INCIDENT_TEMPLATES[hashSeed(`${seed}|modifier|${stage}|${build.join(':')}`) % INCIDENT_TEMPLATES.length];
    const noise = 0.92 + ((hashSeed(`${seed}|severity|${stage}|${primary.id}`) % 17) / 100);
    return {
      id: `${primary.id}${modifier.id === primary.id ? '' : `-${modifier.id}`}`,
      code: primary.code,
      title: primary.title,
      description: primary.description,
      symptom: primary.symptom,
      primary: { ...primary, severity: primary.severity * noise },
      modifier: modifier.id === primary.id ? null : { id: modifier.id, family: modifier.family, target: modifier.target, severity: modifier.severity * 0.24 * noise }
    };
  }

  function publicScenario(run) {
    return { id: run.scenario.id, code: run.scenario.code, title: run.scenario.title, description: run.scenario.description, symptom: run.scenario.symptom };
  }

  function upgradeOptions(run) {
    if (!run.awaitingUpgrade || run.replayBuild || run.stage >= TOTAL_STAGES) return [];
    return RUNBOOK_CARDS
      .filter((card) => !run.build.includes(card.id))
      .map((card) => ({ card, order: hashSeed(`${run.seed}|offer|${run.stage}|${run.build.join(':')}|${card.id}`) }))
      .sort((left, right) => left.order - right.order)
      .slice(0, 3)
      .map(({ card }) => ({ ...card, targets: card.targets.slice(), prerequisites: card.prerequisites.slice() }));
  }

  function addEvent(run, text, level) {
    run.pendingEvents.push({ time: round(run.stageTime, 1), stage: run.stage, text, level: level || 'info' });
  }

  function drainEvents(run) {
    return run.pendingEvents.splice(0);
  }

  function baseServices(seedHash) {
    return SERVICE_DEFINITIONS.map((definition, index) => {
      const jitter = ((seedHash >>> (index % 16)) & 7) - 3;
      const base = definition.base;
      const capacityPerReplica = Math.max(170, (base.traffic * 1.4) / base.replicas);
      const service = {
        id: definition.id,
        name: definition.name,
        short: definition.short,
        role: definition.role,
        dependencies: definition.dependencies.slice(),
        callWeights: { ...definition.callWeights },
        base: { ...base, capacityPerReplica },
        health: clamp(base.health + jitter * 0.2, 1, 100),
        cpu: clamp(base.cpu + jitter, 0, 100),
        memory: clamp(base.memory + jitter, 0, 100),
        latency: Math.max(1, base.latency + jitter * 2),
        errors: Math.max(0, base.errors + jitter * 0.05),
        queue: Math.max(0, base.queue + jitter),
        replicas: base.replicas,
        traffic: Math.max(1, base.traffic + jitter * 12),
        incomingRequests: base.traffic,
        requestRate: base.traffic,
        capacity: base.traffic * 1.4,
        saturation: base.traffic / (base.traffic * 1.4),
        connectionUtilization: base.connectionUtilization,
        cacheFreshness: 100,
        certificateTtl: 100,
        retryMultiplier: 1,
        loadShed: 0,
        restartGrace: 0,
        releasePressure: 0,
        manualCapacity: 0,
        faultMitigation: 1,
        circuitOpen: false,
        failover: false,
        failoverCapacity: 0,
        route: 'primary',
        autoScaled: false,
        recoveryBoost: 0,
        incidentSuppression: 0
      };
      service.status = statusFor(service);
      return service;
    });
  }

  function resetIncident(run) {
    const topologyHash = hashSeed(`${run.seed}|topology|${run.stage}|${run.build.join(':')}`);
    run.scenario = scenarioFor(run.seed, run.stage, run.build);
    run.services = baseServices(topologyHash);
    run.stageTime = 0;
    run.incidentComplete = false;
    run.complete = false;
    run.success = false;
    run.awaitingUpgrade = false;
    run.resolved = false;
    run.recoveryTime = 0;
    run.stableTicks = 0;
    run.actionCooldown = 0;
    run.diagnosed = false;
    run.stageUnnecessaryChanges = 0;
    run.processedActionIds = Object.create(null);
    run.finalStateHashes = [];
  }

  function createRun(seed, mode, build, replayBuild) {
    const normalized = normalizeSeed(seed);
    const run = {
      engineVersion: VERSION,
      seed: normalized,
      mode: mode === 'freeplay' ? 'freeplay' : 'recruiter',
      stage: 1,
      build: normalizeBuild(build),
      replayBuild: Boolean(replayBuild),
      totalStages: TOTAL_STAGES,
      maxTime: mode === 'freeplay' ? 120 : 90,
      stageTime: 0,
      elapsed: 0,
      totalUnnecessaryChanges: 0,
      pendingEvents: [],
      history: [],
      actionLog: [],
      actionSequence: 0,
      runComplete: false,
      incidentComplete: false,
      complete: false,
      success: false,
      awaitingUpgrade: false,
      resolved: false,
      recoveryTime: 0,
      stableTicks: 0,
      diagnosed: false,
      processedActionIds: Object.create(null),
      peakImpactedServices: Object.create(null),
      peakImpact: 0,
      finalStateHashes: [],
      // The browser keeps history and hashes for replay. Audit/fuzz callers can
      // disable either capture path without changing the simulation physics.
      captureHistory: true,
      hashSnapshots: true,
      scenario: null,
      services: []
    };
    resetIncident(run);
    addEvent(run, `Incident ${run.stage}/${TOTAL_STAGES}: telemetry is moving. Start from the customer symptom.`, 'warning');
    addEvent(run, run.build.length ? `Build online: ${run.build.join(' · ')}.` : `Seed ${run.seed} initialized. Observe before changing capacity.`, 'info');
    recordSnapshot(run);
    return run;
  }

  function pressureAt(run, severity) {
    const ramp = clamp(run.stageTime / 24, 0, 1.15);
    return clamp(ramp * severity, 0, 1.2);
  }

  function directPressure(run, service) {
    let pressure = 0;
    if (run.scenario.primary.target === service.id) pressure += pressureAt(run, run.scenario.primary.severity);
    if (run.scenario.modifier && run.scenario.modifier.target === service.id) pressure += pressureAt(run, run.scenario.modifier.severity);
    // Interventions change the fault's physics instead of toggling a hidden
    // success flag. Suppression is deliberately persistent for this incident;
    // the next incident starts with a fresh service state.
    pressure *= Math.max(0, 1 - (service.incidentSuppression || 0));
    // Runbook actions lower the actual fault pressure. This is deliberately
    // separate from health: a green process can still sit on a failing edge.
    pressure *= clamp(service.faultMitigation === undefined ? 1 : service.faultMitigation, 0, 1);
    if (service.failover) pressure *= hasCard(run, 'chaos-tested') ? 0.18 : 0.32;
    return clamp(pressure, 0, 1.25);
  }

  function dependencyStress(run, service, previousById) {
    return clamp(service.dependencies.reduce((total, dependencyId) => {
      const dependency = previousById[dependencyId] || serviceById(run, dependencyId);
      if (!dependency) return total;
      const latency = clamp((dependency.latency / dependency.base.latency - 1) / 8, 0, 1);
      const errors = clamp((dependency.errors - dependency.base.errors) / 10, 0, 1);
      const queue = clamp((dependency.queue - dependency.base.queue) / Math.max(80, dependency.base.traffic * 0.45), 0, 1);
      const saturation = clamp((dependency.saturation - 0.82) / 0.9, 0, 1);
      const freshness = clamp((70 - dependency.cacheFreshness) / 70, 0, 1);
      const certificate = clamp((35 - dependency.certificateTtl) / 35, 0, 1);
      const signal = latency * 0.34 + errors * 0.24 + queue * 0.16 + saturation * 0.14 + freshness * 0.07 + certificate * 0.05;
      const circuitFactor = dependency.circuitOpen ? 0.22 : 1;
      const bulkheadFactor = hasCard(run, 'bulkhead') ? 0.68 : 1;
      return total + signal * (service.callWeights[dependencyId] || 1) * circuitFactor * bulkheadFactor;
    }, 0), 0, 1.25);
  }

  function incomingDemand(run, service, previousById) {
    let demand = service.base.traffic;
    const primary = run.scenario.primary;
    if (primary.target === service.id && primary.id === 'edge-surge') demand *= 1 + pressureAt(run, primary.severity) * 1.18;
    if (run.scenario.modifier && run.scenario.modifier.target === service.id && run.scenario.modifier.id === 'edge-surge') demand *= 1 + pressureAt(run, run.scenario.modifier.severity) * 0.8;
    run.services.forEach((caller) => {
      if (!caller.dependencies.includes(service.id)) return;
      const previous = previousById[caller.id] || caller;
      const weight = caller.callWeights[service.id] || 1;
      const retry = Math.max(1, previous.retryMultiplier || 1);
      const circuitFactor = previous.circuitOpen || service.circuitOpen ? 0.28 : 1;
      const callerLoad = Math.max(0, previous.requestRate || previous.base.traffic);
      demand += callerLoad * weight * 0.32 * retry * circuitFactor;
    });
    const dependencyContainment = hasCard(run, 'bulkhead')
      ? clamp(dependencyStress(run, service, previousById) * 0.22, 0, 0.22)
      : 0;
    const shed = Math.max(service.loadShed || 0, dependencyContainment);
    return Math.max(1, demand * (1 - shed));
  }

  function updateService(run, service, previousById) {
    const direct = directPressure(run, service);
    const dependency = dependencyStress(run, service, previousById);
    const demand = incomingDemand(run, service, previousById);
    const failoverFactor = service.failover ? (service.failoverCapacity || 0.18) : 0;
    const capacity = Math.max(40, service.replicas * service.base.capacityPerReplica + service.manualCapacity) * (1 - failoverFactor);
    const saturation = demand / capacity;
    const overload = clamp((saturation - 0.82) / 1.1, 0, 1.2);
    const retryPressure = Math.max(0, service.retryMultiplier - 1);
    const targetLatency = service.base.latency * (1 + overload * 2.2 + dependency * 1.6)
      + direct * (service.id === 'postgres' ? 1150 : service.base.latency * 2.2)
      + (service.restartGrace > 0 ? service.base.latency * 0.12 : 0);
    const targetErrors = service.base.errors + overload * 5.2 + dependency * 2.6 + direct * (service.id === 'gateway' ? 8 : 5) + retryPressure * 3;
    const targetQueue = service.base.queue + overload * service.base.traffic * 0.42 + dependency * service.base.traffic * 0.08 + direct * service.base.traffic * (service.id === 'postgres' ? 0.24 : 0.11);
    const targetCpu = service.base.cpu + saturation * 40 + retryPressure * 14 + direct * 13;
    const targetMemory = service.base.memory + direct * (service.id === 'inventory' ? 46 : 3) + overload * 8;
    const targetConnections = service.base.connectionUtilization + overload * 58 + direct * (service.id === 'postgres' ? 29 : 4);
    const targetFreshness = service.id === 'cache' ? 100 - direct * 72 : 100;
    const targetCertificate = service.id === 'auth' ? 100 - direct * 95 : 100;
    const latencyBreach = clamp((targetLatency / service.base.latency - 1) / 8, 0, 1);
    const errorBreach = clamp((targetErrors - service.base.errors) / 10, 0, 1);
    const queueBreach = clamp((targetQueue - service.base.queue) / Math.max(80, service.base.traffic * 0.45), 0, 1);
    const memoryBreach = clamp((targetMemory - service.base.memory) / 45, 0, 1);
    const damage = direct * 27 + dependency * 17 + overload * 24 + latencyBreach * 17 + errorBreach * 9 + queueBreach * 10 + memoryBreach * 10;
    const targetHealth = clamp(98 - damage + (service.recoveryBoost * 8), 1, 100);
    const response = service.restartGrace > 0 ? 0.12 : 0.095;

    service.incomingRequests = demand;
    service.capacity = capacity;
    service.saturation = saturation;
    service.requestRate = Math.min(demand, capacity * (service.circuitOpen ? 0.7 : 0.98));
    service.traffic = service.requestRate;
    service.latency += (targetLatency - service.latency) * response;
    service.errors += (targetErrors - service.errors) * response;
    service.queue += (targetQueue - service.queue) * response;
    service.cpu += (clamp(targetCpu, 0, 100) - service.cpu) * response;
    service.memory += (clamp(targetMemory, 0, 100) - service.memory) * response;
    service.connectionUtilization += (clamp(targetConnections, 0, 100) - service.connectionUtilization) * response;
    service.cacheFreshness += (clamp(targetFreshness, 0, 100) - service.cacheFreshness) * response;
    service.certificateTtl += (clamp(targetCertificate, 0, 100) - service.certificateTtl) * response;
    service.health += (targetHealth - service.health) * response;
    service.retryMultiplier += ((service.releasePressure > 0 ? 1 + service.releasePressure * 1.4 : 1) - service.retryMultiplier) * 0.045;
    service.restartGrace = Math.max(0, service.restartGrace - TICK_SECONDS);
    service.releasePressure = Math.max(0, service.releasePressure - 0.003);
    service.manualCapacity += (0 - service.manualCapacity) * 0.001;
    service.recoveryBoost = Math.max(0, service.recoveryBoost - 0.002);
    if (service.failover) {
      service.route = 'secondary';
      service.recoveryBoost = Math.max(service.recoveryBoost, 0.4);
    }
    if (hasCard(run, 'adaptive-scaling') && !service.autoScaled && service.saturation > 0.96 && service.replicas < 8) {
      service.autoScaled = true;
      service.replicas += 1;
      addEvent(run, `Adaptive Autoscaling added a ${service.name} replica at the saturation line.`, 'info');
    }
    if (hasCard(run, 'aggressive-retry') && service.health > 84 && !run.resolved) {
      service.retryMultiplier = Math.max(service.retryMultiplier, 1.04);
    }
    service.cpu = clamp(service.cpu, 0, 100);
    service.memory = clamp(service.memory, 0, 100);
    service.latency = clamp(service.latency, 1, 99999);
    service.errors = clamp(service.errors, 0, 100);
    service.queue = clamp(service.queue, 0, 99999);
    service.connectionUtilization = clamp(service.connectionUtilization, 0, 100);
    service.cacheFreshness = clamp(service.cacheFreshness, 0, 100);
    service.certificateTtl = clamp(service.certificateTtl, 0, 100);
    service.replicas = clamp(Math.round(service.replicas), 1, 12);
    service.status = statusFor(service);
  }

  function customerImpact(run) {
    const gateway = serviceById(run, 'gateway');
    if (!gateway) return { affectedRequestPct: 0, timeoutPct: 0, errorPct: 0, loadShedPct: 0, checkoutSuccessRate: 100, p95: 0 };
    const timeoutPct = clamp(Math.max(0, gateway.latency - gateway.base.latency) / 30 + Math.max(0, gateway.queue - gateway.base.queue) / 75, 0, 100);
    const errorPct = clamp(gateway.errors * 0.92, 0, 100);
    const loadShedPct = clamp(Math.max(0, gateway.saturation - 1) * 32 + gateway.loadShed * 100, 0, 100);
    const affectedRequestPct = clamp(timeoutPct * 0.52 + errorPct * 0.36 + loadShedPct * 0.42, 0, 100);
    return { affectedRequestPct: round(affectedRequestPct, 2), timeoutPct: round(timeoutPct, 2), errorPct: round(errorPct, 2), loadShedPct: round(loadShedPct, 2), checkoutSuccessRate: round(100 - affectedRequestPct, 2), p95: Math.round(gateway.latency) };
  }

  function isImpacted(service) {
    const latencySlo = sloValue(service, 'latencySlo', service.base ? service.base.latency * 1.35 : Infinity);
    const errorSlo = sloValue(service, 'errorSlo', service.base ? service.base.errors + 1.2 : Infinity);
    const queueSlo = sloValue(service, 'queueSlo', service.base ? service.base.queue + 18 : Infinity);
    return service.health < 90
      || service.latency > latencySlo
      || service.errors > errorSlo
      || service.queue > queueSlo
      || service.saturation > 1.05
      || service.connectionUtilization > 92
      || service.cacheFreshness < 70
      || service.certificateTtl < 35;
  }

  function edgesSnapshot(run) {
    const edges = [];
    run.services.forEach((caller) => caller.dependencies.forEach((dependencyId) => {
      const dependency = serviceById(run, dependencyId);
      if (!dependency) return;
      const weight = caller.callWeights[dependencyId] || 1;
      const circuit = caller.circuitOpen || dependency.circuitOpen;
      edges.push({
        from: caller.id,
        to: dependency.id,
        requestRate: Math.round(caller.requestRate * weight * (caller.retryMultiplier || 1) * (circuit ? 0.28 : 1)),
        latency: Math.round(dependency.latency),
        errors: round(dependency.errors, 2),
        queue: Math.round(dependency.queue),
        circuitOpen: Boolean(circuit),
        route: dependency.route || 'primary'
      });
    }));
    return edges;
  }

  function observableService(service) {
    return {
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
      requestRate: Math.round(service.requestRate),
      incomingRequests: Math.round(service.incomingRequests),
      capacity: Math.round(service.capacity),
      saturation: round(service.saturation, 3),
      connectionUtilization: round(service.connectionUtilization),
      cacheFreshness: round(service.cacheFreshness),
      certificateTtl: round(service.certificateTtl),
      retryMultiplier: round(service.retryMultiplier, 2),
      latencySlo: service.base.latencySlo,
      errorSlo: service.base.errorSlo,
      queueSlo: service.base.queueSlo,
      memorySlo: service.base.memorySlo,
      successRate: round(clamp(100 - service.errors - Math.max(0, service.latency / service.base.latency - 1) * 4, 0, 100), 2),
      timeoutRate: round(clamp(Math.max(0, service.latency / service.base.latency - 1) * 5, 0, 100), 2),
      status: service.status,
      circuitOpen: Boolean(service.circuitOpen),
      failover: Boolean(service.failover),
      route: service.route || 'primary'
    };
  }

  function causalChain(run, target) {
    const chain = [target];
    const visited = Object.create(null);
    visited[target] = true;
    let current = target;
    for (let index = 0; index < run.services.length; index += 1) {
      const caller = run.services.find((service) => service.dependencies.includes(current) && !visited[service.id]);
      if (!caller) break;
      chain.push(caller.id);
      visited[caller.id] = true;
      current = caller.id;
    }
    return chain;
  }

  function postmortem(run) {
    if (!run.complete) return null;
    const primary = run.scenario.primary;
    return {
      rootCause: primary.cause,
      mechanic: primary.id,
      causalChain: causalChain(run, primary.target),
      affectedServices: Object.keys(run.peakImpactedServices),
      actionLog: run.actionLog.slice(),
      stateHashes: run.finalStateHashes.slice(),
      verification: 'Cause revealed after the incident; active snapshots expose telemetry, not the answer key.'
    };
  }

  function updatePeaks(run, impact, services) {
    run.peakImpact = Math.max(run.peakImpact, impact.affectedRequestPct);
    services.filter(isImpacted).forEach((service) => { run.peakImpactedServices[service.id] = true; });
  }

  function snapshot(run) {
    const services = run.services.map(observableService);
    const impact = customerImpact(run);
    const averageHealth = services.reduce((sum, service) => sum + service.health, 0) / services.length;
    const impactedServices = services.filter(isImpacted).map((service) => service.id);
    const blastRadius = impactedServices.length;
    const phase = run.complete
      ? (run.success ? 'STABILIZED' : 'OUTAGE')
      : (run.resolved ? 'RECOVERING' : (impact.affectedRequestPct > 28 ? 'CRITICAL' : (impact.affectedRequestPct > 7 || blastRadius > 0 ? 'DEGRADING' : (run.stageTime > 0 ? 'INVESTIGATING' : 'STANDBY'))));
    const result = {
      engineVersion: VERSION,
      seed: run.seed,
      mode: run.mode,
      time: round(run.stageTime, 1),
      elapsed: round(run.elapsed, 1),
      stage: run.stage,
      totalStages: TOTAL_STAGES,
      services,
      edges: edgesSnapshot(run),
      impact: impact.affectedRequestPct,
      customerImpact: impact,
      averageHealth: round(averageHealth),
      blastRadius,
      impactedServices,
      phase,
      resolved: run.resolved,
      complete: run.complete,
      incidentComplete: run.incidentComplete,
      runComplete: run.runComplete,
      awaitingUpgrade: run.awaitingUpgrade,
      replayBuild: run.replayBuild,
      success: run.success,
      runSuccess: run.runComplete ? run.success : null,
      scenario: publicScenario(run),
      build: run.build.slice(),
      buildCards: cardMetadata(run.build),
      runbookStates: cardStates(run),
      upgradeOptions: upgradeOptions(run),
      stagesCompleted: run.runComplete ? TOTAL_STAGES : Math.max(0, run.stage - 1),
      unnecessaryChanges: run.stageUnnecessaryChanges,
      totalUnnecessaryChanges: run.totalUnnecessaryChanges,
      diagnosed: run.diagnosed,
      actionCount: run.actionLog.length
    };
    if (run.complete) result.postmortem = postmortem(run);
    result.stateHash = run.hashSnapshots === false ? null : hashState(result);
    return result;
  }

  function recordSnapshot(run) {
    const current = snapshot(run);
    if (run.captureHistory !== false) {
      run.history.push(current);
      if (run.history.length > 3600) run.history.shift();
    }
    updatePeaks(run, current.customerImpact, current.services);
    return current;
  }

  function sloHealthy(run) {
    const impact = customerImpact(run);
    // Warnings are expected while a distributed system is draining queues and
    // rebuilding caches. Recovery requires the customer path to be inside its
    // SLO and no uncontained service to remain critical; requiring every node
    // to be green would turn normal tail recovery into a false outage.
    const uncontainedCritical = run.services.filter((service) => service.status === 'critical' && !service.failover && !service.circuitOpen);
    return impact.affectedRequestPct < 6 && uncontainedCritical.length === 0;
  }

  function applyCausalMitigation(run, actionId, target) {
    const primary = run.scenario && run.scenario.primary;
    if (!primary || !target) return;
    const isRoot = primary.target === target.id;
    const strengthen = (faultMitigation, suppression) => {
      target.faultMitigation = Math.min(target.faultMitigation, faultMitigation);
      target.incidentSuppression = Math.max(target.incidentSuppression || 0, suppression);
    };

    // These are physical responses to the observable fault mode—not an answer
    // key. The engine still declares success only after customer SLOs settle.
    if (isRoot && primary.id === 'db-exhaustion' && actionId === 'failover') strengthen(0.06, 0.98);
    if (isRoot && primary.id === 'region-degradation' && actionId === 'failover') strengthen(0.08, 0.96);
    if (isRoot && (primary.id === 'edge-surge' || primary.id === 'queue-backlog') && actionId === 'scale') strengthen(0.08, 0.94);
    if (isRoot && primary.id === 'retry-regression' && actionId === 'circuit') strengthen(0.08, 0.94);
    if (isRoot && (primary.id === 'cache-staleness' || primary.id === 'certificate-expiry' || primary.id === 'memory-leak') && actionId === 'restart') strengthen(0.08, 0.94);
    if (isRoot && primary.id === 'deployment-regression' && actionId === 'rollback') strengthen(0.06, 0.95);
    if (isRoot && primary.id === 'dns-flap' && (actionId === 'restart' || actionId === 'failover' || actionId === 'circuit')) strengthen(0.12, 0.88);

    // Containing a caller is useful when it directly depends on the failing
    // boundary, even though the boundary itself may need a separate action.
    if (!isRoot && actionId === 'circuit' && target.dependencies.includes(primary.target)) strengthen(0.3, 0.72);
  }

  function finish(run, success) {
    if (run.complete) return;
    run.complete = true;
    run.incidentComplete = true;
    run.success = Boolean(success);
    run.resolved = Boolean(success);
    run.awaitingUpgrade = Boolean(success && run.stage < TOTAL_STAGES);
    run.runComplete = Boolean(!success || run.stage >= TOTAL_STAGES);
    run.totalUnnecessaryChanges += run.stageUnnecessaryChanges;
    addEvent(run, success ? `Incident ${run.stage}/${TOTAL_STAGES} stabilized through observable SLO recovery.` : 'The shift expired before customer SLOs recovered.', success ? 'info' : 'critical');
    if (run.runComplete) addEvent(run, success ? `Run complete. Final build: ${run.build.length ? run.build.join(' · ') : 'baseline operations'}.` : 'Run ended. Re-run the build and change less, earlier.', success ? 'info' : 'critical');
    else addEvent(run, `Choose one runbook before incident ${run.stage + 1}.`, 'info');
  }

  function advance(run, dt) {
    if (!run || run.complete) return { snapshot: run ? snapshot(run) : null, events: run ? drainEvents(run) : [], complete: true };
    const requestedSeconds = Number.isFinite(Number(dt)) ? Math.max(0, Math.min(1, Number(dt))) : TICK_SECONDS;
    const previousStageTime = run.stageTime;
    run.stageTime = Math.min(run.maxTime, run.stageTime + requestedSeconds);
    // Decimal 0.1 ticks eventually land at 89.999999999999, which used to
    // leave a worker alive forever at the visible time limit. Snap the boundary
    // so recruiter mode always reaches a terminal postmortem deterministically.
    if (run.maxTime - run.stageTime < 1e-9) run.stageTime = run.maxTime;
    const seconds = Math.max(0, run.stageTime - previousStageTime);
    const previousById = Object.fromEntries(run.services.map((service) => [service.id, cloneService(service)]));
    run.elapsed += seconds;
    run.actionCooldown = Math.max(0, run.actionCooldown - seconds);
    run.services.forEach((service) => updateService(run, service, previousById));
    if (!run.resolved && run.actionLog.some((entry) => entry.stage === run.stage && entry.action !== 'inspect') && sloHealthy(run)) run.stableTicks += 1;
    else if (!run.resolved) run.stableTicks = Math.max(0, run.stableTicks - 1);
    if (!run.resolved && run.stableTicks >= 28) {
      run.resolved = true;
      run.recoveryTime = 0;
      addEvent(run, 'Customer SLOs are back inside the safety envelope. Hold the line and watch recovery.', 'info');
    }
    if (run.resolved) run.recoveryTime += seconds;
    if (run.resolved && run.recoveryTime >= 3.5 && sloHealthy(run)) finish(run, true);
    else if (!run.resolved && run.stageTime >= run.maxTime) finish(run, false);
    let current = recordSnapshot(run);
    if (run.complete) {
      run.finalStateHashes = run.history.map((entry) => entry.stateHash);
      current = snapshot(run);
      run.history[run.history.length - 1] = current;
    }
    return { snapshot: current, events: drainEvents(run), complete: run.complete };
  }

  function evidenceFor(run, targetId) {
    const service = serviceById(run, targetId);
    if (!service) return 'No telemetry is available for that service.';
    const dependencies = service.dependencies.map((id) => {
      const dependency = serviceById(run, id);
      return dependency ? `${dependency.short} ${Math.round(dependency.latency)}ms/${round(dependency.errors, 1)}% errors` : id;
    }).join('; ');
    return `Trace sample ${service.short}: ${Math.round(service.requestRate)} req/s, p95 ${Math.round(service.latency)}ms, ${round(service.errors, 1)}% errors, queue ${Math.round(service.queue)}. Dependencies: ${dependencies || 'data boundary'}.`;
  }

  function potentiallyUseful(actionId, target) {
    return (actionId === 'restart' && (target.errors > target.base.errors + 1 || target.memory > target.base.memory + 10 || target.restartGrace > 0))
      || (actionId === 'scale' && (target.saturation > 0.88 || target.cpu > 70 || target.queue > target.base.queue + 12))
      || (actionId === 'rollback' && (target.retryMultiplier > 1.08 || target.releasePressure > 0.08))
      || (actionId === 'circuit' && (target.dependencies.length > 0 || target.retryMultiplier > 1.08 || target.queue > target.base.queue + 12 || target.connectionUtilization > 85))
      || (actionId === 'failover' && (target.role === 'data' || target.connectionUtilization > 85 || target.failoverCapacity));
  }

  function applyAction(run, actionId, targetId, actionToken) {
    if (!run || run.complete || !ACTIONS.includes(actionId)) return { accepted: false, reason: run && run.complete ? 'complete' : 'invalid-action', snapshot: run ? snapshot(run) : null, events: [] };
    const target = serviceById(run, targetId);
    if (!target) return { accepted: false, reason: 'invalid-target', snapshot: snapshot(run), events: [] };
    const token = String(actionToken || `${run.seed}:${run.stage}:${run.actionSequence + 1}:${actionId}:${targetId}`);
    if (run.processedActionIds[token]) return { accepted: false, duplicate: true, reason: 'duplicate-action', snapshot: snapshot(run), events: [] };
    if (run.actionCooldown > 0 && actionId !== 'inspect') return { accepted: false, reason: 'cooldown', snapshot: snapshot(run), events: [] };
    run.processedActionIds[token] = true;
    run.actionSequence += 1;
    run.actionLog.push({ token, action: actionId, target: targetId, time: round(run.stageTime, 1), stage: run.stage });
    if (actionId === 'inspect') {
      run.diagnosed = true;
      addEvent(run, evidenceFor(run, targetId), 'info');
      return { accepted: true, snapshot: recordSnapshot(run), events: drainEvents(run) };
    }
    if (!potentiallyUseful(actionId, target)) run.stageUnnecessaryChanges += 1;
    if (actionId === 'restart') {
      target.restartGrace = 10;
      target.faultMitigation = Math.min(target.faultMitigation, 0.62);
      target.recoveryBoost = 0.3;
      target.incidentSuppression = Math.max(target.incidentSuppression || 0, 0.58);
      target.errors *= 0.62;
      target.queue = Math.max(target.base.queue, target.queue - target.base.queue * 0.35);
      if (target.id === 'cache') target.cacheFreshness = 100;
      if (target.id === 'auth') target.certificateTtl = 100;
      if (target.id === 'inventory') target.memory = target.base.memory;
      if (target.id === 'postgres') target.connectionUtilization = Math.min(target.connectionUtilization, target.base.connectionUtilization + 8);
      target.health = clamp(target.health + 5, 0, 100);
      addEvent(run, `${target.name} restarted. Process symptoms are quieter; dependency telemetry still matters.`, 'warning');
    } else if (actionId === 'scale') {
      target.replicas = clamp(target.replicas + 2, 1, 12);
      target.faultMitigation = Math.min(target.faultMitigation, 0.55);
      target.incidentSuppression = Math.max(target.incidentSuppression || 0, 0.12);
      target.capacity = Math.max(40, target.replicas * target.base.capacityPerReplica) * (1 - (target.failoverCapacity || 0));
      target.saturation = target.incomingRequests / target.capacity;
      target.recoveryBoost = Math.max(target.recoveryBoost, 0.18);
      target.health = clamp(target.health + 3, 0, 100);
      addEvent(run, `${target.name} gained two replicas. Watch whether downstream request pressure rises with capacity.`, 'warning');
    } else if (actionId === 'rollback') {
      target.releasePressure = 0;
      target.faultMitigation = Math.min(target.faultMitigation, hasCard(run, 'conservative-deployments') ? 0.24 : 0.34);
      target.incidentSuppression = Math.max(target.incidentSuppression || 0, hasCard(run, 'conservative-deployments') ? 0.9 : 0.82);
      target.retryMultiplier = Math.max(1, target.retryMultiplier - (hasCard(run, 'conservative-deployments') ? 0.65 : 0.42));
      target.errors *= hasCard(run, 'conservative-deployments') ? 0.38 : 0.62;
      target.latency *= hasCard(run, 'conservative-deployments') ? 0.62 : 0.8;
      target.recoveryBoost = 0.42;
      target.health = clamp(target.health + 7, 0, 100);
      addEvent(run, `${target.name} rolled back. Compare the next telemetry window with the previous release.`, 'info');
    } else if (actionId === 'circuit') {
      target.circuitOpen = true;
      target.faultMitigation = Math.min(target.faultMitigation, 0.62);
      target.loadShed = 0.08;
      target.incidentSuppression = Math.max(target.incidentSuppression || 0, 0.55);
      target.faultMitigation = Math.min(target.faultMitigation, 0.72);
      target.requestRate *= 0.28;
      target.queue = Math.max(target.base.queue, target.queue - target.base.queue * 0.42);
      target.errors += 0.8;
      addEvent(run, `Circuit opened around ${target.name}. Downstream pressure is being shed at the boundary.`, 'warning');
    } else if (actionId === 'failover') {
      target.failover = true;
      target.faultMitigation = Math.min(target.faultMitigation, hasCard(run, 'chaos-tested') ? 0.16 : 0.28);
      target.failoverCapacity = hasCard(run, 'chaos-tested') ? 0.08 : 0.16;
      target.incidentSuppression = Math.max(target.incidentSuppression || 0, hasCard(run, 'chaos-tested') ? 0.94 : 0.86);
      target.route = 'secondary';
      target.recoveryBoost = hasCard(run, 'chaos-tested') ? 0.72 : 0.45;
      target.health = clamp(target.health + (hasCard(run, 'chaos-tested') ? 16 : 9), 0, 100);
      target.latency *= hasCard(run, 'chaos-tested') ? 0.68 : 0.84;
      target.errors *= hasCard(run, 'chaos-tested') ? 0.48 : 0.72;
      addEvent(run, `${target.name} is routing through the secondary path. Verify its remaining capacity.`, 'info');
    }
    applyCausalMitigation(run, actionId, target);
    run.actionCooldown = hasCard(run, 'trace-sampling') ? 0.55 : 1.1;
    target.status = statusFor(target);
    return { accepted: true, snapshot: recordSnapshot(run), events: drainEvents(run) };
  }

  function chooseUpgrade(run, cardId) {
    if (!run || !run.awaitingUpgrade || run.runComplete || run.replayBuild) return { accepted: false, reason: 'not-awaiting-upgrade', snapshot: run ? snapshot(run) : null, events: [] };
    const card = upgradeOptions(run).find((candidate) => candidate.id === cardId);
    if (!card) return { accepted: false, reason: 'card-not-offered', snapshot: snapshot(run), events: [] };
    run.build.push(card.id);
    addEvent(run, `Runbook installed: ${card.name}. ${card.benefit}`, 'info');
    run.stage += 1;
    resetIncident(run);
    addEvent(run, `Incident ${run.stage}/${TOTAL_STAGES}: new telemetry window open.`, 'warning');
    return { accepted: true, snapshot: recordSnapshot(run), events: drainEvents(run) };
  }

  function continueReplay(run) {
    if (!run || !run.awaitingUpgrade || run.runComplete) return { accepted: false, reason: 'not-awaiting-upgrade', snapshot: run ? snapshot(run) : null, events: [] };
    addEvent(run, `Replaying the installed build: ${run.build.length ? run.build.join(' · ') : 'baseline operations'}.`, 'info');
    run.stage += 1;
    resetIncident(run);
    addEvent(run, `Incident ${run.stage}/${TOTAL_STAGES}: new telemetry window open.`, 'warning');
    return { accepted: true, snapshot: recordSnapshot(run), events: drainEvents(run) };
  }

  function replay(run, index) {
    if (!run || !run.history.length) return null;
    const safeIndex = clamp(Number(index) || 0, 0, run.history.length - 1);
    return run.history[safeIndex];
  }

  function runTicks(run, count, actionSchedule) {
    const schedule = Array.isArray(actionSchedule) ? actionSchedule.slice().sort((a, b) => a.at - b.at) : [];
    let cursor = 0;
    const snapshots = [];
    for (let index = 0; index < count && !run.complete; index += 1) {
      const nextTime = run.stageTime + TICK_SECONDS;
      while (cursor < schedule.length && schedule[cursor].at <= nextTime + 1e-9) {
        while (run.stageTime < schedule[cursor].at - 1e-9 && !run.complete) advance(run, TICK_SECONDS);
        applyAction(run, schedule[cursor].action, schedule[cursor].target, schedule[cursor].actionId);
        cursor += 1;
      }
      if (!run.complete) snapshots.push(advance(run, TICK_SECONDS).snapshot);
    }
    return { run, snapshots, final: snapshot(run) };
  }

  return {
    VERSION,
    TICK_SECONDS,
    TOTAL_STAGES,
    ACTIONS: ACTIONS.slice(),
    SERVICE_DEFINITIONS: SERVICE_DEFINITIONS.map((item) => ({ ...item, dependencies: item.dependencies.slice(), callWeights: { ...item.callWeights }, base: { ...item.base } })),
    INCIDENT_TEMPLATES: INCIDENT_TEMPLATES.map((item) => ({ ...item })),
    RUNBOOK_CARDS: RUNBOOK_CARDS.map((card) => ({ ...card, targets: card.targets.slice(), prerequisites: card.prerequisites.slice() })),
    hashSeed,
    normalizeSeed,
    normalizeBuild,
    stableStringify,
    hashState,
    createRun,
    resetIncident,
    snapshot,
    recordSnapshot,
    drainEvents,
    advance,
    applyAction,
    chooseUpgrade,
    continueReplay,
    replay,
    runTicks,
    isImpacted
  };
}));
