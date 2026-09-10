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
  const ACTIONS = ['inspect', 'restart', 'scale', 'rollback', 'circuit', 'failover', 'hold'];
  const REQUIRED_STABLE_SECONDS = { recruiter: 3, normal: 4, sev0: 5 };
  const STAGE_PROFILES = {
    1: { name: 'SIGNAL', primary: 0.72, modifier: 0, boss: false },
    2: { name: 'CASCADE', primary: 0.84, modifier: 0.16, boss: false },
    3: { name: 'COMPOUND FAILURE', primary: 0.96, modifier: 0.32, boss: false },
    4: { name: 'SEV-0', primary: 1.08, modifier: 0.48, boss: true }
  };
  const BUILD_SYNERGIES = [
    { id: 'controlled-aggression', name: 'Controlled Aggression', cards: ['bulkhead', 'aggressive-retry'], description: 'Retry pressure is contained before it can fan out.' },
    { id: 'multi-region-ready', name: 'Multi-Region Ready', cards: ['chaos-tested'], description: 'Failover routes carry a larger safety margin.' },
    { id: 'change-detective', name: 'Change Detective', cards: ['trace-sampling', 'conservative-deployments'], description: 'Release signals are easier to verify before rollback.' },
    { id: 'elastic-edge', name: 'Elastic Edge', cards: ['adaptive-scaling', 'bulkhead'], description: 'Capacity can grow without surrendering the dependency boundary.' }
  ];
  const EMERGENCY_RUNBOOKS = [
    { id: 'load-shed', name: 'Load Shed', label: 'EMERGENCY', description: 'Drop non-critical edge traffic for 12 seconds.', charges: 1, cooldown: 0, duration: 12, target: 'gateway', cost: 0.8 },
    { id: 'warm-failover', name: 'Warm Failover', label: 'EMERGENCY', description: 'Prepare the secondary route before the next failover.', charges: 1, cooldown: 0, duration: 0, target: 'postgres', cost: 0.5 },
    { id: 'connection-drain', name: 'Connection Drain', label: 'EMERGENCY', description: 'Stop new database connections while existing work drains.', charges: 1, cooldown: 0, duration: 8, target: 'postgres', cost: 0.7 },
    { id: 'freeze-deployments', name: 'Freeze Deployments', label: 'EMERGENCY', description: 'Prevent release pressure from increasing for 15 seconds.', charges: 1, cooldown: 0, duration: 15, target: 'pricing', cost: 0.4 },
    { id: 'cache-bypass', name: 'Cache Bypass', label: 'EMERGENCY', description: 'Trade freshness for direct source reads for 10 seconds.', charges: 1, cooldown: 0, duration: 10, target: 'cache', cost: 0.6 }
  ];
  const ACTION_COSTS = { restart: 0.8, scale: 1.8, rollback: 0.6, circuit: 0.7, failover: 1, hold: 0 };
  const REQUIRED_CATASTROPHIC_SECONDS = 5;
  const BETWEEN_INCIDENT_RECOVERY = 10;
  const OPERATION_DURATIONS = { restart: 8, scale: 5, rollback: 6, failover: 4 };

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

  function stageProfile(stage, difficulty) {
    const base = STAGE_PROFILES[Math.max(1, Math.min(TOTAL_STAGES, Number(stage) || 1))] || STAGE_PROFILES[1];
    const multiplier = difficulty === 'apprentice' ? 0.9 : (difficulty === 'sev-0' ? 1.08 : (difficulty === 'recruiter' ? 0.88 : 1));
    return { ...base, primary: base.primary * multiplier, modifier: base.modifier * multiplier };
  }

  function stabilizationRequired(run) {
    if (run && run.mode === 'recruiter') return REQUIRED_STABLE_SECONDS.recruiter;
    if (run && run.difficulty === 'sev-0') return REQUIRED_STABLE_SECONDS.sev0;
    return REQUIRED_STABLE_SECONDS.normal;
  }

  function normalizeDifficulty(mode, value) {
    if (mode === 'recruiter') return 'recruiter';
    const normalized = String(value || '').toLowerCase();
    return ['apprentice', 'on-call', 'sev-0'].includes(normalized) ? normalized : 'on-call';
  }

  function dailySeed(dateValue) {
    const date = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(date.getTime())) return normalizeSeed('20260910');
    return normalizeSeed(`${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(date.getUTCDate()).padStart(2, '0')}`);
  }

  function cloneOperation(operation) {
    return operation ? { ...operation } : null;
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

  function scenarioFor(seed, stage, build, difficulty) {
    const profile = stageProfile(stage, difficulty);
    const primary = INCIDENT_TEMPLATES[hashSeed(`${seed}|incident|${stage}|${build.join(':')}`) % INCIDENT_TEMPLATES.length];
    const modifier = INCIDENT_TEMPLATES[hashSeed(`${seed}|modifier|${stage}|${build.join(':')}`) % INCIDENT_TEMPLATES.length];
    const noise = 0.92 + ((hashSeed(`${seed}|severity|${stage}|${primary.id}`) % 17) / 100);
    const bossTitles = ['The Retry Storm', 'Midnight Certificate', 'The Friday Release', 'Region Blackout'];
    const bossTitle = profile.boss ? bossTitles[hashSeed(`${seed}|boss|${stage}`) % bossTitles.length] : primary.title;
    return {
      id: `${primary.id}${profile.modifier && modifier.id !== primary.id ? `-${modifier.id}` : ''}`,
      code: primary.code,
      title: bossTitle,
      description: profile.boss ? `${primary.description} This is a SEV-0 compound failure: treat every new signal as a possible multiplier.` : primary.description,
      symptom: primary.symptom,
      stageName: profile.name,
      boss: profile.boss,
      primary: { ...primary, severity: primary.severity * noise * profile.primary },
      modifier: profile.modifier && modifier.id !== primary.id ? { id: modifier.id, family: modifier.family, target: modifier.target, severity: modifier.severity * noise * profile.modifier } : null,
      modifierDelay: profile.boss ? 28 : (stage >= 3 ? 20 : (stage === 2 ? 10 : 0))
    };
  }

  function publicScenario(run) {
    // The active incident card is an observation surface. Do not serialize the
    // template id or primary incident code: both are answer-key metadata that
    // would let a player (or NOVA) skip the causal investigation.
    const opaqueCode = `INC-${hashSeed(`${run.seed}|public-incident|${run.stage}`).toString(16).toUpperCase().slice(-4).padStart(4, '0')}`;
    return { id: `incident-${run.stage}`, code: opaqueCode, title: run.scenario.title, description: run.scenario.description, symptom: run.scenario.symptom };
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

  function operationProgress(service) {
    if (!service || !service.operation) return 1;
    const operation = service.operation;
    if (!operation.duration) return 0;
    return clamp(1 - (Number(operation.remaining) || 0) / operation.duration, 0, 1);
  }

  function tickOperation(run, service, seconds) {
    if (!service.operation) return;
    const operation = service.operation;
    operation.remaining = Math.max(0, (Number(operation.remaining) || 0) - seconds);
    service.capacityReadiness = operationProgress(service);
    if (operation.remaining > 0) return;
    if (operation.type === 'scale' && service.desiredReplicas > service.replicas) {
      const added = service.desiredReplicas - service.replicas;
      service.replicas = service.desiredReplicas;
      service.capacityReadiness = 1;
      addEvent(run, `${service.name} provisioning complete: ${service.replicas} replicas are serving traffic.`, 'info');
      operation.completed = `${added} replicas ready`;
    } else if (operation.type === 'failover') {
      service.route = 'secondary';
      service.failover = true;
      service.failoverCapacity = operation.finalFailoverCapacity || service.failoverCapacity || 0.16;
      service.capacityReadiness = 1;
      service.warmFailover = false;
      addEvent(run, `${service.name} routing transition complete. Secondary traffic is live.`, 'info');
      operation.completed = 'secondary route live';
    } else if (operation.type === 'rollback') {
      service.capacityReadiness = 1;
      addEvent(run, `${service.name} rollback complete. Comparing the known-good release window.`, 'info');
      operation.completed = 'known-good release live';
    } else if (operation.type === 'restart') {
      service.capacityReadiness = 1;
      addEvent(run, `${service.name} cold start complete. Watching the next telemetry window.`, 'info');
      operation.completed = 'cold start complete';
    }
    service.operation = null;
  }

  function operationSnapshot(service) {
    if (!service || !service.operation) return null;
    return { type: service.operation.type, remaining: round(service.operation.remaining, 1), duration: service.operation.duration, progress: round(operationProgress(service), 2) };
  }

  function emergencyStates(run) {
    return EMERGENCY_RUNBOOKS.map((card) => {
      const state = run.emergencyState && run.emergencyState[card.id] ? run.emergencyState[card.id] : { charges: card.charges, cooldown: 0 };
      return { ...card, charges: state.charges, cooldown: round(state.cooldown, 1), activeUntil: round(state.activeUntil || 0, 1), available: state.charges > 0 && state.cooldown <= 0 };
    });
  }

  function activeSynergies(run) {
    return BUILD_SYNERGIES.filter((synergy) => synergy.cards.every((cardId) => run.build.includes(cardId))).map((synergy) => ({ ...synergy, cards: synergy.cards.slice() }));
  }

  function addConsequence(run, details) {
    const consequence = {
      time: round(run.stageTime, 1),
      stage: run.stage,
      action: details.action,
      target: details.target || null,
      kind: details.kind || 'neutral',
      summary: details.summary,
      impactBefore: round(details.impactBefore || 0, 2),
      impactAfter: round(details.impactAfter || 0, 2),
      budgetCost: round(details.budgetCost || 0, 2),
      targetBefore: details.targetBefore || null,
      targetAfter: details.targetAfter || null
    };
    run.lastConsequence = consequence;
    run.consequenceLog.push(consequence);
    return consequence;
  }

  function budgetDrain(run, impact, blastRadius, seconds) {
    if (!seconds || !run) return 0;
    const radiusPenalty = impact > 20 ? Math.max(0, blastRadius - 2) * 0.025 : 0;
    const catastrophicPenalty = impact > 60 ? 0.35 : (impact > 40 ? 0.08 : 0);
    const difficultyFactor = run.difficulty === 'sev-0' ? 1.18 : (run.difficulty === 'apprentice' ? 0.78 : 1);
    const drain = (impact / 25 + radiusPenalty + catastrophicPenalty) * seconds * difficultyFactor;
    run.reliabilityBudget = clamp(run.reliabilityBudget - drain, 0, 100);
    run.budgetBurned += drain;
    run.stageBudgetBurn += drain;
    run.stageImpactSeconds += impact * seconds;
    run.impactSeconds += impact * seconds;
    run.availabilitySeconds += Math.max(0, 100 - impact) * seconds;
    return drain;
  }

  function classifyConsequence(beforeImpact, afterImpact, action, targetBefore) {
    if (action === 'inspect' || action === 'hold') return 'informative';
    if (afterImpact < beforeImpact - 0.25) return 'helpful';
    if (afterImpact > beforeImpact + 0.25) return 'harmful';
    // A change can be harmful before the customer aggregate moves. Starting a
    // cold operation on a healthy service, or opening a circuit on a healthy
    // path, is an observable operational risk even when the next 100 ms frame
    // has not propagated it through the graph yet.
    if (targetBefore && targetBefore.status === 'healthy' && ['restart', 'scale', 'circuit', 'failover'].includes(action)) return 'harmful';
    return 'neutral';
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
        incidentSuppression: 0,
        operation: null,
        capacityReadiness: 1,
        desiredCapacity: base.traffic * 1.4,
        desiredReplicas: base.replicas,
        failoverTransition: false,
        loadShedUntil: 0,
        connectionDrainUntil: 0,
        warmFailover: false,
        cacheBypassUntil: 0,
        trafficMultiplier: 1,
        outgoingPressure: 1,
        outgoingPressureUntil: 0,
        freezeDeploymentsUntil: 0
      };
      service.status = statusFor(service);
      return service;
    });
  }

  function resetIncident(run) {
    const topologyHash = hashSeed(`${run.seed}|topology|${run.stage}|${run.build.join(':')}`);
    run.scenario = scenarioFor(run.seed, run.stage, run.build, run.difficulty);
    run.services = baseServices(topologyHash);
    run.stageTime = 0;
    run.stageBudgetStart = run.reliabilityBudget;
    run.stageBudgetBurn = 0;
    run.stageImpactSeconds = 0;
    run.stagePeakImpact = 0;
    run.stagePeakBlastRadius = 0;
    run.incidentComplete = false;
    run.complete = false;
    run.success = false;
    run.awaitingUpgrade = false;
    run.resolved = false;
    run.lossReason = null;
    run.recoveryTime = 0;
    run.stableTicks = 0;
    run.stableTime = 0;
    run.stabilizationRequired = stabilizationRequired(run);
    run.catastrophicTime = 0;
    run.actionCooldown = 0;
    run.holdUntil = 0;
    run.diagnosed = false;
    run.stageUnnecessaryChanges = 0;
    run.stageActionStart = run.actionLog.length;
    run.stageConsequenceStart = run.consequenceLog.length;
    run.wasUnsafe = false;
    run.processedActionIds = Object.create(null);
    run.finalStateHashes = [];
    run.lastConsequence = null;
    if (!Array.isArray(run.consequenceLog)) run.consequenceLog = [];
    run.emergencyState = Object.fromEntries(EMERGENCY_RUNBOOKS.map((card) => [card.id, { charges: card.charges, cooldown: 0, activeUntil: 0 }]));
  }

  function createRun(seed, mode, build, replayBuild, difficulty) {
    const normalized = normalizeSeed(seed);
    const normalizedMode = mode === 'freeplay' ? 'freeplay' : 'recruiter';
    const normalizedDifficulty = normalizeDifficulty(normalizedMode, difficulty);
    const maxTime = normalizedMode === 'freeplay'
      ? (normalizedDifficulty === 'apprentice' ? 135 : (normalizedDifficulty === 'sev-0' ? 100 : 120))
      : 90;
    const run = {
      engineVersion: VERSION,
      seed: normalized,
      mode: normalizedMode,
      difficulty: normalizedDifficulty,
      stage: 1,
      build: normalizeBuild(build),
      replayBuild: Boolean(replayBuild),
      totalStages: TOTAL_STAGES,
      maxTime,
      // Keep enough frames for every incident plus action/event snapshots. A
      // fixed 3,600-frame cap silently dropped the first incident in a full
      // recruiter run, which made replay and the final hash ledger incomplete.
      historyLimit: (TOTAL_STAGES * Math.ceil(maxTime / TICK_SECONDS)) + 128,
      stageTime: 0,
      elapsed: 0,
      reliabilityBudget: 100,
      initialReliabilityBudget: 100,
      budgetBurned: 0,
      budgetRecovery: 0,
      budgetActionCost: 0,
      impactSeconds: 0,
      availabilitySeconds: 0,
      peakBlastRadius: 0,
      catastrophicEvents: 0,
      wasUnsafe: false,
      holdSeconds: 0,
      stageMetrics: [],
      completedStages: [],
      totalUnnecessaryChanges: 0,
      harmfulChanges: 0,
      pendingEvents: [],
      history: [],
      actionLog: [],
      actionSequence: 0,
      runComplete: false,
      incidentComplete: false,
      runStartedAt: normalized,
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
      score: null,
      grade: null,
      lossReason: null,
      lastConsequence: null,
      consequenceLog: [],
      scoreDetails: null,
      // The browser keeps history and hashes for replay. Audit/fuzz callers can
      // disable either capture path without changing the simulation physics.
      captureHistory: true,
      hashSnapshots: true,
      scenario: null,
      services: []
    };
    resetIncident(run);
    addEvent(run, `Incident ${run.stage}/${TOTAL_STAGES} · ${run.scenario.stageName}: telemetry is moving. Start from the customer symptom.`, 'warning');
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
    if (run.scenario.modifier && run.stageTime >= (run.scenario.modifierDelay || 0) && run.scenario.modifier.target === service.id) pressure += pressureAt(run, run.scenario.modifier.severity);
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
      const outgoingPressure = previous.outgoingPressureUntil > run.stageTime ? (previous.outgoingPressure || 1) : 1;
      demand += callerLoad * weight * 0.32 * retry * circuitFactor * outgoingPressure;
    });
    const dependencyContainment = hasCard(run, 'bulkhead')
      ? clamp(dependencyStress(run, service, previousById) * 0.22, 0, 0.22)
      : 0;
    const activeLoadShed = service.loadShedUntil > run.stageTime ? service.loadShed : 0;
    const connectionDrain = service.connectionDrainUntil > run.stageTime ? 0.34 : 0;
    const cacheBypass = service.cacheBypassUntil > run.stageTime ? 1.16 : 1;
    const shed = Math.max(activeLoadShed, dependencyContainment);
    return Math.max(1, demand * (1 - shed) * (1 - connectionDrain) * cacheBypass);
  }

  function updateService(run, service, previousById) {
    tickOperation(run, service, TICK_SECONDS);
    const direct = directPressure(run, service);
    const dependency = dependencyStress(run, service, previousById);
    const demand = incomingDemand(run, service, previousById);
    const failoverFactor = service.failover ? (service.failoverCapacity || 0.18) : 0;
    const readiness = service.operation ? clamp(service.capacityReadiness, 0.1, 1) : 1;
    const capacity = Math.max(40, service.replicas * service.base.capacityPerReplica * readiness + service.manualCapacity) * (1 - failoverFactor);
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
    const trafficMultiplier = service.trafficMultiplier || 1;
    const effectiveDemand = demand * trafficMultiplier;
    service.requestRate = Math.min(effectiveDemand, capacity * (service.circuitOpen ? 0.7 : 0.98));
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
    const releaseRetryTarget = service.releasePressure > 0 ? 1 + service.releasePressure * 1.4 : 1;
    const retryIncidentTarget = run.scenario.primary.target === service.id && run.scenario.primary.id === 'retry-regression'
      ? 1 + direct * 3.2
      : 1;
    service.retryMultiplier += (Math.max(releaseRetryTarget, retryIncidentTarget) - service.retryMultiplier) * 0.045;
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
    const activeLoadShed = gateway.loadShedUntil > run.stageTime ? gateway.loadShed : 0;
    const loadShedPct = clamp(Math.max(0, gateway.saturation - 1) * 32 + activeLoadShed * 100, 0, 100);
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
      route: service.route || 'primary',
      trafficMultiplier: round(service.trafficMultiplier || 1, 2),
      operation: operationSnapshot(service),
      capacityReadiness: round(service.capacityReadiness, 2),
      loadShedUntil: round(service.loadShedUntil, 1),
      connectionDrainUntil: round(service.connectionDrainUntil, 1),
      warmFailover: Boolean(service.warmFailover)
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
    const blastRadius = services.filter(isImpacted).length;
    run.peakImpact = Math.max(run.peakImpact, impact.affectedRequestPct);
    run.stagePeakImpact = Math.max(run.stagePeakImpact, impact.affectedRequestPct);
    run.peakBlastRadius = Math.max(run.peakBlastRadius, blastRadius);
    run.stagePeakBlastRadius = Math.max(run.stagePeakBlastRadius, blastRadius);
    services.filter(isImpacted).forEach((service) => { run.peakImpactedServices[service.id] = true; });
  }

  function scoreRun(run) {
    const availability = run.elapsed > 0 ? clamp(run.availabilitySeconds / (run.elapsed * 100), 0, 1) : 1;
    const mttr = Math.max(0, run.elapsed);
    const speed = clamp(1 - mttr / (run.maxTime * TOTAL_STAGES), 0, 1);
    const diagnosis = run.actionSequence ? clamp((run.diagnosed ? 1 : 0.35) - (run.totalUnnecessaryChanges * 0.04), 0, 1) : 0.2;
    const minimal = clamp(1 - run.totalUnnecessaryChanges * 0.07 - Math.max(0, run.actionSequence - TOTAL_STAGES * 3) * 0.01, 0, 1);
    const synergy = clamp(activeSynergies(run).length / 2, 0, 1);
    const harmful = run.consequenceLog.filter((entry) => entry.kind === 'harmful').length;
    const raw = availability * 3000 + run.reliabilityBudget * 20 + speed * 1500 + diagnosis * 1000 + minimal * 800 + synergy * 600 - harmful * 450 - run.catastrophicEvents * 400;
    const score = Math.max(0, Math.round(raw));
    const grade = score >= 8200 ? 'S+' : (score >= 7000 ? 'S' : (score >= 5600 ? 'A' : (score >= 4100 ? 'B' : (score >= 2600 ? 'C' : 'D'))));
    return { score, grade, availability: round(availability * 100, 2), mttr: round(mttr, 1), harmfulChanges: harmful, peakImpact: round(run.peakImpact, 2), peakBlastRadius: run.peakBlastRadius };
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
      difficulty: run.difficulty,
      stageName: run.scenario.stageName,
      services,
      edges: edgesSnapshot(run),
      impact: impact.affectedRequestPct,
      customerImpact: impact,
      averageHealth: round(averageHealth),
      reliabilityBudget: round(run.reliabilityBudget, 2),
      stageBudgetStart: round(run.stageBudgetStart, 2),
      stageBudgetBurn: round(run.stageBudgetBurn, 2),
      budgetBurned: round(run.budgetBurned, 2),
      budgetRecovery: round(run.budgetRecovery, 2),
      stability: { safe: sloHealthy(run), stableTime: round(run.stableTime, 1), required: run.stabilizationRequired, progress: round(clamp(run.stableTime / Math.max(0.1, run.stabilizationRequired), 0, 1), 2), lost: run.stableTime <= 0 && run.stageTime > 0 },
      catastrophicTime: round(run.catastrophicTime, 1),
      catastrophicWarning: impact.affectedRequestPct > 60 && impact.affectedRequestPct < 85,
      holdUntil: round(run.holdUntil, 1),
      holdSeconds: round(run.holdSeconds, 1),
      deadlineRemaining: round(Math.max(0, run.maxTime - run.stageTime), 1),
      actionCooldown: round(run.actionCooldown, 1),
      lastConsequence: cloneOperation(run.lastConsequence),
      consequences: run.consequenceLog.slice(-8),
      emergencyRunbooks: emergencyStates(run),
      synergies: activeSynergies(run),
      peakImpact: round(run.peakImpact, 2),
      peakBlastRadius: run.peakBlastRadius,
      score: run.score,
      grade: run.grade,
      scoreDetails: run.scoreDetails,
      lossReason: run.lossReason,
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
      actionCount: run.actionLog.length,
      actionLog: run.complete ? run.actionLog.slice() : undefined,
      stageMetrics: run.complete ? run.stageMetrics.slice() : undefined
    };
    if (run.complete) {
      const score = run.scoreDetails || scoreRun(run);
      run.scoreDetails = score;
      run.score = score.score;
      run.grade = score.grade;
      result.score = score.score;
      result.grade = score.grade;
      result.scoreDetails = score;
      result.postmortem = postmortem(run);
    }
    // Postmortem text is intentionally revealed only after completion and it
    // contains the hash ledger itself. Exclude that presentation-only object
    // from the state hash so the final frame cannot hash differently merely
    // because its postmortem was attached.
    if (run.hashSnapshots === false) {
      result.stateHash = null;
    } else {
      const hashPayload = { ...result };
      delete hashPayload.postmortem;
      result.stateHash = hashState(hashPayload);
    }
    return result;
  }

  function recordSnapshot(run) {
    // Update peak metrics before hashing the frame. Otherwise the terminal
    // frame would be hashed once before and once after peak bookkeeping, which
    // makes the postmortem ledger disagree with the replay slider.
    const observedServices = run.services.map(observableService);
    updatePeaks(run, customerImpact(run), observedServices);
    const current = snapshot(run);
    if (run.captureHistory !== false) {
      run.history.push(current);
      if (run.history.length > run.historyLimit) run.history.shift();
    }
    return current;
  }

  function sloHealthy(run) {
    const impact = customerImpact(run);
    // Warnings are expected while a distributed system is draining queues and
    // rebuilding caches. Recovery requires the customer path to be inside its
    // SLO and no uncontained service to remain critical; requiring every node
    // to be green would turn normal tail recovery into a false outage.
    const uncontainedCritical = run.services.filter((service) => service.status === 'critical' && !service.failover && !service.circuitOpen);
    const gateway = serviceById(run, 'gateway');
    return impact.affectedRequestPct < 6
      && (!gateway || (gateway.latency < 650 && gateway.errors < 3))
      && uncontainedCritical.length === 0;
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

  function finish(run, success, reason) {
    if (run.complete) return;
    run.complete = true;
    run.incidentComplete = true;
    run.success = Boolean(success);
    run.resolved = Boolean(success);
    run.lossReason = success ? null : (reason || 'deadline');
    run.awaitingUpgrade = Boolean(success && run.stage < TOTAL_STAGES);
    run.runComplete = Boolean(!success || run.stage >= TOTAL_STAGES);
    run.totalUnnecessaryChanges += run.stageUnnecessaryChanges;
    run.stageMetrics.push({
      stage: run.stage,
      name: run.scenario.stageName,
      success: run.success,
      time: round(run.stageTime, 1),
      budgetStart: round(run.stageBudgetStart, 2),
      budgetEnd: round(run.reliabilityBudget, 2),
      budgetBurn: round(run.stageBudgetBurn, 2),
      peakImpact: round(run.stagePeakImpact, 2),
      peakBlastRadius: run.stagePeakBlastRadius,
      actions: run.actionLog.slice(run.stageActionStart),
      consequences: run.consequenceLog.slice(run.stageConsequenceStart),
      holdSeconds: round(run.holdSeconds, 1),
      lossReason: run.lossReason
    });
    addEvent(run, success ? `Incident ${run.stage}/${TOTAL_STAGES} stabilized through observable SLO recovery.` : `Shift ended: ${run.lossReason === 'budget' ? 'reliability budget exhausted' : run.lossReason === 'catastrophic' ? 'customer impact remained above 85%' : 'the SLO window expired'}.`, success ? 'info' : 'critical');
    if (run.runComplete) {
      run.scoreDetails = scoreRun(run);
      run.score = run.scoreDetails.score;
      run.grade = run.scoreDetails.grade;
      addEvent(run, success ? `Run complete. Final build: ${run.build.length ? run.build.join(' · ') : 'baseline operations'}.` : 'Run ended. Re-run the build and change less, earlier.', success ? 'info' : 'critical');
    }
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
    run.emergencyState && Object.values(run.emergencyState).forEach((state) => { state.cooldown = Math.max(0, (state.cooldown || 0) - seconds); });
    const impact = customerImpact(run);
    const blastRadius = run.services.filter(isImpacted).length;
    if (impact.affectedRequestPct >= 6 || blastRadius > 0) run.wasUnsafe = true;
    budgetDrain(run, impact.affectedRequestPct, blastRadius, seconds);
    if (run.holdUntil > run.stageTime - 1e-9) run.holdSeconds += seconds;
    if (impact.affectedRequestPct > 85) run.catastrophicTime += seconds;
    else run.catastrophicTime = Math.max(0, run.catastrophicTime - seconds * 2);
    const hasIntervention = run.actionLog.some((entry) => entry.stage === run.stage && !['inspect', 'hold'].includes(entry.action));
    if (!run.resolved && hasIntervention && run.wasUnsafe && sloHealthy(run)) run.stableTime += seconds;
    else if (!run.resolved && !sloHealthy(run)) run.stableTime = Math.max(0, run.stableTime - seconds * 2);
    if (!run.resolved && run.stableTime >= run.stabilizationRequired) {
      run.resolved = true;
      run.recoveryTime = 0;
      addEvent(run, `SYSTEM STABILIZING · ${round(run.stabilizationRequired, 1)} seconds inside the safe envelope.`, 'info');
    }
    if (run.resolved) run.recoveryTime += seconds;
    if (run.reliabilityBudget <= 0) finish(run, false, 'budget');
    else if (run.catastrophicTime >= REQUIRED_CATASTROPHIC_SECONDS) {
      run.catastrophicEvents += 1;
      finish(run, false, 'catastrophic');
    } else if (run.resolved && run.recoveryTime >= 0.5 && sloHealthy(run)) finish(run, true);
    else if (run.stageTime >= run.maxTime) finish(run, false, 'deadline');
    let current = recordSnapshot(run);
    if (run.complete) {
      run.finalStateHashes = run.history.map((entry) => entry.stateHash);
      current = snapshot(run);
      run.history[run.history.length - 1] = current;
      run.finalStateHashes = run.history.map((entry) => entry.stateHash);
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
    const effectiveTargetId = actionId === 'hold' && !targetId ? 'gateway' : targetId;
    const target = serviceById(run, effectiveTargetId);
    if (!target) return { accepted: false, reason: 'invalid-target', snapshot: snapshot(run), events: [] };
    const token = String(actionToken || `${run.seed}:${run.stage}:${run.actionSequence + 1}:${actionId}:${targetId}`);
    if (run.processedActionIds[token]) return { accepted: false, duplicate: true, reason: 'duplicate-action', snapshot: snapshot(run), events: [] };
    if (run.actionCooldown > 0 && actionId !== 'inspect') return { accepted: false, reason: 'cooldown', snapshot: snapshot(run), events: [] };
    run.processedActionIds[token] = true;
    run.actionSequence += 1;
    const beforeImpact = customerImpact(run).affectedRequestPct;
    const beforeTarget = observableService(target);
    run.actionLog.push({ token, action: actionId, target: effectiveTargetId, time: round(run.stageTime, 1), stage: run.stage });
    if (actionId === 'inspect') {
      run.diagnosed = true;
      addConsequence(run, { action: actionId, target: effectiveTargetId, kind: 'informative', summary: `Telemetry inspected on ${target.name}.`, impactBefore: beforeImpact, impactAfter: beforeImpact, targetBefore: beforeTarget, targetAfter: beforeTarget });
      addEvent(run, evidenceFor(run, effectiveTargetId), 'info');
      return { accepted: true, snapshot: recordSnapshot(run), events: drainEvents(run) };
    }
    if (actionId === 'hold') {
      run.holdUntil = Math.max(run.holdUntil, run.stageTime + 5);
      addEvent(run, 'HOLD CHANGES · observing the next five seconds without touching infrastructure.', 'info');
      addConsequence(run, { action: actionId, target: effectiveTargetId, kind: 'informative', summary: 'No infrastructure change made. Observation window opened.', impactBefore: beforeImpact, impactAfter: beforeImpact, targetBefore: beforeTarget, targetAfter: beforeTarget });
      return { accepted: true, snapshot: recordSnapshot(run), events: drainEvents(run) };
    }
    if (!potentiallyUseful(actionId, target)) run.stageUnnecessaryChanges += 1;
    if (actionId === 'restart') {
      target.restartGrace = 8;
      target.operation = { type: 'restart', duration: OPERATION_DURATIONS.restart, remaining: OPERATION_DURATIONS.restart };
      target.capacityReadiness = 0.35;
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
      target.desiredReplicas = clamp(target.replicas + 2, 1, 12);
      target.operation = { type: 'scale', duration: OPERATION_DURATIONS.scale, remaining: OPERATION_DURATIONS.scale };
      target.capacityReadiness = 0.35;
      target.faultMitigation = Math.min(target.faultMitigation, 0.55);
      target.incidentSuppression = Math.max(target.incidentSuppression || 0, 0.12);
      target.capacity = Math.max(40, target.replicas * target.base.capacityPerReplica * target.capacityReadiness) * (1 - (target.failoverCapacity || 0));
      target.saturation = target.incomingRequests / target.capacity;
      target.recoveryBoost = Math.max(target.recoveryBoost, 0.18);
      target.health = clamp(target.health + 3, 0, 100);
      addEvent(run, `${target.name} gained two replicas. Watch whether downstream request pressure rises with capacity.`, 'warning');
    } else if (actionId === 'rollback') {
      target.releasePressure = 0;
      target.operation = { type: 'rollback', duration: OPERATION_DURATIONS.rollback, remaining: OPERATION_DURATIONS.rollback };
      target.capacityReadiness = 0.45;
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
      target.operation = { type: 'failover', duration: OPERATION_DURATIONS.failover, remaining: OPERATION_DURATIONS.failover, finalFailoverCapacity: hasCard(run, 'chaos-tested') ? 0.08 : (target.warmFailover ? 0.12 : 0.16) };
      target.capacityReadiness = 0.55;
      target.failoverTransition = true;
      target.faultMitigation = Math.min(target.faultMitigation, hasCard(run, 'chaos-tested') ? 0.16 : 0.28);
      target.failoverCapacity = hasCard(run, 'chaos-tested') ? 0.08 : 0.16;
      target.incidentSuppression = Math.max(target.incidentSuppression || 0, hasCard(run, 'chaos-tested') ? 0.94 : 0.86);
      target.route = 'secondary';
      target.recoveryBoost = hasCard(run, 'chaos-tested') ? 0.72 : 0.45;
      target.health = clamp(target.health + (hasCard(run, 'chaos-tested') ? 16 : 9), 0, 100);
      target.latency *= hasCard(run, 'chaos-tested') ? 0.68 : 0.84;
      target.errors *= hasCard(run, 'chaos-tested') ? 0.48 : 0.72;
      addEvent(run, `${target.name} is preparing a secondary route. Verify its remaining capacity.`, 'info');
    }
    applyCausalMitigation(run, actionId, target);
    const afterImpact = customerImpact(run).affectedRequestPct;
    const kind = classifyConsequence(beforeImpact, afterImpact, actionId, beforeTarget);
    const cost = ACTION_COSTS[actionId] || 0;
    run.budgetActionCost += cost;
    run.reliabilityBudget = clamp(run.reliabilityBudget - cost, 0, 100);
    if (kind === 'harmful') run.harmfulChanges += 1;
    addConsequence(run, {
      action: actionId,
      target: effectiveTargetId,
      kind,
      summary: kind === 'helpful' ? `${target.name} responded; customer pressure is falling.` : (kind === 'harmful' ? `${target.name} changed the shape of pressure. Watch the dependency edge.` : `${target.name} accepted the change; wait for the next telemetry window.`),
      impactBefore: beforeImpact,
      impactAfter: afterImpact,
      budgetCost: cost,
      targetBefore: beforeTarget,
      targetAfter: observableService(target)
    });
    run.actionCooldown = hasCard(run, 'trace-sampling') ? 0.55 : 1.1;
    target.status = statusFor(target);
    return { accepted: true, snapshot: recordSnapshot(run), events: drainEvents(run) };
  }

  function useEmergency(run, emergencyId, targetId, actionToken) {
    if (!run || run.complete) return { accepted: false, reason: run && run.complete ? 'complete' : 'invalid-run', snapshot: run ? snapshot(run) : null, events: [] };
    const card = EMERGENCY_RUNBOOKS.find((candidate) => candidate.id === emergencyId);
    if (!card) return { accepted: false, reason: 'invalid-emergency', snapshot: snapshot(run), events: [] };
    const state = run.emergencyState && run.emergencyState[card.id];
    if (!state || state.charges <= 0) return { accepted: false, reason: 'no-charges', snapshot: snapshot(run), events: [] };
    if (state.cooldown > 0) return { accepted: false, reason: 'cooldown', snapshot: snapshot(run), events: [] };
    const target = serviceById(run, targetId || card.target);
    if (!target) return { accepted: false, reason: 'invalid-target', snapshot: snapshot(run), events: [] };
    const token = String(actionToken || `${run.seed}:${run.stage}:emergency:${card.id}:${run.actionSequence + 1}`);
    if (run.processedActionIds[token]) return { accepted: false, duplicate: true, reason: 'duplicate-action', snapshot: snapshot(run), events: [] };
    run.processedActionIds[token] = true;
    run.actionSequence += 1;
    const beforeImpact = customerImpact(run).affectedRequestPct;
    const beforeTarget = observableService(target);
    state.charges -= 1;
    state.cooldown = card.cooldown || 0;
    state.activeUntil = card.duration ? run.stageTime + card.duration : run.stageTime;
    const action = `emergency:${card.id}`;
    run.actionLog.push({ token, action, target: target.id, time: round(run.stageTime, 1), stage: run.stage });
    if (card.id === 'load-shed') {
      target.loadShed = 0.35;
      target.loadShedUntil = run.stageTime + card.duration;
      addEvent(run, 'LOAD SHED · non-critical edge traffic is being dropped for twelve seconds.', 'warning');
    } else if (card.id === 'warm-failover') {
      target.warmFailover = true;
      addEvent(run, 'WARM FAILOVER · the secondary route is prepared before the next transition.', 'info');
    } else if (card.id === 'connection-drain') {
      target.connectionDrainUntil = run.stageTime + card.duration;
      target.faultMitigation = Math.min(target.faultMitigation, 0.72);
      addEvent(run, 'CONNECTION DRAIN · new database connections are paused while work drains.', 'warning');
    } else if (card.id === 'freeze-deployments') {
      target.freezeDeploymentsUntil = run.stageTime + card.duration;
      target.releasePressure = 0;
      addEvent(run, 'FREEZE DEPLOYMENTS · release pressure is locked for fifteen seconds.', 'info');
    } else if (card.id === 'cache-bypass') {
      target.cacheBypassUntil = run.stageTime + card.duration;
      addEvent(run, 'CACHE BYPASS · freshness is protected, but source traffic will rise.', 'warning');
    }
    const afterImpact = customerImpact(run).affectedRequestPct;
    const kind = classifyConsequence(beforeImpact, afterImpact, action, beforeTarget);
    run.budgetActionCost += card.cost;
    run.reliabilityBudget = clamp(run.reliabilityBudget - card.cost, 0, 100);
    if (kind === 'harmful') run.harmfulChanges += 1;
    addConsequence(run, {
      action,
      target: target.id,
      kind,
      summary: `${card.name} engaged on ${target.name}. Watch the next telemetry window for its tradeoff.`,
      impactBefore: beforeImpact,
      impactAfter: afterImpact,
      budgetCost: card.cost,
      targetBefore: beforeTarget,
      targetAfter: observableService(target)
    });
    run.actionCooldown = hasCard(run, 'trace-sampling') ? 0.55 : 1.1;
    return { accepted: true, snapshot: recordSnapshot(run), events: drainEvents(run) };
  }

  function chooseUpgrade(run, cardId) {
    if (!run || !run.awaitingUpgrade || run.runComplete || run.replayBuild) return { accepted: false, reason: 'not-awaiting-upgrade', snapshot: run ? snapshot(run) : null, events: [] };
    const card = upgradeOptions(run).find((candidate) => candidate.id === cardId);
    if (!card) return { accepted: false, reason: 'card-not-offered', snapshot: snapshot(run), events: [] };
    run.build.push(card.id);
    const recovery = Math.min(BETWEEN_INCIDENT_RECOVERY, 100 - run.reliabilityBudget);
    run.reliabilityBudget += recovery;
    run.budgetRecovery += recovery;
    addEvent(run, `Runbook installed: ${card.name}. ${card.benefit}`, 'info');
    if (recovery > 0) addEvent(run, `Between-incident maintenance restored ${round(recovery, 1)} reliability budget.`, 'info');
    run.stage += 1;
    resetIncident(run);
    addEvent(run, `Incident ${run.stage}/${TOTAL_STAGES}: new telemetry window open.`, 'warning');
    return { accepted: true, snapshot: recordSnapshot(run), events: drainEvents(run) };
  }

  function continueReplay(run) {
    if (!run || !run.awaitingUpgrade || run.runComplete) return { accepted: false, reason: 'not-awaiting-upgrade', snapshot: run ? snapshot(run) : null, events: [] };
    const recovery = Math.min(BETWEEN_INCIDENT_RECOVERY, 100 - run.reliabilityBudget);
    run.reliabilityBudget += recovery;
    run.budgetRecovery += recovery;
    addEvent(run, `Replaying the installed build: ${run.build.length ? run.build.join(' · ') : 'baseline operations'}.`, 'info');
    if (recovery > 0) addEvent(run, `Between-incident maintenance restored ${round(recovery, 1)} reliability budget.`, 'info');
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
    EMERGENCY_RUNBOOKS: EMERGENCY_RUNBOOKS.map((card) => ({ ...card })),
    BUILD_SYNERGIES: BUILD_SYNERGIES.map((synergy) => ({ ...synergy, cards: synergy.cards.slice() })),
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
    useEmergency,
    chooseUpgrade,
    continueReplay,
    replay,
    runTicks,
    dailySeed,
    isImpacted
  };
}));
