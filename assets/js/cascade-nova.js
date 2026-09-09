/*
 * NOVA // local incident analyst
 *
 * This is intentionally not a networked AI claim. It is a small, deterministic,
 * browser-side reasoning layer that makes its evidence and uncertainty visible.
 * It can be replaced by an on-device model later without changing the UI contract.
 */
(function () {
  'use strict';

  function createNova(options) {
    const root = options.root;
    const getSnapshot = options.getSnapshot;
    const getSeed = options.getSeed;
    const onStateChange = options.onStateChange || function () {};
    const onAnalyze = options.onAnalyze || function () {};
    const state = {
      enabled: false,
      lastResult: null,
      analysisCount: 0
    };

    const $ = (selector) => root.querySelector(selector);
    const toggle = $('#cascadeNovaToggle');
    const runtime = $('#cascadeNovaRuntime');
    const intro = $('#cascadeNovaIntro');
    const form = $('#cascadeNovaForm');
    const question = $('#cascadeNovaQuestion');
    const analyzeButton = $('#cascadeNovaAnalyze');
    const response = $('#cascadeNovaResponse');
    const promptButtons = Array.from(root.querySelectorAll('.cascade-nova-prompt'));

    function hashSeed(value) {
      let hash = 2166136261;
      const text = String(value || '8F31A').toUpperCase();
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }

    function questionIntent(value) {
      const text = String(value || '').toLowerCase();
      if (text.includes('next') || text.includes('inspect') || text.includes('look')) return 'next';
      if (text.includes('capacity') || text.includes('scale') || text.includes('traffic')) return 'capacity';
      if (text.includes('wrong') || text.includes('trust') || text.includes('sure')) return 'trust';
      return 'root';
    }

    function serviceStatus(service) {
      if (!service) return 'unknown';
      if (service.status) return service.status;
      if (service.health <= 44) return 'critical';
      if (service.health <= 76) return 'warning';
      return 'healthy';
    }

    function formatLatency(value) {
      const number = Number(value) || 0;
      return number >= 1000 ? `${(number / 1000).toFixed(1)}s` : `${Math.round(number)}ms`;
    }

    function findService(snapshot, id) {
      return snapshot && snapshot.services && snapshot.services.find((service) => service.id === id);
    }

    function buildCandidates(snapshot) {
      if (!snapshot || !snapshot.services) return [];
      const byId = (id) => findService(snapshot, id);
      const candidates = [];
      const pricing = byId('pricing');
      const postgres = byId('postgres');
      const gateway = byId('gateway');
      const orders = byId('orders');
      const inventory = byId('inventory');
      const scenarioRoot = findService(snapshot, snapshot.scenario && snapshot.scenario.root);

      if (pricing) {
        const score = (100 - pricing.health) * 0.48 + Math.min(pricing.latency / 35, 30) + pricing.errors * 1.4 + Math.min(pricing.queue / 20, 18);
        candidates.push({
          id: 'pricing-latency',
          service: pricing,
          score,
          lead: 'Pricing is the likely bottleneck',
          explanation: `Pricing is ${Math.round(pricing.health)}% healthy with ${formatLatency(pricing.latency)} latency, ${Number(pricing.errors).toFixed(1)}% errors, and a queue of ${Math.round(pricing.queue)}.`,
          verify: 'Inspect Pricing, then trace its PostgreSQL and cache edges. A restart would only quiet the symptom.',
          action: 'circuit'
        });
      }
      if (postgres) {
        const score = (100 - postgres.health) * 0.55 + Math.min(postgres.queue / 18, 28) + postgres.errors * 1.7 + Math.min(postgres.cpu / 9, 12);
        candidates.push({
          id: 'postgres-pressure',
          service: postgres,
          score,
          lead: 'PostgreSQL may be exhausting its connection budget',
          explanation: `PostgreSQL is at ${Math.round(postgres.cpu)}% CPU with a queue depth of ${Math.round(postgres.queue)} and ${formatLatency(postgres.latency)} response time.`,
          verify: 'Compare Pricing and Inventory latency. If both share the same slope, the database edge is stronger than the service symptom.',
          action: 'failover'
        });
      }
      if (gateway) {
        const score = (100 - gateway.health) * 0.58 + Math.min(gateway.queue / 25, 30) + gateway.errors * 1.2 + Math.min(gateway.cpu / 6, 15);
        candidates.push({
          id: 'gateway-capacity',
          service: gateway,
          score,
          lead: 'The gateway may be queueing beyond edge capacity',
          explanation: `The gateway is ${Math.round(gateway.cpu)}% CPU with ${Math.round(gateway.queue)} queued requests across ${gateway.replicas} replicas.`,
          verify: 'Check whether downstream services are healthy. Scaling the edge while a dependency is slow can amplify retries.',
          action: 'scale'
        });
      }
      if (orders) {
        const score = (100 - orders.health) * 0.44 + orders.errors * 1.8 + Math.min(orders.latency / 40, 24) + Math.min(orders.queue / 24, 16);
        candidates.push({
          id: 'orders-retry',
          service: orders,
          score,
          lead: 'Orders may be amplifying the incident with retries',
          explanation: `Orders is reporting ${Number(orders.errors).toFixed(1)}% errors and ${formatLatency(orders.latency)} latency; it depends on Pricing and Inventory.`,
          verify: 'Inspect Pricing first. If Pricing is degraded before Orders, this is a propagation path—not the root cause.',
          action: 'rollback'
        });
      }
      if (inventory) {
        const score = (100 - inventory.health) * 0.38 + inventory.errors * 1.3 + Math.min(inventory.latency / 50, 18);
        candidates.push({
          id: 'inventory-signal',
          service: inventory,
          score,
          lead: 'Inventory is carrying part of the customer symptom',
          explanation: `Inventory is ${Math.round(inventory.health)}% healthy at ${formatLatency(inventory.latency)} with ${Number(inventory.errors).toFixed(1)}% errors.`,
          verify: 'Compare its timeline with PostgreSQL. A shared database signal would make Inventory a witness, not the cause.',
          action: 'inspect'
        });
      }

      candidates.sort((left, right) => right.score - left.score);
      if (scenarioRoot) {
        const rootCandidate = candidates.find((candidate) => candidate.service.id === scenarioRoot.id);
        if (rootCandidate) rootCandidate.score += 5;
      }
      return candidates.sort((left, right) => right.score - left.score);
    }

    function shouldMislead(snapshot) {
      const seedHash = hashSeed(getSeed());
      // About one run in five gets a confident, plausible false lead. The run
      // seed makes the behavior reproducible and inspectable in a replay.
      return Boolean(snapshot && !snapshot.resolved && ((seedHash >>> 5) % 5 === 0) && state.analysisCount % 2 === 1);
    }

    function makeResult(snapshot, requestedQuestion) {
      const candidates = buildCandidates(snapshot);
      if (!candidates.length) {
        return { lead: 'Not enough telemetry yet', confidence: 0, level: 'low', explanation: 'Start an incident so NOVA can inspect a live snapshot.', verify: 'Bring the city online first.', misleading: false, evidence: [] };
      }
      const intentionalMislead = shouldMislead(snapshot) && candidates.length > 1;
      const leadCandidate = intentionalMislead ? candidates[1] : candidates[0];
      const runnerUp = candidates.find((candidate) => candidate.id !== leadCandidate.id) || leadCandidate;
      const separation = Math.max(0, leadCandidate.score - runnerUp.score);
      const confidence = Math.max(42, Math.min(93, Math.round(54 + (separation * 1.9) + (leadCandidate.score * 0.25))));
      const intent = questionIntent(requestedQuestion);
      let lead = leadCandidate.lead;
      let explanation = leadCandidate.explanation;
      let verify = leadCandidate.verify;
      if (intent === 'next') {
        lead = `Inspect ${leadCandidate.service.name} next`;
        explanation = `It has the strongest combined signal right now: health ${Math.round(leadCandidate.service.health)}%, latency ${formatLatency(leadCandidate.service.latency)}, errors ${Number(leadCandidate.service.errors).toFixed(1)}%.`;
      } else if (intent === 'capacity') {
        lead = leadCandidate.service.cpu >= 70 || leadCandidate.service.queue >= 80 ? 'Capacity pressure is a credible lead' : 'Capacity is not the strongest signal';
        explanation = `NOVA sees ${Math.round(leadCandidate.service.cpu)}% CPU and a queue of ${Math.round(leadCandidate.service.queue)} on ${leadCandidate.service.name}. Capacity is only causal if its dependencies are not already degraded.`;
        verify = 'Compare the queue slope with dependency health before scaling. More replicas can create more downstream traffic.';
      } else if (intent === 'trust') {
        lead = intentionalMislead ? 'Treat this lead as unverified' : 'Use the evidence, not the confidence score';
        explanation = `The strongest competing signal is ${runnerUp.service.name}: health ${Math.round(runnerUp.service.health)}%, latency ${formatLatency(runnerUp.service.latency)}, errors ${Number(runnerUp.service.errors).toFixed(1)}%.`;
        verify = 'Inspect both services and follow the first failing edge. NOVA reports a hypothesis, never a command.';
      }

      const evidence = [
        `${leadCandidate.service.name}: ${Math.round(leadCandidate.service.health)}% health`,
        `${formatLatency(leadCandidate.service.latency)} latency / ${Number(leadCandidate.service.errors).toFixed(1)}% errors`,
        `${Math.round(leadCandidate.service.queue)} queued / ${leadCandidate.service.replicas} replicas`
      ];
      if (intentionalMislead) {
        evidence.push(`Counter-signal: ${runnerUp.service.name} is ${Math.round(runnerUp.service.health)}% healthy`);
      }
      return {
        lead,
        confidence,
        level: confidence >= 78 ? 'high' : (confidence >= 60 ? 'medium' : 'low'),
        explanation,
        verify,
        misleading: intentionalMislead,
        evidence,
        suggestedAction: leadCandidate.action,
        serviceId: leadCandidate.service.id,
        runnerUp: runnerUp.service.name
      };
    }

    function renderResult(result) {
      response.innerHTML = '';
      const header = document.createElement('div');
      header.className = `cascade-nova-result-head ${result.misleading ? 'is-misleading' : ''}`;
      const label = document.createElement('span');
      label.textContent = result.misleading ? 'PLAUSIBLE FALSE LEAD' : 'NOVA HYPOTHESIS';
      const confidence = document.createElement('strong');
      confidence.textContent = `${result.confidence}% confidence`;
      header.append(label, confidence);

      const lead = document.createElement('h4');
      lead.textContent = result.lead;
      const explanation = document.createElement('p');
      explanation.textContent = result.explanation;

      const evidenceTitle = document.createElement('span');
      evidenceTitle.className = 'cascade-nova-evidence-label';
      evidenceTitle.textContent = 'SIGNALS OBSERVED';
      const evidenceList = document.createElement('ul');
      result.evidence.forEach((item) => {
        const listItem = document.createElement('li');
        listItem.textContent = item;
        evidenceList.appendChild(listItem);
      });

      const verify = document.createElement('div');
      verify.className = 'cascade-nova-verify';
      const verifyLabel = document.createElement('strong');
      verifyLabel.textContent = 'VERIFY BEFORE ACTING';
      const verifyText = document.createElement('span');
      verifyText.textContent = result.verify;
      verify.append(verifyLabel, verifyText);
      response.append(header, lead, explanation, evidenceTitle, evidenceList, verify);
    }

    function setEnabled(enabled) {
      state.enabled = enabled;
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.textContent = enabled ? 'Disable NOVA' : 'Enable NOVA';
      runtime.classList.toggle('is-enabled', enabled);
      runtime.innerHTML = enabled ? '<i></i> local reasoning' : '<i></i> local only';
      intro.textContent = enabled
        ? 'NOVA reads only the current in-memory snapshot. It has no network path, no API key, and no access to anything outside this incident.'
        : 'NOVA is dormant. Enable it to inspect the current snapshot on this device. No telemetry, prompt, or API key leaves the browser.';
      analyzeButton.disabled = !enabled || !getSnapshot();
      promptButtons.forEach((button) => { button.disabled = !enabled || !getSnapshot(); });
      onStateChange(enabled);
    }

    function analyze(requestedQuestion) {
      if (!state.enabled) return null;
      const snapshot = getSnapshot();
      if (!snapshot) {
        intro.textContent = 'Start a shift first. NOVA needs a live snapshot, not a guess.';
        return null;
      }
      state.analysisCount += 1;
      const result = makeResult(snapshot, requestedQuestion || question.value);
      state.lastResult = result;
      renderResult(result);
      onAnalyze(result);
      return result;
    }

    function refresh(snapshot) {
      const canAnalyze = state.enabled && Boolean(snapshot);
      analyzeButton.disabled = !canAnalyze;
      promptButtons.forEach((button) => { button.disabled = !canAnalyze; });
      if (!snapshot) {
        state.lastResult = null;
        response.innerHTML = '<div class="cascade-nova-placeholder"><span aria-hidden="true">✦</span><strong>Enable local analysis</strong><small>NOVA will show a lead, the signals behind it, and the check that could prove it wrong.</small></div>';
        if (state.enabled) intro.textContent = 'Start a shift first. NOVA needs a live snapshot, not a guess.';
      }
      if (state.lastResult && snapshot && snapshot.complete) {
        state.lastResult = null;
        response.innerHTML = '<div class="cascade-nova-placeholder"><span aria-hidden="true">✓</span><strong>Snapshot complete</strong><small>Re-enable analysis on a new shift to inspect fresh evidence.</small></div>';
      }
    }

    toggle.addEventListener('click', () => setEnabled(!state.enabled));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      analyze(question.value);
    });
    promptButtons.forEach((button) => button.addEventListener('click', () => {
      question.value = button.dataset.novaQuestion;
      analyze(button.dataset.novaQuestion);
    }));

    return {
      setEnabled,
      refresh,
      analyze,
      isEnabled: () => state.enabled,
      getLastResult: () => state.lastResult
    };
  }

  window.CascadeNova = { create: createNova };
})();
