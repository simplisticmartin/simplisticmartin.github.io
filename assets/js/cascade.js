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
  }

  function renderServiceList(snapshot) {
    const list = $('#cascadeServiceList');
    if (!snapshot || !snapshot.services) return;
    list.innerHTML = '';
    snapshot.services.forEach((service) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `cascade-service-button ${statusClass(service.status)}`;
      button.dataset.service = service.id;
      button.setAttribute('aria-current', service.id === selectedService ? 'true' : 'false');
      const title = document.createElement('strong');
      title.textContent = service.short;
      const status = document.createElement('small');
      status.textContent = `${service.status} · ${Math.round(service.health)}%`;
      button.append(title, status);
      button.addEventListener('click', () => selectService(service.id, true));
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

  function selectService(id, focusCanvas) {
    if (!serviceOrder.includes(id)) return;
    selectedService = id;
    renderTelemetry();
    if (currentSnapshot) renderServiceList(currentSnapshot);
    if (focusCanvas) canvas.focus({ preventScroll: true });
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
    $('#cascadePostmortemResult').textContent = snapshot.success ? 'SYSTEM STABILIZED' : 'SHIFT FAILED';
    $('#cascadePostmortemResult').classList.toggle('is-failed', !snapshot.success);
    $('#cascadePostmortemLead').textContent = snapshot.success
      ? `You contained ${snapshot.scenario.title.toLowerCase()} in ${formatTime(snapshot.time)}. The graph recovered because the action addressed the failure mode, not only its loudest symptom.`
      : `The shift ended with ${snapshot.blastRadius} services outside nominal health. The postmortem is still useful: every unnecessary change is a clue about where the graph hid the cause.`;
    $('#postmortemRootCause').textContent = snapshot.scenario.rootCause;
    $('#postmortemMttr').textContent = formatTime(snapshot.time);
    $('#postmortemAvailability').textContent = `${Math.max(0, 100 - snapshot.impact).toFixed(2)}%`;
    $('#postmortemChanges').textContent = String(snapshot.unnecessaryChanges);
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
    updateStatus(snapshot);
    renderServiceList(snapshot);
    renderTelemetry();
    $('#cascadeReplayTime').textContent = `${formatTime(snapshot.time)} / ${Math.max(0, Math.round(((index + 1) / total) * 100))}%`;
    draw();
  }

  function sendReplay(index) {
    if (!worker || !history.length) return;
    worker.postMessage({ type: 'replay', index });
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

  function resetForStart(seed, mode) {
    clearReplay();
    active = true;
    currentMode = mode === 'freeplay' ? 'freeplay' : 'recruiter';
    selectedService = null;
    currentSnapshot = null;
    history = [];
    $('#cascadePostmortem').hidden = true;
    $('#cascadeShare').disabled = false;
    $('#cascadeModeLabel').textContent = currentMode === 'recruiter' ? '90-SECOND SHIFT' : 'FREEPLAY';
    $('#cascadeSeed').value = seed;
    $('#cascadeIncidentTitle').textContent = 'Initializing incident…';
    $('#cascadeIncidentDescription').textContent = 'Opening telemetry channels and replay-safe event history.';
    $('#cascadeIncidentSymptom').textContent = '—';
    $('#cascadeIncidentCode').textContent = 'INC—----';
    overlay.hidden = true;
    resetEventLog();
    setPhase('BOOTING', 'Connecting the simulation worker…');
    $('#cascadeConsole').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (worker) worker.postMessage({ type: 'start', seed, mode: currentMode });
  }

  function start(mode, explicitSeed) {
    const seed = normalizeSeed(explicitSeed || $('#cascadeSeed').value);
    resetForStart(seed, mode);
    const url = new URL(window.location.href);
    url.searchParams.set('seed', seed);
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
    url.hash = 'cascade-console';
    try {
      await navigator.clipboard.writeText(url.toString());
      showNotice(`Share link copied for seed ${seed}.`);
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
    if (!selectedService && snapshot.services.length) selectService(snapshot.scenario.root, false);
    updateStatus(snapshot);
    updateIncidentCard(snapshot);
    renderServiceList(snapshot);
    renderTelemetry();
    draw();
  }

  function receiveComplete(snapshot, completeHistory) {
    active = false;
    currentSnapshot = snapshot;
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
      worker = new Worker(workerUrl);
      worker.addEventListener('message', (message) => {
        const payload = message.data || {};
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
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 1200 * ratio;
    canvas.height = 680 * ratio;
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
    context.strokeStyle = 'rgba(102, 229, 226, 0.055)';
    context.lineWidth = 1;
    for (let x = 0; x <= 1200; x += 48) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 680); context.stroke();
    }
    for (let y = 0; y <= 680; y += 48) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(1200, y); context.stroke();
    }
    const gradient = context.createRadialGradient(600, 320, 30, 600, 320, 570);
    gradient.addColorStop(0, 'rgba(39, 119, 126, 0.22)');
    gradient.addColorStop(1, 'rgba(3, 12, 18, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1200, 680);
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
      const stress = Math.max(source ? 100 - source.health : 0, target ? 100 - target.health : 0);
      const color = stress > 52 ? '#ff6b6b' : stress > 22 ? '#f5b95b' : '#45cfd0';
      context.save();
      context.globalAlpha = stress > 52 ? 0.92 : 0.52;
      context.strokeStyle = rgba(color, stress > 52 ? 0.7 : 0.35);
      context.lineWidth = stress > 52 ? 3.5 : stress > 22 ? 2.5 : 1.5;
      context.setLineDash(stress > 22 ? [9, 8] : []);
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
      context.shadowBlur = 10;
      context.beginPath(); context.arc(packetX, packetY, stress > 52 ? 4 : 2.5, 0, Math.PI * 2); context.fill();
      context.restore();
    });
  }

  function drawBuilding(service, node, now) {
    if (!service) return;
    const color = service.status === 'critical' ? '#ff6b6b' : (service.status === 'warning' ? '#f5b95b' : node.color);
    const pulse = service.status === 'healthy' ? 0 : Math.sin(now / (service.status === 'critical' ? 160 : 340)) * 5;
    const x = node.x - node.width / 2;
    const y = node.y - node.height / 2 + pulse;
    context.save();
    context.shadowColor = rgba(color, service.status === 'healthy' ? 0.16 : 0.42);
    context.shadowBlur = service.status === 'healthy' ? 18 : 34;
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
    const buildingTop = y + 32;
    context.fillStyle = rgba(color, 0.2);
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const lit = ((row * 6 + col + Math.floor(now / 700)) % 5) !== 0;
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
    draw(now);
    window.requestAnimationFrame(animate);
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
      event.preventDefault(); selectService(serviceOrder[(currentIndex + 1) % serviceOrder.length], false);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault(); selectService(serviceOrder[(currentIndex - 1 + serviceOrder.length) % serviceOrder.length], false);
    } else if (event.key === 'Enter' && selectedService && worker) {
      event.preventDefault(); worker.postMessage({ type: 'action', action: 'inspect', target: selectedService });
    }
  }

  function bindEvents() {
    $$('[data-start-mode]').forEach((button) => button.addEventListener('click', () => start(button.dataset.startMode)));
    $('#cascadeNewSeed').addEventListener('click', makeNewSeed);
    $('#cascadeShare').addEventListener('click', shareRun);
    $('#cascadeRerun').addEventListener('click', () => start(currentMode, $('#cascadeSeed').value));
    $('#cascadeAnother').addEventListener('click', () => { makeNewSeed(); start('freeplay', $('#cascadeSeed').value); });
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
      worker.postMessage({ type: 'action', action: button.dataset.action, target: selectedService });
    }));
    canvas.addEventListener('click', (event) => {
      const id = canvasServiceAt(event);
      if (id) selectService(id, false);
    });
    canvas.addEventListener('keydown', handleCanvasKey);
    window.addEventListener('resize', resizeCanvas);
  }

  function init() {
    document.body.classList.add('cascade-body');
    const querySeed = new URLSearchParams(window.location.search).get('seed');
    if (querySeed) $('#cascadeSeed').value = normalizeSeed(querySeed);
    resizeCanvas();
    setupWorker();
    bindEvents();
    renderTelemetry();
    selectService('gateway', false);
    animate();
  }

  init();
})();
