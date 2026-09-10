/* CASCADE — presentation layer for the deterministic incident worker. */
(function () {
  'use strict';

  const root = document.getElementById('cascadeGame');
  if (!root) return;

  const $ = (selector) => root.querySelector(selector);
  const $$ = (selector) => Array.from(root.querySelectorAll(selector));
  const canvas = $('#cascadeCanvas');
  const context = canvas.getContext('2d');
  const overlay = $('#cascadeCanvasOverlay');
  const workerUrl = root.dataset.worker;
  const engineVersion = root.dataset.engineVersion || (window.CASCADE_BUILD && window.CASCADE_BUILD.version) || 'unknown';
  const buildCommit = root.dataset.buildCommit || (window.CASCADE_BUILD && window.CASCADE_BUILD.commit) || 'unknown';
  const serviceOrder = ['gateway', 'orders', 'auth', 'pricing', 'inventory', 'cache', 'postgres', 'redis'];
  const nodes = {
    gateway: { x: 600, y: 102, width: 150, height: 104, color: '#66e5e2' },
    orders: { x: 300, y: 270, width: 142, height: 108, color: '#81b8ff' },
    auth: { x: 905, y: 270, width: 142, height: 108, color: '#81b8ff' },
    pricing: { x: 420, y: 455, width: 156, height: 116, color: '#f5b95b' },
    inventory: { x: 660, y: 430, width: 156, height: 116, color: '#81b8ff' },
    cache: { x: 882, y: 455, width: 146, height: 112, color: '#72e4a1' },
    postgres: { x: 555, y: 612, width: 184, height: 112, color: '#b7a2ff' },
    redis: { x: 965, y: 612, width: 164, height: 104, color: '#e68bca' }
  };
  const edges = [
    ['gateway', 'orders'], ['gateway', 'auth'], ['gateway', 'pricing'],
    ['orders', 'pricing'], ['orders', 'inventory'], ['auth', 'redis'],
    ['pricing', 'postgres'], ['pricing', 'cache'], ['inventory', 'postgres'],
    ['inventory', 'cache'], ['cache', 'redis']
  ];

  let worker;
  let currentSnapshot = null;
  let selectedService = null;
  let currentMode = 'recruiter';
  let active = false;
  let eventCount = 0;
  let history = [];
  let replayTimer = null;
  let noticeTimer = null;
  let nova = null;
  let runbookBuild = [];
  let replayBuild = false;
  let pendingUpgrade = null;
  let displayedStage = 0;
  let lastUrlState = '';
  let workerGeneration = 0;
  let onboarding = null;
  let presentationMode = false;
  let animationFrame = null;
  let lastDrawAt = 0;

  const runbookCardIds = ['bulkhead', 'adaptive-scaling', 'trace-sampling', 'chaos-tested', 'conservative-deployments', 'aggressive-retry'];
  const runbookMetadata = {
    bulkhead: { name: 'Bulkhead', label: 'CONTAINMENT', benefit: 'Pressure propagates 32% slower.' },
    'adaptive-scaling': { name: 'Adaptive Autoscaling', label: 'CAPACITY', benefit: 'Adds capacity at the saturation line.' },
    'trace-sampling': { name: 'Trace Sampling', label: 'OBSERVABILITY', benefit: 'Faster inspection cooldown.' },
    'chaos-tested': { name: 'Chaos Tested', label: 'RESILIENCE', benefit: 'Stronger failover and recovery.' },
    'conservative-deployments': { name: 'Conservative Deployments', label: 'RELEASE SAFETY', benefit: 'Stronger rollback margin.' },
    'aggressive-retry': { name: 'Aggressive Retry', label: 'HIGH VARIANCE', benefit: 'Healthy paths recover faster.' }
  };

  function normalizeSeed(value) {
    const cleaned = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    return cleaned.length >= 4 ? cleaned : '8F31A';
  }

  function formatTime(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`;
  }

  function formatMetric(value, suffix = '') {
    const number = Number(value) || 0;
    if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k${suffix}`;
    return `${Math.round(number * 10) / 10}${suffix}`;
  }

  function statusClass(status) {
    return status === 'critical' ? 'is-critical' : (status === 'warning' ? 'is-warning' : 'is-healthy');
  }

  function serviceById(id) {
    return currentSnapshot && currentSnapshot.services.find((service) => service.id === id);
  }

  function showNotice(message) {
    let notice = root.querySelector('.cascade-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'cascade-notice';
      notice.setAttribute('role', 'status');
      root.appendChild(notice);
    }
    notice.textContent = message;
    notice.classList.add('is-visible');
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => notice.classList.remove('is-visible'), 2800);
  }

  function setPhase(phase, message) {
    const badge = $('#cascadePhaseBadge');
    badge.textContent = phase || 'STANDBY';
    badge.classList.toggle('is-warning', phase === 'DEGRADING' || phase === 'RECOVERING');
    badge.classList.toggle('is-critical', phase === 'CRITICAL' || phase === 'OUTAGE');
    $('#cascadeRunMessage').textContent = message;
  }

  function setGuidedTarget(target, enabled) {
    ['#cascadeIncidentCard', '#cascadeTelemetryCard', '#cascadeActionsCard', '#cascadeCanvasWrap'].forEach((selector) => {
      const element = $(selector);
      if (!element) return;
      element.classList.toggle('cascade-guide-dim', enabled && selector !== target);
      element.classList.toggle('cascade-guide-focus', enabled && selector === target);
    });
  }

  function renderFirstAction(snapshot) {
    const card = $('#cascadeFirstAction');
    if (!card) return;
    const title = $('#cascadeFirstActionTitle');
    const detail = $('#cascadeFirstActionDetail');
    const selected = selectedService ? serviceById(selectedService) : serviceById('gateway');
    const shouldShow = Boolean(onboarding && onboarding.active && onboarding.step < 4 && snapshot && !snapshot.complete && !snapshot.resolved);
    card.hidden = !shouldShow;
    $$('.cascade-action-button').forEach((button) => button.classList.remove('cascade-guide-action'));
    if (!shouldShow) return;
    const recommendedAction = onboarding.step <= 2 ? 'inspect' : null;
    const recommendedButton = recommendedAction ? $(`.cascade-action-button[data-action="${recommendedAction}"]`) : null;
    if (recommendedButton) recommendedButton.classList.add('cascade-guide-action');
    if (onboarding.step === 1) {
      title.textContent = `Start with ${selected ? selected.name : 'the highlighted service'}`;
      detail.textContent = 'Read the pager, then select the highlighted building. Do not restart or scale yet.';
    } else if (onboarding.step === 2) {
      title.textContent = `Inspect ${selected ? selected.name : 'the root service'}`;
      detail.textContent = 'Confirm the first failing edge. Read latency, errors, and queue depth together.';
    } else {
      title.textContent = 'Use the evidence-backed action';
      detail.textContent = 'NOVA and telemetry can suggest a move, but the engine resolves only when customer SLOs recover.';
    }
  }

  function updateOnboarding(snapshot) {
    if (!onboarding || !onboarding.active) return;
    const elapsed = snapshot && Number.isFinite(Number(snapshot.time)) ? Number(snapshot.time) : 0;
    onboarding.elapsed = Math.min(90, elapsed);
    if (snapshot && snapshot.resolved) onboarding.step = 4;
    const steps = [
      { name: 'Read the pager', instruction: 'Start with the incident card. It tells you what customers feel before you touch the graph.', tip: 'The symptom is not the cause. Find the first failing edge.', target: '#cascadeIncidentCard' },
      { name: 'Inspect the root', instruction: 'The highlighted service is the first place to investigate. Select it, then press Inspect.', tip: 'Health, latency, errors, and queue depth are one story.', target: '#cascadeTelemetryCard' },
      { name: 'Choose one action', instruction: 'Use the guided runbook action for this incident. A fast fix can still have a blast radius.', tip: 'Contain the failure mode, then wait for the city to recover.', target: '#cascadeActionsCard' },
      { name: 'Watch recovery', instruction: 'You found the loop. Keep watching customer impact until the city hands back daylight.', tip: 'A successful action is only the beginning of recovery.', target: '#cascadeCanvasWrap' }
    ];
    const current = steps[Math.max(0, Math.min(steps.length - 1, onboarding.step - 1))];
    $('#cascadeOnboardingClock').textContent = `${formatTime(onboarding.elapsed)} / 01:30`;
    $('#cascade-onboarding-title').textContent = current.name;
    $('#cascadeOnboardingInstruction').textContent = current.instruction;
    $('#cascadeOnboardingStep').textContent = `${String(onboarding.step).padStart(2, '0')} / 04 · ${current.name.toUpperCase()}`;
    $('#cascadeOnboardingTip').textContent = current.tip;
    $('#cascadeOnboardingProgressBar').style.width = `${(onboarding.elapsed / 90) * 100}%`;
    $('.cascade-onboarding-progress').setAttribute('aria-valuenow', String(Math.round(onboarding.elapsed)));
    setGuidedTarget(current.target, onboarding.step <= 4);
    renderFirstAction(snapshot);
    if (snapshot && snapshot.runComplete) {
      $('#cascadeOnboardingInstruction').textContent = 'Onboarding complete. Re-run this seed without the guide, or share the build you just learned.';
      $('#cascadeOnboardingTip').textContent = 'You now know the loop: observe → diagnose → stabilize.';
      setGuidedTarget(null, false);
    }
  }

  function stopOnboarding(message) {
    if (!onboarding) return;
    onboarding.active = false;
    setGuidedTarget(null, false);
    const panel = $('#cascadeOnboarding');
    if (panel) panel.hidden = true;
    if (message) showNotice(message);
  }

  function beginOnboarding() {
    onboarding = { active: true, step: 1, elapsed: 0 };
    $('#cascadeOnboarding').hidden = false;
    updateOnboarding(currentSnapshot);
  }

  function normalizeBuild(value) {
    const values = Array.isArray(value) ? value : String(value || '').split(/[,.|]/);
    return values
      .map((cardId) => String(cardId || '').trim())
      .filter((cardId, index, list) => runbookCardIds.includes(cardId) && list.indexOf(cardId) === index)
      .slice(0, 3);
  }

  function renderBuild(snapshot) {
    if (snapshot && Array.isArray(snapshot.build)) runbookBuild = normalizeBuild(snapshot.build);
    const cards = $('#cascadeBuildCards');
    const metadata = snapshot && Array.isArray(snapshot.buildCards) && snapshot.buildCards.length
      ? snapshot.buildCards
      : runbookBuild.map((cardId) => ({ id: cardId, ...(runbookMetadata[cardId] || { name: cardId, label: 'RUNBOOK', benefit: 'Installed operational modifier.' }) }));
    const stage = snapshot && snapshot.stage ? snapshot.stage : 1;
    const totalStages = snapshot && snapshot.totalStages ? snapshot.totalStages : 4;
    const modeLabel = snapshot && snapshot.replayBuild ? 'REPLAY BUILD' : (runbookBuild.length ? 'LIVE BUILD' : 'BASELINE');
    $('#cascadeBuildStage').textContent = `${modeLabel} / INCIDENT ${String(stage).padStart(2, '0')} OF ${String(totalStages).padStart(2, '0')}`;
    $('#cascadeStage').textContent = `${String(stage).padStart(2, '0')} / ${String(totalStages).padStart(2, '0')}`;
    $('#cascadeBuildSummary').textContent = metadata.length ? `${metadata.length} runbook${metadata.length === 1 ? '' : 's'} installed` : 'No runbooks installed yet';
    cards.innerHTML = '';
    if (!metadata.length) {
      cards.innerHTML = '<div class="cascade-build-empty"><span aria-hidden="true">＋</span><strong>BASELINE OPERATIONS</strong><small>Stabilize the first incident to earn your first runbook card.</small></div>';
      return;
    }
    metadata.forEach((card) => {
      const article = document.createElement('article');
      article.className = `cascade-build-card cascade-build-card-${card.id}`;
      const label = document.createElement('span');
      label.textContent = card.label;
      const title = document.createElement('strong');
      title.textContent = card.name;
      const benefit = document.createElement('small');
      benefit.textContent = card.benefit;
      article.append(label, title, benefit);
      cards.appendChild(article);
    });
  }

  function renderUpgradeOptions(snapshot) {
    const panel = $('#cascadeUpgradePanel');
    const grid = $('#cascadeUpgradeCards');
    const continueButton = $('#cascadeContinueShift');
    const hint = $('#cascadeUpgradeHint');
    const intro = $('#cascadeUpgradeIntro');
    pendingUpgrade = null;
    if (!snapshot || !snapshot.awaitingUpgrade || snapshot.runComplete) {
      panel.hidden = true;
      grid.innerHTML = '';
      continueButton.disabled = true;
      return;
    }
    panel.hidden = false;
    grid.innerHTML = '';
    if (snapshot.replayBuild) {
      intro.textContent = `Build replay in progress: ${runbookBuild.length ? runbookBuild.join(' · ') : 'baseline operations'}. No new card is added; continue to the next deterministic incident.`;
      const replayNotice = document.createElement('div');
      replayNotice.className = 'cascade-upgrade-replay';
      replayNotice.innerHTML = '<span aria-hidden="true">↻</span><strong>REPLAYING THIS BUILD</strong><small>The installed cards stay active for every incident in this run.</small>';
      grid.appendChild(replayNotice);
      hint.textContent = 'This run is using the exact installed build.';
      continueButton.textContent = 'Continue replay →';
      continueButton.disabled = false;
      return;
    }
    intro.textContent = snapshot.success
      ? 'The system held. Pick one permanent rule for the next incident. The same seed plus the same cards creates the same build to replay.'
      : 'Choose a runbook before the next incident. Every card changes the graph—and carries a tradeoff.';
    const options = Array.isArray(snapshot.upgradeOptions) ? snapshot.upgradeOptions : [];
    options.forEach((card) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cascade-upgrade-card';
      button.dataset.card = card.id;
      button.setAttribute('aria-pressed', 'false');
      const label = document.createElement('span');
      label.className = 'cascade-upgrade-card-label';
      label.textContent = card.label;
      const title = document.createElement('strong');
      title.textContent = card.name;
      const description = document.createElement('p');
      description.textContent = card.description;
      const benefit = document.createElement('small');
      benefit.innerHTML = `<b>+</b> ${card.benefit}`;
      const tradeoff = document.createElement('small');
      tradeoff.innerHTML = `<b>−</b> ${card.tradeoff}`;
      button.append(label, title, description, benefit, tradeoff);
      button.addEventListener('click', () => {
        pendingUpgrade = card.id;
        $$('.cascade-upgrade-card').forEach((candidate) => {
          const selected = candidate === button;
          candidate.classList.toggle('is-selected', selected);
          candidate.setAttribute('aria-pressed', String(selected));
        });
        hint.textContent = `${card.name} selected. Install it when you are ready.`;
        continueButton.disabled = false;
      });
      grid.appendChild(button);
    });
    continueButton.textContent = 'Install & continue →';
    continueButton.disabled = !pendingUpgrade;
    hint.textContent = 'Select one card to continue the shift.';
  }

  function updateStatus(snapshot) {
    const phase = snapshot.phase || 'STANDBY';
    let message = 'Choose a shift to initialize the city.';
    if (phase === 'INVESTIGATING') message = 'Telemetry is moving. Find the first failing dependency.';
    if (phase === 'DEGRADING') message = 'The blast radius is growing. Follow the edges, not the colors.';
    if (phase === 'CRITICAL') message = 'Customer impact is climbing. A runbook decision is overdue.';
    if (phase === 'RECOVERING') message = 'The root cause is contained. Hold the line while the city recovers.';
    if (phase === 'STABILIZED') message = 'Incident stabilized. Read the postmortem before you run it again.';
    if (phase === 'OUTAGE') message = 'The shift expired before the system recovered. Inspect the blast radius.';
    setPhase(phase, message);
    $('#cascadeTimer').textContent = formatTime(snapshot.time);
    $('#cascadeImpact').textContent = `${Number(snapshot.impact || 0).toFixed(1)}%`;
    $('#cascadeBlastRadius').textContent = `${snapshot.blastRadius || 0} service${snapshot.blastRadius === 1 ? '' : 's'}`;
    $('#cascadeSelectedLabel').textContent = selectedService ? `${serviceById(selectedService)?.name || selectedService} selected` : 'No service selected';
    updateOnboarding(snapshot);
    renderBuild(snapshot);
  }

  function renderServiceList(snapshot) {
    const list = $('#cascadeServiceList');
    if (!snapshot || !snapshot.services) return;
    list.innerHTML = '';
    snapshot.services.forEach((service) => {
      const button = document.createElement('button');
      button.type = 'button';
      const isGuidedService = Boolean(onboarding && onboarding.active && onboarding.step < 4 && service.id === 'gateway');
      button.className = `cascade-service-button ${statusClass(service.status)}${isGuidedService ? ' cascade-guide-service' : ''}`;
      button.dataset.service = service.id;
      button.setAttribute('aria-current', service.id === selectedService ? 'true' : 'false');
      const title = document.createElement('strong');
      title.textContent = service.short;
      const status = document.createElement('small');
      status.textContent = `${service.status} · ${Math.round(service.health)}%`;
      button.append(title, status);
      button.addEventListener('click', () => selectService(service.id, true, true));
      list.appendChild(button);
    });
  }

  function renderDependencies(service) {
    const target = $('#cascadeDependencies');
    target.innerHTML = '';
    if (!service) {
      target.textContent = 'Select a building to trace its calls.';
      return;
    }
    if (!service.dependencies.length) {
      target.textContent = 'No downstream dependencies. This is a data boundary.';
      return;
    }
    service.dependencies.forEach((dependencyId) => {
      const dependency = serviceById(dependencyId);
      const tag = document.createElement('span');
      tag.className = `cascade-dependency-tag ${dependency && dependency.status === 'critical' ? 'is-down' : 'is-ok'}`;
      tag.textContent = dependency ? `${dependency.short} · ${dependency.status}` : dependencyId;
      target.appendChild(tag);
    });
  }

  function renderTelemetry() {
    const service = serviceById(selectedService);
    $('#cascadeSelectedService').textContent = service ? service.name : '—';
    const values = {
      telemetryHealth: service ? `${Math.round(service.health)}%` : '—',
      telemetryCpu: service ? `${Math.round(service.cpu)}%` : '—',
      telemetryLatency: service ? formatMetric(service.latency, ' ms') : '—',
      telemetryErrors: service ? `${Number(service.errors).toFixed(1)}%` : '—',
      telemetryQueue: service ? formatMetric(service.queue) : '—',
      telemetryReplicas: service ? String(service.replicas) : '—'
    };
    Object.entries(values).forEach(([id, value]) => {
      const element = $(`#${id}`);
      element.textContent = value;
      element.classList.remove('is-warning', 'is-critical');
      if (service && (id === 'telemetryHealth' || id === 'telemetryLatency' || id === 'telemetryErrors' || id === 'telemetryQueue')) {
        element.classList.add(statusClass(service.status));
      }
    });
    renderDependencies(service);
    $$('.cascade-action-button').forEach((button) => {
      button.disabled = !active || !service || Boolean(currentSnapshot && currentSnapshot.complete);
    });
    $('#cascadeActionHint').textContent = service ? (active ? 'Action changes the graph' : 'Start a shift first') : 'Select a service first';
  }

  function selectService(id, focusCanvas, userInitiated = false) {
    if (!serviceOrder.includes(id)) return;
    selectedService = id;
    if (userInitiated && onboarding && onboarding.active && onboarding.step === 1) {
      if (id === 'gateway') onboarding.step = 2;
      else showNotice('Start at the gateway symptom, then follow the dependency evidence.');
    }
    renderTelemetry();
    if (onboarding && onboarding.active) updateOnboarding(currentSnapshot);
    if (currentSnapshot) renderServiceList(currentSnapshot);
    if (focusCanvas) canvas.focus({ preventScroll: true });
  }

  function refreshNova(snapshot) {
    if (nova) nova.refresh(snapshot || null);
  }

  function getNovaSeed() {
    return $('#cascadeSeed').value;
  }

  function appendEvent(event) {
    const log = $('#cascadeEventLog');
    const empty = log.querySelector('.cascade-empty-event');
    if (empty) empty.remove();
    const item = document.createElement('li');
    item.className = event.level === 'critical' ? 'is-critical' : (event.level === 'warning' ? 'is-warning' : '');
    const time = document.createElement('strong');
    time.textContent = formatTime(event.time);
    item.append(time, document.createTextNode(`  ${event.text}`));
    log.appendChild(item);
    while (log.children.length > 42) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }

  function resetEventLog() {
    const log = $('#cascadeEventLog');
    log.innerHTML = '';
    const empty = document.createElement('li');
    empty.className = 'cascade-empty-event';
    empty.textContent = 'No events yet. The quiet before the pager.';
    log.appendChild(empty);
    eventCount = 0;
    $('#cascadeEventCount').textContent = '0 events';
  }

  function renderPostmortem(snapshot) {
    const postmortem = $('#cascadePostmortem');
    postmortem.hidden = false;
    $('#cascadePostmortemResult').textContent = snapshot.success ? (snapshot.runComplete ? 'RUN COMPLETE' : 'INCIDENT STABILIZED') : 'SHIFT FAILED';
    $('#cascadePostmortemResult').classList.toggle('is-failed', !snapshot.success);
    $('#cascadePostmortemLead').textContent = snapshot.success
      ? (snapshot.runComplete
        ? `You contained the final incident in ${formatTime(snapshot.time)}. The city survived all ${snapshot.totalStages || 4} incidents with ${snapshot.build && snapshot.build.length ? snapshot.build.length : 'no'} runbook upgrades installed.`
        : `You contained ${snapshot.scenario.title.toLowerCase()} in ${formatTime(snapshot.time)}. Choose one runbook below before incident ${(snapshot.stage || 1) + 1}.`)
      : `The shift ended with ${snapshot.blastRadius} services outside nominal health. The postmortem is still useful: every unnecessary change is a clue about where the graph hid the cause.`;
    $('#postmortemRootCause').textContent = snapshot.postmortem && snapshot.postmortem.rootCause ? snapshot.postmortem.rootCause : 'Derived from post-incident evidence';
    $('#postmortemMttr').textContent = formatTime(snapshot.time);
    $('#postmortemAvailability').textContent = `${Math.max(0, 100 - snapshot.impact).toFixed(2)}%`;
    $('#postmortemChanges').textContent = String(snapshot.totalUnnecessaryChanges ?? snapshot.unnecessaryChanges);
    renderBuild(snapshot);
    renderUpgradeOptions(snapshot);
    const slider = $('#cascadeReplaySlider');
    slider.max = String(Math.max(0, history.length - 1));
    slider.value = String(Math.max(0, history.length - 1));
    slider.disabled = history.length < 2;
    $('#cascadeReplayPlay').disabled = history.length < 2;
    $('#cascadeReplayNow').disabled = history.length < 2;
    $('#cascadeReplayTime').textContent = `${formatTime(snapshot.time)} / FINAL`;
    postmortem.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function applyReplaySnapshot(snapshot, index, total) {
    if (!snapshot) return;
    currentSnapshot = snapshot;
    refreshNova(snapshot);
    updateStatus(snapshot);
    renderUpgradeOptions(snapshot);
    renderServiceList(snapshot);
    renderTelemetry();
    $('#cascadeReplayTime').textContent = `${formatTime(snapshot.time)} / ${Math.max(0, Math.round(((index + 1) / total) * 100))}%`;
    draw();
  }

  function sendReplay(index) {
    if (!worker || !history.length) return;
    worker.postMessage({ type: 'replay', index, runToken: workerGeneration });
  }

  function toggleReplay() {
    const button = $('#cascadeReplayPlay');
    if (replayTimer) {
      window.clearInterval(replayTimer);
      replayTimer = null;
      button.textContent = '▶ Play replay';
      return;
    }
    const slider = $('#cascadeReplaySlider');
    let index = Number(slider.value) || 0;
    button.textContent = 'Ⅱ Pause replay';
    replayTimer = window.setInterval(() => {
      index += 1;
      if (index >= history.length) {
        window.clearInterval(replayTimer);
        replayTimer = null;
        button.textContent = '▶ Play replay';
        index = history.length - 1;
      }
      slider.value = String(index);
      sendReplay(index);
    }, 115);
  }

  function clearReplay() {
    if (replayTimer) {
      window.clearInterval(replayTimer);
      replayTimer = null;
    }
    $('#cascadeReplayPlay').textContent = '▶ Play replay';
  }

  function applyPresentationMode(enabled, announce) {
    presentationMode = Boolean(enabled);
    root.classList.toggle('is-presentation', presentationMode);
    resizeCanvas();
    const button = $('#cascadePresentationToggle');
    const budget = $('#cascadeRenderBudget');
    if (button) {
      button.setAttribute('aria-pressed', String(presentationMode));
      button.textContent = presentationMode ? 'Live effects' : 'Presentation mode';
    }
    if (budget) budget.textContent = presentationMode ? 'RENDER / 30 FPS · LOW FX' : 'RENDER / 60 FPS';
    if (announce) showNotice(presentationMode ? 'Presentation mode: stable 30 FPS budget, reduced visual effects.' : 'Live effects restored.');
    draw();
  }

  function togglePresentationMode() {
    applyPresentationMode(!presentationMode, true);
    try { window.localStorage.setItem('cascadePresentationMode', presentationMode ? '1' : '0'); } catch (error) { /* local preference is optional */ }
  }

  function resetForStart(seed, mode, explicitBuild, isReplayBuild, guided) {
    clearReplay();
    workerGeneration += 1;
    active = true;
    currentMode = mode === 'freeplay' ? 'freeplay' : 'recruiter';
    runbookBuild = normalizeBuild(explicitBuild);
    replayBuild = Boolean(isReplayBuild);
    pendingUpgrade = null;
    displayedStage = 0;
    onboarding = guided ? { active: true, step: 1, elapsed: 0 } : null;
    selectedService = null;
    currentSnapshot = null;
    history = [];
    refreshNova(null);
    $('#cascadePostmortem').hidden = true;
    $('#cascadeUpgradePanel').hidden = true;
    $('#cascadeOnboarding').hidden = !guided;
    setGuidedTarget(guided ? '#cascadeIncidentCard' : null, Boolean(guided));
    $('#cascadeShare').disabled = false;
    $('#cascadeModeLabel').textContent = currentMode === 'recruiter' ? '90-SECOND SHIFT' : 'FREEPLAY';
    $('#cascadeRenderBudget').setAttribute('data-engine-version', engineVersion);
    $('#cascadeRenderBudget').setAttribute('data-build-commit', buildCommit);
    $('#cascadeSeed').value = seed;
    renderBuild({ build: runbookBuild, buildCards: [], stage: 1, totalStages: 4, replayBuild });
    $('#cascadeIncidentTitle').textContent = 'Initializing incident…';
    $('#cascadeIncidentDescription').textContent = 'Opening telemetry channels and replay-safe event history.';
    $('#cascadeIncidentSymptom').textContent = '—';
    $('#cascadeIncidentCode').textContent = 'INC—----';
    overlay.hidden = true;
    resetEventLog();
    setPhase('BOOTING', 'Connecting the simulation worker…');
    $('#cascadeConsole').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (guided) updateOnboarding(null);
    if (worker) worker.postMessage({ type: 'start', seed, mode: currentMode, build: runbookBuild, replayBuild, runToken: workerGeneration });
  }

  function start(mode, explicitSeed, explicitBuild, explicitReplayBuild, explicitGuided) {
    const seed = normalizeSeed(explicitSeed || $('#cascadeSeed').value);
    const suppliedBuild = explicitBuild === undefined ? [] : normalizeBuild(explicitBuild);
    const shouldReplay = explicitReplayBuild === undefined ? false : Boolean(explicitReplayBuild);
    const guided = explicitGuided === undefined ? (mode === 'recruiter' && suppliedBuild.length === 0 && !shouldReplay) : Boolean(explicitGuided);
    resetForStart(seed, mode, suppliedBuild, shouldReplay, guided);
    const url = new URL(window.location.href);
    url.searchParams.set('seed', seed);
    url.searchParams.set('engine', engineVersion);
    if (runbookBuild.length) url.searchParams.set('build', runbookBuild.join(','));
    else url.searchParams.delete('build');
    window.history.replaceState({}, '', url);
  }

  function makeNewSeed() {
    const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
    $('#cascadeSeed').value = seed;
    showNotice(`New incident seed ready: ${seed}`);
  }

  async function shareRun() {
    const seed = normalizeSeed($('#cascadeSeed').value);
    const url = new URL(window.location.href);
    url.searchParams.set('seed', seed);
    url.searchParams.set('engine', engineVersion);
    if (runbookBuild.length) url.searchParams.set('build', runbookBuild.join(','));
    else url.searchParams.delete('build');
    url.hash = 'cascade-console';
    try {
      await navigator.clipboard.writeText(url.toString());
      showNotice(`Share link copied for seed ${seed}${runbookBuild.length ? ` with ${runbookBuild.length} runbook${runbookBuild.length === 1 ? '' : 's'}.` : '.'}`);
    } catch (error) {
      window.prompt('Copy this CASCADE run link:', url.toString());
    }
  }

  function updateIncidentCard(snapshot) {
    if (!snapshot || !snapshot.scenario) return;
    const card = $('.cascade-incident-card');
    card.classList.toggle('is-critical', snapshot.phase === 'CRITICAL' || snapshot.phase === 'OUTAGE');
    $('#cascadeIncidentSeverity').textContent = snapshot.phase === 'CRITICAL' || snapshot.phase === 'OUTAGE' ? 'CUSTOMER IMPACT' : 'PAGER ALERT';
    $('#cascadeIncidentCode').textContent = snapshot.scenario.code;
    $('#cascadeIncidentTitle').textContent = snapshot.scenario.title;
    $('#cascadeIncidentDescription').textContent = snapshot.scenario.description;
    $('#cascadeIncidentSymptom').textContent = snapshot.scenario.symptom;
  }

  function receiveSnapshot(snapshot) {
    currentSnapshot = snapshot;
    active = Boolean(snapshot && !snapshot.complete && !snapshot.runComplete);
    if (snapshot && !snapshot.complete) {
      $('#cascadePostmortem').hidden = true;
      renderUpgradeOptions(snapshot);
    }
    refreshNova(snapshot);
    if (!selectedService) renderTelemetry();
    updateStatus(snapshot);
    updateIncidentCard(snapshot);
    renderServiceList(snapshot);
    renderTelemetry();
    draw();
  }

  function receiveComplete(snapshot, completeHistory) {
    active = false;
    currentSnapshot = snapshot;
    if (onboarding && onboarding.active) {
      const completed = Boolean(snapshot.success);
      onboarding.active = false;
      $('#cascadeOnboarding').hidden = true;
      setGuidedTarget(null, false);
      showNotice(completed
        ? '90-second onboarding complete. You can now run the city without the guide.'
        : 'The 90-second guide timed out. Re-run the incident and follow the highlighted first move.');
    }
    refreshNova(snapshot);
    history = Array.isArray(completeHistory) ? completeHistory : [];
    updateStatus(snapshot);
    updateIncidentCard(snapshot);
    renderServiceList(snapshot);
    renderTelemetry();
    renderPostmortem(snapshot);
    draw();
  }

  function setupWorker() {
    try {
      worker = new Worker(`${workerUrl}?v=${encodeURIComponent(engineVersion)}`);
      worker.addEventListener('message', (message) => {
        const payload = message.data || {};
        if (payload.runToken !== undefined && payload.runToken !== workerGeneration) return;
        if (payload.type === 'event') {
          appendEvent(payload.event);
          eventCount = payload.count || eventCount + 1;
          $('#cascadeEventCount').textContent = `${eventCount} event${eventCount === 1 ? '' : 's'}`;
        } else if (payload.type === 'snapshot' || payload.type === 'started') {
          receiveSnapshot(payload.snapshot);
        } else if (payload.type === 'complete') {
          receiveComplete(payload.snapshot, payload.history);
        } else if (payload.type === 'replay') {
          applyReplaySnapshot(payload.snapshot, payload.index, payload.total);
        }
      });
      worker.addEventListener('error', () => {
        active = false;
        overlay.hidden = false;
        setPhase('ERROR', 'The simulation worker could not start. Refresh to reconnect the city.');
        showNotice('CASCADE could not start its simulation worker.');
      });
    } catch (error) {
      setPhase('ERROR', 'Web Workers are unavailable in this browser.');
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = presentationMode ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 1200 * ratio;
    canvas.height = 680 * ratio;
    canvas.style.aspectRatio = '1200 / 680';
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function rgba(hex, alpha) {
    const value = hex.replace('#', '');
    const number = parseInt(value, 16);
    return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawGrid() {
    context.fillStyle = '#06111a';
    context.fillRect(0, 0, 1200, 680);
    context.strokeStyle = presentationMode ? 'rgba(102, 229, 226, 0.04)' : 'rgba(102, 229, 226, 0.055)';
    context.lineWidth = 1;
    const gridSize = presentationMode ? 72 : 48;
    for (let x = 0; x <= 1200; x += gridSize) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 680); context.stroke();
    }
    for (let y = 0; y <= 680; y += gridSize) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(1200, y); context.stroke();
    }
    if (!presentationMode) {
      const gradient = context.createRadialGradient(600, 320, 30, 600, 320, 570);
      gradient.addColorStop(0, 'rgba(39, 119, 126, 0.22)');
      gradient.addColorStop(1, 'rgba(3, 12, 18, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 1200, 680);
    }
  }

  function nodeAnchor(node, other) {
    const dx = other.x - node.x;
    const dy = other.y - node.y;
    const scale = Math.min((node.width * 0.42) / Math.max(1, Math.abs(dx)), (node.height * 0.42) / Math.max(1, Math.abs(dy)));
    return { x: node.x + dx * scale, y: node.y + dy * scale };
  }

  function drawEdges(now) {
    edges.forEach(([fromId, toId], index) => {
      const from = nodes[fromId];
      const to = nodes[toId];
      const source = serviceById(fromId);
      const target = serviceById(toId);
      const start = nodeAnchor(from, to);
      const end = nodeAnchor(to, from);
      const edge = currentSnapshot && currentSnapshot.edges && currentSnapshot.edges.find((candidate) => candidate.from === fromId && candidate.to === toId);
      const stress = Math.max(source ? 100 - source.health : 0, target ? 100 - target.health : 0);
      const trafficStress = edge ? Math.min(100, Math.max(0, ((edge.requestRate || 0) / 900) * 18 + ((edge.latency || 0) / 180) * 28 + (edge.errors || 0) * 3)) : 0;
      const combinedStress = Math.max(stress, trafficStress);
      const color = edge && edge.route === 'secondary' ? '#b7a2ff' : combinedStress > 52 ? '#ff6b6b' : combinedStress > 22 ? '#f5b95b' : '#45cfd0';
      context.save();
      context.globalAlpha = combinedStress > 52 ? 0.92 : 0.52;
      context.strokeStyle = rgba(color, combinedStress > 52 ? 0.7 : 0.35);
      context.lineWidth = edge ? Math.min(7, Math.max(1.5, 1.2 + ((edge.requestRate || 0) / 260))) : (combinedStress > 52 ? 3.5 : combinedStress > 22 ? 2.5 : 1.5);
      context.setLineDash(edge && edge.circuitOpen ? [5, 8] : combinedStress > 22 ? [9, 8] : []);
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
      context.setLineDash([]);
      const progress = ((now / (1900 + index * 80)) % 1);
      const packetX = start.x + ((end.x - start.x) * progress);
      const packetY = start.y + ((end.y - start.y) * progress);
      context.fillStyle = color;
      context.shadowColor = color;
      context.shadowBlur = presentationMode ? 0 : 10;
      context.beginPath(); context.arc(packetX, packetY, presentationMode ? 2 : (combinedStress > 52 ? 4 : 2.5), 0, Math.PI * 2); context.fill();
      context.restore();
    });
  }

  function drawBuilding(service, node, now) {
    if (!service) return;
    const color = service.status === 'critical' ? '#ff6b6b' : (service.status === 'warning' ? '#f5b95b' : node.color);
    const pulse = presentationMode || service.status === 'healthy' ? 0 : Math.sin(now / (service.status === 'critical' ? 160 : 340)) * 5;
    const x = node.x - node.width / 2;
    const y = node.y - node.height / 2 + pulse;
    context.save();
    context.shadowColor = rgba(color, service.status === 'healthy' ? 0.16 : 0.42);
    context.shadowBlur = presentationMode ? 0 : (service.status === 'healthy' ? 18 : 34);
    context.fillStyle = 'rgba(7, 24, 34, 0.96)';
    context.strokeStyle = color;
    context.lineWidth = service.id === selectedService ? 3 : 1.5;
    roundedRect(context, x, y, node.width, node.height, 8);
    context.fill(); context.stroke();
    context.shadowBlur = 0;
    if (service.id === selectedService) {
      context.strokeStyle = rgba('#66e5e2', 0.5);
      context.lineWidth = 1;
      roundedRect(context, x - 8, y - 8, node.width + 16, node.height + 16, 12);
      context.stroke();
    }
    const guidedRoot = Boolean(onboarding && onboarding.active && onboarding.step < 4 && service.id === 'gateway');
    if (guidedRoot) {
      context.save();
      context.strokeStyle = '#66e5e2';
      context.lineWidth = 2;
      context.setLineDash([8, 6]);
      roundedRect(context, x - 15, y - 15, node.width + 30, node.height + 30, 15);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = '#66e5e2';
      context.font = '800 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      context.textAlign = 'center';
      context.fillText('FOLLOW THIS SIGNAL', node.x, y - 22);
      context.restore();
    }
    const buildingTop = y + 32;
    context.fillStyle = rgba(color, 0.2);
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const lit = presentationMode || ((row * 6 + col + Math.floor(now / 700)) % 5) !== 0;
        context.fillStyle = lit ? rgba(color, 0.72) : 'rgba(143, 184, 190, 0.12)';
        context.fillRect(x + 15 + (col * 18), buildingTop + (row * 9), 7, 4);
      }
    }
    context.fillStyle = color;
    context.font = '700 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    context.textAlign = 'center';
    context.fillText(service.short, node.x, y + 22);
    context.fillStyle = '#a7c0c4';
    context.font = '600 11px Inter, sans-serif';
    context.fillText(`${Math.round(service.health)}% HEALTH`, node.x, y + node.height - 17);
    context.fillStyle = rgba(color, 0.7);
    context.fillRect(x + 14, y + node.height - 10, (node.width - 28) * (service.health / 100), 2);
    context.restore();
  }

  function draw(now = performance.now()) {
    if (!context) return;
    drawGrid();
    drawEdges(now);
    if (currentSnapshot && currentSnapshot.services) {
      currentSnapshot.services.forEach((service) => drawBuilding(service, nodes[service.id], now));
    } else {
      serviceOrder.forEach((id) => {
        const node = nodes[id];
        context.save();
        context.globalAlpha = 0.3;
        context.strokeStyle = node.color;
        context.setLineDash([4, 8]);
        roundedRect(context, node.x - node.width / 2, node.y - node.height / 2, node.width, node.height, 8);
        context.stroke();
        context.restore();
      });
    }
    context.fillStyle = '#6f8a90';
    context.font = '600 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    context.textAlign = 'left';
    context.fillText('DEPENDENCY GRAPH / LIVE SNAPSHOT', 24, 32);
    context.textAlign = 'right';
    context.fillText(currentSnapshot ? `${currentSnapshot.services.length} NODES · ${edges.length} EDGES` : 'AWAITING SNAPSHOT', 1176, 32);
  }

  function animate(now) {
    const frameBudget = presentationMode ? 1000 / 30 : 1000 / 60;
    if (now - lastDrawAt >= frameBudget) {
      lastDrawAt = now;
      draw(now);
    }
    animationFrame = window.requestAnimationFrame(animate);
  }

  function canvasServiceAt(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (1200 / rect.width);
    const y = (event.clientY - rect.top) * (680 / rect.height);
    return serviceOrder.find((id) => {
      const node = nodes[id];
      return x >= node.x - node.width / 2 - 12 && x <= node.x + node.width / 2 + 12 && y >= node.y - node.height / 2 - 12 && y <= node.y + node.height / 2 + 12;
    });
  }

  function handleCanvasKey(event) {
    if (!serviceOrder.length) return;
    const currentIndex = Math.max(0, serviceOrder.indexOf(selectedService));
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault(); selectService(serviceOrder[(currentIndex + 1) % serviceOrder.length], false, true);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault(); selectService(serviceOrder[(currentIndex - 1 + serviceOrder.length) % serviceOrder.length], false, true);
    } else if (event.key === 'Enter' && selectedService && worker) {
      event.preventDefault();
      const inspectButton = $('.cascade-action-button[data-action="inspect"]');
      if (inspectButton && !inspectButton.disabled) inspectButton.click();
    }
  }

  function bindEvents() {
    $$('[data-start-mode]').forEach((button) => button.addEventListener('click', () => start(button.dataset.startMode, undefined, undefined, undefined, button.dataset.startMode === 'recruiter')));
    $('#cascadeNewSeed').addEventListener('click', makeNewSeed);
    $('#cascadeShare').addEventListener('click', shareRun);
    $('#cascadeRerun').addEventListener('click', () => start(currentMode, $('#cascadeSeed').value, runbookBuild, true));
    $('#cascadeOnboardingSkip').addEventListener('click', () => stopOnboarding('Guide skipped. The city is yours.'));
    $('#cascadePresentationToggle').addEventListener('click', togglePresentationMode);
    $('#cascadeAnother').addEventListener('click', () => { makeNewSeed(); start('freeplay', $('#cascadeSeed').value); });
    $('#cascadeContinueShift').addEventListener('click', () => {
      if (!worker || !currentSnapshot || !currentSnapshot.awaitingUpgrade) return;
      const button = $('#cascadeContinueShift');
      button.disabled = true;
      if (currentSnapshot.replayBuild) {
        worker.postMessage({ type: 'continue', runToken: workerGeneration });
        return;
      }
      if (!pendingUpgrade) {
        button.disabled = false;
        showNotice('Choose one runbook card first.');
        return;
      }
      worker.postMessage({ type: 'upgrade', cardId: pendingUpgrade, runToken: workerGeneration });
    });
    $('#cascadeReplayPlay').addEventListener('click', toggleReplay);
    $('#cascadeReplayNow').addEventListener('click', () => {
      clearReplay();
      const slider = $('#cascadeReplaySlider');
      slider.value = String(Math.max(0, history.length - 1));
      sendReplay(history.length - 1);
    });
    $('#cascadeReplaySlider').addEventListener('input', (event) => {
      clearReplay();
      sendReplay(Number(event.target.value));
    });
    $$('.cascade-action-button').forEach((button) => button.addEventListener('click', () => {
      if (!selectedService || !active || !worker) return;
      const actionId = button.dataset.action;
      if (onboarding && onboarding.active) {
        const isGateway = selectedService === 'gateway';
        if (actionId === 'inspect' && isGateway && onboarding.step >= 2) {
          onboarding.step = 3;
        } else if (actionId === 'inspect') {
          showNotice('Start with the gateway symptom, then inspect the dependency evidence.');
        } else if (onboarding.step < 3) {
          showNotice('Observe the pager, select the gateway, then inspect its telemetry.');
        } else if (actionId !== 'inspect') {
          onboarding.step = 4;
        }
        updateOnboarding(currentSnapshot);
      }
      const actionToken = `${$('#cascadeSeed').value}:${currentSnapshot && currentSnapshot.stage ? currentSnapshot.stage : 1}:${actionId}:${selectedService}:${Math.round((currentSnapshot && currentSnapshot.time ? currentSnapshot.time : 0) * 10)}`;
      worker.postMessage({ type: 'action', action: actionId, target: selectedService, actionId: actionToken, runToken: workerGeneration });
    }));
    canvas.addEventListener('click', (event) => {
      const id = canvasServiceAt(event);
      if (id) selectService(id, false, true);
    });
    canvas.addEventListener('keydown', handleCanvasKey);
    window.addEventListener('resize', resizeCanvas);
  }

  function init() {
    document.body.classList.add('cascade-body');
    const query = new URLSearchParams(window.location.search);
    const querySeed = query.get('seed');
    const queryBuild = normalizeBuild(query.get('build'));
    resizeCanvas();
    setupWorker();
    if (window.CascadeNova && typeof window.CascadeNova.create === 'function') {
      nova = window.CascadeNova.create({
        root,
        getSnapshot: () => currentSnapshot,
        getSeed: () => $('#cascadeSeed').value,
        onStateChange: (enabled) => {
          if (enabled && currentSnapshot && !currentSnapshot.complete) {
            nova.analyze($('#cascadeNovaQuestion').value);
          }
        },
        onAnalyze: (result) => {
          if (result && result.misleading) {
            showNotice('NOVA marked this as a plausible false lead. Verify the graph.');
          }
        }
      });
    }
    bindEvents();
    try {
      presentationMode = window.localStorage.getItem('cascadePresentationMode') === '1';
    } catch (error) {
      presentationMode = false;
    }
    applyPresentationMode(presentationMode, false);
    renderTelemetry();
    renderTelemetry();
    animate();
    if (querySeed) {
      const seed = normalizeSeed(querySeed);
      $('#cascadeSeed').value = seed;
      window.setTimeout(() => start('recruiter', seed, queryBuild, queryBuild.length > 0), 260);
    }
  }

  init();
})();
