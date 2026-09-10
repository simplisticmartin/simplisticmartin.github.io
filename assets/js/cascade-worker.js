/* CASCADE worker bridge: the shared engine owns all simulation state. */
'use strict';

importScripts(`./cascade-engine.js${self.location.search || ''}`);

const Engine = self.CascadeEngine;
let run = null;
let runToken = 0;
let eventCount = 0;
let intervalId = null;

function emitEvents(events) {
  (events || []).forEach((event) => {
    eventCount += 1;
    postMessage({ type: 'event', event, count: eventCount, runToken });
  });
}

function publishSnapshot(type, result) {
  if (!result || !result.snapshot) return;
  emitEvents(result.events);
  postMessage({ type: type || 'snapshot', snapshot: result.snapshot, runToken });
}

function acceptsPayload(payload) {
  return payload.runToken === undefined || Number(payload.runToken) === runToken;
}

function stopClock() {
  if (intervalId) clearInterval(intervalId);
  intervalId = null;
}

function start(seed, mode, build, replayBuild, token) {
  const nextToken = Number(token) || 0;
  if (run && nextToken < runToken) return;
  stopClock();
  runToken = nextToken;
  eventCount = 0;
  run = Engine.createRun(seed, mode, build, replayBuild);
  const initial = { snapshot: Engine.snapshot(run), events: Engine.drainEvents(run) };
  emitEvents(initial.events);
  postMessage({ type: 'started', snapshot: initial.snapshot, maxTime: run.maxTime, runToken });
  intervalId = setInterval(tick, Engine.TICK_SECONDS * 1000);
}

function tick() {
  if (!run || run.complete) return;
  const result = Engine.advance(run, Engine.TICK_SECONDS);
  publishSnapshot(result.complete ? 'snapshot' : 'snapshot', result);
  if (result.complete) {
    stopClock();
    postMessage({ type: 'complete', snapshot: result.snapshot, history: run.history.slice(), maxTime: run.maxTime, runToken });
  }
}

function handleAction(payload) {
  if (!run) return;
  const result = Engine.applyAction(run, payload.action, payload.target, payload.actionId);
  if (result.events && result.events.length) emitEvents(result.events);
  if (result.snapshot) postMessage({ type: 'snapshot', snapshot: result.snapshot, runToken });
}

function handleUpgrade(payload) {
  if (!run) return;
  const result = payload.type === 'continue'
    ? Engine.continueReplay(run)
    : Engine.chooseUpgrade(run, payload.cardId);
  if (result.events && result.events.length) emitEvents(result.events);
  if (!result.accepted) return;
  postMessage({ type: 'started', snapshot: result.snapshot, maxTime: run.maxTime, runToken });
  if (!intervalId) intervalId = setInterval(tick, Engine.TICK_SECONDS * 1000);
}

self.onmessage = (message) => {
  const payload = message.data || {};
  if (payload.type === 'start') start(payload.seed, payload.mode, payload.build, payload.replayBuild, payload.runToken);
  else if (!acceptsPayload(payload)) return;
  else if (payload.type === 'action') handleAction(payload);
  else if (payload.type === 'upgrade' || payload.type === 'continue') handleUpgrade(payload);
  else if (payload.type === 'replay' && run) {
    const replayed = Engine.replay(run, payload.index);
    if (replayed) postMessage({ type: 'replay', snapshot: replayed, index: run.history.indexOf(replayed), total: run.history.length, runToken });
  }
};
